import "server-only";

import { fetchSoloQ2026ChampionTopN } from "@/lib/gravelinas/opggSoloQChampions2026";
import type { OpggChampionsPatch, OpggLineupRank } from "@/lib/gravelinas/opggLineupTypes";
export type { OpggChampionsPatch, OpggLineupRank, OpggSoloQChampion2026 } from "@/lib/gravelinas/opggLineupTypes";
import { tierEmblemUrlOpgg } from "@/lib/gravelinas/ddragon";
import { getOpggCachedRow, upsertOpggRow } from "@/lib/gravelinas/opggCacheStore";
import { getRiotApiKey } from "@/lib/riotApiKey";
import { resolveAccountByRiotId } from "@/lib/riot/accountLookupServer";
import {
  fetchLeagueEntriesByPuuid,
  normalizeLeaguePayload,
  type LeagueFetchResult,
} from "@/lib/riot/leagueServer";
import type { RiotPlatformId } from "@/lib/riot/platforms";

const EUW: RiotPlatformId = "euw1";
const BUDGE_MS = 150;
/** Cuenta simultánea (Riot: evitar 429; 2 suele ser seguro con match-v5 en paralelo). */
const OPGG_LINEUP_CONCURRENCY = 2;

function splitRiotId(riotId: string): { gameName: string; tagLine: string } {
  const i = riotId.lastIndexOf("#");
  if (i <= 0) return { gameName: riotId.trim(), tagLine: "" };
  return { gameName: riotId.slice(0, i).trim(), tagLine: riotId.slice(i + 1).trim() };
}

function formatSoloRankLine(
  tier: string | null | undefined,
  rank: string | null | undefined,
  lp: number | null | undefined
) {
  if (!tier || tier === "NONE") return "Unranked";
  if (tier === "CHALLENGER" || tier === "GRANDMASTER" || tier === "MASTER") {
    return `${tier} · ${lp ?? 0} LP`;
  }
  return `${tier} ${rank ?? ""} · ${lp ?? 0} LP`.replace(/\s+/g, " ").trim();
}

type LineRow = { pos: string; display: string; riotId: string };

async function mapPool<T, R>(items: readonly T[], poolSize: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const n = items.length;
  if (n === 0) return [];
  const out: R[] = new Array(n);
  let cursor = 0;
  const workers = Math.min(Math.max(1, poolSize), n);
  const run = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= n) return;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: workers }, run));
  return out;
}

function rankFromLeague(league: LeagueFetchResult): {
  rankText: string;
  rankError: string | null;
  tierEmblemUrl: string | null;
  soloWins: number | null;
  soloLosses: number | null;
} {
  if (!league.ok) {
    return { rankText: "—", rankError: "Liga no disponible", tierEmblemUrl: null, soloWins: null, soloLosses: null };
  }
  const bundle = normalizeLeaguePayload({ entries: league.entries, region: league.region });
  const solo = bundle.solo;
  if (!solo) {
    return { rankText: "Unranked", rankError: null, tierEmblemUrl: null, soloWins: null, soloLosses: null };
  }
  const w = solo.wins;
  const lo = solo.losses;
  return {
    rankText: formatSoloRankLine(solo.tier, solo.rank, solo.leaguePoints),
    rankError: null,
    tierEmblemUrl: tierEmblemUrlOpgg(solo.tier),
    soloWins: typeof w === "number" ? w : null,
    soloLosses: typeof lo === "number" ? lo : null,
  };
}

/** Rango: resolve + liga (rápido). Persistencia rangos → `refreshOpggLineupRanksOnlyToCache` / `POST /api/opgg/duo`. */
async function fetchOpggLineupRow(row: LineRow): Promise<OpggLineupRank> {
  const { gameName, tagLine } = splitRiotId(row.riotId);
  if (!tagLine) {
    return {
      ...row,
      rankText: "—",
      tierEmblemUrl: null,
      error: "RiotID inválido",
      soloWins: null,
      soloLosses: null,
      champions2026: [],
      champions2026Error: null,
    };
  }

  const acc = await resolveAccountByRiotId(gameName, tagLine, EUW);
  if (!acc.ok) {
    await new Promise((r) => setTimeout(r, BUDGE_MS));
    return {
      ...row,
      rankText: "—",
      tierEmblemUrl: null,
      error: acc.error ?? `Cuenta no encontrada (${acc.status})`,
      soloWins: null,
      soloLosses: null,
      champions2026: [],
      champions2026Error: null,
    };
  }

  const puuid = acc.body.puuid;
  const league = await fetchLeagueEntriesByPuuid(puuid, EUW);
  const rk = rankFromLeague(league);

  return {
    ...row,
    rankText: rk.rankText,
    tierEmblemUrl: rk.tierEmblemUrl,
    error: rk.rankError,
    soloWins: rk.soloWins,
    soloLosses: rk.soloLosses,
    champions2026: [],
    champions2026Error: null,
  };
}

