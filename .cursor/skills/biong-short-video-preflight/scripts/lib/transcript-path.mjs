/**
 * SSOT transcript path resolution for short-video preflight.
 */
import fs from "fs";
import path from "path";

export const CANONICAL_TRANSCRIPT_REL = "transcript.json";
export const TRANSCRIBE_MANIFEST_REL = "assets/transcribe-manifest.json";

export const LEGACY_TRANSCRIPT_CANDIDATES = [
  "transcript.json",
  "assets/transcript.json",
  "assets/audio/transcript.json",
];

export function manifestPath(projectDir) {
  return path.join(projectDir, TRANSCRIBE_MANIFEST_REL);
}

export function canonicalTranscriptPath(projectDir) {
  return path.join(projectDir, CANONICAL_TRANSCRIPT_REL);
}

export function listTranscriptCandidates(projectDir) {
  return LEGACY_TRANSCRIPT_CANDIDATES.map((rel) => path.join(projectDir, rel));
}

export function readTranscribeManifest(projectDir) {
  const p = manifestPath(projectDir);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Resolve transcript path:
 * 1. If transcribe-manifest exists → canonical transcript.json only
 * 2. Else newest mtime among candidates
 */
export function resolveTranscriptPath(projectDir) {
  const manifest = readTranscribeManifest(projectDir);
  const canonical = canonicalTranscriptPath(projectDir);

  if (manifest) {
    if (fs.existsSync(canonical)) return canonical;
    return null;
  }

  const existing = listTranscriptCandidates(projectDir)
    .filter((p) => fs.existsSync(p))
    .map((p) => ({ p, mtime: fs.statSync(p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  return existing[0]?.p ?? null;
}

export function deleteStaleTranscripts(projectDir) {
  const removed = [];
  for (const p of listTranscriptCandidates(projectDir)) {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
      removed.push(path.relative(projectDir, p));
    }
  }
  return removed;
}

export function parseTranscriptRaw(raw) {
  const list = Array.isArray(raw) ? raw : raw.words ?? [];
  return list
    .filter((w) => w && "start" in w && "end" in w)
    .map((w) => ({
      text: String(w.text ?? "").trim(),
      start: Number(w.start),
      end: Number(w.end),
    }))
    .filter((w) => w.text.length > 0);
}

export function loadTranscriptWords(projectDir, { stripEmotion = false, stripPunctFn } = {}) {
  const trPath = resolveTranscriptPath(projectDir);
  if (!trPath) return { words: [], path: null };

  const raw = JSON.parse(fs.readFileSync(trPath, "utf8"));
  let words = parseTranscriptRaw(raw);

  if (stripEmotion && stripPunctFn) {
    const WHISPER_EMOTION_WORD_RE =
      /^(?:laugh|laughter|sigh|confirmation|dissatisfaction|surprise|question)$/i;
    words = words.filter((w) => !WHISPER_EMOTION_WORD_RE.test(stripPunctFn(w.text)));
  }

  return { words, path: trPath };
}
