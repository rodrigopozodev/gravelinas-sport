/**
 * Verifica que la BD (player_riot) coincide con Riot (puuid + SoloQ).
 *
 * Uso: node scripts/verify-team-riot.cjs
 */
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const env = { ...process.env };
  const root = path.join(__dirname, "..");
  for (const name of [".env.local", ".env"]) {
    const p = path.join(root, name);
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const ROOT = path.join(__dirname, "..");
const TEAM = path.join(ROOT, "config", "team.json");
const API = "https://euw1.api.riotgames.com";
const ACCOUNT = "https://europe.api.riotgames.com";

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function riotFetch(url, token) {
  const res = await fetch(url, { headers: { "X-Riot-Token": token }, cache: "no-store" });
  if (res.status === 429) {
    const ra = parseInt(res.headers.get("Retry-After") || "1", 10) || 1;
    await new Promise((r) => setTimeout(r, (ra + 1) * 1000));
    return await fetch(url, { headers: { "X-Riot-Token": token }, cache: "no-store" });
  }
  return res;
}

async function resolvePuuid(gameName, tagLine, token) {
  const url = `${ACCOUNT}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  const res = await riotFetch(url, token);
  if (!res.ok) return null;
  const j = await res.json().catch(() => null);
  return j?.puuid || null;
}

async function soloByPuuid(puuid, token) {
  const url = `${API}/lol/league/v4/entries/by-puuid/${encodeURIComponent(puuid)}`;
  const res = await riotFetch(url, token);
  if (!res.ok) return null;
  const arr = await res.json().catch(() => null);
  if (!Array.isArray(arr)) return null;
  const solo = arr.find((x) => x && x.queueType === "RANKED_SOLO_5x5") || null;
  if (!solo) return { tier: "NONE", rank: "", leaguePoints: 0, wins: 0, losses: 0 };
  return {
    tier: solo.tier,
    rank: solo.rank,
    leaguePoints: solo.leaguePoints,
    wins: solo.wins,
    losses: solo.losses,
  };
}

async function localSnapshot() {
  // usa el server dev si existe; si no, no rompe.
  try {
    const res = await fetch("http://localhost:3000/api/team/sync", { method: "POST" });
    const j = await res.json();
    if (!j?.ok) return null;
    return j.members || null;
  } catch {
    return null;
  }
}

async function main() {
  const env = loadEnv();
  const token = env.RIOT_API_KEY;
  if (!token) throw new Error("RIOT_API_KEY missing");

  const team = readJson(TEAM).members || [];
  const snap = await localSnapshot(); // del sistema actual

  const out = [];
  for (const m of team) {
    if (m.pending) continue;
    const puuid = await resolvePuuid(m.gameName, m.tagLine, token);
    const solo = puuid ? await soloByPuuid(puuid, token) : null;
    const riotId = `${m.gameName}#${m.tagLine}`;

    const local = Array.isArray(snap) ? snap.find((x) => x.slot === m.slot) : null;
    out.push({
      slot: m.slot,
      label: m.label,
      riotId,
      puuid_remote: puuid ? puuid.slice(0, 10) + "…" : null,
      puuid_local: local?.puuid ? String(local.puuid).slice(0, 10) + "…" : null,
      tier_remote: solo?.tier ?? null,
      tier_local: local?.solo?.tier ?? null,
      lp_remote: solo?.leaguePoints ?? null,
      lp_local: local?.solo?.leaguePoints ?? null,
      ok_puuid: Boolean(puuid && local?.puuid && puuid === local.puuid),
      ok_tier: Boolean((solo?.tier ?? null) === (local?.solo?.tier ?? null)),
    });
  }

  console.table(out);
  const bad = out.filter((x) => !x.ok_puuid || !x.ok_tier);
  if (bad.length) {
    console.log("\nMISMATCH slots:", bad.map((x) => x.slot).join(", "));
    process.exit(2);
  }
  console.log("\nOK: BD coincide con Riot.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

