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

function beatHtml(id, registryBlock, inner, compId = id) {
  return `<!DOCTYPE html><html><head><style>
html,body{margin:0;background:transparent!important;width:1080px;height:1920px;font-family:'Be Vietnam Pro',sans-serif}
.scene-root{width:1080px;height:1920px;display:flex;align-items:center;justify-content:center;padding:80px 48px 360px;box-sizing:border-box}
.content-cluster{display:flex;flex-direction:column;align-items:center;gap:24px;width:100%;max-width:940px}
.hero{font-size:72px;font-weight:800}.card-title{font-size:36px;font-weight:600}.card-body{font-size:28px}
.ui-card{border-radius:24px;border:1px solid rgba(255,255,255,0.08);backdrop-filter:blur(12px);
box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);background:rgba(255,255,255,0.06);padding:20px 24px}
.bento-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;width:100%}
</style>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script></head>
<body><div id="root" data-composition-id="${compId}" data-registry-block="${registryBlock}" data-duration="10">
<div class="scene-root"><div class="content-cluster">
${inner}
</div></div>
</div><script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
tl.addLabel("hero_slam",0);
tl.fromTo(".hero",{y:40,opacity:0},{y:0,opacity:1,duration:0.5,stagger:0.1,ease:"power3.out"},0);
tl.addLabel("reveal_cards",0.2);
tl.fromTo(".ui-card",{scale:0.9,opacity:0},{scale:1,opacity:1,duration:0.45,stagger:0.12,ease:"back.out(1.4)"},0.2);
tl.fromTo(".accent",{rotate:-8,opacity:0},{rotate:0,opacity:1,duration:0.4,stagger:0.08},0.35);
window.__timelines["${compId}"]=tl;
</script></body></html>`;
}

const shotPlanPayload = {
  hf_theme: "vignelli",
  visual_shot_plan: [
  {
    beat_id: "beat_1",
    phrase_anchor: "Hook shock opener",
    layout_archetype: "kinetic_hook_slam",
    render_stack: ["registry:caption-kinetic-slam", "gsap"],
    visual_story: "Slam kinetic hook + sticker",
    hero_mode: "kinetic_type",
    registry_block: "caption-kinetic-slam",
    internal_acts: [
      { at_sec: 0, action: "hero_slam" },
      { at_sec: 1.5, action: "reveal_sticker" },
    ],
    z_role: "hero_type",
  },
  {
    beat_id: "beat_2",
    phrase_anchor: "Ninety thousand jobs cut",
    layout_archetype: "stat_punch_card",
    render_stack: ["registry:stat-motion", "gsap"],
    visual_story: "Counter punch stat card",
    hero_mode: "registry_block",
    registry_block: "stat-motion",
    z_role: "hero_chart",
  },
  {
    beat_id: "beat_3",
    phrase_anchor: "AI investment flow steps",
    layout_archetype: "process_flow",
    render_stack: ["registry:flowchart", "gsap", "lottie"],
    visual_story: "Flowchart cascade nodes",
    hero_mode: "diagram",
    registry_block: "flowchart",
    z_role: "hero_chart",
  },
  {
    beat_id: "beat_4",
    phrase_anchor: "Before after comparison chart",
    layout_archetype: "comparison_split",
    render_stack: ["registry:data-chart", "gsap"],
    visual_story: "Split bar chart comparison",
    hero_mode: "registry_block",
    registry_block: "data-chart",
    z_role: "hero_chart",
  },
  {
    beat_id: "beat_5",
    phrase_anchor: "Three insight bento grid",
    layout_archetype: "bento_insight_grid",
    render_stack: ["gsap", "registry:stat-motion"],
    visual_story: "Bento cards stagger insights",
    hero_mode: "registry_block",
    registry_block: "stat-motion",
    visual_enrichment: [{ type: "source_badge", text: "Fixture 2026", source: "creative_brief" }],
    internal_acts: [
      { at_sec: 0, action: "reveal_card_1" },
      { at_sec: 2, action: "reveal_card_2" },
    ],
    z_role: "support",
  },
  {
    beat_id: "beat_6",
    phrase_anchor: "Follow now call to action",
    layout_archetype: "cta_orbit",
    render_stack: ["registry:caption-kinetic-slam", "lottie", "gsap"],
    visual_story: "CTA orbit collapse finale",
    hero_mode: "kinetic_type",
    registry_block: "caption-kinetic-slam",
    z_role: "hero_type",
  },
  ],
};

