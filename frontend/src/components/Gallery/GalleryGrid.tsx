import { useMemo, useState } from "react"
import type { GalleryItem } from "../../types/manifest"
import { GalleryFilterTabs, type GalleryFilter } from "./GalleryFilterTabs"
import { ImageCard } from "./ImageCard"

export function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<GalleryFilter>("all")

  const counts = useMemo(
    () => ({
      all: items.length,
      mono: items.filter((i) => i.kind === "mono").length,
      color: items.filter((i) => i.kind === "color").length,
    }),
    [items],
  )

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.kind === filter)),
    [items, filter],
  )

  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-mono text-sm uppercase tracking-widest text-gold-300/60">
          Decoded images
        </h2>
        <GalleryFilterTabs value={filter} onChange={setFilter} counts={counts} />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-space-600 py-16 text-center font-mono text-sm text-gold-300/40">
          Nothing decoded yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((item) => (
            <ImageCard key={item.key} item={item} />
          ))}
        </div>
      )}
    </section>
  )
}
