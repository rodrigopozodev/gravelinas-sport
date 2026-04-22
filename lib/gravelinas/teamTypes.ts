export type SoloSnapshot = {
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

export type TeamMemberResult = {
  slot: number;
  label: string | null;
  platform: string;
  /** Slot reservado sin Riot ID (solo UI). */
  pending?: boolean;
  riotId: string;
  puuid: string | null;
  summonerName: string | null;
  profileIconId: number | null;
  /** URL absoluta CDN Data Dragon (servidor) */
  profileIconUrl: string | null;
  /** Emblema tier SoloQ (CD wings plate; DD `/img/tier` no público) */
  soloTierEmblemUrl: string | null;
  solo: SoloSnapshot | null;
  lastFullSyncAt: number | null;
  lastRankSyncAt: number | null;
  rowError?: string;
};

export type TeamSnapshot =
  | { ok: true; members: TeamMemberResult[] }
  | {
      ok: false;
      error?: string;
      errorCode?: "RIOT_AUTH_FAILED" | string;
      members: TeamMemberResult[];
    };
