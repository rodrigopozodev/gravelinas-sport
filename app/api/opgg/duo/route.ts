import { NextResponse } from "next/server";

import { OPGG_LINEUP, OPGG_LINEUP_P2 } from "@/lib/gravelinas/opggLineup";
import { getOpggCachedLineup } from "@/lib/gravelinas/opggCacheStore";
import { refreshOpggLineupRanksOnlyToCache } from "@/lib/gravelinas/opggLineupRanks";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Lectura rápida desde SQLite. */
export async function GET() {
  const p1 = getOpggCachedLineup(OPGG_LINEUP);
  const p2 = getOpggCachedLineup(OPGG_LINEUP_P2);
  const fetchedAt = [p1.newestFetchedAt, p2.newestFetchedAt].filter((x): x is number => x != null);
  const newest = fetchedAt.length ? Math.max(...fetchedAt) : null;
  return NextResponse.json({ ok: true as const, p1: p1.rows, p2: p2.rows, fetchedAt: newest });
}

/** Refresco SoloQ (liga): rápido. Campeones → `POST /api/opgg/champs`. */
export async function POST() {
  try {
    const [p1, p2] = await Promise.all([
      refreshOpggLineupRanksOnlyToCache(OPGG_LINEUP),
      refreshOpggLineupRanksOnlyToCache(OPGG_LINEUP_P2),
    ]);
    return NextResponse.json({ ok: true as const, p1, p2, fetchedAt: Date.now() });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false as const, error: m }, { status: 500 });
  }
}
