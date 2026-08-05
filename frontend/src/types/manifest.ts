export type DecodeStateName = "idle" | "decoding" | "complete" | "error"
export type Rotation = "cw" | "ccw" | "none"

export interface ImageEntry {
  global_index: number
  channel: number
  local_index: number
  kind: "mono"
  portrait: boolean
  rotation: Rotation
  width: number
  height: number
  url: string
  audio_url: string | null
  audio_duration_sec: number | null
}

export interface ColorImageEntry {
  pair: [number, number, number]
  url: string
  width: number
  height: number
}

export interface Manifest {
  version: number
  generated_at: string
  source_wav: string
  sample_rate: number | null
  scanwidth: number
  thickness: number
  state: DecodeStateName
  error_message: string | null
  images: ImageEntry[]
  color_images: ColorImageEntry[]
}

export interface StatusPayload {
  state: DecodeStateName
  images_done: number
  color_images_done: number
  error_message: string | null
}

/** A gallery item unifies mono images and color composites under one shape. */
export type GalleryItem =
  | { kind: "mono"; key: string; url: string; index: number; entry: ImageEntry }
  | { kind: "color"; key: string; url: string; index: number; entry: ColorImageEntry }

export function toGalleryItems(manifest: Manifest): GalleryItem[] {
  const mono: GalleryItem[] = manifest.images.map((entry) => ({
    kind: "mono",
    key: `mono-${entry.global_index}`,
    url: entry.url,
    index: entry.global_index,
    entry,
  }))
  const color: GalleryItem[] = manifest.color_images.map((entry) => ({
    kind: "color",
    key: `color-${entry.pair.join("-")}`,
    url: entry.url,
    index: entry.pair[0],
    entry,
  }))
  return [...mono, ...color].sort((a, b) => a.index - b.index)
}
