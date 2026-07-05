#!/usr/bin/env node
/**
 * Sửa start/end caption-words.json để timing monotonic theo thứ tự script.
 * Chỉ clamp — không đổi text hiển thị.
 */
import fs from "fs";
import path from "path";

const projectDir = path.resolve(process.argv[2] || "");
if (!projectDir) {
  console.error("usage: node repair-caption-monotonic.mjs <project-dir>");
  process.exit(1);
}

const wordsPath = path.join(projectDir, "assets/caption-words.json");
if (!fs.existsSync(wordsPath)) {
  console.error("Thiếu assets/caption-words.json");
  process.exit(1);
}

const words = JSON.parse(fs.readFileSync(wordsPath, "utf8"));
let fixed = 0;

for (let i = 1; i < words.length; i++) {
  const prev = words[i - 1];
  const cur = words[i];
  const prevStart = Number(prev.start);
  const prevEnd = Number(prev.end ?? prevStart);
  let start = Number(cur.start);
  let end = Number(cur.end ?? start);

  if (!Number.isFinite(start) || start + 0.001 < prevStart) {
    start = +(prevEnd + 0.01).toFixed(3);
    if (!Number.isFinite(end) || end <= start) {
      end = +(start + 0.12).toFixed(3);
    }
    cur.start = start;
    cur.end = end;
    fixed++;
  }
}

fs.writeFileSync(wordsPath, JSON.stringify(words, null, 2));
console.log(`[repair-caption-monotonic] OK — ${fixed} word(s) clamped`);
