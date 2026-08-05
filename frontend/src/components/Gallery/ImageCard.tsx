import { Link } from "react-router-dom"
import type { GalleryItem } from "../../types/manifest"

export function ImageCard({ item }: { item: GalleryItem }) {
  const label =
    item.kind === "mono"
      ? `#${String(item.entry.global_index).padStart(3, "0")}`
      : `#${String(item.entry.pair[0]).padStart(3, "0")}–${String(
          item.entry.pair[2],
        ).padStart(3, "0")}`

  return (
    <Link
      to={`/image/${item.key}`}
      className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-space-600 bg-space-900 text-left transition-all hover:border-gold-500/60 hover:shadow-[0_0_0_1px_rgba(212,165,55,0.3)]"
    >
      <img
        src={item.url}
        alt={`Decoded image ${label}`}
        loading="lazy"
        className="h-full w-full object-cover opacity-90 transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-space-950/90 to-transparent px-2.5 py-2">
        <span className="font-mono text-[11px] tracking-wide text-gold-300">
          {label}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${
            item.kind === "color"
              ? "bg-signal-500/20 text-signal-400"
              : "bg-space-700 text-gold-300/60"
          }`}
        >
          {item.kind}
        </span>
      </div>
    </Link>
  )
}
