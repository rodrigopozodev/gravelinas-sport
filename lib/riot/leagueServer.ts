import { getRiotApiKey } from "@/lib/riotApiKey";
import { isAuthHttpStatus } from "@/lib/riot/errors";
import { riotFetch } from "@/lib/riot/riotFetch";
import { isRiotPlatform } from "@/lib/riot/platforms";

export interface LeagueEntry {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
}

const CLUSTERS = [
  "euw1",
  "eun1",
  "na1",
  "kr",
  "br1",
  "la1",
  "la2",
  "jp1",
  "oc1",
  "ru",
  "tr1",
];

export type LeagueFetchResult =
  | { ok: true; entries: LeagueEntry[]; region: string }
  | { ok: false; reason: "auth" }
  | { ok: false; reason: "not_found" };

/** Entradas de liga por PUUID. 401/403 → auth; sin shard válido → not_found. */
export async function fetchLeagueEntriesByPuuid(
  puuid: string,
  preferredCluster?: string | null
): Promise<LeagueFetchResult> {
  const key = getRiotApiKey();
  if (!key) return { ok: false, reason: "not_found" };
  const pref = preferredCluster?.toLowerCase().trim() || "";
  const order =
    pref && CLUSTERS.includes(pref) ? [pref, ...CLUSTERS.filter((c) => c !== pref)] : [...CLUSTERS];
  for (const cluster of order) {
    const url = `https://${cluster}.api.riotgames.com/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
    try {
      const res = await riotFetch(url, key);
      if (isAuthHttpStatus(res.status)) {
        return { ok: false, reason: "auth" };
      }
      if (res.ok) {
        const entriesJson: unknown = await res.json();
        if (Array.isArray(entriesJson)) {
          return { ok: true, entries: entriesJson as LeagueEntry[], region: cluster };
        }
      }
    } catch {
      // siguiente cluster
    }
  }
  return { ok: false, reason: "not_found" };
}

export function normalizeLeaguePayload(result: { entries: LeagueEntry[]; region: string }) {
  const { entries, region } = result;
  const normalized = entries
    .filter((entry: LeagueEntry) => Boolean(entry && entry.queueType))
    .map((entry: LeagueEntry) => ({
      queue: entry.queueType,
      tier: entry.tier,
      rank: entry.rank,
      leaguePoints: entry.leaguePoints,
      wins: entry.wins,
      losses: entry.losses,
    }));
  const solo = normalized.find((x) => x.queue === "RANKED_SOLO_5x5") || null;
  const flex = normalized.find((x) => x.queue === "RANKED_FLEX_SR") || null;
  return { solo, flex, entries: normalized, region };
}

export type LeagueBundle = ReturnType<typeof normalizeLeaguePayload>;

export function parsePlatformHint(platformParam: string | null): string | null {
  const platformParamTrim = platformParam?.trim() || null;
  const platformHint =
    platformParamTrim && isRiotPlatform(platformParamTrim.toLowerCase())
      ? platformParamTrim.toLowerCase()
      : null;
  return platformHint;
}
