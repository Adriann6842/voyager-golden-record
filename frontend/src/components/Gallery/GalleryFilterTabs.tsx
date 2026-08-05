export type GalleryFilter = "all" | "mono" | "color"

const OPTIONS: { value: GalleryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "mono", label: "Mono" },
  { value: "color", label: "Color" },
]

export function GalleryFilterTabs({
  value,
  onChange,
  counts,
}: {
  value: GalleryFilter
  onChange: (value: GalleryFilter) => void
  counts: Record<GalleryFilter, number>
}) {
  return (
    <div className="inline-flex rounded-full border border-space-600 bg-space-900/60 p-1 font-mono text-xs">
      {OPTIONS.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3.5 py-1.5 transition-colors ${
              active
                ? "bg-gold-500 text-space-950"
                : "text-gold-300/70 hover:text-gold-300"
            }`}
          >
            {opt.label}
            <span className={active ? "text-space-950/60" : "text-gold-300/40"}>
              {" "}
              {counts[opt.value]}
            </span>
          </button>
        )
      })}
    </div>
  )
}
