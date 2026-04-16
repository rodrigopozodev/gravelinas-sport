"use client";

import { cn } from "@/lib/utils";
import type { TeamMemberResult, TeamSnapshot } from "@/lib/gravelinas/teamTypes";

import { HomeLenis } from "./HomeLenis";
import { TeamRefreshButton } from "./TeamRefreshButton";

function formatRank(
  tier: string | null | undefined,
  rank: string | null | undefined,
  lp: number | null | undefined
) {
  if (!tier || tier === "NONE") return "Unranked";
  if (tier === "CHALLENGER" || tier === "GRANDMASTER" || tier === "MASTER") {
    return `${tier} · ${lp ?? 0} LP`;
  }
  return `${tier} ${rank ?? ""} · ${lp ?? 0} LP`.replace(/\s+/g, " ").trim();
}

/** % victorias SoloQ: wins / (wins + losses). */
function formatSoloWinRatePct(wins: number, losses: number): string | null {
  const n = wins + losses;
  if (n <= 0) return null;
  return `${((wins / n) * 100).toFixed(1)}%`;
}

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const win = window as Window & {
    __lenis?: { scrollTo: (t: HTMLElement, opts?: { programmatic?: boolean; offset?: number }) => void };
  };
  const lenis = win.__lenis;
  // Lenis ya resta scroll-margin / scroll-padding del nodo; offset extra desalinea.
  if (lenis) lenis.scrollTo(el, { offset: 0, programmatic: true });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToRoster() {
  scrollToSection("roster");
}

const SIDEBAR_LINKS = [
  { id: "inicio", label: "Inicio" },
  { id: "roster", label: "Roster" },
] as const;

