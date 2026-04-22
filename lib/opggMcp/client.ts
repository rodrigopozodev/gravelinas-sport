import "server-only";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import { parseOpggClassText } from "@/lib/opggMcp/classTextParser";

/**
 * Cliente MCP oficial op.gg (https://mcp-api.op.gg/mcp). Streamable HTTP (JSON-RPC stateful).
 * Reutilizar entre llamadas dentro de un mismo request para no abrir una sesión MCP por tool.
 * Llama `closeOpggMcp()` al terminar (p. ej. `finally` del route handler).
 */
const OPGG_MCP_URL = new URL("https://mcp-api.op.gg/mcp");

export type OpggMcpToolContent = { type?: string; text?: string };
export type OpggMcpToolResult = {
  content?: OpggMcpToolContent[];
  isError?: boolean;
};

type CachedConn = { client: Client; transport: StreamableHTTPClientTransport };

let cached: CachedConn | null = null;
let connectingPromise: Promise<CachedConn> | null = null;

async function doConnect(): Promise<CachedConn> {
  const transport = new StreamableHTTPClientTransport(OPGG_MCP_URL);
  const client = new Client(
    { name: "gravelinas-opgg", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(transport);
  return { client, transport };
}

async function getConn(): Promise<CachedConn> {
  if (cached) return cached;
  if (connectingPromise) return connectingPromise;
  connectingPromise = doConnect();
  try {
    cached = await connectingPromise;
    return cached;
  } finally {
    connectingPromise = null;
  }
}

export async function closeOpggMcp(): Promise<void> {
  const c = cached;
  cached = null;
  if (!c) return;
  try {
    await c.transport.close();
  } catch {
    // ignorar fallo al cerrar (transport ya muerto).
  }
}

/** Lista tools disponibles del servidor MCP op.gg (útil para debug y tolerar nombres snake/kebab). */
export async function listOpggMcpTools(): Promise<string[]> {
  const { client } = await getConn();
  const res = await client.listTools();
  const tools = (res?.tools ?? []) as Array<{ name?: string }>;
  return tools.map((t) => t.name ?? "").filter((x) => x.length > 0);
}

function extractJsonText(content: OpggMcpToolContent[] | undefined): string {
  if (!content || content.length === 0) return "";
  const t = content.find((c) => c.type === "text" && typeof c.text === "string");
  if (t?.text) return t.text;
  return content[0]?.text ?? "";
}

/**
 * Llama una tool MCP op.gg; intenta parsear texto como JSON. Si el nombre exacto no existe,
 * busca alias snake/kebab equivalentes vía `listTools()` y reintenta una vez.
 */
export async function callOpggMcpTool<T = unknown>(
  name: string,
  args: Record<string, unknown>
): Promise<T> {
  const { client } = await getConn();

  const tryCall = async (toolName: string): Promise<T> => {
    const res = (await client.callTool({ name: toolName, arguments: args })) as OpggMcpToolResult;
    if (res.isError) {
      const msg = res.content?.map((c) => c.text ?? "").join("\n") ?? `MCP error ${toolName}`;
      throw new Error(`op.gg MCP ${toolName}: ${msg}`);
    }
    const txt = extractJsonText(res.content);
    if (!txt) return {} as T;
    // 1) intento JSON real.
    try {
      return JSON.parse(txt) as T;
    } catch {
      /* seguimos */
    }
    // 2) formato class/schema op.gg (`class X: a,b\n\n Root(Nested(...))`).
    if (/^class\s+\w+\s*:/m.test(txt) || /^\w+\s*\(/m.test(txt)) {
      const parsed = parseOpggClassText(txt);
      if (parsed != null) return parsed as T;
    }
    // 3) texto plano → devolver tal cual.
    return txt as unknown as T;
  };

  try {
    return await tryCall(name);
  } catch (first) {
    // Fallback: listar tools y buscar alias (snake ↔ kebab, con/sin prefijo lol).
    let tools: string[] = [];
    try {
      tools = await listOpggMcpTools();
    } catch {
      throw first;
    }
    const alt = findAlternativeToolName(name, tools);
    if (!alt) throw first;
    return await tryCall(alt);
  }
}

function findAlternativeToolName(requested: string, available: string[]): string | null {
  if (available.includes(requested)) return requested;
  const normalize = (s: string) => s.toLowerCase().replace(/[-_]/g, "");
  const target = normalize(requested);
  for (const t of available) {
    if (normalize(t) === target) return t;
  }
  return null;
}
