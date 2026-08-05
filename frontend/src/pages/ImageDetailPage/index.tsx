import { useEffect, useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { fetchGallery } from "../../api/client"
import { useDecodeStore } from "../../state/decodeStore"
import { toGalleryItems, type Manifest } from "../../types/manifest"
import { ColorDetail } from "./ColorDetail"
import { MonoDetail } from "./MonoDetail"

export function ImageDetailPage() {
  const { key } = useParams()
  const navigate = useNavigate()
  const images = useDecodeStore((s) => s.images)
  const colorImages = useDecodeStore((s) => s.colorImages)
  const state = useDecodeStore((s) => s.state)
  const hydrate = useDecodeStore((s) => s.hydrate)

  useEffect(() => {
    fetchGallery()
      .then((manifest: Manifest) => hydrate(manifest.images, manifest.color_images, manifest.state))
      .catch(() => {})
  }, [hydrate])

  const items = useMemo(
    () =>
      toGalleryItems({
        version: 1,
        generated_at: "",
        source_wav: "",
        sample_rate: null,
        scanwidth: 3300,
        thickness: 15,
        state,
        error_message: null,
        images,
        color_images: colorImages,
      }),
    [images, colorImages, state],
  )

  const index = items.findIndex((i) => i.key === key)
  const item = index >= 0 ? items[index] : null
  const prev = index > 0 ? items[index - 1] : null
  const next = index >= 0 && index < items.length - 1 ? items[index + 1] : null

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 pt-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="font-mono text-xs text-gold-300/60 hover:text-gold-300">
          ← back to gallery
        </Link>
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            type="button"
            disabled={!prev}
            onClick={() => prev && navigate(`/image/${prev.key}`)}
            className="rounded-full border border-space-600 px-3 py-1.5 text-gold-300 hover:border-gold-500/60 disabled:cursor-not-allowed disabled:opacity-30"
          >
            ‹ prev
          </button>
          <button
            type="button"
            disabled={!next}
            onClick={() => next && navigate(`/image/${next.key}`)}
            className="rounded-full border border-space-600 px-3 py-1.5 text-gold-300 hover:border-gold-500/60 disabled:cursor-not-allowed disabled:opacity-30"
          >
            next ›
          </button>
        </div>
      </div>

      {!item ? (
        <p className="py-24 text-center font-mono text-sm text-gold-300/40">
          Image not found yet — it may still be decoding.
        </p>
      ) : item.kind === "mono" ? (
        <MonoDetail entry={item.entry} />
      ) : (
        <ColorDetail entry={item.entry} images={images} />
      )}
    </div>
  )
}
