import z from "zod";
import { VIDEO_MIME_TYPES } from "./constant";

export const videoFileSchema = z
  .instanceof(File)
  .refine((file) => VIDEO_MIME_TYPES.includes(file.type), {
    message: "File must be a video",
  });

export const uploadSchema = z.object({
  files: z.union([
    videoFileSchema,
    z.array(videoFileSchema).min(1, "At least one video file is required"),
  ]),
});
