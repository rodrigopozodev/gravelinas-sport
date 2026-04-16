import { NextResponse } from "next/server";

import { getTeamSnapshot } from "@/lib/gravelinas/syncTeam";

export async function GET() {
  const result = await getTeamSnapshot({ trigger: "page" });
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "Error",
        errorCode: result.errorCode,
      },
      { status: result.error === "RIOT_API_KEY no configurada" ? 500 : 401 }
    );
  }
  return NextResponse.json({ ok: true, members: result.members });
}
