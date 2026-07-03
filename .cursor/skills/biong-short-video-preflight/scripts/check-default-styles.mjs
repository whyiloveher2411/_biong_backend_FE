#!/usr/bin/env node
/**
 * Preflight: default styles enforcement
 * Kiểm tra beat_1 plate-rust + global border-3d/text-shadow.
 *
 * Usage: node check-default-styles.mjs <project-dir>
 * Exit 0 = pass, 1 = fail.
 */
import fs from "fs";
import path from "path";

const projectDir = process.argv[2];
if (!projectDir) {
  console.error("usage: node check-default-styles.mjs <project-dir>");
  process.exit(1);
}

const root = path.resolve(projectDir);
const errors = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const REQUIRED_BEAT_1_PATTERNS = [
  { re: /hook-title-plate\s+plate-rust/i, label: "hook-title-plate plate-rust" },
  { re: /hook-corner/i, label: "hook-corner" },
  { re: /fx-shine/i, label: "fx-shine" },
  { re: /fx-breathe/i, label: "fx-breathe" },
];

const REQUIRED_GLOBAL_STYLE_CHECKS = [
  {
    label: "hero text-shadow",
    test: (bundle) =>
      /\.hero[^}]*text-shadow/i.test(bundle) ||
      /\.hero-sm[^}]*text-shadow/i.test(bundle) ||
      /\.hook-title-text[^}]*text-shadow/i.test(bundle),
  },
  {
    label: "card-title text-shadow",
    test: (bundle) => /\.card-title[^}]*text-shadow/i.test(bundle),
  },
  {
    label: "border-3d inset box-shadow",
    test: (bundle) =>
      /\.ui-card[^}]*box-shadow:\s*inset/i.test(bundle) ||
      /\.premium-card[^}]*box-shadow:\s*inset/i.test(bundle) ||
      /\.quote-box[^}]*box-shadow:\s*inset/i.test(bundle) ||
      /\.border-3d[^}]*box-shadow:\s*inset/i.test(bundle),
  },
];

function collectCompositionHtml() {
  let compHtml = "";
  const beatFiles = [];
  const compDir = path.join(root, "compositions");
  if (!fs.existsSync(compDir)) return { compHtml, beatFiles };

  for (const name of fs.readdirSync(compDir)) {
    if (!name.endsWith(".html")) continue;
    const content = read(path.join("compositions", name));
    compHtml += content;
    if (/^beat_\d+\.html$/i.test(name)) {
      beatFiles.push({ name, content });
    }
  }
  return { compHtml, beatFiles };
}

if (!exists("index.html")) {
  console.error("FAIL: missing index.html");
  process.exit(1);
}

const indexHtml = read("index.html");
const { compHtml, beatFiles } = collectCompositionHtml();
const bundle = indexHtml + compHtml;

const hasGlobalCssFile = exists("assets/global-default-styles.css");
const hasGlobalCssLink =
  /global-default-styles\.css/i.test(indexHtml) ||
  beatFiles.some((b) => /global-default-styles\.css/i.test(b.content));

if (!hasGlobalCssFile && !hasGlobalCssLink) {
  warnings.push(
    "thiếu assets/global-default-styles.css hoặc <link> — copy từ skill assets khi bootstrap",
  );
}

