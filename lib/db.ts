import "server-only";

import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const globalForDb = globalThis as unknown as { gravelinasDb?: Database.Database };

function defaultDbPath(): string {
  const env = process.env.DATABASE_PATH?.trim();
  if (env) return path.isAbsolute(env) ? env : path.join(process.cwd(), env);
  return path.join(process.cwd(), "data", "gravelinas.db");
}

function ensureDataDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_member (
      slot INTEGER PRIMARY KEY CHECK (slot BETWEEN 1 AND 5),
      game_name TEXT NOT NULL,
      tag_line TEXT NOT NULL,
      platform TEXT NOT NULL,
      label TEXT
    );

    CREATE TABLE IF NOT EXISTS cache_entry (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      fetched_at INTEGER NOT NULL,
      ttl_seconds INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_riot (
      slot INTEGER PRIMARY KEY CHECK (slot BETWEEN 1 AND 5),
      puuid TEXT,
      summoner_name TEXT,
      profile_icon_id INTEGER,
      solo_tier TEXT,
      solo_rank TEXT,
      solo_lp INTEGER,
      solo_wins INTEGER,
      solo_losses INTEGER,
      last_full_sync_at INTEGER,
      last_rank_sync_at INTEGER
    );
  `);
}

export function getDb(): Database.Database {
  if (globalForDb.gravelinasDb) return globalForDb.gravelinasDb;
  const dbPath = defaultDbPath();
  ensureDataDir(dbPath);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  migrate(db);
  if (process.env.NODE_ENV !== "production") {
    globalForDb.gravelinasDb = db;
  }
  return db;
}
