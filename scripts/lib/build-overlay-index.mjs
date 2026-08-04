/**
 * Overlay pass: video underlay (visual-silent) + caption + brand + progress + ambient (+ avatar optional).
 * Không gắn narration/BGM/SFX (mux riêng bằng ffmpeg).
 */
import { getClipRenderSpec } from "./clip-render-spec.mjs";

export function buildOverlayIndexHtml({
  shortVideoId,
  totalVideoSec,
  underlaySrc = "underlay.mp4",
  avatarOverlay = false,
  showCaptions = true,
  showBrand = false,
  renderSpec = null,
}) {
  const spec = renderSpec || getClipRenderSpec("9:16");
  const w = spec.width;
  const h = spec.height;
  const t = Number(totalVideoSec).toFixed(3);
  const avatarCss = avatarOverlay
    ? `    .hf-overlay-avatar { z-index:8800 !important; pointer-events:none; }\n`
    : "";
  const avatarHost = avatarOverlay
    ? `    <div id="avatar-layer" class="clip hf-overlay-avatar" data-composition-id="avatar-overlay" data-composition-src="compositions/avatar-overlay.html" data-start="0" data-duration="${t}" data-track-index="19" style="position:absolute;inset:0;z-index:8800;"></div>\n`
    : "";
  const captionsCss = showCaptions
    ? `    .hf-overlay-caption { z-index:9000 !important; pointer-events:none; }\n`
    : "";
  const captionsHost = showCaptions
    ? `    <div id="captions-layer" class="clip hf-overlay-caption" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${t}" data-track-index="20" style="position:absolute;inset:0;z-index:9000;"></div>\n`
    : "";
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
  <title>Short Video #${shortVideoId} overlay</title>
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
    .visual-underlay { width:${w}px; height:${h}px; object-fit:cover; }
${captionsCss}${avatarCss}${brandCss}  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${t}" data-width="${w}" data-height="${h}">
    <video id="visual-underlay" class="clip visual-underlay" src="${underlaySrc}" data-start="0" data-duration="${t}" data-track-index="1" muted playsinline style="position:absolute;inset:0;z-index:1;width:${w}px;height:${h}px;object-fit:cover;"></video>
    <div id="ambient-layer" class="clip beat-host" data-composition-id="ambient" data-composition-src="compositions/ambient-layer.html" data-start="0" data-duration="${t}" data-track-index="30" style="position:absolute;inset:0;z-index:800;"></div>
${avatarHost}${captionsHost}${brandHost}
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
