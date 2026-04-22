import type { SyntheticEvent } from "react";

import type { OpggLineupRank } from "@/lib/gravelinas/opggLineupTypes";
import { OPGG_LINEUP_CHAMPIONS_TOP } from "@/lib/gravelinas/opggLineupTypes";

/** KDA coloreado estilo listado tipo op.gg (teal si va bien). */
function kdaColorClass(kda: number): string {
  if (kda >= 4) return "text-cyan-300";
  if (kda >= 3) return "text-teal-400";
  if (kda >= 2) return "text-slate-400";
  return "text-zinc-500";
}

/** Winrate: rosa/rojo en % alto; gris claro si no. */
function winRateClass(pct: number): string {
  if (pct >= 55) return "text-rose-400";
  if (pct > 50.5) return "text-rose-400/90";
  return "text-zinc-300";
}

function hideOnImgError(e: SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.classList.add("hidden");
}

/** Liga SoloQ: partidas + W/L para barra estilo op.gg. */
function soloQueueWl(c: OpggLineupRank): { wins: number; losses: number; games: number; wrPct: number } | null {
  const w = c.soloWins;
  const l = c.soloLosses;
  if (w == null || l == null) return null;
  const wins = Math.max(0, w);
  const losses = Math.max(0, l);
  const games = wins + losses;
  if (games <= 0) return null;
  return { wins, losses, games, wrPct: (wins / games) * 100 };
}

type Props = {
  partidaNum: 1 | 2;
  rows: OpggLineupRank[];
  champsLoading?: boolean;
  champsFetchError?: string | null;
};

