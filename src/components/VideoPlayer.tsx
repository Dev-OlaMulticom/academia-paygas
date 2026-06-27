import { useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import YouTube, { YouTubeEvent, YouTubePlayer } from 'react-youtube'

interface VideoPlayerProps {
  url: string
  startAt?: number
  endAt?: number
  onReady?: () => void
  onTimeUpdate?: (time: number) => void
  onCurrentTimeChange?: (time: number) => void
  licoesAncoragem?: Array<{ hours: number; minutes: number; seconds: number; titulo: string }>
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

function fmt(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = Math.floor(totalSeconds % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const VideoPlayer = forwardRef<{ seekTo: (s: number) => void }, VideoPlayerProps>(function VideoPlayer(
  { url, startAt = 0, endAt, onReady, onTimeUpdate, onCurrentTimeChange, licoesAncoragem },
  ref
) {
  const playerRef = useRef<YouTubePlayer | null>(null)
  const endAtRef = useRef(endAt)
  endAtRef.current = endAt
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [hoveredMarker, setHoveredMarker] = useState<number | null>(null)
  const progressBarRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    seekTo(seconds: number) {
      const player = playerRef.current
      if (!player) return
      player.seekTo(seconds, true)
      player.playVideo()
    },
  }))

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
    const dur = event.target.getDuration()
    setDuration(dur)
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
          const ct = player.getCurrentTime()
          const dur = player.getDuration()
          setCurrentTime(ct)
          if (dur > 0) setDuration(dur)
          onTimeUpdate?.(ct)
          onCurrentTimeChange?.(ct)
          const limit = endAtRef.current
          if (limit && limit > 0 && ct >= limit) {
            player.pauseVideo()
            clearInterval(pollInterval)
          }
        } catch {
          clearInterval(pollInterval)
        }
      }, 250)
    }
  }, [onTimeUpdate, onCurrentTimeChange])

  const handleSeek = useCallback((totalSeconds: number) => {
    const player = playerRef.current
    if (!player) return
    player.seekTo(totalSeconds, true)
    player.playVideo()
  }, [])

  const handleBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !playerRef.current || duration <= 0) return
    const rect = progressBarRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    handleSeek(ratio * duration)
  }, [duration, handleSeek])

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

  const hasMarkers = licoesAncoragem && licoesAncoragem.length > 0 && duration > 0
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="vp-root">
      <div className="vp-video-container">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={handleReady}
          onStateChange={handleStateChange}
          style={{ width: '100%', height: '100%' }}
          iframeClassName="vp-yt-iframe"
        />
      </div>

      {duration > 0 && (
        <div className="vp-controls">
          <div
            ref={progressBarRef}
            className="vp-track"
            onClick={handleBarClick}
          >
            <div className="vp-played" style={{ width: `${progress}%` }} />
            <div className="vp-head" style={{ left: `${progress}%` }} />
            {hasMarkers && licoesAncoragem!.map((ml, i) => {
              const totalSeconds = ml.hours * 3600 + ml.minutes * 60 + ml.seconds
              const pct = Math.min(100, Math.max(0, (totalSeconds / duration) * 100))
              return (
                <div
                  key={i}
                  className="vp-marker"
                  style={{ left: `${pct}%` }}
                  onClick={(e) => { e.stopPropagation(); handleSeek(totalSeconds) }}
                  onMouseEnter={() => setHoveredMarker(i)}
                  onMouseLeave={() => setHoveredMarker(null)}
                >
                  <div className="vp-marker-dot" />
                  {hoveredMarker === i && (
                    <div className="vp-tooltip">
                      <span className="vp-tooltip-time">{fmt(totalSeconds)}</span>
                      <span className="vp-tooltip-title">{ml.titulo}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="vp-time">
            <span>{fmt(currentTime)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      )}
    </div>
  )
})
