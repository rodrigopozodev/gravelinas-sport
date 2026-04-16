/** Mensaje unificado cuando la clave Riot caduca o es inválida (403/401). */
export const RIOT_AUTH_MESSAGE =
  "La clave de la API de Riot ha caducado o no es válida. Renueva RIOT_API_KEY en el panel de desarrollador.";

export const RIOT_AUTH_ERROR_CODE = "RIOT_AUTH_FAILED" as const;

export function isAuthHttpStatus(status: number): boolean {
  return status === 401 || status === 403;
}
