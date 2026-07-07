import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const PREFLIGHT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.cursor/skills/biong-short-video-preflight/scripts",
);

export function runNodeScript(scriptName, projectDir, extraArgs = [], label = scriptName) {
  const scriptPath = path.join(PREFLIGHT, scriptName);
  console.log(`\n▶ ${label}`);
  const result = spawnSync("node", [scriptPath, projectDir, ...extraArgs], {
    stdio: "inherit",
    cwd: path.resolve(projectDir, "../.."),
  });
  if (result.status !== 0) {
    throw new Error(`${label} exit ${result.status}`);
  }
}

export function runImportHtmlPreflight(projectDir, { strictCaption = true } = {}) {
  const checks = [
    ["check-import-html-beat-render.mjs", []],
    ["check-overlay-stack.mjs", []],
    ["verify-caption-sync.mjs", strictCaption ? ["--strict"] : []],
    ["check-beat-timing.mjs", []],
    ["check-media-stack.mjs", ["--strict"]],
    ["check-continuous-motion.mjs", []],
  ];

  for (const [script, args] of checks) {
    runNodeScript(script, projectDir, args, script);
  }
}

export { PREFLIGHT };
