import { useRef, useCallback } from 'react'
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube'

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

export function VideoPlayer({ url, startAt = 0, endAt, onReady, onTimeUpdate, microLessons }: VideoPlayerProps) {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const endAtRef = useRef(endAt)
  endAtRef.current = endAt

  const videoId = extractYouTubeId(url)
  if (!videoId) {
    return (
      <div className="lesson-video-placeholder">
        <p>URL de vídeo inválida</p>
      </div>
    )
  }

  const handleReady = useCallback((event: YouTubeEvent) => {
    playerRef.current = event.target
    if (startAt > 0) {
      event.target.seekTo(startAt, true)
      event.target.playVideo()
    }
    onReady?.()
  }, [startAt, onReady])

  const handleStateChange = useCallback((event: YouTubeEvent) => {
    const YT = (window as any).YT
    if (!YT) return

    if (event.data === YT.PlayerState.PLAYING) {
      const player = event.target
      const pollInterval = setInterval(() => {
        try {
          const currentTime = player.getCurrentTime()
          onTimeUpdate?.(currentTime)
          const limit = endAtRef.current
          if (limit && limit > 0 && currentTime >= limit) {
            player.pauseVideo()
            clearInterval(pollInterval)
          }
        } catch {
          clearInterval(pollInterval)
        }
      }, 500)
    }
  }, [onTimeUpdate])

  const handleMicroLessonClick = useCallback((totalSeconds: number) => {
    const player = playerRef.current
    if (!player) return
    player.seekTo(totalSeconds, true)
    player.playVideo()
  }, [])

  const opts = {
    playerVars: {
      autoplay: 1,
      start: startAt || 0,
      end: endAt && endAt > 0 ? endAt : undefined,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
      showinfo: 0,
      fs: 1,
      cc_load_policy: 0,
    },
  }

  return (
    <div className="video-player-wrapper">
      {microLessons && microLessons.length > 0 && (
        <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {microLessons.map((ml, i) => {
            const totalSeconds = ml.hours * 3600 + ml.minutes * 60 + ml.seconds
            return (
              <button
                key={i}
                className="btn-secondary"
                style={{ padding: '4px 8px', fontSize: '11px' }}
                onClick={() => handleMicroLessonClick(totalSeconds)}
              >
                {ml.hours > 0 ? `${ml.hours}h ` : ''}{ml.minutes}m {ml.seconds}s - {ml.titulo}
              </button>
            )
          })}
        </div>
      )}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        borderRadius: 'var(--radius)',
        background: '#000',
      }}>
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          style={{ width: '100%', height: '100%' }}
          iframeClassName="lesson-yt-iframe"
        />
      </div>
    </div>
  )
}
