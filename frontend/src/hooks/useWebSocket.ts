import { useEffect, useRef } from "react"
import { useDecodeStore } from "../state/decodeStore"
import type { ClientMessage, ServerMessage } from "../types/messages"

const RECONNECT_DELAY_MS = 2000

export function useDecodeWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const handleMessage = useDecodeStore((s) => s.handleMessage)
  const setConnected = useDecodeStore((s) => s.setConnected)

  useEffect(() => {
    let cancelled = false
    let socket: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    function connect() {
      if (cancelled) return
      const protocol = window.location.protocol === "https:" ? "wss" : "ws"
      socket = new WebSocket(`${protocol}://${window.location.host}/ws/decode`)
      wsRef.current = socket

      socket.onopen = () => setConnected(true)

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as ServerMessage
          handleMessage(msg)
        } catch {
          // ignore malformed frames
        }
      }

      socket.onclose = () => {
        setConnected(false)
        if (!cancelled) retryTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }

      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
      socket?.close()
    }
  }, [handleMessage, setConnected])

  function send(msg: ClientMessage) {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }

  return { send }
}
