import "server-only";

import { RIOT_AUTH_ERROR_CODE, RIOT_AUTH_MESSAGE } from "@/lib/riot/errors";
import { getRiotApiKey } from "@/lib/riotApiKey";
import { resolveAccountByRiotId } from "@/lib/riot/accountLookupServer";
import {
  fetchLeagueEntriesByPuuid,
  normalizeLeaguePayload,
  parsePlatformHint,
} from "@/lib/riot/leagueServer";
import { readTeamConfig, syncTeamMembersToDb, type TeamMemberInput } from "@/lib/gravelinas/teamConfig";
import { profileIconUrl, tierEmblemUrl } from "@/lib/gravelinas/ddragon";
import {
  getPlayerRiot,
  updatePlayerRiotRankOnly,
  upsertPlayerRiotFull,
  type PlayerRiotRow,
} from "@/lib/gravelinas/playerStore";
import type { TeamMemberResult, TeamSnapshot } from "@/lib/gravelinas/teamTypes";

export type { TeamMemberResult } from "@/lib/gravelinas/teamTypes";

const FULL_SYNC_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;
// La liga/LP cambia a menudo → refresco corto para mantener Top/Support “al día”.
const RANK_SYNC_INTERVAL_MS = 12 * 60 * 1000;

function needsFullSync(row: PlayerRiotRow | null): boolean {
  if (!row?.puuid) return true;
  if (row.last_full_sync_at == null) return true;
  return Date.now() - row.last_full_sync_at > FULL_SYNC_INTERVAL_MS;
}

function needsRankSync(row: PlayerRiotRow | null): boolean {
  if (!row?.puuid) return true;
  if (row.last_rank_sync_at == null) return true;
  return Date.now() - row.last_rank_sync_at > RANK_SYNC_INTERVAL_MS;
}

function soloFromDb(row: PlayerRiotRow | null): TeamMemberResult["solo"] {
  if (!row?.solo_tier || row.solo_tier === "NONE") return null;
  return {
    tier: row.solo_tier,
    rank: row.solo_rank ?? "",
    leaguePoints: row.solo_lp ?? 0,
    wins: row.solo_wins ?? 0,
    losses: row.solo_losses ?? 0,
  };
}

function pendingTeamMemberResult(m: TeamMemberInput): TeamMemberResult {
  return {
    slot: m.slot,
    label: m.label ?? null,
    platform: m.platform,
    pending: true,
    riotId: "",
    puuid: null,
    summonerName: null,
    profileIconId: null,
    profileIconUrl: null,
    soloTierEmblemUrl: null,
    solo: null,
    lastFullSyncAt: null,
    lastRankSyncAt: null,
  };
}

function rowToMember(m: TeamMemberInput, row: PlayerRiotRow | null, rowError?: string): TeamMemberResult {
  const riotId = `${m.gameName}#${m.tagLine}`;
  const solo = soloFromDb(row);
  const tierForImg = solo?.tier ?? row?.solo_tier;
  return {
    slot: m.slot,
    label: m.label ?? null,
    platform: m.platform,
    riotId,
    puuid: row?.puuid ?? null,
    summonerName: row?.summoner_name ?? null,
    profileIconId: row?.profile_icon_id ?? null,
    profileIconUrl:
      row?.profile_icon_id != null && row.profile_icon_id >= 0
        ? profileIconUrl(row.profile_icon_id)
        : null,
    soloTierEmblemUrl: tierEmblemUrl(tierForImg),
    solo,
    lastFullSyncAt: row?.last_full_sync_at ?? null,
    lastRankSyncAt: row?.last_rank_sync_at ?? null,
    rowError,
  };
}

async function syncLeagueToSoloFields(
  puuid: string,
  platform: string
): Promise<
  | { ok: true; solo: ReturnType<typeof normalizeLeaguePayload>["solo"] }
  | { ok: false; auth: true }
  | { ok: false; auth: false }
> {
  const hint = parsePlatformHint(platform);
  const leagueRes = await fetchLeagueEntriesByPuuid(puuid, hint);
  if (!leagueRes.ok) {
    if (leagueRes.reason === "auth") return { ok: false, auth: true };
    return { ok: false, auth: false };
  }
  const bundle = normalizeLeaguePayload(leagueRes);
  return { ok: true, solo: bundle.solo };
}

/** Resolución cuenta + summoner + liga SoloQ → BD. */
async function fullSyncMember(m: TeamMemberInput): Promise<"ok" | "auth" | "not_found"> {
  const resolved = await resolveAccountByRiotId(m.gameName, m.tagLine, m.platform);
  if (!resolved.ok) {
    if (resolved.status === 502 || (resolved.error?.includes("token") ?? false)) {
      return "auth";
    }
    return "not_found";
  }
  const body = resolved.body;
  const league = await syncLeagueToSoloFields(body.puuid, m.platform);
  if (!league.ok && league.auth) return "auth";

  const solo = league.ok ? league.solo : null;
  const now = Date.now();
  upsertPlayerRiotFull(m.slot, {
    puuid: body.puuid,
    summoner_name: body.name,
    profile_icon_id: body.profileIconId,
    solo_tier: solo?.tier ?? null,
    solo_rank: solo?.rank ?? null,
    solo_lp: solo?.leaguePoints ?? null,
    solo_wins: solo?.wins ?? null,
    solo_losses: solo?.losses ?? null,
    last_full_sync_at: now,
  });
  return "ok";
}

