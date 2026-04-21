"use client";

import { cn } from "@/lib/utils";
import type { TeamMemberResult, TeamSnapshot } from "@/lib/gravelinas/teamTypes";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

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

const SIDEBAR_LINKS = [
  { id: "inicio", label: "Inicio" },
  { id: "roster", label: "Roster" },
] as const;

type SectionId = (typeof SIDEBAR_LINKS)[number]["id"];

function SiteSidebarNav({ activeId }: { activeId: SectionId }) {
  return (
    <aside
      className={cn(
        "pointer-events-none fixed left-0 right-0 top-0 z-40 flex flex-row items-start justify-between px-4 pt-4 sm:px-6 lg:px-8",
        "md:left-8 md:right-auto md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:flex-col md:justify-center md:p-0",
        "md:w-max"
      )}
    >
      <div
        className={cn(
          "pointer-events-auto w-full",
          "rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur",
          "md:w-[6.5rem]"
        )}
      >
        <nav
          aria-label="Secciones"
          className="flex w-full flex-row items-center justify-between gap-2 p-2 md:flex-col md:items-stretch"
        >
          <div className="flex w-full flex-row gap-1.5 md:flex-col">
            {SIDEBAR_LINKS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                className={cn(
                  "gr-nav-link relative rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors",
                  id === activeId
                    ? "bg-white/10 text-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sync button se muestra en roster bajo ADC */}
        </nav>
      </div>
    </aside>
  );
}

function FlippingLogo() {
  return (
    <div className="gr-flip-wrap mx-auto">
      <div className={cn("gr-flip-inner gr-coin-anim")}>
        <div className="gr-flip-face">
          <Image
            src="/brand/gravelinas-logo.png"
            alt="Gravelinas"
            width={420}
            height={420}
            className="h-auto w-full select-none"
            priority
          />
        </div>
        <div className="gr-flip-face gr-flip-back">
          <Image
            src="/brand/gravelinas-logo-tema-oscuro.png"
            alt="Gravelinas"
            width={420}
            height={420}
            className="h-auto w-full select-none"
            priority
          />
        </div>
      </div>
    </div>
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
        "flex min-h-0 min-w-0 flex-col gap-2 rounded-xl px-4 pb-4 pt-4",
        "bg-transparent overflow-x-hidden overflow-y-visible",
        "origin-center scale-[1.3]"
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
          <p className="text-[14px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            {m.label ?? `Slot ${m.slot}`}
          </p>
          <p
            className={cn(
              "font-mono text-[14px] text-[var(--text-secondary)]",
              hasRankFrame ? "mt-0.5 break-all sm:break-words" : "mt-1"
            )}
          >
            {m.riotId}
          </p>
          {m.summonerName ? (
            <p
              className={cn(
                "font-semibold text-[var(--text-primary)]",
                hasRankFrame ? "mt-0.5 px-1 text-[20px]" : "mt-1 truncate text-[22px]"
              )}
              title={m.summonerName}
            >
              {m.summonerName}
            </p>
          ) : null}
        </div>
      </div>

      <div className="pt-2">

        {m.soloTierEmblemUrl ? (
          <div className="mt-2">
            <div className="mx-auto flex w-full items-center justify-center">
              <div className="relative h-48 w-48 overflow-visible">
                {/* eslint-disable-next-line @next/next/no-img-element -- Community Dragon */}
                <img
                  src={m.soloTierEmblemUrl}
                  alt=""
                  role="presentation"
                  className="absolute inset-0 -translate-y-[40px] h-full w-full origin-center scale-[2] object-contain object-center select-none"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
                <div
                  className="absolute left-1/2 top-[calc(50%-2px)] z-10 size-[6.5rem] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/10 bg-[var(--bg-card)] shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset] p-0"
                  aria-hidden
                >
                  {m.profileIconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- CDN Data Dragon
                    <img
                      src={m.profileIconUrl}
                      alt=""
                      width={96}
                      height={96}
                      className="size-full rounded-full object-cover"
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="size-full bg-[var(--bg-card)]" />
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-0.5 text-center" aria-label="Rango SoloQ">
              <p className="text-balance break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
                {solo ? formatRank(solo.tier, solo.rank, solo.leaguePoints) : "Unranked"}
              </p>
              {solo && (
                <>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {solo.wins}W / {solo.losses}L
                  </p>
                  {soloWinPct != null ? (
                    <p className="mt-1 text-base leading-tight text-[var(--text-muted)]">{soloWinPct}</p>
                  ) : null}
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-1.5">
            <p className="text-base text-[var(--text-muted)]">Sin emblema de liga</p>
            <p className="mt-1 break-words text-base font-semibold leading-snug text-[var(--text-primary)]">
              {solo ? formatRank(solo.tier, solo.rank, solo.leaguePoints) : "Unranked"}
            </p>
            {solo && (
              <>
                <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                  {solo.wins}W / {solo.losses}L
                </p>
                {soloWinPct != null ? (
                  <p className="mt-1 text-base leading-tight text-[var(--text-muted)]">{soloWinPct}</p>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function HomeView({ data }: { data: TeamSnapshot }) {
  const ok = data.ok;
  const members = data.members ?? [];
  const globalErr = !ok ? data.error : undefined;
  const authErr = !ok && "errorCode" in data && data.errorCode === "RIOT_AUTH_FAILED";
  const [activeId, setActiveId] = useState<SectionId>("inicio");

  const sectionIds = useMemo(() => SIDEBAR_LINKS.map((l) => l.id), []);

  useEffect(() => {
    const els = sectionIds
      .map((id) => document.getElementById(id))
      .filter((x): x is HTMLElement => Boolean(x));
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        if (!visible?.target?.id) return;
        const id = visible.target.id as SectionId;
        if (sectionIds.includes(id)) setActiveId(id);
      },
      { root: null, threshold: [0.3, 0.45, 0.6, 0.75] }
    );

    for (const el of els) obs.observe(el);
    return () => obs.disconnect();
  }, [sectionIds]);

  return (
    <>
      <HomeLenis />
      <div className="bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden">
        <SiteSidebarNav activeId={activeId} />
        <main>
          <section
            id="inicio"
            className={cn(
              "relative flex min-h-svh flex-col justify-center overflow-hidden px-4 pb-16 pt-16 sm:px-6 lg:px-8",
              "gr-hero-orbit-bg"
            )}
          >
            <div className="pointer-events-none absolute inset-0 -z-10 gr-hero-orbits" aria-hidden>
              <div className="gr-orbit-2" />
              <div className="gr-pulse" />
            </div>
            <div className="mx-auto w-full max-w-3xl text-center">
              <FlippingLogo />

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[var(--text-secondary)] sm:text-xl">
                ¿Te gusta el competitivo de verdad?{" "}
                <span className="font-semibold text-[var(--text-primary)]">Síguenos</span> y{" "}
                <span className="font-semibold text-[var(--text-primary)]">únete</span>: buscamos gente con hambre
                de mejorar, dentro y fuera del game.
              </p>

              <p className="mx-auto mt-5 max-w-2xl text-balance text-[15px] leading-relaxed text-[var(--text-muted)] sm:text-[17.5px]">
                “Disciplina. Comunicación. Constancia. El resultado llega.”
              </p>

              <p className="mx-auto mt-7 max-w-2xl text-[15px] leading-relaxed text-[var(--text-muted)] sm:text-[17.5px]">
                Participamos en{" "}
                <a
                  href="https://circuitotormenta.riotgames.com/landing/hextech-series-lol"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--text-primary)] underline decoration-white/20 underline-offset-4 hover:decoration-white/50"
                >
                  Hextech Series
                </a>{" "}
                y{" "}
                <a
                  href="https://circuitotormenta.riotgames.com/competition/tournament/esm-2026-or-split-1-or-torneo-4-presencial"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[var(--text-primary)] underline decoration-white/20 underline-offset-4 hover:decoration-white/50"
                >
                  Madrid in Game (presencial)
                </a>
                .
              </p>

              {globalErr && (
                <div
                  role="alert"
                  className={cn(
                    "mx-auto mt-10 max-w-2xl rounded-xl border px-4 py-3 text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]",
                    authErr
                      ? "border-red-500/50 bg-red-500/10 text-red-100"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-100"
                  )}
                >
                  {globalErr}
                </div>
              )}
            </div>
          </section>

          <section
            id="roster"
            className="flex min-h-svh flex-col justify-center overflow-x-hidden scroll-mt-0 px-4 py-10 sm:px-6 lg:px-8"
          >
            <div className="mx-auto max-w-6xl min-w-0">
              <div className="grid min-w-0 grid-cols-1 items-stretch gap-20 overflow-visible md:grid-cols-6">
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
                    {m.pending && (m.label ?? "").toLowerCase() === "adc" ? (
                      <div className="mt-4 flex justify-center">
                        <TeamRefreshButton />
                      </div>
                    ) : null}
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
