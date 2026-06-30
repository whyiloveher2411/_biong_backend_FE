#!/usr/bin/env node
/**
 * Integration fixture — minimal project passing new visual pipeline preflight checks.
 * Run: node run-visual-pipeline-fixture.test.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, "fixtures", "visual-pipeline-minimal");
const SCRIPTS = __dirname;

function write(rel, content) {
  const full = path.join(FIXTURE, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function run(script, args = []) {
  const r = spawnSync("node", [path.join(SCRIPTS, script), FIXTURE, ...args], {
    encoding: "utf8",
  });
  return { code: r.status ?? 1, out: (r.stdout || "") + (r.stderr || "") };
}

// --- Build minimal fixture ---
fs.rmSync(FIXTURE, { recursive: true, force: true });

write(
  "assets/agent-metadata.json",
  JSON.stringify({
    language: "vi",
    visual_shot_plan: [
      { section: "hook", hero_mode: "kinetic_type", registry_block: "caption-kinetic-slam", z_role: "hero_type" },
      { section: "solve", hero_mode: "registry_block", registry_block: "data-chart", z_role: "hero_chart" },
    ],
  }),
);

write("assets/audio-script.txt", "Hook line one two three");
write("assets/caption-words.json", JSON.stringify([{ word: "Hook", start: 0, end: 0.5 }]));
write(
  "assets/caption-sync-report.json",
  JSON.stringify({ totalVideoSec: 60 }),
);

write(
  "compositions/ambient-layer.html",
  `<!DOCTYPE html><html><head><style>html,body{margin:0;background:transparent!important;width:1080px;height:1920px}</style></head>
<body><div id="root" data-composition-id="ambient"><div id="ambient-parallax" class="orb-a"></div></div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true,repeat:-1});
tl.fromTo("#ambient-parallax",{x:20,scale:1.05},{x:-20,scale:1,duration:8,ease:"none"},0);
tl.to(".orb-a",{scale:1.03,duration:2,yoyo:true,repeat:-1,ease:"sine.inOut"},0);
window.__timelines["ambient"]=tl;
</script></body></html>`,
);

write(
  "compositions/captions.html",
  `<!DOCTYPE html><html><head><style>html,body{background:transparent!important;font-family:'Be Vietnam Pro',sans-serif}</style></head>
<body><div class="caption-root">test</div>
<script>window.__timelines=window.__timelines||{};window.__timelines["captions"]=gsap.timeline({paused:true});</script>
</body></html>`,
);

write(
  "compositions/brand-watermark.html",
  `<!DOCTYPE html><html><head><style>html,body{background:transparent!important}#root{position:relative;width:1080px;height:1920px}.brand-wrap{position:absolute;left:28px;top:28px}</style></head>
<body><div id="root"><div class="brand-wrap"><img src="../assets/images/spacedev-logo.png" alt="Spacedev"/></div></div></body></html>`,
);

write(
  "compositions/data-chart.html",
  `<!DOCTYPE html><html><body><div data-composition-id="data-chart">chart</div></body></html>`,
);

write(
  "index.html",
  `<!DOCTYPE html><html><head><style>html,body{margin:0;width:1080px;height:1920px}</style></head>
<body>
<div id="root" data-composition-id="main">
  <div class="clip hf-ambient-layer" data-composition-src="compositions/ambient-layer.html"
       data-composition-id="ambient" data-start="0" data-duration="60" data-track-index="2"
       style="position:absolute;inset:0;z-index:8;pointer-events:none"></div>
  <section class="clip scene" style="position:absolute;inset:0;z-index:320" data-start="0" data-duration="30" data-track-index="1">
    <div data-composition-src="compositions/data-chart.html" style="z-index:350">hero</div>
  </section>
  <div class="clip hf-overlay-caption" data-composition-src="compositions/captions.html"
       data-start="0" data-duration="60" data-track-index="20"
       style="position:absolute;inset:0;z-index:9000;pointer-events:none"></div>
  <div class="clip hf-overlay-brand" data-composition-src="compositions/brand-watermark.html"
       data-start="0" data-duration="60" data-track-index="21"
       style="position:absolute;inset:0;z-index:9500;pointer-events:none"></div>
  <audio class="clip" src="../assets/audio/bgm.mp3" data-start="0" data-duration="60" data-track-index="11" data-volume="0.3"></audio>
  <audio class="clip" src="../assets/audio/sfx_hook.mp3" data-start="0" data-duration="2" data-track-index="12" data-volume="0.45"></audio>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
tl.fromTo(".scene",{opacity:0},{opacity:1,duration:0.5},0);
window.__timelines["main"]=tl;
</script>
</body></html>`,
);

write(
  "media-plan.md",
  `| scope | hero_type | registry_block | z_role | mcp_tool |
| sfx_hook | audio | — | — | short_video_search_meme_sound |
| bgm_global | audio | — | — | short_video_search_bgm |
| solve | registry_block | data-chart | hero_chart | hyperframes add |
`,
);

fs.mkdirSync(path.join(FIXTURE, "assets/audio"), { recursive: true });
fs.mkdirSync(path.join(FIXTURE, "assets/images"), { recursive: true });
fs.writeFileSync(path.join(FIXTURE, "assets/audio/bgm.mp3"), "");
fs.writeFileSync(path.join(FIXTURE, "assets/audio/sfx_hook.mp3"), "");
fs.copyFileSync(
  path.join(__dirname, "../../biong-short-video-hyperframes/assets/spacedev-logo.png"),
  path.join(FIXTURE, "assets/images/spacedev-logo.png"),
);

const checks = [
  ["check-continuous-motion.mjs", []],
  ["check-visual-density.mjs", []],
  ["check-overlay-stack.mjs", []],
];

let failed = false;
for (const [script, args] of checks) {
  const { code, out } = run(script, args);
  if (code !== 0) {
    console.error(`FAIL ${script}:\n${out}`);
    failed = true;
  } else {
    console.log(`OK ${script}`);
  }
}

if (failed) process.exit(1);
console.log("visual-pipeline fixture: all checks passed");
process.exit(0);
