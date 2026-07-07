#!/usr/bin/env node
/**
 * Generate compositions/captions.html từ assets/caption-words.json (đã sync).
 *
 * Usage: node gen-captions-html.mjs <project-dir> [--duration SEC]
 */
import fs from "fs";
import path from "path";
import { tokenizeScript } from "./lib/caption-script-align.mjs";

/** Caption pill trong caption band — beat đã chừa bottom 360px; tránh platform description overlay */
const CANVAS_HEIGHT = 1920;
const CAPTION_BOTTOM_PCT = 180 / CANVAS_HEIGHT; // ~9.4% — thấp hơn 12% để tận dụng caption band
const CAPTION_BOTTOM_PX = Math.round(CANVAS_HEIGHT * CAPTION_BOTTOM_PCT);
const CAPTION_HORIZONTAL_PX = 60;
const CAPTION_MAX_WIDTH_PX = 1080 - CAPTION_HORIZONTAL_PX * 2;

function assertCaptionMatchesScript(projectDir, captionWords) {
  const scriptPath = path.join(projectDir, "assets/audio-script.txt");
  if (!fs.existsSync(scriptPath)) {
    console.error(`Thiếu ${scriptPath} — không thể xác nhận text script`);
    process.exit(1);
  }
  const scriptWords = tokenizeScript(fs.readFileSync(scriptPath, "utf8"));
  if (captionWords.length !== scriptWords.length) {
    console.error(
      `caption-words.json (${captionWords.length}) !== script (${scriptWords.length}) — chạy sync-caption-from-script.mjs`,
    );
    process.exit(1);
  }
  for (let i = 0; i < scriptWords.length; i++) {
    if (String(captionWords[i].text ?? "") !== scriptWords[i]) {
      console.error(
        `Word #${i}: caption "${captionWords[i].text}" !== script "${scriptWords[i]}" — cấm Whisper text`,
      );
      process.exit(1);
    }
  }
}

function main() {
  const projectDir = path.resolve(process.argv[2] || "");
  let durationArg = null;

  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i] === "--duration") {
      durationArg = parseFloat(process.argv[++i] ?? "0");
    }
  }

  if (!process.argv[2]) {
    console.error("usage: node gen-captions-html.mjs <project-dir> [--duration SEC]");
    process.exit(1);
  }

  const wordsPath = path.join(projectDir, "assets/caption-words.json");
  if (!fs.existsSync(wordsPath)) {
    console.error(`Thiếu ${wordsPath} — chạy sync-caption-from-script.mjs trước`);
    process.exit(1);
  }

  const words = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
  if (!Array.isArray(words) || !words.length) {
    console.error("caption-words.json rỗng");
    process.exit(1);
  }

  assertCaptionMatchesScript(projectDir, words);

  let duration = durationArg;
  if (!duration || !Number.isFinite(duration)) {
    const reportPath = path.join(projectDir, "assets/caption-sync-report.json");
    if (fs.existsSync(reportPath)) {
      try {
        duration = JSON.parse(fs.readFileSync(reportPath, "utf8")).totalVideoSec;
      } catch {
        /* ignore */
      }
    }
  }
  if (!duration || !Number.isFinite(duration)) {
    duration = Math.max(...words.map((w) => Number(w.end) || 0));
  }
  duration = +Number(duration).toFixed(2);

  const transcriptJson = JSON.stringify(words);
  const outPath = path.join(projectDir, "compositions/captions.html");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=1080, height=1920" />
  <title>Captions — Karaoke</title>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <style>
    @font-face {
      font-family: "Be Vietnam Pro";
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url("assets/fonts/BeVietnamPro-Bold.ttf") format("truetype");
    }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      width: 1080px;
      height: 1920px;
      margin: 0;
      overflow: hidden;
      background: transparent !important;
      font-family: "Be Vietnam Pro", system-ui, sans-serif;
    }
    #pill-karaoke {
      pointer-events: none;
      position: relative;
      width: 1080px;
      height: 1920px;
      overflow: hidden;
      background: transparent;
    }
    .caption-root {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
    }
    .caption-group-wrap {
      position: absolute;
      left: 50%;
      bottom: ${CAPTION_BOTTOM_PX}px;
      transform: translateX(-50%);
      z-index: 2;
      width: ${CAPTION_MAX_WIDTH_PX}px;
      max-width: calc(100% - ${CAPTION_HORIZONTAL_PX * 2}px);
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .caption-group {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
    }
    .caption-pill {
      max-width: ${CAPTION_MAX_WIDTH_PX}px;
      padding: 16px 36px 18px;
      border-radius: 20px;
      background: rgba(12, 18, 32, 0.82);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
      text-align: center;
    }
    .caption-copy {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: rgba(255, 255, 255, 0.55);
      font-family: "Be Vietnam Pro", system-ui, sans-serif;
      font-size: 48px;
      font-weight: 700;
      line-height: 1.2;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.55);
    }
    .caption-line {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      max-width: 920px;
    }
    .caption-word { display: inline-block; color: rgba(255,255,255,0.55); }
    .caption-word--active { z-index: 3; }
  </style>
