#!/usr/bin/env node
/**
 * Alias backward-compat — default lang=vi khi thiếu metadata/env.
 * Khuyến nghị: transcribe-audio.mjs (đọc language từ assets/agent-metadata.json).
 */
import path from "path";
import { parseTranscribeArgs, runTranscribe } from "./transcribe-audio.mjs";
import { resolveTranscribeConfig } from "./lib/transcribe-locale.mjs";

const parsed = parseTranscribeArgs(process.argv);
if (!parsed.projectDir) {
  console.error("usage: node transcribe-vi.mjs <project-dir> [--audio <rel-path>]");
  process.exit(1);
}

const projectDir = path.resolve(parsed.projectDir);
const lang =
  parsed.lang ||
  process.env.SHORT_VIDEO_TRANSCRIBE_LANG ||
  resolveTranscribeConfig(projectDir).lang ||
  "vi";

try {
  const { manifest, config } = runTranscribe(projectDir, {
    audioRel: parsed.audioRel,
    lang,
    model: parsed.model,
  });
  console.log(
    `[transcribe-vi] OK — ${manifest.wordCount} words, ~${manifest.durationSec}s, lang=${config.lang}, model=${config.model}`,
  );
  console.log(`[transcribe-vi] wrote transcript.json + assets/transcribe-manifest.json`);
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
