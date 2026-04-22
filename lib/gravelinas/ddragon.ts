/**
 * URLs estáticas Data Dragon (CDN Riot).
 * Versión: https://ddragon.leagueoflegends.com/api/versions.json → primera entrada o env.
 * @see https://developer.riotgames.com/docs/lol#data-dragon
 */

/** Override con RIOT_DDRAGON_VERSION en .env (https://ddragon.leagueoflegends.com/api/versions.json) */
export function getDDragonVersion(): string {
  const v = process.env.RIOT_DDRAGON_VERSION?.trim();
  if (v) return v;
  return "16.8.1";
}

const CDN_BASE = "https://ddragon.leagueoflegends.com/cdn";

/**
 * Data Dragon `GET /cdn/{v}/img/tier/{TIER}.png` → **403** (Riot no publica esos PNG en el CDN).
 * Roster / tarjetas: placas aladas (proporción acorde al marco de perfil en home).
 */
const COMMUNITY_DRAGON_RANK_WINGS_PLATE =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/wings";
/** Página op.gg: emblema ancho `emblem-*.png` (solo ahí, no tocar el roster). */
const COMMUNITY_DRAGON_RANK_EMBLEM =
  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem";

const TIERS_WITH_EMBLEM = new Set([
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
]);

export function profileIconUrl(profileIconId: number): string {
  const v = getDDragonVersion();
  return `${CDN_BASE}/${v}/img/profileicon/${profileIconId}.png`;
}

/** Emblema SoloQ/Flex — mismo asset que el roster (placa alada). */
export function tierEmblemUrl(tier: string | null | undefined): string | null {
  if (!tier || tier === "NONE") return null;
  const t = tier.toUpperCase();
  if (!TIERS_WITH_EMBLEM.has(t)) return null;
  return `${COMMUNITY_DRAGON_RANK_WINGS_PLATE}/wings_${t.toLowerCase()}_plate.png`;
}

/** Solo vista op.gg: emblema ancho `emblem-{tier}.png` (más legible en columnas). */
export function tierEmblemUrlOpgg(tier: string | null | undefined): string | null {
  if (!tier || tier === "NONE") return null;
  const t = tier.toUpperCase();
  if (!TIERS_WITH_EMBLEM.has(t)) return null;
  return `${COMMUNITY_DRAGON_RANK_EMBLEM}/emblem-${t.toLowerCase()}.png`;
}

// --- Ampliar cuando lo pidas (misma base CDN + versión) ---

/** Splash: `/cdn/{v}/img/champion/splash/{Name}_{skin}.jpg` — nombre interno (champion.json). */
export function championSplashUrl(championInternalName: string, skinIndex = 0): string {
  const v = getDDragonVersion();
  return `${CDN_BASE}/${v}/img/champion/splash/${championInternalName}_${skinIndex}.jpg`;
}

/** Cuadrado de campeón: `/cdn/{v}/img/champion/{Name}.png` */
export function championSquareUrl(championInternalName: string): string {
  const v = getDDragonVersion();
  return `${CDN_BASE}/${v}/img/champion/${championInternalName}.png`;
}

/** Icono de objeto: `/cdn/{v}/img/item/{itemId}.png` */
export function itemIconUrl(itemId: number): string {
  const v = getDDragonVersion();
  return `${CDN_BASE}/${v}/img/item/${itemId}.png`;
}

/** Pasiva/hechizo de invocador: `/cdn/{v}/img/spell/{spellKey}.png` (ej. SummonerFlash) */
export function summonerSpellUrl(spellKey: string): string {
  const v = getDDragonVersion();
  return `${CDN_BASE}/${v}/img/spell/${spellKey}.png`;
}
