import { OpggPartidaLineupBlock } from "@/components/gravelinas/OpggPartidaLineupBlock";
import { SiteSidebarNav } from "@/components/gravelinas/SiteSidebarNav";
import { cn } from "@/lib/utils";
import type { OpggLineupRank } from "@/lib/gravelinas/opggLineupTypes";

export type OpggLineupTab = 1 | 2;

type Side = {
  rows: OpggLineupRank[];
  champsLoading: boolean;
  champsFetchError: string | null;
};

type Props = {
  p1: Side;
  p2: Side;
  lineupTab: OpggLineupTab;
  onLineupTabChange: (tab: OpggLineupTab) => void;
  rankRefreshing: boolean;
  onRefreshRank: () => void;
  rankError: string | null;
  champsRefreshing: boolean;
  onRefreshChamps: () => void;
  scrapeRefreshing: boolean;
  onRefreshScrape: () => void;
  scrapeError: string | null;
};

const tabBtn =
  "rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors sm:text-sm";

export function OpggDuoView({
  p1,
  p2,
  lineupTab,
  onLineupTabChange,
  rankRefreshing,
  onRefreshRank,
  rankError,
  champsRefreshing,
  onRefreshChamps,
  scrapeRefreshing,
  onRefreshScrape,
  scrapeError,
}: Props) {
  const show1 = lineupTab === 1;
  const show2 = lineupTab === 2;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <SiteSidebarNav activeId="inicio" />
      <header className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--bg-elevated)]">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-2 py-2 sm:px-4 sm:py-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onLineupTabChange(1)}
              className={cn(
                tabBtn,
                lineupTab === 1
                  ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
              )}
            >
              Equipo 1
            </button>
            <button
              type="button"
              onClick={() => onLineupTabChange(2)}
              className={cn(
                tabBtn,
                lineupTab === 2
                  ? "border-[var(--accent-primary)]/50 bg-[var(--accent-primary)]/15 text-[var(--accent-primary)]"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
              )}
            >
              Equipo 2
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onRefreshScrape}
              disabled={scrapeRefreshing}
              title="Renueva y lee op.gg jugador por jugador (MCP op.gg). Tarda varios min."
              className="rounded border border-emerald-500/60 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {scrapeRefreshing ? "Scrapeando op.gg…" : "Actualizar desde op.gg"}
            </button>
            <button
              type="button"
              onClick={onRefreshChamps}
              disabled={champsRefreshing}
              className="rounded border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)] transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {champsRefreshing ? "Campeones…" : "Actualizar campeones S2026"}
            </button>
            <button
              type="button"
              onClick={onRefreshRank}
              disabled={rankRefreshing}
              className="rounded border border-[var(--accent-primary)]/60 bg-[var(--accent-primary)]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--accent-primary)] transition-colors hover:bg-[var(--accent-primary)]/20 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
            >
              {rankRefreshing ? "Rango…" : "Actualizar rango"}
            </button>
          </div>
        </div>
        {scrapeError ? (
          <p className="shrink-0 border-b border-emerald-500/20 bg-emerald-500/10 px-2 py-1.5 text-center text-[0.75rem] text-emerald-200 sm:px-4 sm:text-xs">
            op.gg: {scrapeError}
          </p>
        ) : null}
        {rankError ? (
          <p className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-center text-[0.75rem] text-amber-200 sm:px-4 sm:text-xs">
            {rankError}
          </p>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pb-2 pr-2.5 pt-2 sm:px-4 sm:pb-3 sm:pt-3">
          <div className="flex min-h-full flex-1 flex-col">
            {show1 ? (
              <OpggPartidaLineupBlock
                partidaNum={1}
                rows={p1.rows}
                champsLoading={p1.champsLoading}
                champsFetchError={p1.champsFetchError}
              />
            ) : null}
            {show2 ? (
              <OpggPartidaLineupBlock
                partidaNum={2}
                rows={p2.rows}
                champsLoading={p2.champsLoading}
                champsFetchError={p2.champsFetchError}
              />
            ) : null}
          </div>
        </div>
      </header>
    </div>
  );
}
