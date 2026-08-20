import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const databaseDirectory = path.resolve("database");
if (!fs.existsSync(databaseDirectory)) fs.mkdirSync(databaseDirectory, { recursive: true });

const databasePath = path.join(databaseDirectory, "convertflow.db");
export const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    status TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    total_files INTEGER DEFAULT 0,
    completed_files INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    completed_at TEXT,
    error TEXT
  );
  CREATE TABLE IF NOT EXISTS conversion_files (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    original_name TEXT NOT NULL,
    output_name TEXT,
    output_format TEXT NOT NULL,
    status TEXT NOT NULL,
    progress INTEGER DEFAULT 0,
    error TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stripe_session_id TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS jobs_user_created_at ON jobs(user_id, created_at DESC);
`);

console.log(`Database connected: ${databasePath}`);
