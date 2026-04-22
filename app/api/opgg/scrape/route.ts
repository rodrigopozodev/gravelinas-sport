import { NextResponse } from "next/server";

import { OPGG_LINEUP, OPGG_LINEUP_P2 } from "@/lib/gravelinas/opggLineup";
import { refreshOpggLineupFromOpggMcpSequential } from "@/lib/gravelinas/opggLineupFromOpggMcp";
import { closeOpggMcp } from "@/lib/opggMcp/client";

export const dynamic = "force-dynamic";
/** Hasta 10 min para procesos largos (10 jugadores × renew+profile, sin prisa). */
export const maxDuration = 600;

/**
 * Scrape op.gg vía MCP oficial (https://mcp-api.op.gg/mcp), **jugador a jugador**.
 * Refresca rank y top8 de campeones exactamente como aparecen en la web de op.gg.
 */
export async function POST() {
  try {
    const p1 = await refreshOpggLineupFromOpggMcpSequential(OPGG_LINEUP);
    const p2 = await refreshOpggLineupFromOpggMcpSequential(OPGG_LINEUP_P2);
    return NextResponse.json({
      ok: true as const,
      p1: p1.rows,
      p2: p2.rows,
      logs: { p1: p1.logs, p2: p2.logs },
      fetchedAt: Date.now(),
    });
  } catch (e) {
    const m = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ ok: false as const, error: m }, { status: 500 });
  } finally {
    await closeOpggMcp();
  }
}
