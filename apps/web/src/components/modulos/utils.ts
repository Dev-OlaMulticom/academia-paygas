export function lessonTipoLabel(lesson: any): string {
	return lesson.tipo === "PDF" ? "PDF" : lesson.tipo === "TEXTO" ? "Texto" : lesson.videoUrl ? "Video" : "Conteudo";
}

export function lessonTipoBadgeClass(lesson: any): string {
	return lesson.tipo === "PDF" ? "pdf" : lesson.tipo === "TEXTO" ? "texto" : lesson.videoUrl ? "video" : "default";
}

export function pointToSeconds(pt: any): number {
	return (pt.hours || 0) * 3600 + (pt.minutes || 0) * 60 + (pt.seconds || 0);
}

export function formatChapterTime(totalSec: number): string {
	const h = Math.floor(totalSec / 3600);
	const m = Math.floor((totalSec % 3600) / 60);
	const s = Math.floor(totalSec % 60);
	return h > 0
		? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
		: `${m}:${s.toString().padStart(2, "0")}`;
}
