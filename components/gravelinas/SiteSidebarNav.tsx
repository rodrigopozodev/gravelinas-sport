"use client";

import { cn } from "@/lib/utils";
import { useInicioFace } from "@/contexts/InicioFaceContext";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export const SECTION_IDS = ["inicio", "roster"] as const;
export type SectionId = (typeof SECTION_IDS)[number];

const SIDEBAR_ROSTER_LINK = { id: "roster" as const, label: "Roster" };

const COIN_FLIP_MS = 850;

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const win = window as Window & {
    __lenis?: { scrollTo: (t: HTMLElement, opts?: { programmatic?: boolean; offset?: number }) => void };
  };
  const lenis = win.__lenis;
  if (lenis) lenis.scrollTo(el, { offset: 0, programmatic: true });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function FlippingLogoSidebar({
  isSpinning,
  remountKey,
  spinFromDark,
  onRotationEnd,
}: {
  isSpinning: boolean;
  remountKey: number;
  spinFromDark: boolean;
  onRotationEnd: () => void;
}) {
  const { pinnedFace } = useInicioFace();

  return (
    <div className="gr-flip-wrap--sidebar w-full min-w-0">
      <div
        key={remountKey}
        className={cn(
          "gr-flip-inner gr-coin-anim--sidebar",
          isSpinning && spinFromDark && "gr-coin-anim--spin-from-dark",
          !isSpinning && pinnedFace === "dark" && "gr-flip-inner--face-dark"
        )}
        onAnimationEnd={(e) => {
          if (e.target !== e.currentTarget) return;
          onRotationEnd();
        }}
      >
        <div className="gr-flip-face">
          <Image
            src="/brand/gravelinas-logo.png"
            alt=""
            width={88}
            height={88}
            className="h-auto w-full max-w-full select-none"
            sizes="5rem"
            quality={80}
            priority
            loading="eager"
          />
        </div>
        <div className="gr-flip-face gr-flip-back">
          <Image
            src="/brand/gravelinas-logo-tema-oscuro.png"
            alt=""
            width={88}
            height={88}
            className="h-auto w-full max-w-full select-none"
            sizes="5rem"
            quality={80}
            priority
            loading="eager"
          />
        </div>
      </div>
    </div>
  );
}

