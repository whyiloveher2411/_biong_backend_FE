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
  resolveBeatSeekBridgeFromMap,
} from "./lib/import-html-beat-render.mjs";

function loadBeatMapSections(projectDir) {
  const candidates = [
    path.join(projectDir, "assets/beat-map.json"),
    path.join(projectDir, "beat-map.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const sections = data?.sections || data?.beat_map?.sections;
      if (Array.isArray(sections)) return sections;
    } catch {
      /* skip */
    }
  }
  return [];
}

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

  const sections = loadBeatMapSections(root);
  const expectedIds = new Set(
    sections
      .map((s) => String(s.id || s.beat_id || "").trim())
      .filter(Boolean),
  );
  const errors = [];
  for (const name of fs.readdirSync(compDir)) {
    if (!beatIdFromFilename(name)) continue;
    const beatId = beatIdFromFilename(name);
    // Chỉ check beat trong beat-map — bỏ qua file thừa từ lần render trước.
    if (expectedIds.size > 0 && !expectedIds.has(beatId)) continue;
    const content = fs.readFileSync(path.join(compDir, name), "utf8");
    const seekBridge = resolveBeatSeekBridgeFromMap(sections, beatId);
    errors.push(...checkImportHtmlBeatFile(name, content, { seekBridge }));
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
