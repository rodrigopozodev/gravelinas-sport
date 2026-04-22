/** Multibúsqueda op.gg (EUW) y lineup DoB: orden = posición de izq. a dcha. */

export const OPGG_MULTISEARCH_EUW =
  "https://op.gg/es/lol/multisearch/euw?summoners=DoB+blako%23nardo%2CDoB+Bloody%233005%2C%CE%91lph%CE%B1%23Alpha%2CDoB+PAR%D0%AFA%23DoB%2C%CE%B2lackca%CF%84%23EUW%2C";

export const OPGG_LINEUP = [
  { pos: "Top", display: "DoB blako", riotId: "DoB blako#nardo" },
  { pos: "Jungla", display: "DoB Bloody", riotId: "DoB Bloody#3005" },
  { pos: "Medio", display: "Αlphα", riotId: "Αlphα#Alpha" },
  { pos: "ADC", display: "DoB PARЯA", riotId: "DoB PARЯA#DoB" },
  { pos: "Soporte", display: "βlackcaτ", riotId: "βlackcaτ#EUW" },
] as const;

/** Partida 2 — medios/ADC distintos respecto a P1. */
export const OPGG_LINEUP_P2 = [
  { pos: "Top", display: "DoB blako", riotId: "DoB blako#nardo" },
  { pos: "Jungla", display: "DoB Bloody", riotId: "DoB Bloody#3005" },
  { pos: "Medio", display: "DoB Farmer", riotId: "DoB Farmer#345" },
  { pos: "ADC", display: "Din Djarin", riotId: "Din Djarin#kebab" },
  { pos: "Soporte", display: "βlackcaτ", riotId: "βlackcaτ#EUW" },
] as const;

function opggMultisearchEuw(riotIds: readonly string[]) {
  const u = new URL("https://op.gg/es/lol/multisearch/euw");
  u.searchParams.set("summoners", riotIds.join(","));
  return u.toString();
}

export const OPGG_MULTISEARCH_EUW_P2 = opggMultisearchEuw(OPGG_LINEUP_P2.map((r) => r.riotId));
