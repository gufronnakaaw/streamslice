import { $ } from "bun";
import type { BuildFfmpegParams, FfmpegRunResult } from "../types";
import { PRESETS } from "./constant";

export function parseFps(fps: string) {
  if (!fps || fps === "0/0") return 0;
  const [n, d] = fps.split("/").map(Number);
  return n && d ? n / d : 0;
}

export async function getVideoMetadata(file_path: string) {
  const probe = await $`
  ffprobe -v error \
  -show_streams \
  -of json \
  ${file_path}
`.text();

  const data = JSON.parse(probe);

  const video = data.streams.find((s: any) => s.codec_type === "video");

  const audio = data.streams.find((s: any) => s.codec_type === "audio");

  const video_info = {
    codec: video?.codec_name as string,
    width: video?.width as number,
    height: video?.height as number,
    fps: Math.round(parseFps(video?.avg_frame_rate)),
  };

  const audio_info = {
    codec: audio?.codec_name as string,
    channels: audio?.channels as number,
  };

  const copy_audio = audio_info.codec === "aac" && audio_info.channels <= 2;

  const presets_mapping = PRESETS.filter(
    (v) => video_info.height >= v.height,
  ).map((v) => ({
    ...v,
    copy_video: video_info.codec === "h264" && video_info.height === v.height,
    copy_audio,
  }));

  return {
    video: video_info,
    audio: audio_info,
    presets: presets_mapping,
    available_resolutions: presets_mapping.map((v) => v.resolution),
  };
}

export type VideoMetadata = Awaited<ReturnType<typeof getVideoMetadata>>;

export function buildFfmpeg({
  file_path,
  fps,
  presets,
  video_id,
}: BuildFfmpegParams) {
  const ffmpeg_args: string[] = ["ffmpeg", "-i", file_path];
  const hls_time = 6;
  const gop = fps > 0 ? Math.max(1, Math.round(fps * hls_time)) : 48;

  if (presets.length > 1) {
    const split_labels = presets.map((_, i) => `[v${i + 1}]`).join("");

    const scale_filters = presets
      .map((res, i) => {
        return `[v${i + 1}]scale=${res.width}:${res.height}[v${i + 1}out]`;
      })
      .join(";");

    ffmpeg_args.push(
      "-filter_complex",
      `[0:v]split=${presets.length}${split_labels};${scale_filters}`,
    );

    for (const [i, res] of presets.entries()) {
      ffmpeg_args.push(
        "-map",
        `[v${i + 1}out]`,
        `-c:v:${i}`,
        "libx264",
        "-preset",
        "medium",
        `-crf:v:${i}`,
        "20",
        `-profile:v:${i}`,
        "high",
        `-pix_fmt:v:${i}`,
        "yuv420p",
        `-b:v:${i}`,
        res.video_bitrate,
        `-maxrate:v:${i}`,
        res.video_maxrate,
        `-bufsize:v:${i}`,
        res.video_bufsize,
        "-map",
        "a:0",
        `-c:a:${i}`,
        "aac",
        `-b:a:${i}`,
        res.audio_bitrate,
        "-ac",
        "2",
      );
    }

    ffmpeg_args.push(
      "-force_key_frames",
      `expr:gte(t,n_forced*${hls_time})`,
      "-g",
      String(gop),
      "-keyint_min",
      String(gop),
      "-sc_threshold",
      "0",
      "-f",
      "hls",
      "-hls_time",
      String(hls_time),
      "-hls_playlist_type",
      "vod",
      "-hls_flags",
      "independent_segments",
      "-hls_segment_type",
      "mpegts",
      "-hls_segment_filename",
      `hls/${video_id}/%v/segment%03d.ts`,
      "-master_pl_name",
      "master.m3u8",
      "-var_stream_map",
      presets.map((res, i) => `v:${i},a:${i},name:${res.resolution}`).join(" "),
      `hls/${video_id}/%v/playlist.m3u8`,
    );
  } else {
    const resolution = presets[0]?.resolution ?? "480p";
    const data = PRESETS.find((p) => p.resolution === resolution);

    ffmpeg_args.push(
      "-vf",
      `scale=${data?.width}:${data?.height}`,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "20",
      "-profile:v",
      "high",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      data?.video_bitrate as string,
      "-maxrate",
      data?.video_maxrate as string,
      "-bufsize",
      data?.video_bufsize as string,
      "-c:a",
      "aac",
      "-b:a",
      data?.audio_bitrate as string,
      "-ac",
      "2",
      "-force_key_frames",
      `expr:gte(t,n_forced*${hls_time})`,
      "-g",
      String(gop),
      "-keyint_min",
      String(gop),
      "-sc_threshold",
      "0",
      "-f",
      "hls",
      "-hls_time",
      String(hls_time),
      "-hls_playlist_type",
      "vod",
      "-hls_flags",
      "independent_segments",
      "-hls_segment_type",
      "mpegts",
      "-hls_segment_filename",
      `hls/${video_id}/${resolution}/segment%03d.ts`,
      "-master_pl_name",
      "../master.m3u8",
      `hls/${video_id}/${resolution}/playlist.m3u8`,
    );
  }

  return ffmpeg_args;
}

export async function runFfmpeg(
  argsList: string[][],
): Promise<FfmpegRunResult> {
  for (const args of argsList) {
    const proc = Bun.spawn(args, { stdout: "inherit", stderr: "pipe" });
    const stderrPromise = proc.stderr
      ? new Response(proc.stderr).text()
      : Promise.resolve("");
    const exitCode = await proc.exited;
    const stderrText = (await stderrPromise).trim();

    if (exitCode !== 0) {
      return {
        ok: false,
        exit_code: exitCode,
        error: stderrText || `ffmpeg exited with code ${exitCode}`,
      };
    }
  }

  return { ok: true };
}
