import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import os from "os";
import path from "path";
import { spawnSync } from "child_process";

import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BOOTSTRAP = path.join(__dirname, "bootstrap-phase2-assets.mjs");

describe("bootstrap-phase2-assets", () => {
  it("writes audio-script.txt and agent-metadata.json from snapshot", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bootstrap-"));
    const snapshot = {
      lang: "en",
      audio_script: "[BGM: lofi] Hello world test script",
      audio_script_metadata: {
        language: "en",
        markers: [{ time: 0, text: "Hello world", section: "hook" }],
        timeline: { hook_end: 5, agitate_end: 20, solve_end: 80, total: 90 },
        estimated_duration_sec: 90,
      },
    };
    fs.mkdirSync(path.join(tmp, "assets"), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, "assets/get-context-snapshot.json"),
      JSON.stringify(snapshot),
    );

    const result = spawnSync(process.execPath, [BOOTSTRAP, tmp], {
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const script = fs.readFileSync(path.join(tmp, "assets/audio-script.txt"), "utf8");
    const meta = JSON.parse(
      fs.readFileSync(path.join(tmp, "assets/agent-metadata.json"), "utf8"),
    );

    assert.ok(script.includes("Hello world"));
    assert.equal(meta.language, "en");
    assert.equal(meta.markers.length, 1);
    assert.equal(meta.timeline.total, 90);

    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
