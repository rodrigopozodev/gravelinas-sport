import { NextResponse } from "next/server";

import { getTeamSnapshot } from "@/lib/gravelinas/syncTeam";

export async function POST(req: Request) {
  const secret = process.env.SYNC_SECRET?.trim();
  if (secret) {
    const header = req.headers.get("x-sync-secret");
    if (header !== secret) {
      return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
    }
  }

  const result = await getTeamSnapshot({ trigger: "manual" });
  if (!result.ok) {
    const status =
      result.error === "RIOT_API_KEY no configurada"
        ? 500
        : result.errorCode === "RIOT_AUTH_FAILED"
          ? 401
          : 400;
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Error",
        errorCode: result.errorCode,
      },
      { status }
    );
  }
  return NextResponse.json({ ok: true, members: result.members });
}
