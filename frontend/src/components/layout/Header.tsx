import { Link } from "react-router-dom"
import type { DecodeStateName } from "../../types/manifest"
import { StatusBadge } from "./StatusBadge"

export function Header({
  state,
  connected,
  onStartDecode,
  startDisabled,
  mode = "start",
}: {
  state: DecodeStateName
  connected?: boolean
  onStartDecode: () => void
  startDisabled?: boolean
  mode?: "start" | "replay"
}) {
  const label =
    state === "decoding" ? "Decoding…" : mode === "replay" ? "Replay decode" : "Start decoding"

  return (
    <header className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-10 pt-12 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <Link to="/" className="flex items-center gap-4">
          <div
            className="relative h-12 w-12 shrink-0 rounded-full border-2 border-gold-500/70 bg-[conic-gradient(from_0deg,#181c2c,#262c42,#181c2c)] shadow-[0_0_20px_rgba(212,165,55,0.25)]"
            aria-hidden="true"
          >
            <div className="absolute inset-[7px] rounded-full border border-gold-500/40" />
            <div className="absolute inset-[16px] rounded-full bg-space-950" />
          </div>
          <div>
            <h1 className="font-mono text-lg font-semibold tracking-tight text-gold-300 sm:text-xl">
              Voyager Golden Record
            </h1>
            <p className="text-sm text-gold-300/50">Live audio-to-image decoder</p>
          </div>
        </Link>
        <StatusBadge state={state} connected={connected} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onStartDecode}
          disabled={startDisabled}
          className="rounded-full bg-gold-500 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider text-space-950 transition-opacity hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {label}
        </button>
        <p className="max-w-xl text-xs text-gold-300/40">
          Encoded on the 1977 Voyager Golden Record: analog scan-line images
          recovered from audio, played back and reconstructed live.
        </p>
      </div>
    </header>
  )
}
