import { useMemo, useRef } from "react";

interface PDFViewerProps {
	url: string;
}

function getEmbedUrl(url: string): string {
	// Google Drive: /file/d/FILE_ID/view -> /file/d/FILE_ID/preview
	const gdriveFileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)\/view/);
	if (gdriveFileMatch) {
		return `https://drive.google.com/file/d/${gdriveFileMatch[1]}/preview`;
	}

	// Google Drive: /open?id=FILE_ID -> /file/d/FILE_ID/preview
	const gdriveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
	if (gdriveOpenMatch) {
		return `https://drive.google.com/file/d/${gdriveOpenMatch[1]}/preview`;
	}

	// Google Drive: /uc?id=FILE_ID -> /file/d/FILE_ID/preview
	const gdriveUcMatch = url.match(/drive\.google\.com\/uc\?id=([^&]+)/);
	if (gdriveUcMatch) {
		return `https://drive.google.com/file/d/${gdriveUcMatch[1]}/preview`;
	}

	// Google Docs viewer (already works for PDFs)
	const docsViewerMatch = url.match(/docs\.google\.com\/.*\/d\/([^/]+)\//);
	if (docsViewerMatch) {
		return `https://drive.google.com/file/d/${docsViewerMatch[1]}/preview`;
	}

	// For direct PDF URLs or other services, use Google Docs viewer as fallback
	if (url.match(/\.(pdf)(\?|$)/i)) {
		return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
	}

	// Default: use as-is (works for direct PDF URLs, other embeddable services)
	return url;
}

export function PDFViewer({ url }: PDFViewerProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const embedUrl = useMemo(() => getEmbedUrl(url), [url]);

	return (
		<div
			className="pdf-viewer-wrapper"
			style={{
				position: "relative",
				paddingBottom: "141.4%",
				height: 0,
				overflow: "hidden",
				borderRadius: "var(--radius)",
			}}
		>
			<iframe
				ref={iframeRef}
				src={embedUrl}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					border: "none",
				}}
				title="PDF Viewer"
				allow="autoplay"
			/>
		</div>
	);
}
