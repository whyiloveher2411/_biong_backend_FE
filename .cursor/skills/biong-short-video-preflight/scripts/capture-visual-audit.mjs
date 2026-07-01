#!/usr/bin/env node
/**
 * Capture visual audit frames via hyperframes snapshot.
 * Computes frame count: max(beats * 3, ceil(duration_sec / 2)).
 *
 * Usage:
 *   node capture-visual-audit.mjs <project-dir> [--frames N] [--dry-run]
 *
 * Output:
 *   assets/visual-audit-manifest.json
 *   snapshots/ (hyperframes snapshot output)
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BEAT_MAP_REL = "assets/beat-map.json";
const SYNC_REPORT_REL = "assets/caption-sync-report.json";
const MANIFEST_REL = "assets/visual-audit-manifest.json";
const SNAPSHOTS_DIR = "snapshots";

function parseArgs(argv) {
  const out = { projectDir: "", frames: 0, dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--frames" && argv[i + 1]) {
      out.frames = parseInt(argv[++i], 10);
    } else if (argv[i] === "--dry-run") {
      out.dryRun = true;
    } else if (!argv[i].startsWith("-") && !out.projectDir) {
      out.projectDir = argv[i];
    }
  }
  return out;
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function loadTotalVideoSec(projectDir) {
  const report = loadJson(path.join(projectDir, SYNC_REPORT_REL));
  if (report?.totalVideoSec > 0) return report.totalVideoSec;

  const beatMap = loadJson(path.join(projectDir, BEAT_MAP_REL));
  if (beatMap?.totalVideoSec > 0) return beatMap.totalVideoSec;

  const indexPath = path.join(projectDir, "index.html");
  if (fs.existsSync(indexPath)) {
    const html = fs.readFileSync(indexPath, "utf8");
    const audioMatch = html.match(
      /<audio\b[^>]*data-track-index\s*=\s*["']10["'][^>]*\bdata-duration\s*=\s*["']([^"']+)["']/i
    );
    if (audioMatch) {
      const d = parseFloat(audioMatch[1]);
      if (d > 0) return d;
    }
  }
  return 0;
}

function countBeats(projectDir) {
  const beatMap = loadJson(path.join(projectDir, BEAT_MAP_REL));
  if (Array.isArray(beatMap?.beats) && beatMap.beats.length > 0) {
    return beatMap.beats.length;
  }

  const compsDir = path.join(projectDir, "compositions");
  if (!fs.existsSync(compsDir)) return 0;

  return fs
    .readdirSync(compsDir)
    .filter((f) => /^beat_\d+\.html$/i.test(f)).length;
}

function computeFrameCount(beatCount, durationSec) {
  const fromBeats = beatCount > 0 ? beatCount * 3 : 9;
  const fromDuration = durationSec > 0 ? Math.ceil(durationSec / 2) : 15;
  return Math.max(fromBeats, fromDuration, 9);
}

function buildBeatTimestamps(beatMap, durationSec, frameCount) {
  const beats = Array.isArray(beatMap?.beats) ? beatMap.beats : [];
  if (beats.length === 0 || durationSec <= 0) {
    const step = durationSec > 0 ? durationSec / Math.max(frameCount - 1, 1) : 1;
    return Array.from({ length: frameCount }, (_, i) => ({
      index: i,
      time_sec: Math.round(i * step * 100) / 100,
      beat_id: null,
    }));
  }

  const timestamps = [];
  for (let i = 0; i < frameCount; i++) {
    const t = (durationSec * i) / Math.max(frameCount - 1, 1);
    let beatId = beats[0]?.id ?? beats[0]?.beat_id ?? `beat_1`;
    for (const b of beats) {
      const start = b.start_sec ?? b.start ?? 0;
      const end = start + (b.duration_sec ?? b.duration ?? 0);
      if (t >= start && t < end) {
        beatId = b.id ?? b.beat_id ?? beatId;
        break;
      }
    }
    timestamps.push({
      index: i,
      time_sec: Math.round(t * 100) / 100,
      beat_id: beatId,
    });
  }
  return timestamps;
}

function listSnapshotFiles(projectDir) {
  const snapDir = path.join(projectDir, SNAPSHOTS_DIR);
  if (!fs.existsSync(snapDir)) return [];

  return fs
    .readdirSync(snapDir)
    .filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort()
    .map((f) => path.join(SNAPSHOTS_DIR, f));
}

function runHyperframesSnapshot(projectDir, frameCount) {
  const result = spawnSync(
    "npx",
    ["hyperframes", "snapshot", projectDir, "--frames", String(frameCount)],
    {
      encoding: "utf8",
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  return {
    code: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function main() {
  const { projectDir: rawDir, frames: overrideFrames, dryRun } = parseArgs(process.argv);
  if (!rawDir) {
    console.error("usage: node capture-visual-audit.mjs <project-dir> [--frames N] [--dry-run]");
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);
  if (!fs.existsSync(path.join(projectDir, "index.html"))) {
    console.error(`FAIL: missing index.html in ${projectDir}`);
    process.exit(1);
  }

  const beatCount = countBeats(projectDir);
  const durationSec = loadTotalVideoSec(projectDir);
  const frameCount =
    overrideFrames > 0 ? overrideFrames : computeFrameCount(beatCount, durationSec);

  const beatMap = loadJson(path.join(projectDir, BEAT_MAP_REL));
  const timestamps = buildBeatTimestamps(beatMap, durationSec, frameCount);

  console.log(
    `visual-audit: beats=${beatCount} duration=${durationSec}s frames=${frameCount}`
  );

  if (dryRun) {
    const manifest = {
      dry_run: true,
      beat_count: beatCount,
      duration_sec: durationSec,
      frame_count: frameCount,
      timestamps,
      snapshot_command: `npx hyperframes snapshot ${projectDir} --frames ${frameCount}`,
    };
    console.log(JSON.stringify(manifest, null, 2));
    process.exit(0);
  }

  const snap = runHyperframesSnapshot(projectDir, frameCount);
  if (snap.code !== 0) {
    console.error(snap.stderr || snap.stdout || "hyperframes snapshot failed");
    process.exit(snap.code || 1);
  }

  const snapshotFiles = listSnapshotFiles(projectDir);
  const contactSheet = fs.existsSync(path.join(projectDir, SNAPSHOTS_DIR, "contact-sheet.jpg"))
    ? path.join(SNAPSHOTS_DIR, "contact-sheet.jpg")
    : null;

  const manifest = {
    captured_at: new Date().toISOString(),
    beat_count: beatCount,
    duration_sec: durationSec,
    frame_count: frameCount,
    timestamps,
    snapshots_dir: SNAPSHOTS_DIR,
    snapshot_files: snapshotFiles,
    contact_sheet: contactSheet,
    descriptions_md: fs.existsSync(path.join(projectDir, SNAPSHOTS_DIR, "descriptions.md"))
      ? path.join(SNAPSHOTS_DIR, "descriptions.md")
      : null,
    snapshot_command: `npx hyperframes snapshot ${projectDir} --frames ${frameCount}`,
  };

  const assetsDir = path.join(projectDir, "assets");
  fs.mkdirSync(assetsDir, { recursive: true });
  const manifestPath = path.join(assetsDir, "visual-audit-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`OK: wrote ${manifestPath}`);
  console.log(`OK: ${snapshotFiles.length} snapshot file(s)`);
  if (contactSheet) console.log(`OK: contact-sheet ${contactSheet}`);

  process.exit(0);
}

main();
