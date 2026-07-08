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

function snapBeatSectionsForIndex(sections, totalVideoSec) {
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
  const t = Number(totalVideoSec).toFixed(3);
  const beatHosts = buildBeatHostSections(sections, totalVideoSec);
  const sfxHook = options.sfxHook
    ? `    <audio id="sfx-hook" class="clip sfx-hook" src="assets/audio/sfx_hook.mp3" data-start="0" data-duration="0.58" data-track-index="12" data-volume="0.45"></audio>\n`
    : "";

  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Short Video #${shortVideoId}</title>
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
    .beat-progress-host { z-index:8990 !important; pointer-events:none; }
    .hf-overlay-caption { z-index:9000 !important; pointer-events:none; }
    .hf-overlay-brand { z-index:9500 !important; pointer-events:none; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="main" data-start="0" data-duration="${t}" data-width="1080" data-height="1920">
    <audio id="narration" class="clip" src="assets/audio/narration.mp3" data-start="0" data-duration="${t}" data-track-index="10" data-volume="1.0"></audio>
${sfxHook}${beatHosts}
    <div id="ambient-layer" class="clip beat-host" data-composition-id="ambient" data-composition-src="compositions/ambient-layer.html" data-start="0" data-duration="${t}" data-track-index="30" style="position:absolute;inset:0;z-index:800;"></div>
    <div id="beat-progress-host" class="clip beat-progress-host" data-start="0" data-duration="${t}" data-track-index="31" style="position:absolute;top:0;left:0;width:1080px;height:4px;z-index:8990;pointer-events:none;"><div class="beat-progress-track" style="position:absolute;inset:0;background:transparent;overflow:hidden;"><div class="beat-progress-fill" style="width:100%;height:100%;background:linear-gradient(90deg,#37b8ff 0%,#5fd6ff 18%,#78f0d8 34%,#c0f36a 50%,#ffd86b 66%,#ff9b49 82%,#ff5a36 92%,#ff3b1f 100%);box-shadow:0 0 8px rgba(95,214,255,0.28),0 0 14px rgba(255,170,84,0.30),0 0 20px rgba(255,90,54,0.22);border-radius:0 2px 2px 0;clip-path:inset(0 100% 0 0);"></div></div></div>
    <div id="captions-layer" class="clip hf-overlay-caption" data-composition-id="captions" data-composition-src="compositions/captions.html" data-start="0" data-duration="${t}" data-track-index="20" style="position:absolute;inset:0;z-index:9000;"></div>
    <div id="brand-layer" class="clip hf-overlay-brand" data-composition-id="brand-watermark" data-composition-src="compositions/brand-watermark.html" data-start="0" data-duration="${t}" data-track-index="21" style="position:absolute;inset:0;z-index:9500;"></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const _progressFill = document.querySelector(".beat-progress-fill");
    const _totalDuration = Math.max(0.001, Number(${t}));
    function _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function _updateGlobalProgress(currentTime) {
      if (!_progressFill) return;
      const t = Number(currentTime || 0);
      const progress = _clamp(t / _totalDuration, 0, 1);
      const rightPct = (100 - progress * 100).toFixed(3);
      _progressFill.style.clipPath = "inset(0 " + rightPct + "% 0 0)";
    }
    const _mainTl = gsap.timeline({ paused: true });
    _mainTl.to({ _v: 0 }, {
      _v: 1,
      duration: ${t},
      ease: "none",
      onUpdate: function () {
        _updateGlobalProgress(_mainTl.time());
      },
    });
    window.__timelines.main = _mainTl;
    _updateGlobalProgress(0);
  </script>
</body>
</html>`;
}
