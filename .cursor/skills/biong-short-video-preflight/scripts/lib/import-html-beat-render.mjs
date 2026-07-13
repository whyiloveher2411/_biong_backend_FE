/**
 * Chuẩn hóa beat HTML từ chatbot (preview hf-seek) → format HyperFrames render
 * (<template> + window.__timelines).
 * Không restyle creative; chỉ patch CSS cấu trúc cần cho HyperFrames
 * (font, scoping token `:root` → `#root` khi composite).
 */
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import crypto from "crypto";

export const GSAP_CDN =
  "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";

export const BE_VIETNAM_FONT_FACE_BLOCK = `@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("assets/fonts/BeVietnamPro-Regular.ttf") format("truetype");
}
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype");
}
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("assets/fonts/BeVietnamPro-Bold.ttf") format("truetype");
}
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype");
}`;

const RENDER_MODE_REL = "assets/render-mode.json";
const IMAGE_MAP_REL = "assets/image-url-map.json";

export function readRenderMode(projectDir) {
  const modePath = path.join(projectDir, RENDER_MODE_REL);
  if (fs.existsSync(modePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(modePath, "utf8"));
      if (data?.render_mode === "import_html") return "import_html";
      if (data?.render_mode === "creative") return "creative";
    } catch {
      /* fall through */
    }
  }

  const launchMeta = path.join(projectDir, "assets/agent-launch-meta.json");
  if (fs.existsSync(launchMeta)) {
    try {
      const data = JSON.parse(fs.readFileSync(launchMeta, "utf8"));
      if (data?.phase === "import_assemble" || data?.phase === "import_html_full") return "import_html";
    } catch {
      /* skip */
    }
  }

  const ctxPath = path.join(projectDir, "assets/get-context-snapshot.json");
  if (fs.existsSync(ctxPath)) {
    try {
      const ctx = JSON.parse(fs.readFileSync(ctxPath, "utf8"));
      if (ctx?.render_mode === "import_html") return "import_html";
      if (ctx?.import_html && typeof ctx.import_html === "object") return "import_html";
    } catch {
      /* skip */
    }
  }

  return "creative";
}

export function isImportHtmlProject(projectDir) {
  return readRenderMode(projectDir) === "import_html";
}

export function beatIdFromFilename(name) {
  const m = String(name).match(/^(beat_\d+(?:_part\d+)?)\.html$/i);
  return m ? m[1] : null;
}

export function isBeatRenderReady(html, beatId) {
  if (!/<template>/i.test(html)) return false;
  const re = new RegExp(
    `window\\.__timelines\\s*\\[\\s*["']${beatId}["']\\s*\\]`,
    "i",
  );
  return re.test(html);
}

export function removePrefersReducedMotion(script) {
  let out = script;
  out = out.replace(
    /if\s*\(\s*window\.matchMedia\s*\(\s*['"]?\(prefers-reduced-motion:\s*reduce\)['"]?\s*\)\.matches\s*\)\s*\{[^}]*return;\s*\}/gs,
    "",
  );
  out = out.replace(
    /const\s+(?:mediaQuery|reducedMotionQuery)\s*=\s*window\.matchMedia\([^)]+\);\s*if\s*\([^)]+\)\s*\{[^}]*\}\s*else\s*\{([^}]*(?:addEventListener\s*\([^)]*\)[^}]*)*)\}/gs,
    (_, elseBody) => `\n${String(elseBody).trim()}\n`,
  );
  return out;
}

