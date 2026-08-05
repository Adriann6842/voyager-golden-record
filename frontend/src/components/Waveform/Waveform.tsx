import { useEffect, useRef, type RefObject } from "react"
import { useAudioPeaks } from "../../hooks/useAudioPeaks"

export function Waveform({
  audioUrl,
  audioRef,
  className,
  height = 64,
}: {
  audioUrl: string | null
  audioRef: RefObject<HTMLAudioElement | null>
  className?: string
  height?: number
}) {
  const peaks = useAudioPeaks(audioUrl)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    let raf = 0

    function envelopePath(w: number, h: number) {
      const path = new Path2D()
      if (!peaks) return path
      const mid = h / 2
      const step = w / peaks.buckets
      path.moveTo(0, mid - peaks.peaks[1] * mid)
      for (let i = 0; i < peaks.buckets; i++) {
        const max = peaks.peaks[i * 2 + 1]
        path.lineTo(i * step, mid - max * mid)
      }
      for (let i = peaks.buckets - 1; i >= 0; i--) {
        const min = peaks.peaks[i * 2]
        path.lineTo(i * step, mid - min * mid)
      }
      path.closePath()
      return path
    }

    function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const w = canvas.width
      const h = canvas.height
      ctx!.clearRect(0, 0, w, h)

      if (peaks) {
        const audio = audioRef.current
        const progress = audio && audio.duration ? audio.currentTime / audio.duration : 0
        const path = envelopePath(w, h)

        ctx!.fillStyle = "#3a4363"
        ctx!.fill(path)

        const playedX = progress * w
        if (playedX > 0) {
          ctx!.save()
          ctx!.beginPath()
          ctx!.rect(0, 0, playedX, h)
          ctx!.clip()
          ctx!.fillStyle = "#f3d98b"
          ctx!.fill(path)
          ctx!.restore()
        }

        ctx!.strokeStyle = "#e9c05f"
        ctx!.lineWidth = 1
        ctx!.beginPath()
        ctx!.moveTo(playedX, 0)
        ctx!.lineTo(playedX, h)
        ctx!.stroke()
      } else {
        ctx!.strokeStyle = "#181c2c"
        ctx!.lineWidth = 2
        ctx!.beginPath()
        ctx!.moveTo(0, h / 2)
        ctx!.lineTo(w, h / 2)
        ctx!.stroke()
      }

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [peaks, audioRef])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const audio = audioRef.current
    const canvas = canvasRef.current
    if (!audio || !canvas || !audio.duration) return
    const rect = canvas.getBoundingClientRect()
    const fraction = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    audio.currentTime = fraction * audio.duration
  }

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={height}
      onClick={handleClick}
      className={`w-full cursor-pointer rounded bg-space-950 ${className ?? ""}`}
    />
  )
}
