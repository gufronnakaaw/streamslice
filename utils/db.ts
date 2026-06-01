import { Database } from "bun:sqlite";
import type { Video, VideoInsert } from "../types";
import type { VideoMetadata } from "./function";

const db = new Database("streamslice.sqlite");

db.run(`
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size INTEGER NOT NULL,
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    progress INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    started_at TEXT,
    finished_at TEXT
  )
`);

export function listVideos() {
  const stmt = db.prepare<Video, []>(
    "SELECT id, name, type, size, metadata_json, created_at, status, progress, error, started_at, finished_at FROM videos ORDER BY created_at DESC",
  );
  const rows = stmt.all();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    size: row.size,
    metadata: JSON.parse(row.metadata_json) as VideoMetadata,
    created_at: row.created_at,
    status: row.status,
    progress: row.progress,
    error: row.error,
    started_at: row.started_at,
    finished_at: row.finished_at,
  }));
}

export function getVideoById(id: string) {
  const stmt = db.prepare<Video, [string]>(
    "SELECT id, name, type, size, metadata_json, created_at, status, progress, error, started_at, finished_at FROM videos WHERE id = ?",
  );
  const row = stmt.get(id);

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    size: row.size,
    metadata: JSON.parse(row.metadata_json) as VideoMetadata,
    created_at: row.created_at,
    status: row.status,
    progress: row.progress,
    error: row.error,
    started_at: row.started_at,
    finished_at: row.finished_at,
  };
}

export function insertVideo(video: VideoInsert) {
  const stmt = db.prepare(
    "INSERT INTO videos (id, name, type, size, metadata_json, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  stmt.run(
    video.id,
    video.name,
    video.type,
    video.size,
    JSON.stringify(video.metadata),
    "uploaded",
    new Date().toISOString(),
  );
}
