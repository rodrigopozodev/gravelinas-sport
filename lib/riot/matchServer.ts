import { getRiotApiKey } from "@/lib/riotApiKey";
import { matchV5BaseUrl, type RiotMatchRegional } from "@/lib/riot/matchRegional";
import { riotFetch } from "@/lib/riot/riotFetch";

export type MatchParticipantDto = {
  puuid: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
};

export type MatchV5Info = {
  gameCreation: number;
  queueId: number;
  participants: MatchParticipantDto[];
};

export type MatchV5Dto = { metadata?: { matchId: string }; info: MatchV5Info };

/**
 * Ids de partida por puuid. `queue` y `type` son mutuamente opcionales (Riot: pueden combinarse; solo ranked → `type: "ranked"`).
 * `startTime` / `endTime`: epoch **segundos**.
 * @see https://developer.riotgames.com/apis#match-v5/GET_getMatchIdsByPuuid
 */
export async function fetchMatchIdsByPuuid(
  puuid: string,
  regional: RiotMatchRegional,
  options: {
    queue?: number;
    /** p. ej. `ranked` → solo/dúo + flex + clash ids (filtrar detalle por queueId). */
    type?: string;
    startTime?: number;
    endTime?: number;
    start?: number;
    count?: number;
  }
): Promise<{ ok: true; ids: string[] } | { ok: false; status: number; error?: string }> {
  const key = getRiotApiKey();
  if (!key) return { ok: false, status: 0, error: "Sin clave" };
  const q = new URLSearchParams();
  if (options.queue != null) q.set("queue", String(options.queue));
  if (options.type != null && options.type !== "") q.set("type", options.type);
  if (options.startTime != null) q.set("startTime", String(options.startTime));
  if (options.endTime != null) q.set("endTime", String(options.endTime));
  q.set("start", String(options.start ?? 0));
  q.set("count", String(Math.min(100, options.count ?? 100)));
  const url = `${matchV5BaseUrl(regional)}/lol/match/v5/matches/by-puuid/${encodeURIComponent(
    puuid
  )}/ids?${q.toString()}`;
  const res = await riotFetch(url, key);
  if (!res.ok) {
    return { ok: false, status: res.status, error: `match ids ${res.status}` };
  }
  const ids = (await res.json()) as unknown;
  if (!Array.isArray(ids) || !ids.every((x) => typeof x === "string")) {
    return { ok: false, status: 502, error: "match ids: respuesta inválida" };
  }
  return { ok: true, ids: ids as string[] };
}

export async function fetchMatchV5(
  matchId: string,
  regional: RiotMatchRegional
): Promise<{ ok: true; body: MatchV5Dto } | { ok: false; status: number; error?: string }> {
  const key = getRiotApiKey();
  if (!key) return { ok: false, status: 0, error: "Sin clave" };
  const url = `${matchV5BaseUrl(regional)}/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  const res = await riotFetch(url, key);
  if (!res.ok) {
    return { ok: false, status: res.status, error: `match ${res.status}` };
  }
  const body = (await res.json()) as MatchV5Dto;
  if (!body?.info?.participants?.length) {
    return { ok: false, status: 502, error: "partida: JSON inválido" };
  }
  return { ok: true, body };
}
