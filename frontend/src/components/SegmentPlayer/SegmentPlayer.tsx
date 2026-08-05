import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import type { ImageEntry } from "../../types/manifest"
import { Waveform } from "../Waveform/Waveform"
import { ImageReveal } from "./ImageReveal"

export function SegmentPlayer({
  entry,
  onEnded,
  variant = "stacked",
  sidebarExtra,
}: {
  entry: ImageEntry
  /** Called when this segment's clip finishes playing on its own — the
   * caller decides whether that means "advance to the next one". */
  onEnded?: () => void
  /** "split" puts the image on the left and waveform/controls on the right. */
  variant?: "stacked" | "split"
  /** Extra content rendered below the waveform/controls (e.g. a data readout);
   * receives this player's own audio ref so it can follow real playback. */
  sidebarExtra?: (audioRef: RefObject<HTMLAudioElement | null>) => ReactNode
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  // Switching to a segment (via prev/next/jump/navigation) always starts it
  // playing immediately — no separate "press play" step. Whether playback
  // then *continues on to the next segment* once this one ends is a
  // different decision, made by the caller via `onEnded`.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !entry.audio_url) return
    audio.currentTime = 0
    setIsPlaying(false)
    audio.play().catch(() => {
      // autoplay can be blocked before the first user gesture; ignore
    })
  }, [entry.global_index, entry.audio_url])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  const controls = entry.audio_url && (
    <>
      <Waveform audioUrl={entry.audio_url} audioRef={audioRef} />
      <div className="flex items-center gap-3 font-mono text-xs text-gold-300/60">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-space-600 text-gold-300 hover:border-gold-500/60"
        >
          {isPlaying ? "❚❚" : "▶"}
        </button>
        <span>
          image #{String(entry.global_index).padStart(3, "0")} ·{" "}
          {entry.audio_duration_sec?.toFixed(1)}s clip
        </span>
      </div>
      <audio
        ref={audioRef}
        src={entry.audio_url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          onEnded?.()
        }}
      />
    </>
  )

  const image = (
    <ImageReveal url={entry.url} width={entry.width} height={entry.height} audioRef={audioRef} />
  )

  if (variant === "split") {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
        <div>{image}</div>
        <div className="flex flex-col gap-3">
          {controls}
          {sidebarExtra?.(audioRef)}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {image}
      {controls}
      {sidebarExtra?.(audioRef)}
    </div>
  )
}
