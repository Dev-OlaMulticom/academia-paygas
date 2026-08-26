/**
 * Prefetch en idle de las librerías pesadas de PDF (jspdf + html2canvas).
 *
 * Estos chunks NO forman parte del bundle inicial: solo se descargan cuando el
 * usuario genera un certificado/PDF. Este prefetch los trae en segundo plano
 * cuando el navegador está ocioso, para que el primer PDF salga instantáneo.
 *
 * Se omite si el usuario tiene Save-Data activado o una conexión 2g.
 */
export function prefetchPdfLibs(): void {
	if (typeof window === "undefined") return;

	const conn = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
	if (conn?.saveData) return;
	if (conn?.effectiveType && /(^|-)2g$/.test(conn.effectiveType)) return;

	const warm = () => {
		void import("jspdf");
		void import("html2canvas");
	};

	if ("requestIdleCallback" in window) {
		window.requestIdleCallback(warm, { timeout: 10_000 });
	} else {
		setTimeout(warm, 3_000);
	}
}
