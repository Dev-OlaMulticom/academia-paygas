import { quizPassText } from "@shared/quiz";
import type { RefObject } from "react";
import { pluralize } from "../../lib/utils";
import { PDFViewer } from "../PDFViewer";
import { useToast } from "../Toast";
import { VideoPlayer } from "../VideoPlayer";

export function LessonContent({
	current,
	currentLesson,
	lessonsCount,
	videoRef,
	expandedLicao,
	onExpandLicao,
	onVideoEnd,
	onCurrentTimeChange,
	canOpenCurrentQuiz,
	onConcluir,
	onAvancar,
	onShowQuiz,
	onPrevLesson,
	onFinish,
	isLastLesson,
	allCompleted,
}: {
	current: any;
	currentLesson: number;
	lessonsCount: number;
	videoRef: RefObject<{ seekTo: (s: number) => void } | null>;
	expandedLicao: string | null;
	onExpandLicao: (id: string | null) => void;
	onVideoEnd: () => void;
	onCurrentTimeChange: (time: number) => void;
	canOpenCurrentQuiz: boolean;
	onConcluir: () => void;
	onAvancar: () => void;
	onShowQuiz: () => void;
	onPrevLesson: () => void;
	onFinish: () => void;
	isLastLesson: boolean;
	allCompleted: boolean;
}) {
	const { toast } = useToast();
	return (
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
							if (current.videoFim && time >= current.videoFim) onVideoEnd();
						}}
						onCurrentTimeChange={onCurrentTimeChange}
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
					{current?.tipo === "VIDEO" && current?.ancoragemPoints && (current.ancoragemPoints as any[]).length > 0 && (
						<span className="lesson-tag">
							{(current.ancoragemPoints as any[]).length}{" "}
							{(current.ancoragemPoints as any[]).length === 1 ? "ponto de ancoragem" : "pontos de ancoragem"}
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
										licao.tipo === "VIDEO" ? "icon-play" : licao.tipo === "PDF" ? "icon-file-text" : "icon-file";
									const licaoTipoLabel = licao.tipo === "VIDEO" ? "Video" : licao.tipo === "PDF" ? "PDF" : "Texto";
									return (
										<div key={licao.id} className="lesson-cons-item">
											<div
												onClick={() => onExpandLicao(isLicaoExpanded ? null : licao.id)}
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
												<i className={`icon-chevron-${isLicaoExpanded ? "up" : "down"} icon-sm lesson-cons-chevron`} />
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
				{current?.quiz && canOpenCurrentQuiz && (
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
							canOpenCurrentQuiz ? (
								<>
									<button className="btn-primary lesson-action-btn" onClick={onConcluir}>
										Iniciar Quiz <i className="icon-chevron-right icon-sm" />
									</button>
									{!current?.obrigatorio && currentLesson < lessonsCount - 1 && (
										<button className="btn-secondary lesson-action-btn" onClick={onAvancar}>
											Pular <i className="icon-chevron-right icon-sm" />
										</button>
									)}
								</>
							) : (
								<button
									className="btn-primary lesson-action-btn locked-msg-btn"
									onClick={() =>
										toast("Nao e possivel avancar para a proxima aula sem antes resolver o quiz anterior.", "info")
									}
								>
									<i className="icon-lock icon-sm" /> Complete os quizzes anteriores primeiro
								</button>
							)
						) : (
							<button className="btn-primary lesson-action-btn" onClick={onConcluir}>
								Proximo <i className="icon-chevron-right icon-sm" />
							</button>
						)
					) : (
						<>
							{current?.quiz && (
								<button className="btn-secondary lesson-action-btn" onClick={onShowQuiz}>
									📝 Quiz <i className="icon-chevron-right icon-sm" />
								</button>
							)}
							{currentLesson < lessonsCount - 1 && (
								<button className="btn-primary lesson-action-btn" onClick={onAvancar}>
									<span>Proxima Aula</span>
									<i className="icon-chevron-right icon-sm" />
								</button>
							)}
							{isLastLesson && allCompleted && (
								<button className="btn-primary lesson-action-btn lesson-action-btn-green" onClick={onFinish}>
									<i className="icon-check-circle icon-sm" /> Finalizar Curso
								</button>
							)}
						</>
					)}
					{currentLesson > 0 && (
						<button className="btn-secondary lesson-anterior-btn" onClick={onPrevLesson}>
							<i className="icon-arrow-left icon-sm" /> Anterior
						</button>
					)}
				</div>
			</div>
		</>
	);
}
