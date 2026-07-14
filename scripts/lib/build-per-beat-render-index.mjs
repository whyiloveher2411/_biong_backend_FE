/**
 * Mini HyperFrames project: 1 beat inline as standalone `main` (silent).
 * Không dùng data-composition-src — tránh scoping/sub-comp khác preview iframe.
 */
import fs from "node:fs";
import path from "node:path";

/** Xóa path mà không follow symlink (tránh xóa nhầm target). */
function rmPathNoFollow(linkPath) {
  try {
    fs.lstatSync(linkPath);
  } catch {
    return;
  }
  fs.rmSync(linkPath, { recursive: true, force: true });
}

function ensureSymlinkAbs(linkPath, targetAbs) {
  rmPathNoFollow(linkPath);
  fs.symlinkSync(targetAbs, linkPath);
}

/**
 * Lấy nội dung trong <template>…</template> (normalize scaffold).
 * Fallback: body inner / toàn file.
 */
export function extractBeatTemplateInner(beatHtml) {
  const m = beatHtml.match(/<template[^>]*>([\s\S]*?)<\/template>/i);
  if (m) return m[1].trim();
  const body = beatHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) return body[1].trim();
  return beatHtml.trim();
}

/** Thu thập path local assets/images để compiler HyperFrames embed (không chỉ img HTML tĩnh). */
function collectLocalImageSrcs(html) {
  const found = new Set();
  const re = /(?:src=["']|(?:["'`]))(assets\/images\/[^"'`\s)]+)/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    found.add(m[1]);
  }
  return [...found];
}

/**
 * Đưa beat sub-comp (template + beat_N timeline) thành standalone index main.
 */
export function buildStandaloneBeatIndexHtml(beatHtml, beatId, durationSec) {
  let inner = extractBeatTemplateInner(beatHtml);
  const t = Number(durationSec);
  const idEsc = beatId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Root composition id → main (HyperFrames standalone)
  inner = inner.replace(
    new RegExp(`data-composition-id=["']${idEsc}["']`, "gi"),
    'data-composition-id="main"',
  );

  // Timeline registry key → main
  inner = inner.replace(
    new RegExp(`window\\.__timelines\\[['"\`]${idEsc}['"\`]\\]`, "g"),
    'window.__timelines["main"]',
  );
  inner = inner.replace(
    new RegExp(`window\\.__timelines\\.${idEsc}\\b`, "g"),
    "window.__timelines.main",
  );

  // data-duration + data-start trên root main
  inner = inner.replace(
    /(<div\b[^>]*\bdata-composition-id="main")([^>]*)(>)/i,
    (_, open, mid, close) => {
      let attrs = mid;
      if (!/\bdata-start=/.test(attrs)) attrs += ' data-start="0"';
      if (/\bdata-duration=/.test(attrs)) {
        attrs = attrs.replace(/\bdata-duration=["'][^"']*["']/, `data-duration="${t.toFixed(3)}"`);
      } else {
        attrs += ` data-duration="${t.toFixed(3)}"`;
      }
      return `${open}${attrs}${close}`;
    },
  );

  // GSAP duration trong scaffold _beatTl.to(..., { duration: X })
  inner = inner.replace(
    /(\.to\(\s*\{\s*_v:\s*0\s*\}\s*,\s*\{\s*_v:\s*1\s*,\s*duration:\s*)[\d.]+/g,
    `$1${t.toFixed(3)}`,
  );

  // Hidden <img> để HyperFrames compile embed mọi frame ảnh động (IMAGES[])
  const imageSrcs = collectLocalImageSrcs(inner);
  const hiddenImgs =
    imageSrcs.length > 0
      ? `\n<div aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none">${imageSrcs
          .map((src) => `<img src="${src}" alt="" />`)
          .join("")}</div>\n`
      : "";

  const hasGsap = /gsap(\.min)?\.js/i.test(inner);
  const gsapTag = hasGsap
    ? ""
    : `  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"><\/script>\n`;

  // Seek-safe: CSS transition trên transform/opacity phá headless multi-worker seek
  const seekSafeCss = `<style id="hf-seek-safe">*,*::before,*::after{transition:none!important}</style>\n`;

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>${beatId}</title>
${gsapTag}${seekSafeCss}</head>
<body>
${hiddenImgs}${inner}
</body>
</html>
`;
}

/**
 * Tạo thư mục renders/beat-clips/{beatId}/ với index standalone + symlink assets.
 * @returns {{ clipDir: string, indexPath: string, outputMp4: string }}
 */
export function preparePerBeatClipDir(projectDir, beatId, durationSec) {
  const projectAbs = path.resolve(projectDir);
  const clipsRoot = path.join(projectAbs, "renders", "beat-clips");
  const clipDir = path.join(clipsRoot, beatId);

  rmPathNoFollow(clipDir);
  fs.mkdirSync(clipDir, { recursive: true });

  const sourceBeat = path.join(projectAbs, "compositions", `${beatId}.html`);
  if (!fs.existsSync(sourceBeat)) {
    throw new Error(`Thiếu compositions/${beatId}.html`);
  }

  const beatHtml = fs.readFileSync(sourceBeat, "utf8");
  const indexHtml = buildStandaloneBeatIndexHtml(beatHtml, beatId, durationSec);
  const indexPath = path.join(clipDir, "index.html");
  fs.writeFileSync(indexPath, indexHtml, "utf8");

  ensureSymlinkAbs(path.join(clipDir, "assets"), path.join(projectAbs, "assets"));

  const outputMp4 = path.join(clipsRoot, `${beatId}.mp4`);
  return { clipDir, indexPath, outputMp4 };
}
