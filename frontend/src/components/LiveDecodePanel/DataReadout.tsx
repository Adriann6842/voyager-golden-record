import { useEffect, useRef, useState, type RefObject } from "react"
import { useDecodedAudio } from "../../hooks/useDecodedAudio"

const VALUES_PER_ROW = 8
const SAMPLE_STRIDE = 41 // spread samples out a bit rather than reading consecutive ones
const MAX_ROWS = 13
const UPDATE_INTERVAL_MS = 90

function toHex(sample: number): string {
  const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
  return `0x${(int16 & 0xffff).toString(16).toUpperCase().padStart(4, "0")}`
}

/** A live hex readout of actual PCM sample values from the audio clip, read
 * at the current playback position — real telemetry off the tape, not a
 * text log. Falls back to sweeping through the buffer on an internal clock
 * when there's no (or no playing) audio element to follow. */
export function DataReadout({
  audioUrl,
  audioRef,
}: {
  audioUrl: string | null
  audioRef?: RefObject<HTMLAudioElement | null>
}) {
  const decoded = useDecodedAudio(audioUrl)
  const [rows, setRows] = useState<string[]>([])
  const startRef = useRef(performance.now())

  useEffect(() => {
    setRows([])
    startRef.current = performance.now()
  }, [audioUrl])

  useEffect(() => {
    if (!decoded) return
    let raf = 0
    let lastUpdate = 0

    function tick(t: number) {
      if (t - lastUpdate >= UPDATE_INTERVAL_MS) {
        lastUpdate = t
        const audio = audioRef?.current
        const usingRealPlayhead = !!audio && audio.duration > 0
        const positionSec = usingRealPlayhead
          ? audio!.currentTime
          : ((t - startRef.current) / 1000) % decoded!.duration

        const centerSample = Math.floor(positionSec * decoded!.sampleRate)
        const values: string[] = []
        for (let i = 0; i < VALUES_PER_ROW; i++) {
          const idx = (centerSample + i * SAMPLE_STRIDE) % decoded!.channelData.length
          values.push(toHex(decoded!.channelData[idx] ?? 0))
        }
        setRows((prev) => [...prev.slice(-(MAX_ROWS - 1)), values.join("  ")])
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [decoded, audioRef])

  return (
    <div className="h-40 overflow-hidden rounded border border-space-700 bg-space-950/60 p-3 font-mono text-[11px] leading-relaxed text-signal-400/80">
      {rows.length === 0 ? (
        <p className="text-gold-300/30">$ awaiting signal…</p>
      ) : (
        rows.map((r, i) => (
          <p key={i} className="whitespace-pre">
            {r}
          </p>
        ))
      )}
    </div>
  )
}
