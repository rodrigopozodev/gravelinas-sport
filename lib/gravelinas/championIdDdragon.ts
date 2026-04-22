import { getDDragonVersion } from "@/lib/gravelinas/ddragon";

let cache: Promise<Map<number, string>> | null = null;

/** Mapea `championId` (API de partida) → `id` DDragon (carpeta PNG), p. ej. 103 → "Ahri". */
export function getDDragonChampionIdToKeyMap(): Promise<Map<number, string>> {
  if (!cache) {
    const v = getDDragonVersion();
    cache = fetch(`https://ddragon.leagueoflegends.com/cdn/${v}/data/en_GB/champion.json`, {
      next: { revalidate: 86_400 },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`champion.json ${r.status}`);
        return r.json() as Promise<{ data: Record<string, { key: string }> }>;
      })
      .then((j) => {
        const m = new Map<number, string>();
        for (const [id, c] of Object.entries(j.data)) {
          m.set(parseInt(c.key, 10), id);
        }
        return m;
      });
  }
  return cache;
}
