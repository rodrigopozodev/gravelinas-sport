import "server-only";

import type { OpggSoloQChampion2026 } from "@/lib/gravelinas/opggLineupTypes";
import { OPGG_LINEUP_CHAMPIONS_TOP } from "@/lib/gravelinas/opggLineupTypes";
import { championSquareUrl } from "@/lib/gravelinas/ddragon";
import { getDDragonChampionIdToKeyMap } from "@/lib/gravelinas/championIdDdragon";
import { fetchMatchIdsByPuuid, fetchMatchV5 } from "@/lib/riot/matchServer";
import { platformToMatchRegional, type RiotMatchRegional } from "@/lib/riot/matchRegional";
import type { RiotPlatformId } from "@/lib/riot/platforms";

const RANKED_SOLO_5V5 = 420;
const RANKED_FLEX_5V5 = 440;
const RANKED_QUEUES = new Set<number>([RANKED_SOLO_5V5, RANKED_FLEX_5V5]);

/** 2026-01-01T00:00:00.000Z (Riot `gameCreation` en ms). */
const SEASON_2026_START_MS = Date.UTC(2026, 0, 1, 0, 0, 0, 0);
/** Misma fecha para `startTime` (s) en listado. */
const SEASON_2026_START_S = Math.floor(SEASON_2026_START_MS / 1000);

/** Listado `type=ranked` + startTime: una sola línea temporal (estilo pestaña S2026 op.gg). Riot ~≤1000 ids/puuid. */
const MAX_LIST_PAGES_RANKED_TYPE = 10;
/** Fallback si `type=ranked` devuelve vacío (cuotas/región). */
const MAX_LIST_PAGES_PER_QUEUE = 10;
/** Igualar tope de ids Riot (~1000); cada id = 1 GET match. */
const MAX_MATCH_DETAIL_FETCH = 1000;
/** Lotes paralelos pequeños + pausa → menos wall time que secuencial puro sin martillar Riot. */
const MATCH_FETCH_CONCURRENCY = 4;
const MATCH_FETCH_BATCH_SLEEP_MS = 55;
const BUDGE_MS = 40;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function formatKdaRatio(k: number, d: number, a: number): { value: number; label: string } {
  if (d <= 0) {
    if (k + a === 0) return { value: 0, label: "0.00:1" };
    return { value: 99, label: "∞:1" };
  }
  const v = (k + a) / d;
  return { value: v, label: `${v.toFixed(2)}:1` };
}

function interleaveMatchIds(solo: string[], flex: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const n = Math.max(solo.length, flex.length);
  for (let i = 0; i < n; i++) {
    const a = solo[i];
    const b = flex[i];
    if (a && !seen.has(a)) {
      seen.add(a);
      out.push(a);
    }
    if (b && !seen.has(b)) {
      seen.add(b);
      out.push(b);
    }
  }
  return out;
}

async function collectRankedTypeMatchIds(
  puuid: string,
  regional: RiotMatchRegional,
  startTimeS: number
): Promise<{ ids: string[]; error: string | null }> {
  const ids: string[] = [];
  for (let page = 0; page < MAX_LIST_PAGES_RANKED_TYPE; page++) {
    const res = await fetchMatchIdsByPuuid(puuid, regional, {
      type: "ranked",
      startTime: startTimeS,
      start: page * 100,
      count: 100,
    });
    await sleep(BUDGE_MS);
    if (!res.ok) {
      return { ids, error: res.error ?? `match ids type=ranked: ${res.status}` };
    }
    if (res.ids.length === 0) break;
    ids.push(...res.ids);
    if (res.ids.length < 100) break;
  }
  return { ids, error: null };
}

async function collectMatchIdsForQueue(
  puuid: string,
  regional: RiotMatchRegional,
  queue: number,
  startTimeS: number
): Promise<{ ids: string[]; error: string | null }> {
  const ids: string[] = [];
  for (let page = 0; page < MAX_LIST_PAGES_PER_QUEUE; page++) {
    const res = await fetchMatchIdsByPuuid(puuid, regional, {
      queue,
      startTime: startTimeS,
      start: page * 100,
      count: 100,
    });
    await sleep(BUDGE_MS);
    if (!res.ok) {
      return { ids, error: res.error ?? `Partidas queue ${queue}: ${res.status}` };
    }
    if (res.ids.length === 0) break;
    ids.push(...res.ids);
    if (res.ids.length < 100) break;
  }
  return { ids, error: null };
}

