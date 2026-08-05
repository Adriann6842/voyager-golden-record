import type { DecodeStateName } from "../../types/manifest"

const LABEL: Record<DecodeStateName, string> = {
  idle: "idle",
  decoding: "decoding",
  complete: "complete",
  error: "error",
}

const DOT: Record<DecodeStateName, string> = {
  idle: "bg-gold-300/40",
  decoding: "bg-signal-400 animate-pulse",
  complete: "bg-signal-500",
  error: "bg-red-400",
}

export function StatusBadge({
  state,
  connected,
}: {
  state: DecodeStateName
  connected?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-space-600 bg-space-900/60 px-3 py-1.5 font-mono text-xs text-gold-300/80">
      <span className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[state]}`} />
        {LABEL[state]}
      </span>
      {connected !== undefined && (
        <span className="flex items-center gap-1.5 border-l border-space-600 pl-3">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              connected ? "bg-signal-500" : "bg-space-500"
            }`}
          />
          {connected ? "live" : "offline"}
        </span>
      )}
    </div>
  )
}
