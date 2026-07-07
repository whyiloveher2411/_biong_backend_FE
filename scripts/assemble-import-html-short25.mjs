#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const repo = process.cwd();
const projectDir = path.join(repo, "storage/agent-renders/25/my-video");
const contextPath = path.join(repo, "storage/agent-renders/25/assets/get-context-snapshot.json");
const ctx = JSON.parse(fs.readFileSync(contextPath, "utf8"));
const importHtml = ctx.import_html || {};
const beatMap = importHtml.beat_map;
const sections = beatMap?.sections || [];
const totalVideoSec = Number(beatMap?.totalVideoSec || ctx.audio_file_duration_sec || 0);

if (!ctx.audio_script || !ctx.audio_file || !sections.length || !importHtml.beat_html) {
  throw new Error("Context missing audio_script, audio_file, beat_map.sections, or beat_html");
}

fs.mkdirSync(path.join(projectDir, "assets/audio"), { recursive: true });
fs.mkdirSync(path.join(projectDir, "assets/fonts"), { recursive: true });
fs.mkdirSync(path.join(projectDir, "assets/images"), { recursive: true });
fs.mkdirSync(path.join(projectDir, "compositions"), { recursive: true });

fs.writeFileSync(path.join(projectDir, "assets/get-context-snapshot.json"), JSON.stringify(ctx, null, 2));
fs.writeFileSync(path.join(projectDir, "assets/beat-map.json"), JSON.stringify(beatMap, null, 2));
fs.writeFileSync(path.join(projectDir, "assets/audio-script.txt"), String(ctx.audio_script).trim() + "\n");
fs.writeFileSync(
  path.join(projectDir, "assets/agent-metadata.json"),
  JSON.stringify(
    {
      language: ctx.audio_script_metadata?.language || ctx.lang || "vi",
      estimated_duration_sec: totalVideoSec,
      article_title: ctx.article_title || ctx.title || "",
    },
    null,
    2,
  ),
);
fs.writeFileSync(path.join(projectDir, "assets/render-mode.json"), JSON.stringify({ render_mode: "import_html" }, null, 2));

const words = importHtml.whisper_words || [];
fs.writeFileSync(path.join(projectDir, "assets/transcript.json"), JSON.stringify(words, null, 2));
fs.writeFileSync(path.join(projectDir, "transcript.json"), JSON.stringify(words, null, 2));

for (const sec of sections) {
  const beatId = sec.id || sec.beat_id;
  const value = importHtml.beat_html[beatId];
  const html = typeof value === "string" ? value : value?.html;
  if (!html) throw new Error(`Missing HTML for ${beatId}`);
  fs.writeFileSync(path.join(projectDir, "compositions", `${beatId}.html`), html, "utf8");
}

const ambientHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Ambient Layer</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    html, body { width:1080px; height:1920px; margin:0; overflow:hidden; background:transparent !important; }
    #root { position:relative; width:1080px; height:1920px; overflow:hidden; background:transparent; pointer-events:none; }
    .grain { position:absolute; inset:-20px; opacity:.08; background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,.9) 0 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(255,255,255,.65) 0 1px, transparent 1px); background-size: 38px 38px, 53px 53px; mix-blend-mode: overlay; }
    .vignette { position:absolute; inset:0; box-shadow: inset 0 0 180px rgba(0,0,0,.32); }
  </style>
</head>
<body>
  <div id="root" data-composition-id="ambient" data-start="0" data-duration="${totalVideoSec}" data-width="1080" data-height="1920">
    <div class="grain"></div>
    <div class="vignette"></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.to(".grain", { x: 18, y: -12, duration: ${totalVideoSec}, ease: "none" }, 0);
    window.__timelines["ambient"] = tl;
  </script>
</body>
</html>`;
fs.writeFileSync(path.join(projectDir, "compositions/ambient-layer.html"), ambientHtml, "utf8");

const beatHosts = sections
  .map((sec, index) => {
    const beatId = sec.id || sec.beat_id;
    return `    <section id="beat-${index + 1}" class="clip beat-host" data-composition-id="${beatId}" data-composition-src="compositions/${beatId}.html" data-start="${Number(sec.startSec).toFixed(3)}" data-duration="${Number(sec.durationSec).toFixed(3)}" data-track-index="${index + 1}" style="position:absolute;inset:0;z-index:${10 + index};"></section>`;
  })
  .join("\n");

const indexHtml = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Short Video #25</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:400; font-display:swap; src:url("assets/fonts/BeVietnamPro-Regular.ttf") format("truetype"); }
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:600; font-display:swap; src:url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype"); }
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:700; font-display:swap; src:url("assets/fonts/BeVietnamPro-Bold.ttf") format("truetype"); }
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:800; font-display:swap; src:url("assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype"); }
    html, body { width:1080px; height:1920px; margin:0; overflow:hidden; background:#050505; }
    #root { position:relative; width:1080px; height:1920px; overflow:hidden; background:#050505; font-family:"Be Vietnam Pro", system-ui, sans-serif; }
    .clip { position:absolute; inset:0; }
    .beat-host { overflow:hidden; background:transparent; }
    .hf-overlay-caption { z-index:9000 !important; pointer-events:none; }
    .hf-overlay-brand { z-index:9500 !important; pointer-events:none; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${totalVideoSec}" data-width="1080" data-height="1920">
    <audio id="narration" class="clip" src="assets/audio/narration.mp3" data-start="0" data-duration="${totalVideoSec}" data-track-index="10" data-volume="1.0"></audio>
${beatHosts}
    <section id="ambient-layer" class="clip beat-host" data-composition-id="ambient" data-composition-src="compositions/ambient-layer.html" data-start="0" data-duration="${totalVideoSec}" data-track-index="19" style="position:absolute;inset:0;z-index:800;"></section>
    <section id="captions-layer" class="clip hf-overlay-caption" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${totalVideoSec}" data-track-index="20" style="position:absolute;inset:0;z-index:9000;"></section>
    <section id="brand-layer" class="clip hf-overlay-brand" data-composition-id="brand-watermark" data-composition-src="compositions/brand-watermark.html" data-start="0" data-duration="${totalVideoSec}" data-track-index="21" style="position:absolute;inset:0;z-index:9500;"></section>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    window.__timelines.main = gsap.timeline({ paused: true });
  </script>
</body>
</html>`;
fs.writeFileSync(path.join(projectDir, "index.html"), indexHtml, "utf8");

console.log(`[assemble] wrote ${sections.length} import_html beats for ${totalVideoSec}s`);