/**
 * Stats campeones estilo op.gg **S2026**: ids con `type=ranked` + `startTime` (1 ene 2026) → misma mezcla temporal que la pestaña temporada;
 * en detalle solo cuentan colas **420 y 440** (Clash u otras ranked que cuelen en `type=ranked` se ignoran).
 * Tope Riot Match-V5 ≈1000 partidas/puuid → contadores pueden quedar por debajo de op.gg si ellos agregan más allá de la API.
 */
export async function fetchSoloQ2026ChampionTopN(
  puuid: string,
  platform: RiotPlatformId
): Promise<{ champs: OpggSoloQChampion2026[]; error: string | null }> {
  const regional = platformToMatchRegional(platform);

  const rankedType = await collectRankedTypeMatchIds(puuid, regional, SEASON_2026_START_S);
  let allIds = rankedType.ids;
  let listError = rankedType.error;

  if (allIds.length === 0) {
    const [soloRes, flexRes] = await Promise.all([
      collectMatchIdsForQueue(puuid, regional, RANKED_SOLO_5V5, SEASON_2026_START_S),
      collectMatchIdsForQueue(puuid, regional, RANKED_FLEX_5V5, SEASON_2026_START_S),
    ]);
    allIds = interleaveMatchIds(soloRes.ids, flexRes.ids);
    listError = soloRes.error ?? flexRes.error;
  }

  if (allIds.length === 0) {
    return { champs: [], error: listError };
  }

  const byChampion = new Map<number, { k: number; d: number; a: number; w: number; n: number }>();

  let cursor = 0;
  let fetches = 0;
  while (cursor < allIds.length && fetches < MAX_MATCH_DETAIL_FETCH) {
    const room = MAX_MATCH_DETAIL_FETCH - fetches;
    const take = Math.min(MATCH_FETCH_CONCURRENCY, room, allIds.length - cursor);
    const batchIds = allIds.slice(cursor, cursor + take);
    cursor += take;
    const batch = await Promise.all(batchIds.map((id) => fetchMatchV5(id, regional)));
    fetches += batch.length;
    await sleep(MATCH_FETCH_BATCH_SLEEP_MS);

    for (const m of batch) {
      if (!m.ok) continue;
      const { info } = m.body;
      if (!RANKED_QUEUES.has(info.queueId)) continue;
      // Lista suele ir de reciente a antigua; si cuela una vieja, saltar (no `break`: no truncar cola entera).
      if (info.gameCreation < SEASON_2026_START_MS) continue;
      const p = info.participants.find((x) => x.puuid === puuid);
      if (!p || p.championId < 0) continue;
      const cur = byChampion.get(p.championId) ?? { k: 0, d: 0, a: 0, w: 0, n: 0 };
      cur.k += p.kills;
      cur.d += p.deaths;
      cur.a += p.assists;
      cur.n += 1;
      if (p.win) cur.w += 1;
      byChampion.set(p.championId, cur);
    }
  }

  const idToKey = await getDDragonChampionIdToKeyMap();

  const arr: OpggSoloQChampion2026[] = [];
  for (const [championId, s] of byChampion) {
    if (s.n < 1) continue;
    const ddragonId = idToKey.get(championId) ?? "Annie";
    const { value: kda, label: kdaLabel } = formatKdaRatio(s.k, s.d, s.a);
    const winRatePct = Math.round((s.w / s.n) * 1000) / 10;
    arr.push({
      championId,
      ddragonId,
      iconUrl: championSquareUrl(ddragonId),
      games: s.n,
      wins: s.w,
      kda,
      kdaLabel,
      winRatePct,
    });
  }
  arr.sort((a, b) => b.games - a.games || b.winRatePct - a.winRatePct);
  return { champs: arr.slice(0, OPGG_LINEUP_CHAMPIONS_TOP), error: null };
}
