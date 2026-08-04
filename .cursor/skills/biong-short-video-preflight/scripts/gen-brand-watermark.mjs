#!/usr/bin/env node
/**
 * Generate compositions/brand-watermark.html — logo góc trên trái (brand-wrap).
 *
 * Usage: node gen-brand-watermark.mjs <project-dir> [--duration SEC]
 */
import fs from "fs";
import path from "path";
import { loadRenderSpecFromProject } from "../../../../scripts/lib/clip-render-spec.mjs";

function main() {
  const projectDir = path.resolve(process.argv[2] || "");
  let duration = null;

  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i] === "--duration") {
      duration = parseFloat(process.argv[++i] ?? "0");
    }
  }

  if (!process.argv[2]) {
    console.error("usage: node gen-brand-watermark.mjs <project-dir> [--duration SEC]");
    process.exit(1);
  }

  if (!duration || !Number.isFinite(duration)) {
    const reportPath = path.join(projectDir, "assets/caption-sync-report.json");
    const metaPath = path.join(projectDir, "meta.json");
    if (fs.existsSync(reportPath)) {
      try {
        duration = JSON.parse(fs.readFileSync(reportPath, "utf8")).totalVideoSec;
      } catch {
        /* ignore */
      }
    }
    if ((!duration || !Number.isFinite(duration)) && fs.existsSync(metaPath)) {
      try {
        duration = JSON.parse(fs.readFileSync(metaPath, "utf8")).duration;
      } catch {
        /* ignore */
      }
    }
  }

  if (!duration || !Number.isFinite(duration)) {
    console.error("Thiếu --duration hoặc meta.json / caption-sync-report.json");
    process.exit(1);
  }

  duration = +Number(duration).toFixed(2);
  const renderSpec = loadRenderSpecFromProject(projectDir);
  const canvasW = renderSpec.width;
  const canvasH = renderSpec.height;
  // Tỷ lệ theo chiều rộng so với chuẩn 9:16 (1080px) — giữ brand cân đối trên mọi aspect.
  const scale = canvasW / 1080;
  const logoHeight = Math.max(24, Math.round(56 * scale));
  const gapPx = Math.max(4, Math.round(10 * scale));
  const marginPx = Math.max(12, Math.round(28 * scale));
  const outPath = path.join(projectDir, "compositions/brand-watermark.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=${canvasW}, height=${canvasH}" />
  <title>Watermark — Spacedev</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face {
      font-family: "Be Vietnam Pro";
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype");
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: ${canvasW}px;
      height: ${canvasH}px;
      overflow: hidden;
      background: transparent !important;
    }
    #root {
      position: relative;
      width: ${canvasW}px;
      height: ${canvasH}px;
    }
    .brand-wrap {
      position: absolute;
      left: ${marginPx}px;
      top: ${marginPx}px;
      display: flex;
      align-items: center;
      gap: ${gapPx}px;
      z-index: 10;
      opacity: 0.92;
      pointer-events: none;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
    }
    .brand-wrap img { height: ${logoHeight}px; width: auto; display: block; }
  </style>
</head>
<body>
  <div id="root" data-composition-id="brand-watermark" data-start="0" data-duration="${duration}" data-width="${canvasW}" data-height="${canvasH}">
    <div class="brand-wrap">
      <img src="assets/images/spacedev-logo.png" alt="" />
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.from(".brand-wrap", { opacity: 0, x: -12, duration: 0.5, ease: "power2.out" }, 0.2);
    window.__timelines["brand-watermark"] = tl;
  </script>
</body>
</html>`;

  fs.writeFileSync(outPath, html);
  console.log(
    `[gen-brand-watermark] wrote ${outPath} (${duration}s, ${canvasW}x${canvasH})`,
  );
}

main();
