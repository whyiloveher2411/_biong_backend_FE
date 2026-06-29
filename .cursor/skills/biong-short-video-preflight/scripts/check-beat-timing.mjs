#!/usr/bin/env node
/**
 * Verify index.html beat timings align with assets/beat-map.json and totalVideoSec.
 *
 * Usage: node check-beat-timing.mjs <project-dir> [--tolerance 1.5]
 */
import fs from "fs";
import path from "path";

const BEAT_MAP_REL = "assets/beat-map.json";
const SYNC_REPORT_REL = "assets/caption-sync-report.json";
const DEFAULT_TOLERANCE_SEC = 1.5;
const DURATION_TOLERANCE_SEC = 0.5;

function parseArgs(argv) {
  const out = { projectDir: "", tolerance: DEFAULT_TOLERANCE_SEC };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--tolerance" && argv[i + 1]) {
      out.tolerance = parseFloat(argv[++i]);
    } else if (!argv[i].startsWith("-") && !out.projectDir) {
      out.projectDir = argv[i];
    }
  }
  return out;
}

function loadTotalVideoSec(projectDir) {
  const reportPath = path.join(projectDir, SYNC_REPORT_REL);
  if (fs.existsSync(reportPath)) {
    try {
      const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
      if (report.totalVideoSec > 0) return report.totalVideoSec;
    } catch {
      /* skip */
    }
  }
  const beatMapPath = path.join(projectDir, BEAT_MAP_REL);
  if (fs.existsSync(beatMapPath)) {
    try {
      const map = JSON.parse(fs.readFileSync(beatMapPath, "utf8"));
      if (map.totalVideoSec > 0) return map.totalVideoSec;
    } catch {
      /* skip */
    }
  }
  return 0;
}

function extractBeatSections(html) {
  const sections = [];
  const re =
    /<section\b[^>]*\bdata-start\s*=\s*["']([^"']+)["'][^>]*\bdata-duration\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const id = tag.match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1] ?? `section_${sections.length}`;
    sections.push({
      id,
      start: parseFloat(m[1]),
      duration: parseFloat(m[2]),
    });
  }
  return sections;
}

function extractNarrationTrack(html) {
  const re = /<audio\b[^>]*data-track-index\s*=\s*["']10["'][^>]*>/i;
  const m = html.match(re);
  if (!m) return null;
  const tag = m[0];
  const duration = tag.match(/data-duration\s*=\s*["']([^"']+)["']/i)?.[1];
  return duration ? parseFloat(duration) : null;
}

function main() {
  const { projectDir: rawDir, tolerance } = parseArgs(process.argv);
  if (!rawDir) {
    console.error("usage: node check-beat-timing.mjs <project-dir> [--tolerance 1.5]");
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);
  const errors = [];
  const warnings = [];

  const indexPath = path.join(projectDir, "index.html");
  const beatMapPath = path.join(projectDir, BEAT_MAP_REL);

  if (!fs.existsSync(indexPath)) {
    console.error("Thiếu index.html");
    process.exit(1);
  }

  if (!fs.existsSync(beatMapPath)) {
    console.error(`Thiếu ${BEAT_MAP_REL} — chạy map-markers-to-timing.mjs trước`);
    process.exit(1);
  }

  const html = fs.readFileSync(indexPath, "utf8");
  const beatMap = JSON.parse(fs.readFileSync(beatMapPath, "utf8"));
  const totalVideoSec = loadTotalVideoSec(projectDir) || beatMap.totalVideoSec;
  const htmlBeats = extractBeatSections(html);
  const mapSections = beatMap.sections ?? [];

  if (!htmlBeats.length) {
    errors.push('index.html: không tìm thấy <section data-start data-duration>');
  }

  if (!mapSections.length) {
    errors.push(`${BEAT_MAP_REL}: sections rỗng`);
  }

  const beatDurationSum = htmlBeats.reduce((s, b) => s + b.duration, 0);
  if (totalVideoSec > 0 && Math.abs(beatDurationSum - totalVideoSec) > DURATION_TOLERANCE_SEC) {
    errors.push(
      `Tổng beat data-duration=${beatDurationSum.toFixed(2)}s lệch totalVideoSec=${totalVideoSec.toFixed(2)}s (>${DURATION_TOLERANCE_SEC}s)`,
    );
  }

  const narrationDur = extractNarrationTrack(html);
  if (narrationDur !== null && totalVideoSec > 0) {
    if (Math.abs(narrationDur - totalVideoSec) > DURATION_TOLERANCE_SEC) {
      warnings.push(
        `Narration track 10 data-duration=${narrationDur}s ≠ totalVideoSec=${totalVideoSec.toFixed(2)}s`,
      );
    }
  }

  const pairCount = Math.min(htmlBeats.length, mapSections.length);
  for (let i = 0; i < pairCount; i++) {
    const htmlBeat = htmlBeats[i];
    const mapSec = mapSections[i];
    const drift = Math.abs(htmlBeat.start - mapSec.startSec);
    if (drift > tolerance) {
      errors.push(
        `Beat #${i + 1} (${htmlBeat.id}): data-start=${htmlBeat.start}s lệch beat-map ${mapSec.startSec}s (${drift.toFixed(2)}s > ${tolerance}s)`,
      );
    }
  }

  if (htmlBeats.length !== mapSections.length) {
    warnings.push(
      `Số beat HTML (${htmlBeats.length}) ≠ beat-map sections (${mapSections.length})`,
    );
  }

  const rootDuration = html.match(
    /<div[^>]*id\s*=\s*["']root["'][^>]*data-duration\s*=\s*["']([^"']+)["']/i,
  )?.[1];
  if (rootDuration && totalVideoSec > 0) {
    const rootDur = parseFloat(rootDuration);
    if (Math.abs(rootDur - totalVideoSec) > DURATION_TOLERANCE_SEC) {
      warnings.push(
        `#root data-duration=${rootDur}s ≠ totalVideoSec=${totalVideoSec.toFixed(2)}s`,
      );
    }
  }

  warnings.forEach((w) => console.warn(`WARN: ${w}`));

  if (errors.length) {
    console.error("\n=== BEAT TIMING FAIL ===\n");
    errors.forEach((e) => console.error(`✗ ${e}`));
    console.error("\nSửa: cập nhật index.html theo assets/beat-map.json");
    process.exit(1);
  }

  console.log(
    `✓ Beat timing OK — ${htmlBeats.length} beats, sum=${beatDurationSum.toFixed(2)}s, totalVideoSec=${totalVideoSec.toFixed(2)}s`,
  );
  process.exit(0);
}

main();
