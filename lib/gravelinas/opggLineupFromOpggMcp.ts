import "server-only";

import { getDDragonChampionIdToKeyMap } from "@/lib/gravelinas/championIdDdragon";
import { championSquareUrl, tierEmblemUrlOpgg } from "@/lib/gravelinas/ddragon";
import { upsertOpggRow } from "@/lib/gravelinas/opggCacheStore";
import {
  OPGG_LINEUP_CHAMPIONS_TOP,
  type OpggLineupRank,
  type OpggSoloQChampion2026,
} from "@/lib/gravelinas/opggLineupTypes";
import {
  opggGetSummonerProfile,
  opggRenewSummoner,
  type OpggLeagueStat,
  type OpggMostChampionEntry,
  type OpggMostChampionsBlock,
  type OpggRawSummonerProfile,
  type OpggTierInfo,
} from "@/lib/opggMcp/summoner";

type LineRow = { pos: string; display: string; riotId: string };

export type OpggMcpPlayerLog = {
  riotId: string;
  step: "ok" | "renew-error" | "profile-error" | "parse-empty";
  message?: string;
  millis: number;
};

function splitRiotId(riotId: string): { gameName: string; tagLine: string } {
  const i = riotId.lastIndexOf("#");
  if (i <= 0) return { gameName: riotId.trim(), tagLine: "" };
  return { gameName: riotId.slice(0, i).trim(), tagLine: riotId.slice(i + 1).trim() };
}

function formatRankLine(
  tier: string | null | undefined,
  division: number | null | undefined,
  lp: number | null | undefined
): string {
  if (!tier) return "—";
  const up = tier.toUpperCase();
  if (up === "NONE" || up === "UNRANKED") return "Unranked";
  const lpN = typeof lp === "number" ? lp : 0;
  if (up === "CHALLENGER" || up === "GRANDMASTER" || up === "MASTER") {
    return `${up} · ${lpN} LP`;
  }
  const divRoman = ["", "I", "II", "III", "IV"];
  const divN = typeof division === "number" && division >= 1 && division <= 4 ? divRoman[division] : "";
  return divN ? `${up} ${divN} · ${lpN} LP` : `${up} · ${lpN} LP`;
}

function kdaLabelFrom(k: number, d: number, a: number): { value: number; label: string } {
  if (d <= 0) {
    if (k + a === 0) return { value: 0, label: "0.00:1" };
    return { value: 99, label: "Perfect KDA" };
  }
  const v = (k + a) / d;
  return { value: v, label: `${v.toFixed(2)}:1` };
}

function pickSoloLeagueStat(leagueStats: OpggLeagueStat[] | null | undefined): OpggLeagueStat | null {
  if (!Array.isArray(leagueStats)) return null;
  for (const s of leagueStats) {
    const gt = ((s.game_type ?? s.queue_info?.game_type ?? "") + "").toUpperCase();
    // op.gg usa "SOLORANKED"; Match-V5 / otros dialects pueden usar "RANKED_SOLO_5x5".
    if (gt === "SOLORANKED" || gt.includes("SOLO")) return s;
  }
  return null;
}

function normalizeMostChampions(
  mc: OpggMostChampionsBlock | OpggMostChampionEntry[] | null | undefined
): OpggMostChampionEntry[] {
  if (!mc) return [];
  if (Array.isArray(mc)) return mc;
  if (Array.isArray(mc.champion_stats)) return mc.champion_stats;
  if (Array.isArray(mc.data)) return mc.data;
  return [];
}

function mapChampions(
  entries: OpggMostChampionEntry[],
  idToKey: Map<number, string>
): OpggSoloQChampion2026[] {
  const out: OpggSoloQChampion2026[] = [];
  for (const c of entries) {
    const games = typeof c.play === "number" ? c.play : 0;
    if (games <= 0) continue;
    const wins = typeof c.win === "number" ? c.win : 0;
    const k = typeof c.kill === "number" ? c.kill : 0;
    const d = typeof c.death === "number" ? c.death : 0;
    const a = typeof c.assist === "number" ? c.assist : 0;
    const { value: kda, label: kdaLabel } = kdaLabelFrom(k, d, a);
    const wrPct = games > 0 ? Math.round((wins / games) * 1000) / 10 : 0;
    const championId = typeof c.id === "number" ? c.id : 0;
    const fromMap = idToKey.get(championId);
    const fromName = (c.champion_name ?? c.name ?? "").trim();
    // op.gg devuelve `champion_name` en formato DDragon ("LeBlanc", "Syndra"), válido como id.
    const ddragonId = fromMap ?? (fromName.length > 0 ? fromName : "");
    const iconUrl = ddragonId ? championSquareUrl(ddragonId) : "";
    out.push({
      championId,
      ddragonId,
      iconUrl,
      games,
      wins,
      kda,
      kdaLabel,
      winRatePct: wrPct,
    });
  }
  out.sort((a, b) => b.games - a.games || b.winRatePct - a.winRatePct);
  return out.slice(0, OPGG_LINEUP_CHAMPIONS_TOP);
}

