import type { Metadata } from "next";

import { OpggDuoClient } from "@/components/gravelinas/OpggDuoClient";
import { OPGG_LINEUP, OPGG_LINEUP_P2 } from "@/lib/gravelinas/opggLineup";
import { getOpggCachedLineup } from "@/lib/gravelinas/opggCacheStore";

export const metadata: Metadata = {
  title: "op.gg (DoB) — Partidas 1 y 2 | Gravelinas",
  description: "Rangos y campeones 2026 (Riot API, caché local)",
};

export const dynamic = "force-dynamic";

/** RSC lee SQLite. "Actualizar" → `POST /api/opgg/duo` (solo liga SoloQ, ~5–25 s). Campeones: `POST /api/opgg/champs` (otra petición). */
export default function OpGgPage() {
  const p1 = getOpggCachedLineup(OPGG_LINEUP);
  const p2 = getOpggCachedLineup(OPGG_LINEUP_P2);
  return <OpggDuoClient initialP1={p1.rows} initialP2={p2.rows} />;
}
