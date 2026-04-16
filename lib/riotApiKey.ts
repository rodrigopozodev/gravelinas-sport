/** Clave API Riot: solo servidor (env). */
export function getRiotApiKey(): string | undefined {
  const env = process.env.RIOT_API_KEY?.trim();
  return env || undefined;
}
