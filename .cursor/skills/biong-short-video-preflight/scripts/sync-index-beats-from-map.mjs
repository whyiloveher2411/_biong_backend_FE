#!/usr/bin/env node
/**
 * Sync index.html beat-host sections from assets/beat-map.json (data-start/data-duration).
 *
 * Usage: node sync-index-beats-from-map.mjs <project-dir>
 */
import fs from "fs";
import path from "path";

const projectDir = path.resolve(process.argv[2] || "");
if (!projectDir) {
  console.error("usage: node sync-index-beats-from-map.mjs <project-dir>");
  process.exit(1);
}

const indexPath = path.join(projectDir, "index.html");
const beatMapPath = path.join(projectDir, "assets/beat-map.json");

if (!fs.existsSync(indexPath) || !fs.existsSync(beatMapPath)) {
  console.error("Thiếu index.html hoặc assets/beat-map.json");
  process.exit(1);
}

const beatMap = JSON.parse(fs.readFileSync(beatMapPath, "utf8"));
const sections = beatMap.sections ?? [];
let html = fs.readFileSync(indexPath, "utf8");

const beatHostRe =
  /(<section\b[^>]*class="[^"]*beat-host[^"]*"[^>]*\bid="beat-(\d+)"[^>]*)(data-start=")[^"]*(")([^>]*\bdata-duration=")[^"]*(")([^>]*>)/gi;

let idx = 0;
html = html.replace(beatHostRe, (full, prefix, num, ds1, ds2, dd1, dd2, suffix) => {
  const sec = sections[idx];
  idx++;
  if (!sec) return full;
  const start = sec.startSec.toFixed(3);
  const dur = sec.durationSec.toFixed(3);
  return `${prefix}${ds1}${start}${ds2}${dd1}${dur}${dd2}${suffix}`;
});

if (idx !== sections.length) {
  console.warn(
    `[sync-index-beats] WARN: patched ${idx} sections, beat-map has ${sections.length}`,
  );
}

fs.writeFileSync(indexPath, html);
console.log(`[sync-index-beats] synced ${idx} beat-host clips from beat-map.json`);
