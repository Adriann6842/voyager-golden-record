import type { Manifest, StatusPayload } from "../types/manifest"

export async function fetchGallery(): Promise<Manifest> {
  const res = await fetch("/api/gallery")
  if (!res.ok) throw new Error(`GET /api/gallery failed: ${res.status}`)
  return res.json()
}

export async function fetchStatus(): Promise<StatusPayload> {
  const res = await fetch("/api/status")
  if (!res.ok) throw new Error(`GET /api/status failed: ${res.status}`)
  return res.json()
}

export async function startDecode(force = false): Promise<void> {
  const res = await fetch("/api/decode/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ force }),
  })
  if (!res.ok && res.status !== 409) {
    throw new Error(`POST /api/decode/start failed: ${res.status}`)
  }
}