const shotPlan = shotPlanPayload.visual_shot_plan;

const captionWords = [
  { text: "Hook", start: 0, end: 0.3 },
  { text: "shock", start: 0.3, end: 0.6 },
  { text: "opener", start: 0.6, end: 1 },
  { text: "Ninety", start: 10, end: 10.3 },
  { text: "thousand", start: 10.3, end: 10.7 },
  { text: "jobs", start: 10.7, end: 11 },
  { text: "cut", start: 11, end: 11.3 },
  { text: "AI", start: 20, end: 20.2 },
  { text: "investment", start: 20.2, end: 20.6 },
  { text: "flow", start: 20.6, end: 20.9 },
  { text: "steps", start: 20.9, end: 21.2 },
  { text: "Before", start: 30, end: 30.3 },
  { text: "after", start: 30.3, end: 30.6 },
  { text: "comparison", start: 30.6, end: 31 },
  { text: "chart", start: 31, end: 31.3 },
  { text: "Three", start: 40, end: 40.3 },
  { text: "insight", start: 40.3, end: 40.7 },
  { text: "bento", start: 40.7, end: 41 },
  { text: "grid", start: 41, end: 41.3 },
  { text: "Follow", start: 50, end: 50.3 },
  { text: "now", start: 50.3, end: 50.5 },
  { text: "call", start: 50.5, end: 50.7 },
  { text: "to", start: 50.7, end: 50.8 },
  { text: "action", start: 50.8, end: 51.2 },
];

fs.rmSync(FIXTURE, { recursive: true, force: true });

write("assets/visual-shot-plan.json", JSON.stringify(shotPlanPayload, null, 2));
write(
  "assets/agent-metadata.json",
  JSON.stringify({ language: "vi", visual_shot_plan: shotPlan, hf_theme: "vignelli" }),
);
write("assets/audio-script.txt", captionWords.map((w) => w.text).join(" "));
write("assets/caption-words.json", JSON.stringify(captionWords));
write("assets/caption-sync-report.json", JSON.stringify({ totalVideoSec: 60 }));

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
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
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
  `<!DOCTYPE html><html><body><div data-composition-id="data-chart" class="chart-card"><div class="bar-fill"></div></div></body></html>`,
);
write(
  "compositions/flowchart.html",
  `<!DOCTYPE html><html><body><div data-composition-id="flowchart" class="flow-card"><div class="flow-node">A</div></div></body></html>`,
);
write(
  "compositions/stat-motion.html",
  `<!DOCTYPE html><html><body><div data-composition-id="stat-motion" class="stat-card"><div class="stat-val">90K</div></div></body></html>`,
);

write(
  "compositions/beat_1.html",
  beatHtml(
    "beat_1",
    "caption-kinetic-slam",
    '<div class="hero-block"><div class="hero">Hook</div></div><div class="support-block"><div class="ui-card accent card-title">SLAM</div></div>',
  ),
);
write(
  "compositions/beat_2.html",
  beatHtml(
    "beat_2",
    "stat-motion",
    '<div class="hero-block"><div class="ui-card stat-card"><div class="stat-val hero">90000</div></div></div><div class="support-block"><div class="ui-card card-body">jobs cut</div></div>',
  ),
);
write(
  "compositions/beat_3.html",
  beatHtml(
    "beat_3",
    "flowchart",
    '<div class="hero-block"><div class="ui-card flow-card"><div class="flow-node card-title hero">Step</div></div></div>',
  ),
);
write(
  "compositions/beat_4.html",
  beatHtml(
    "beat_4",
    "data-chart",
    '<div class="hero-block"><div class="ui-card chart-card"><div class="bar-fill card-title hero">Chart</div></div></div>',
  ),
);
write(
  "compositions/beat_5.html",
  beatHtml(
    "beat_5",
    "stat-motion",
    '<div class="support-block"><div class="bento-grid"><div class="ui-card card-title hero">Insight A</div><div class="ui-card card-title">Insight B</div></div></div>',
  ),
);
write(
  "compositions/beat_6.html",
  beatHtml(
    "beat_6",
    "caption-kinetic-slam",
    '<div class="hero-block"><div class="ui-card hero card-title">Follow</div></div><div class="support-block"><div class="ui-card accent card-title">CTA</div></div>',
  ),
);