/** Solo liga: victorias, derrotas, rango SoloQ. */
async function rankOnlyMember(m: TeamMemberInput, row: PlayerRiotRow): Promise<"ok" | "auth" | "need_full"> {
  if (!row.puuid) return "need_full";
  const league = await syncLeagueToSoloFields(row.puuid, m.platform);
  if (!league.ok) {
    if (league.auth) return "auth";
    return "need_full";
  }
  const solo = league.solo;
  updatePlayerRiotRankOnly(m.slot, {
    solo_tier: solo?.tier ?? null,
    solo_rank: solo?.rank ?? null,
    solo_lp: solo?.leaguePoints ?? null,
    solo_wins: solo?.wins ?? null,
    solo_losses: solo?.losses ?? null,
    last_rank_sync_at: Date.now(),
  });
  return "ok";
}

export type TeamSnapshotOptions = { trigger: "page" | "manual" };

export async function getTeamSnapshot(options: TeamSnapshotOptions): Promise<TeamSnapshot> {
  if (!getRiotApiKey()) {
    return {
      ok: false,
      error: "RIOT_API_KEY no configurada",
      errorCode: undefined,
      members: [],
    };
  }

  let membersConfig: TeamMemberInput[];
  try {
    membersConfig = readTeamConfig();
    syncTeamMembersToDb(membersConfig);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error leyendo team.json";
    return { ok: false, error: message, members: [] };
  }

  const sorted = [...membersConfig].sort((a, b) => a.slot - b.slot);

  if (options.trigger === "manual") {
    const members: TeamMemberResult[] = [];
    for (const m of sorted) {
      if (m.pending) {
        members.push(pendingTeamMemberResult(m));
        continue;
      }
      const rowBefore = getPlayerRiot(m.slot);
      if (!rowBefore?.puuid) {
        const fr = await fullSyncMember(m);
        if (fr === "auth") {
          return {
            ok: false,
            error: RIOT_AUTH_MESSAGE,
            errorCode: RIOT_AUTH_ERROR_CODE,
            members: [],
          };
        }
        if (fr === "not_found") {
          members.push(rowToMember(m, getPlayerRiot(m.slot), "Cuenta no encontrada"));
          continue;
        }
      } else {
        const rr = await rankOnlyMember(m, rowBefore);
        if (rr === "auth") {
          return {
            ok: false,
            error: RIOT_AUTH_MESSAGE,
            errorCode: RIOT_AUTH_ERROR_CODE,
            members: [],
          };
        }
        if (rr === "need_full") {
          const fr = await fullSyncMember(m);
          if (fr === "auth") {
            return {
              ok: false,
              error: RIOT_AUTH_MESSAGE,
              errorCode: RIOT_AUTH_ERROR_CODE,
              members: [],
            };
          }
        }
      }
      members.push(rowToMember(m, getPlayerRiot(m.slot)));
    }
    return { ok: true, members };
  }

  const members: TeamMemberResult[] = [];
  for (const m of sorted) {
    if (m.pending) {
      members.push(pendingTeamMemberResult(m));
      continue;
    }
    let row = getPlayerRiot(m.slot);
    if (needsFullSync(row)) {
      const fr = await fullSyncMember(m);
      if (fr === "auth") {
        return {
          ok: false,
          error: RIOT_AUTH_MESSAGE,
          errorCode: RIOT_AUTH_ERROR_CODE,
          members: [],
        };
      }
      if (fr === "not_found") {
        members.push(rowToMember(m, getPlayerRiot(m.slot), "Cuenta no encontrada"));
        continue;
      }
    } else if (needsRankSync(row)) {
      const rr = await rankOnlyMember(m, row as PlayerRiotRow);
      if (rr === "auth") {
        return {
          ok: false,
          error: RIOT_AUTH_MESSAGE,
          errorCode: RIOT_AUTH_ERROR_CODE,
          members: [],
        };
      }
      if (rr === "need_full") {
        const fr = await fullSyncMember(m);
        if (fr === "auth") {
          return {
            ok: false,
            error: RIOT_AUTH_MESSAGE,
            errorCode: RIOT_AUTH_ERROR_CODE,
            members: [],
          };
        }
        if (fr === "not_found") {
          members.push(rowToMember(m, getPlayerRiot(m.slot), "Cuenta no encontrada"));
          continue;
        }
      }
    }
    row = getPlayerRiot(m.slot);
    members.push(rowToMember(m, row));
  }

  return { ok: true, members };
}
