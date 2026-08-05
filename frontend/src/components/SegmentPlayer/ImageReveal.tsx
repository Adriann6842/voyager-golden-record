import { useEffect, useRef, type RefObject } from "react"

const MAX_DISPLAY_DIM = 1200

export function ImageReveal({
  url,
  width,
  height,
  audioRef,
}: {
  url: string
  width: number
  height: number
  audioRef: RefObject<HTMLAudioElement | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const scale = Math.min(1, MAX_DISPLAY_DIM / Math.max(width, height))
  const dispW = Math.max(1, Math.round(width * scale))
  const dispH = Math.max(1, Math.round(height * scale))

  useEffect(() => {
    const img = new Image()
    img.src = url
    img.onload = () => {
      imgRef.current = img
    }
    return () => {
      imgRef.current = null
    }
  }, [url])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function drawAt(progress: number) {
      const canvas = canvasRef.current
      const img = imgRef.current
      if (!canvas) return
      ctx!.fillStyle = "#05060a"
      ctx!.fillRect(0, 0, dispW, dispH)
      if (img) {
        const revealH = Math.max(1, Math.round(dispH * progress))
        const sourceH = Math.max(1, Math.round(height * progress))
        ctx!.drawImage(img, 0, 0, width, sourceH, 0, 0, dispW, revealH)
      }
    }

    function currentProgress(): number {
      const audio = audioRef.current
      return audio && audio.duration ? Math.min(1, audio.currentTime / audio.duration) : 0
    }

    let raf = 0
    function loop() {
      drawAt(currentProgress())
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    // requestAnimationFrame can be throttled when the tab isn't focused/
    // visible, but audio keeps playing regardless — these listeners make
    // sure the reveal still lands on the correct frame (in particular,
    // fully revealed) even if the rAF loop fell behind.
    const audio = audioRef.current
    const onTimeUpdate = () => drawAt(currentProgress())
    const onEnded = () => drawAt(1)
    audio?.addEventListener("timeupdate", onTimeUpdate)
    audio?.addEventListener("ended", onEnded)
    audio?.addEventListener("seeked", onTimeUpdate)

    return () => {
      cancelAnimationFrame(raf)
      audio?.removeEventListener("timeupdate", onTimeUpdate)
      audio?.removeEventListener("ended", onEnded)
      audio?.removeEventListener("seeked", onTimeUpdate)
    }
  }, [dispW, dispH, width, height, audioRef])

  return (
    <canvas
      ref={canvasRef}
      width={dispW}
      height={dispH}
      className="w-full rounded border border-space-700 bg-space-950"
      style={{ aspectRatio: `${dispW} / ${dispH}` }}
    />
  )
}
