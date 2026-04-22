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

    CREATE TABLE IF NOT EXISTS opgg_riot_cache (
      riot_id TEXT PRIMARY KEY,
      pos TEXT NOT NULL,
      display TEXT NOT NULL,
      rank_text TEXT,
      tier_emblem_url TEXT,
      rank_error TEXT,
      champions_json TEXT NOT NULL,
      champions_error TEXT,
      fetched_at INTEGER NOT NULL,
      solo_wins INTEGER,
      solo_losses INTEGER
    );
  `);
  ensureOpggSoloWlColumns(db);
}

function ensureOpggSoloWlColumns(db: Database.Database) {
  const cols = db.prepare("PRAGMA table_info(opgg_riot_cache)").all() as { name: string }[];
  const names = new Set(cols.map((c) => c.name));
  if (!names.has("solo_wins")) db.exec("ALTER TABLE opgg_riot_cache ADD COLUMN solo_wins INTEGER");
  if (!names.has("solo_losses")) db.exec("ALTER TABLE opgg_riot_cache ADD COLUMN solo_losses INTEGER");
}

export function getDb(): Database.Database {
  if (globalForDb.gravelinasDb) {
    // Conexión cacheada en dev HMR: re-ejecutar `migrate` (idempotente) para aplicar tablas nuevas sin reiniciar.
    migrate(globalForDb.gravelinasDb);
    return globalForDb.gravelinasDb;
  }
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
