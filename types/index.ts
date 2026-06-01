import type { VideoMetadata } from "../utils/function";

export type FfmpegRunResult =
  | { ok: true }
  | { ok: false; exit_code: number; error: string };

export type BuildFfmpegParams = {
  file_path: string;
  video_id: string;
  fps: number;
  presets: {
    copy_video: boolean;
    copy_audio: boolean;
    resolution: string;
    width: number;
    height: number;
    bandwidth: number;
    video_bitrate: string;
    video_maxrate: string;
    video_bufsize: string;
    audio_bitrate: string;
  }[];
};

export type Video = {
  id: string;
  name: string;
  type: string;
  size: number;
  metadata_json: string;
  created_at: string;
  status: string;
  progress: number;
  error: string | null;
  output_path: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type VideoInsert = {
  id: string;
  name: string;
  type: string;
  size: number;
  metadata: VideoMetadata;
};
