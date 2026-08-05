import { useEffect, useRef, useState } from "react"
import { Waveform } from "../../components/Waveform/Waveform"
import type { ColorImageEntry, ImageEntry } from "../../types/manifest"

const MAX_DISPLAY_DIM = 900
const CHANNEL_LABELS = ["R", "G", "B"] as const

interface Channels {
  r: Uint8ClampedArray
  g: Uint8ClampedArray
  b: Uint8ClampedArray
  w: number
  h: number
}

export function ColorDetail({
  entry,
  images,
}: {
  entry: ColorImageEntry
  images: ImageEntry[]
}) {
  const sources = entry.pair
    .map((idx) => images.find((i) => i.global_index === idx))
    .filter((i): i is ImageEntry => !!i)

  const [segmentIndex, setSegmentIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const channelsRef = useRef<Channels | null>(null)

  const scale = Math.min(1, MAX_DISPLAY_DIM / Math.max(entry.width, entry.height))
  const dispW = Math.max(1, Math.round(entry.width * scale))
  const dispH = Math.max(1, Math.round(entry.height * scale))

  // Load the final composite once and split it into R/G/B channel arrays.
  useEffect(() => {
    const img = new Image()
    img.src = entry.url
    img.onload = () => {
      const off = document.createElement("canvas")
      off.width = dispW
      off.height = dispH
      const ctx = off.getContext("2d")
      if (!ctx) return
      ctx.drawImage(img, 0, 0, dispW, dispH)
      const data = ctx.getImageData(0, 0, dispW, dispH).data
      const n = dispW * dispH
      const r = new Uint8ClampedArray(n)
      const g = new Uint8ClampedArray(n)
      const b = new Uint8ClampedArray(n)
      for (let i = 0; i < n; i++) {
        r[i] = data[i * 4]
        g[i] = data[i * 4 + 1]
        b[i] = data[i * 4 + 2]
      }
      channelsRef.current = { r, g, b, w: dispW, h: dispH }
    }
  }, [entry.url, dispW, dispH])

  // Advance to the next segment's clip whenever segmentIndex changes.
  useEffect(() => {
    const audio = audioRef.current
    const src = sources[segmentIndex]
    if (!audio || !src?.audio_url || !started) return
    audio.src = src.audio_url
    audio.currentTime = 0
    audio.play().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentIndex, started])

  function handleEnded() {
    if (segmentIndex < 2) setSegmentIndex((i) => i + 1)
  }

  function handleStart() {
    setStarted(true)
    setSegmentIndex(0)
  }

  // Progressive channel-by-channel reveal, redrawn every frame.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    let raf = 0

    function draw() {
      const channels = channelsRef.current
      if (!channels) {
        raf = requestAnimationFrame(draw)
        return
      }
      const { r, g, b, w, h } = channels
      const audio = audioRef.current
      const clipProgress =
        audio && audio.duration ? Math.min(1, audio.currentTime / audio.duration) : 0

      const fractionFor = (i: number) => {
        if (!started) return 0
        if (i < segmentIndex) return 1
        if (i > segmentIndex) return 0
        return clipProgress
      }
      const rRows = Math.round(h * fractionFor(0))
      const gRows = Math.round(h * fractionFor(1))
      const bRows = Math.round(h * fractionFor(2))

      const imageData = ctx!.createImageData(w, h)
      const out = imageData.data
      for (let y = 0; y < h; y++) {
        const rOn = y < rRows
        const gOn = y < gRows
        const bOn = y < bRows
        const rowStart = y * w
        for (let x = 0; x < w; x++) {
          const i = rowStart + x
          const o = i * 4
          out[o] = rOn ? r[i] : 0
          out[o + 1] = gOn ? g[i] : 0
          out[o + 2] = bOn ? b[i] : 0
          out[o + 3] = 255
        }
      }
      ctx!.putImageData(imageData, 0, 0)
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [started, segmentIndex])

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-mono text-lg text-gold-300">
          Color #{String(entry.pair[0]).padStart(3, "0")}–{String(entry.pair[2]).padStart(3, "0")}
        </h1>
        <a
          href={entry.url}
          download
          className="rounded border border-space-600 px-2.5 py-1 font-mono text-[11px] text-gold-300 hover:border-gold-500/60"
        >
          download
        </a>
      </div>

      <canvas
        ref={canvasRef}
        width={dispW}
        height={dispH}
        className="w-full rounded border border-space-700 bg-space-950"
        style={{ aspectRatio: `${dispW} / ${dispH}` }}
      />

      {!started ? (
        <button
          type="button"
          onClick={handleStart}
          disabled={sources.length < 3}
          className="mt-4 rounded-full bg-gold-500 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-space-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          ▶ play R · G · B scans
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2 font-mono text-[11px]">
            {CHANNEL_LABELS.map((label, i) => (
              <span
                key={label}
                className={`rounded px-2 py-1 ${
                  i === segmentIndex
                    ? "bg-gold-500 text-space-950"
                    : i < segmentIndex
                      ? "bg-signal-500/20 text-signal-400"
                      : "bg-space-700 text-gold-300/40"
                }`}
              >
                {label} — #{String(entry.pair[i]).padStart(3, "0")}
              </span>
            ))}
          </div>
          <Waveform audioUrl={sources[segmentIndex]?.audio_url ?? null} audioRef={audioRef} />
        </div>
      )}

      <audio ref={audioRef} onEnded={handleEnded} />

      <p className="mt-4 font-mono text-[11px] text-gold-300/40">
        {entry.width}×{entry.height} · composited from 3 separate audio scans (red, then green,
        then blue)
      </p>
    </div>
  )
}
