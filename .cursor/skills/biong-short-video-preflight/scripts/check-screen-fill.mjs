#!/usr/bin/env node
/**
 * Preflight: screen fill >50% — content-cluster min-height + visual blocks.
 *
 * Usage: node check-screen-fill.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-screen-fill.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

const MIN_CLUSTER_HEIGHT_PX = 960;
const MIN_BLOCK_TYPES = 2;

const BLOCK_PATTERNS = [
  /class="[^"]*\bhero\b[^"]*"/i,
  /class="[^"]*\bhook-title[^"]*"/i,
  /class="[^"]*\bui-card[^"]*"/i,
  /class="[^"]*\bpremium-card[^"]*"/i,
  /class="[^"]*\bflow-node[^"]*"/i,
  /class="[^"]*\bquote-box[^"]*"/i,
  /class="[^"]*\bstat-[^"]*"/i,
  /class="[^"]*\bvs-card[^"]*"/i,
  /class="[^"]*\bbento[^"]*"/i,
  /data-registry-block/i,
];

function listBeatFiles() {
  const dir = path.join(root, "compositions");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^beat_\d+\.html$/i.test(f))
    .map((name) => ({
      name,
      content: fs.readFileSync(path.join(dir, name), "utf8"),
    }));
}

function parseClusterMinHeight(content) {
  const blockMatch = content.match(/\.content-cluster\s*\{([^}]*)\}/i);
  if (!blockMatch) return null;
  const minH = blockMatch[1].match(/min-height\s*:\s*(\d+)px/i)?.[1];
  return minH ? parseInt(minH, 10) : null;
}

function countBlockTypes(content) {
  return BLOCK_PATTERNS.filter((re) => re.test(content)).length;
}

const beatFiles = listBeatFiles();
if (!beatFiles.length) {
  errors.push("thiếu compositions/beat_*.html");
} else {
  for (const { name, content } of beatFiles) {
    if (!/content-cluster/i.test(content)) {
      errors.push(`${name}: thiếu .content-cluster — layout-9x16-zones.md`);
      continue;
    }

    const clusterMinH = parseClusterMinHeight(content);
    if (clusterMinH === null || clusterMinH < MIN_CLUSTER_HEIGHT_PX) {
      errors.push(
        `${name}: .content-cluster thiếu min-height ≥${MIN_CLUSTER_HEIGHT_PX}px — screen fill <50%`,
      );
    }

    const blockCount = countBlockTypes(content);
    if (blockCount < MIN_BLOCK_TYPES) {
      errors.push(
        `${name}: ít hơn ${MIN_BLOCK_TYPES} block visual — visual fill <50% màn hình`,
      );
    }

    if (/justify-content\s*:\s*flex-start/i.test(content) && !/content-cluster[^}]*justify-content\s*:\s*center/i.test(content)) {
      warnings.push(
        `${name}: scene-root justify-content:flex-start — cụm có thể không fill giữa màn`,
      );
    }
  }
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== SCREEN FILL FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: layout-9x16-zones.md + kinetic-typography-brief.md");
  process.exit(1);
}

console.log(`check-screen-fill: OK (${beatFiles.length} beats)`);
process.exit(0);
