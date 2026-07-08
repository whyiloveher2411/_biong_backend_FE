#!/usr/bin/env node
/**
 * Thu thập lỗi beat import_html từ hyperframes lint + checkImportHtmlBeatFile.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  beatIdFromFilename,
  checkImportHtmlBeatFile,
} from "../../.cursor/skills/biong-short-video-preflight/scripts/lib/import-html-beat-render.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function beatIdFromLintFile(filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  const match = normalized.match(/compositions\/(beat_\d+)\.html$/i);
  return match ? match[1] : "";
}

function mergeBeatError(beatErrors, beatId, { message, code }) {
  if (!beatId || !message) return;
  const existing = beatErrors[beatId];
  if (existing) {
    beatErrors[beatId] = {
      message: `${existing.message}; ${message}`,
      code: existing.code || code || "",
    };
    return;
  }
  beatErrors[beatId] = { message, code: code || "" };
}

export function collectBeatRenderCheckErrors(projectDir) {
  const beatErrors = {};
  const compDir = path.join(projectDir, "compositions");
  if (!fs.existsSync(compDir)) {
    return beatErrors;
  }

  for (const name of fs.readdirSync(compDir)) {
    if (!beatIdFromFilename(name)) continue;
    const content = fs.readFileSync(path.join(compDir, name), "utf8");
    const fileErrors = checkImportHtmlBeatFile(name, content);
    for (const err of fileErrors) {
      const beatId = beatIdFromFilename(name);
      mergeBeatError(beatErrors, beatId, {
        message: err.replace(/^beat_\d+\.html:\s*/i, ""),
        code: "beat_render_check",
      });
    }
  }

  return beatErrors;
}

export function collectHyperframesLintBeatErrors(projectDir) {
  const beatErrors = {};
  const result = spawnSync(
    "npx",
    ["--yes", "hyperframes@0.7.14", "lint", "--strict", "--json"],
    { cwd: projectDir, encoding: "utf8" },
  );

  const stdout = String(result.stdout || "");
  if (!stdout.trim()) {
    return beatErrors;
  }

  let payload;
  try {
    payload = JSON.parse(stdout);
  } catch {
    return beatErrors;
  }

  const findings = Array.isArray(payload?.findings) ? payload.findings : [];
  for (const finding of findings) {
    if (String(finding?.severity || "").toLowerCase() !== "error") continue;
    const beatId = beatIdFromLintFile(finding.file);
    if (!beatId) continue;
    const message = String(finding.message || finding.code || "Lỗi hyperframes lint").trim();
    const code = String(finding.code || "").trim();
    mergeBeatError(beatErrors, beatId, { message, code });
  }

  return beatErrors;
}

export function collectImportHtmlBeatErrors(projectDir) {
  const beatErrors = {
    ...collectBeatRenderCheckErrors(projectDir),
  };
  const lintErrors = collectHyperframesLintBeatErrors(projectDir);
  for (const [beatId, entry] of Object.entries(lintErrors)) {
    mergeBeatError(beatErrors, beatId, entry);
  }

  const ids = Object.keys(beatErrors).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const summary =
    ids.length > 0
      ? `Beat lỗi: ${ids.join(", ")}`
      : "";

  return { beatErrors, summary, beatIds: ids };
}

function main() {
  const projectDir = path.resolve(process.argv[2] || "");
  if (!projectDir) {
    console.error("usage: node collect-import-html-beat-errors.mjs <project-dir>");
    process.exit(1);
  }

  const { beatErrors, summary, beatIds } = collectImportHtmlBeatErrors(projectDir);
  console.log(
    JSON.stringify({
      ok: beatIds.length === 0,
      beat_errors: beatErrors,
      beat_ids: beatIds,
      summary,
    }),
  );
  process.exit(beatIds.length > 0 ? 1 : 0);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
