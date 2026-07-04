#!/usr/bin/env node
/**
 * Preflight: beat import_html phải render-ready (<template> + window.__timelines).
 *
 * Usage: node check-import-html-beat-render.mjs <project-dir>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  beatIdFromFilename,
  checkImportHtmlBeatFile,
  isImportHtmlProject,
} from "./lib/import-html-beat-render.mjs";

function main() {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error("usage: node check-import-html-beat-render.mjs <project-dir>");
    process.exit(1);
  }

  const root = path.resolve(projectDir);
  if (!isImportHtmlProject(root)) {
    console.log("check-import-html-beat-render: skip (render_mode !== import_html)");
    process.exit(0);
  }

  const compDir = path.join(root, "compositions");
  if (!fs.existsSync(compDir)) {
    console.error("FAIL: missing compositions/");
    process.exit(1);
  }

  const errors = [];
  for (const name of fs.readdirSync(compDir)) {
    if (!beatIdFromFilename(name)) continue;
    const content = fs.readFileSync(path.join(compDir, name), "utf8");
    errors.push(...checkImportHtmlBeatFile(name, content));
  }

  if (!errors.length) {
    const beatCount = fs
      .readdirSync(compDir)
      .filter((n) => beatIdFromFilename(n)).length;
    console.log(`check-import-html-beat-render: OK (${beatCount} beat)`);
    process.exit(0);
  }

  console.error("\n=== IMPORT HTML BEAT RENDER FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