export function stripHfSeekBinding(script) {
  let out = script;
  out = out.replace(
    /\/\/\s*Kết nối.*\n/gi,
    "",
  );
  out = out.replace(
    /\s*addEventListener\s*\(\s*['"]hf-seek['"][\s\S]*?\)\s*;?\s*/g,
    "\n",
  );
  out = out.replace(
    /^\s*=>\s*\{\s*t\s*=\s*e\.detail\.time;\s*render\(\);\s*\}\);\s*$/gm,
    "",
  );
  out = out.replace(/\n\s*render\(\)\s*;\s*$/g, "");
  return out.trimEnd();
}

export function extractBeatParts(html) {
  const raw = String(html || "");

  const styleBlocks = [...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (m) => m[1].trim(),
  );
  const styleContent = styleBlocks.join("\n\n");

  let bodyContent = "";
  const bodyMatch = raw.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch) {
    bodyContent = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .trim();
  } else {
    bodyContent = raw
      .replace(/<!doctype[^>]*>/gi, "")
      .replace(/<\/?html[^>]*>/gi, "")
      .replace(/<\/?head[^>]*>[\s\S]*?<\/head>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .trim();
  }

  const scriptBlocks = [...raw.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(
    (m) => m[1].trim(),
  );
  const scriptContent = scriptBlocks.join("\n\n");

  return { styleContent, bodyContent, scriptContent };
}

export function patchScaffoldHtml(html) {
  let out = html;
  if (/<html\b/i.test(out) && /\bdata-duration\s*=/i.test(out.match(/<html[^>]*>/i)?.[0] ?? "")) {
    out = out.replace(/(<html\b[^>]*)\s+data-duration=["'][^"']*["']/i, "$1");
  }
  if (/<div\b[^>]*\bid=["']root["']/i.test(out) && !/\bid=["']root["'][^>]*\bdata-width\s*=/i.test(out)) {
    out = out.replace(
      /(<div\b[^>]*\bid=["']root["'])/i,
      '$1 data-width="1080" data-height="1920"',
    );
  }
  return out;
}

/** Clone beat (beat_16 → beat_16_part2) giữ data-composition-id gốc — đồng bộ với beatId file. */
export function patchBeatCompositionId(html, beatId) {
  if (!beatId) return { html, changed: false };
  const re = /(<div\b[^>]*\bid=["']root["'][^>]*\bdata-composition-id=["'])([^"']+)(["'])/i;
  if (!re.test(html)) return { html, changed: false };
  const current = html.match(re)?.[2];
  if (current === beatId) return { html, changed: false };
  return {
    html: html.replace(re, `$1${beatId}$3`),
    changed: true,
  };
}

export function buildTimelineRegistration(beatId, seekBridge = {}) {
  const offsetSec = Math.max(0, Number(seekBridge.offsetSec) || 0);
  const durationSec = Number(seekBridge.durationSec);
  const hasPartDuration = Number.isFinite(durationSec) && durationSec > 0;
  const durationExpr = hasPartDuration ? durationSec.toFixed(3) : "DURATION";
  const offsetExpr = offsetSec.toFixed(3);
  return `
// HyperFrames import_html — đăng ký timeline (giữ nguyên render() user)
const _beatTl = gsap.timeline({ paused: true });
_beatTl.to({ _v: 0 }, { _v: 1, duration: ${durationExpr}, ease: "none",
  onUpdate: function() { t = ${offsetExpr} + _beatTl.time(); render(); }
});
window.__timelines["${beatId}"] = _beatTl;
render();`;
}

/**
 * Offset seek trong beat gốc khi assemble tách beat >20s (clone part2+).
 * Host chỉ chạy ~nửa beat; timeline phải map localTime → t = offset + localTime.
 */
export function resolveBeatSeekBridgeFromMap(sections, beatId) {
  const list = Array.isArray(sections) ? sections : [];
  const id = String(beatId || "");
  const sec = list.find((item) => String(item.id || item.beat_id || "") === id);
  if (!sec) {
    return { offsetSec: 0, durationSec: null };
  }

  const sourceId = String(sec.split_from || id);
  const family = list.filter((item) => {
    const itemId = String(item.id || item.beat_id || "");
    return itemId === sourceId || String(item.split_from || "") === sourceId;
  });
  const first = family.find((item) => String(item.id || item.beat_id || "") === sourceId)
    || family[0]
    || sec;
  const firstStart = Number(first.startSec ?? 0);
  const offsetSec = Math.max(0, Number(sec.startSec ?? 0) - firstStart);
  const durationSec = Number(sec.durationSec ?? 0);

  return {
    offsetSec: Math.round(offsetSec * 1000) / 1000,
    durationSec: durationSec > 0 ? Math.round(durationSec * 1000) / 1000 : null,
  };
}

const SEEK_BRIDGE_RE =
  /\/\/\s*HyperFrames import_html[\s\S]*?window\.__timelines\s*\[\s*["'][^"']+["']\s*\]\s*=\s*_beatTl\s*;\s*\n?\s*render\(\)\s*;?/;

export function patchBeatSeekBridge(html, beatId, seekBridge = {}) {
  const registration = buildTimelineRegistration(beatId, seekBridge).trim();
  let out = String(html || "");
  const before = out;

  if (SEEK_BRIDGE_RE.test(out)) {
    out = out.replace(SEEK_BRIDGE_RE, registration);
  } else if (/const\s+_beatTl\s*=\s*gsap\.timeline/i.test(out)) {
    out = out.replace(
      /const\s+_beatTl\s*=\s*gsap\.timeline\([\s\S]*?window\.__timelines\s*\[\s*["'][^"']+["']\s*\]\s*=\s*_beatTl\s*;\s*\n?\s*render\(\)\s*;?/,
      registration,
    );
  } else if (/<\/script>\s*<\/template>/i.test(out)) {
    out = out.replace(
      /<\/script>(\s*<\/template>)/i,
      `\n${registration}\n</script>$1`,
    );
  } else {
    return { html: out, changed: false, patches: [] };
  }

  const durationSec = Number(seekBridge.durationSec);
  if (Number.isFinite(durationSec) && durationSec > 0) {
    const durAttr = durationSec.toFixed(3);
    out = out.replace(
      /(id=["']root["'][^>]*\bdata-duration=["'])([^"']+)(["'])/i,
      `$1${durAttr}$3`,
    );
  }

  const offsetSec = Math.max(0, Number(seekBridge.offsetSec) || 0);
  const patches = [];
  if (out !== before) {
    patches.push(
      offsetSec > 0.0005 || (Number.isFinite(durationSec) && durationSec > 0)
        ? `seek bridge offset=${offsetSec.toFixed(3)}s duration=${Number.isFinite(durationSec) && durationSec > 0 ? durationSec.toFixed(3) : "DURATION"}`
        : "seek bridge (offset=0)",
    );
  }
  return { html: out, changed: out !== before, patches };
}

export function patchBeatFontsForRender(html) {
  const patches = [];
  let out = String(html || "");

  if (!/@font-face[^}]*Be Vietnam Pro/i.test(out)) {
    if (/<style[^>]*>/i.test(out)) {
      out = out.replace(/(<style[^>]*>)/i, `$1\n${BE_VIETNAM_FONT_FACE_BLOCK}\n`);
      patches.push("inject @font-face Be Vietnam Pro");
    }
  }

  const before = out;
  out = out.replace(
    /--font(?:-[a-z0-9-]+)?\s*:\s*[^;]+;/gi,
    (match) => {
      const name = match.match(/^(--font(?:-[a-z0-9-]+)?)/i)?.[1];
      return name ? `${name}: "Be Vietnam Pro", sans-serif;` : match;
    },
  );
  out = out.replace(
    /font-family\s*:\s*var\(--font(?:-[a-z0-9-]+)?\)[^;}]*/gi,
    'font-family: "Be Vietnam Pro", sans-serif',
  );
  out = out.replace(
    /font-family\s*:\s*[^;{}]*(?:system-ui|apple-system|blinkmacsystemfont|segoe ui|roboto|oxygen|ubuntu|cantarell|-apple-system|\binter\b|sf pro|\bimpact\b|arial black)[^;{}]*/gi,
    'font-family: "Be Vietnam Pro", sans-serif',
  );

  out = out.replace(
    /url\(\s*["']?\.\.\/assets\/fonts\//gi,
    'url("assets/fonts/',
  );

  if (out !== before) {
    patches.push("thay font → Be Vietnam Pro");
  }

  return { html: out, changed: out !== html, patches };
}

export function patchBeatCssForRender(html) {
  const patches = [];
  let out = String(html || "");
  const before = out;

  out = out.replace(/;\s*uppercase\s*;/gi, "; text-transform: uppercase;");
  out = out.replace(/([{;]\s*)uppercase\s*;/gi, "$1text-transform: uppercase;");
  out = out.replace(/;\s*uppercase\s+(?=[a-z-])/gi, "; text-transform: uppercase; ");
  out = out.replace(/tracking-spacing/gi, "letter-spacing");

  if (/;\s*uppercase\b/i.test(out) && !/text-transform\s*:\s*uppercase/i.test(out)) {
    out = out.replace(/;\s*uppercase\b/gi, "; text-transform: uppercase");
  }

  if (out !== before) {
    patches.push("sửa CSS tailwind leak (uppercase/tracking-spacing)");
  }

  return { html: out, changed: out !== before, patches };
}

/**
 * HyperFrames scopes sub-comp CSS by data-composition-id, nhưng `:root { --token }`
 * vẫn gắn documentElement chung → beat sau ghi đè màu/panel của beat trước.
 * Gắn token lên `#root` (HF special-case) để mỗi beat giữ biến riêng.
 */
export function patchCssRootCustomProperties(html) {
  const patches = [];
  let out = String(html || "");
  if (!/<style[\s>]/i.test(out) || !/:root\b/.test(out)) {
    return { html: out, changed: false, patches };
  }

  const before = out;
  out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (full, attrs, css) => {
    if (!/:root\b/.test(css)) return full;
    const rewritten = css.replace(/(^|[^#\w-]):root\b/g, "$1#root");
    return `<style${attrs}>${rewritten}</style>`;
  });

  if (out !== before) {
    patches.push("css :root → #root (tránh leak biến khi composite)");
  }

  return { html: out, changed: out !== before, patches };
}

/** True nếu <style> còn :root kèm custom property --* (nguy cơ leak khi composite). */
export function styleHasRootCustomProperties(html) {
  for (const match of String(html || "").matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    const css = match[1] || "";
    if (/:root\b/.test(css) && /--[a-zA-Z_][\w-]*\s*:/.test(css)) {
      return true;
    }
  }
  return false;
}

export function patchBeatDeterminismForRender(html) {
  const patches = [];
  let out = String(html || "");
  if (!/Math\.random\s*\(/i.test(out)) {
    return { html: out, changed: false, patches };
  }
  out = out.replace(/Math\.random\s*\(\s*\)/gi, "0.5");
  patches.push("Math.random → 0.5 (deterministic)");
  return { html: out, changed: true, patches };
}

const PEXELS_VIDEO_ID_RE = /video-files\/(\d+)\//i;

function readVideoPosterMap(projectDir) {
  const mapPath = path.join(projectDir, "assets/video-poster-map.json");
  if (!fs.existsSync(mapPath)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(mapPath, "utf8"));
  } catch {
    return {};
  }
}

function parseCssOpacityForClass(html, className) {
  const tokens = String(className || "")
    .split(/\s+/)
    .filter(Boolean);
  for (const token of tokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\.${escaped}[^{]*\\{[^}]*\\bopacity\\s*:\\s*([0-9.]+)`, "i");
    const m = String(html || "").match(re);
    if (m) {
      const value = parseFloat(m[1]);
      if (Number.isFinite(value)) return value;
    }
  }
  return 0.15;
}

/**
 * Trích <video> trong beat trước khi patch — dùng hoist lên index.html.
 */
export function extractBeatVideoSlots(html, beatId) {
  const source = String(html || "");
  const videoBlockRe = /<video\b([^>]*)>([\s\S]*?)<\/video>/gi;
  const slots = [];
  let m;
  while ((m = videoBlockRe.exec(source)) !== null) {
    const attrs = m[1];
    const inner = m[2];
    let src = attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1] || "";
    if (!src) {
      src = inner.match(/<source\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] || "";
    }
    if (!src || !/\.(mp4|webm|mov|m4v)(\?|$)|^assets\/video\/|videos\.pexels\.com/i.test(src)) {
      continue;
    }
    const className = attrs.match(/\bclass=["']([^"']+)["']/i)?.[1] || "bg-video";
    const styleOpacity = attrs.match(/\bstyle=["'][^"']*\bopacity\s*:\s*([0-9.]+)/i)?.[1];
    const opacity = styleOpacity
      ? parseFloat(styleOpacity)
      : parseCssOpacityForClass(source, className);
    slots.push({
      beatId,
      src,
      className,
      opacity: Number.isFinite(opacity) ? opacity : 0.15,
      muted: /\bmuted\b/i.test(attrs),
      loop: /\bloop\b/i.test(attrs),
    });
  }
  return slots;
}

function parseBeatHostsFromIndex(html) {
  const hosts = [];
  const re =
    /<section\b[^>]*\bid="beat-(\d+)"[^>]*\bdata-composition-id="(beat_\d+)"[^>]*\bdata-start="([^"]+)"[^>]*\bdata-duration="([^"]+)"[^>]*style="[^"]*z-index:\s*(\d+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    hosts.push({
      num: parseInt(m[1], 10),
      beatId: m[2],
      startSec: parseFloat(m[3]),
      durationSec: parseFloat(m[4]),
      zIndex: parseInt(m[5], 10),
    });
  }
  hosts.sort((a, b) => a.num - b.num);
  return hosts;
}

/**
 * Hoist stock video từ beat lên index.html (#root direct child) — pass media_in_subcomposition.
 */
export function wireBeatStockVideosToIndex(projectDir, slots = []) {
  const indexPath = path.join(projectDir, "index.html");
  if (!fs.existsSync(indexPath) || !Array.isArray(slots) || slots.length === 0) {
    return { wired: 0, skipped: 0, manifest: [] };
  }

  let html = fs.readFileSync(indexPath, "utf8");
  html = html.replace(
    /<video\b[^>]*\bclass="[^"]*\bbeat-stock-video\b[^"]*"[^>]*>\s*<\/video>\s*/gi,
    "",
  );

  const hosts = parseBeatHostsFromIndex(html);
  const hostByBeatId = new Map(hosts.map((h) => [h.beatId, h]));
  const manifest = [];
  const RESERVED_TRACKS = new Set([10, 11, 12, 20, 21, 30, 31]);
  let trackIndex = 32;
  function nextTrackIndex() {
    while (RESERVED_TRACKS.has(trackIndex)) trackIndex += 1;
    const idx = trackIndex;
    trackIndex += 1;
    return idx;
  }
  const clips = [];

  for (const slot of slots) {
    const host = hostByBeatId.get(slot.beatId);
    if (!host) {
      console.warn(`[wire-beat-stock-videos] ${slot.beatId}: không tìm beat-host trong index.html`);
      continue;
    }

    const src = slot.src.startsWith("assets/")
      ? slot.src
      : slot.src.replace(/^\//, "");
    const absVideo = path.join(projectDir, src);
    if (!fs.existsSync(absVideo)) {
      console.warn(`[wire-beat-stock-videos] ${slot.beatId}: thiếu file ${src}`);
      continue;
    }

    const zIndex = Math.max(1, (host.zIndex || 10) - 1);
    const opacity = Math.min(1, Math.max(0.05, Number(slot.opacity) || 0.15));
    const id = `stock-video-${slot.beatId.replace(/_/g, "-")}`;
    const ti = nextTrackIndex();
    clips.push(
      `    <video class="clip beat-stock-video" id="${id}" src="${src}"\n` +
        `      data-start="${host.startSec.toFixed(3)}" data-duration="${host.durationSec.toFixed(3)}" data-track-index="${ti}"\n` +
        `      muted loop playsinline\n` +
        `      style="position:absolute;inset:0;width:1080px;height:1920px;object-fit:cover;opacity:${opacity};z-index:${zIndex};pointer-events:none;"></video>`,
    );
    manifest.push({
      beatId: slot.beatId,
      src,
      startSec: host.startSec,
      durationSec: host.durationSec,
      zIndex,
      trackIndex: ti,
      opacity,
    });
  }

  if (clips.length === 0) {
    return { wired: 0, skipped: slots.length, manifest };
  }

  const insertBefore =
    html.match(/\n\s*<section\b[^>]*\bid="beat-1"/i) ??
    html.match(/\n\s*<audio\b[^>]*\bid="narration"/i);
  if (!insertBefore) {
    console.error("[wire-beat-stock-videos] không tìm vị trí chèn clip video");
    return { wired: 0, skipped: slots.length, manifest };
  }

  html = html.replace(insertBefore[0], `\n${clips.join("\n")}\n${insertBefore[0]}`);
  fs.writeFileSync(indexPath, html);

  const manifestPath = path.join(projectDir, "assets/beat-stock-videos.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return { wired: clips.length, skipped: slots.length - clips.length, manifest };
}

export function injectBeatStockVideoTransparency(html) {
  if (!/hf-beat-video-replaced|hf-beat-bg/i.test(html)) {
    return html;
  }
  let out = html;
  if (!/\bhf-beat-has-stock-video\b/i.test(out)) {
    out = out.replace(/(<div[^>]*\bclass=")([^"]*\bscene-root\b[^"]*)(")/i, (full, p, cls, s) => {
      if (/\bhf-beat-has-stock-video\b/.test(cls)) return full;
      return `${p}${cls} hf-beat-has-stock-video${s}`;
    });
  }
  if (/<style[^>]*>/i.test(out) && !/\.hf-beat-has-stock-video/i.test(out)) {
    out = out.replace(
      /(<style[^>]*>)/i,
      `$1
.hf-beat-has-stock-video,.hf-beat-has-stock-video #stage{background-color:transparent!important;background:transparent!important;}
.hf-beat-has-stock-video .hf-beat-video-replaced,.hf-beat-has-stock-video .hf-beat-bg.hf-beat-video-replaced{display:none!important;}
`,
    );
  }
  return out;
}

/**
 * HyperFrames cấm <video> trong beat sub-composition (media_in_subcomposition).
 * Thay bằng placeholder — video thật được hoist lên index.html.
 */
export function patchBeatVideosForRender(html, projectDir = "") {
  const patches = [];
  const videoBlockRe = /<video\b([^>]*)>[\s\S]*?<\/video>/gi;

  const out = String(html || "").replace(videoBlockRe, (full, attrs) => {
    const classMatch = attrs.match(/\bclass=["']([^"']+)["']/i);
    const cls = classMatch ? classMatch[1] : "hf-beat-bg";

    patches.push("video→index hoist placeholder");
    return `<div class="${cls} hf-beat-video-replaced" aria-hidden="true"></div>`;
  });

  let styled = out;
  if (patches.length > 0) {
    styled = injectBeatStockVideoTransparency(styled);
    if (styled.includes("hf-beat-video-replaced") && !/\.hf-beat-video-replaced/i.test(styled)) {
      if (/<style[^>]*>/i.test(styled)) {
        styled = styled.replace(
          /(<style[^>]*>)/i,
          `$1\n.hf-beat-video-replaced{width:100%;height:100%;}\n`,
        );
        patches.push("inject .hf-beat-video-replaced");
      }
    }
    patches.push("transparent stage for stock video");
  }

  return { html: styled, changed: styled !== html, patches };
}

export function normalizeBeatHtmlForRender(html, beatId, options = {}) {
  if (!html.trim() || !beatId) {
    return { html, changed: false, patches: [] };
  }

  const seekBridge = options.seekBridge || { offsetSec: 0, durationSec: null };

  const fontPatch = patchBeatFontsForRender(html);
  html = fontPatch.html;
  const fontPatches = [...fontPatch.patches];

  const rootCssPatch = patchCssRootCustomProperties(html);
  html = rootCssPatch.html;
  fontPatches.push(...rootCssPatch.patches);

  const compPatch = patchBeatCompositionId(html, beatId);
  html = compPatch.html;
  if (compPatch.changed) {
    fontPatches.push(`đồng bộ data-composition-id → ${beatId}`);
  }

  if (isBeatRenderReady(html, beatId)) {
    const bridgePatch = patchBeatSeekBridge(html, beatId, seekBridge);
    html = bridgePatch.html;
    fontPatches.push(...bridgePatch.patches);
    const earlyChanged = fontPatch.changed
      || rootCssPatch.changed
      || compPatch.changed
      || bridgePatch.changed;
    return {
      html,
      changed: earlyChanged,
      patches: fontPatches.length ? fontPatches : ["already render-ready"],
    };
  }

  const patches = [];
  let { styleContent, bodyContent, scriptContent } = extractBeatParts(html);

  if (!scriptContent || !/function\s+render\s*\(/i.test(scriptContent)) {
    return {
      html,
      changed: false,
      patches: [],
      error: `${beatId}: thiếu function render() — không thể normalize`,
    };
  }

  let script = scriptContent;
  if (/prefers-reduced-motion|matchMedia/i.test(script)) {
    script = removePrefersReducedMotion(script);
    patches.push("gỡ prefers-reduced-motion");
  }
  if (/addEventListener\s*\(\s*['"]hf-seek['"]/i.test(script)) {
    script = stripHfSeekBinding(script);
    patches.push("thay hf-seek → GSAP timeline");
  }

  script = `window.__timelines = window.__timelines || {};\n${script.trim()}`;
  script += buildTimelineRegistration(beatId, seekBridge);

  let assembled = `<!DOCTYPE html>
<html lang="vi">
<head><meta charset="utf-8"></head>
<body>
<template>
<style>
${styleContent}
</style>
${bodyContent}
<script src="${GSAP_CDN}"></script>
<script>
${script}
</script>
</template>
</body>
</html>`;

  assembled = patchScaffoldHtml(assembled);
  const compIdPatch = patchBeatCompositionId(assembled, beatId);
  assembled = compIdPatch.html;
  if (compIdPatch.changed) {
    patches.push(`đồng bộ data-composition-id → ${beatId}`);
  }
  const bridgePatch = patchBeatSeekBridge(assembled, beatId, seekBridge);
  assembled = bridgePatch.html;
  patches.push(...bridgePatch.patches);
  patches.push("bọc <template>");
  patches.push(`đăng ký window.__timelines["${beatId}"]`);
  patches.push(...fontPatches);

  return { html: assembled, changed: true, patches };
}

export function collectExternalImageUrls(html) {
  const urls = new Set();
  const isImageUrl = (url) =>
    /\.(jpe?g|png|gif|webp|svg|avif)(\?|$)/i.test(url) ||
    /\/images?\//i.test(url) ||
    /s\.yimg\.com|unsplash|pexels|cloudinary|imgur/i.test(url);

  for (const m of html.matchAll(/<img\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["']/gi)) {
    if (isImageUrl(m[1])) urls.add(m[1]);
  }
  for (const m of html.matchAll(/url\(\s*['"]?(https?:\/\/[^'")]+)['"]?\s*\)/gi)) {
    if (isImageUrl(m[1])) urls.add(m[1]);
  }
  return [...urls];
}

export function collectExternalVideoUrls(html) {
  const urls = new Set();
  const isVideoUrl = (url) =>
    /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) ||
    /videos\.pexels\.com|player\.vimeo|video/i.test(url);

  for (const m of html.matchAll(/<(?:video|source)\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["']/gi)) {
    if (isVideoUrl(m[1])) urls.add(m[1]);
  }
  return [...urls];
}

function downloadUrl(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);
    proto
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.unlinkSync(dest);
          downloadUrl(res.headers.location, dest).then(resolve).catch(reject);
          return;
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(dest);
          reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          return;
        }
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", (err) => {
        file.close();
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        reject(err);
      });
  });
}

function localImageName(url) {
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 12);
  const extMatch = url.match(/\.(jpe?g|png|gif|webp)(\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
  return `article_${hash}.${ext}`;
}

function localVideoName(url) {
  const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 12);
  const extMatch = url.match(/\.(mp4|webm|mov|m4v)(\?|$)/i);
  const ext = extMatch ? extMatch[1].toLowerCase() : "mp4";
  return `stock_${hash}.${ext}`;
}

export async function localizeExternalImages(projectDir, htmlFiles) {
  const imagesDir = path.join(projectDir, "assets/images");
  const videosDir = path.join(projectDir, "assets/video");
  fs.mkdirSync(imagesDir, { recursive: true });
  fs.mkdirSync(videosDir, { recursive: true });

  const mapPath = path.join(projectDir, IMAGE_MAP_REL);
  const posterMapPath = path.join(projectDir, "assets/video-poster-map.json");
  let urlMap = {};
  let videoPosterMap = {};
  if (fs.existsSync(mapPath)) {
    try {
      urlMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    } catch {
      urlMap = {};
    }
  }
  if (fs.existsSync(posterMapPath)) {
    try {
      videoPosterMap = JSON.parse(fs.readFileSync(posterMapPath, "utf8"));
    } catch {
      videoPosterMap = {};
    }
  }

  // Backfill poster map for videos already localized (re-render without re-download).
  for (const localRel of Object.values(urlMap)) {
    if (!String(localRel).startsWith("assets/video/")) continue;
    if (videoPosterMap[localRel]) continue;
    const posterRel = String(localRel).replace(/\.mp4$/i, "_poster.jpg").replace("assets/video/", "assets/images/");
    if (fs.existsSync(path.join(projectDir, posterRel))) {
      videoPosterMap[localRel] = posterRel;
    }
  }

  const allUrls = new Set();
  const allVideoUrls = new Set();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    for (const url of collectExternalImageUrls(html)) {
      allUrls.add(url);
    }
    for (const url of collectExternalVideoUrls(html)) {
      allVideoUrls.add(url);
    }
  }

  const patches = [];
  for (const url of allUrls) {
    const existing = urlMap[url];
    if (existing && fs.existsSync(path.join(projectDir, existing))) continue;
    const filename = localImageName(url);
    const localRel = `assets/images/${filename}`;
    const dest = path.join(projectDir, localRel);
    if (!fs.existsSync(dest)) {
      await downloadUrl(url, dest);
      patches.push(`download ${filename}`);
    }
    urlMap[url] = localRel;
  }

  for (const url of allVideoUrls) {
    const existing = urlMap[url];
    const filename = existing
      ? path.basename(existing)
      : localVideoName(url);
    const localRel = existing || `assets/video/${filename}`;
    const dest = path.join(projectDir, localRel);
    if (!fs.existsSync(dest)) {
      await downloadUrl(url, dest);
      patches.push(`download ${filename}`);
    }
    urlMap[url] = localRel;

    const idMatch = url.match(PEXELS_VIDEO_ID_RE);
    if (idMatch) {
      const posterFilename = filename.replace(/\.mp4$/i, "_poster.jpg");
      const posterRel = `assets/images/${posterFilename}`;
      const posterDest = path.join(projectDir, posterRel);
      const previewUrl = `https://images.pexels.com/videos/${idMatch[1]}/pictures/preview-0.jpeg`;
      if (!fs.existsSync(posterDest)) {
        try {
          await downloadUrl(previewUrl, posterDest);
          patches.push(`download poster ${posterFilename}`);
        } catch {
          /* poster optional */
        }
      }
      if (fs.existsSync(posterDest)) {
        videoPosterMap[localRel] = posterRel;
      }
    }
  }

  for (const [url, localRel] of Object.entries(urlMap)) {
    if (!String(localRel).startsWith("assets/video/")) continue;
    const dest = path.join(projectDir, localRel);
    if (fs.existsSync(dest) || !String(url).startsWith("http")) continue;
    try {
      await downloadUrl(url, dest);
      patches.push(`re-download ${path.basename(localRel)}`);
    } catch {
      console.warn(`[localize] không tải lại được ${url}`);
    }
  }

  if (patches.length) {
    fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2));
  }
  if (Object.keys(videoPosterMap).length > 0) {
    fs.writeFileSync(
      path.join(projectDir, "assets/video-poster-map.json"),
      JSON.stringify(videoPosterMap, null, 2),
    );
  }

  for (const file of htmlFiles) {
    let html = fs.readFileSync(file, "utf8");
    let changed = false;
    for (const [remote, localRel] of Object.entries(urlMap)) {
      if (html.includes(remote)) {
        html = html.split(remote).join(localRel);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, html, "utf8");
      patches.push(`replace URLs in ${path.basename(file)}`);
    }
  }

  return patches;
}

export function checkImportHtmlBeatFile(name, content, options = {}) {
  const errors = [];
  const beatId = beatIdFromFilename(name);
  if (!beatId) return errors;

  if (!/<template>/i.test(content)) {
    errors.push(`${name}: thiếu <template> — chạy normalize-import-html-beat-for-render.mjs`);
  }
  if (!/function\s+render\s*\(/i.test(content)) {
    errors.push(`${name}: thiếu function render()`);
  }
  if (!isBeatRenderReady(content, beatId)) {
    errors.push(
      `${name}: thiếu window.__timelines["${beatId}"] — chạy normalize-import-html-beat-for-render.mjs`,
    );
  }
  if (/addEventListener\s*\(\s*['"]hf-seek['"]/i.test(content)) {
    errors.push(
      `${name}: còn addEventListener('hf-seek') thuần — HyperFrames render sẽ mất animation`,
    );
  }
  if (/prefers-reduced-motion/i.test(content)) {
    errors.push(`${name}: còn prefers-reduced-motion — headless render tắt animation`);
  }
  if (collectExternalImageUrls(content).length > 0) {
    errors.push(
      `${name}: còn ảnh URL ngoài — chạy normalize-import-html-beat-for-render.mjs --localize-images`,
    );
  }
  if (collectExternalVideoUrls(content).length > 0) {
    errors.push(
      `${name}: còn video URL ngoài — chạy normalize-import-html-beat-for-render.mjs --localize-images`,
    );
  }
  if (styleHasRootCustomProperties(content)) {
    errors.push(
      `${name}: còn :root { --* } trong <style> — sẽ leak màu khi composite; chạy normalize-import-html-beat-for-render.mjs`,
    );
  }

  const seekBridge = options.seekBridge;
  if (seekBridge && Number(seekBridge.offsetSec) > 0.0005) {
    const offset = Number(seekBridge.offsetSec).toFixed(3);
    const offsetRe = new RegExp(
      `t\\s*=\\s*${offset.replace(".", "\\.")}\\s*\\+\\s*_beatTl\\.time\\(\\)`,
    );
    if (!offsetRe.test(content)) {
      errors.push(
        `${name}: thiếu seek offset ${offset}s (beat split) — sẽ lặp lại nửa đầu beat; chạy normalize-import-html-beat-for-render.mjs`,
      );
    }
  } else if (/_part\d+$/i.test(beatId) && /t\s*=\s*_beatTl\.time\(\)/.test(content)) {
    errors.push(
      `${name}: beat part còn seek từ t=0 — sẽ lặp nửa đầu; chạy normalize-import-html-beat-for-render.mjs`,
    );
  }

  const rootMatch = content.match(/id=["']root["'][^>]*/i);
  if (rootMatch && !/data-width\s*=/i.test(rootMatch[0])) {
    errors.push(`${name}: #root thiếu data-width/data-height`);
  }

  return errors;
}
