import { zValidator } from "@hono/zod-validator";
import { type Serve } from "bun";
import { randomUUID } from "crypto";
import { mkdir } from "fs/promises";
import { Hono } from "hono";
import { join } from "path";
import { getVideoById, insertVideo, listVideos } from "./utils/db";
import { getVideoMetadata, type VideoMetadata } from "./utils/function";
import { uploadSchema } from "./utils/validation";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    success: true,
    status_code: 200,
    message: "Welcome to StreamSlice REST API",
  });
});

app.get("/videos", async (c) => {
  return c.json({
    success: true,
    status_code: 200,
    data: listVideos(),
  });
});

app.get("/videos/:id", (c) => {
  const id = c.req.param("id");
  const data = getVideoById(id);

  if (!data) {
    return c.json(
      {
        success: false,
        status_code: 404,
        error: {
          name: "NotFoundError",
          message: "The requested upload was not found.",
          errors: null,
        },
      },
      404,
    );
  }

  return c.json({
    success: true,
    status_code: 200,
    data,
  });
});

app.post(
  "/videos",
  zValidator("form", uploadSchema, (result, c) => {
    if (!result.success) {
      return c.json(
        {
          success: false,
          status_code: 400,
          error: {
            name: result.error.name,
            message: "Validation failed for the uploaded data.",
            errors: result.error.issues.map((error) => {
              return {
                field:
                  error.code == "unrecognized_keys" ? error.keys : error.path,
                message: error.message,
              };
            }),
          },
        },
        400,
      );
    }
  }),
  async (c) => {
    try {
      const body = await c.req.formData();
      const files = body.getAll("files") as File[];

      if (files.length === 0) {
        return c.json(
          {
            success: false,
            status_code: 400,
            error: {
              name: "ValidationError",
              message: "No files provided.",
              errors: null,
            },
          },
          400,
        );
      }

      const uploads_dir = join(process.cwd(), "uploads");
      await mkdir(uploads_dir, { recursive: true });

      const uploaded_files: {
        id: string;
        name: string;
        type: string;
        size: number;
        metadata: VideoMetadata;
      }[] = [];

      for (const file of files) {
        const uuid = randomUUID();
        const upload_dir = join(uploads_dir, uuid);
        await mkdir(upload_dir, { recursive: true });
        const file_path = join(upload_dir, file.name);
        const array_buffer = await file.arrayBuffer();
        await Bun.write(file_path, array_buffer);
        const data = {
          id: uuid,
          name: file.name,
          type: file.type,
          size: file.size,
          metadata: await getVideoMetadata(file_path),
        };

        insertVideo(data);

        uploaded_files.push(data);
      }

      return c.json(
        {
          success: true,
          status_code: 201,
          message: `${uploaded_files.length} video(s) uploaded successfully`,
          data: uploaded_files,
        },
        201,
      );
    } catch (error_value) {
      const error_message =
        error_value instanceof Error
          ? error_value.message
          : "Unexpected error while uploading videos.";
      const error_name =
        error_value instanceof Error ? error_value.name : "InternalServerError";

      return c.json(
        {
          success: false,
          status_code: 500,
          error: {
            name: error_name,
            message: error_message,
            errors: null,
          },
        },
        500,
      );
    }
  },
);

app.get("/:id/master.m3u8", async (c) => {
  const id = c.req.param("id");
  const file = Bun.file(`hls/${id}/master.m3u8`);

  if (!(await file.exists())) {
    return c.json(
      {
        success: false,
        status_code: 404,
        error: {
          name: "NotFoundError",
          message: "The requested file was not found.",
          errors: null,
        },
      },
      404,
    );
  }

  c.header("Content-Type", "application/vnd.apple.mpegurl");
  c.header("Cache-Control", "no-cache");

  return c.body(await file.text(), 200);
});

app.get("/:id/:resolution/:filename", async (c) => {
  const id = c.req.param("id");
  const resolution = c.req.param("resolution");
  const filename = c.req.param("filename");
  const file = Bun.file(`hls/${id}/${resolution}/${filename}`);

  if (!(await file.exists())) {
    return c.json(
      {
        success: false,
        status_code: 404,
        error: {
          name: "NotFoundError",
          message: "The requested file was not found.",
          errors: null,
        },
      },
      404,
    );
  }

  const ext = filename.split(".").pop()?.toLowerCase();
  const content_type =
    ext === "m3u8"
      ? "application/vnd.apple.mpegurl"
      : ext === "ts"
        ? "video/mp2t"
        : ext === "m4s"
          ? "video/iso.segment"
          : ext === "mp4"
            ? "video/mp4"
            : "application/octet-stream";

  c.header("Content-Type", content_type);
  c.header("Cache-Control", "no-cache");

  return c.body(file.stream(), 200);
});

export default {
  port: process.env["PORT"] || 3000,
  fetch: app.fetch,
  maxRequestBodySize: 1024 * 1024 * 512,
  development: process.env["MODE"] !== "production",
} satisfies Serve.Options<undefined>;