export function SiteSidebarNav({ activeId }: { activeId: SectionId }) {
  const pathname = usePathname() || "/";
  const isHome = pathname === "/";
  const isOpgg = pathname === "/opgg" || pathname.startsWith("/opgg/");

  const { togglePinnedFace, pinnedFace } = useInicioFace();
  const [inicioCoinSpin, setInicioCoinSpin] = useState(false);
  const [inicioSpinFromDark, setInicioSpinFromDark] = useState(false);
  const [inicioAnimKey, setInicioAnimKey] = useState(0);
  const tInicioSpinEnd = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inicioSpinningRef = useRef(false);

  const endInicioSpin = useCallback(() => {
    inicioSpinningRef.current = false;
    if (tInicioSpinEnd.current) {
      clearTimeout(tInicioSpinEnd.current);
      tInicioSpinEnd.current = null;
    }
    setInicioSpinFromDark(false);
    setInicioCoinSpin(false);
  }, []);

  const startInicioSpin = useCallback(
    (fromDark: boolean) => {
      if (inicioSpinningRef.current) return;
      inicioSpinningRef.current = true;
      if (tInicioSpinEnd.current) {
        clearTimeout(tInicioSpinEnd.current);
        tInicioSpinEnd.current = null;
      }
      setInicioSpinFromDark(fromDark);
      setInicioAnimKey((k) => k + 1);
      setInicioCoinSpin(true);
      tInicioSpinEnd.current = setTimeout(() => {
        tInicioSpinEnd.current = null;
        endInicioSpin();
      }, COIN_FLIP_MS);
    },
    [endInicioSpin]
  );

  useEffect(() => () => endInicioSpin(), [endInicioSpin]);

  const inicioClass = (strong: boolean) =>
    cn(
      "gr-nav-link gr-flip-inicio-btn relative z-10 flex w-full min-w-0 max-w-full flex-col items-center justify-center overflow-visible rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors",
      strong
        ? "bg-white/10 text-[var(--text-primary)]"
        : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]",
      inicioCoinSpin && isHome && "gr-flip-inicio--spin"
    );

  /** Barra superior compacta en `/opgg` (Inicio | Roster | op.gg). */
  const inicioClassOpgg = (strong: boolean) =>
    cn(
      "gr-nav-link gr-flip-inicio-btn relative z-10 flex w-auto shrink-0 flex-row items-center justify-center overflow-visible rounded-xl px-2 py-1.5 text-center text-sm font-semibold transition-colors",
      strong
        ? "bg-white/10 text-[var(--text-primary)]"
        : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
      "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]",
      inicioCoinSpin && isHome && "gr-flip-inicio--spin"
    );

  const rosterNavClass = cn(
    "gr-nav-link relative rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors",
    isOpgg && "shrink-0 py-1.5",
    isHome && activeId === SIDEBAR_ROSTER_LINK.id ? "bg-white/10 text-[var(--text-primary)]" : null,
    !isHome && "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
    isHome &&
      activeId !== SIDEBAR_ROSTER_LINK.id &&
      "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
  );

  const opggLinkClass = cn(
    "gr-nav-link relative rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors",
    isOpgg && "shrink-0 py-1.5",
    isOpgg ? "bg-white/10 text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)]",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]"
  );

  const ic = isOpgg ? inicioClassOpgg : inicioClass;

  return (
    <aside
      className={cn(
        "pointer-events-none z-40",
        isOpgg
          ? "relative flex w-full shrink-0 justify-center border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 sm:px-5"
          : cn(
              "fixed left-0 right-0 top-0 flex flex-row items-start justify-between px-4 pt-4 sm:px-6 lg:px-8",
              "md:left-8 md:right-auto md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:flex-col md:justify-center md:p-0 md:w-max"
            )
      )}
    >
      <div
        className={cn(
          "pointer-events-auto rounded-2xl border border-white/10 bg-[color-mix(in_srgb,var(--bg-elevated)_78%,transparent)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset] backdrop-blur",
          isOpgg
            ? "flex w-full max-w-5xl flex-row items-center justify-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2"
            : "w-full md:w-[6.5rem]"
        )}
      >
        <nav
          aria-label="Secciones"
          className={cn(
            "flex w-full gap-2",
            isOpgg ? "flex-row flex-wrap items-center justify-center p-0" : "flex-row items-center justify-between p-2 md:flex-col md:items-stretch"
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              isOpgg ? "flex-row flex-wrap justify-center" : "w-full flex-row md:w-full md:flex-col"
            )}
          >
            {isHome ? (
              <button
                type="button"
                onClick={() => {
                  const fromDark = pinnedFace === "dark";
                  togglePinnedFace();
                  startInicioSpin(fromDark);
                  setTimeout(() => scrollToSection("inicio"), 0);
                }}
                className={ic(activeId === "inicio")}
                aria-label="Inicio"
                aria-pressed={pinnedFace === "dark"}
                title="Inicio"
              >
                <span className={cn(isOpgg && "block w-[2.65rem] shrink-0")}>
                  <FlippingLogoSidebar
                    isSpinning={inicioCoinSpin}
                    remountKey={inicioAnimKey}
                    spinFromDark={inicioSpinFromDark}
                    onRotationEnd={endInicioSpin}
                  />
                </span>
              </button>
            ) : (
              <Link href="/" className={ic(false)} aria-label="Inicio" title="Volver al inicio">
                <span className={cn(isOpgg && "block w-[2.65rem] shrink-0")}>
                  <FlippingLogoSidebar
                    isSpinning={false}
                    remountKey={0}
                    spinFromDark={false}
                    onRotationEnd={endInicioSpin}
                  />
                </span>
              </Link>
            )}

            {isHome ? (
              <button type="button" onClick={() => scrollToSection(SIDEBAR_ROSTER_LINK.id)} className={rosterNavClass}>
                {SIDEBAR_ROSTER_LINK.label}
              </button>
            ) : (
              <Link href="/#roster" className={rosterNavClass}>
                {SIDEBAR_ROSTER_LINK.label}
              </Link>
            )}

            <Link href="/opgg" className={opggLinkClass} title="Vista op.gg (DoB)">
              op.gg
            </Link>
          </div>
        </nav>
      </div>
    </aside>
  );
}
