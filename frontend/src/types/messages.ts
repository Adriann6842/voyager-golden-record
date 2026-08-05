import type { ColorImageEntry, DecodeStateName, ImageEntry, Rotation } from "./manifest"

export interface HelloMsg {
  type: "hello"
  state: DecodeStateName
  images: ImageEntry[]
  color_images: ColorImageEntry[]
  stage: string | null
}

export interface DecodeStartedMsg {
  type: "decode_started"
  total_channels: number
  sample_rate: number
}

export interface StageMsg {
  type: "stage"
  channel: number | null
  stage: string
  message: string
}

export interface ImageStartedMsg {
  type: "image_started"
  global_index: number
  channel: number
  local_index: number
  portrait: boolean
  rotation: Rotation
}

export interface AudioReadyMsg {
  type: "audio_ready"
  global_index: number
  audio_url: string
  audio_duration_sec: number
}

export interface RowBatchMsg {
  type: "row_batch"
  global_index: number
  row_start: number
  row_count: number
  width: number
  pixels_b64: string
  provisional: boolean
}

export interface ImageCompleteMsg {
  type: "image_complete"
  entry: ImageEntry
}

export interface ColorCompleteMsg {
  type: "color_complete"
  entry: ColorImageEntry
}

export interface ChannelCompleteMsg {
  type: "channel_complete"
  channel: number
  images_found: number
}

export interface CompositingStartedMsg {
  type: "compositing_started"
  total_color_images: number
}

export interface DecodeCompleteMsg {
  type: "decode_complete"
  total_images: number
  total_color_images: number
  duration_sec: number
}

export interface ErrorMsg {
  type: "error"
  stage: string
  message: string
  fatal: boolean
}

export type ServerMessage =
  | HelloMsg
  | DecodeStartedMsg
  | StageMsg
  | ImageStartedMsg
  | AudioReadyMsg
  | RowBatchMsg
  | ImageCompleteMsg
  | ColorCompleteMsg
  | ChannelCompleteMsg
  | CompositingStartedMsg
  | DecodeCompleteMsg
  | ErrorMsg

export interface StartDecodeMsg {
  type: "start_decode"
  force?: boolean
}

export interface ReplayDecodeMsg {
  type: "replay_decode"
}

export interface PingMsg {
  type: "ping"
}

export type ClientMessage = StartDecodeMsg | ReplayDecodeMsg | PingMsg