function tierEmblemFrom(tier: OpggTierInfo | null | undefined): string | null {
  const t = tier?.tier ?? null;
  if (!t) return null;
  return tierEmblemUrlOpgg(t);
}

async function processPlayer(
  row: LineRow,
  idToKey: Map<number, string>,
  renewFirst: boolean
): Promise<{ rank: OpggLineupRank; log: OpggMcpPlayerLog }> {
  const start = Date.now();
  const { gameName, tagLine } = splitRiotId(row.riotId);
  const now = start;

  if (!tagLine) {
    const rank: OpggLineupRank = {
      ...row,
      rankText: "—",
      tierEmblemUrl: null,
      error: "RiotID inválido",
      soloWins: null,
      soloLosses: null,
      champions2026: [],
      champions2026Error: null,
    };
    upsertOpggRow(rank, now);
    return {
      rank,
      log: { riotId: row.riotId, step: "parse-empty", message: "riotId sin '#'", millis: 0 },
    };
  }

  // Nota: el MCP oficial op.gg **no** expone tool de renewal; `opggGetSummonerProfile` ya
  // dispara el refresco interno (ver `renewable_at` en payload). Parámetro mantenido por API.
  void renewFirst;

  let profile: OpggRawSummonerProfile;
  try {
    profile = await opggGetSummonerProfile(gameName, tagLine, "EUW");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "profile error";
    const rank: OpggLineupRank = {
      ...row,
      rankText: "—",
      tierEmblemUrl: null,
      error: msg,
      soloWins: null,
      soloLosses: null,
      champions2026: [],
      champions2026Error: msg,
    };
    upsertOpggRow(rank, now);
    return {
      rank,
      log: { riotId: row.riotId, step: "profile-error", message: msg, millis: Date.now() - start },
    };
  }

  const summoner = profile?.data?.summoner ?? null;
  const solo = pickSoloLeagueStat(summoner?.league_stats ?? null);
  const soloTier = solo?.tier_info ?? summoner?.solo_tier_info ?? null;
  const rankText = formatRankLine(soloTier?.tier, soloTier?.division, soloTier?.lp);
  const tierEmblemUrl = tierEmblemFrom(soloTier);

  const mcEntries = normalizeMostChampions(summoner?.most_champions ?? null);
  const champions2026 = mapChampions(mcEntries, idToKey);
  const champsEmpty = mcEntries.length === 0;

  const rank: OpggLineupRank = {
    ...row,
    rankText,
    tierEmblemUrl,
    error: summoner ? null : "Sin datos en op.gg",
    soloWins: typeof solo?.win === "number" ? solo.win : null,
    soloLosses: typeof solo?.lose === "number" ? solo.lose : null,
    champions2026,
    champions2026Error: champsEmpty ? "Sin most_champions en op.gg" : null,
  };
  upsertOpggRow(rank, now);

  return {
    rank,
    log: {
      riotId: row.riotId,
      step: champsEmpty ? "parse-empty" : "ok",
      millis: Date.now() - start,
    },
  };
}

/**
 * Recorre el lineup **jugador a jugador** (pool=1, sin prisa) vía MCP op.gg y persiste en cache.
 * Ventaja: datos idénticos a lo que ve el usuario en la web de op.gg (mismo backend).
 */
export async function refreshOpggLineupFromOpggMcpSequential(
  lineup: readonly LineRow[],
  options: { renewFirst?: boolean } = {}
): Promise<{ rows: OpggLineupRank[]; logs: OpggMcpPlayerLog[] }> {
  const { renewFirst = true } = options;
  const idToKey = await getDDragonChampionIdToKeyMap();

  const rows: OpggLineupRank[] = [];
  const logs: OpggMcpPlayerLog[] = [];

  for (const row of lineup) {
    const { rank, log } = await processPlayer(row, idToKey, renewFirst);
    rows.push(rank);
    logs.push(log);
  }

  return { rows, logs };
}
