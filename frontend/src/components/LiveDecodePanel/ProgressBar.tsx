// This specific recording (voyager_images_384khz.wav) always decodes to
// exactly 156 mono images + 20 color composites — verified against the
// ported pipeline's own output, not a rough guess.
const TOTAL_GALLERY_ITEMS = 176

export function ProgressBar({ done, active }: { done: number; active: boolean }) {
  const pct = Math.min(100, Math.round((done / TOTAL_GALLERY_ITEMS) * 100))

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between font-mono text-[11px] text-gold-300/50">
        <span>
          {done} / {TOTAL_GALLERY_ITEMS} images
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-space-700">
        <div
          className={`h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300 transition-[width] duration-500 ${
            active ? "animate-pulse" : ""
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
