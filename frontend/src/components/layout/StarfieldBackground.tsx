import { useEffect, useRef } from "react"

interface Star {
  x: number
  y: number
  r: number
  twinkleSpeed: number
  phase: number
}

/** Cheap canvas starfield — no WebGL, just a few hundred slow-twinkling dots. */
export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let stars: Star[] = []
    let raf = 0
    let width = 0
    let height = 0

    function resize() {
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = width
      canvas!.height = height
      const count = Math.floor((width * height) / 9000)
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.2,
        twinkleSpeed: Math.random() * 0.015 + 0.003,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    function draw(t: number) {
      ctx!.clearRect(0, 0, width, height)
      for (const s of stars) {
        const alpha = 0.35 + 0.5 * Math.abs(Math.sin(s.phase + t * s.twinkleSpeed))
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(243, 217, 139, ${alpha.toFixed(3)})`
        ctx!.fill()
      }
      raf = requestAnimationFrame(draw)
    }

    resize()
    window.addEventListener("resize", resize)
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10 opacity-70"
      aria-hidden="true"
    />
  )
}
