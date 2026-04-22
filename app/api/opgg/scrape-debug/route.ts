import { NextResponse } from "next/server";

import { closeOpggMcp } from "@/lib/opggMcp/client";
import {
  opggGetSummonerProfile,
  opggGetSummonerProfileRaw,
} from "@/lib/opggMcp/summoner";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Debug MCP op.gg. Dos modos:
 *  - `?mode=raw` (default): payload completo SIN `desired_output_fields` → formato tipo class
 *    de op.gg (con toda la estructura del schema, útil para descubrir nombres).
 *  - `?mode=filtered`: usa los mismos `desired_output_fields` del fetcher real → vemos si el
 *    MCP devuelve JSON limpio con esos paths o si los rechaza.
 * Uso: `GET /api/opgg/scrape-debug?game=DoB%20Farmer&tag=345&mode=filtered`.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const game = url.searchParams.get("game") ?? "DoB Farmer";
  const tag = url.searchParams.get("tag") ?? "345";
  const mode = url.searchParams.get("mode") === "filtered" ? "filtered" : "raw";

  try {
    const profile =
      mode === "filtered"
        ? await opggGetSummonerProfile(game, tag, "EUW")
        : await opggGetSummonerProfileRaw(game, tag, "EUW");
    return NextResponse.json(
      {
        ok: true as const,
        mode,
        game,
        tag,
        profileType: typeof profile,
        isString: typeof profile === "string",
        profile,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e) {
    const m = e instanceof Error ? e.message : "error";
    return NextResponse.json({ ok: false as const, error: m }, { status: 500 });
  } finally {
    await closeOpggMcp();
  }
}
