"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type InicioPinnedFace = "light" | "dark";

const InicioFaceContext = createContext<{
  pinnedFace: InicioPinnedFace;
  togglePinnedFace: () => void;
} | null>(null);

export function InicioFaceProvider({ children }: { children: React.ReactNode }) {
  const [pinnedFace, setPinnedFace] = useState<InicioPinnedFace>("light");

  const togglePinnedFace = useCallback(() => {
    setPinnedFace((f) => (f === "light" ? "dark" : "light"));
  }, []);

  const value = useMemo(
    () => ({ pinnedFace, togglePinnedFace }),
    [pinnedFace, togglePinnedFace]
  );

  return <InicioFaceContext.Provider value={value}>{children}</InicioFaceContext.Provider>;
}

export function useInicioFace() {
  const ctx = useContext(InicioFaceContext);
  if (!ctx) {
    throw new Error("useInicioFace debe usarse bajo <InicioFaceProvider>");
  }
  return ctx;
}
