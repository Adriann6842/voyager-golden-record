import { useMemo } from "react"
import { useDecodedAudio } from "./useDecodedAudio"

export interface AudioPeaks {
  /** Interleaved [min, max] pairs per bucket, each in [-1, 1]. */
  peaks: Float32Array
  buckets: number
}

const BUCKET_COUNT = 500

/** Computes waveform peaks from a client-decoded audio clip. */
export function useAudioPeaks(url: string | null): AudioPeaks | null {
  const decoded = useDecodedAudio(url)

  return useMemo(() => {
    if (!decoded) return null
    const channel = decoded.channelData
    const bucketSize = Math.max(1, Math.floor(channel.length / BUCKET_COUNT))
    const result = new Float32Array(BUCKET_COUNT * 2)
    for (let b = 0; b < BUCKET_COUNT; b++) {
      let min = 0
      let max = 0
      const start = b * bucketSize
      const end = Math.min(channel.length, start + bucketSize)
      for (let i = start; i < end; i++) {
        const v = channel[i]
        if (v < min) min = v
        if (v > max) max = v
      }
      result[b * 2] = min
      result[b * 2 + 1] = max
    }
    return { peaks: result, buckets: BUCKET_COUNT }
  }, [decoded])
}
