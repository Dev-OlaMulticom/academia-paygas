import { useRef } from 'react'

interface VideoPlayerProps {
  url: string
  startAt?: number
  endAt?: number
  onReady?: () => void
  onTimeUpdate?: (time: number) => void
  microLessons?: Array<{ hours: number; minutes: number; seconds: number; titulo: string }>
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

export function VideoPlayer({ url, startAt = 0, endAt, onReady, microLessons }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const videoId = extractYouTubeId(url)
  if (!videoId) {
    return (
      <div className="lesson-video-placeholder">
        <p>URL de vídeo inválida</p>
      </div>
    )
  }

  let src = `https://www.youtube.com/embed/${videoId}?iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1&autoplay=1&mute=1`
  if (startAt !== undefined && startAt > 0) src += `&start=${startAt}`
  if (endAt && endAt > startAt) src += `&end=${endAt}`
  src += '&origin=' + window.location.origin

  return (
    <div className="video-player-wrapper">
      {microLessons && microLessons.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {microLessons.map((ml, i) => {
            const totalSeconds = ml.hours * 3600 + ml.minutes * 60 + ml.seconds
            const startUrl = `${src}&start=${totalSeconds}`
            return (
              <a
                key={i}
                href={startUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px', textDecoration: 'none' }}
              >
                {ml.hours > 0 ? `${ml.hours}h ` : ''}{ml.minutes}m {ml.seconds}s - {ml.titulo}
              </a>
            )
          })}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          paddingBottom: '56.25%',
          height: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius)',
          background: '#000',
        }}
      >
        <iframe
          src={src}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          onLoad={() => onReady?.()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            border: 0,
          }}
        />
      </div>
    </div>
  )
}
