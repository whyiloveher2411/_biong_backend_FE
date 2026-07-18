#!/usr/bin/env node
/**
 * Chuẩn hóa beat HTML chatbot → format HyperFrames render.
 * Scaffolding + repair token-only #root{--*} → :root + seek bridge cho beat split.
 *
 * Usage:
 *   node normalize-import-html-beat-for-render.mjs <project-dir> [--localize-images] [--force]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  beatIdFromFilename,
  isImportHtmlProject,
  localizeExternalImages,
  normalizeBeatHtmlForRender,
  resolveBeatSeekBridgeFromMap,
} from "./lib/import-html-beat-render.mjs";

function parseArgs(argv) {
  const out = {
    projectDir: "",
    localizeImages: false,
    force: false,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--localize-images") out.localizeImages = true;
    else if (argv[i] === "--force") out.force = true;
    else if (!argv[i].startsWith("-") && !out.projectDir) out.projectDir = argv[i];
  }
  return out;
}

function loadBeatMapSections(projectDir) {
  const candidates = [
    path.join(projectDir, "assets/beat-map.json"),
    path.join(projectDir, "beat-map.json"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(file, "utf8"));
      const sections = data?.sections || data?.beat_map?.sections;
      if (Array.isArray(sections)) return sections;
    } catch {
      /* skip */
    }
  }
  return [];
}

async function main() {
  const { projectDir: rawDir, localizeImages, force } = parseArgs(process.argv);
  if (!rawDir) {
    console.error(
      "usage: node normalize-import-html-beat-for-render.mjs <project-dir> [--localize-images] [--force]",
    );
    process.exit(1);
  }

  const projectDir = path.resolve(rawDir);
  const compDir = path.join(projectDir, "compositions");
  if (!fs.existsSync(compDir)) {
    console.error("FAIL: missing compositions/");
    process.exit(1);
  }

  if (!force && !isImportHtmlProject(projectDir)) {
    console.log(
      "normalize-import-html-beat-for-render: skip (render_mode !== import_html; dùng --force để ép)",
    );
    process.exit(0);
  }

  const sections = loadBeatMapSections(projectDir);
  const beatFiles = fs
    .readdirSync(compDir)
    .filter((n) => beatIdFromFilename(n))
    .map((n) => path.join(compDir, n));

  if (!beatFiles.length) {
    console.error("FAIL: không có compositions/beat_N.html");
    process.exit(1);
  }

  let changedCount = 0;

  for (const file of beatFiles) {
    const name = path.basename(file);
    const beatId = beatIdFromFilename(name);
    const html = fs.readFileSync(file, "utf8");
    const seekBridge = resolveBeatSeekBridgeFromMap(sections, beatId);
    const result = normalizeBeatHtmlForRender(html, beatId, { seekBridge });

    if (result.error) {
      console.error(`✗ ${result.error}`);
      process.exit(1);
    }

    if (result.changed) {
      fs.writeFileSync(file, result.html, "utf8");
      changedCount += 1;
      console.log(`✓ ${name}: ${result.patches.join(", ")}`);
    } else {
      console.log(`· ${name}: ${result.patches[0] ?? "không đổi"}`);
    }
  }

  if (localizeImages) {
    const imgPatches = await localizeExternalImages(projectDir, beatFiles);
    if (imgPatches.length) {
      console.log(`✓ localize images: ${imgPatches.join(", ")}`);
    } else {
      console.log("· localize images: không có URL ngoài");
    }
  }

  console.log(
    `\nnormalize-import-html-beat-for-render: OK (${changedCount}/${beatFiles.length} beat đã chuẩn hóa)`,
  );
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
