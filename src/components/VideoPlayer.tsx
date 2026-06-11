import { useEffect, useRef } from 'react'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

interface VideoPlayerProps {
  url: string
  startAt?: number
  endAt?: number
  onReady?: () => void
  onTimeUpdate?: (time: number) => void
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

export function VideoPlayer({ url, startAt = 0, endAt, onReady, onTimeUpdate }: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<Plyr | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const videoId = extractYouTubeId(url)
    if (!videoId) return

    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.style.position = 'relative'
    wrapper.style.paddingBottom = '56.25%'
    wrapper.style.height = '0'
    wrapper.style.overflow = 'hidden'
    wrapper.style.borderRadius = 'var(--radius)'

    const iframe = document.createElement('iframe')
    const startTime = startAt || 0
    let src = `https://www.youtube.com/embed/${videoId}?iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1`
    if (startTime > 0) src += `&start=${startTime}`
    if (endAt && endAt > startTime) src += `&end=${endAt}`
    src += '&origin=' + window.location.origin

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

    // Initialize Plyr on the iframe (YouTube provider)
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
        onReady?.()
      })

      if (onTimeUpdate) {
        playerRef.current.on('timeupdate', () => {
          const currentTime = playerRef.current?.currentTime || 0
          onTimeUpdate(currentTime)

          if (endAt && currentTime >= endAt) {
            playerRef.current?.pause()
          }
        })
      }
    } catch (e) {
      console.warn('Plyr YouTube initialization note:', e)
    }

    return () => {
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [url, startAt, endAt])

  return (
    <div className="video-player-wrapper">
      <div ref={containerRef} className="plyr-container" />
    </div>
  )
}
