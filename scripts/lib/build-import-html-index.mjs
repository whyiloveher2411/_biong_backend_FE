import { getClipRenderSpec } from "./clip-render-spec.mjs";

export function buildBeatHostSections(sections, totalVideoSec = 0) {
  const snapped = snapBeatSectionsForIndex(sections, totalVideoSec);
  return snapped
    .map((sec, index) => {
      const beatId = sec.id || sec.beat_id;
      const start = Number(sec.startSec).toFixed(3);
      const dur = Number(sec.durationSec).toFixed(3);
      return `    <section id="beat-${index + 1}" class="clip beat-host" data-composition-id="${beatId}" data-composition-src="compositions/${beatId}.html" data-start="${start}" data-duration="${dur}" data-track-index="1" style="position:absolute;inset:0;z-index:${10 + index};"></section>`;
    })
    .join("\n");
}

export function snapBeatSectionsForIndex(sections, totalVideoSec) {
  const list = Array.isArray(sections) ? sections : [];
  const total = Math.round(Number(totalVideoSec || 0) * 1000) / 1000;
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const sec = list[i];
    const start = Math.round(Number(sec.startSec ?? 0) * 1000) / 1000;
    const nextStart =
      i < list.length - 1
        ? Math.round(Number(list[i + 1].startSec) * 1000) / 1000
        : total;
    let dur = Math.round((nextStart - start) * 1000) / 1000;
    if (i < list.length - 1 && dur > 0.002) {
      dur = Math.round((dur - 0.001) * 1000) / 1000;
    }
    out.push({ ...sec, startSec: start, durationSec: Math.max(0.001, dur) });
  }
  return out;
}

export function buildImportHtmlIndexHtml({ shortVideoId, totalVideoSec, sections, options = {} }) {
  const spec = options.renderSpec || getClipRenderSpec("9:16");
  const w = spec.width;
  const h = spec.height;
  const t = Number(totalVideoSec).toFixed(3);
  const beatHosts = buildBeatHostSections(sections, totalVideoSec);
  const sfxHook = options.sfxHook
    ? `    <audio id="sfx-hook" class="clip sfx-hook" src="assets/audio/sfx_hook.mp3" data-start="0" data-duration="0.58" data-track-index="12" data-volume="0.45"></audio>\n`
    : "";
  const avatarOverlay = options.avatarOverlay
    ? `    <div id="avatar-layer" class="clip hf-overlay-avatar" data-composition-id="avatar-overlay" data-composition-src="compositions/avatar-overlay.html" data-start="0" data-duration="${t}" data-track-index="19" style="position:absolute;inset:0;z-index:8800;"></div>\n`
    : "";
  const avatarCss = options.avatarOverlay
    ? `    .hf-overlay-avatar { z-index:8800 !important; pointer-events:none; }\n`
    : "";
  const showCaptions = options.showCaptions !== false;
  const captionsCss = showCaptions
    ? `    .hf-overlay-caption { z-index:9000 !important; pointer-events:none; }\n`
    : "";
  const captionsHost = showCaptions
    ? `    <div id="captions-layer" class="clip hf-overlay-caption" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${t}" data-track-index="20" style="position:absolute;inset:0;z-index:9000;"></div>\n`
    : "";

  const showBrand = options.showBrand === true;
  const brandCss = showBrand
    ? `    .hf-overlay-brand { z-index:9500 !important; pointer-events:none; }\n`
    : "";
  const brandHost = showBrand
    ? `    <div id="brand-layer" class="clip hf-overlay-brand" data-composition-id="brand-watermark" data-composition-src="compositions/brand-watermark.html" data-start="0" data-duration="${t}" data-track-index="21" style="position:absolute;inset:0;z-index:9500;"></div>`
    : "";

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${w}, height=${h}" />
  <title>Short Video #${shortVideoId}</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:400; font-display:swap; src:url("assets/fonts/BeVietnamPro-Regular.ttf") format("truetype"); }
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:600; font-display:swap; src:url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype"); }
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:700; font-display:swap; src:url("assets/fonts/BeVietnamPro-Bold.ttf") format("truetype"); }
    @font-face { font-family:"Be Vietnam Pro"; font-style:normal; font-weight:800; font-display:swap; src:url("assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype"); }
    html, body { width:${w}px; height:${h}px; margin:0; overflow:hidden; background:#050505; }
    #root { position:relative; width:${w}px; height:${h}px; overflow:hidden; background:#050505; font-family:"Be Vietnam Pro", system-ui, sans-serif; }
    .clip { position:absolute; inset:0; }
    .beat-host { overflow:hidden; background:transparent; }
${captionsCss}${avatarCss}${brandCss}  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${t}" data-width="${w}" data-height="${h}">
    <audio id="narration" class="clip" src="assets/audio/narration.mp3" data-start="0" data-duration="${t}" data-track-index="10" data-volume="1.4"></audio>
${sfxHook}${beatHosts}
    <div id="ambient-layer" class="clip beat-host" data-composition-id="ambient" data-composition-src="compositions/ambient-layer.html" data-start="0" data-duration="${t}" data-track-index="30" style="position:absolute;inset:0;z-index:800;"></div>
${avatarOverlay}${captionsHost}${brandHost}
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const _mainTl = gsap.timeline({ paused: true });
    _mainTl.to({ _v: 0 }, {
      _v: 1,
      duration: ${t},
      ease: "none",
    });
    window.__timelines.main = _mainTl;
  </script>
</body>
</html>`;
}
