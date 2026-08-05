import { create } from "zustand"
import type { ColorImageEntry, DecodeStateName, ImageEntry, Rotation } from "../types/manifest"
import type { ServerMessage } from "../types/messages"

export interface LiveImageState {
  globalIndex: number
  channel: number
  portrait: boolean
  rotation: Rotation
  width: number
  pixelRows: Uint8Array[]
  audioUrl: string | null
  audioDuration: number | null
}

interface PendingAudio {
  globalIndex: number
  url: string
  duration: number
}

interface DecodeStore {
  connected: boolean
  state: DecodeStateName
  stageText: string
  images: ImageEntry[]
  colorImages: ColorImageEntry[]
  liveImage: LiveImageState | null
  pendingAudio: PendingAudio | null
  setConnected: (connected: boolean) => void
  handleMessage: (msg: ServerMessage) => void
  hydrate: (images: ImageEntry[], colorImages: ColorImageEntry[], state: DecodeStateName) => void
}

export const useDecodeStore = create<DecodeStore>((set, get) => ({
  connected: false,
  state: "idle",
  stageText: "",
  images: [],
  colorImages: [],
  liveImage: null,
  pendingAudio: null,

  setConnected: (connected) => set({ connected }),

  hydrate: (images, colorImages, state) =>
    set((s) => (s.state === "idle" || s.images.length === 0 ? { images, colorImages, state } : s)),

  handleMessage: (msg) => {
    switch (msg.type) {
      case "hello":
        set({
          images: msg.images,
          colorImages: msg.color_images,
          state: msg.state,
          stageText: msg.stage ?? "",
        })
        return

      case "decode_started":
        set({
          state: "decoding",
          stageText: "Decode started",
          images: [],
          colorImages: [],
        })
        return

      case "stage":
        set({ stageText: msg.message })
        return

      case "audio_ready":
        set({
          pendingAudio: {
            globalIndex: msg.global_index,
            url: msg.audio_url,
            duration: msg.audio_duration_sec,
          },
        })
        return

      case "image_started":
        set((s) => {
          const audio =
            s.pendingAudio?.globalIndex === msg.global_index ? s.pendingAudio : null
          return {
            liveImage: {
              globalIndex: msg.global_index,
              channel: msg.channel,
              portrait: msg.portrait,
              rotation: msg.rotation,
              width: 0,
              pixelRows: [],
              audioUrl: audio?.url ?? null,
              audioDuration: audio?.duration ?? null,
            },
            pendingAudio: audio ? null : s.pendingAudio,
          }
        })
        return

      case "row_batch": {
        const live = get().liveImage
        if (!live || live.globalIndex !== msg.global_index) return
        const bytes = base64ToBytes(msg.pixels_b64)
        const rows: Uint8Array[] = []
        for (let i = 0; i < msg.row_count; i++) {
          rows.push(bytes.subarray(i * msg.width, (i + 1) * msg.width))
        }
        set({
          liveImage: {
            ...live,
            width: msg.width,
            pixelRows: [...live.pixelRows, ...rows],
          },
        })
        return
      }

      case "image_complete":
        set((s) => ({ images: [...s.images, msg.entry] }))
        return

      case "color_complete":
        set((s) => ({ colorImages: [...s.colorImages, msg.entry] }))
        return

      case "channel_complete":
        set({ liveImage: null })
        return

      case "compositing_started":
        set({ stageText: "Compositing color images…", liveImage: null })
        return

      case "decode_complete":
        set({ state: "complete", stageText: "Decode complete", liveImage: null })
        return

      case "error":
        set((s) => ({ stageText: msg.message, state: msg.fatal ? "error" : s.state }))
        return
    }
  },
}))

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
