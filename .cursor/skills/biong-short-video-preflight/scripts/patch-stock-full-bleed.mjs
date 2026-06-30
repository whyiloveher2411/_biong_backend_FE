#!/usr/bin/env node
/**
 * Patch index.html — stock video full-bleed 1080×1920 portrait (object-fit: cover).
 *
 * Usage: node patch-stock-full-bleed.mjs <project-dir> [--opacity 0.38]
 */
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const opacityArg = args.find((a) => a.startsWith("--opacity="));
const opacity = opacityArg ? parseFloat(opacityArg.split("=")[1]) : 0.38;
const projectDir = path.resolve(args.find((a) => !a.startsWith("-")) || "");

if (!projectDir) {
  console.error("usage: node patch-stock-full-bleed.mjs <project-dir> [--opacity=0.38]");
  process.exit(1);
}

const indexPath = path.join(projectDir, "index.html");
if (!fs.existsSync(indexPath)) {
  console.error("missing index.html");
  process.exit(1);
}

let html = fs.readFileSync(indexPath, "utf8");

const STOCK_CSS = `
      .stock-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 1080px;
        height: 1920px;
        min-width: 1080px;
        min-height: 1920px;
        object-fit: cover;
        object-position: center center;
        z-index: 1;
        opacity: ${opacity};
        pointer-events: none;
      }
      .stock-bg-wrap {
        position: absolute;
        inset: 0;
        width: 1080px;
        height: 1920px;
        overflow: hidden;
        z-index: 1;
        pointer-events: none;
      }`;

if (html.includes(".stock-bg {")) {
  html = html.replace(/\.stock-bg\s*\{[^}]*\}/s, STOCK_CSS.trim().split("\n").slice(1, -1).join("\n") + "\n      }");
} else if (html.includes("</style>")) {
  html = html.replace("</style>", `${STOCK_CSS}\n    </style>`);
}

html = html.replace(
  /<video\b([^>]*class="[^"]*stock-bg[^"]*")([^>]*)>/gi,
  (full, g1, g2) => {
    let attrs = g1 + g2;
    attrs = attrs.replace(/\sstyle="[^"]*"/i, "");
    if (!/\bplaysinline\b/i.test(attrs)) attrs += " playsinline";
    if (!/\bmuted\b/i.test(attrs)) attrs += " muted";
    return `<video${attrs}>`;
  },
);

fs.writeFileSync(indexPath, html);
console.log(`[patch-stock-full-bleed] patched ${indexPath} (opacity=${opacity})`);