/** Match-V5: solo puuid → campeones 2026 (lento; usar desde route handler, no en el primer render de página). */
export async function fetchOpggChampionsForLineup(lineup: readonly LineRow[]): Promise<OpggChampionsPatch[]> {
  if (!getRiotApiKey()) {
    return lineup.map((l) => ({
      riotId: l.riotId,
      champions2026: [],
      champions2026Error: "Sin RIOT_API_KEY",
    }));
  }

  const one = async (row: LineRow): Promise<OpggChampionsPatch> => {
    const { gameName, tagLine } = splitRiotId(row.riotId);
    if (!tagLine) {
      return { riotId: row.riotId, champions2026: [], champions2026Error: null };
    }
    const acc = await resolveAccountByRiotId(gameName, tagLine, EUW);
    if (!acc.ok) {
      await new Promise((r) => setTimeout(r, BUDGE_MS));
      return { riotId: row.riotId, champions2026: [], champions2026Error: null };
    }
    const solo = await fetchSoloQ2026ChampionTopN(acc.body.puuid, EUW);
    return {
      riotId: row.riotId,
      champions2026: solo.champs,
      champions2026Error: solo.error,
    };
  };

  return mapPool([...lineup], OPGG_LINEUP_CONCURRENCY, (row) => one(row));
}

export async function fetchOpggLineupRanks(lineup: readonly LineRow[]): Promise<OpggLineupRank[]> {
  if (!getRiotApiKey()) {
    return lineup.map((l) => ({
      ...l,
      rankText: "—",
      tierEmblemUrl: null,
      error: "Sin RIOT_API_KEY",
      soloWins: null,
      soloLosses: null,
      champions2026: [],
      champions2026Error: null,
    }));
  }

  return mapPool([...lineup], OPGG_LINEUP_CONCURRENCY, (row) => fetchOpggLineupRow(row));
}

/**
 * Solo SoloQ (Account + League-V4): segundos típ. con `OPGG_LINEUP_CONCURRENCY`.
 * Campeones en BD se conservan. Emblema SoloQ → `tierEmblemUrlOpgg` (solo vista op.gg).
 */
export async function refreshOpggLineupRanksOnlyToCache(lineup: readonly LineRow[]): Promise<OpggLineupRank[]> {
  if (!getRiotApiKey()) {
    return lineup.map((l) => ({
      ...l,
      rankText: "—",
      tierEmblemUrl: null,
      error: "Sin RIOT_API_KEY",
      soloWins: null,
      soloLosses: null,
      champions2026: [],
      champions2026Error: null,
    }));
  }

  const now = Date.now();
  const one = async (row: LineRow): Promise<OpggLineupRank> => {
    const existing = getOpggCachedRow(row.riotId);
    const carryChamps = (): Pick<OpggLineupRank, "champions2026" | "champions2026Error"> => ({
      champions2026: existing?.champions2026 ?? [],
      champions2026Error: existing?.champions2026Error ?? null,
    });

    const { gameName, tagLine } = splitRiotId(row.riotId);
    if (!tagLine) {
      const r: OpggLineupRank = {
        ...row,
        rankText: "—",
        tierEmblemUrl: null,
        error: "RiotID inválido",
        soloWins: null,
        soloLosses: null,
        ...carryChamps(),
      };
      upsertOpggRow(r, now);
      return r;
    }
    const acc = await resolveAccountByRiotId(gameName, tagLine, EUW);
    if (!acc.ok) {
      await new Promise((r) => setTimeout(r, BUDGE_MS));
      const r: OpggLineupRank = {
        ...row,
        rankText: "—",
        tierEmblemUrl: null,
        error: acc.error ?? `Cuenta no encontrada (${acc.status})`,
        soloWins: null,
        soloLosses: null,
        ...carryChamps(),
      };
      upsertOpggRow(r, now);
      return r;
    }
    const league = await fetchLeagueEntriesByPuuid(acc.body.puuid, EUW);
    const rk = rankFromLeague(league);
    const r: OpggLineupRank = {
      ...row,
      rankText: rk.rankText,
      tierEmblemUrl: rk.tierEmblemUrl,
      error: rk.rankError,
      soloWins: rk.soloWins,
      soloLosses: rk.soloLosses,
      ...carryChamps(),
    };
    upsertOpggRow(r, now);
    return r;
  };

  return mapPool([...lineup], OPGG_LINEUP_CONCURRENCY, (row) => one(row));
}

/** Match-V5 lento → `POST /api/opgg/champs`. Conserva rango/error ya cacheados. */
export async function refreshOpggLineupChampsToCache(lineup: readonly LineRow[]): Promise<OpggLineupRank[]> {
  if (!getRiotApiKey()) {
    return lineup.map((l) => {
      const ex = getOpggCachedRow(l.riotId);
      return {
        ...l,
        rankText: ex?.rankText ?? "—",
        tierEmblemUrl: null,
        error: ex?.error ?? "Sin RIOT_API_KEY",
        soloWins: ex?.soloWins ?? null,
        soloLosses: ex?.soloLosses ?? null,
        champions2026: [],
        champions2026Error: "Sin RIOT_API_KEY",
      };
    });
  }

  const patches = await fetchOpggChampionsForLineup(lineup);
  const byRiot = new Map(patches.map((p) => [p.riotId, p]));
  const now = Date.now();

  const one = async (row: LineRow): Promise<OpggLineupRank> => {
    const existing = getOpggCachedRow(row.riotId);
    const patch = byRiot.get(row.riotId);
    const r: OpggLineupRank = {
      ...row,
      rankText: existing?.rankText ?? "—",
      tierEmblemUrl: existing?.tierEmblemUrl ?? null,
      error: existing?.error ?? null,
      soloWins: existing?.soloWins ?? null,
      soloLosses: existing?.soloLosses ?? null,
      champions2026: patch?.champions2026 ?? [],
      champions2026Error: patch?.champions2026Error ?? null,
    };
    upsertOpggRow(r, now);
    return r;
  };

  return mapPool([...lineup], OPGG_LINEUP_CONCURRENCY, (row) => one(row));
}
