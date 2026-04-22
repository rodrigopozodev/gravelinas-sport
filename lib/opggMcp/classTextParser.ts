import "server-only";

/**
 * Parser del formato de salida del MCP op.gg:
 *
 *   class Summoner: game_name,tagline,level,league_stats
 *   class LeagueStat: game_type,win,lose
 *   ...
 *
 *   LolGetSummonerProfile(Data(Summoner("DoB Farmer","345",207,[LeagueStat("SOLORANKED",175,170), ...])))
 *
 * El encabezado (schema) declara orden de campos por clase; la instancia usa args posicionales.
 * Este parser convierte ambas partes en un objeto JS anidado donde:
 *   - clase con schema conocido → objeto `{ field: value }`
 *   - clase sin schema (o args extra) → objeto con `_class` + `_args`
 *   - `[…]` → array; `null` → null; string/number nativos.
 */

type SchemaMap = Map<string, string[]>;

type Token =
  | { t: "ident"; v: string }
  | { t: "str"; v: string }
  | { t: "num"; v: number }
  | { t: "null" }
  | { t: "true" }
  | { t: "false" }
  | { t: "lparen" }
  | { t: "rparen" }
  | { t: "lbracket" }
  | { t: "rbracket" }
  | { t: "comma" };

function splitSchemaAndInstance(text: string): { schemaText: string; instanceText: string } {
  // Schema = líneas iniciales que empiezan por "class ". Instancia = el resto.
  const lines = text.split(/\r?\n/);
  const schemaLines: string[] = [];
  let i = 0;
  while (i < lines.length && (lines[i].startsWith("class ") || lines[i].trim() === "")) {
    schemaLines.push(lines[i]);
    i += 1;
  }
  const instanceText = lines.slice(i).join("\n").trim();
  return { schemaText: schemaLines.join("\n"), instanceText };
}

function parseSchema(schemaText: string): SchemaMap {
  const map: SchemaMap = new Map();
  for (const raw of schemaText.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith("class ")) continue;
    // "class Name: f1,f2,f3"
    const m = /^class\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const name = m[1];
    const fields = m[2]
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    map.set(name, fields);
  }
  return map;
}

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
      i += 1;
      continue;
    }
    if (ch === "(") {
      out.push({ t: "lparen" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      out.push({ t: "rparen" });
      i += 1;
      continue;
    }
    if (ch === "[") {
      out.push({ t: "lbracket" });
      i += 1;
      continue;
    }
    if (ch === "]") {
      out.push({ t: "rbracket" });
      i += 1;
      continue;
    }
    if (ch === ",") {
      out.push({ t: "comma" });
      i += 1;
      continue;
    }
    if (ch === '"') {
      // Cadena con escapes \" \\ \n \t \r \uXXXX.
      let j = i + 1;
      let value = "";
      while (j < n) {
        const c = src[j];
        if (c === "\\") {
          const next = src[j + 1];
          if (next === undefined) break;
          if (next === "n") value += "\n";
          else if (next === "r") value += "\r";
          else if (next === "t") value += "\t";
          else if (next === "u") {
            const hex = src.slice(j + 2, j + 6);
            const code = parseInt(hex, 16);
            value += Number.isFinite(code) ? String.fromCharCode(code) : "";
            j += 6;
            continue;
          } else value += next;
          j += 2;
          continue;
        }
        if (c === '"') break;
        value += c;
        j += 1;
      }
      out.push({ t: "str", v: value });
      i = j + 1;
      continue;
    }
    // número (int/float, negativos)
    if (ch === "-" || (ch >= "0" && ch <= "9")) {
      let j = i + 1;
      while (j < n) {
        const c = src[j];
        if ((c >= "0" && c <= "9") || c === "." || c === "e" || c === "E" || c === "+" || c === "-") {
          j += 1;
        } else break;
      }
      const raw = src.slice(i, j);
      const num = Number(raw);
      out.push({ t: "num", v: Number.isFinite(num) ? num : 0 });
      i = j;
      continue;
    }
    // identificador (clase, null, true, false)
    if ((ch >= "A" && ch <= "Z") || (ch >= "a" && ch <= "z") || ch === "_") {
      let j = i + 1;
      while (j < n) {
        const c = src[j];
        if ((c >= "A" && c <= "Z") || (c >= "a" && c <= "z") || (c >= "0" && c <= "9") || c === "_") {
          j += 1;
        } else break;
      }
      const id = src.slice(i, j);
      if (id === "null" || id === "None") out.push({ t: "null" });
      else if (id === "true" || id === "True") out.push({ t: "true" });
      else if (id === "false" || id === "False") out.push({ t: "false" });
      else out.push({ t: "ident", v: id });
      i = j;
      continue;
    }
    // Desconocido → saltar 1 char para no colgarse.
    i += 1;
  }
  return out;
}

