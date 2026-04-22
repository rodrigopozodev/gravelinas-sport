import "server-only";

import { callOpggMcpTool } from "@/lib/opggMcp/client";

/** Regiones soportadas por el MCP op.gg (según esquema). */
export type OpggSummonerRegion =
  | "KR"
  | "EUW"
  | "NA"
  | "EUNE"
  | "BR"
  | "LAN"
  | "LAS"
  | "OCE"
  | "RU"
  | "TR"
  | "JP"
  | "PH"
  | "SG"
  | "TH"
  | "TW"
  | "VN"
  | "ME"
  | "SEA";

/**
 * No-op de compatibilidad: el MCP oficial (`https://mcp-api.op.gg/mcp`) **no expone** una tool
 * de "renewal" — `lol_get_summoner_profile` dispara el refresco interno de op.gg al leer
 * (campos `renewable_at` / `updated_at` en el payload). Mantengo la función por estabilidad del
 * import pero no llama nada.
 */
export async function opggRenewSummoner(
  _gameName: string,
  _tagLine: string,
  _region: OpggSummonerRegion = "EUW"
): Promise<null> {
  void _gameName;
  void _tagLine;
  void _region;
  return null;
}

/** Respuesta “best effort” de `lol_get_summoner_profile` (campos opcionales por si op.gg cambia). */
export interface OpggTierInfo {
  tier?: string | null;
  division?: number | null;
  lp?: number | null;
  level?: number | null;
  tier_image_url?: string | null;
  border_image_url?: string | null;
}

export interface OpggLeagueStat {
  queue_info?: { id?: number; game_type?: string } | null;
  game_type?: string | null;
  tier_info?: OpggTierInfo | null;
  win?: number | null;
  lose?: number | null;
}

export interface OpggMostChampionEntry {
  id?: number;
  /** En el payload real es `champion_name` (no `name`). Dejo ambos por compatibilidad. */
  champion_name?: string;
  name?: string;
  play?: number;
  win?: number;
  lose?: number;
  kill?: number;
  death?: number;
  assist?: number;
}

export interface OpggMostChampionsBlock {
  year?: number | null;
  season_id?: number | null;
  game_type?: string | null;
  play?: number | null;
  win?: number | null;
  lose?: number | null;
  /** Campo real en el payload op.gg. `data` solo como alias legacy. */
  champion_stats?: OpggMostChampionEntry[] | null;
  data?: OpggMostChampionEntry[] | null;
}

export interface OpggSummonerPayload {
  game_name?: string | null;
  tagline?: string | null;
  level?: number | null;
  profile_image_url?: string | null;
  solo_tier_info?: OpggTierInfo | null;
  league_stats?: OpggLeagueStat[] | null;
  most_champions?: OpggMostChampionsBlock | OpggMostChampionEntry[] | null;
}

export interface OpggRawSummonerProfile {
  data?: {
    summoner?: OpggSummonerPayload | null;
  } | null;
}

/**
 * Campos por defecto: rank SoloQ + champion pool. El MCP op.gg exige `desired_output_fields`
 * (pedir el `data` completo suele saturar tokens y tirar errores). Lista conservadora.
 */
/**
 * Paths alineados con la estructura real del MCP op.gg (ver debug payload):
 * - `league_stats[]` → `game_type` ("SOLORANKED"/"FLEXRANKED"/"ARENA") + `tier_info` + `win`/`lose`.
 * - `most_champions.champion_stats[]` → lista S2026 de "most played". `play`/`win`/`lose`/`kill`/`death`/`assist`/`champion_name`.
 */
export const OPGG_DEFAULT_PROFILE_FIELDS: readonly string[] = [
  "data.summoner.{game_name,tagline,level,profile_image_url}",
  "data.summoner.league_stats[].{game_type,win,lose}",
  "data.summoner.league_stats[].tier_info.{tier,division,lp,tier_image_url,border_image_url}",
  "data.summoner.most_champions.{year,season_id,game_type,play,win,lose}",
  "data.summoner.most_champions.champion_stats[].{id,champion_name,play,win,lose,kill,death,assist}",
];

/**
 * Perfil op.gg. Sin `desiredFields` usa {@link OPGG_DEFAULT_PROFILE_FIELDS} (rank + champ pool).
 */
export async function opggGetSummonerProfile(
  gameName: string,
  tagLine: string,
  region: OpggSummonerRegion = "EUW",
  desiredFields?: readonly string[]
): Promise<OpggRawSummonerProfile> {
  const fields = desiredFields && desiredFields.length > 0 ? desiredFields : OPGG_DEFAULT_PROFILE_FIELDS;
  return callOpggMcpTool<OpggRawSummonerProfile>("lol_get_summoner_profile", {
    game_name: gameName,
    tag_line: tagLine,
    region,
    desired_output_fields: [...fields],
  });
}

/** Perfil op.gg **sin** filtro de campos — útil para descubrir la estructura real del payload. */
export async function opggGetSummonerProfileRaw(
  gameName: string,
  tagLine: string,
  region: OpggSummonerRegion = "EUW"
): Promise<unknown> {
  return callOpggMcpTool<unknown>("lol_get_summoner_profile", {
    game_name: gameName,
    tag_line: tagLine,
    region,
  });
}
