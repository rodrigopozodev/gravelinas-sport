import { getRiotApiKey } from "@/lib/riotApiKey";
import { riotFetch } from "@/lib/riot/riotFetch";
import { isRiotPlatform, type RiotPlatformId } from "@/lib/riot/platforms";

export const RIOT_CLUSTERS = [
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
] as const;

const ACCOUNT_GROUPS = ["europe", "americas", "asia"];

export type RiotAccountJson = {
  puuid?: string;
  gameName?: string;
  tagLine?: string;
};

export type ResolvedAccountBody = {
  puuid: string;
  gameName: string;
  tagLine: string;
  name: string | null;
  summonerLevel: number | null;
  profileIconId: number | null;
  region: string | null;
};

export async function fetchAccountByRiotId(
  gameName: string,
  tagLine: string
): Promise<
  { ok: true; status: number; json: RiotAccountJson } | { ok: false; status: number; json: null }
> {
  const key = getRiotApiKey() || "";
  let lastStatus = 404;
  for (const group of ACCOUNT_GROUPS) {
    const url = `https://${group}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
    try {
      const res = await riotFetch(url, key);
      if (res.ok) {
        const json = (await res.json()) as RiotAccountJson;
        return { ok: true, status: res.status, json };
      }
      if (res.status === 403) {
        return { ok: false, status: 403, json: null };
      }
      lastStatus = res.status;
    } catch {
      // siguiente grupo
    }
  }
  return { ok: false, status: lastStatus, json: null };
}

export async function fetchAccountByPuuid(puuid: string): Promise<RiotAccountJson | null> {
  const key = getRiotApiKey() || "";
  for (const group of ACCOUNT_GROUPS) {
    const url = `https://${group}.api.riotgames.com/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`;
    try {
      const res = await riotFetch(url, key);
      if (res.ok) {
        return (await res.json()) as RiotAccountJson;
      }
      if (res.status === 403) {
        throw new Error("RIOT_TOKEN_INVALID");
      }
    } catch {
      // siguiente
    }
  }
  return null;
}

export async function findPuuidBySummonerName(
  name: string,
  preferredCluster?: string | null
): Promise<string | null> {
  const key = getRiotApiKey();
  if (!key) return null;
  const pref = preferredCluster?.toLowerCase().trim() || "";
  const clusters = RIOT_CLUSTERS as readonly string[];
  const order =
    pref && clusters.includes(pref) ? [pref, ...clusters.filter((c) => c !== pref)] : [...clusters];
  for (const cluster of order) {
    const url = `https://${cluster}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`;
    try {
      const res = await riotFetch(url, key);
      if (res.ok) {
        const json = await res.json();
        const puuid = json?.puuid as string | undefined;
        if (puuid) return puuid;
      }
    } catch {
      // continuar
    }
  }
  return null;
}

export async function fetchSummonerByPuuid(puuid: string, preferredCluster?: string | null) {
  const key = getRiotApiKey();
  if (!key) return null;
  const pref = preferredCluster?.toLowerCase().trim() || "";
  const clusters = RIOT_CLUSTERS as readonly string[];
  const order =
    pref && clusters.includes(pref) ? [pref, ...clusters.filter((c) => c !== pref)] : [...clusters];
  for (const cluster of order) {
    const url = `https://${cluster}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
    try {
      const res = await riotFetch(url, key);
      if (res.ok) {
        const json = await res.json();
        return { ...json, region: cluster };
      }
    } catch {
      // continuar
    }
  }
  return null;
}

function normalizePlatformHint(platformParam: string | null): RiotPlatformId | null {
  const p = platformParam?.trim().toLowerCase() || "";
  return p && isRiotPlatform(p) ? p : null;
}

export async function resolveAccountByRiotId(
  gameName: string,
  tagLine: string,
  platformParam: string | null
): Promise<{ ok: true; body: ResolvedAccountBody } | { ok: false; status: number; error?: string }> {
  const platformHint = normalizePlatformHint(platformParam);

  const accountRes = await fetchAccountByRiotId(gameName, tagLine);
  let puuid: string | null = null;
  let acctJson: RiotAccountJson | null = null;

  if (accountRes.ok && accountRes.json?.puuid) {
    puuid = accountRes.json.puuid;
    acctJson = accountRes.json;
  } else if (accountRes.status === 404) {
    puuid = await findPuuidBySummonerName(gameName, platformHint);
    if (puuid) {
      acctJson = await fetchAccountByPuuid(puuid);
    }
  } else if (accountRes.status === 403) {
    return { ok: false, status: 502, error: "Riot API: token inválido o caducado" };
  }

  if (!puuid) {
    return { ok: false, status: 404, error: "Cuenta no encontrada" };
  }

  const summoner = await fetchSummonerByPuuid(puuid, platformHint);

  return {
    ok: true,
    body: {
      puuid,
      gameName: acctJson?.gameName ?? gameName,
      tagLine: acctJson?.tagLine ?? tagLine,
      name: summoner?.name ?? null,
      summonerLevel: summoner?.summonerLevel ?? null,
      profileIconId: summoner?.profileIconId ?? null,
      region: summoner?.region ?? null,
    },
  };
}
