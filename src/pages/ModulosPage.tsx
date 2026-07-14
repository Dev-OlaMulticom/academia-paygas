import { quizPassText } from "@shared/quiz";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PDFViewer } from "../components/PDFViewer";
import { useToast } from "../components/Toast";
import { VideoPlayer } from "../components/VideoPlayer";
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
	const { toast } = useToast();
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
	const [mediaModal, setMediaModal] = useState<{
		url: string;
		type: "pdf" | "video";
		title: string;
		startTime?: number;
		lessonIndex?: number;
	} | null>(null);
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

	const allCompleted = lessons.length > 0 && lessons.every((l: any) => isLessonCompleted(l));
	const isLastLesson = currentLesson === lessons.length - 1;
	const current = lessons[currentLesson];
	const currentQuizId = current?.quiz?.id;
	const semGestor = isAtendente && !user?.gestorId;
	const quizzesWithLesson = lessons.filter((l) => l.quiz);
	const hasCertificate = !!certificate;

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

	const renderCertificateTab = () => {
		const quizzesPassed = areAllQuizzesPassed();
		const allLessonsCompleted = lessons.length > 0 && lessons.every((l: any) => isLessonCompleted(l));
		const canRequestCert = allLessonsCompleted && quizzesPassed;

		if (!hasCertificate && canRequestCert) {
			return (
				<div className="empty-state section-padding">
					<div className="empty-icon">📜</div>
					<p className="empty-msg">Certificado disponivel!</p>
					<p className="empty-desc">Voce completou todas as aulas e quizzes. Solicite seu certificado.</p>
					<button
						className="btn-primary"
						style={{ marginTop: "12px" }}
						onClick={async () => {
							try {
								await api.createCertificate(curso.id);
								loadCertificate();
							} catch (_e) {
								alert("Erro ao solicitar certificado");
							}
						}}
					>
						Solicitar Certificado
					</button>
				</div>
			);
		}

		if (!hasCertificate || !quizzesPassed) {
			const quizLessons = lessons.filter((l) => l.quiz);
			const pendingCount = quizLessons.filter((l) => {
				const result = allQuizResults[l.quiz.id];
				return !result?.concluido;
			}).length;
			return (
				<div className="empty-state section-padding">
					<div className="empty-icon">📜</div>
					<p className="empty-msg">{!hasCertificate ? "Nenhum certificado disponivel" : "Certificado bloqueado"}</p>
					<p className="empty-desc">
						{!hasCertificate
							? "Complete todas as aulas para gerar seu certificado."
							: pendingCount > 0
								? `Aprove em ${pendingCount} ${pluralize(pendingCount, "quiz")} pendente${pendingCount !== 1 ? "s" : ""} para desbloquear seu certificado.`
								: "Aguarde a aprovacao do gestor."}
					</p>
				</div>
			);
		}
		const DEFAULT_TEMPLATE = `<div style="width:800px;padding:40px;background:#ffffff;color:#1a1a1a;border-radius:12px;text-align:center;font-family:Arial,sans-serif;border:2px solid #F47C20;">
  <div style="font-size:14px;letter-spacing:3px;margin-bottom:8px;color:#0A2E6E;">ACADEMIA PAYGAS</div>
  <div style="font-size:28px;margin-bottom:20px;">{{CURSO_ICONE}} {{CURSO_TITULO}}</div>
  <div style="font-size:14px;color:#666;margin-bottom:10px;">Certificamos que</div>
  <div style="font-size:32px;font-weight:bold;margin:20px 0;border-bottom:2px solid #F47C20;padding-bottom:20px;color:#0A2E6E;">{{USUARIO_NOME}}</div>
  <div style="font-size:16px;margin-bottom:40px;color:#444;">concluiu o curso de <strong>{{CURSO_TITULO}}</strong> com sucesso.</div>
  <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;">
    <div style="text-align:left;">
      <div style="font-size:12px;color:#999;">{{DATA_HORA}}</div>
      <div style="margin-top:30px;border-top:1px solid #ccc;padding-top:6px;font-size:13px;font-weight:600;color:#333;">{{GESTOR_NOME}}</div>
      <div style="font-size:11px;color:#999;">Gestor / Líder</div>
    </div>
    <div style="width:80px;height:80px;background:#F47C20;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:bold;color:#fff;">PG</div>
  </div>
</div>`;
		const template = certificate.cursoCertTemplate || certificate.curso?.certificadoTemplate || DEFAULT_TEMPLATE;
		const titulo = certificate.curso?.titulo || curso.titulo;
		const icone = certificate.curso?.icone || curso.icone || "📚";
		const nome = user?.nome || "Usuario";
		const gestorNome = "";
		const certDate = certificate.createdAt ? new Date(certificate.createdAt) : new Date();
		const dateStr = certDate.toLocaleDateString("pt-BR");
		const timeStr = certDate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

		const certHtml = template
			.replace(/\{\{CURSO_ICONE\}\}/g, icone)
			.replace(/\{\{CURSO_TITULO\}\}/g, titulo)
			.replace(/\{\{USUARIO_NOME\}\}/g, nome)
			.replace(/\{\{DATA\}\}/g, dateStr)
			.replace(/\{\{DATA_HORA\}\}/g, `${dateStr} ${timeStr}`)
			.replace(/\{\{GESTOR_NOME\}\}/g, gestorNome);

		const fullPageHtml = `<!DOCTYPE html><html><head><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#e5e7eb;font-family:Arial,sans-serif;}</style></head><body>${certHtml}</body></html>`;

		const statusLabel =
			certificate.status === "APPROVED" ? "Aprovado" : certificate.status === "ISSUED" ? "Emitido" : "Pendente";
		const statusClass =
			certificate.status === "APPROVED"
				? "cert-status-approved"
				: certificate.status === "ISSUED"
					? "cert-status-issued"
					: "cert-status-pending";

		const handleDownloadPDF = async () => {
			const certEl = document.getElementById("cert-printable");
			if (!certEl) return;
			try {
				const html2canvas = (await import("html2canvas")).default;
				const jsPDF = (await import("jspdf")).default;
				const canvas = await html2canvas(certEl, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
				const imgData = canvas.toDataURL("image/png");
				const pdf = new jsPDF("l", "mm", "a4");
				const pdfWidth = pdf.internal.pageSize.getWidth();
				const pdfHeight = pdf.internal.pageSize.getHeight();
				const imgWidth = canvas.width;
				const imgHeight = canvas.height;
				const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
				const w = imgWidth * ratio;
				const h = imgHeight * ratio;
				pdf.addImage(imgData, "PNG", (pdfWidth - w) / 2, (pdfHeight - h) / 2, w, h);
				pdf.save(`certificado-${titulo.replace(/\s+/g, "-").toLowerCase()}.pdf`);
			} catch (err) {
				console.error("Erro ao gerar PDF:", err);
			}
		};

		const handlePrint = () => {
			const certEl = document.getElementById("cert-printable");
			if (!certEl) return;
			const printWindow = window.open("", "_blank");
			if (!printWindow) return;
			printWindow.document.write(
				`<!DOCTYPE html><html><head><title>Certificado - ${titulo}</title><style>@page{size:landscape;margin:0}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}</style></head><body>${certEl.outerHTML}</body></html>`,
			);
			printWindow.document.close();
			printWindow.print();
		};

		return (
			<div className="section-padding">
				<div className="cert-top-bar">
					<h3 className="section-title-mb">📜 Seu Certificado</h3>
					<span className={`cert-status-badge ${statusClass}`}>{statusLabel}</span>
				</div>
				<div className="cert-embed-wrap">
					<iframe
						id="cert-printable"
						className="cert-embed-iframe"
						srcDoc={fullPageHtml}
						title={`Certificado - ${titulo}`}
						sandbox="allow-same-origin"
					/>
				</div>
				<div className="cert-download-center">
					<button className="btn-primary cert-dl-btn" onClick={handleDownloadPDF}>
						<i className="icon-download icon-sm" /> Baixar PDF
					</button>
					<button className="btn-secondary cert-dl-btn" onClick={handlePrint}>
						<i className="icon-printer icon-sm" /> Imprimir
					</button>
				</div>
			</div>
		);
	};

	const renderQuizInAccordion = (lessonIndex: number) => {
		const lesson = lessons[lessonIndex];
		if (!lesson?.quiz) return null;
		const quiz = lesson.quiz;
		const isSubmitted = qz.submitted(quiz.id);
		const inlineResult = qz.result(quiz.id);
		const answers = qz.answers(quiz.id) || {};
		const isCurrentQuiz = showQuiz && currentLesson === lessonIndex;
		const perguntas = quiz.perguntas || [];
		const currentStep = qz.step(quiz.id) || 0;
		const isLastStep = currentStep === perguntas.length - 1;

		if (!isCurrentQuiz && !isSubmitted) return null;
		if (!canOpenQuiz(lessonIndex)) return null;

		return (
			<div className="quiz-in-accordion">
				<h4>📝 {quiz.titulo}</h4>
				<p style={{ fontSize: "12px", color: "var(--gray-500)", marginBottom: "12px" }}>{quizPassText(quiz)}</p>

				{inlineResult && (
					<div
						className={`quiz-result-banner ${inlineResult.passed ? "passed" : "failed"}`}
						style={{ marginBottom: "12px" }}
					>
						<div className="quiz-result-header">
							<span className="quiz-result-icon">{inlineResult.passed ? "🎉" : "❌"}</span>
							<div>
								<h3 className="quiz-result-h3">{inlineResult.passed ? "Aprovado!" : "Reprovado"}</h3>
								<p className="quiz-result-sub">
									Nota: {inlineResult.nota}/10 ({inlineResult.correct}/{inlineResult.total} corretas)
								</p>
							</div>
						</div>
					</div>
				)}

				{!isSubmitted && (
					<div className="quiz-step-indicator">
						<span className="quiz-step-text">
							{currentStep + 1} / {perguntas.length}
						</span>
						<div className="quiz-step-bar">
							<div className="quiz-step-fill" style={{ width: `${((currentStep + 1) / perguntas.length) * 100}%` }} />
						</div>
					</div>
				)}

				{!isSubmitted &&
					perguntas[currentStep] &&
					(() => {
						const pergunta = perguntas[currentStep];
						const _letter = null;
						return (
							<div style={{ marginBottom: "12px" }}>
								<p style={{ fontWeight: "600", marginBottom: "8px", fontSize: "13px" }}>
									{currentStep + 1}. {pergunta.pergunta}
								</p>
								<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
									{[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD]
										.filter(Boolean)
										.map((opt: string, oIndex: number) => {
											const l = ["A", "B", "C", "D"][oIndex];
											const isSelected = answers[pergunta.id] === l;
											return (
												<label key={oIndex} className={`quiz-opt ${isSelected ? "selected" : ""}`}>
													<input
														type="radio"
														name={`acc-${quiz.id}-${pergunta.id}`}
														checked={isSelected}
														onChange={() => qz.setAnswer(quiz.id, pergunta.id, l)}
													/>
													<span className="quiz-letter">{l}</span>
													{opt}
												</label>
											);
										})}
								</div>
							</div>
						);
					})()}

				{isSubmitted &&
					perguntas.map((pergunta: any, qIndex: number) => (
						<div key={qIndex} style={{ marginBottom: "8px", fontSize: "12px" }}>
							<span
								style={{
									color: answers[pergunta.id] === pergunta.correta ? "var(--pg-green)" : "var(--pg-red)",
									fontWeight: 600,
								}}
							>
								{answers[pergunta.id] === pergunta.correta ? "✓" : "✗"} {qIndex + 1}.{" "}
								{pergunta.pergunta.substring(0, 50)}
								{pergunta.pergunta.length > 50 ? "..." : ""}
							</span>
						</div>
					))}

				{!isSubmitted && (
					<div className="quiz-step-nav">
						{currentStep > 0 && (
							<button className="btn-secondary" onClick={() => qz.setStep(quiz.id, currentStep - 1)}>
								<i className="icon-arrow-left icon-sm" /> Anterior
							</button>
						)}
						{isLastStep ? (
							<button
								className="btn-primary"
								style={{ flex: 1 }}
								onClick={() => qz.submit(quiz)}
								disabled={Object.keys(answers).length < perguntas.length}
							>
								Enviar Respostas
							</button>
						) : (
							<button
								className="btn-primary"
								style={{ flex: 1 }}
								onClick={() => qz.setStep(quiz.id, currentStep + 1)}
								disabled={!answers[perguntas[currentStep]?.id]}
							>
								Proxima <i className="icon-chevron-right icon-sm" />
							</button>
						)}
					</div>
				)}

				{isSubmitted && !inlineResult?.passed && (
					<button
						className="btn-secondary"
						style={{ width: "100%" }}
						onClick={() => {
							qz.reset(quiz.id);
						}}
					>
						Tentar Novamente
					</button>
				)}
			</div>
		);
	};

	const renderAllQuizzes = () => {
		return (
			<div className="quizzes-section">
				<h3 className="quizzes-title">📝 Todos os Quizzes</h3>
				{quizzesWithLesson.length === 0 ? (
					<div className="empty-state quizzes-empty-p">
						<p className="quizzes-empty-text">Nenhum quiz disponivel neste curso.</p>
					</div>
				) : (
					<div className="quizzes-list">
						{quizzesWithLesson.map((lesson) => {
							const quiz = lesson.quiz;
							const result = allQuizResults[quiz.id];
							const passed = result?.concluido;
							const isExpanded = expandedQuizId === quiz.id;
							const isSubmitted = qz.submitted(quiz.id);
							const inlineResult = qz.result(quiz.id);
							const answers = qz.answers(quiz.id) || {};
							const lessonIdx = lessons.indexOf(lesson);
							const quizAccessible = canOpenQuiz(lessonIdx);
							const cardClass = passed ? "passed" : isExpanded ? "expanded" : quizAccessible ? "default" : "default";

							return (
								<div key={quiz.id} className={`quiz-card ${cardClass}`}>
									<div
										className="quiz-card-header"
										onClick={() => {
											if (!quizAccessible && !passed) return;
											setExpandedQuizId(isExpanded ? null : quiz.id);
										}}
									>
										<div className="quiz-card-row">
											<div>
												<div className="quiz-card-title">📝 {quiz.titulo}</div>
												<div className="quiz-card-meta">
													Aula: {lesson.titulo} · {quiz.perguntas?.length || 0} perguntas · Nota minima:{" "}
													{quiz.notaMinima ?? 7}/10
												</div>
											</div>
											<div className="quiz-card-right">
												{!quizAccessible && !passed ? (
													<span className="quiz-badge-not-started">
														<i className="icon-lock icon-sm" /> Bloqueado
													</span>
												) : result ? (
													<span className={passed ? "quiz-badge-passed" : "quiz-badge-failed"}>
														{passed ? `✓ ${result.nota}/10` : `✗ ${result.nota}/10`}
													</span>
												) : (
													<span className="quiz-badge-not-started">Nao resolvido</span>
												)}
												<i className={`icon-chevron-${isExpanded ? "up" : "down"} icon-sm quiz-chevron-gray`} />
											</div>
										</div>
									</div>
									{isExpanded && (
										<div className="quiz-expanded-body">
											{inlineResult && (
												<div
													className={`quiz-result-banner ${inlineResult.passed ? "passed" : "failed"} quiz-result-header-mt`}
												>
													<div className="quiz-result-header">
														<span className="quiz-result-icon">{inlineResult.passed ? "🎉" : "❌"}</span>
														<div>
															<h3 className="quiz-result-h3">{inlineResult.passed ? "Aprovado!" : "Reprovado"}</h3>
															<p className="quiz-result-sub">
																Nota: {inlineResult.nota}/10 ({inlineResult.correct}/{inlineResult.total} corretas)
															</p>
														</div>
													</div>
													{!inlineResult.passed && (
														<div className="quiz-retry-mt">
															<button
																className="btn-secondary quiz-retry-btn"
																onClick={() => {
																	qz.reset(quiz.id);
																}}
															>
																Tentar Novamente
															</button>
														</div>
													)}
												</div>
											)}
											{!isSubmitted &&
												(() => {
													const perguntas = quiz.perguntas || [];
													const step = qz.step(quiz.id) || 0;
													const isLast = step === perguntas.length - 1;
													const pergunta = perguntas[step];
													if (!pergunta) return null;
													return (
														<>
															<div className="quiz-step-indicator">
																<span className="quiz-step-text">
																	{step + 1} / {perguntas.length}
																</span>
																<div className="quiz-step-bar">
																	<div
																		className="quiz-step-fill"
																		style={{ width: `${((step + 1) / perguntas.length) * 100}%` }}
																	/>
																</div>
															</div>
															<div className="quiz-questions-mt">
																<div className="quiz-question-item">
																	<p className="quiz-question-text">
																		{step + 1}. {pergunta.pergunta}
																	</p>
																	<div className="quiz-options">
																		{[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD]
																			.filter(Boolean)
																			.map((opt: string, oIndex: number) => {
																				const letter = ["A", "B", "C", "D"][oIndex];
																				const isSelected = answers[pergunta.id] === letter;
																				return (
																					<label key={oIndex} className={`quiz-opt ${isSelected ? "selected" : ""}`}>
																						<input
																							type="radio"
																							name={`inline-${quiz.id}-${pergunta.id}`}
																							checked={isSelected}
																							onChange={() => qz.setAnswer(quiz.id, pergunta.id, letter)}
																						/>
																						<span className="quiz-letter">{letter}</span>
																						{opt}
																					</label>
																				);
																			})}
																	</div>
																</div>
															</div>
															<div className="quiz-step-nav">
																{step > 0 && (
																	<button className="btn-secondary" onClick={() => qz.setStep(quiz.id, step - 1)}>
																		<i className="icon-arrow-left icon-sm" /> Anterior
																	</button>
																)}
																{isLast ? (
																	<button
																		className="btn-primary quiz-submit-btn"
																		style={{ flex: 1 }}
																		onClick={() => qz.submit(quiz)}
																		disabled={Object.keys(answers).length < perguntas.length}
																	>
																		Enviar Respostas
																	</button>
																) : (
																	<button
																		className="btn-primary quiz-submit-btn"
																		style={{ flex: 1 }}
																		onClick={() => qz.setStep(quiz.id, step + 1)}
																		disabled={!answers[perguntas[step]?.id]}
																	>
																		Proxima <i className="icon-chevron-right icon-sm" />
																	</button>
																)}
															</div>
														</>
													);
												})()}
											{isSubmitted &&
												quiz.perguntas?.map((pergunta: any, qIndex: number) => (
													<div key={qIndex} className="quiz-breakdown-item" style={{ marginBottom: "6px" }}>
														<span
															className="quiz-breakdown-icon"
															style={{
																color: answers[pergunta.id] === pergunta.correta ? "var(--pg-green)" : "var(--pg-red)",
															}}
														>
															{answers[pergunta.id] === pergunta.correta ? "✓" : "✗"}
														</span>
														<span className="quiz-breakdown-text">
															{qIndex + 1}. {pergunta.pergunta.substring(0, 50)}
															{pergunta.pergunta.length > 50 ? "..." : ""}
														</span>
														<span className="quiz-breakdown-answer">
															{answers[pergunta.id] === pergunta.correta
																? pergunta.correta
																: `${answers[pergunta.id] || "-"} → ${pergunta.correta}`}
														</span>
													</div>
												))}
										</div>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	const renderQuizModal = () => {
		const modalLesson = lessons[quizModalLessonIndex!];
		if (!modalLesson?.quiz) return null;
		const quiz = modalLesson.quiz;
		const isSubmitted = qz.submitted(quiz.id);
		const inlineResult = qz.result(quiz.id);
		const answers = qz.answers(quiz.id) || {};
		const perguntas = quiz.perguntas || [];
		const currentStep = qz.step(quiz.id) || 0;
		const isLastStep = currentStep === perguntas.length - 1;
		const pergunta = perguntas[currentStep];

		return (
			<div className="quiz-modal-overlay" onClick={() => setQuizModalLessonIndex(null)}>
				<div className="quiz-modal-content" onClick={(e) => e.stopPropagation()}>
					<div className="quiz-modal-header">
						<h3>📝 {quiz.titulo}</h3>
						<button className="quiz-modal-close" onClick={() => setQuizModalLessonIndex(null)}>
							<i className="icon-x" />
						</button>
					</div>

					<p className="quiz-modal-subtitle">
						Aula: {modalLesson.titulo} · {quizPassText(quiz)}
					</p>

					{inlineResult && (
						<div className={`quiz-result-banner ${inlineResult.passed ? "passed" : "failed"}`}>
							<div className="quiz-result-header">
								<span className="quiz-result-icon">{inlineResult.passed ? "🎉" : "❌"}</span>
								<div>
									<h3 className="quiz-result-h3">{inlineResult.passed ? "Aprovado!" : "Reprovado"}</h3>
									<p className="quiz-result-sub">
										Nota: {inlineResult.nota}/10 ({inlineResult.correct}/{inlineResult.total} corretas)
									</p>
								</div>
							</div>
							{!inlineResult.passed && (
								<div style={{ marginTop: "8px" }}>
									<button
										className="btn-secondary"
										onClick={() => {
											qz.reset(quiz.id);
										}}
									>
										Tentar Novamente
									</button>
								</div>
							)}
						</div>
					)}

					{!isSubmitted && (
						<div className="quiz-step-indicator">
							<span className="quiz-step-text">
								{currentStep + 1} / {perguntas.length}
							</span>
							<div className="quiz-step-bar">
								<div className="quiz-step-fill" style={{ width: `${((currentStep + 1) / perguntas.length) * 100}%` }} />
							</div>
						</div>
					)}

					{!isSubmitted && pergunta && (
						<div style={{ marginBottom: "12px" }}>
							<p style={{ fontWeight: "600", marginBottom: "8px", fontSize: "14px" }}>
								{currentStep + 1}. {pergunta.pergunta}
							</p>
							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								{[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD]
									.filter(Boolean)
									.map((opt: string, oIndex: number) => {
										const l = ["A", "B", "C", "D"][oIndex];
										const isSelected = answers[pergunta.id] === l;
										return (
											<label key={oIndex} className={`quiz-opt ${isSelected ? "selected" : ""}`}>
												<input
													type="radio"
													name={`modal-${quiz.id}-${pergunta.id}`}
													checked={isSelected}
													onChange={() => qz.setAnswer(quiz.id, pergunta.id, l)}
												/>
												<span className="quiz-letter">{l}</span>
												{opt}
											</label>
										);
									})}
							</div>
						</div>
					)}

					{isSubmitted &&
						perguntas.map((p: any, qIndex: number) => (
							<div key={qIndex} style={{ marginBottom: "8px", fontSize: "13px" }}>
								<span
									style={{
										color: answers[p.id] === p.correta ? "var(--pg-green)" : "var(--pg-red)",
										fontWeight: "600",
									}}
								>
									{answers[p.id] === p.correta ? "✓" : "✗"}
								</span>{" "}
								{qIndex + 1}. {p.pergunta.substring(0, 50)}
								{p.pergunta.length > 50 ? "..." : ""}
								{answers[p.id] !== p.correta && (
									<span style={{ color: "var(--gray-400)", fontSize: "11px" }}> → {p.correta}</span>
								)}
							</div>
						))}

					{!isSubmitted && (
						<div className="quiz-step-nav" style={{ marginTop: "12px" }}>
							{currentStep > 0 && (
								<button className="btn-secondary" onClick={() => qz.setStep(quiz.id, currentStep - 1)}>
									<i className="icon-arrow-left icon-sm" /> Anterior
								</button>
							)}
							{isLastStep ? (
								<button
									className="btn-primary"
									style={{ flex: 1 }}
									onClick={() => {
										qz.submit(quiz);
									}}
									disabled={Object.keys(answers).length < perguntas.length}
								>
									Enviar Respostas
								</button>
							) : (
								<button
									className="btn-primary"
									style={{ flex: 1 }}
									onClick={() => qz.setStep(quiz.id, currentStep + 1)}
									disabled={!answers[perguntas[currentStep]?.id]}
								>
									Proxima <i className="icon-chevron-right icon-sm" />
								</button>
							)}
						</div>
					)}
				</div>
			</div>
		);
	};

	const openMediaModal = (
		url: string,
		type: "pdf" | "video",
		title: string,
		startTime?: number,
		lessonIndex?: number,
	) => {
		setMediaModal({ url, type, title, startTime, lessonIndex });
	};

	const renderMediaButton = (lesson: any, lessonIndex?: number) => {
		if (lesson.tipo === "PDF" && lesson.pdfUrl) {
			return (
				<button
					className="media-open-btn"
					onClick={() => openMediaModal(lesson.pdfUrl, "pdf", lesson.titulo, undefined, lessonIndex)}
				>
					<i className="icon-file-text" /> Abrir PDF
				</button>
			);
		}
		if (lesson.videoUrl) {
			return (
				<button
					className="media-open-btn"
					onClick={() => openMediaModal(lesson.videoUrl, "video", lesson.titulo, undefined, lessonIndex)}
				>
					<i className="icon-play" /> Assistir Video
				</button>
			);
		}
		return null;
	};

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
					<div className="media-modal-overlay" onClick={() => setMediaModal(null)}>
						<div className="media-modal" onClick={(e) => e.stopPropagation()}>
							<div className="media-modal-header">
								<span className="media-modal-title">{mediaModal.title}</span>
								<button className="media-modal-close" onClick={() => setMediaModal(null)}>
									<i className="icon-x" />
								</button>
							</div>
							<div className="media-modal-body">
								{mediaModal.type === "pdf" ? (
									<PDFViewer url={mediaModal.url} />
								) : (
									(() => {
										let embedUrl = mediaModal.url
											.replace("watch?v=", "embed/")
											.replace("youtu.be/", "youtube.com/embed/");
										const params = new URLSearchParams();
										if (mediaModal.startTime && mediaModal.startTime > 0) {
											params.set("start", String(mediaModal.startTime));
										}
										params.set("playsinline", "1");
										const qs = params.toString();
										if (qs) {
											embedUrl += `${embedUrl.includes("?") ? "&" : "?"}${qs}`;
										}
										return (
											<iframe
												src={embedUrl}
												title={mediaModal.title}
												allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
												allowFullScreen
											/>
										);
									})()
								)}
							</div>
							{mediaModal.lessonIndex != null &&
								(() => {
									const modalLesson = lessons[mediaModal.lessonIndex];
									const hasQuiz = !!modalLesson?.quiz;
									const nextExists = mediaModal.lessonIndex < lessons.length - 1;
									if (!hasQuiz && !nextExists) return null;
									return (
										<div className="media-modal-actions">
											{hasQuiz && (
												<button
													className="btn-secondary"
													onClick={() => {
														setMediaModal(null);
														if (isMobile) {
															setQuizModalLessonIndex(mediaModal.lessonIndex!);
														} else {
															setCurrentLesson(mediaModal.lessonIndex!);
															setShowQuiz(true);
															if (currentQuizId) qz.reset(currentQuizId);
														}
													}}
												>
													📝 Quiz
												</button>
											)}
											{nextExists && (
												<button
													className="btn-primary"
													onClick={() => {
														setMediaModal(null);
														const nextIdx = mediaModal.lessonIndex! + 1;
														if (isMobile) {
															setExpandedMobileLesson(nextIdx);
														}
														setCurrentLesson(nextIdx);
														resetLessonState();
													}}
												>
													Proxima Aula <i className="icon-chevron-right icon-sm" />
												</button>
											)}
										</div>
									);
								})()}
						</div>
					</div>
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
					<div className="lesson-sidebar">
						<div className="lesson-sidebar-header">
							<h3>{curso.titulo}</h3>
							<p>
								{lessons.filter((l) => isLessonCompleted(l)).length}/{lessons.length} concluidas
							</p>
						</div>

						{lessons.map((lesson, i) => {
							const completed = isLessonCompleted(lesson);
							const locked = lesson.obrigatorio && !completed && !canAdvanceToLesson(i);
							const canClick = !locked || completed;
							const isActive = i === currentLesson && !showAllQuizzes && !showCertificate;
							const isExpanded = isMobile && expandedMobileLesson === i;
							const tipoLabel =
								lesson.tipo === "PDF"
									? "PDF"
									: lesson.tipo === "TEXTO"
										? "Texto"
										: lesson.videoUrl
											? "Video"
											: "Conteudo";
							const tipoBadgeClass =
								lesson.tipo === "PDF"
									? "pdf"
									: lesson.tipo === "TEXTO"
										? "texto"
										: lesson.videoUrl
											? "video"
											: "default";

							const handleLessonClick = () => {
								if (!canClick) return;
								if (isMobile) {
									setExpandedMobileLesson(isExpanded ? null : i);
									setExpandedMobileExtra(null);
									if (!isExpanded) {
										setShowAllQuizzes(false);
										setShowCertificate(false);
										setCurrentLesson(i);
										resetLessonState();
									}
								} else {
									setShowAllQuizzes(false);
									setShowCertificate(false);
									setCurrentLesson(i);
									resetLessonState();
								}
							};

							return (
								<div
									key={lesson.id || i}
									className={`lesson-item ${isActive ? "active" : ""} ${completed ? "done" : ""} ${locked && !completed ? "locked" : ""}`}
									style={!canClick ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
								>
									<div className="lesson-item-header" onClick={handleLessonClick}>
										<div className="lesson-num">
											{completed ? (
												<i className="icon-check icon-sm" />
											) : locked ? (
												<i className="icon-lock icon-sm" />
											) : (
												i + 1
											)}
										</div>
										<div className="lesson-item-info">
											<b>{lesson.titulo}</b>
											<span>
												{tipoLabel}
												{lesson.licoes && lesson.licoes.length > 0
													? ` · ${lesson.licoes.length} ${pluralize(lesson.licoes.length, "licao")}`
													: ""}
											</span>
										</div>
										{completed && !isMobile && (
											<span className="lesson-check">
												<i className="icon-check icon-sm" />
											</span>
										)}
										{locked && !completed && !isMobile && (
											<span className="lesson-locked-icon">
												<i className="icon-lock icon-sm" />
											</span>
										)}
										{isMobile && (
											<>
												<span className={`lesson-item-type-badge ${tipoBadgeClass}`}>
													{lesson.tipo === "PDF" ? (
														<i className="icon-file-text lesson-type-icon" />
													) : lesson.videoUrl ? (
														<i className="icon-play lesson-type-icon" />
													) : (
														<i className="icon-file lesson-type-icon" />
													)}
													{tipoLabel}
												</span>
												<i
													className={`icon-chevron-${isExpanded ? "up" : "down"} icon-sm lesson-item-chevron ${isExpanded ? "expanded" : ""}`}
												/>
											</>
										)}
									</div>

									{isActive &&
										!isMobile &&
										lesson.tipo === "VIDEO" &&
										lesson.ancoragemPoints &&
										(lesson.ancoragemPoints as any[]).length > 0 && (
											<div className="lesson-sidebar-chapters">
												{(lesson.ancoragemPoints as any[]).map((pt: any, ci: number) => {
													const totalSec = (pt.hours || 0) * 3600 + (pt.minutes || 0) * 60 + (pt.seconds || 0);
													const nextPt = (lesson.ancoragemPoints as any[])[ci + 1];
													const nextSec = nextPt
														? (nextPt.hours || 0) * 3600 + (nextPt.minutes || 0) * 60 + (nextPt.seconds || 0)
														: Infinity;
													const isActiveChapter = videoCurrentTime >= totalSec && videoCurrentTime < nextSec;
													const isPast = videoCurrentTime >= nextSec;
													const h = Math.floor(totalSec / 3600);
													const m = Math.floor((totalSec % 3600) / 60);
													const s = Math.floor(totalSec % 60);
													const timeLabel =
														h > 0
															? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
															: `${m}:${s.toString().padStart(2, "0")}`;
													return (
														<button
															key={ci}
															className={`sidebar-chapter-btn ${isActiveChapter ? "active" : ""} ${isPast ? "past" : ""}`}
															onClick={(e) => {
																e.stopPropagation();
																videoRef.current?.seekTo(totalSec);
															}}
														>
															<span className="sidebar-chapter-dot" />
															<span className="sidebar-chapter-time">{timeLabel}</span>
															<span className="sidebar-chapter-label">{pt.titulo || `Ponto ${ci + 1}`}</span>
														</button>
													);
												})}
											</div>
										)}

									{isMobile && isExpanded && (
										<div className="lesson-item-accordion-body">
											{renderMediaButton(lesson, i)}

											{lesson.tipo === "VIDEO" &&
												lesson.ancoragemPoints &&
												(lesson.ancoragemPoints as any[]).length > 0 && (
													<div className="lesson-mobile-chapters">
														{(lesson.ancoragemPoints as any[]).map((pt: any, ci: number) => {
															const totalSec = (pt.hours || 0) * 3600 + (pt.minutes || 0) * 60 + (pt.seconds || 0);
															const nextPt = (lesson.ancoragemPoints as any[])[ci + 1];
															const nextSec = nextPt
																? (nextPt.hours || 0) * 3600 + (nextPt.minutes || 0) * 60 + (nextPt.seconds || 0)
																: Infinity;
															const isActivePill = videoCurrentTime >= totalSec && videoCurrentTime < nextSec;
															const isPastPill = videoCurrentTime >= nextSec;
															const h = Math.floor(totalSec / 3600);
															const m = Math.floor((totalSec % 3600) / 60);
															const s = Math.floor(totalSec % 60);
															const timeLabel =
																h > 0
																	? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
																	: `${m}:${s.toString().padStart(2, "0")}`;
															return (
																<button
																	key={ci}
																	className={`mobile-chapter-pill ${isActivePill ? "active" : ""} ${isPastPill ? "past" : ""}`}
																	onClick={(e) => {
																		e.stopPropagation();
																		if (isMobile && lesson.videoUrl) {
																			openMediaModal(lesson.videoUrl, "video", lesson.titulo, totalSec, i);
																		} else {
																			videoRef.current?.seekTo(totalSec);
																		}
																	}}
																>
																	{timeLabel} — {pt.titulo || `Ponto ${ci + 1}`}
																</button>
															);
														})}
													</div>
												)}

											<div className="lesson-desc">{lesson.descricao || "Conteudo da aula."}</div>

											<div className="lesson-meta-tags">
												<span className="lesson-meta-tag">{tipoLabel}</span>
												{lesson.licoes && lesson.licoes.length > 0 && (
													<span className="lesson-meta-tag">
														{lesson.licoes.length} {pluralize(lesson.licoes.length, "licao")}
													</span>
												)}
												{completed && <span className="lesson-meta-tag completed">✓ Concluido</span>}
												{lesson.obrigatorio && <span className="lesson-meta-tag required">Obrigatorio</span>}
											</div>

											{lesson.quiz && !completed && !showQuiz && canOpenQuiz(i) && (
												<div className="lesson-quiz-alert">
													<b>📝 Esta aula contem um quiz</b>
													<p className="lesson-quiz-alert-p">{quizPassText(lesson.quiz)}.</p>
												</div>
											)}

											{showQuiz && currentLesson === i && renderQuizInAccordion(i)}

											{!showQuiz && (
												<div className="lesson-nav-btns">
													{i > 0 && canAdvanceToLesson(i - 1) && (
														<button
															className="btn-secondary"
															onClick={() => {
																setExpandedMobileLesson(i - 1);
																setCurrentLesson(i - 1);
																resetLessonState();
															}}
														>
															<i className="icon-arrow-left icon-sm" /> Anterior
														</button>
													)}
													{!completed ? (
														lesson.quiz ? (
															canOpenQuiz(i) ? (
																<button
																	className="btn-primary"
																	onClick={() => {
																		setCurrentLesson(i);
																		setShowQuiz(true);
																	}}
																>
																	Iniciar Quiz <i className="icon-chevron-right icon-sm" />
																</button>
															) : (
																<button
																	className="btn-primary locked-msg-btn"
																	onClick={() =>
																		toast(
																			"Nao e possivel avancar para a proxima aula sem antes resolver o quiz anterior.",
																			"info",
																		)
																	}
																>
																	<i className="icon-lock icon-sm" /> Quiz bloqueado
																</button>
															)
														) : (
															<button
																className="btn-primary"
																onClick={() => {
																	setCurrentLesson(i);
																	handleConcluir();
																}}
															>
																Proximo <i className="icon-chevron-right icon-sm" />
															</button>
														)
													) : i < lessons.length - 1 ? (
														<>
															{lesson.quiz && (
																<button className="btn-secondary" onClick={() => setQuizModalLessonIndex(i)}>
																	📝 Quiz <i className="icon-chevron-right icon-sm" />
																</button>
															)}
															<button
																className="btn-primary"
																onClick={() => {
																	setExpandedMobileLesson(i + 1);
																	setCurrentLesson(i + 1);
																	resetLessonState();
																}}
															>
																Proxima Aula <i className="icon-chevron-right icon-sm" />
															</button>
														</>
													) : allCompleted ? (
														<button className="btn-primary" onClick={() => navigate("/cursos")}>
															<i className="icon-check-circle icon-sm" /> Finalizar Curso
														</button>
													) : null}
												</div>
											)}

											{showQuiz && currentLesson === i && qz.result(lessons[i]?.quiz?.id)?.passed && (
												<div className="lesson-nav-btns">
													<button
														className="btn-primary"
														onClick={() => {
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
													>
														{i < lessons.length - 1 ? "Proxima Aula" : "Finalizar Curso"}{" "}
														<i className="icon-chevron-right icon-sm" />
													</button>
												</div>
											)}
										</div>
									)}
								</div>
							);
						})}

						{allCompleted && (
							<div className="completed-banner">
								<i className="icon-check-circle icon-lg completed-banner-icon" />
								<p className="completed-banner-text">Curso Concluido!</p>
								{curso.autoCertificado && <p className="completed-auto-cert">Certificado gerado automaticamente.</p>}
							</div>
						)}

						<div className="lesson-sidebar-extras">
							<div
								className={`sidebar-extra-item ${showAllQuizzes ? "active" : ""}`}
								onClick={() => {
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
								}}
							>
								<i className="icon-file-text icon-sm" />
								<span>Todos os Quizzes</span>
								<span className="sidebar-extra-badge">{quizzesWithLesson.length}</span>
								{isMobile && (
									<i
										className={`icon-chevron-${expandedMobileExtra === "quizzes" ? "up" : "down"} icon-sm extra-chevron ${expandedMobileExtra === "quizzes" ? "expanded" : ""}`}
									/>
								)}
							</div>
							{isMobile && expandedMobileExtra === "quizzes" && (
								<div className="sidebar-extra-accordion-body">{renderAllQuizzes()}</div>
							)}
							<div
								className={`sidebar-extra-item ${showCertificate ? "active" : ""}`}
								onClick={() => {
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
								}}
							>
								<i className="icon-award icon-sm" />
								<span>Meu Certificado</span>
								{hasCertificate && areAllQuizzesPassed() && <span className="sidebar-extra-check">✓</span>}
								{isMobile && (
									<i
										className={`icon-chevron-${expandedMobileExtra === "certificate" ? "up" : "down"} icon-sm extra-chevron ${expandedMobileExtra === "certificate" ? "expanded" : ""}`}
									/>
								)}
							</div>
							{isMobile && expandedMobileExtra === "certificate" && (
								<div className="sidebar-extra-accordion-body">{renderCertificateTab()}</div>
							)}
						</div>

						{/* Restart Request Button */}
						{isAtendente && (
							<div className="sidebar-extra-item">
								<div
									className={`sidebar-extra-btn ${restartRequested ? "requested" : ""}`}
									onClick={async () => {
										if (restartRequested) return;
										if (!window.confirm("Solicitar reinicio do progresso deste curso? O gestor sera notificado."))
											return;
										try {
											await api.requestRestart(curso.id);
											setRestartRequested(true);
											alert("Solicitação enviada ao gestor!");
										} catch {
											alert("Erro ao enviar solicitação");
										}
									}}
								>
									<i className="icon-refresh icon-sm" />
									<span>{restartRequested ? "Solicitação Enviada" : "Solicitar Reiniciar"}</span>
									{restartRequested && <span className="sidebar-extra-check">⏳</span>}
								</div>
							</div>
						)}
					</div>

					<div className="lesson-content">
						{showAllQuizzes ? (
							renderAllQuizzes()
						) : showCertificate ? (
							renderCertificateTab()
						) : !showQuiz ? (
							<>
								{current?.tipo === "PDF" && current?.pdfUrl ? (
									<div className="lesson-video">
										<PDFViewer url={current.pdfUrl} />
									</div>
								) : current?.videoUrl ? (
									<div className="lesson-video">
										<VideoPlayer
											ref={videoRef}
											key={`${current.id}-${current.videoInicio}`}
											url={current.videoUrl}
											startAt={current.videoInicio || 0}
											endAt={current.videoFim || undefined}
											licoesAncoragem={current.ancoragemPoints || undefined}
											onTimeUpdate={(time) => {
												if (current.videoFim && time >= current.videoFim) handleVideoEnd();
											}}
											onCurrentTimeChange={setVideoCurrentTime}
										/>
									</div>
								) : current?.tipo === "TEXTO" ? (
									<div className="lesson-video">
										<div className="lesson-video-placeholder">
											<div className="play-btn">
												<i className="icon-file-text icon-xl" />
											</div>
											<p>Conteudo de Texto</p>
											<small className="lesson-text-placeholder">{current?.titulo}</small>
										</div>
									</div>
								) : (
									<div className="lesson-video">
										<div className="lesson-video-placeholder">
											<div className="play-btn">
												<i className="icon-file-text icon-xl" />
											</div>
											<p>Conteudo da Aula</p>
											<small className="lesson-text-placeholder">{current?.titulo || "Material de leitura"}</small>
										</div>
									</div>
								)}
								<div className="lesson-body">
									<h2>{current?.titulo}</h2>
									<div className="lesson-tags">
										<span className="lesson-tag">
											{current?.tipo === "PDF" ? "PDF" : current?.videoUrl ? "Video" : "Conteudo"}
										</span>
										{current?.tipo === "VIDEO" &&
											current?.ancoragemPoints &&
											(current.ancoragemPoints as any[]).length > 0 && (
												<span className="lesson-tag">
													{(current.ancoragemPoints as any[]).length}{" "}
													{(current.ancoragemPoints as any[]).length === 1
														? "ponto de ancoragem"
														: "pontos de ancoragem"}
												</span>
											)}
										{current?.tipo !== "VIDEO" && current?.licoes && current.licoes.length > 0 && (
											<span className="lesson-tag">
												{current.licoes.length} {pluralize(current.licoes.length, "licao")}
											</span>
										)}
										{current?.videoInicio || current?.videoFim ? (
											<span className="lesson-tag">
												⏱ {current.videoInicio || 0}s – {current.videoFim || "fim"}s
											</span>
										) : null}
										{current?.concluido && <span className="lesson-tag lesson-tags-concluido">✓ Concluido</span>}
										{current?.obrigatorio && <span className="lesson-tag lesson-tags-obrigatorio">Obrigatorio</span>}
									</div>
									<div className="lesson-text">{current?.descricao || "Conteudo da aula."}</div>
									{current?.licoes && current.licoes.length > 0 && current?.tipo !== "VIDEO" && (
										<div className="lesson-cons-section">
											<h3 className="lesson-cons-title">Licoes ({current.licoes.length})</h3>
											<div className="lesson-cons-list">
												{[...current.licoes]
													.sort((a: any, b: any) => a.ordem - b.ordem)
													.map((licao: any) => {
														const isLicaoExpanded = expandedLicao === licao.id;
														const tipoIcon =
															licao.tipo === "VIDEO"
																? "icon-play"
																: licao.tipo === "PDF"
																	? "icon-file-text"
																	: "icon-file";
														const licaoTipoLabel =
															licao.tipo === "VIDEO" ? "Video" : licao.tipo === "PDF" ? "PDF" : "Texto";
														return (
															<div key={licao.id} className="lesson-cons-item">
																<div
																	onClick={() => setExpandedLicao(isLicaoExpanded ? null : licao.id)}
																	className={`lesson-cons-header ${isLicaoExpanded ? "expanded" : "default"}`}
																>
																	<i className={`${tipoIcon} icon-sm lesson-cons-icon`} />
																	<div className="lesson-cons-info">
																		<div className="lesson-cons-name">{licao.titulo}</div>
																		<div className="lesson-cons-meta">
																			{licaoTipoLabel}
																			{licao.duracaoMin ? ` · ${licao.duracaoMin} min` : ""}
																		</div>
																	</div>
																	<i
																		className={`icon-chevron-${isLicaoExpanded ? "up" : "down"} icon-sm lesson-cons-chevron`}
																	/>
																</div>
																{isLicaoExpanded && (
																	<div className="lesson-cons-body">
																		{licao.tipo === "VIDEO" && licao.conteudo ? (
																			<div className="lesson-cons-video">
																				<VideoPlayer
																					key={licao.id}
																					url={licao.conteudo}
																					startAt={licao.inicioSeg || 0}
																					endAt={licao.fimSeg || undefined}
																				/>
																			</div>
																		) : licao.tipo === "PDF" && licao.conteudo ? (
																			<div className="lesson-cons-video">
																				<PDFViewer url={licao.conteudo} />
																			</div>
																		) : licao.tipo === "TEXTO" && licao.conteudo ? (
																			<div className="lesson-cons-text">{licao.conteudo}</div>
																		) : (
																			<div className="lesson-cons-empty">Sem conteudo disponivel</div>
																		)}
																	</div>
																)}
															</div>
														);
													})}
											</div>
										</div>
									)}
									{current?.quiz && canOpenQuiz(currentLesson) && (
										<div className="lesson-quiz-warning">
											<b>📝 Esta aula contem um quiz</b>
											<p className="lesson-quiz-warning-p">
												Ao concluir, voce sera direcionado para responder as perguntas. {quizPassText(current.quiz)}.
											</p>
										</div>
									)}
									<div className="lesson-actions">
										{!current?.concluido ? (
											current?.quiz ? (
												canOpenQuiz(currentLesson) ? (
													<>
														<button className="btn-primary lesson-action-btn" onClick={handleConcluir}>
															Iniciar Quiz <i className="icon-chevron-right icon-sm" />
														</button>
														{!current?.obrigatorio && currentLesson < lessons.length - 1 && (
															<button className="btn-secondary lesson-action-btn" onClick={handleAvanzar}>
																Pular <i className="icon-chevron-right icon-sm" />
															</button>
														)}
													</>
												) : (
													<button
														className="btn-primary lesson-action-btn locked-msg-btn"
														onClick={() =>
															toast(
																"Nao e possivel avancar para a proxima aula sem antes resolver o quiz anterior.",
																"info",
															)
														}
													>
														<i className="icon-lock icon-sm" /> Complete os quizzes anteriores primeiro
													</button>
												)
											) : (
												<button className="btn-primary lesson-action-btn" onClick={handleConcluir}>
													Proximo <i className="icon-chevron-right icon-sm" />
												</button>
											)
										) : (
											<>
												{current?.quiz && (
													<button
														className="btn-secondary lesson-action-btn"
														onClick={() => {
															setShowQuiz(true);
															if (currentQuizId) qz.reset(currentQuizId);
														}}
													>
														📝 Quiz <i className="icon-chevron-right icon-sm" />
													</button>
												)}
												{currentLesson < lessons.length - 1 && (
													<button className="btn-primary lesson-action-btn" onClick={handleAvanzar}>
														<span>Proxima Aula</span>
														<i className="icon-chevron-right icon-sm" />
													</button>
												)}
												{isLastLesson && allCompleted && (
													<button
														className="btn-primary lesson-action-btn lesson-action-btn-green"
														onClick={() => navigate("/cursos")}
													>
														<i className="icon-check-circle icon-sm" /> Finalizar Curso
													</button>
												)}
											</>
										)}
										{currentLesson > 0 && (
											<button
												className="btn-secondary lesson-anterior-btn"
												onClick={() => {
													setCurrentLesson(currentLesson - 1);
													resetLessonState();
												}}
											>
												<i className="icon-arrow-left icon-sm" /> Anterior
											</button>
										)}
									</div>
								</div>
							</>
						) : (
							<div className="lesson-body">
								<h2>Quiz: {current?.titulo}</h2>
								<div className="lesson-text">
									Responda todas as perguntas para concluir esta aula. {quizPassText(current?.quiz)}
								</div>

								{qz.result(currentQuizId) && (
									<div className={`quiz-result-banner ${qz.result(currentQuizId).passed ? "passed" : "failed"}`}>
										<div className="quiz-result-header">
											<span className="quiz-result-icon">{qz.result(currentQuizId).passed ? "🎉" : "❌"}</span>
											<div>
												<h3 className="quiz-result-h3">
													{qz.result(currentQuizId).passed ? "Aprovado!" : "Reprovado"}
												</h3>
												<p className="quiz-result-sub">
													Nota: {qz.result(currentQuizId).nota}/10 ({qz.result(currentQuizId).correct}/
													{qz.result(currentQuizId).total} corretas)
												</p>
											</div>
										</div>
										<div className="quiz-result-breakdown">
											{current?.quiz?.perguntas?.map((pergunta: any, qIndex: number) => {
												const userAnswer = qz.answers(currentQuizId)[pergunta.id];
												const isCorrect = userAnswer === pergunta.correta;
												return (
													<div key={qIndex} className={`quiz-breakdown-item ${isCorrect ? "correct" : "wrong"}`}>
														<span className="quiz-breakdown-icon">{isCorrect ? "✓" : "✗"}</span>
														<span className="quiz-breakdown-text">
															{qIndex + 1}. {pergunta.pergunta.substring(0, 60)}
															{pergunta.pergunta.length > 60 ? "..." : ""}
														</span>
														<span className="quiz-breakdown-answer">
															{isCorrect ? pergunta.correta : `${userAnswer || "-"} → ${pergunta.correta}`}
														</span>
													</div>
												);
											})}
										</div>
										<div className="quiz-result-actions">
											{!qz.result(currentQuizId).passed && (
												<button
													className="btn-secondary"
													onClick={() => {
														if (currentQuizId) qz.reset(currentQuizId);
													}}
												>
													Tentar Novamente
												</button>
											)}
											{qz.result(currentQuizId).passed && (
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
									</div>
								)}

								{!qz.submitted(currentQuizId) &&
									(() => {
										const perguntas = current?.quiz?.perguntas || [];
										const step = qz.step(currentQuizId);
										const isLast = step === perguntas.length - 1;
										const pergunta = perguntas[step];
										if (!pergunta) return null;
										return (
											<>
												<div className="quiz-step-indicator">
													<span className="quiz-step-text">
														{step + 1} / {perguntas.length}
													</span>
													<div className="quiz-step-bar">
														<div
															className="quiz-step-fill"
															style={{ width: `${((step + 1) / perguntas.length) * 100}%` }}
														/>
													</div>
												</div>
												<div className="quiz-questions-mt" style={{ marginTop: "16px" }}>
													<div style={{ padding: "16px", background: "#f9f9f9", borderRadius: "8px" }}>
														<p style={{ fontWeight: "600", marginBottom: "12px" }}>
															{step + 1}. {pergunta.pergunta}
														</p>
														<div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
															{[pergunta.opcaoA, pergunta.opcaoB, pergunta.opcaoC, pergunta.opcaoD]
																.filter(Boolean)
																.map((opt: string, oIndex: number) => {
																	const letter = ["A", "B", "C", "D"][oIndex];
																	const isSelected = qz.answers(currentQuizId)[pergunta.id] === letter;
																	return (
																		<label key={oIndex} className={`quiz-opt ${isSelected ? "selected" : ""}`}>
																			<input
																				type="radio"
																				name={`q${pergunta.id}`}
																				checked={isSelected}
																				onChange={() => qz.setAnswer(currentQuizId, pergunta.id, letter)}
																			/>
																			<span className="quiz-letter">{letter}</span>
																			{opt}
																		</label>
																	);
																})}
														</div>
													</div>
												</div>
												<div className="quiz-step-nav">
													{step > 0 && (
														<button className="btn-secondary" onClick={() => qz.setStep(currentQuizId, step - 1)}>
															<i className="icon-arrow-left icon-sm" /> Anterior
														</button>
													)}
													{isLast ? (
														<button
															className="btn-primary"
															style={{ flex: 1 }}
															onClick={() => qz.submit(current.quiz)}
															disabled={Object.keys(qz.answers(currentQuizId)).length < perguntas.length}
														>
															Enviar Respostas
														</button>
													) : (
														<button
															className="btn-primary"
															style={{ flex: 1 }}
															onClick={() => qz.setStep(currentQuizId, step + 1)}
															disabled={!qz.answers(currentQuizId)[pergunta.id]}
														>
															Proxima <i className="icon-chevron-right icon-sm" />
														</button>
													)}
												</div>
											</>
										);
									})()}

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
							</div>
						)}
					</div>
				</div>
			</div>

			{quizModalLessonIndex !== null && renderQuizModal()}
		</>
	);
}
