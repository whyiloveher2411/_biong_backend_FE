export function buildAmbientLayerHtml(totalVideoSec) {
  const total = Number(totalVideoSec);
  const t = total.toFixed(3);
  const loopSec = 8;
  const tlRepeat = Math.max(0, Math.floor(total / loopSec) - 1);
  const orbCycleSec = 2.4 * 2;
  const orbRepeat = Math.max(0, Math.floor(total / orbCycleSec) - 1);
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Ambient Layer</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    html, body { width:1080px; height:1920px; margin:0; overflow:hidden; background:transparent !important; }
    #root { position:relative; width:1080px; height:1920px; overflow:hidden; background:transparent; pointer-events:none; }
    .ambient-parallax { position:absolute; inset:-40px; background: radial-gradient(ellipse 60% 40% at 30% 20%, rgba(120,180,255,0.06), transparent 70%); }
    .grain { position:absolute; inset:-20px; opacity:.08; background-image: radial-gradient(circle at 20% 30%, rgba(255,255,255,.9) 0 1px, transparent 1px), radial-gradient(circle at 80% 70%, rgba(255,255,255,.65) 0 1px, transparent 1px); background-size: 38px 38px, 53px 53px; mix-blend-mode: overlay; }
    .orb { position:absolute; width:280px; height:280px; left:72%; top:18%; border-radius:50%; background:radial-gradient(circle, rgba(255,120,80,0.12), transparent 70%); filter:blur(2px); }
    .vignette { position:absolute; inset:0; box-shadow: inset 0 0 180px rgba(0,0,0,.32); }
  </style>
</head>
<body>
  <div id="root" data-composition-id="ambient" data-start="0" data-duration="${t}" data-width="1080" data-height="1920">
    <div class="ambient-parallax"></div>
    <div class="grain"></div>
    <div class="orb"></div>
    <div class="vignette"></div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true, repeat: ${tlRepeat} });
    tl.fromTo(".ambient-parallax", { x: 24, scale: 1.04 }, { x: -24, scale: 1, duration: ${loopSec}, ease: "none" }, 0);
    tl.to(".grain", { x: 18, y: -12, duration: ${loopSec}, ease: "none" }, 0);
    tl.to(".orb", { scale: 1.05, y: "+=18", duration: 2.4, yoyo: true, repeat: ${orbRepeat}, ease: "sine.inOut" }, 0);
    window.__timelines["ambient"] = tl;
  </script>
</body>
</html>`;
}
