import type { RiotPlatformId } from "@/lib/riot/platforms";

/** Ruta regional Match-V5 (no el cluster clásico; ME incluido en EU). */
const EUROPE: readonly RiotPlatformId[] = ["euw1", "eun1", "tr1", "ru"] as const;
const ASIA: readonly RiotPlatformId[] = ["kr", "jp1"] as const;

export type RiotMatchRegional = "europe" | "americas" | "asia";

export function platformToMatchRegional(platform: RiotPlatformId): RiotMatchRegional {
  if ((EUROPE as readonly string[]).includes(platform)) return "europe";
  if ((ASIA as readonly string[]).includes(platform)) return "asia";
  return "americas";
}

export function matchV5BaseUrl(regional: RiotMatchRegional): string {
  return `https://${regional}.api.riotgames.com`;
}
