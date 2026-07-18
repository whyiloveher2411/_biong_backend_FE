#!/usr/bin/env node
/**
 * Unit test: normalize import HTML beat → HyperFrames render format.
 */
import assert from "assert";
import {
  checkImportHtmlBeatFile,
  isBeatRenderReady,
  normalizeBeatHtmlForRender,
  patchCssRootCustomProperties,
  removePrefersReducedMotion,
  resolveBeatSeekBridgeFromMap,
  stripHfSeekBinding,
  styleHasRootCustomProperties,
  styleHasTokenOnlyHashRootCustomProperties,
} from "./lib/import-html-beat-render.mjs";

const CHATBOT_BEAT = `<!doctype html>
<html data-duration="6.7">
<head><style>
#root { background: transparent !important; }
#hero { opacity: 0; }
</style></head>
<body>
<div id="root" data-composition-id="beat_1" data-duration="6.7">
  <div id="hero">Hi</div>
</div>
<script>
const DURATION = 6.7;
let t = 0;
const hero = document.getElementById("hero");
function render() {
  hero.style.opacity = t > 1 ? "1" : "0";
}
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }
addEventListener("hf-seek", (e) => { t = e.detail.time; render(); });
render();
</script>
</body>
</html>`;

// strip hf-seek
const stripped = stripHfSeekBinding(
  `addEventListener('hf-seek', (e) => { t = e.detail.time; render(); });\nrender();`,
);
assert.ok(!/hf-seek/.test(stripped), "stripHfSeekBinding removes hf-seek");

