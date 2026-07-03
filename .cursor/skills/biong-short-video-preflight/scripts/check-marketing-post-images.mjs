#!/usr/bin/env node
/**
 * Preflight: marketing post images — 1 ảnh/beat, browser-mockup-card, no duplicate URLs.
 *
 * Usage: node check-marketing-post-images.mjs <project-dir>
 * Exit 0 = pass or no images configured, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-marketing-post-images.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

const IMAGES_REL = "assets/marketing-post-images.json";

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

function loadConfiguredImages() {
  const imagesPath = path.join(root, IMAGES_REL);
  if (!fs.existsSync(imagesPath)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(imagesPath, "utf8"));
    if (!Array.isArray(data) || data.length === 0) return null;
    return data;
  } catch {
    errors.push(`${IMAGES_REL} không parse được JSON`);
    return [];
  }
}

function extractMarketingPostImages(content) {
  const re =
    /<img\b[^>]*\bdata-marketing-post-image\b[^>]*>/gi;
  const tags = content.match(re) ?? [];
  return tags.map((tag) => {
    const url =
      tag.match(/data-marketing-post-image-url\s*=\s*["']([^"']+)["']/i)?.[1] ??
      "";
    return { tag, url: url.trim() };
  });
}

function imgInsideBrowserMockupCard(content, imgTag) {
  const idx = content.indexOf(imgTag);
  if (idx < 0) return false;
  const before = content.slice(0, idx);
  const cardOpen = before.lastIndexOf('class="browser-mockup-card"');
  const cardOpenAlt = before.lastIndexOf("class='browser-mockup-card'");
  const openIdx = Math.max(cardOpen, cardOpenAlt);
  if (openIdx < 0) {
    const classMatch = before.match(/class="[^"]*\bbrowser-mockup-card\b[^"]*"/gi);
    return Boolean(classMatch?.length);
  }
  const slice = content.slice(openIdx, idx + imgTag.length);
  const opens = (slice.match(/<div\b/gi) ?? []).length;
  const closes = (slice.match(/<\/div>/gi) ?? []).length;
  return opens > closes;
}

const configured = loadConfiguredImages();
if (configured === null) {
  console.log("check-marketing-post-images: skip (no marketing post images)");
  process.exit(0);
}

if (errors.length) {
  console.error("\n=== MARKETING POST IMAGES FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}

const beatFiles = listBeatFiles();
const usedUrls = new Map();

for (const { name, content } of beatFiles) {
  const images = extractMarketingPostImages(content);
  if (images.length >= 2) {
    errors.push(
      `${name}: ${images.length} ảnh marketing post — cấm >1 ảnh/beat (marketing-post-image-card.md)`,
    );
  }

  for (const { tag, url } of images) {
    if (!imgInsideBrowserMockupCard(content, tag)) {
      errors.push(
        `${name}: <img data-marketing-post-image> phải nằm trong .browser-mockup-card`,
      );
    }
    if (!url) {
      errors.push(`${name}: thiếu data-marketing-post-image-url trên <img>`);
      continue;
    }
    if (usedUrls.has(url)) {
      errors.push(
        `${name}: URL trùng beat ${usedUrls.get(url)} — cấm lặp ảnh marketing post`,
      );
    } else {
      usedUrls.set(url, name);
    }
  }
}

const configuredUrls = configured
  .map((item) => String(item?.url ?? "").trim())
  .filter(Boolean);

for (const url of configuredUrls) {
  if (!usedUrls.has(url)) {
    warnings.push(
      `URL chưa dùng ở beat nào: ${url.slice(0, 80)}${url.length > 80 ? "…" : ""}`,
    );
  }
}

warnings.forEach((w) => console.warn(`WARN: ${w}`));

if (errors.length) {
  console.error("\n=== MARKETING POST IMAGES FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error("\nĐọc: marketing-post-image-card.md");
  process.exit(1);
}

console.log(
  `check-marketing-post-images: OK (${usedUrls.size} image(s) wired, ${configuredUrls.length} configured)`,
);
process.exit(0);
