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

// :root custom properties → #root
const ROOT_VARS_BEAT = `<!doctype html>
<html data-duration="6.7">
<head><style>
:root {
  --frame: #ffb800;
  --panel-bg: rgba(255, 255, 255, 0.03);
}
#root { background: transparent !important; }
</style></head>
<body>
<div id="root" data-composition-id="beat_1" data-width="1080" data-height="1920" data-duration="6.7">
  <div id="hero">Hi</div>
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
assert.ok(rootNorm.changed, "root vars normalize changes");
assert.ok(
  rootNorm.patches.some((p) => /:root → #root/.test(p)),
  "patch message mentions :root → #root",
);
assert.ok(!/<style[^>]*>[\s\S]*:root\b/i.test(rootNorm.html), "no :root left in style");
assert.ok(
  /#root\s*\{[^}]*--frame:\s*#ffb800/i.test(rootNorm.html),
  "--frame lives under #root",
);
assert.ok(!styleHasRootCustomProperties(rootNorm.html), "styleHasRootCustomProperties false after");

// already render-ready but still has :root — must still rewrite (not skip via early-return)
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
assert.ok(styleHasRootCustomProperties(READY_WITH_ROOT), "fixture still has :root leak");
const readyFix = normalizeBeatHtmlForRender(READY_WITH_ROOT, "beat_1");
assert.ok(readyFix.changed, "already-ready still rewrites :root");
assert.ok(!styleHasRootCustomProperties(readyFix.html), "leak cleared on already-ready");
assert.ok(/#root\s*\{[^}]*--frame:\s*#00ffcc/i.test(readyFix.html), "cyan token on #root");

// patch helper idempotent
const patchedOnce = patchCssRootCustomProperties(READY_WITH_ROOT);
const patchedTwice = patchCssRootCustomProperties(patchedOnce.html);
assert.strictEqual(patchedTwice.changed, false, "patchCssRootCustomProperties idempotent");

// preflight guard
const leakErrors = checkImportHtmlBeatFile("beat_1.html", READY_WITH_ROOT);
assert.ok(
  leakErrors.some((e) => /:root \{ --\* \}/.test(e)),
  "checkImportHtmlBeatFile flags :root custom props",
);
const cleanErrors = checkImportHtmlBeatFile("beat_1.html", readyFix.html);
assert.ok(
  !cleanErrors.some((e) => /:root \{ --\* \}/.test(e)),
  "checkImportHtmlBeatFile passes after rewrite",
);

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
