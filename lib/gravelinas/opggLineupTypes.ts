/**
 * Tipos compartidos op.gg (importables en client sin `server-only`).
 */

/** Máximo de campeones “más jugados” por jugador (API + UI). */
export const OPGG_LINEUP_CHAMPIONS_TOP = 8;

/** Stats agregadas Match-V5 (p. ej. ranked Solo 420 + Flex 440 desde 2026-01-01). */
export type OpggSoloQChampion2026 = {
  championId: number;
  ddragonId: string;
  iconUrl: string;
  games: number;
  wins: number;
  kda: number;
  kdaLabel: string;
  winRatePct: number;
};

export type OpggLineupRank = {
  pos: string;
  display: string;
  riotId: string;
  rankText: string;
  tierEmblemUrl: string | null;
  error: string | null;
  /** Liga SoloQ (Riot League-V4); `null` si no aplica. */
  soloWins: number | null;
  soloLosses: number | null;
  champions2026: OpggSoloQChampion2026[];
  champions2026Error: string | null;
};

export type OpggChampionsPatch = Pick<OpggLineupRank, "riotId" | "champions2026" | "champions2026Error">;