</head>
<body>
  <div id="pill-karaoke" data-composition-id="captions" data-timeline-locked data-start="0" data-duration="${duration}" data-fps="30" data-width="1080" data-height="1920">
    <div class="caption-root" aria-hidden="true">
      <div id="caption-stage" class="caption-group-wrap"></div>
    </div>
  </div>
  <script>
    var DURATION = ${duration};
    var MAX_WORDS_PER_GROUP = 4;
    var PAUSE_THRESHOLD = 0.12;
    var GROUP_END_BUFFER = 0.25;
    var COLOR_INACTIVE = "rgba(255,255,255,0.55)";
    var COLOR_ACTIVE = "#00E5A0";
    var COLOR_FADE_DURATION = 0.08;
    var WORD_FADE_LEAD = 0.04;
    var TRANSCRIPT = ${transcriptJson};

    function normalizeWords(raw) {
      return raw.map(function (item) {
        return {
          text: String(item.text || "").trim(),
          start: Math.max(0, Number(item.start) || 0),
          end: Math.min(DURATION, Math.max(Number(item.start) || 0, Number(item.end) || 0)),
        };
      }).filter(function (w) { return w.text.length > 0; });
    }

    function makeGroups(words) {
      var groups = [], current = [];
      words.forEach(function (word, index) {
        current.push(word);
        var next = words[index + 1];
        var pause = next ? next.start - word.end : 0;
        var punct = /[.!?,;:]$/.test(word.text);
        if (current.length >= MAX_WORDS_PER_GROUP || !next || punct || pause >= PAUSE_THRESHOLD) {
          groups.push({ words: current.slice(), start: current[0].start, end: current[current.length - 1].end });
          current = [];
        }
      });
      if (current.length) groups.push({ words: current.slice(), start: current[0].start, end: current[current.length - 1].end });
      return groups;
    }

    function buildCaptions(groups) {
      var stage = document.getElementById("caption-stage");
      groups.forEach(function (group, gi) {
        var groupEl = document.createElement("div");
        groupEl.id = "caption-group-" + gi;
        groupEl.className = "caption-group";
        var pill = document.createElement("div");
        pill.className = "caption-pill";
        var copy = document.createElement("div");
        copy.className = "caption-copy";
        var line = document.createElement("div");
        line.className = "caption-line";
        group.words.forEach(function (word, wi) {
          var span = document.createElement("span");
          span.id = "caption-word-" + gi + "-" + wi;
          span.className = "caption-word";
          span.textContent = word.text;
          line.appendChild(span);
        });
        copy.appendChild(line);
        pill.appendChild(copy);
        groupEl.appendChild(pill);
        stage.appendChild(groupEl);
      });
    }

    var WORDS = normalizeWords(TRANSCRIPT);
    var GROUPS = makeGroups(WORDS);
    buildCaptions(GROUPS);

    window.__timelines = window.__timelines || {};
    var tl = gsap.timeline({ paused: true });
    GROUPS.forEach(function (group, gi) {
      var groupEl = document.getElementById("caption-group-" + gi);
      var nextGroup = GROUPS[gi + 1];
      var isLast = gi === GROUPS.length - 1;
      var visibleStart = Math.max(0, group.start);
      var visibleEnd = isLast ? DURATION : Math.min(nextGroup.start, group.end + GROUP_END_BUFFER);
      tl.set(groupEl, { opacity: 1 }, visibleStart);
      tl.set(groupEl, { opacity: 0 }, visibleEnd);
      group.words.forEach(function (word, wi) {
        var wordEl = document.getElementById("caption-word-" + gi + "-" + wi);
        var wordStart = Math.max(visibleStart, word.start - WORD_FADE_LEAD);
        tl.set(wordEl, { color: wi === 0 ? COLOR_ACTIVE : COLOR_INACTIVE }, visibleStart);
        if (wi === 0) return;
        tl.to(wordEl, { color: COLOR_ACTIVE, duration: COLOR_FADE_DURATION, ease: "power2.out" }, wordStart);
      });
    });
    window.__timelines["captions"] = tl;
  </script>
</body>
</html>`;

  fs.writeFileSync(outPath, html);
  console.log(`[gen-captions-html] wrote ${outPath} (${words.length} words, ${duration}s)`);
}

main();
