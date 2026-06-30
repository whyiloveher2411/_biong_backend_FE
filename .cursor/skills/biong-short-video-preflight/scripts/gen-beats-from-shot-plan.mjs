#!/usr/bin/env node
/**
 * Generate compositions/beat_N.html from assets/visual-shot-plan.json + beat-map.json.
 * Transparent sub-compositions — stock bg từ index.html lộ qua.
 *
 * Usage: node gen-beats-from-shot-plan.mjs <project-dir>
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const projectDir = path.resolve(process.argv[2] || "");
if (!projectDir) {
  console.error("usage: node gen-beats-from-shot-plan.mjs <project-dir>");
  process.exit(1);
}

const shotPath = path.join(projectDir, "assets/visual-shot-plan.json");
const beatMapPath = path.join(projectDir, "assets/beat-map.json");
if (!fs.existsSync(shotPath)) {
  console.error("Thiếu assets/visual-shot-plan.json");
  process.exit(1);
}

const shotPlan = JSON.parse(fs.readFileSync(shotPath, "utf8"));
const beatMap = fs.existsSync(beatMapPath)
  ? JSON.parse(fs.readFileSync(beatMapPath, "utf8"))
  : { sections: [] };

const FONT_FACES = `@font-face{font-family:"Be Vietnam Pro";font-weight:400;font-display:swap;src:url("assets/fonts/BeVietnamPro-Regular.ttf") format("truetype")}
@font-face{font-family:"Be Vietnam Pro";font-weight:600;font-display:swap;src:url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype")}
@font-face{font-family:"Be Vietnam Pro";font-weight:700;font-display:swap;src:url("assets/fonts/BeVietnamPro-Bold.ttf") format("truetype")}
@font-face{font-family:"Be Vietnam Pro";font-weight:800;font-display:swap;src:url("assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype")}`;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function kineticWords(words, accent) {
  return words
    .map(
      (w, i) =>
        `<span class="kw w${i}" style="color:${i === 0 ? accent : "#F1F5F9"}">${esc(w)}</span>`,
    )
    .join("");
}

function statBlock(stat, accent) {
  if (!stat) return "";
  return `<div class="stat-card">
  <div class="stat-val" style="color:${accent}">${esc(stat.value)}</div>
  <div class="stat-label">${esc(stat.label)}</div>
  ${stat.sub ? `<div class="stat-sub">${esc(stat.sub)}</div>` : ""}
</div>`;
}

function chartBlock(chart, accent) {
  if (!chart?.bars?.length) return "";
  const max = Math.max(...chart.bars.map((b) => b.value), 1);
  const bars = chart.bars
    .map(
      (b, i) =>
        `<div class="bar-wrap"><div class="bar-label">${esc(b.label)}</div><div class="bar-track"><div class="bar-fill b${i}" style="height:${Math.round((b.value / max) * 100)}%;background:linear-gradient(180deg,${accent},#6366F1)"></div></div><div class="bar-num">${b.value}%</div></div>`,
    )
    .join("");
  return `<div class="chart-card">${bars}</div>`;
}

function flowBlock(flow, accent) {
  if (!flow?.length) return "";
  const nodes = flow
    .map(
      (n, i) =>
        `<div class="flow-node fn${i}"><span class="flow-idx">${i + 1}</span>${esc(n)}</div>${i < flow.length - 1 ? '<div class="flow-arrow">↓</div>' : ""}`,
    )
    .join("");
  return `<div class="flow-card">${nodes}</div>`;
}

function supportCard(support) {
  if (!support) return "";
  return `<div class="ui-card">
  <span class="ui-icon">${esc(support.icon)}</span>
  <div class="ui-text"><strong>${esc(support.title)}</strong><p>${esc(support.body)}</p></div>
</div>`;
}

function accentMediaHtml(shot) {
  const src = shot.accent_image;
  if (!src) return "";
  const escSrc = esc(src);
  if (/\.(mp4|webm)(\?|$)/i.test(src)) {
    return `<video class="accent-sticker" src="${escSrc}" muted playsinline loop autoplay></video>`;
  }
  return `<img class="accent-sticker" src="${escSrc}" alt="" />`;
}

function buildBeatHtml(shot, sectionIdx) {
  const id = shot.beat_id || `beat_${sectionIdx + 1}`;
  const compId = id.replace(/\.html$/, "");
  const sec = beatMap.sections?.[sectionIdx];
  const dur = sec?.durationSec ?? 4;
  const accent = shot.palette?.accent ?? "#FE8A7E";
  const glow = shot.palette?.glow ?? "#6366F1";

  const hero = kineticWords(shot.headline_words ?? ["Hook"], accent);
  let heroExtra = "";
  if (shot.stat) heroExtra = statBlock(shot.stat, accent);
  else if (shot.chart) heroExtra = chartBlock(shot.chart, accent);
  else if (shot.flow) heroExtra = flowBlock(shot.flow, accent);
  else heroExtra = supportCard(shot.support);

  const sticker = accentMediaHtml(shot);

  const registryAttr = shot.registry_block
    ? ` data-registry-block="${esc(shot.registry_block)}"`
    : "";

  return `<!doctype html>
<html lang="vi"><head><meta charset="UTF-8"/>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
<style>
${FONT_FACES}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:transparent!important}
#root{position:relative;width:1080px;height:1920px;overflow:hidden;background:transparent!important;font-family:"Be Vietnam Pro",system-ui,sans-serif;color:#F1F5F9}
.scene-root{position:relative;z-index:220;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding:120px 56px 360px;height:100%;pointer-events:none}
.hero-row{display:flex;flex-wrap:wrap;justify-content:center;gap:12px 16px;max-width:920px;margin-top:180px}
.kw{font-size:72px;font-weight:800;line-height:1.05;text-shadow:0 0 40px ${glow}88}
.stat-card{margin-top:48px;text-align:center;padding:36px 48px;background:rgba(21,27,43,0.72);border:2px solid ${accent}66;border-radius:20px;backdrop-filter:blur(12px);box-shadow:0 0 60px ${glow}44}
.stat-val{font-size:120px;font-weight:800;line-height:1}
.stat-label{font-size:36px;font-weight:600;margin-top:8px;color:#E2E8F0}
.stat-sub{font-size:28px;color:#94A3B8;margin-top:12px}
.chart-card{margin-top:40px;display:flex;gap:32px;align-items:flex-end;justify-content:center;padding:32px;background:rgba(21,27,43,0.65);border-radius:20px;border:1px solid #2A3448}
.bar-wrap{text-align:center;width:140px}
.bar-track{height:200px;width:80px;margin:12px auto;background:#1E293B;border-radius:12px;display:flex;align-items:flex-end;overflow:hidden}
.bar-fill{width:100%;border-radius:12px 12px 0 0;transform-origin:bottom}
.bar-label{font-size:24px;color:#94A3B8}
.bar-num{font-size:32px;font-weight:700;color:${accent}}
.flow-card{margin-top:40px;display:flex;flex-direction:column;align-items:center;gap:8px}
.flow-node{font-size:30px;font-weight:600;padding:20px 36px;background:rgba(21,27,43,0.75);border-left:4px solid ${accent};border-radius:12px;min-width:420px;text-align:left}
.flow-idx{display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:${accent};color:#0B0F1A;border-radius:50%;margin-right:12px;font-size:18px;font-weight:800}
.flow-arrow{font-size:28px;color:${accent};opacity:0.8}
.ui-card{margin-top:44px;width:100%;max-width:880px;display:flex;gap:24px;align-items:flex-start;padding:32px 36px;background:rgba(21,27,43,0.72);border:2px solid #2A3448;border-radius:16px;backdrop-filter:blur(10px)}
.ui-icon{font-size:48px;line-height:1}
.ui-text strong{display:block;font-size:32px;font-weight:700;margin-bottom:8px;color:#F1F5F9}
.ui-text p{font-size:28px;color:#94A3B8;line-height:1.35}
.accent-sticker{position:absolute;right:48px;top:320px;width:160px;height:160px;object-fit:contain;z-index:240;filter:drop-shadow(0 0 20px ${glow}88)}
.glow-orb{position:absolute;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,${glow}33 0%,transparent 70%);top:100px;left:50%;transform:translateX(-50%);z-index:200;pointer-events:none}
</style></head><body>
<div id="root" data-composition-id="${compId}" data-start="0" data-duration="${dur.toFixed(3)}" data-width="1080" data-height="1920"${registryAttr}>
<div class="glow-orb"></div>
${sticker}
<div class="scene-root">
<div class="hero-row h1">${hero}</div>
${heroExtra}
</div></div>
<script>
window.__timelines=window.__timelines||{};
const tl=gsap.timeline({paused:true});
tl.fromTo(".glow-orb",{scale:0.8,opacity:0},{scale:1.1,opacity:1,duration:0.8,ease:"power3.out"},0);
tl.fromTo(".kw",{y:60,opacity:0,rotateX:-12},{y:0,opacity:1,rotateX:0,duration:0.55,stagger:0.1,ease:"back.out(1.7)"},0.15);
tl.fromTo(".stat-card, .chart-card, .flow-card, .ui-card",{scale:0.85,opacity:0},{scale:1,opacity:1,duration:0.5,ease:"power3.out"},0.55);
tl.fromTo(".bar-fill",{scaleY:0},{scaleY:1,duration:0.7,stagger:0.12,ease:"power3.out",transformOrigin:"bottom center"},0.65);
tl.fromTo(".flow-node",{x:-40,opacity:0},{x:0,opacity:1,duration:0.45,stagger:0.1,ease:"power3.out"},0.6);
tl.fromTo(".accent-sticker",{scale:0,rotate:-20},{scale:1,rotate:0,duration:0.5,ease:"elastic.out(1,0.4)"},0.35);
window.__timelines["${compId}"]=tl;
</script></body></html>`;
}

const outDir = path.join(projectDir, "compositions");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

let n = 0;
for (let i = 0; i < shotPlan.length; i++) {
  const shot = shotPlan[i];
  const fileName = `${shot.beat_id || `beat_${i + 1}`}.html`;
  fs.writeFileSync(path.join(outDir, fileName), buildBeatHtml(shot, i));
  n++;
}
console.log(`[gen-beats-from-shot-plan] wrote ${n} beat compositions (transparent bg, kinetic hero)`);
