#!/usr/bin/env node
/**
 * Unit tests for check-typography-spacing.mjs
 * Run: node check-typography-spacing.test.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(__dirname, "check-typography-spacing.mjs");
const TMP = path.join(__dirname, ".tmp-typography-spacing-test");

function run(dir) {
  const r = spawnSync("node", [SCRIPT, dir], { encoding: "utf8" });
  return { code: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
}

function writeBeat(html) {
  fs.mkdirSync(path.join(TMP, "compositions"), { recursive: true });
  fs.writeFileSync(path.join(TMP, "compositions", "beat_1.html"), html);
}

function assertFail(label, html) {
  fs.rmSync(TMP, { recursive: true, force: true });
  writeBeat(html);
  const { code } = run(TMP);
  if (code === 0) {
    console.error(`FAIL ${label}: expected exit 1`);
    process.exit(1);
  }
  console.log(`OK fail: ${label}`);
}

function assertPass(label, html) {
  fs.rmSync(TMP, { recursive: true, force: true });
  writeBeat(html);
  const { code, out } = run(TMP);
  if (code !== 0) {
    console.error(`FAIL ${label}: expected exit 0\n${out}`);
    process.exit(1);
  }
  console.log(`OK pass: ${label}`);
}

const goodBeat = `<!DOCTYPE html><html><head><style>
.hero{font-size:72px}.card-title{font-size:36px}.card-body{font-size:28px}
.ui-card{border-radius:24px;backdrop-filter:blur(12px);box-shadow:0 25px 50px -12px rgba(0,0,0,0.5)}
.bento-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}
</style></head><body>
<div class="content-cluster">
  <div class="hero-block"><div class="hero">22.000</div></div>
  <div class="support-block">
    <div class="bento-grid">
      <div class="ui-card card-title">Thuê AI</div>
      <div class="ui-card card-title">Tăng năng suất</div>
    </div>
  </div>
</div>
</body></html>`;

assertPass("valid bento cluster", goodBeat);

assertFail(
  "tiny font",
  goodBeat.replace("font-size:36px", "font-size:16px"),
);

assertFail(
  "four flow nodes row",
  `<style>.flow-row{display:flex;flex-direction:row;gap:8px}
.flow-node{font-size:32px}.ui-card{border-radius:24px;backdrop-filter:blur(12px);box-shadow:0 1px 1px #000}
</style><div class="content-cluster support-block"><div class="flow-row">
<div class="flow-node ui-card">A</div><div class="flow-node ui-card">B</div>
<div class="flow-node ui-card">C</div><div class="flow-node ui-card">D</div>
</div></div>`,
);

assertFail(
  "missing content-cluster",
  goodBeat.replace("content-cluster", "content-wrap"),
);

assertFail(
  "screen split row",
  `<style>
.card-title{font-size:36px}.ui-card{border-radius:24px;backdrop-filter:blur(12px);box-shadow:0 1px 1px #000}
.content-cluster{display:flex;flex-direction:row;align-items:center;gap:24px}
.hero-block{flex:0 0 45%}.support-block{flex:0 0 55%}
</style>
<div class="content-cluster">
<div class="hero-block"><h1 class="card-title">AI cướp việc hay tuyển?</h1></div>
<div class="support-block"><div class="ui-card">A</div><div class="ui-card">B</div></div>
</div>`,
);

fs.rmSync(TMP, { recursive: true, force: true });
console.log("check-typography-spacing.test.mjs: all passed");
