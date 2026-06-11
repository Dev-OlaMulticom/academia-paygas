import { useEffect, useRef, useState } from 'react'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

interface VideoPreviewProps {
  url: string
  onDurationChange?: (duration: number) => void
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

export function VideoPreview({ url, onDurationChange }: VideoPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Plyr | null>(null)
  const [thumbnail, setThumbnail] = useState<string>('')
  const [duration, setDuration] = useState<number>(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!url) {
      setThumbnail('')
      setDuration(0)
      setLoaded(false)
      return
    }

    const videoId = extractYouTubeId(url)
    if (!videoId) {
      setThumbnail('')
      setDuration(0)
      setLoaded(false)
      return
    }

    // Set thumbnail
    setThumbnail(`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`)

    // Initialize Plyr to get duration
    if (containerRef.current) {
      containerRef.current.innerHTML = ''

      const wrapper = document.createElement('div')
      wrapper.style.position = 'relative'
      wrapper.style.paddingBottom = '56.25%'
      wrapper.style.height = '0'
      wrapper.style.overflow = 'hidden'
      wrapper.style.borderRadius = 'var(--radius)'

      const iframe = document.createElement('iframe')
      const src = `https://www.youtube.com/embed/${videoId}?iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1&origin=${window.location.origin}`
      iframe.src = src
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
      iframe.allowFullscreen = true
      iframe.style.position = 'absolute'
      iframe.style.top = '0'
      iframe.style.left = '0'
      iframe.style.width = '100%'
      iframe.style.height = '100%'

      wrapper.appendChild(iframe)
      containerRef.current.appendChild(wrapper)

      try {
        playerRef.current = new Plyr(iframe, {
          controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
          settings: ['speed'],
          speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
          tooltips: { controls: true, seek: true },
          keyboard: { focused: true, global: true },
          invertTime: false,
          displayDuration: true,
        })

        playerRef.current.on('ready', () => {
          setLoaded(true)
          // Try to get duration after ready
          setTimeout(() => {
            const videoDuration = playerRef.current?.duration || 0
            if (videoDuration > 0) {
              setDuration(videoDuration)
              onDurationChange?.(videoDuration)
            }
          }, 1000)
        })
      } catch (e) {
        console.warn('Plyr initialization note:', e)
      }

      return () => {
        playerRef.current?.destroy()
        playerRef.current = null
      }
    }
  }, [url, onDurationChange])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return { hours, minutes, seconds: secs }
  }

  const { hours, minutes, seconds } = formatDuration(duration)

  if (!url) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px', border: '2px dashed var(--gray-200)', borderRadius: 'var(--radius)' }}>
        Cole uma URL do YouTube para ver a prévia
      </div>
    )
  }

  if (!extractYouTubeId(url)) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--pg-red)', padding: '40px', border: '2px dashed var(--pg-red)', borderRadius: 'var(--radius)' }}>
        URL inválida do YouTube
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <div ref={containerRef} className="plyr-container" style={{ maxWidth: '100%' }} />
      </div>
      {loaded && duration > 0 && (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
          <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--gray-600)' }}>Duração:</span>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Horas</label>
              <input
                type="number"
                className="form-input"
                style={{ width: '60px', padding: '6px', fontSize: '13px' }}
                value={hours}
                readOnly
              />
            </div>
            <span style={{ fontSize: '18px', color: 'var(--gray-400)' }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Minutos</label>
              <input
                type="number"
                className="form-input"
                style={{ width: '60px', padding: '6px', fontSize: '13px' }}
                value={minutes}
                readOnly
              />
            </div>
            <span style={{ fontSize: '18px', color: 'var(--gray-400)' }}>:</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '11px', color: 'var(--gray-500)' }}>Segundos</label>
              <input
                type="number"
                className="form-input"
                style={{ width: '60px', padding: '6px', fontSize: '13px' }}
                value={seconds}
                readOnly
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
