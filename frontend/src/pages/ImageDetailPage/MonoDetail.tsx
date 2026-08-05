import { SegmentPlayer } from "../../components/SegmentPlayer/SegmentPlayer"
import type { ImageEntry } from "../../types/manifest"

export function MonoDetail({ entry }: { entry: ImageEntry }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-mono text-lg text-gold-300">
          Mono #{String(entry.global_index).padStart(3, "0")}
        </h1>
        <a
          href={entry.url}
          download
          className="rounded border border-space-600 px-2.5 py-1 font-mono text-[11px] text-gold-300 hover:border-gold-500/60"
        >
          download
        </a>
      </div>

      <SegmentPlayer entry={entry} />

      <p className="mt-4 font-mono text-[11px] text-gold-300/40">
        {entry.width}×{entry.height} · channel {entry.channel} · click the waveform to scrub
      </p>
    </div>
  )
}
