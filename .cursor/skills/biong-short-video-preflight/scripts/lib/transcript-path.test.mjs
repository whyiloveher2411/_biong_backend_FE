import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import {
  resolveTranscriptPath,
  deleteStaleTranscripts,
  canonicalTranscriptPath,
} from "./transcript-path.mjs";

describe("transcript-path", () => {
  it("prefers canonical when manifest exists", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tr-path-"));
    const canonical = canonicalTranscriptPath(tmp);
    const legacy = path.join(tmp, "assets/audio/transcript.json");

    fs.mkdirSync(path.dirname(legacy), { recursive: true });
    fs.writeFileSync(legacy, JSON.stringify([{ text: "old", start: 0, end: 1 }]));
    fs.writeFileSync(canonical, JSON.stringify([{ text: "new", start: 0, end: 1 }]));
    fs.mkdirSync(path.join(tmp, "assets"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "assets/transcribe-manifest.json"),
      JSON.stringify({ model: "small", language: "vi" }),
    );

    const resolved = resolveTranscriptPath(tmp);
    assert.equal(resolved, canonical);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("picks newest mtime without manifest", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tr-path-"));
    const root = path.join(tmp, "transcript.json");
    const nested = path.join(tmp, "assets/audio/transcript.json");

    fs.mkdirSync(path.dirname(nested), { recursive: true });
    fs.writeFileSync(root, JSON.stringify([{ text: "old", start: 0, end: 1 }]));
    fs.writeFileSync(nested, JSON.stringify([{ text: "newer", start: 0, end: 1 }]));

    const oldTime = new Date("2020-01-01");
    const newTime = new Date("2025-01-01");
    fs.utimesSync(root, oldTime, oldTime);
    fs.utimesSync(nested, newTime, newTime);

    const resolved = resolveTranscriptPath(tmp);
    assert.equal(resolved, nested);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("deleteStaleTranscripts removes all candidates", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tr-del-"));
    const paths = [
      path.join(tmp, "transcript.json"),
      path.join(tmp, "assets/transcript.json"),
      path.join(tmp, "assets/audio/transcript.json"),
    ];
    for (const p of paths) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, "[]");
    }
    const removed = deleteStaleTranscripts(tmp);
    assert.equal(removed.length, 3);
    for (const p of paths) {
      assert.equal(fs.existsSync(p), false);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
