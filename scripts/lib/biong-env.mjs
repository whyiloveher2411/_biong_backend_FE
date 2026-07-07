import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "../..");

export const DEFAULT_API_BASE_URL = "http://127.0.0.1:9999";
export const DEFAULT_MCP_TOKEN =
  "7f56fe5029955c86e583238300f2f223aee2f85fa6409619bf88c4824d12ff48";

function readMcpTokenFromCursorConfig(repoRoot) {
  const candidates = [
    path.join(repoRoot, ".cursor/mcp.json"),
    path.join(repoRoot, ".codex/mcp.json"),
  ];
  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }
    try {
      const raw = JSON.parse(readFileSync(filePath, "utf8"));
      const servers = raw?.mcpServers || {};
      for (const server of Object.values(servers)) {
        const token = String(server?.env?.BIONG_MCP_TOKEN || "").trim();
        if (token) {
          return token;
        }
      }
    } catch {
      // ignore invalid config
    }
  }
  return "";
}

export function resolveApiBaseUrl(override = "") {
  const value = String(override || process.env.BIONG_API_BASE_URL || DEFAULT_API_BASE_URL).trim();
  return value.replace(/\/+$/, "");
}

export function resolveMcpToken(override = "", repoRoot = REPO_ROOT) {
  const fromArg = String(override || "").trim();
  if (fromArg) {
    return fromArg;
  }
  const fromEnv = String(process.env.BIONG_MCP_TOKEN || "").trim();
  if (fromEnv) {
    return fromEnv;
  }
  const fromConfig = readMcpTokenFromCursorConfig(repoRoot);
  if (fromConfig) {
    return fromConfig;
  }
  return DEFAULT_MCP_TOKEN;
}

/** Đảm bảo child process spawn kế thừa BIONG_API_BASE_URL + BIONG_MCP_TOKEN. */
export function hydrateBiongEnv(repoRoot = REPO_ROOT) {
  if (!String(process.env.BIONG_API_BASE_URL || "").trim()) {
    process.env.BIONG_API_BASE_URL = resolveApiBaseUrl();
  }
  if (!String(process.env.BIONG_MCP_TOKEN || "").trim()) {
    process.env.BIONG_MCP_TOKEN = resolveMcpToken("", repoRoot);
  }
}