// Gemini-style multi-line listener — regex cũ cắt tại ) của (e)
const MULTI_LINE_HF = `addEventListener("hf-seek", (e) => {
    const nextTime = Number(e.detail && e.detail.time);
    t = Number.isFinite(nextTime) ? nextTime : 0;
    render();
  });
render();`;
const strippedMulti = stripHfSeekBinding(MULTI_LINE_HF);
assert.ok(!/hf-seek/.test(strippedMulti), "multi-line hf-seek removed");
assert.ok(!/^\s*=>\s*\{/m.test(strippedMulti), "no orphan => { remnant");
assert.ok(!/nextTime/.test(strippedMulti), "callback body removed");

// Remnant từ strip lỗi cũ
const ORPHAN = `function render() {}\n=> {
    const nextTime = Number(e.detail && e.detail.time);
    t = Number.isFinite(nextTime) ? nextTime : 0;
    render();
  });
const _beatTl = gsap.timeline({ paused: true });`;
const strippedOrphan = stripHfSeekBinding(ORPHAN);
assert.ok(!/^\s*=>\s*\{/m.test(strippedOrphan), "orphan => { cleaned");
assert.ok(/_beatTl/.test(strippedOrphan), "timeline code kept");

// reduced motion
const noMotion = removePrefersReducedMotion(
  `if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }\nrender();`,
);
assert.ok(!/prefers-reduced-motion/.test(noMotion), "removePrefersReducedMotion");

// normalize
const { html, changed, patches } = normalizeBeatHtmlForRender(CHATBOT_BEAT, "beat_1");
assert.strictEqual(changed, true);
assert.ok(/<template>/i.test(html), "has template");
assert.ok(isBeatRenderReady(html, "beat_1"), "render ready");
assert.ok(/function render\s*\(/i.test(html), "keeps render()");
assert.ok(/window\.__timelines\["beat_1"\]/i.test(html), "registers timeline");
assert.ok(!/addEventListener\s*\(\s*['"]hf-seek['"]/i.test(html), "no hf-seek");
assert.ok(/id="hero"/.test(html), "keeps DOM");

// idempotent
const again = normalizeBeatHtmlForRender(html, "beat_1");
assert.strictEqual(again.changed, false, "idempotent");

// :root tokens must stay on :root (per-beat) — body color: var() keeps working
const ROOT_VARS_BEAT = `<!doctype html>
<html data-duration="6.7">
<head><style>
:root {
  --frame: #ffb800;
  --cream: #f4f3ef;
  --panel-bg: rgba(255, 255, 255, 0.03);
}
body { margin: 0; color: var(--cream); }
#root { background: transparent !important; }
.main-headline { font-size: 64px; font-weight: 900; }
</style></head>
<body>
<div id="root" data-composition-id="beat_1" data-width="1080" data-height="1920" data-duration="6.7">
  <div class="main-headline">Hi</div>
</div>
<script>
const DURATION = 6.7;
let t = 0;
function render() {}
addEventListener("hf-seek", (e) => { t = e.detail.time; render(); });
render();
</script>
</body>
</html>`;

const rootNorm = normalizeBeatHtmlForRender(ROOT_VARS_BEAT, "beat_1");
assert.ok(rootNorm.changed, "root vars beat normalize changes (scaffold)");
assert.ok(
  !rootNorm.patches.some((p) => /:root → #root/.test(p)),
  "does not rewrite :root → #root",
);
assert.ok(
  /:root\s*\{[^}]*--cream:\s*#f4f3ef/i.test(rootNorm.html),
  "--cream stays under :root",
);
assert.ok(
  /body\s*\{[^}]*color:\s*var\(--cream\)/i.test(rootNorm.html),
  "body color: var(--cream) preserved",
);
assert.ok(
  !styleHasTokenOnlyHashRootCustomProperties(rootNorm.html),
  "no broken token-only #root after normalize",
);

// Repair: compositions đã normalize cũ (#root { --* } only) → :root
const BROKEN_HASH_ROOT = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"></head>
<body>
<template>
<style>
#root {
  --cream: #f4f3ef;
  --ink: #070708;
}
body { margin: 0; color: var(--cream); background-color: var(--ink); }
#root, .scene-root { background: transparent !important; }
.main-headline { font-size: 64px; }
</style>
<div id="root" data-composition-id="beat_1" data-width="1080" data-height="1920" data-duration="6.7">
  <div class="main-headline">BỘ KỸ NĂNG CHUẨN</div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines = window.__timelines || {};
const DURATION = 6.7;
let t = 0;
function render() {}
const _beatTl = gsap.timeline({ paused: true });
_beatTl.to({ _v: 0 }, { _v: 1, duration: DURATION, ease: "none",
  onUpdate: function() { t = _beatTl.time(); render(); }
});
window.__timelines["beat_1"] = _beatTl;
render();
</script>
</template>
</body>
</html>`;

assert.ok(
  styleHasTokenOnlyHashRootCustomProperties(BROKEN_HASH_ROOT),
  "detects token-only #root as broken",
);
assert.ok(
  styleHasRootCustomProperties(BROKEN_HASH_ROOT),
  "deprecated alias still detects broken #root tokens",
);
const brokenErrors = checkImportHtmlBeatFile("beat_1.html", BROKEN_HASH_ROOT);
assert.ok(
  brokenErrors.some((e) => /token CSS còn trên #root/.test(e)),
  "preflight flags token-only #root",
);

const repaired = normalizeBeatHtmlForRender(BROKEN_HASH_ROOT, "beat_1");
assert.ok(repaired.changed, "repairs token-only #root");
assert.ok(
  repaired.patches.some((p) => /#root \{ --\* \} → :root/.test(p)),
  "patch mentions reverse to :root",
);
assert.ok(
  /:root\s*\{[^}]*--cream:\s*#f4f3ef/i.test(repaired.html),
  "tokens moved back to :root",
);
assert.ok(
  /#root,\s*\.scene-root\s*\{[^}]*background:\s*transparent/i.test(repaired.html),
  "layout #root, .scene-root untouched",
);
assert.ok(
  !styleHasTokenOnlyHashRootCustomProperties(repaired.html),
  "broken pattern cleared after repair",
);
assert.ok(
  !checkImportHtmlBeatFile("beat_1.html", repaired.html).some((e) => /token CSS còn trên #root/.test(e)),
  "preflight passes after repair",
);

// already render-ready with :root — keep :root (no rewrite)
const READY_WITH_ROOT = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"></head>
<body>
<template>
<style>
:root { --frame: #00ffcc; --panel-bg: rgba(246, 245, 241, 0.95); }
#root { background: transparent !important; }
</style>
<div id="root" data-composition-id="beat_1" data-width="1080" data-height="1920" data-duration="6.7">
  <div>x</div>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines = window.__timelines || {};
const DURATION = 6.7;
let t = 0;
function render() {}
const _beatTl = gsap.timeline({ paused: true });
_beatTl.to({ _v: 0 }, { _v: 1, duration: DURATION, ease: "none",
  onUpdate: function() { t = _beatTl.time(); render(); }
});
window.__timelines["beat_1"] = _beatTl;
render();
</script>
</template>
</body>
</html>`;

assert.ok(isBeatRenderReady(READY_WITH_ROOT, "beat_1"), "fixture already render-ready");
assert.ok(
  !styleHasTokenOnlyHashRootCustomProperties(READY_WITH_ROOT),
  ":root tokens are not the broken pattern",
);
const readyFix = normalizeBeatHtmlForRender(READY_WITH_ROOT, "beat_1");
assert.ok(
  !readyFix.patches.some((p) => /:root → #root|#root \{ --\* \} → :root/.test(p)),
  "already-ready with :root needs no root-token CSS rewrite",
);
assert.ok(
  /:root\s*\{[^}]*--frame:\s*#00ffcc/i.test(readyFix.html),
  ":root tokens preserved on already-ready",
);
assert.ok(
  !checkImportHtmlBeatFile("beat_1.html", READY_WITH_ROOT).some((e) => /:root \{ --\* \}|token CSS còn trên #root/.test(e)),
  "preflight does not flag :root tokens",
);

// already render-ready nhưng còn hf-seek — phải strip (không early-return bỏ qua)
const READY_WITH_HF_SEEK = READY_WITH_ROOT.replace(
  'window.__timelines["beat_1"] = _beatTl;\nrender();',
  `window.__timelines["beat_1"] = _beatTl;
addEventListener("hf-seek", (e) => {
  t = e.detail.time;
  render();
});
render();`,
);
assert.ok(isBeatRenderReady(READY_WITH_HF_SEEK, "beat_1"), "hf-seek fixture still render-ready");
assert.ok(/addEventListener\s*\(\s*['"]hf-seek['"]/i.test(READY_WITH_HF_SEEK), "fixture has hf-seek");
const readyHfFix = normalizeBeatHtmlForRender(READY_WITH_HF_SEEK, "beat_1");
assert.ok(readyHfFix.changed, "already-ready strips leftover hf-seek");
assert.ok(
  readyHfFix.patches.some((p) => /hf-seek|remnant/.test(p)),
  "patch mentions gỡ hf-seek/remnant",
);
assert.ok(
  !/addEventListener\s*\(\s*['"]hf-seek['"]/i.test(readyHfFix.html),
  "hf-seek removed from already-ready",
);
assert.ok(
  !checkImportHtmlBeatFile("beat_1.html", readyHfFix.html).some((e) => /hf-seek/.test(e)),
  "check passes after strip hf-seek",
);

// patch helper idempotent on already-:root and on repaired
const patchedOnce = patchCssRootCustomProperties(BROKEN_HASH_ROOT);
assert.ok(patchedOnce.changed, "patch reverses broken #root tokens");
const patchedTwice = patchCssRootCustomProperties(patchedOnce.html);
assert.strictEqual(patchedTwice.changed, false, "patchCssRootCustomProperties idempotent");
const patchedRootOk = patchCssRootCustomProperties(READY_WITH_ROOT);
assert.strictEqual(patchedRootOk.changed, false, "no-op when tokens already on :root");

// Seek bridge for oversized beat split (part2 must continue timeline, not restart)
const SPLIT_SECTIONS = [
  { id: "beat_1", startSec: 0, durationSec: 14.933 },
  { id: "beat_1_part2", startSec: 14.933, durationSec: 14.934, split_from: "beat_1" },
  { id: "beat_1_part3", startSec: 29.867, durationSec: 14.933, split_from: "beat_1" },
];
const part2Seek = resolveBeatSeekBridgeFromMap(SPLIT_SECTIONS, "beat_1_part2");
assert.strictEqual(part2Seek.offsetSec, 14.933);
assert.strictEqual(part2Seek.durationSec, 14.934);
const part1Seek = resolveBeatSeekBridgeFromMap(SPLIT_SECTIONS, "beat_1");
assert.strictEqual(part1Seek.offsetSec, 0);
assert.strictEqual(part1Seek.durationSec, 14.933);

const SPLIT_CLONE = READY_WITH_ROOT
  .replaceAll("beat_1", "beat_1_part2")
  .replace(
    /onUpdate:\s*function\(\)\s*\{\s*t\s*=\s*_beatTl\.time\(\);\s*render\(\);\s*\}/,
    "onUpdate: function() { t = _beatTl.time(); render(); }",
  );
const part2Norm = normalizeBeatHtmlForRender(SPLIT_CLONE, "beat_1_part2", {
  seekBridge: part2Seek,
});
assert.ok(part2Norm.changed, "part2 seek bridge changes");
assert.ok(
  /t\s*=\s*14\.933\s*\+\s*_beatTl\.time\(\)/.test(part2Norm.html),
  "part2 uses offset + local time",
);
assert.ok(
  /duration:\s*14\.934/.test(part2Norm.html),
  "part2 GSAP duration matches host chunk",
);
assert.ok(
  checkImportHtmlBeatFile("beat_1_part2.html", SPLIT_CLONE, { seekBridge: part2Seek }).some(
    (e) => /seek offset|seek từ t=0/.test(e),
  ),
  "preflight flags missing part offset",
);
assert.ok(
  !checkImportHtmlBeatFile("beat_1_part2.html", part2Norm.html, { seekBridge: part2Seek }).some(
    (e) => /seek offset|seek từ t=0/.test(e),
  ),
  "preflight passes after part offset",
);

console.log("import-html-beat-render.test: OK");
