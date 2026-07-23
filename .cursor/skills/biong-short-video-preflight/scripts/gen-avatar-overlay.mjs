#!/usr/bin/env node
/**
 * Generate compositions/avatar-overlay.html — PiP góc dưới phải, lip-sync + blink seek-safe (v2 timeline).
 *
 * Usage:
 *   node gen-avatar-overlay.mjs <project-dir> [--duration SEC]
 *
 * Ưu tiên assets/avatar/mouth-timeline.json (+ blink trong cùng file hoặc blink-timeline.json).
 * Fallback: preprocess từ words trong avatar-overlay.json nếu thiếu timeline.
 */
import fs from "fs";
import path from "path";
import { buildLipSyncTimeline } from "./lib/avatar-lip-sync.mjs";
import { createAudioEnergy } from "./lib/avatar-audio-energy.mjs";

function defaultHints() {
  return {
    version: 2,
    eyes: {
      anchor_x_ratio: 0.5,
      anchor_y_ratio: 0.3,
      scale_to_face_width: 0.37,
      offset_x_px: 0,
      offset_y_px: 60,
    },
    mouth: {
      anchor_x_ratio: 0.5,
      anchor_y_ratio: 0.56,
      scale_to_face_width: 0.17,
      offset_x_px: 0,
      offset_y_px: 40,
    },
  };
}

const EYE_KEYS = ["eyes_open", "eyes_half_blink", "eyes_closed_blink"];
const MOUTH_KEYS = [
  "mouth_x",
  "mouth_a",
  "mouth_b",
  "mouth_c",
  "mouth_d",
  "mouth_e",
  "mouth_f",
  "mouth_g",
];

function cloneTransform(t, fallback) {
  const f = fallback || {};
  return {
    anchor_x_ratio: Number(t?.anchor_x_ratio ?? f.anchor_x_ratio ?? 0.5),
    anchor_y_ratio: Number(t?.anchor_y_ratio ?? f.anchor_y_ratio ?? 0.3),
    scale_to_face_width: Number(t?.scale_to_face_width ?? f.scale_to_face_width ?? 0.37),
    offset_x_px: Math.round(Number(t?.offset_x_px ?? f.offset_x_px ?? 0)),
    offset_y_px: Math.round(Number(t?.offset_y_px ?? f.offset_y_px ?? 0)),
  };
}

/** Build map stateKey → CSS % (left/top/width) cho overlay. */
function buildStateStyleMap(hints) {
  const d = defaultHints();
  const h = { ...d, ...(hints && typeof hints === "object" ? hints : {}) };
  const eyesBase = cloneTransform(h.eyes, d.eyes);
  const mouthBase = cloneTransform(h.mouth, d.mouth);
  const eyesBy = h.eyes?.by_state && typeof h.eyes.by_state === "object" ? h.eyes.by_state : {};
  const mouthBy = h.mouth?.by_state && typeof h.mouth.by_state === "object" ? h.mouth.by_state : {};
  const refFace = 480;
  const toStyle = (t) => {
    const leftPct = Math.max(
      0,
      Math.min(100, (Number(t.anchor_x_ratio) || 0.5) * 100 + ((Number(t.offset_x_px) || 0) / refFace) * 100),
    );
    const topPct = Math.max(
      0,
      Math.min(95, (Number(t.anchor_y_ratio) || 0.3) * 100 + ((Number(t.offset_y_px) || 0) / refFace) * 100),
    );
    const wPct = Math.max(6, Math.min(90, (Number(t.scale_to_face_width) || 0.2) * 100));
    return {
      left: +leftPct.toFixed(2),
      top: +topPct.toFixed(2),
      width: +wPct.toFixed(2),
    };
  };
  const map = {};
  for (const key of EYE_KEYS) {
    map[key] = toStyle(cloneTransform(eyesBy[key], eyesBase));
  }
  for (const key of MOUTH_KEYS) {
    map[key] = toStyle(cloneTransform(mouthBy[key], mouthBase));
  }
  return map;
}

