import { BrowserRouter, Route, Routes } from "react-router-dom"
import { startDecode } from "./api/client"
import { Header } from "./components/layout/Header"
import { StarfieldBackground } from "./components/layout/StarfieldBackground"
import { useDecodeWebSocket } from "./hooks/useWebSocket"
import { GalleryPage } from "./pages/GalleryPage"
import { ImageDetailPage } from "./pages/ImageDetailPage"
import { useDecodeStore } from "./state/decodeStore"

function App() {
  const { send } = useDecodeWebSocket()
  const connected = useDecodeStore((s) => s.connected)
  const state = useDecodeStore((s) => s.state)
  const images = useDecodeStore((s) => s.images)

  function handleStartDecode() {
    const canReplay = state === "complete" && images.length > 0 && images.every((i) => i.audio_url)
    if (canReplay) {
      send({ type: "replay_decode" })
      return
    }
    send({ type: "start_decode", force: true })
    startDecode(true).catch(() => {
      // WS start_decode already requested; REST call is a fallback trigger
    })
  }

  const canReplay = state === "complete" && images.length > 0 && images.every((i) => i.audio_url)

  return (
    <BrowserRouter>
      <div className="min-h-svh">
        <StarfieldBackground />
        <Header
          state={state}
          connected={connected}
          onStartDecode={handleStartDecode}
          startDisabled={state === "decoding"}
          mode={canReplay ? "replay" : "start"}
        />
        <Routes>
          <Route path="/" element={<GalleryPage />} />
          <Route path="/image/:key" element={<ImageDetailPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
