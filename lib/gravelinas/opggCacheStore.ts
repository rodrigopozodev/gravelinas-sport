import "server-only";

import { getDb } from "@/lib/db";
import type { OpggLineupRank, OpggSoloQChampion2026 } from "@/lib/gravelinas/opggLineupTypes";

type Row = {
  riot_id: string;
  pos: string;
  display: string;
  rank_text: string | null;
  tier_emblem_url: string | null;
  rank_error: string | null;
  champions_json: string;
  champions_error: string | null;
  fetched_at: number;
  solo_wins?: number | null;
  solo_losses?: number | null;
};

/** Vuelca una fila completa en `opgg_riot_cache` (upsert). */
export function upsertOpggRow(row: OpggLineupRank, fetchedAt: number) {
  const db = getDb();
  db.prepare(
    `INSERT INTO opgg_riot_cache (
       riot_id, pos, display, rank_text, tier_emblem_url, rank_error,
       champions_json, champions_error, fetched_at, solo_wins, solo_losses
     ) VALUES (
       @riot_id, @pos, @display, @rank_text, @tier_emblem_url, @rank_error,
       @champions_json, @champions_error, @fetched_at, @solo_wins, @solo_losses
     )
     ON CONFLICT(riot_id) DO UPDATE SET
       pos = excluded.pos,
       display = excluded.display,
       rank_text = excluded.rank_text,
       tier_emblem_url = excluded.tier_emblem_url,
       rank_error = excluded.rank_error,
       champions_json = excluded.champions_json,
       champions_error = excluded.champions_error,
       fetched_at = excluded.fetched_at,
       solo_wins = excluded.solo_wins,
       solo_losses = excluded.solo_losses`
  ).run({
    riot_id: row.riotId,
    pos: row.pos,
    display: row.display,
    rank_text: row.rankText,
    tier_emblem_url: row.tierEmblemUrl,
    rank_error: row.error,
    champions_json: JSON.stringify(row.champions2026 ?? []),
    champions_error: row.champions2026Error,
    fetched_at: fetchedAt,
    solo_wins: row.soloWins ?? null,
    solo_losses: row.soloLosses ?? null,
  });
}

function rowToCached(r: Row): OpggLineupRank & { fetchedAt: number } {
  let champs: OpggSoloQChampion2026[] = [];
  try {
    const parsed = JSON.parse(r.champions_json) as unknown;
    if (Array.isArray(parsed)) champs = parsed as OpggSoloQChampion2026[];
  } catch {
    champs = [];
  }
  return {
    pos: r.pos,
    display: r.display,
    riotId: r.riot_id,
    rankText: r.rank_text ?? "—",
    tierEmblemUrl: r.tier_emblem_url,
    error: r.rank_error,
    soloWins: r.solo_wins ?? null,
    soloLosses: r.solo_losses ?? null,
    champions2026: champs,
    champions2026Error: r.champions_error,
    fetchedAt: r.fetched_at,
  };
}

/** Lee una fila cacheada; `null` si no existe. */
export function getOpggCachedRow(riotId: string): (OpggLineupRank & { fetchedAt: number }) | null {
  const db = getDb();
  const r = db
    .prepare(
      `SELECT riot_id, pos, display, rank_text, tier_emblem_url, rank_error,
              champions_json, champions_error, fetched_at, solo_wins, solo_losses
       FROM opgg_riot_cache WHERE riot_id = ?`
    )
    .get(riotId) as Row | undefined;
  if (!r) return null;
  return rowToCached(r);
}

/** Lee en orden del lineup dado; para claves sin fila devuelve placeholder con `error: "Sin datos"`. Una query `IN` por lineup. */
export function getOpggCachedLineup(lineup: readonly { pos: string; display: string; riotId: string }[]): {
  rows: OpggLineupRank[];
  oldestFetchedAt: number | null;
  newestFetchedAt: number | null;
} {
  if (lineup.length === 0) {
    return { rows: [], oldestFetchedAt: null, newestFetchedAt: null };
  }
  const ids = lineup.map((l) => l.riotId);
  const ph = ids.map(() => "?").join(",");
  const db = getDb();
  const fromDb = db
    .prepare(
      `SELECT riot_id, pos, display, rank_text, tier_emblem_url, rank_error,
              champions_json, champions_error, fetched_at, solo_wins, solo_losses
       FROM opgg_riot_cache WHERE riot_id IN (${ph})`
    )
    .all(...ids) as Row[];
  const byRiot = new Map(fromDb.map((r) => [r.riot_id, rowToCached(r)]));

  let oldest: number | null = null;
  let newest: number | null = null;
  const rows: OpggLineupRank[] = lineup.map((l) => {
    const cached = byRiot.get(l.riotId);
    if (!cached) {
      return {
        pos: l.pos,
        display: l.display,
        riotId: l.riotId,
        rankText: "—",
        tierEmblemUrl: null,
        error: "Sin datos (pulsa Actualizar)",
        soloWins: null,
        soloLosses: null,
        champions2026: [],
        champions2026Error: null,
      };
    }
    oldest = oldest == null ? cached.fetchedAt : Math.min(oldest, cached.fetchedAt);
    newest = newest == null ? cached.fetchedAt : Math.max(newest, cached.fetchedAt);
    return {
      pos: l.pos,
      display: l.display,
      riotId: l.riotId,
      rankText: cached.rankText,
      tierEmblemUrl: cached.tierEmblemUrl,
      error: cached.error,
      soloWins: cached.soloWins,
      soloLosses: cached.soloLosses,
      champions2026: cached.champions2026,
      champions2026Error: cached.champions2026Error,
    };
  });
  return { rows, oldestFetchedAt: oldest, newestFetchedAt: newest };
}
