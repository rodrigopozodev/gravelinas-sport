import "server-only";

import { getDb } from "@/lib/db";

export type PlayerRiotRow = {
  slot: number;
  puuid: string | null;
  summoner_name: string | null;
  profile_icon_id: number | null;
  solo_tier: string | null;
  solo_rank: string | null;
  solo_lp: number | null;
  solo_wins: number | null;
  solo_losses: number | null;
  last_full_sync_at: number | null;
  last_rank_sync_at: number | null;
};

export function getPlayerRiot(slot: number): PlayerRiotRow | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT slot, puuid, summoner_name, profile_icon_id, solo_tier, solo_rank, solo_lp, solo_wins, solo_losses, last_full_sync_at, last_rank_sync_at
       FROM player_riot WHERE slot = ?`
    )
    .get(slot) as PlayerRiotRow | undefined;
  return row ?? null;
}

export function upsertPlayerRiotFull(
  slot: number,
  data: {
    puuid: string;
    summoner_name: string | null;
    profile_icon_id: number | null;
    solo_tier: string | null;
    solo_rank: string | null;
    solo_lp: number | null;
    solo_wins: number | null;
    solo_losses: number | null;
    last_full_sync_at: number;
  }
) {
  const db = getDb();
  db.prepare(
    `INSERT INTO player_riot (
       slot, puuid, summoner_name, profile_icon_id,
       solo_tier, solo_rank, solo_lp, solo_wins, solo_losses,
       last_full_sync_at, last_rank_sync_at
     ) VALUES (
       @slot, @puuid, @summoner_name, @profile_icon_id,
       @solo_tier, @solo_rank, @solo_lp, @solo_wins, @solo_losses,
       @last_full_sync_at, @last_rank_sync_at
     )
     ON CONFLICT(slot) DO UPDATE SET
       puuid = excluded.puuid,
       summoner_name = excluded.summoner_name,
       profile_icon_id = excluded.profile_icon_id,
       solo_tier = excluded.solo_tier,
       solo_rank = excluded.solo_rank,
       solo_lp = excluded.solo_lp,
       solo_wins = excluded.solo_wins,
       solo_losses = excluded.solo_losses,
       last_full_sync_at = excluded.last_full_sync_at,
       last_rank_sync_at = excluded.last_rank_sync_at`
  ).run({
    slot,
    puuid: data.puuid,
    summoner_name: data.summoner_name,
    profile_icon_id: data.profile_icon_id,
    solo_tier: data.solo_tier,
    solo_rank: data.solo_rank,
    solo_lp: data.solo_lp,
    solo_wins: data.solo_wins,
    solo_losses: data.solo_losses,
    last_full_sync_at: data.last_full_sync_at,
    last_rank_sync_at: data.last_full_sync_at,
  });
}

export function updatePlayerRiotRankOnly(
  slot: number,
  data: {
    solo_tier: string | null;
    solo_rank: string | null;
    solo_lp: number | null;
    solo_wins: number | null;
    solo_losses: number | null;
    last_rank_sync_at: number;
  }
) {
  const db = getDb();
  db.prepare(
    `UPDATE player_riot SET
       solo_tier = @solo_tier,
       solo_rank = @solo_rank,
       solo_lp = @solo_lp,
       solo_wins = @solo_wins,
       solo_losses = @solo_losses,
       last_rank_sync_at = @last_rank_sync_at
     WHERE slot = @slot`
  ).run({ slot, ...data });
}
