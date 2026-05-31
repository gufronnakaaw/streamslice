import { type Serve } from "bun";
import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    success: true,
    status_code: 200,
    message: "Welcome to StreamSlice REST API",
  });
});

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
