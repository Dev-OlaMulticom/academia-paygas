import { useEffect, useRef } from 'react'

interface PDFViewerProps {
  url: string
}

export function PDFViewer({ url }: PDFViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  return (
    <div className="pdf-viewer-wrapper" style={{ position: 'relative', paddingBottom: '141.4%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius)' }}>
      <iframe
        ref={iframeRef}
        src={url}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="PDF Viewer"
      />
    </div>
  )
}
