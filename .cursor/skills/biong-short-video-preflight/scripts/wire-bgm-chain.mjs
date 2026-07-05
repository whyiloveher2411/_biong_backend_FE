#!/usr/bin/env node
/**
 * Wire BGM chain — ffprobe + sequential segments + crossfade volume trên main timeline.
 *
 * Usage: node wire-bgm-chain.mjs <project-dir> [--crossfade=0.5] [--volume=0.3]
 */
import fs from "fs";
import path from "path";
import {
  DEFAULT_BGM_VOLUME,
  DEFAULT_CROSSFADE_SEC,
  buildScheduledChain,
  chainCoverageOk,
  loadOrBuildManifest,
  parseTotalVideoSec,
  patchIndexHtml,
  writeManifest,
} from "./lib/bgm-chain.mjs";

const args = process.argv.slice(2);
const crossfadeArg = args.find((a) => a.startsWith("--crossfade="));
const volumeArg = args.find((a) => a.startsWith("--volume="));
const crossfadeSec = crossfadeArg
  ? parseFloat(crossfadeArg.split("=")[1])
  : DEFAULT_CROSSFADE_SEC;
const volume = volumeArg ? parseFloat(volumeArg.split("=")[1]) : DEFAULT_BGM_VOLUME;
const projectDir = path.resolve(args.find((a) => !a.startsWith("-")) || "");

if (!projectDir) {
  console.error(
    "usage: node wire-bgm-chain.mjs <project-dir> [--crossfade=0.5] [--volume=0.3]",
  );
  process.exit(1);
}

const indexPath = path.join(projectDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("missing index.html");
  process.exit(1);
}

const totalVideoSec = parseTotalVideoSec(projectDir);
if (totalVideoSec <= 0) {
  console.error("wire-bgm-chain: không xác định được totalVideoSec");
  process.exit(1);
}

let manifest;
try {
  manifest = loadOrBuildManifest(projectDir, { totalVideoSec, crossfadeSec });
} catch (err) {
  console.error(`wire-bgm-chain: ${err.message}`);
  process.exit(1);
}

manifest.volume = volume;
manifest.totalVideoSec = totalVideoSec;

let chain;
try {
  chain = buildScheduledChain(manifest);
} catch (err) {
  console.error(`wire-bgm-chain: ${err.message}`);
  process.exit(1);
}

if (!chainCoverageOk(chain.scheduled, totalVideoSec)) {
  console.error(
    `wire-bgm-chain: coverage ${chain.coveredSec}s < totalVideoSec=${totalVideoSec}s — thêm BGM segment (search_bgm limit cao hơn)`,
  );
  process.exit(1);
}

let html = fs.readFileSync(indexPath, "utf8");
try {
  html = patchIndexHtml(html, chain.scheduled, chain.crossfadeSec, chain.volume);
} catch (err) {
  console.error(`wire-bgm-chain: ${err.message}`);
  process.exit(1);
}

fs.writeFileSync(indexPath, html);
writeManifest(projectDir, chain);

console.log(
  `[wire-bgm-chain] ${chain.scheduled.length} segment(s), covered=${chain.coveredSec}s / ${totalVideoSec}s, crossfade=${chain.crossfadeSec}s`,
);
for (const s of chain.scheduled) {
  console.log(
    `  ${s.id} track ${s.trackIndex} start=${s.startSec}s dur=${s.durationSec}s file=${s.file}`,
  );
}
