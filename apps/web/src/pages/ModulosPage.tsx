import { quizPassText } from "@shared/quiz";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CertificatePanel } from "../components/modulos/CertificatePanel";
import { LessonContent } from "../components/modulos/LessonContent";
import { LessonSidebar } from "../components/modulos/LessonSidebar";
import { MediaModal, type MediaModalState } from "../components/modulos/MediaModal";
import { QuizListPanel } from "../components/modulos/QuizListPanel";
import { QuizAccordion, QuizModal, QuizPlayer } from "../components/modulos/quiz";
import { useAbility } from "../hooks/useAbility";
import { useAuth } from "../hooks/useAuth";
import { useQuiz } from "../hooks/useQuiz";
import { api } from "../lib/api";
import { pluralize } from "../lib/utils";

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)+/g, "");
}

function useIsMobile(breakpoint = 768) {
	const [isMobile, setIsMobile] = useState(() => window.innerWidth <= breakpoint);
	useEffect(() => {
		const check = () => setIsMobile(window.innerWidth <= breakpoint);
		window.addEventListener("resize", check);
		return () => window.removeEventListener("resize", check);
	}, [breakpoint]);
	return isMobile;
}

export function ModulosPage() {
	const navigate = useNavigate();
	const { cursoNombre } = useParams<{ cursoNombre: string }>();
	const { user } = useAuth();
	const { isAtendente } = useAbility();
	const [currentLesson, setCurrentLesson] = useState(0);
	const [showQuiz, setShowQuiz] = useState(false);
	const [showAllQuizzes, setShowAllQuizzes] = useState(false);
	const [showCertificate, setShowCertificate] = useState(false);
	const [lessons, setLessons] = useState<any[]>([]);
	const [curso, setModulo] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [_videoEnded, setVideoEnded] = useState(false);
	const [expandedLicao, setExpandedLicao] = useState<string | null>(null);
	const videoRef = useRef<{ seekTo: (s: number) => void }>(null);
	const [videoCurrentTime, setVideoCurrentTime] = useState(0);
	const [certificate, setCertificate] = useState<any>(null);
	const [allQuizResults, setAllQuizResults] = useState<Record<string, any>>({});
	const [showConfetti, setShowConfetti] = useState(false);
	const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
	const qz = useQuiz({
		onPass: (quizId: string, passed: boolean) => {
			setShowConfetti(true);
			setTimeout(() => setShowConfetti(false), 4000);
			if (!passed) return;
			setLessons((prev) => prev.map((l: any) => (l.quiz?.id === quizId ? { ...l, concluido: true } : l)));
			setAllQuizResults((prev) => ({ ...prev, [quizId]: { ...(prev[quizId] || {}), concluido: true } }));
			loadQuizResults();
			loadCertificate();
		},
	});
	const [expandedMobileLesson, setExpandedMobileLesson] = useState<number | null>(0);
	const [expandedMobileExtra, setExpandedMobileExtra] = useState<string | null>(null);
	const [mediaModal, setMediaModal] = useState<MediaModalState | null>(null);
	const [restartRequested, setRestartRequested] = useState(false);
	const [quizModalLessonIndex, setQuizModalLessonIndex] = useState<number | null>(null);
	const isMobile = useIsMobile();

	const loadModulo = useCallback(async () => {
		if (!cursoNombre) return;
		try {
			const allMods = await api.getCmsModulos();
			const foundModulo = allMods.find((m: any) => slugify(m.titulo || m.title || "") === cursoNombre);
			if (foundModulo) {
				setModulo(foundModulo);
				const aulasData = await api.getAulas(foundModulo.id);
				setLessons(aulasData);
				api.trackModuleOpen(foundModulo.id).catch(() => {});
			} else {
				setModulo(null);
				setLessons([]);
			}
		} catch (err) {
			console.error("Erro ao carregar curso:", err);
			setLessons([]);
		} finally {
			setLoading(false);
		}
	}, [cursoNombre]);

	const loadQuizResults = useCallback(async () => {
		if (!curso) return;
		try {
			const results: Record<string, any> = {};
			for (const lesson of lessons) {
				if (lesson.quiz) {
					try {
						const res = await api.getQuizResults(lesson.quiz.id);
						const data = Array.isArray(res) ? res : (res as any)?.data || [];
						const myResult = data.find((r: any) => r.userId === user?.id);
						if (myResult) results[lesson.quiz.id] = myResult;
					} catch {}
				}
			}
			setAllQuizResults(results);
		} catch {}
	}, [curso, lessons, user?.id]);

	const loadCertificate = useCallback(async () => {
		if (!curso) return;
		try {
			const certs = await api.getCertificates();
			const data = Array.isArray(certs) ? certs : (certs as any)?.data || [];
			const myCert = data.find((c: any) => c.cursoId === curso.id);
			setCertificate(myCert || null);
		} catch {
			setCertificate(null);
		}
	}, [curso]);

	const isLessonCompleted = useCallback((lesson: any) => lesson.concluido === true, []);

	useEffect(() => {
		loadModulo();
	}, [loadModulo]);

	useEffect(() => {
		if (curso && lessons.length > 0) {
			loadQuizResults();
			loadCertificate();
		}
	}, [curso, lessons, loadQuizResults, loadCertificate]);

	// Auto-request certificate for modules without quizzes when all lessons completed
	useEffect(() => {
		if (!curso || lessons.length === 0 || certificate) return;
		const hasQuizzes = lessons.some((l: any) => l.quiz);
		if (hasQuizzes) return;
		const allDone = lessons.every((l: any) => isLessonCompleted(l));
		if (allDone) {
			api
				.createCertificate(curso.id)
				.then(() => loadCertificate())
				.catch(() => {});
		}
	}, [lessons, curso, certificate, loadCertificate, isLessonCompleted]);

	const canAdvanceToLesson = (index: number) => {
		if (index === 0) return true;
		for (let i = 0; i < index; i++) {
			if (lessons[i].obrigatorio && !isLessonCompleted(lessons[i])) return false;
		}
		return true;
	};

	const areAllQuizzesPassed = () => {
		const quizLessons = lessons.filter((l) => l.quiz);
		if (quizLessons.length === 0) return true;
		return quizLessons.every((l) => {
			const result = allQuizResults[l.quiz.id];
			return result?.concluido;
		});
	};

	const canOpenQuiz = (lessonIndex: number) => {
		for (let i = 0; i < lessonIndex; i++) {
			if (lessons[i].quiz) {
				const result = allQuizResults[lessons[i].quiz.id];
				if (!result?.concluido) return false;
			}
		}
		return true;
	};

	const resetLessonState = () => {
		setShowQuiz(false);
		const id = lessons[currentLesson]?.quiz?.id;
		if (id) qz.reset(id);
		setVideoEnded(false);
	};

	const handleConcluir = async () => {
		const lesson = lessons[currentLesson];
		if (!lesson || !curso) return;

		if (lesson.quiz) {
			setShowQuiz(true);
			return;
		}

		try {
			await api.updateProgresso(curso.id, lesson.id, true);
			const updated = [...lessons];
			updated[currentLesson] = { ...updated[currentLesson], concluido: true };
			setLessons(updated);
		} catch {}

		if (currentLesson < lessons.length - 1) {
			setCurrentLesson(currentLesson + 1);
			resetLessonState();
		}
	};

	const handleAvanzar = () => {
		if (currentLesson < lessons.length - 1) {
			setCurrentLesson(currentLesson + 1);
			resetLessonState();
		}
	};

	const handleVideoEnd = () => {
		setVideoEnded(true);
	};

	const handleSelectLesson = (i: number, isExpanded: boolean) => {
		if (isMobile) {
			setExpandedMobileLesson(isExpanded ? null : i);
			setExpandedMobileExtra(null);
			if (isExpanded) return;
		}
		setShowAllQuizzes(false);
		setShowCertificate(false);
		setCurrentLesson(i);
		resetLessonState();
	};

	const handleOpenMedia = (lesson: any, lessonIndex: number, startTime?: number) => {
		if (lesson.tipo === "PDF" && lesson.pdfUrl) {
			setMediaModal({ url: lesson.pdfUrl, type: "pdf", title: lesson.titulo, startTime, lessonIndex });
		} else if (lesson.videoUrl) {
			setMediaModal({ url: lesson.videoUrl, type: "video", title: lesson.titulo, startTime, lessonIndex });
		}
	};

	const handleMediaOpenQuiz = (lessonIndex: number) => {
		setMediaModal(null);
		if (isMobile) {
			setQuizModalLessonIndex(lessonIndex);
		} else {
			setCurrentLesson(lessonIndex);
			setShowQuiz(true);
			if (currentQuizId) qz.reset(currentQuizId);
		}
	};

	const handleMediaNextLesson = (lessonIndex: number) => {
		setMediaModal(null);
		const nextIdx = lessonIndex + 1;
		if (isMobile) {
			setExpandedMobileLesson(nextIdx);
		}
		setCurrentLesson(nextIdx);
		resetLessonState();
	};

	const handleToggleQuizzes = () => {
		if (isMobile) {
			setExpandedMobileExtra(expandedMobileExtra === "quizzes" ? null : "quizzes");
			setExpandedMobileLesson(null);
			setShowAllQuizzes(true);
			setShowCertificate(false);
			resetLessonState();
		} else {
			setShowAllQuizzes(!showAllQuizzes);
			setShowCertificate(false);
			resetLessonState();
		}
	};

	const handleToggleCertificate = () => {
		if (isMobile) {
			setExpandedMobileExtra(expandedMobileExtra === "certificate" ? null : "certificate");
			setExpandedMobileLesson(null);
			setShowCertificate(true);
			setShowAllQuizzes(false);
			resetLessonState();
			loadCertificate();
		} else {
			setShowCertificate(!showCertificate);
			setShowAllQuizzes(false);
			resetLessonState();
			loadCertificate();
		}
	};

	const handleRequestRestart = async () => {
		if (restartRequested) return;
		if (!window.confirm("Solicitar reinicio do progresso deste curso? O gestor sera notificado.")) return;
		try {
			await api.requestRestart(curso.id);
			setRestartRequested(true);
			alert("Solicitação enviada ao gestor!");
		} catch {
			alert("Erro ao enviar solicitação");
		}
	};

	const handleRequestCertificate = async () => {
		try {
			await api.createCertificate(curso.id);
			loadCertificate();
		} catch (_e) {
			alert("Erro ao solicitar certificado");
		}
	};

	const allCompleted = lessons.length > 0 && lessons.every((l: any) => isLessonCompleted(l));
	const isLastLesson = currentLesson === lessons.length - 1;
	const current = lessons[currentLesson];
	const currentQuizId = current?.quiz?.id;
	const semGestor = isAtendente && !user?.gestorId;
	const quizzesWithLesson = lessons.filter((l) => l.quiz);
	const hasCertificate = !!certificate;

	const renderQuizList = () => (
		<QuizListPanel
			quizLessons={quizzesWithLesson}
			lessons={lessons}
			allQuizResults={allQuizResults}
			expandedQuizId={expandedQuizId}
			onToggle={setExpandedQuizId}
			qz={qz}
			canOpenQuiz={canOpenQuiz}
		/>
	);

	const renderCertificate = () => (
		<CertificatePanel
			certificate={certificate}
			curso={curso}
			userName={user?.nome}
			lessons={lessons}
			allQuizResults={allQuizResults}
			areAllQuizzesPassed={areAllQuizzesPassed}
			isLessonCompleted={isLessonCompleted}
			onRequestCertificate={handleRequestCertificate}
		/>
	);

	const renderInlineQuiz = (i: number) =>
		showQuiz && currentLesson === i && lessons[i]?.quiz ? (
			<QuizAccordion quiz={lessons[i].quiz} qz={qz} isCurrent canOpen={canOpenQuiz(i)} />
		) : null;

	if (loading) {
		return (
			<div className="page active">
				<div className="page-header">
					<div className="page-title">Carregando curso...</div>
				</div>
			</div>
		);
	}

	if (semGestor) {
		return (
			<div className="page active">
				<div className="page-header">
					<div>
						<button className="btn-secondary back-btn" onClick={() => navigate("/cursos")}>
							<i className="icon-arrow-left icon-sm" /> Voltar
						</button>
						<div className="page-title">Acesso restrito</div>
					</div>
				</div>
				<div className="empty-state">
					<div className="empty-icon">🔒</div>
					<p className="empty-msg">Voce precisa ser associado a um Gestor / Líder</p>
					<p className="empty-desc">Aguarde a aprovacao do seu gestor.</p>
				</div>
			</div>
		);
	}

	if (!curso) {
		return (
			<div className="page active">
				<div className="page-header">
					<div>
						<button className="btn-secondary back-btn" onClick={() => navigate("/cursos")}>
							<i className="icon-arrow-left icon-sm" /> Voltar
						</button>
						<div className="page-title">Curso nao encontrado</div>
					</div>
				</div>
			</div>
		);
	}

	const currentResult = currentQuizId ? qz.result(currentQuizId) : null;

	return (
		<>
			<div className="page active">
				{showConfetti && (
					<div className="confetti-container">
						{Array.from({ length: 50 }).map((_, i) => (
							<div
								key={i}
								className="confetti-piece"
								style={{
									left: `${Math.random() * 100}%`,
									animationDelay: `${Math.random() * 2}s`,
									animationDuration: `${2 + Math.random() * 2}s`,
									background: ["#F47C20", "#4CAF50", "#2196F3", "#FF9800", "#E91E63", "#FFD700"][i % 6],
								}}
							/>
						))}
						<div className="confetti-message">
							<div className="confetti-emoji">🎉</div>
							<div className="confetti-text">Parabens!</div>
						</div>
					</div>
				)}

				{mediaModal && (
					<MediaModal
						modal={mediaModal}
						lessons={lessons}
						onClose={() => setMediaModal(null)}
						onOpenQuiz={handleMediaOpenQuiz}
						onNextLesson={handleMediaNextLesson}
					/>
				)}

				<div className="page-header">
					<div>
						<button className="btn-secondary back-btn" onClick={() => navigate(-1)}>
							<i className="icon-arrow-left icon-sm" /> Voltar
						</button>
						<div className="page-title">{curso.titulo}</div>
						<div className="page-subtitle">
							{lessons.length} {pluralize(lessons.length, "aula")}
							{curso.autoCertificado ? " · Certificado automatico" : ""}
						</div>
					</div>
				</div>

				<div className="lesson-layout">
					<LessonSidebar
						curso={curso}
						lessons={lessons}
						currentLesson={currentLesson}
						isMobile={isMobile}
						expandedMobileLesson={expandedMobileLesson}
						expandedMobileExtra={expandedMobileExtra}
						showQuiz={showQuiz}
						showAllQuizzes={showAllQuizzes}
						showCertificate={showCertificate}
						isAtendente={isAtendente}
						restartRequested={restartRequested}
						videoCurrentTime={videoCurrentTime}
						videoRef={videoRef}
						isLessonCompleted={isLessonCompleted}
						canAdvanceToLesson={canAdvanceToLesson}
						canOpenQuiz={canOpenQuiz}
						areAllQuizzesPassed={areAllQuizzesPassed}
						hasCertificate={hasCertificate}
						quizzesCount={quizzesWithLesson.length}
						allCompleted={allCompleted}
						isQuizPassedContinue={(i) => showQuiz && currentLesson === i && !!qz.result(lessons[i]?.quiz?.id)?.passed}
						onSelectLesson={handleSelectLesson}
						onPrevLesson={(i) => {
							setExpandedMobileLesson(i - 1);
							setCurrentLesson(i - 1);
							resetLessonState();
						}}
						onConcluir={(i) => {
							setCurrentLesson(i);
							handleConcluir();
						}}
						onStartQuiz={(i) => {
							setCurrentLesson(i);
							setShowQuiz(true);
						}}
						onOpenQuizModal={setQuizModalLessonIndex}
						onNextLesson={(i) => {
							setExpandedMobileLesson(i + 1);
							setCurrentLesson(i + 1);
							resetLessonState();
						}}
						onQuizPassedContinue={(i) => {
							setShowQuiz(false);
							if (currentQuizId) qz.reset(currentQuizId);
							if (i < lessons.length - 1) {
								setExpandedMobileLesson(i + 1);
								setCurrentLesson(i + 1);
								resetLessonState();
							} else {
								navigate("/cursos");
							}
						}}
						onFinish={() => navigate("/cursos")}
						onToggleQuizzes={handleToggleQuizzes}
						onToggleCertificate={handleToggleCertificate}
						onRequestRestart={handleRequestRestart}
						onOpenMedia={handleOpenMedia}
						renderQuiz={renderInlineQuiz}
						renderQuizzes={renderQuizList}
						renderCertificate={renderCertificate}
					/>

					<div className="lesson-content">
						{showAllQuizzes ? (
							renderQuizList()
						) : showCertificate ? (
							renderCertificate()
						) : !showQuiz ? (
							<LessonContent
								current={current}
								currentLesson={currentLesson}
								lessonsCount={lessons.length}
								videoRef={videoRef}
								expandedLicao={expandedLicao}
								onExpandLicao={setExpandedLicao}
								onVideoEnd={handleVideoEnd}
								onCurrentTimeChange={setVideoCurrentTime}
								canOpenCurrentQuiz={canOpenQuiz(currentLesson)}
								onConcluir={handleConcluir}
								onAvancar={handleAvanzar}
								onShowQuiz={() => {
									setShowQuiz(true);
									if (currentQuizId) qz.reset(currentQuizId);
								}}
								onPrevLesson={() => {
									setCurrentLesson(currentLesson - 1);
									resetLessonState();
								}}
								onFinish={() => navigate("/cursos")}
								isLastLesson={isLastLesson}
								allCompleted={allCompleted}
							/>
						) : (
							<div className="lesson-body">
								<h2>Quiz: {current?.titulo}</h2>
								<div className="lesson-text">
									Responda todas as perguntas para concluir esta aula. {quizPassText(current?.quiz)}
								</div>

								<QuizPlayer
									quiz={current?.quiz}
									qz={qz}
									variant="page"
									bannerActions={
										currentResult ? (
											<div className="quiz-result-actions">
												{!currentResult.passed && (
													<button
														className="btn-secondary"
														onClick={() => {
															if (currentQuizId) qz.reset(currentQuizId);
														}}
													>
														Tentar Novamente
													</button>
												)}
												{currentResult.passed && (
													<button
														className="btn-primary"
														onClick={() => {
															setShowQuiz(false);
															if (currentQuizId) qz.reset(currentQuizId);
															if (current?.quiz?.autoGerarCertificado || curso?.autoCertificado) {
																loadCertificate();
																setShowCertificate(true);
															} else if (currentLesson < lessons.length - 1) {
																setCurrentLesson(currentLesson + 1);
															}
														}}
													>
														{current?.quiz?.autoGerarCertificado || curso?.autoCertificado
															? "Ver Certificado"
															: currentLesson < lessons.length - 1
																? "Avancar para Proxima Aula"
																: "Finalizar"}
													</button>
												)}
											</div>
										) : null
									}
									footer={
										<div className="lesson-actions" style={{ marginTop: "12px" }}>
											{!qz.submitted(currentQuizId) ? (
												<button
													className="btn-secondary"
													onClick={() => {
														setShowQuiz(false);
														if (currentQuizId) qz.reset(currentQuizId);
													}}
												>
													Cancelar
												</button>
											) : (
												<button
													className="btn-secondary"
													onClick={() => {
														setShowQuiz(false);
														if (currentQuizId) qz.reset(currentQuizId);
													}}
												>
													Voltar a Aula
												</button>
											)}
										</div>
									}
								/>
							</div>
						)}
					</div>
				</div>
			</div>

			{quizModalLessonIndex !== null && (
				<QuizModal lesson={lessons[quizModalLessonIndex]} qz={qz} onClose={() => setQuizModalLessonIndex(null)} />
			)}
		</>
	);
}
