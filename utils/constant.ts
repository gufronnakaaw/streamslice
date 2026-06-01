export const STATUS_VALUES = new Set([
  "uploaded",
  "queued",
  "processing",
  "done",
  "failed",
]);

export const PRESETS = [
  {
    resolution: "1080p",
    width: 1920,
    height: 1080,
    bandwidth: 9800000,
    video_bitrate: "9000k",
    video_maxrate: "9800k",
    video_bufsize: "14000k",
    audio_bitrate: "192k",
  },
  {
    resolution: "720p",
    width: 1280,
    height: 720,
    bandwidth: 4500000,
    video_bitrate: "4000k",
    video_maxrate: "4400k",
    video_bufsize: "6600k",
    audio_bitrate: "160k",
  },
  {
    resolution: "480p",
    width: 854,
    height: 480,
    bandwidth: 2200000,
    video_bitrate: "1800k",
    video_maxrate: "2000k",
    video_bufsize: "3000k",
    audio_bitrate: "128k",
  },
];

export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-flv",
  "video/3gpp",
  "video/3gpp2",
];
