import type { LiveImageState } from "../../state/decodeStore"

export function InProgressCard({
  liveImage,
  stageText,
}: {
  liveImage: LiveImageState
  stageText: string
}) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-3 rounded border border-space-700 bg-space-950 p-6">
      <div className="relative h-12 w-12 shrink-0">
        <div className="absolute inset-0 animate-ping rounded-full bg-gold-500/20" />
        <div className="absolute inset-3 rounded-full border-2 border-gold-500/70" />
      </div>
      <div className="text-center">
        <p className="font-mono text-xs text-gold-300/70">
          decoding image #{String(liveImage.globalIndex).padStart(3, "0")} (channel{" "}
          {liveImage.channel})
        </p>
        <p className="mt-1 font-mono text-[11px] text-gold-300/30">{stageText}</p>
      </div>
    </div>
  )
}
