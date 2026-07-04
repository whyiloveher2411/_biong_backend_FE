/**
 * Chuẩn hóa beat HTML từ chatbot (preview hf-seek) → format HyperFrames render
 * (<template> + window.__timelines). Không đụng visual CSS/DOM/render() logic.
 */
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";
import crypto from "crypto";

export const GSAP_CDN =
  "https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js";

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
      if (data?.phase === "import_assemble") return "import_html";
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
  const m = String(name).match(/^(beat_\d+)\.html$/i);
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

export function buildTimelineRegistration(beatId) {
  return `
// HyperFrames import_html — đăng ký timeline (giữ nguyên render() user)
const _beatTl = gsap.timeline({ paused: true });
_beatTl.to({ _v: 0 }, { _v: 1, duration: DURATION, ease: "none",
  onUpdate: function() { t = _beatTl.time(); render(); }
});
window.__timelines["${beatId}"] = _beatTl;
render();`;
}

export function normalizeBeatHtmlForRender(html, beatId) {
  if (!html.trim() || !beatId) {
    return { html, changed: false, patches: [] };
  }

  if (isBeatRenderReady(html, beatId)) {
    return { html, changed: false, patches: ["already render-ready"] };
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
  script += buildTimelineRegistration(beatId);

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
  patches.push("bọc <template>");
  patches.push(`đăng ký window.__timelines["${beatId}"]`);

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

export async function localizeExternalImages(projectDir, htmlFiles) {
  const imagesDir = path.join(projectDir, "assets/images");
  fs.mkdirSync(imagesDir, { recursive: true });

  const mapPath = path.join(projectDir, IMAGE_MAP_REL);
  let urlMap = {};
  if (fs.existsSync(mapPath)) {
    try {
      urlMap = JSON.parse(fs.readFileSync(mapPath, "utf8"));
    } catch {
      urlMap = {};
    }
  }

  const allUrls = new Set();
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    for (const url of collectExternalImageUrls(html)) {
      allUrls.add(url);
    }
  }

  const patches = [];
  for (const url of allUrls) {
    if (urlMap[url]) continue;
    const filename = localImageName(url);
    const localRel = `assets/images/${filename}`;
    const dest = path.join(projectDir, localRel);
    if (!fs.existsSync(dest)) {
      await downloadUrl(url, dest);
      patches.push(`download ${filename}`);
    }
    urlMap[url] = localRel;
  }

  if (patches.length) {
    fs.writeFileSync(mapPath, JSON.stringify(urlMap, null, 2));
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

export function checkImportHtmlBeatFile(name, content) {
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

  const rootMatch = content.match(/id=["']root["'][^>]*/i);
  if (rootMatch && !/data-width\s*=/i.test(rootMatch[0])) {
    errors.push(`${name}: #root thiếu data-width/data-height`);
  }

  return errors;
}
