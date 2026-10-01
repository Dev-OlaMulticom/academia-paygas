import { quizPassText } from "@shared/quiz";
import type { ReactNode, RefObject } from "react";
import { pluralize } from "../../lib/utils";
import { useToast } from "../Toast";
import { formatChapterTime, lessonTipoBadgeClass, lessonTipoLabel, pointToSeconds } from "./utils";

function ChapterList({
	points,
	videoCurrentTime,
	variant,
	onSeek,
}: {
	points: any[];
	videoCurrentTime: number;
	variant: "sidebar" | "pill";
	onSeek: (pt: any, totalSec: number) => void;
}) {
	return (
		<div className={variant === "sidebar" ? "lesson-sidebar-chapters" : "lesson-mobile-chapters"}>
			{points.map((pt: any, ci: number) => {
				const totalSec = pointToSeconds(pt);
				const nextPt = points[ci + 1];
				const nextSec = nextPt ? pointToSeconds(nextPt) : Infinity;
				const isActive = videoCurrentTime >= totalSec && videoCurrentTime < nextSec;
				const isPast = videoCurrentTime >= nextSec;
				const timeLabel = formatChapterTime(totalSec);
				if (variant === "sidebar") {
					return (
						<button
							key={ci}
							className={`sidebar-chapter-btn ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
							onClick={(e) => {
								e.stopPropagation();
								onSeek(pt, totalSec);
							}}
						>
							<span className="sidebar-chapter-dot" />
							<span className="sidebar-chapter-time">{timeLabel}</span>
							<span className="sidebar-chapter-label">{pt.titulo || `Ponto ${ci + 1}`}</span>
						</button>
					);
				}
				return (
					<button
						key={ci}
						className={`mobile-chapter-pill ${isActive ? "active" : ""} ${isPast ? "past" : ""}`}
						onClick={(e) => {
							e.stopPropagation();
							onSeek(pt, totalSec);
						}}
					>
						{timeLabel} — {pt.titulo || `Ponto ${ci + 1}`}
					</button>
				);
			})}
		</div>
	);
}

function MediaButton({ lesson, onOpen }: { lesson: any; onOpen: () => void }) {
	if (lesson.tipo === "PDF" && lesson.pdfUrl) {
		return (
			<button className="media-open-btn" onClick={onOpen}>
				<i className="icon-file-text" /> Abrir PDF
			</button>
		);
	}
	if (lesson.videoUrl) {
		return (
			<button className="media-open-btn" onClick={onOpen}>
				<i className="icon-play" /> Assistir Video
			</button>
		);
	}
	return null;
}

export function LessonSidebar({
	curso,
	lessons,
	currentLesson,
	isMobile,
	expandedMobileLesson,
	expandedMobileExtra,
	showQuiz,
	showAllQuizzes,
	showCertificate,
	isAtendente,
	restartRequested,
	videoCurrentTime,
	videoRef,
	isLessonCompleted,
	canAdvanceToLesson,
	canOpenQuiz,
	areAllQuizzesPassed,
	hasCertificate,
	quizzesCount,
	allCompleted,
	isQuizPassedContinue,
	onSelectLesson,
	onPrevLesson,
	onConcluir,
	onStartQuiz,
	onOpenQuizModal,
	onNextLesson,
	onQuizPassedContinue,
	onFinish,
	onToggleQuizzes,
	onToggleCertificate,
	onRequestRestart,
	onOpenMedia,
	renderQuiz,
	renderQuizzes,
	renderCertificate,
}: {
	curso: any;
	lessons: any[];
	currentLesson: number;
	isMobile: boolean;
	expandedMobileLesson: number | null;
	expandedMobileExtra: string | null;
	showQuiz: boolean;
	showAllQuizzes: boolean;
	showCertificate: boolean;
	isAtendente: boolean;
	restartRequested: boolean;
	videoCurrentTime: number;
	videoRef: RefObject<{ seekTo: (s: number) => void } | null>;
	isLessonCompleted: (lesson: any) => boolean;
	canAdvanceToLesson: (index: number) => boolean;
	canOpenQuiz: (lessonIndex: number) => boolean;
	areAllQuizzesPassed: () => boolean;
	hasCertificate: boolean;
	quizzesCount: number;
	allCompleted: boolean;
	isQuizPassedContinue: (index: number) => boolean;
	onSelectLesson: (index: number, isExpanded: boolean) => void;
	onPrevLesson: (index: number) => void;
	onConcluir: (index: number) => void;
	onStartQuiz: (index: number) => void;
	onOpenQuizModal: (index: number) => void;
	onNextLesson: (index: number) => void;
	onQuizPassedContinue: (index: number) => void;
	onFinish: () => void;
	onToggleQuizzes: () => void;
	onToggleCertificate: () => void;
	onRequestRestart: () => void;
	onOpenMedia: (lesson: any, lessonIndex: number, startTime?: number) => void;
	renderQuiz: (lessonIndex: number) => ReactNode;
	renderQuizzes: () => ReactNode;
	renderCertificate: () => ReactNode;
}) {
	const { toast } = useToast();
	return (
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
				const tipoLabel = lessonTipoLabel(lesson);
				const tipoBadgeClass = lessonTipoBadgeClass(lesson);

				return (
					<div
						key={lesson.id || i}
						className={`lesson-item ${isActive ? "active" : ""} ${completed ? "done" : ""} ${locked && !completed ? "locked" : ""}`}
						style={!canClick ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
					>
						<div
							className="lesson-item-header"
							onClick={() => {
								if (canClick) onSelectLesson(i, isExpanded);
							}}
						>
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
								<ChapterList
									points={lesson.ancoragemPoints as any[]}
									videoCurrentTime={videoCurrentTime}
									variant="sidebar"
									onSeek={(_pt, totalSec) => videoRef.current?.seekTo(totalSec)}
								/>
							)}

						{isMobile && isExpanded && (
							<div className="lesson-item-accordion-body">
								<MediaButton lesson={lesson} onOpen={() => onOpenMedia(lesson, i)} />

								{lesson.tipo === "VIDEO" && lesson.ancoragemPoints && (lesson.ancoragemPoints as any[]).length > 0 && (
									<ChapterList
										points={lesson.ancoragemPoints as any[]}
										videoCurrentTime={videoCurrentTime}
										variant="pill"
										onSeek={(_pt, totalSec) => {
											if (lesson.videoUrl) {
												onOpenMedia(lesson, i, totalSec);
											} else {
												videoRef.current?.seekTo(totalSec);
											}
										}}
									/>
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

								{renderQuiz(i)}

								{!showQuiz && (
									<div className="lesson-nav-btns">
										{i > 0 && canAdvanceToLesson(i - 1) && (
											<button className="btn-secondary" onClick={() => onPrevLesson(i)}>
												<i className="icon-arrow-left icon-sm" /> Anterior
											</button>
										)}
										{!completed ? (
											lesson.quiz ? (
												canOpenQuiz(i) ? (
													<button className="btn-primary" onClick={() => onStartQuiz(i)}>
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
												<button className="btn-primary" onClick={() => onConcluir(i)}>
													Proximo <i className="icon-chevron-right icon-sm" />
												</button>
											)
										) : i < lessons.length - 1 ? (
											<>
												{lesson.quiz && (
													<button className="btn-secondary" onClick={() => onOpenQuizModal(i)}>
														📝 Quiz <i className="icon-chevron-right icon-sm" />
													</button>
												)}
												<button className="btn-primary" onClick={() => onNextLesson(i)}>
													Proxima Aula <i className="icon-chevron-right icon-sm" />
												</button>
											</>
										) : allCompleted ? (
											<button className="btn-primary" onClick={onFinish}>
												<i className="icon-check-circle icon-sm" /> Finalizar Curso
											</button>
										) : null}
									</div>
								)}

								{isQuizPassedContinue(i) && (
									<div className="lesson-nav-btns">
										<button className="btn-primary" onClick={() => onQuizPassedContinue(i)}>
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
				<div className={`sidebar-extra-item ${showAllQuizzes ? "active" : ""}`} onClick={onToggleQuizzes}>
					<i className="icon-file-text icon-sm" />
					<span>Todos os Quizzes</span>
					<span className="sidebar-extra-badge">{quizzesCount}</span>
					{isMobile && (
						<i
							className={`icon-chevron-${expandedMobileExtra === "quizzes" ? "up" : "down"} icon-sm extra-chevron ${expandedMobileExtra === "quizzes" ? "expanded" : ""}`}
						/>
					)}
				</div>
				{isMobile && expandedMobileExtra === "quizzes" && (
					<div className="sidebar-extra-accordion-body">{renderQuizzes()}</div>
				)}
				<div className={`sidebar-extra-item ${showCertificate ? "active" : ""}`} onClick={onToggleCertificate}>
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
					<div className="sidebar-extra-accordion-body">{renderCertificate()}</div>
				)}
			</div>

			{/* Restart Request Button */}
			{isAtendente && (
				<div className="sidebar-extra-item">
					<div className={`sidebar-extra-btn ${restartRequested ? "requested" : ""}`} onClick={onRequestRestart}>
						<i className="icon-refresh icon-sm" />
						<span>{restartRequested ? "Solicitação Enviada" : "Solicitar Reiniciar"}</span>
						{restartRequested && <span className="sidebar-extra-check">⏳</span>}
					</div>
				</div>
			)}
		</div>
	);
}
