import { pluralize } from "../../lib/utils";

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

export function CertificatePanel({
	certificate,
	curso,
	userName,
	lessons,
	allQuizResults,
	areAllQuizzesPassed,
	isLessonCompleted,
	onRequestCertificate,
}: {
	certificate: any;
	curso: any;
	userName?: string;
	lessons: any[];
	allQuizResults: Record<string, any>;
	areAllQuizzesPassed: () => boolean;
	isLessonCompleted: (lesson: any) => boolean;
	onRequestCertificate: () => void;
}) {
	const hasCertificate = !!certificate;
	const quizzesPassed = areAllQuizzesPassed();
	const allLessonsCompleted = lessons.length > 0 && lessons.every((l: any) => isLessonCompleted(l));
	const canRequestCert = allLessonsCompleted && quizzesPassed;

	if (!hasCertificate && canRequestCert) {
		return (
			<div className="empty-state section-padding">
				<div className="empty-icon">📜</div>
				<p className="empty-msg">Certificado disponivel!</p>
				<p className="empty-desc">Voce completou todas as aulas e quizzes. Solicite seu certificado.</p>
				<button className="btn-primary" style={{ marginTop: "12px" }} onClick={onRequestCertificate}>
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

	const template = certificate.cursoCertTemplate || certificate.curso?.certificadoTemplate || DEFAULT_TEMPLATE;
	const titulo = certificate.curso?.titulo || curso.titulo;
	const icone = certificate.curso?.icone || curso.icone || "📚";
	const nome = userName || "Usuario";
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
}
