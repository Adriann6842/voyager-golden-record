import { useEffect, useState } from "react"
import { useDecodeStore } from "../../state/decodeStore"
import { SegmentPlayer } from "../SegmentPlayer/SegmentPlayer"
import { DataReadout } from "./DataReadout"
import { InProgressCard } from "./InProgressCard"
import { ProgressBar } from "./ProgressBar"

export function LiveDecodePanel() {
  const state = useDecodeStore((s) => s.state)
  const stageText = useDecodeStore((s) => s.stageText)
  const images = useDecodeStore((s) => s.images)
  const colorImages = useDecodeStore((s) => s.colorImages)
  const liveImage = useDecodeStore((s) => s.liveImage)

  const [manualIndex, setManualIndex] = useState<number | null>(null)
  const [autoplay, setAutoplay] = useState(true)
  const [jumpInput, setJumpInput] = useState("")

  // A fresh decode/replay always starts by following the live edge.
  useEffect(() => {
    if (state === "decoding") setManualIndex(null)
  }, [state])

  const atLiveEdge = manualIndex === null
  // liveImage lingers until the *next* image starts — once its image_complete
  // has landed in `images`, prefer the real, correctly-oriented segment over
  // the stale in-progress card.
  const liveImageIsStale =
    !!liveImage && images.some((img) => img.global_index === liveImage.globalIndex)
  const showingLive = atLiveEdge && !!liveImage && !liveImageIsStale

  const currentIndex = atLiveEdge ? images.length - 1 : (manualIndex as number)
  const currentEntry =
    !showingLive && currentIndex >= 0 && currentIndex < images.length
      ? images[currentIndex]
      : null

  if (state === "idle") return null

  const canPrev = showingLive ? images.length > 0 : currentIndex > 0
  const canNext = !atLiveEdge && (currentIndex < images.length - 1 || !!liveImage)
  const maxGlobalIndex = images.length > 0 ? images[images.length - 1].global_index : 0

  function goPrev() {
    if (showingLive) {
      setManualIndex(images.length - 1)
    } else if (currentIndex > 0) {
      setManualIndex(currentIndex - 1)
    }
  }

  function goNext() {
    if (atLiveEdge) return
    if (currentIndex < images.length - 1) {
      setManualIndex(currentIndex + 1)
    } else {
      setManualIndex(null) // back to the live edge
    }
  }

  function handleSegmentEnded() {
    if (autoplay) goNext()
  }

  function toggleAutoplay(checked: boolean) {
    setAutoplay(checked)
    if (checked) setManualIndex(null)
  }

  function jumpToImage(n: number) {
    const idx = images.findIndex((img) => img.global_index === n)
    if (idx >= 0) setManualIndex(idx)
  }

  function handleJumpSubmit(e: React.FormEvent) {
    e.preventDefault()
    const n = Number.parseInt(jumpInput, 10)
    if (!Number.isNaN(n)) jumpToImage(n)
    setJumpInput("")
  }

  return (
    <section className="mx-auto mb-10 w-full max-w-5xl px-4 sm:px-6">
      <div className="rounded-xl border border-space-600 bg-space-900/50 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-sm uppercase tracking-widest text-gold-300/60">
            Live decode
          </h2>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <button
              type="button"
              onClick={goPrev}
              disabled={!canPrev}
              className="rounded-full border border-space-600 px-3 py-1 text-gold-300 hover:border-gold-500/60 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ‹ prev
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="rounded-full border border-space-600 px-3 py-1 text-gold-300 hover:border-gold-500/60 disabled:cursor-not-allowed disabled:opacity-30"
            >
              next ›
            </button>
            <form onSubmit={handleJumpSubmit} className="flex items-center gap-1">
              <span className="text-gold-300/40">#</span>
              <input
                type="number"
                min={0}
                max={maxGlobalIndex}
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                placeholder={String(currentEntry?.global_index ?? 0).padStart(3, "0")}
                className="w-14 rounded border border-space-600 bg-space-950 px-1.5 py-1 text-gold-300 outline-none focus:border-gold-500/60 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="submit"
                className="rounded-full border border-space-600 px-2.5 py-1 text-gold-300 hover:border-gold-500/60"
              >
                go
              </button>
            </form>
            <label className="ml-1 flex items-center gap-1.5 text-gold-300/60">
              <input
                type="checkbox"
                checked={autoplay}
                onChange={(e) => toggleAutoplay(e.target.checked)}
                className="accent-gold-500"
              />
              autoplay
            </label>
          </div>
        </div>

        {showingLive && liveImage ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr]">
            <InProgressCard liveImage={liveImage} stageText={stageText} />
            <DataReadout audioUrl={liveImage.audioUrl} />
          </div>
        ) : currentEntry ? (
          <SegmentPlayer
            key={currentEntry.global_index}
            entry={currentEntry}
            onEnded={handleSegmentEnded}
            variant="split"
            sidebarExtra={(audioRef) => (
              <DataReadout audioUrl={currentEntry.audio_url} audioRef={audioRef} />
            )}
          />
        ) : (
          <div className="flex h-full min-h-40 items-center justify-center font-mono text-xs text-gold-300/30">
            awaiting signal…
          </div>
        )}

        <div className="mt-4">
          <ProgressBar done={images.length + colorImages.length} active={state === "decoding"} />
        </div>
      </div>
    </section>
  )
}
