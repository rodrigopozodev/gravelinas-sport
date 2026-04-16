import "server-only";

import fs from "node:fs";
import path from "node:path";

import { getDb } from "@/lib/db";
import type { RiotPlatformId } from "@/lib/riot/platforms";
import { isRiotPlatform } from "@/lib/riot/platforms";

export type TeamMemberInput = {
  slot: number;
  gameName: string;
  tagLine: string;
  platform: RiotPlatformId;
  label?: string | null;
  /** Sin cuenta Riot; no se sincroniza ni se guarda en BD. */
  pending?: boolean;
};

export type TeamConfigFile = {
  members: TeamMemberInput[];
};

const CONFIG_PATH = path.join(process.cwd(), "config", "team.json");

export function readTeamConfig(): TeamMemberInput[] {
  const raw = fs.readFileSync(CONFIG_PATH, "utf8");
  const parsed = JSON.parse(raw) as TeamConfigFile;
  if (!parsed?.members || !Array.isArray(parsed.members)) {
    throw new Error("team.json: falta members[]");
  }
  if (parsed.members.length < 1 || parsed.members.length > 5) {
    throw new Error("team.json: entre 1 y 5 members");
  }
  const slots = new Set<number>();
  for (const m of parsed.members) {
    if (typeof m.slot !== "number" || m.slot < 1 || m.slot > 5) {
      throw new Error(`team.json: slot inválido ${m.slot}`);
    }
    if (slots.has(m.slot)) throw new Error(`team.json: slot duplicado ${m.slot}`);
    slots.add(m.slot);
    const pending = m.pending === true;
    if (pending) {
      if (!m.label?.trim()) {
        throw new Error(`team.json: pending requiere label en slot ${m.slot}`);
      }
      continue;
    }
    if (!m.gameName?.trim() || !m.tagLine?.trim()) {
      throw new Error(`team.json: gameName/tagLine obligatorios en slot ${m.slot}`);
    }
    if (!m.platform || !isRiotPlatform(m.platform)) {
      throw new Error(`team.json: platform inválida en slot ${m.slot}`);
    }
  }
  return parsed.members.map((m) => {
    const pending = m.pending === true;
    if (pending) {
      const platform: RiotPlatformId =
        m.platform && isRiotPlatform(m.platform) ? m.platform : "euw1";
      return {
        slot: m.slot,
        gameName: "",
        tagLine: "",
        platform,
        label: m.label?.trim() || null,
        pending: true as const,
      };
    }
    return {
      slot: m.slot,
      gameName: m.gameName.trim(),
      tagLine: m.tagLine.trim(),
      platform: m.platform,
      label: m.label?.trim() || null,
      pending: undefined,
    };
  });
}

/** Sincroniza `team.json` → tabla `team_member` (omite slots `pending`). */
export function syncTeamMembersToDb(members: TeamMemberInput[]) {
  const persisted = members.filter((m) => !m.pending);
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO team_member (slot, game_name, tag_line, platform, label)
    VALUES (@slot, @game_name, @tag_line, @platform, @label)
    ON CONFLICT(slot) DO UPDATE SET
      game_name = excluded.game_name,
      tag_line = excluded.tag_line,
      platform = excluded.platform,
      label = excluded.label
  `);
  const tx = db.transaction(() => {
    for (const m of persisted) {
      stmt.run({
        slot: m.slot,
        game_name: m.gameName,
        tag_line: m.tagLine,
        platform: m.platform,
        label: m.label ?? null,
      });
    }
    const slots = persisted.map((m) => m.slot);
    const placeholders = slots.map(() => "?").join(",");
    if (slots.length > 0) {
      db.prepare(`DELETE FROM team_member WHERE slot NOT IN (${placeholders})`).run(...slots);
      db.prepare(`DELETE FROM player_riot WHERE slot NOT IN (${placeholders})`).run(...slots);
    }
  });
  tx();
}