const beatSections = [
  { id: "beat-1", start: 0, dur: 10 },
  { id: "beat-2", start: 10, dur: 10 },
  { id: "beat-3", start: 20, dur: 10 },
  { id: "beat-4", start: 30, dur: 10 },
  { id: "beat-5", start: 40, dur: 10 },
  { id: "beat-6", start: 50, dur: 10 },
];

const beatHosts = beatSections
  .map(
    (b, i) =>
      `<section class="clip beat-host scene" id="${b.id}" data-composition-src="compositions/beat_${i + 1}.html"
  data-composition-id="beat_${i + 1}" data-start="${b.start}" data-duration="${b.dur}" data-track-index="${i + 1}"
  style="position:absolute;inset:0;z-index:320;pointer-events:none"></section>`,
  )
  .join("\n  ");

write(
  "index.html",
  `<!DOCTYPE html><html><head><style>html,body{margin:0;width:1080px;height:1920px}</style></head>
<body>
<div id="root" data-composition-id="main" data-duration="60">
  <div class="clip hf-ambient-layer" data-composition-src="compositions/ambient-layer.html"
       data-composition-id="ambient" data-start="0" data-duration="60" data-track-index="2"
       style="position:absolute;inset:0;z-index:8;pointer-events:none"></div>
  ${beatHosts}
  <div class="clip hf-overlay-caption" data-composition-src="compositions/captions.html"
       data-start="0" data-duration="60" data-track-index="20"
       style="position:absolute;inset:0;z-index:9000;pointer-events:none"></div>
  <div class="clip hf-overlay-brand" data-composition-src="compositions/brand-watermark.html"
       data-start="0" data-duration="60" data-track-index="21"
       style="position:absolute;inset:0;z-index:9500;pointer-events:none"></div>
  <audio class="clip" src="assets/audio/bgm.mp3" data-start="0" data-duration="60" data-track-index="11" data-volume="0.3"></audio>
  <audio class="clip" src="assets/audio/sfx_hook.mp3" data-start="0" data-duration="2" data-track-index="12" data-volume="0.45"></audio>
</div>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
tl.fromTo(".scene",{opacity:0},{opacity:1,duration:0.5,stagger:0.05},0);
window.__timelines["main"]=tl;
</script>
</body></html>`,
);

write(
  "media-plan.md",
  `| beat | layout_archetype | hero_type | registry_block | z_role |
| beat_1 | kinetic_hook_slam | kinetic_type | caption-kinetic-slam | hero_type |
| beat_2 | stat_punch_card | registry_block | stat-motion | hero_chart |
| beat_3 | process_flow | diagram | flowchart | hero_chart |
| beat_4 | comparison_split | registry_block | data-chart | hero_chart |
| beat_5 | bento_insight_grid | registry_block | stat-motion | support |
| beat_6 | cta_orbit | kinetic_type | caption-kinetic-slam | hero_type |
| sfx_hook | audio | — | — | short_video_search_meme_sound |
| bgm_global | audio | — | — | short_video_search_bgm |
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

let r = run("map-shot-plan-to-beat-map.mjs");
if (r.code !== 0) {
  console.error(`FAIL map-shot-plan-to-beat-map.mjs:\n${r.out}`);
  process.exit(1);
}
console.log("OK map-shot-plan-to-beat-map.mjs");

const checks = [
  ["check-continuous-motion.mjs", []],
  ["check-visual-density.mjs", []],
  ["check-typography-spacing.mjs", []],
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