function resolveDuration(projectDir, cliDuration) {
  if (cliDuration && Number.isFinite(cliDuration) && cliDuration > 0) {
    return +Number(cliDuration).toFixed(2);
  }
  const reportPath = path.join(projectDir, "assets/caption-sync-report.json");
  const metaPath = path.join(projectDir, "meta.json");
  if (fs.existsSync(reportPath)) {
    try {
      const d = Number(JSON.parse(fs.readFileSync(reportPath, "utf8")).totalVideoSec);
      if (d > 0) return +d.toFixed(2);
    } catch {
      /* ignore */
    }
  }
  if (fs.existsSync(metaPath)) {
    try {
      const d = Number(JSON.parse(fs.readFileSync(metaPath, "utf8")).duration);
      if (d > 0) return +d.toFixed(2);
    } catch {
      /* ignore */
    }
  }
  return 0;
}

function normalizeWords(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const w of raw) {
    if (!w || typeof w !== "object") continue;
    const text = String(w.word ?? w.text ?? "").trim();
    const start = Number(w.start ?? w.startSec);
    const end = Number(w.end ?? w.endSec);
    if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    out.push({ text, word: text, start, end });
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

/**
 * Load or build lip-sync timeline v2.
 */
export function resolveLipSyncTimeline(projectDir, words, totalSec) {
  const timelinePath = path.join(projectDir, "assets/avatar/mouth-timeline.json");
  if (fs.existsSync(timelinePath)) {
    try {
      const tl = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
      if (Array.isArray(tl?.mouthCues) && tl.mouthCues.length) {
        return tl;
      }
    } catch {
      /* rebuild */
    }
  }

  let energyAt = null;
  let isLowEnergy = null;
  const narrationCandidates = [
    path.join(projectDir, "assets/narration.mp3"),
    path.join(projectDir, "assets/audio/narration.mp3"),
    path.join(projectDir, "narration.mp3"),
  ];
  for (const p of narrationCandidates) {
    if (!fs.existsSync(p)) continue;
    const energy = createAudioEnergy(p);
    if (energy.ok) {
      energyAt = (t) => energy.peakNorm(t);
      isLowEnergy = (t) => energy.isLowEnergy(t);
    }
    break;
  }

  const tl = buildLipSyncTimeline({
    words,
    totalSec,
    energyAt,
    isLowEnergy,
  });

  fs.mkdirSync(path.dirname(timelinePath), { recursive: true });
  fs.writeFileSync(timelinePath, JSON.stringify(tl, null, 2));
  return tl;
}

function main() {
  const projectDir = path.resolve(process.argv[2] || "");
  let duration = null;
  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i] === "--duration") {
      duration = parseFloat(process.argv[++i] ?? "0");
    }
  }

  if (!process.argv[2]) {
    console.error("usage: node gen-avatar-overlay.mjs <project-dir> [--duration SEC]");
    process.exit(1);
  }

  const cfgPath = path.join(projectDir, "assets/avatar-overlay.json");
  if (!fs.existsSync(cfgPath)) {
    console.log("[gen-avatar-overlay] skip — thiếu assets/avatar-overlay.json");
    process.exit(0);
  }

  const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
  if (!cfg?.enabled) {
    console.log("[gen-avatar-overlay] skip — enabled=false");
    process.exit(0);
  }

  duration = resolveDuration(projectDir, duration);
  if (!(duration > 0)) {
    console.error("Thiếu --duration hoặc meta.json / caption-sync-report.json");
    process.exit(1);
  }

  const assets = cfg.assets && typeof cfg.assets === "object" ? cfg.assets : {};
  const master = String(assets.master || "").trim();
  const baseFace = String(assets.base_face || "").trim();
  const canLip =
    Boolean(baseFace) &&
    Boolean(assets.mouth_x) &&
    Boolean(assets.eyes_open || assets.eyes_half_blink);

  const pip = cfg.pip && typeof cfg.pip === "object" ? cfg.pip : {};
  const widthRatio = Number(pip.width_ratio) > 0 ? Number(pip.width_ratio) : 0.2;
  const marginPx = Number.isFinite(Number(pip.margin_px)) ? Number(pip.margin_px) : 28;
  const bottomPx = Number.isFinite(Number(pip.bottom_px)) ? Number(pip.bottom_px) : Math.max(marginPx, 118);
  const topPx = Number.isFinite(Number(pip.top_px)) ? Number(pip.top_px) : marginPx;
  const leftPx = Number.isFinite(Number(pip.left_px)) ? Number(pip.left_px) : marginPx;
  const rightPx = Number.isFinite(Number(pip.right_px)) ? Number(pip.right_px) : marginPx;
  const anchor = String(pip.anchor || "bottom_right").toLowerCase();
  const pipW = Math.round(1080 * widthRatio);

  let pipPosCss;
  switch (anchor) {
    case "top_left":
      pipPosCss = `top: ${topPx}px; left: ${leftPx}px;`;
      break;
    case "top_right":
      pipPosCss = `top: ${topPx}px; right: ${rightPx}px;`;
      break;
    case "bottom_left":
      pipPosCss = `bottom: ${bottomPx}px; left: ${leftPx}px;`;
      break;
    case "center":
      pipPosCss = `top: 50%; left: 50%; transform: translate(-50%, -50%);`;
      break;
    case "bottom_right":
    default:
      pipPosCss = `bottom: ${bottomPx}px; right: ${rightPx}px;`;
      break;
  }

  const hints = {
    ...defaultHints(),
    ...(cfg.composite_hints && typeof cfg.composite_hints === "object" ? cfg.composite_hints : {}),
  };
  const stateStyles = buildStateStyleMap(hints);
  const eyeInit = stateStyles.eyes_open || { left: 50, top: 30, width: 37 };
  const mouthInit = stateStyles.mouth_x || { left: 50, top: 56, width: 17 };

  const words = normalizeWords(cfg.words);
  const assetMap = {};
  for (const [k, v] of Object.entries(assets)) {
    if (typeof v === "string" && v.trim()) {
      assetMap[k] = v.replace(/^\.\//, "");
    }
  }

  let timeline = { mouthCues: [], blinkEvents: [], stats: {} };
  if (canLip) {
    timeline = resolveLipSyncTimeline(projectDir, words, duration);
    const st = timeline.stats || {};
    console.log(
      `Avatar lip-sync v2: cues=${st.cueCount ?? timeline.mouthCues?.length ?? 0} speaking=${st.speakingSec ?? "?"}s silence=${st.silenceSec ?? "?"}s gRatio=${st.gRatio ?? "?"}`,
    );
  }

  const outPath = path.join(projectDir, "compositions/avatar-overlay.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const assetJson = JSON.stringify(assetMap);
  const stateStylesJson = JSON.stringify(stateStyles);
  const mouthCuesJson = JSON.stringify(
    (timeline.mouthCues || []).map((c) => ({
      start: c.start,
      end: c.end,
      mouth: c.mouth,
    })),
  );
  const blinkJson = JSON.stringify(timeline.blinkEvents || []);

  let bodyInner;
  if (canLip) {
    bodyInner = `
  <div class="avatar-pip" id="avatar-pip">
    <img class="face" id="av-face" src="${assetMap.base_face}" alt="" />
    <img class="eyes" id="av-eyes" src="${assetMap.eyes_open || assetMap.eyes_half_blink || ""}" alt="" />
    <img class="mouth" id="av-mouth" src="${assetMap.mouth_x}" alt="" />
  </div>`;
  } else if (master) {
    bodyInner = `
  <div class="avatar-pip avatar-pip--static" id="avatar-pip">
    <img class="face face--master" id="av-face" src="${assetMap.master}" alt="" />
  </div>`;
  } else {
    console.log("[gen-avatar-overlay] skip — thiếu master/base assets");
    process.exit(0);
  }

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Avatar overlay</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      background: transparent !important;
    }
    #root {
      position: relative;
      width: 1080px;
      height: 1920px;
      pointer-events: none;
    }
    .avatar-pip {
      position: absolute;
      ${pipPosCss}
      width: ${pipW}px;
      height: ${pipW}px;
      border-radius: 50%;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 8px 28px rgba(0,0,0,0.45);
      border: 3px solid rgba(255,255,255,0.75);
    }
    .avatar-pip .face {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .avatar-pip .eyes,
    .avatar-pip .mouth {
      position: absolute;
      transform: translate(-50%, -50%);
      height: auto;
      display: block;
      pointer-events: none;
    }
    .avatar-pip .eyes {
      left: ${eyeInit.left}%;
      top: ${eyeInit.top}%;
      width: ${eyeInit.width}%;
    }
    .avatar-pip .mouth {
      left: ${mouthInit.left}%;
      top: ${mouthInit.top}%;
      width: ${mouthInit.width}%;
    }
  </style>
</head>
<body>
  <div id="root" data-composition-id="avatar-overlay" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
${bodyInner}
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const ASSETS = ${assetJson};
    const STATE_STYLES = ${stateStylesJson};
    const MOUTH_CUES = ${mouthCuesJson};
    const BLINK_EVENTS = ${blinkJson};
    const CAN_LIP = ${canLip ? "true" : "false"};
    function mouthKeyFromCues(t, cues) {
      var time = Number(t);
      if (!isFinite(time) || !cues || !cues.length) return "mouth_x";
      var lo = 0, hi = cues.length - 1;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        var c = cues[mid];
        if (time < c.start) hi = mid - 1;
        else if (time >= c.end) lo = mid + 1;
        else return c.mouth;
      }
      return "mouth_x";
    }
    function eyesKeyFromBlinkEvents(t, blinkEvents) {
      var time = Math.max(0, Number(t) || 0);
      for (var i = 0; i < (blinkEvents || []).length; i++) {
        var b = blinkEvents[i];
        if (time >= b.start && time < b.halfCloseEnd) return "eyes_half_blink";
        if (time >= b.halfCloseEnd && time < b.closedEnd) return "eyes_closed_blink";
        if (time >= b.closedEnd && time < b.halfOpenEnd) return "eyes_half_blink";
      }
      return "eyes_open";
    }
    function applyLayerStyle(el, key) {
      if (!el || !key) return;
      var st = STATE_STYLES[key];
      if (!st) return;
      el.style.left = st.left + "%";
      el.style.top = st.top + "%";
      el.style.width = st.width + "%";
      el.style.transform = "translate(-50%, -50%)";
    }
    const faceEl = document.getElementById("av-face");
    const eyesEl = document.getElementById("av-eyes");
    const mouthEl = document.getElementById("av-mouth");
    let lastMouth = "";
    let lastEyes = "";
    function render(t) {
      if (!CAN_LIP) return;
      const mouth = mouthKeyFromCues(t, MOUTH_CUES);
      const eyes = eyesKeyFromBlinkEvents(t, BLINK_EVENTS);
      if (mouthEl && mouth !== lastMouth && ASSETS[mouth]) {
        mouthEl.src = ASSETS[mouth];
        applyLayerStyle(mouthEl, mouth);
        lastMouth = mouth;
      }
      if (eyesEl && eyes !== lastEyes && ASSETS[eyes]) {
        eyesEl.src = ASSETS[eyes];
        applyLayerStyle(eyesEl, eyes);
        lastEyes = eyes;
      }
    }
    const tl = gsap.timeline({ paused: true });
    tl.to({ _v: 0 }, {
      _v: 1,
      duration: ${duration},
      ease: "none",
      onUpdate: function () {
        render(tl.time());
      },
    });
    window.__timelines["avatar-overlay"] = tl;
    render(0);
  </script>
</body>
</html>
`;

  fs.writeFileSync(outPath, html, "utf8");
  console.log(
    `[gen-avatar-overlay] wrote ${outPath} (${duration}s, lip=${canLip}, cues=${timeline.mouthCues?.length || 0})`,
  );
}

main();
