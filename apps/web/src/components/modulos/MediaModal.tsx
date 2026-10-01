import { PDFViewer } from "../PDFViewer";

export interface MediaModalState {
	url: string;
	type: "pdf" | "video";
	title: string;
	startTime?: number;
	lessonIndex?: number;
}

export function MediaModal({
	modal,
	lessons,
	onClose,
	onOpenQuiz,
	onNextLesson,
}: {
	modal: MediaModalState;
	lessons: any[];
	onClose: () => void;
	onOpenQuiz: (lessonIndex: number) => void;
	onNextLesson: (lessonIndex: number) => void;
}) {
	return (
		<div className="media-modal-overlay" onClick={onClose}>
			<div className="media-modal" onClick={(e) => e.stopPropagation()}>
				<div className="media-modal-header">
					<span className="media-modal-title">{modal.title}</span>
					<button className="media-modal-close" onClick={onClose}>
						<i className="icon-x" />
					</button>
				</div>
				<div className="media-modal-body">
					{modal.type === "pdf" ? (
						<PDFViewer url={modal.url} />
					) : (
						(() => {
							// Extract video ID from any YouTube URL format
							const ytMatch = modal.url.match(
								/(?:youtube\.com\/(?:watch\?.*?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
							);
							const videoId = ytMatch?.[1];
							if (!videoId) {
								return <div style={{ color: "#fff", padding: 24 }}>URL de video invalida</div>;
							}
							const params = new URLSearchParams();
							if (modal.startTime && modal.startTime > 0) {
								params.set("start", String(modal.startTime));
							}
							params.set("playsinline", "1");
							params.set("rel", "0");
							params.set("modestbranding", "1");
							params.set("iv_load_policy", "3");
							const qs = params.toString();
							const finalUrl = `https://www.youtube.com/embed/${videoId}?${qs}`;
							return (
								<iframe
									src={finalUrl}
									title={modal.title}
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowFullScreen
								/>
							);
						})()
					)}
				</div>
				{modal.lessonIndex != null &&
					(() => {
						const modalLesson = lessons[modal.lessonIndex];
						const hasQuiz = !!modalLesson?.quiz;
						const nextExists = modal.lessonIndex < lessons.length - 1;
						if (!hasQuiz && !nextExists) return null;
						return (
							<div className="media-modal-actions">
								{hasQuiz && (
									<button className="btn-secondary" onClick={() => onOpenQuiz(modal.lessonIndex!)}>
										📝 Quiz
									</button>
								)}
								{nextExists && (
									<button className="btn-primary" onClick={() => onNextLesson(modal.lessonIndex!)}>
										Proxima Aula <i className="icon-chevron-right icon-sm" />
									</button>
								)}
							</div>
						);
					})()}
			</div>
		</div>
	);
}