function parseExpr(
  tokens: Token[],
  pos: number,
  schema: SchemaMap
): { value: unknown; next: number } {
  const tk = tokens[pos];
  if (!tk) return { value: null, next: pos };
  if (tk.t === "null") return { value: null, next: pos + 1 };
  if (tk.t === "true") return { value: true, next: pos + 1 };
  if (tk.t === "false") return { value: false, next: pos + 1 };
  if (tk.t === "num") return { value: tk.v, next: pos + 1 };
  if (tk.t === "str") return { value: tk.v, next: pos + 1 };
  if (tk.t === "lbracket") {
    return parseArray(tokens, pos + 1, schema);
  }
  if (tk.t === "ident") {
    const next = tokens[pos + 1];
    if (next && next.t === "lparen") {
      return parseCall(tokens, pos, schema);
    }
    // identificador suelto sin paréntesis → devolver como string literal
    return { value: tk.v, next: pos + 1 };
  }
  return { value: null, next: pos + 1 };
}

function parseArray(
  tokens: Token[],
  pos: number,
  schema: SchemaMap
): { value: unknown[]; next: number } {
  const items: unknown[] = [];
  let i = pos;
  if (tokens[i]?.t === "rbracket") {
    return { value: items, next: i + 1 };
  }
  for (;;) {
    const { value, next } = parseExpr(tokens, i, schema);
    items.push(value);
    i = next;
    const t = tokens[i];
    if (!t) break;
    if (t.t === "comma") {
      i += 1;
      continue;
    }
    if (t.t === "rbracket") {
      i += 1;
      break;
    }
    // Recuperación — avanzar para no colgarse.
    i += 1;
  }
  return { value: items, next: i };
}

function parseCall(
  tokens: Token[],
  pos: number,
  schema: SchemaMap
): { value: unknown; next: number } {
  const tk = tokens[pos];
  if (tk.t !== "ident") return { value: null, next: pos + 1 };
  const className = tk.v;
  let i = pos + 1;
  if (tokens[i]?.t !== "lparen") return { value: className, next: i };
  i += 1;
  const args: unknown[] = [];
  if (tokens[i]?.t === "rparen") {
    i += 1;
  } else {
    for (;;) {
      const { value, next } = parseExpr(tokens, i, schema);
      args.push(value);
      i = next;
      const t = tokens[i];
      if (!t) break;
      if (t.t === "comma") {
        i += 1;
        continue;
      }
      if (t.t === "rparen") {
        i += 1;
        break;
      }
      i += 1; // recovery
    }
  }

  const fields = findFieldsForClass(className, schema);
  if (fields && fields.length > 0) {
    const obj: Record<string, unknown> = {};
    for (let k = 0; k < fields.length; k += 1) {
      obj[fields[k]] = args[k] !== undefined ? args[k] : null;
    }
    // Si hay args extra (schema incompleto), guardarlos también.
    if (args.length > fields.length) {
      obj._extraArgs = args.slice(fields.length);
    }
    obj._class = className;
    return { value: obj, next: i };
  }
  return { value: { _class: className, _args: args }, next: i };
}

/**
 * op.gg a veces numera clases duplicadas (`RankEntrie`, `RankEntrie1`) o pluraliza raro.
 * Busca coincidencia exacta primero; si no, prueba variantes sencillas.
 */
function findFieldsForClass(name: string, schema: SchemaMap): string[] | null {
  const exact = schema.get(name);
  if (exact) return exact;
  // quita dígito final
  const stripped = name.replace(/\d+$/, "");
  if (stripped !== name) {
    const v = schema.get(stripped);
    if (v) return v;
  }
  return null;
}

/** Entry point: texto completo op.gg → objeto JS (anidado). */
export function parseOpggClassText(text: string): unknown {
  if (!text || typeof text !== "string") return null;
  const { schemaText, instanceText } = splitSchemaAndInstance(text);
  const schema = parseSchema(schemaText);
  if (!instanceText) return null;
  const tokens = tokenize(instanceText);
  if (tokens.length === 0) return null;
  const { value } = parseExpr(tokens, 0, schema);
  return value;
}

/**
 * Conveniencia: parsea y hace `pluck` del root hacia `data.summoner`.
 * Devuelve `null` si la estructura no casa.
 */
export function parseOpggSummoner(text: string): Record<string, unknown> | null {
  const root = parseOpggClassText(text);
  if (!root || typeof root !== "object") return null;
  const r = root as Record<string, unknown>;
  const data = (r.data ?? null) as Record<string, unknown> | null;
  if (!data) return null;
  const summoner = data.summoner as Record<string, unknown> | null | undefined;
  return summoner ?? null;
}
