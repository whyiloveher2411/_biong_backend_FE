#!/usr/bin/env node
/**
 * Preflight: ambient timeline window.__timelines["ambient"] required.
 *
 * Usage: node check-continuous-motion.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-continuous-motion.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

if (!exists("index.html")) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const indexHtml = read("index.html");
const ambientHtml = exists("compositions/ambient-layer.html")
  ? read("compositions/ambient-layer.html")
  : "";

const bundle = indexHtml + ambientHtml;

if (!/ambient-layer\.html|hf-ambient-layer/i.test(indexHtml)) {
  errors.push("index.html: thiếu host compositions/ambient-layer.html");
}

if (!exists("compositions/ambient-layer.html")) {
  errors.push("missing compositions/ambient-layer.html");
}

const hasAmbientRegistry =
  /window\.__timelines\s*\[\s*["']ambient["']\s*\]/i.test(bundle) ||
  /window\.__timelines\.ambient/i.test(bundle);

if (!hasAmbientRegistry) {
  errors.push(
    'missing window.__timelines["ambient"] — invoke /continuous-motion',
  );
}

const hasRepeat =
  /repeat\s*:\s*-1/i.test(bundle) ||
  /repeat\s*:\s*"-1"/i.test(bundle) ||
  (/yoyo\s*:\s*true/i.test(bundle) && /repeat\s*:\s*[1-9]\d+/i.test(bundle));

if (!hasRepeat) {
  errors.push("ambient timeline: thiếu repeat: -1 trên ambient tweens/timeline");
}

const ambientPatterns = [
  /parallax|ambient-parallax|fromTo\s*\(\s*["']#ambient/i,
  /yoyo\s*:\s*true/i,
  /sine\.inOut/i,
  /grain|shimmer|orb/i,
];
const patternHits = ambientPatterns.filter((re) => re.test(bundle)).length;
if (patternHits < 2) {
  errors.push(
    `ambient layer: cần ≥2 motion patterns (parallax/breathe/grain/orb) — thấy ${patternHits}`,
  );
}

if (errors.length) {
  errors.forEach((e) => console.error("FAIL:", e));
  console.error(
    "\nĐọc: .cursor/skills/continuous-motion/SKILL.md + continuous-motion-patterns.md",
  );
  process.exit(1);
}

console.log("check-continuous-motion: OK");
process.exit(0);