/** Solo texto de rango SoloQ + lista campeones desde cache (iconos CDN con `<img>`). */
export function OpggPartidaLineupBlock({ partidaNum, rows, champsLoading, champsFetchError }: Props) {
  return (
    <section
      className="flex min-h-0 flex-1 flex-col border-b border-white/5 pb-3 last:border-b-0 last:pb-0"
      id={partidaNum === 2 ? "partida-2" : "partida-1"}
    >
      <h2 className="mb-1 shrink-0 text-center text-[1.125rem] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)] sm:text-left sm:text-[1.3125rem]">
        Partida {partidaNum}
      </h2>
      <p className="mb-2 shrink-0 text-center text-[0.6875rem] leading-snug text-[var(--text-secondary)] sm:text-left sm:text-[0.75rem]">
        <span className="font-semibold text-[var(--text-primary)]">S2026</span>
        {" · "}
        Campeones ranked (Solo/Flex) desde 1 ene; mismas partidas que pestaña temporada op.gg hasta tope Riot (~1000).
      </p>
      <div className="grid min-h-0 w-full flex-1 auto-rows-[minmax(0,1fr)] grid-cols-5 gap-0.5 sm:gap-2">
        {rows.map((c) => {
          const solo = soloQueueWl(c);
          return (
          <div
            key={`${partidaNum}-${c.pos}-${c.riotId}`}
            className="flex h-full min-h-0 min-w-0 flex-col rounded-lg border border-white/10 bg-[var(--bg-card)] px-0.5 py-1.5 text-center sm:px-2 sm:py-2"
            title={c.riotId}
          >
            <p className="shrink-0 text-[0.9rem] font-bold uppercase leading-tight text-[var(--accent-primary)] sm:text-[1.05rem]">
              {c.pos}
            </p>
            <p className="mt-0.5 shrink-0 truncate text-[0.9rem] font-medium text-[var(--text-primary)] sm:text-[1.125rem]">
              {c.display}
            </p>
            <div className="mt-1 flex shrink-0 flex-col items-center justify-center gap-1">
              {c.tierEmblemUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- Community Dragon
                <img
                  src={c.tierEmblemUrl}
                  alt=""
                  width={176}
                  height={96}
                  className="mx-auto h-[6.75rem] w-auto max-w-[min(100%,15rem)] object-contain sm:h-[7.5rem] sm:max-w-[16.5rem]"
                  onError={hideOnImgError}
                />
              ) : null}
              <p
                className="w-full break-words text-[0.825rem] font-semibold leading-tight text-[var(--text-secondary)] sm:text-[0.975rem]"
                title={c.error ?? undefined}
              >
                {c.error === "Sin RIOT_API_KEY" ? "Sin API key" : c.rankText}
              </p>
              {solo ? (
                <div className="mt-1 w-full space-y-1">
                  <p className="text-[0.75rem] tabular-nums text-[var(--text-secondary)] sm:text-[0.8125rem]">
                    {solo.games} partidas SoloQ
                  </p>
                  <div className="flex w-full min-w-0 items-stretch gap-1.5">
                    <div
                      className="flex min-h-[1.375rem] min-w-0 flex-1 overflow-hidden rounded-md text-[0.625rem] font-semibold leading-none text-white sm:min-h-[1.5rem] sm:text-[0.6875rem]"
                      role="img"
                      aria-label={`SoloQ ${solo.wins} victorias, ${solo.losses} derrotas, ${solo.wrPct.toFixed(1)} %`}
                    >
                      {solo.wins > 0 ? (
                        <div
                          className="flex min-w-0 items-center justify-center bg-sky-600 px-0.5 py-1"
                          style={{ flex: `${solo.wins} 1 0%` }}
                        >
                          <span className="truncate tabular-nums">{solo.wins}V</span>
                        </div>
                      ) : null}
                      {solo.losses > 0 ? (
                        <div
                          className="flex min-w-0 items-center justify-center bg-red-600 px-0.5 py-1"
                          style={{ flex: `${solo.losses} 1 0%` }}
                        >
                          <span className="truncate tabular-nums">{solo.losses}D</span>
                        </div>
                      ) : null}
                    </div>
                    <span className="flex shrink-0 items-center self-center text-[0.75rem] font-semibold tabular-nums text-red-600 sm:text-[0.8125rem]">
                      {solo.wrPct % 1 < 0.05
                        ? `${Math.round(solo.wrPct)}%`
                        : `${solo.wrPct.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            {champsLoading ? (
              <p className="mt-1.5 shrink-0 text-[0.75rem] text-zinc-400">Actualizando campeones S2026 (Match-V5)…</p>
            ) : champsFetchError ? (
              <p className="mt-1.5 shrink-0 text-[0.75rem] text-amber-500/90" title={champsFetchError}>
                {champsFetchError}
              </p>
            ) : null}
            {c.champions2026Error ? (
              <p className="mt-0.5 shrink-0 text-[0.75rem] text-amber-500/90" title={c.champions2026Error}>
                {c.champions2026Error}
              </p>
            ) : null}
            <ul
              className="mt-1 flex min-h-0 w-full min-w-0 flex-1 list-none flex-col gap-1.5 overflow-y-auto pl-0 text-left"
              aria-label={`Campeones S2026 ranked Solo/Flex, partida ${partidaNum}`}
            >
              {!champsLoading && c.champions2026.length === 0 && !c.champions2026Error ? (
                <li className="text-center text-[0.75rem] text-zinc-500">—</li>
              ) : null}
              {c.champions2026.slice(0, OPGG_LINEUP_CHAMPIONS_TOP).map((ch) => (
                <li
                  key={ch.championId}
                  className="grid w-full grid-cols-[2.75rem_minmax(0,1fr)_auto_auto] items-center gap-x-2 gap-y-0 py-0.5 text-[0.8125rem] leading-none sm:grid-cols-[3rem_minmax(0,1fr)_auto_auto] sm:text-sm"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- CDN externo */}
                  <img
                    src={ch.iconUrl}
                    alt=""
                    width={32}
                    height={32}
                    className="h-9 w-9 shrink-0 rounded-full border border-white/15 object-cover shadow-sm sm:h-10 sm:w-10"
                    onError={hideOnImgError}
                  />
                  <span className={`min-w-0 truncate font-medium uppercase tracking-tight ${kdaColorClass(ch.kda)}`}>
                    {ch.kdaLabel} KDA
                  </span>
                  <span className="shrink-0 tabular-nums text-zinc-300">{ch.games}</span>
                  <span className={`shrink-0 text-right tabular-nums font-medium ${winRateClass(ch.winRatePct)}`}>
                    {ch.winRatePct % 1 < 0.05
                      ? `${Math.round(ch.winRatePct)}%`
                      : `${ch.winRatePct.toFixed(1)}%`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          );
        })}
      </div>
    </section>
  );
}