function SiteSidebarNav() {
  return (
    <aside
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-0 z-40 flex flex-row items-start justify-between px-4 pt-4 sm:px-6 lg:px-8",
        "md:left-6 md:right-auto md:top-0 md:bottom-0 md:flex-col md:justify-between md:py-16 lg:left-8",
        "md:w-max"
      )}
    >
      <nav
        aria-label="Secciones"
        className="pointer-events-auto flex w-full flex-row justify-between gap-6 md:h-full md:min-h-0 md:flex-col md:justify-between md:gap-0"
      >
        {SIDEBAR_LINKS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollToSection(id)}
            className={cn(
              "rounded-md px-2 py-2 text-left text-sm font-medium text-[var(--text-secondary)] transition-colors",
              "hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
            )}
          >
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function RosterCard({ m }: { m: TeamMemberResult }) {
  if (m.pending) {
    return (
      <article
        className="flex min-h-[10rem] min-w-0 flex-col justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-6 text-center transition-transform duration-300 hover:-translate-y-0.5"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
          {m.label ?? `Slot ${m.slot}`}
        </p>
        <p className="text-sm text-[var(--text-muted)]">Próximamente</p>
      </article>
    );
  }

  const solo = m.solo;
  const hasRankFrame = Boolean(m.soloTierEmblemUrl);
  const soloWinPct = solo ? formatSoloWinRatePct(solo.wins, solo.losses) : null;

  return (
    <article
      className={cn(
        "flex min-h-0 min-w-0 flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 pb-4 pt-4",
        hasRankFrame ? "h-full overflow-visible" : "overflow-hidden",
        "transition-transform duration-300 hover:-translate-y-0.5"
      )}
    >
      <div
        className={cn(
          "relative min-w-0 shrink-0",
          hasRankFrame ? "w-full px-1" : "flex items-start gap-3"
        )}
      >
        {!hasRankFrame ? (
          m.profileIconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- CDN externo; evita capa Image/next
            <img
              src={m.profileIconUrl}
              alt=""
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] object-cover"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="size-24 shrink-0 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-card)]"
              aria-hidden
            />
          )
        ) : null}
        <div className={cn("min-w-0", !hasRankFrame && "flex-1", hasRankFrame && "text-center")}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            {m.label ?? `Slot ${m.slot}`}
          </p>
          <p
            className={cn(
              "font-mono text-xs text-[var(--text-secondary)]",
              hasRankFrame ? "mt-0.5 break-all sm:break-words" : "mt-1"
            )}
          >
            {m.riotId}
          </p>
          {m.summonerName ? (
            <p
              className={cn(
                "font-semibold text-[var(--text-primary)]",
                hasRankFrame ? "mt-0.5 px-1 text-base" : "mt-1 truncate text-lg"
              )}
              title={m.summonerName}
            >
              {m.summonerName}
            </p>
          ) : null}
        </div>
      </div>

      {m.rowError && (
        <p className="shrink-0 text-left text-sm text-red-400/90" role="alert">
          {m.rowError}
        </p>
      )}

      <div
        className={cn(
          "border-t border-[var(--border)]",
          hasRankFrame ? "flex min-h-0 flex-1 flex-col pt-1.5" : "pt-2"
        )}
      >
        <p
          className={cn(
            "shrink-0 text-[11px] uppercase tracking-wider text-[var(--text-muted)]",
            hasRankFrame && "text-center"
          )}
        >
          SoloQ
        </p>
        <div
          className={cn(
            "flex w-full min-w-0 flex-col",
            hasRankFrame ? "mt-0.5 min-h-0 flex-1" : "mt-1.5 gap-2"
          )}
        >
          {m.soloTierEmblemUrl ? (
            <div className="flex min-h-0 flex-1 flex-col">
              {/* Marco ocupa el espacio central; stats en un solo div pegado al borde inferior de la tarjeta */}
              <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-visible">
                <div className="relative mx-auto h-28 w-full max-w-[13.5rem] shrink-0 overflow-visible">
                  <div className="pointer-events-none absolute left-1/2 top-1/2 isolate z-10 w-[min(20.25rem,calc(100vw-2.5rem))] max-w-none -translate-x-1/2 -translate-y-1/2">
                    <div className="relative w-full">
                      <div
                        className="pointer-events-none absolute left-1/2 top-[60%] z-0 aspect-square w-[38%] min-w-[5.25rem] max-w-[9.375rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-black/25 bg-[var(--bg-card)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] ring-1 ring-white/5"
                        aria-hidden
                      >
                        {m.profileIconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- CDN Data Dragon
                          <img
                            src={m.profileIconUrl}
                            alt=""
                            width={126}
                            height={126}
                            className="size-full object-cover"
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="size-full bg-[var(--bg-card)]" />
                        )}
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element -- Community Dragon */}
                      <img
                        src={m.soloTierEmblemUrl}
                        alt=""
                        role="presentation"
                        className="relative z-[999] block h-auto w-full object-contain object-center select-none"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-auto w-full shrink-0">
                {/* margin-top % (ancho contenedor) + mt-auto = texto abajo con aire respecto al marco */}
                <div
                  className="mt-[min(22%,4.675rem)] space-y-0.5 text-center"
                  aria-label="Rango SoloQ"
                >
                  <p className="text-balance break-words text-sm font-semibold leading-snug text-[var(--text-primary)] sm:text-base">
                    {solo ? formatRank(solo.tier, solo.rank, solo.leaguePoints) : "Unranked"}
                  </p>
                  {solo && (
                    <>
                      <p className="text-xs text-[var(--text-secondary)] sm:text-sm">
                        {solo.wins}W / {solo.losses}L
                      </p>
                      {soloWinPct != null ? (
                        <p className="mt-1 text-[14.3px] leading-tight text-[var(--text-muted)] sm:text-[15px]">
                          {soloWinPct}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-[var(--text-muted)]">Sin emblema de liga</p>
              <div
                className={cn(
                  "w-full min-w-0",
                  hasRankFrame ? "text-center" : "text-center sm:text-left"
                )}
              >
                <p className="break-words text-sm font-semibold leading-snug text-[var(--text-primary)] sm:text-base">
                  {solo ? formatRank(solo.tier, solo.rank, solo.leaguePoints) : "Unranked"}
                </p>
                {solo && (
                  <>
                    <p className="mt-0.5 text-xs text-[var(--text-secondary)] sm:text-sm">
                      {solo.wins}W / {solo.losses}L
                    </p>
                    {soloWinPct != null ? (
                      <p className="mt-1 text-[14.3px] leading-tight text-[var(--text-muted)] sm:text-[15px]">
                        {soloWinPct}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function HomeView({ data }: { data: TeamSnapshot }) {
  const ok = data.ok;
  const members = data.members ?? [];
  const globalErr = !ok ? data.error : undefined;
  const authErr = !ok && "errorCode" in data && data.errorCode === "RIOT_AUTH_FAILED";

  return (
    <>
      <HomeLenis />
      <div className="bg-[var(--bg-base)] text-[var(--text-primary)]">
        <SiteSidebarNav />
        <main>
          <section
            id="inicio"
            className="relative flex min-h-svh flex-col justify-center px-4 pb-16 pt-16 sm:px-6 lg:px-8"
          >
            <div className="mx-auto w-full max-w-4xl">
              <p className="mb-3 text-sm font-medium uppercase tracking-[0.35em] text-[var(--accent-primary)]">
                League of Legends
              </p>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="bg-gradient-to-br from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--accent-primary)] bg-clip-text text-transparent">
                  Gravelinas
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl">
                Equipo competitivo — datos Riot guardados en SQLite. Perfil (nombre, icono, PUUID) se
                sincroniza cada 3 días; el botón actualiza solo rango y victorias en SoloQ.
              </p>

              {globalErr && (
                <div
                  role="alert"
                  className={cn(
                    "mt-8 rounded-lg border px-4 py-3 text-sm",
                    authErr
                      ? "border-red-500/50 bg-red-500/10 text-red-100"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  )}
                >
                  {globalErr}
                </div>
              )}

              <div className="mt-12 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={scrollToRoster}
                  className={cn(
                    "inline-flex min-h-12 items-center justify-center rounded-lg px-6 text-sm font-semibold",
                    "bg-[var(--accent-primary)] text-[var(--bg-base)]",
                    "hover:bg-[color-mix(in_srgb,var(--accent-primary)_88%,white)]",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
                  )}
                >
                  Ver roster
                </button>
                <span className="text-sm text-[var(--text-muted)]">Scroll suavizado · Lenis</span>
              </div>
            </div>

            <div
              className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[var(--text-muted)]"
              aria-hidden
            >
              <span className="text-xs uppercase tracking-widest">Explorar</span>
              <span className="block h-8 w-px bg-gradient-to-b from-[var(--accent-primary)] to-transparent" />
            </div>
          </section>

          <section
            id="roster"
            className="min-h-svh scroll-mt-0 border-t border-[var(--border)] px-4 py-20 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 flex flex-col gap-6 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-2xl">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Roster</h2>
                  <p className="mt-3 text-[var(--text-secondary)]">
                    Cinco jugadores. Actualización manual: solo victorias, derrotas y rango SoloQ.
                  </p>
                </div>
                <TeamRefreshButton />
              </div>

              <div className="grid min-w-0 grid-cols-1 items-stretch gap-6 overflow-visible md:grid-cols-6">
                {members.map((m) => (
                  <div
                    key={m.slot}
                    className={cn(
                      "min-w-0 md:col-span-2",
                      m.slot === 4 && "md:col-start-2",
                      m.slot === 5 && "md:col-start-4"
                    )}
                  >
                    <RosterCard m={m} />
                  </div>
                ))}
              </div>

              {ok && members.length === 0 && (
                <p className="text-[var(--text-secondary)]">No hay miembros en la configuración.</p>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