const beat1 = beatFiles.find((b) => b.name === "beat_1.html");
if (!beat1) {
  errors.push("thiếu compositions/beat_1.html");
} else {
  for (const { re, label } of REQUIRED_BEAT_1_PATTERNS) {
    if (!re.test(beat1.content)) {
      errors.push(`beat_1: thiếu ${label} — đọc hook-title-impact-box.md`);
    }
  }

  const cornerCount = (beat1.content.match(/hook-corner/gi) ?? []).length;
  if (cornerCount < 4) {
    errors.push(
      `beat_1: cần 4× hook-corner (hiện ${cornerCount}) — đọc hook-title-impact-box.md`,
    );
  }

  if (/hook-title-frame/i.test(beat1.content) && !/hook-title-plate/i.test(beat1.content)) {
    errors.push(
      "beat_1: dùng hook-title-frame cũ — thay bằng hook-title-plate plate-rust",
    );
  }

  if (/plate-wood/i.test(beat1.content)) {
    errors.push("beat_1: cấm plate-wood — chỉ plate-rust được phép");
  }

  if (/hook-title-text[\s\S]*Short video\s*#\s*\d+/i.test(beat1.content)) {
    errors.push(
      'beat_1: hook-title-text cấm "Short video #N" — dùng article_title từ get_context',
    );
  }

  if (exists("assets/agent-metadata.json")) {
    try {
      const meta = JSON.parse(read("assets/agent-metadata.json"));
      const articleTitle = String(meta.article_title ?? "").trim();
      if (articleTitle && /hook-title-text/i.test(beat1.content)) {
        const hookMatch = beat1.content.match(
          /<h1[^>]*class="[^"]*hook-title-text[^"]*"[^>]*>([\s\S]*?)<\/h1>/i,
        );
        if (hookMatch) {
          const hookPlain = hookMatch[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          if (
            hookPlain &&
            !hookPlain.includes(articleTitle) &&
            articleTitle.length >= 8
          ) {
            warnings.push(
              `beat_1: hook-title-text không khớp article_title "${articleTitle}" — đọc hook-title-impact-box.md`,
            );
          }
        }
      }
    } catch {
      /* skip */
    }
  }
}

let globalCssBundle = bundle;
if (hasGlobalCssFile) {
  globalCssBundle += read("assets/global-default-styles.css");
}

for (const { label, test } of REQUIRED_GLOBAL_STYLE_CHECKS) {
  if (!test(globalCssBundle)) {
    errors.push(
      `thiếu global style ${label} — inject assets/global-default-styles.css hoặc inline CSS`,
    );
  }
}

const beats2Plus = beatFiles.filter((b) => !/^beat_1\.html$/i.test(b.name));
for (const { name, content } of beats2Plus) {
  const hasBox =
    /\.(ui-card|premium-card|quote-box|flow-node|vs-card|bento-card|stat-card)\b/i.test(
      content,
    );
  const hasBoxColor = /\.box-(info|warning|success|accent|neutral)\b/i.test(content);
  if (hasBox && !hasBoxColor) {
    warnings.push(
      `${name}: box thiếu .box-* color variant — đọc box-animation-catalog.md`,
    );
  }
}

/**
 * Empty-box bug: element mang class border-3d (ui-card/quote-box/vs-card/...)
 * nhưng KHÔNG class nào của chính nó có padding + (background|border) trong
 * CSS cùng file — global-default-styles.css chỉ thêm box-shadow (viền sáng/tối),
 * không có nền/khoảng đệm. Kết quả: element chỉ hiện 2 đường viền ngang mỏng,
 * chữ dính sát viền, không có "box" thật (lỗi phát hiện video #13, 2026-07-02).
 */
const BOX_PATTERN_CLASSES = [
  "ui-card",
  "premium-card",
  "quote-box",
  "vs-card",
  "bento-card",
  "stat-card",
  "company-chip",
  "context-chip",
  "flow-node",
  "badge",
];

function extractStyleRules(html) {
  const styleBlocks = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (m) => m[1],
  );
  const css = styleBlocks.join("\n");
  const rules = [];
  const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = ruleRe.exec(css)) !== null) {
    rules.push({ selectors: m[1], body: m[2] });
  }
  return rules;
}

/** class -> merged CSS declaration text từ mọi selector chứa class đó (kể cả compound). */
function buildClassStyleMap(rules) {
  const map = new Map();
  for (const { selectors, body } of rules) {
    const classNames = [
      ...selectors.matchAll(/\.([a-zA-Z0-9_-]+)/g),
    ].map((m) => m[1]);
    for (const cls of new Set(classNames)) {
      map.set(cls, (map.get(cls) ?? "") + ";" + body);
    }
  }
  return map;
}

function hasBoxTreatment(cssText) {
  const hasPadding = /padding\s*:/i.test(cssText);
  const hasFill =
    /background(?!-position|-size|-repeat|-attachment)\s*:/i.test(cssText) ||
    /border(?!-radius)\s*:/i.test(cssText) ||
    /border-left\s*:/i.test(cssText) ||
    /backdrop-filter\s*:/i.test(cssText);
  return hasPadding && hasFill;
}

const globalClassMap = buildClassStyleMap(
  extractStyleRules(hasGlobalCssFile ? read("assets/global-default-styles.css") : ""),
);

for (const { name, content } of beatFiles) {
  const classMap = buildClassStyleMap(extractStyleRules(content));
  const elementRe = /<(?:div|span|section|p|h1|h2|h3)\b[^>]*\bclass="([^"]+)"[^>]*>/gi;
  let em;
  const seen = new Set();
  while ((em = elementRe.exec(content)) !== null) {
    const classes = em[1].trim().split(/\s+/);
    const boxClass = classes.find((c) => BOX_PATTERN_CLASSES.includes(c));
    if (!boxClass) continue;
    const key = classes.join(" ");
    if (seen.has(key)) continue;
    seen.add(key);
    const styled = classes.some((c) => {
      const local = classMap.get(c) ?? "";
      const global = globalClassMap.get(c) ?? "";
      return hasBoxTreatment(local) || hasBoxTreatment(local + global);
    });
    if (!styled) {
      errors.push(
        `${name}: class="${key}" mang box-pattern "${boxClass}" nhưng không class nào có padding+background/border cùng file — global-default-styles.css chỉ thêm box-shadow viền, element sẽ hiện 2 đường viền ngang trống không khoảng đệm (đọc canvas-contract-3-layer.md § Lớp 2)`,
      );
    }
  }
}

warnings.forEach((w) => console.error("WARN:", w));

if (errors.length) {
  console.error("\n=== DEFAULT STYLES FAIL ===\n");
  errors.forEach((e) => console.error(`✗ ${e}`));
  console.error(
    "\nĐọc: hook-title-impact-box.md + text-shadow-guidelines.md + global-default-styles.css",
  );
  process.exit(1);
}

console.log("check-default-styles: OK");
process.exit(0);
