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
    console.error(`Thiếu ${BEAT_MAP_REL} — chạy map-shot-plan-to-beat-map.mjs trước`);
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
    const durDrift = Math.abs(htmlBeat.duration - mapSec.durationSec);
    if (durDrift > DURATION_TOLERANCE_SEC) {
      errors.push(
        `Beat #${i + 1} (${htmlBeat.id}): data-duration=${htmlBeat.duration}s lệch beat-map ${mapSec.durationSec}s`,
      );
    }
  }

  for (let i = 0; i < htmlBeats.length - 1; i++) {
    const endA = htmlBeats[i].start + htmlBeats[i].duration;
    const startB = htmlBeats[i + 1].start;
    if (startB < endA - 0.05) {
      errors.push(
        `Beat overlap: #${i + 1} (${htmlBeats[i].id}) kết thúc ~${endA.toFixed(2)}s nhưng #${i + 2} (${htmlBeats[i + 1].id}) bắt đầu ${startB}s — chồng nội dung ghost. Chạy map-shot-plan-to-beat-map + sync-index-beats-from-map`,
      );
    }
  }

  for (let i = 0; i < mapSections.length - 1; i++) {
    if (mapSections[i + 1].startSec < mapSections[i].endSec - 0.05) {
      errors.push(
        `beat-map overlap: section #${i + 2} start ${mapSections[i + 1].startSec}s < section #${i + 1} end ${mapSections[i].endSec}s`,
      );
    }
  }

  if (htmlBeats.length !== mapSections.length) {
    warnings.push(
      `Số beat HTML (${htmlBeats.length}) ≠ beat-map sections (${mapSections.length})`,
    );
  }

  const MIN_BEAT_DURATION_SEC = 5.0;
  const MAX_BEAT_DURATION_SEC = 20.0;
  const lastBeatIndex = htmlBeats.length - 1;
  for (let i = 0; i < htmlBeats.length; i++) {
    const beat = htmlBeats[i];
    const isLastBeat = i === lastBeatIndex;
    if (beat.duration < MIN_BEAT_DURATION_SEC && !(isLastBeat && beat.duration > 0)) {
      errors.push(
        `${beat.id}: data-duration=${beat.duration.toFixed(2)}s < 5s — gộp với beat liền kề (visual-shot-plan.md)`,
      );
    } else if (
      beat.duration < MIN_BEAT_DURATION_SEC &&
      isLastBeat &&
      beat.duration > 0
    ) {
      warnings.push(
        `${beat.id}: beat cuối ${beat.duration.toFixed(2)}s < 5s — chấp nhận nếu dư audio sau khi chia`,
      );
    }
    if (beat.duration > MAX_BEAT_DURATION_SEC) {
      errors.push(
        `${beat.id}: data-duration=${beat.duration.toFixed(2)}s > 20s — tách thành ${Math.ceil(beat.duration / MAX_BEAT_DURATION_SEC)} beat (visual-shot-plan.md)`,
      );
    }
  }
  const mapLastIndex = mapSections.length - 1;
  for (let i = 0; i < mapSections.length; i++) {
    const mapSec = mapSections[i];
    const dur = mapSec.durationSec ?? 0;
    const isLastBeat = i === mapLastIndex;
    if (dur < MIN_BEAT_DURATION_SEC && !(isLastBeat && dur > 0)) {
      errors.push(
        `${mapSec.id ?? "beat"}: beat-map duration ${dur.toFixed(2)}s < 5s — gộp shot-plan`,
      );
    } else if (dur < MIN_BEAT_DURATION_SEC && isLastBeat && dur > 0) {
      warnings.push(
        `${mapSec.id ?? "beat"}: beat cuối ${dur.toFixed(2)}s < 5s — chấp nhận nếu dư audio`,
      );
    }
    if (dur > MAX_BEAT_DURATION_SEC) {
      errors.push(
        `${mapSec.id ?? "beat"}: beat-map duration ${dur.toFixed(2)}s > 20s — tách shot-plan`,
      );
    }
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
