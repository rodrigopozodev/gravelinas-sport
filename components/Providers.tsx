"use client";

import { InicioFaceProvider } from "@/contexts/InicioFaceContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <InicioFaceProvider>{children}</InicioFaceProvider>;
}
