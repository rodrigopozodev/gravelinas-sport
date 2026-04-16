/** Fetch Riot con reintentos ante 429. */

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function riotFetch(url: string, token: string): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      headers: { "X-Riot-Token": token },
      cache: "no-store",
    });
    last = res;
    if (res.status !== 429) return res;
    const ra = res.headers.get("Retry-After");
    const sec = ra ? parseInt(ra, 10) : NaN;
    const base = Number.isFinite(sec) && sec > 0 ? sec * 1000 : 1000;
    await sleep(base + attempt * 350);
  }
  return last!;
}
