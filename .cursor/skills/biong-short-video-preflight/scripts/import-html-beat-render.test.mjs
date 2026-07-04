#!/usr/bin/env node
/**
 * Unit test: normalize import HTML beat → HyperFrames render format.
 */
import assert from "assert";
import {
  isBeatRenderReady,
  normalizeBeatHtmlForRender,
  removePrefersReducedMotion,
  stripHfSeekBinding,
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

console.log("import-html-beat-render.test: OK");
