#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectDir = path.resolve("storage/agent-renders/24/my-video");
const scriptText = fs.readFileSync(path.join(projectDir, "assets/audio-script.txt"), "utf8");
const mood = scriptText.match(/\[BGM:\s*([^\]]+)\]/i)?.[1]?.trim() || "lofi ambient";
const beatMap = JSON.parse(fs.readFileSync(path.join(projectDir, "assets/beat-map.json"), "utf8"));
const totalVideoSec = Number(beatMap.totalVideoSec || 0);

const search = spawnSync("node", ["scripts/biong-mcp-client.mjs", "search-bgm", mood, "8"], {
  encoding: "utf8",
});
if (search.status !== 0) {
  throw new Error(search.stderr || search.stdout || "search-bgm failed");
}
const jsonStart = search.stdout.indexOf("{");
const result = JSON.parse(search.stdout.slice(jsonStart));
const items = result.items || [];
if (!items.length) throw new Error("search-bgm returned no items");

const audioDir = path.join(projectDir, "assets/audio");
fs.mkdirSync(audioDir, { recursive: true });

function probeDuration(file) {
  const ff = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nokey=1:noprint_wrappers=1", file],
    { encoding: "utf8" },
  );
  if (ff.status !== 0) return 0;
  return Number.parseFloat(ff.stdout.trim()) || 0;
}

const segments = [];
let covered = 0;
for (const item of items) {
  const id = segments.length + 1;
  const out = path.join(audioDir, `bgm_${id}.mp3`);
  const response = await fetch(item.download_url);
  if (!response.ok) {
    console.warn(`[bgm] skip ${item.id}: HTTP ${response.status}`);
    continue;
  }
  fs.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
  const duration = probeDuration(out);
  if (duration <= 0) {
    console.warn(`[bgm] skip ${item.id}: ffprobe duration unavailable`);
    continue;
  }
  segments.push({
    id: `bgm_${id}`,
    file: `assets/audio/bgm_${id}.mp3`,
    fileDurationSec: +duration.toFixed(3),
    source_id: item.id,
    source: item.provider || "pixabay",
    query: mood,
  });
  covered += duration;
  if (covered >= totalVideoSec) break;
}

if (covered < totalVideoSec) {
  throw new Error(`BGM coverage ${covered.toFixed(2)}s < ${totalVideoSec}s`);
}

fs.writeFileSync(
  path.join(projectDir, "assets/bgm-chain.json"),
  JSON.stringify({ totalVideoSec, query: mood, segments }, null, 2),
);
const rows = [
  "| id | mcp_tool | query | local_path | source | duration_sec |",
  "| --- | --- | --- | --- | --- | ---: |",
  ...segments.map(
    (s, i) =>
      `| ${i === 0 ? "bgm_global" : s.id} | short_video_search_bgm | ${mood} | ${s.file} | ${s.source}:${s.source_id} | ${s.fileDurationSec} |`,
  ),
];
fs.writeFileSync(path.join(projectDir, "media-plan.md"), rows.join("\n") + "\n");
console.log(`[bgm] ${segments.length} segment(s), covered=${covered.toFixed(2)}s / ${totalVideoSec}s`);
