"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Scroll suavizado (misma idea que Web-Corporativa Degryh / Lenis).
 */
export function HomeLenis() {
  useEffect(() => {
    document.documentElement.classList.add("lenis");

    const lenis = new Lenis({
      autoRaf: true,
      smoothWheel: true,
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1,
      syncTouch: false,
      stopInertiaOnNavigate: true,
    });

    (window as Window & { __lenis?: Lenis }).__lenis = lenis;

    return () => {
      document.documentElement.classList.remove("lenis");
      delete (window as Window & { __lenis?: Lenis }).__lenis;
      lenis.destroy();
    };
  }, []);

  return null;
}
