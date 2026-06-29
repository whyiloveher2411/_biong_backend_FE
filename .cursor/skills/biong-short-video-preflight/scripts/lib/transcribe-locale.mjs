/**
 * Locale registry + config resolution for short-video transcribe pipeline.
 * Extend LOCALES to add languages — không sửa logic transcribe/sanity.
 */
import fs from "fs";
import path from "path";
import { readTranscribeManifest, TRANSCRIBE_MANIFEST_REL } from "./transcript-path.mjs";

const AGENT_METADATA_REL = "assets/agent-metadata.json";

/** @typedef {'diacritic-latin' | 'latin' | 'cjk' | 'generic'} SanityProfile */

/**
 * @type {Record<string, { label: string, whisperModel: string, sanity: SanityProfile, scriptPattern?: RegExp, transcriptPattern?: RegExp }>}
 */
export const LOCALES = {
  vi: {
    label: "Vietnamese",
    whisperModel: "small",
    sanity: "diacritic-latin",
    scriptPattern: /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i,
  },
  en: {
    label: "English",
    whisperModel: "small.en",
    sanity: "latin",
    scriptPattern: /^[a-z0-9\s'.!?,-]+$/i,
  },
  ja: {
    label: "Japanese",
    whisperModel: "small",
    sanity: "cjk",
    scriptPattern: /[\u3040-\u30ff\u4e00-\u9fff]/,
  },
  ko: {
    label: "Korean",
    whisperModel: "small",
    sanity: "cjk",
    scriptPattern: /[\uac00-\ud7af\u1100-\u11ff]/,
  },
  zh: {
    label: "Chinese",
    whisperModel: "small",
    sanity: "cjk",
    scriptPattern: /[\u4e00-\u9fff]/,
  },
};

export const DEFAULT_LOCALE = "vi";

export function normalizeLocaleCode(raw) {
  const code = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
  if (!code) return "";
  const base = code.split("-")[0];
  return LOCALES[base] ? base : base;
}

export function getLocaleProfile(lang) {
  const code = normalizeLocaleCode(lang) || DEFAULT_LOCALE;
  return {
    code,
    ...(LOCALES[code] ?? {
      label: code,
      whisperModel: "small",
      sanity: "generic",
    }),
  };
}

export function whisperArgsForLocale(profile, overrides = {}) {
  const model = overrides.model || profile.whisperModel || "small";
  const lang = normalizeLocaleCode(overrides.lang || profile.code);
  const args = ["--model", model];
  if (!model.endsWith(".en") && lang) {
    args.push("--language", lang);
  }
  return { model, lang, args };
}

function readAgentMetadata(projectDir) {
  const p = path.join(projectDir, AGENT_METADATA_REL);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Resolve transcribe locale — ưu tiên: CLI > env > agent-metadata > manifest > default.
 */
export function resolveTranscribeConfig(projectDir, overrides = {}) {
  const meta = projectDir ? readAgentMetadata(projectDir) : null;
  const manifest = projectDir ? readTranscribeManifest(projectDir) : null;

  const langRaw =
    overrides.lang ||
    process.env.SHORT_VIDEO_TRANSCRIBE_LANG ||
    meta?.language ||
    meta?.script_language ||
    meta?.locale ||
    meta?.tts_language ||
    manifest?.language ||
    DEFAULT_LOCALE;

  const modelRaw =
    overrides.model || process.env.SHORT_VIDEO_TRANSCRIBE_MODEL || manifest?.model || "";

  const profile = getLocaleProfile(langRaw);
  const whisper = whisperArgsForLocale(profile, {
    lang: normalizeLocaleCode(langRaw),
    model: modelRaw || undefined,
  });

  return {
    lang: whisper.lang,
    model: whisper.model,
    whisperArgs: whisper.args,
    profile,
    source: {
      lang: overrides.lang
        ? "cli"
        : process.env.SHORT_VIDEO_TRANSCRIBE_LANG
          ? "env"
          : meta?.language || meta?.script_language || meta?.locale
            ? "agent-metadata"
            : manifest?.language
              ? "manifest"
              : "default",
      model: overrides.model ? "cli" : modelRaw ? "env-or-manifest" : "locale-default",
    },
  };
}

export function formatTranscribeHint(config) {
  const { model, lang, profile } = config;
  if (model.endsWith(".en")) {
    return `npx hyperframes transcribe <audio> --model ${model} -d <project>`;
  }
  return `npx hyperframes transcribe <audio> --model ${model} --language ${lang} -d <project>`;
}
