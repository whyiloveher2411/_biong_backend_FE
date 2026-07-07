#!/usr/bin/env node
/**
 * Sync index.html beat-host sections from assets/beat-map.json (data-start/data-duration).
 * Dùng snap timing để tránh overlapping_clips_same_track (IEEE float).
 *
 * Usage: node sync-index-beats-from-map.mjs <project-dir>
 */
import fs from "fs";
import path from "path";

function snapBeatSectionsForIndex(sections, totalVideoSec) {
  const list = Array.isArray(sections) ? sections : [];
  const total = Math.round(Number(totalVideoSec || 0) * 1000) / 1000;
  const out = [];

  for (let i = 0; i < list.length; i++) {
    const sec = list[i];
    const start = Math.round(Number(sec.startSec ?? 0) * 1000) / 1000;
    const nextStart =
      i < list.length - 1
        ? Math.round(Number(list[i + 1].startSec) * 1000) / 1000
        : total;
    let dur = Math.round((nextStart - start) * 1000) / 1000;
    if (i < list.length - 1 && dur > 0.002) {
      dur = Math.round((dur - 0.001) * 1000) / 1000;
    }
    out.push({ ...sec, startSec: start, durationSec: Math.max(0.001, dur) });
  }

  return out;
}

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
const totalVideoSec = Number(beatMap.totalVideoSec || 0);
const sections = snapBeatSectionsForIndex(beatMap.sections ?? [], totalVideoSec);
let html = fs.readFileSync(indexPath, "utf8");

const beatHostRe =
  /(<section\b(?=[^>]*\bclass="[^"]*beat-host[^"]*")(?=[^>]*\bid="beat-(\d+)")[^>]*)(data-start=")[^"]*(")([^>]*\bdata-duration=")[^"]*(")([^>]*>)/gi;

let idx = 0;
html = html.replace(beatHostRe, (full, prefix, num, ds1, ds2, dd1, dd2, suffix) => {
  const sec = sections[idx];
  idx++;
  if (!sec) return full;
  const start = Number(sec.startSec).toFixed(3);
  const dur = Number(sec.durationSec).toFixed(3);
  return `${prefix}${ds1}${start}${ds2}${dd1}${dur}${dd2}${suffix}`;
});

if (idx !== sections.length) {
  console.warn(
    `[sync-index-beats] WARN: patched ${idx} sections, beat-map has ${sections.length}`,
  );
}

fs.writeFileSync(indexPath, html);
console.log(`[sync-index-beats] synced ${idx} beat-host clips from beat-map.json`);
