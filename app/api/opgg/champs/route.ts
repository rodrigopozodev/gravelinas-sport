import { NextResponse } from "next/server";

import { OPGG_LINEUP, OPGG_LINEUP_P2 } from "@/lib/gravelinas/opggLineup";
import { refreshOpggLineupChampsToCache } from "@/lib/gravelinas/opggLineupRanks";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Match-V5 (lento). Fusiona con rango ya en `opgg_riot_cache`. */
export async function POST() {
  try {
    const [p1, p2] = await Promise.all([
      refreshOpggLineupChampsToCache(OPGG_LINEUP),
      refreshOpggLineupChampsToCache(OPGG_LINEUP_P2),
    ]);
    return NextResponse.json({ ok: true as const, p1, p2, fetchedAt: Date.now() });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false as const, error: m }, { status: 500 });
  }
}
