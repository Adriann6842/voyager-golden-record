import { useEffect } from "react"
import { fetchGallery } from "../api/client"
import { GalleryGrid } from "../components/Gallery/GalleryGrid"
import { LiveDecodePanel } from "../components/LiveDecodePanel/LiveDecodePanel"
import { Footer } from "../components/layout/Footer"
import { useDecodeStore } from "../state/decodeStore"
import { toGalleryItems, type Manifest } from "../types/manifest"

export function GalleryPage() {
  const state = useDecodeStore((s) => s.state)
  const images = useDecodeStore((s) => s.images)
  const colorImages = useDecodeStore((s) => s.colorImages)
  const hydrate = useDecodeStore((s) => s.hydrate)

  useEffect(() => {
    fetchGallery()
      .then((manifest: Manifest) => hydrate(manifest.images, manifest.color_images, manifest.state))
      .catch(() => {
        // WS hello message will hydrate once connected
      })
  }, [hydrate])

  const items = toGalleryItems({
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
  })

  return (
    <>
      <LiveDecodePanel />
      <GalleryGrid items={items} />
      <Footer />
    </>
  )
}
