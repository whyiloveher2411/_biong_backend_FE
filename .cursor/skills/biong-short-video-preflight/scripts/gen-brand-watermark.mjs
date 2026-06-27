#!/usr/bin/env node
/**
 * Generate compositions/brand-watermark.html — logo góc phải dưới (brand-wrap).
 *
 * Usage: node gen-brand-watermark.mjs <project-dir> [--duration SEC]
 */
import fs from "fs";
import path from "path";

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
  const outPath = path.join(projectDir, "compositions/brand-watermark.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Watermark — Spacedev</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face {
      font-family: "Be Vietnam Pro";
      font-style: normal;
      font-weight: 600;
      font-display: swap;
      src: url("../assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype");
    }
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
    }
    .brand-wrap {
      position: absolute;
      right: 28px;
      bottom: 28px;
      display: flex;
      align-items: center;
      gap: 10px;
      z-index: 10;
      opacity: 0.92;
      pointer-events: none;
      filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.5));
    }
    .brand-wrap img { height: 56px; width: auto; display: block; }
    .brand-wrap span {
      font-family: "Be Vietnam Pro", system-ui, sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.92);
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div id="root" data-composition-id="brand-watermark" data-start="0" data-duration="${duration}" data-width="1080" data-height="1920">
    <div class="brand-wrap">
      <img src="../assets/images/spacedev-logo.png" alt="" />
      <span>© Spacedev</span>
    </div>
  </div>
  <script>
    window.__timelines = window.__timelines || {};
    const tl = gsap.timeline({ paused: true });
    tl.from(".brand-wrap", { opacity: 0, x: 12, duration: 0.5, ease: "power2.out" }, 0.2);
    window.__timelines["brand-watermark"] = tl;
  </script>
</body>
</html>`;

  fs.writeFileSync(outPath, html);
  console.log(`[gen-brand-watermark] wrote ${outPath} (${duration}s)`);
}

main();
