#!/usr/bin/env node
/**
 * Patch index.html — background stack + stock video full-bleed.
 *
 * Stack (bottom → top): ambient animation (opacity 1, z4) → stock video (opacity 0.1, z7) → content
 *
 * Usage: node patch-stock-full-bleed.mjs <project-dir> [--opacity=0.1]
 */
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const opacityArg = args.find((a) => a.startsWith("--opacity="));
const opacity = opacityArg ? parseFloat(opacityArg.split("=")[1]) : 0.1;
const projectDir = path.resolve(args.find((a) => !a.startsWith("-")) || "");

if (!projectDir) {
  console.error("usage: node patch-stock-full-bleed.mjs <project-dir> [--opacity=0.1]");
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
        z-index: 7;
        pointer-events: none;
      }`;

if (html.includes(".stock-bg {")) {
  html = html.replace(
    /\.stock-bg\s*\{[^}]*\}/s,
    `.stock-bg {
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
      }`,
  );
  html = html.replace(
    /\.stock-bg-wrap\s*\{[^}]*\}/s,
    `.stock-bg-wrap {
        position: absolute;
        inset: 0;
        width: 1080px;
        height: 1920px;
        overflow: hidden;
        z-index: 7;
        pointer-events: none;
      }`,
  );
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

html = html.replace(
  /(<div\b[^>]*class="[^"]*hf-ambient-layer[^"]*"[^>]*style="[^"]*?)z-index:\s*\d+([^"]*")/gi,
  "$1z-index:4$2",
);

html = html.replace(
  /(<div\b[^>]*class="[^"]*hf-ambient-layer[^"]*")((?:(?!style=)[^>])*)>/gi,
  (match, open, rest) => {
    if (/style="/i.test(match)) return match;
    return `${open}${rest} style="position:absolute;inset:0;z-index:4;pointer-events:none">`;
  },
);

const ambientRe =
  /<div\b[^>]*class="[^"]*hf-ambient-layer[^"]*"[\s\S]*?<\/div>\s*(?=<section|<div class="beat-progress|<div class="clip hf-overlay)/i;
const stockWrapRe =
  /<div class="stock-bg-wrap"[\s\S]*?<\/div>\s*(?=<section|<div class="clip hf-ambient|<div class="beat-progress|<div class="clip hf-overlay)/i;

const ambientMatch = html.match(ambientRe);
const stockMatch = html.match(stockWrapRe);

if (ambientMatch && stockMatch) {
  const ambientBlock = ambientMatch[0];
  const stockBlock = stockMatch[0];
  const ambientIdx = html.indexOf(ambientBlock);
  const stockIdx = html.indexOf(stockBlock);

  if (stockIdx < ambientIdx) {
    html = html.replace(ambientBlock, "").replace(stockBlock, "");
    const rootOpen = html.match(/<div id="root"[^>]*>/i);
    if (rootOpen) {
      const insertAt = html.indexOf(rootOpen[0]) + rootOpen[0].length;
      html =
        html.slice(0, insertAt) +
        `\n    ${ambientBlock.trim()}\n    ${stockBlock.trim()}\n` +
        html.slice(insertAt);
    }
  }
}

fs.writeFileSync(indexPath, html);
console.log(
  `[patch-stock-full-bleed] patched ${indexPath} (opacity=${opacity}, ambient z4, stock z7)`,
);
