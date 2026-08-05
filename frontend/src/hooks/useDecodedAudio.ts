import { useEffect, useState } from "react"

export interface DecodedAudio {
  channelData: Float32Array
  sampleRate: number
  duration: number
}

let sharedContext: AudioContext | null = null
function getAudioContext(): AudioContext {
  if (!sharedContext) sharedContext = new AudioContext()
  return sharedContext
}

const cache = new Map<string, DecodedAudio>()

/** Fetches and decodes an audio clip client-side once, shared across hooks. */
export function useDecodedAudio(url: string | null): DecodedAudio | null {
  const [decoded, setDecoded] = useState<DecodedAudio | null>(url ? (cache.get(url) ?? null) : null)

  useEffect(() => {
    if (!url) {
      setDecoded(null)
      return
    }
    const hit = cache.get(url)
    if (hit) {
      setDecoded(hit)
      return
    }

    let cancelled = false
    setDecoded(null)

    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => getAudioContext().decodeAudioData(buf))
      .then((audioBuffer) => {
        if (cancelled) return
        const result: DecodedAudio = {
          channelData: audioBuffer.getChannelData(0),
          sampleRate: audioBuffer.sampleRate,
          duration: audioBuffer.duration,
        }
        cache.set(url, result)
        setDecoded(result)
      })
      .catch(() => {
        if (!cancelled) setDecoded(null)
      })

    return () => {
      cancelled = true
    }
  }, [url])

  return decoded
}
