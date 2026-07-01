#!/usr/bin/env node
/**
 * Fixture — validate evolution-memory.md structure and visual-audit-report schema.
 * Run: node evolution-pipeline-format.test.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const MEMORY_PATH = path.join(
  REPO_ROOT,
  ".cursor/skills/biong-short-video-hyperframes/references/evolution-memory.md"
);
const FIXTURE = path.join(__dirname, "fixtures", "visual-pipeline-minimal");

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

function testEvolutionMemoryStructure() {
  assert(fs.existsSync(MEMORY_PATH), `missing ${MEMORY_PATH}`);
  const content = fs.readFileSync(MEMORY_PATH, "utf8");

  assert(content.includes("## 1. Premium code blocks"), "memory missing premium blocks section");
  assert(content.includes("## 2. Lessons learned"), "memory missing lessons section");
  assert(content.includes("## 3. Visual evolution log"), "memory missing evolution log section");
  assert(content.includes("timeline_pattern_c"), "memory missing seeded lesson timeline_pattern_c");
  assert(content.includes("video_25"), "memory missing seeded lesson video_25");
  assert(content.includes("overlay_z_index"), "memory missing seeded lesson overlay_z_index");
  assert(content.includes("[glass_ui_card]"), "memory missing seeded premium block glass_ui_card");
  assert(content.includes("Cấm"), "memory should document forbidden edits");

  console.log("OK: evolution-memory.md structure");
}

function testVisualAuditReportSchema() {
  const sample = {
    short_video_id: 9,
    captured_at: new Date().toISOString(),
    frame_count: 18,
    fix_loops_used: 0,
    layout_pass: true,
    aesthetic_score: 8,
    issues: [
      {
        beat: "beat_2",
        time_sec: 12.5,
        type: "text_overflow",
        fixed: true,
        evidence: "snapshots/frame_012.png",
      },
    ],
    beat_verdicts: [{ beat: "beat_1", verdict: "PASS" }],
    premium_patterns_extracted: ["glass_ui_card"],
    memory_appended: true,
  };

  assert(typeof sample.short_video_id === "number", "report.short_video_id must be number");
  assert(typeof sample.aesthetic_score === "number", "report.aesthetic_score must be number");
  assert(Array.isArray(sample.issues), "report.issues must be array");
  assert(typeof sample.layout_pass === "boolean", "report.layout_pass must be boolean");
  assert(typeof sample.memory_appended === "boolean", "report.memory_appended must be boolean");

  const reportPath = path.join(FIXTURE, "assets", "visual-audit-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(sample, null, 2) + "\n");
  const loaded = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  assert(loaded.aesthetic_score === 8, "round-trip visual-audit-report.json failed");

  console.log("OK: visual-audit-report.json schema");
}

function testCaptureVisualAuditDryRun() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "hf-visual-audit-"));
  const beatMap = {
    totalVideoSec: 30,
    beats: [
      { id: "beat_1", start_sec: 0, duration_sec: 10 },
      { id: "beat_2", start_sec: 10, duration_sec: 10 },
      { id: "beat_3", start_sec: 20, duration_sec: 10 },
    ],
  };
  fs.mkdirSync(path.join(tmpDir, "assets"), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, "index.html"), "<html><body></body></html>");
  fs.writeFileSync(path.join(tmpDir, "assets", "beat-map.json"), JSON.stringify(beatMap, null, 2));
  fs.writeFileSync(
    path.join(tmpDir, "assets", "caption-sync-report.json"),
    JSON.stringify({ totalVideoSec: 30 }, null, 2)
  );

  const r = spawnSync(
    "node",
    [path.join(__dirname, "capture-visual-audit.mjs"), tmpDir, "--dry-run"],
    { encoding: "utf8" }
  );
  assert(r.status === 0, `capture-visual-audit dry-run failed: ${r.stderr || r.stdout}`);

  const jsonStart = (r.stdout || "").indexOf("{");
  assert(jsonStart >= 0, "dry-run stdout missing JSON manifest");
  const manifest = JSON.parse((r.stdout || "").slice(jsonStart));
  assert(manifest.frame_count === 15, `expected 15 frames for 30s/3 beats, got ${manifest.frame_count}`);
  assert(manifest.beat_count === 3, `expected 3 beats, got ${manifest.beat_count}`);
  assert(Array.isArray(manifest.timestamps), "manifest.timestamps must be array");

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log("OK: capture-visual-audit.mjs dry-run manifest");
}

testEvolutionMemoryStructure();
testVisualAuditReportSchema();
testCaptureVisualAuditDryRun();
console.log("ALL evolution-pipeline-format tests passed");
