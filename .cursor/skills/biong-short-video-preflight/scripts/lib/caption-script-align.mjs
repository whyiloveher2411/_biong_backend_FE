/**
 * Align audio script tokens → Whisper word timings.
 * Display text ALWAYS from script — never Whisper text in output.
 */
import {
  tokensMatchForAlign,
  tryCompoundSplit,
  tryForYouCluster,
  tryFractionCluster,
  tryPercentCluster,
  tryCoViewCluster,
  tryHyphenTranscriptCluster,
  tryPlainNumberCluster,
  tryTikTokCluster,
} from "./vi-align-helpers.mjs";

export const DEFAULT_LOOKAHEAD = 40;
export const DEFAULT_FUZZY_MIN = 0.72;
export const DEFAULT_DENSITY_MAX = 0.25;

const OMNIVOICE_EMOTION_TAG_RE = /\[(?:laughter|laugh|sigh|dissatisfaction-hnn)\]/gi;

export const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "");

export function stripPunct(word) {
  return String(word ?? "").replace(/[.,!?;:…]+$/u, "");
}

export function stripScriptMarkers(text) {
  return String(text)
    .replace(/\[BGM:[^\]]*\]/gi, " ")
    .replace(/\[SFX:[^\]]*\]/gi, " ")
    .replace(/\[Dừng[^\]]*\]/gi, " ")
    .replace(OMNIVOICE_EMOTION_TAG_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeScript(text) {
  const cleaned = stripScriptMarkers(text);
  if (!cleaned) return [];

  const raw =
    cleaned.match(
      /[\p{L}\p{N}]+(?:[.\-][\p{L}\p{N}]+)*(?:[.,!?;:…]+)?|[\p{L}\p{N}]+[.,!?;:…]+|[.,!?;:…]+/gu,
    ) ?? [];
  const words = [];

  for (const piece of raw) {
    const trimmed = piece.trim();
    if (!trimmed) continue;

    if (/^[.,!?;:…]+$/.test(trimmed)) {
      if (words.length) {
        words[words.length - 1] = words[words.length - 1] + trimmed;
      }
      continue;
    }

    const m = trimmed.match(/^([\p{L}\p{N}]+(?:[.\-][\p{L}\p{N}]+)*)([.,!?;:…]+)?$/u);
    if (m) {
      words.push(m[2] ? m[1] + m[2] : m[1]);
    } else {
      words.push(trimmed);
    }
  }

  return words;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

export function wordSimilarity(a, b) {
  const na = norm(stripPunct(a));
  const nb = norm(stripPunct(b));
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

export function interpolateTiming(prev, next, index, total) {
  if (prev && next) {
    const t = (index + 1) / (total + 1);
    const start = prev.end + (next.start - prev.end) * t;
    const end = start + Math.max(0.08, (next.end - next.start) * 0.5);
    return { start: +start.toFixed(3), end: +end.toFixed(3) };
  }
  if (prev) {
    const dur = Math.max(0.12, prev.end - prev.start);
    return {
      start: +(prev.end + 0.02).toFixed(3),
      end: +(prev.end + 0.02 + dur).toFixed(3),
    };
  }
  if (next) {
    const dur = Math.max(0.12, next.end - next.start);
    return {
      start: +Math.max(0, next.start - dur).toFixed(3),
      end: +next.start.toFixed(3),
    };
  }
  return { start: 0, end: 0.2 };
}

/**
 * @param {string[]} scriptWords
 * @param {{ text: string, start: number, end: number }[]} transcriptWords
 * @param {{ lookahead?: number, fuzzyMin?: number, densityMax?: number }} [options]
 */
export function alignScriptToWhisper(scriptWords, transcriptWords, options = {}) {
  const lookahead = options.lookahead ?? DEFAULT_LOOKAHEAD;
  const fuzzyMin = options.fuzzyMin ?? DEFAULT_FUZZY_MIN;
  const densityMax = options.densityMax ?? DEFAULT_DENSITY_MAX;

  const state = { p: 0 };
  const mapped = [];
  const corrections = [];
  let exactCount = 0;
  let fuzzyCount = 0;
  let positionalCount = 0;
  let interpolatedCount = 0;

  const densityDrift =
    scriptWords.length > 0
      ? Math.abs(scriptWords.length - transcriptWords.length) / scriptWords.length
      : 1;
  const allowPositional = densityDrift <= densityMax;

  let clusterCount = 0;

  for (let i = 0; i < scriptWords.length; i++) {
    const text = scriptWords[i];

    const forYou = tryForYouCluster(scriptWords, i, transcriptWords, state.p);
    if (forYou) {
      forYou.words.forEach((w, k) => {
        const t = forYou.timings[k];
        mapped.push({
          text: w,
          start: t.start,
          end: t.end,
          matchType: "cluster-for-you",
          whisperText: forYou.whisperText,
          corrected: w !== forYou.whisperText,
          transcriptIndex: state.p,
        });
      });
      clusterCount += forYou.words.length;
      state.p = forYou.transcriptEnd;
      i += forYou.consumed - 1;
      continue;
    }

    const pctCluster = tryPercentCluster(scriptWords, i, transcriptWords, state.p, lookahead);
    if (pctCluster) {
      pctCluster.words.forEach((w, k) => {
        const t = pctCluster.timings[k];
        mapped.push({
          text: w,
          start: t.start,
          end: t.end,
          matchType: pctCluster.matchType,
          whisperText: pctCluster.whisperText,
          corrected: true,
          transcriptIndex: state.p,
        });
        corrections.push({
          index: i + k,
          script: w,
          whisper: pctCluster.whisperText,
          matchType: pctCluster.matchType,
        });
      });
      clusterCount += pctCluster.words.length;
      state.p = pctCluster.transcriptEnd;
      i += pctCluster.consumed - 1;
      continue;
    }

    const fracCluster = tryFractionCluster(scriptWords, i, transcriptWords, state.p, lookahead);
    if (fracCluster) {
      fracCluster.words.forEach((w, k) => {
        const t = fracCluster.timings[k];
        mapped.push({
          text: w,
          start: t.start,
          end: t.end,
          matchType: fracCluster.matchType,
          whisperText: fracCluster.whisperText,
          corrected: true,
          transcriptIndex: state.p,
        });
      });
      clusterCount += fracCluster.words.length;
      state.p = fracCluster.transcriptEnd;
      i += fracCluster.consumed - 1;
      continue;
    }

    const tiktokCluster = tryTikTokCluster(scriptWords, i, transcriptWords, state.p);
    if (tiktokCluster) {
      tiktokCluster.words.forEach((w, k) => {
        const t = tiktokCluster.timings[k];
        mapped.push({
          text: w,
          start: t.start,
          end: t.end,
          matchType: tiktokCluster.matchType,
          whisperText: tiktokCluster.whisperText,
          corrected: true,
          transcriptIndex: state.p,
        });
      });
      clusterCount += tiktokCluster.words.length;
      state.p = tiktokCluster.transcriptEnd;
      i += tiktokCluster.consumed - 1;
      continue;
    }

    const coViewCluster = tryCoViewCluster(scriptWords, i, transcriptWords, state.p);
    if (coViewCluster) {
      coViewCluster.words.forEach((w, k) => {
        const t = coViewCluster.timings[k];
        mapped.push({
          text: w,
          start: t.start,
          end: t.end,
          matchType: coViewCluster.matchType,
          whisperText: coViewCluster.whisperText,
          corrected: true,
          transcriptIndex: state.p,
        });
      });
      clusterCount += coViewCluster.words.length;
      state.p = coViewCluster.transcriptEnd;
      i += coViewCluster.consumed - 1;
      continue;
    }

    const hyphenCluster = tryHyphenTranscriptCluster(scriptWords, i, transcriptWords, state.p);
    if (hyphenCluster) {
      hyphenCluster.words.forEach((w, k) => {
        const t = hyphenCluster.timings[k];
        mapped.push({
          text: w,
          start: t.start,
          end: t.end,
          matchType: hyphenCluster.matchType,
          whisperText: hyphenCluster.whisperText,
          corrected: w !== hyphenCluster.whisperText,
          transcriptIndex: state.p,
        });
      });
      clusterCount += hyphenCluster.words.length;
      state.p = hyphenCluster.transcriptEnd;
      i += hyphenCluster.consumed - 1;
      continue;
    }

    const plainNum = tryPlainNumberCluster(scriptWords, i, transcriptWords, state.p, lookahead);
    if (plainNum) {
      plainNum.words.forEach((w, k) => {
        const t = plainNum.timings[k];
        mapped.push({
          text: w,
          start: t.start,
          end: t.end,
          matchType: plainNum.matchType,
          whisperText: plainNum.whisperText,
          corrected: true,
          transcriptIndex: state.p,
        });
      });
      clusterCount += plainNum.words.length;
      state.p = plainNum.transcriptEnd;
      i += plainNum.consumed - 1;
      continue;
    }

    const compound = tryCompoundSplit(text, transcriptWords, state.p, lookahead);
    if (compound) {
      mapped.push({
        text,
        start: compound.timing.start,
        end: compound.timing.end,
        matchType: "compound",
        whisperText: compound.whisperText,
        corrected: text !== compound.whisperText,
        transcriptIndex: state.p,
      });
      if (text !== compound.whisperText) {
        corrections.push({
          index: i,
          script: text,
          whisper: compound.whisperText,
          matchType: "compound",
        });
      }
      exactCount++;
      state.p = compound.transcriptEnd;
      continue;
    }

    const target = norm(stripPunct(text));

    let found = -1;
    let matchType = null;
    let bestSim = 0;

    for (let j = state.p; j < Math.min(transcriptWords.length, state.p + lookahead); j++) {
      if (tokensMatchForAlign(text, transcriptWords[j].text)) {
        found = j;
        matchType = "exact";
        break;
      }
      const twNorm = norm(stripPunct(transcriptWords[j].text));
      if (twNorm && twNorm === target) {
        found = j;
        matchType = "exact";
        break;
      }
    }

    if (found < 0) {
      for (let j = state.p; j < Math.min(transcriptWords.length, state.p + lookahead); j++) {
        const sim = wordSimilarity(text, transcriptWords[j].text);
        if (sim >= fuzzyMin && sim > bestSim) {
          bestSim = sim;
          found = j;
          matchType = "fuzzy";
        }
      }
    }

    // Resync: nhảy tới token Whisper khớp nếu pointer bị lệch (tránh cascade interpolate)
    if (found < 0) {
      const target = norm(stripPunct(text));
      for (let j = state.p + 1; j < Math.min(transcriptWords.length, state.p + lookahead); j++) {
        if (tokensMatchForAlign(text, transcriptWords[j].text)) {
          found = j;
          matchType = "exact";
          break;
        }
        const twNorm = norm(stripPunct(transcriptWords[j].text));
        if (twNorm && twNorm === target) {
          found = j;
          matchType = "exact";
          break;
        }
      }
    }

    if (found >= 0) {
      const tw = transcriptWords[found];
      mapped.push({
        text,
        start: tw.start,
        end: tw.end,
        matchType,
        whisperText: tw.text,
        corrected: text !== tw.text,
        transcriptIndex: found,
      });
      if (matchType === "exact") exactCount++;
      else fuzzyCount++;
      if (text !== tw.text) {
        corrections.push({
          index: i,
          script: text,
          whisper: tw.text,
          matchType,
        });
      }
      state.p = found + 1;
      continue;
    }

    if (allowPositional && state.p < transcriptWords.length) {
      const tw = transcriptWords[state.p];
      const sim = wordSimilarity(text, tw.text);
      if (sim >= 0.45) {
        mapped.push({
          text,
          start: tw.start,
          end: tw.end,
          matchType: "positional",
          whisperText: tw.text,
          corrected: text !== tw.text,
          transcriptIndex: state.p,
        });
        positionalCount++;
        if (text !== tw.text) {
          corrections.push({
            index: i,
            script: text,
            whisper: tw.text,
            matchType: "positional",
          });
        }
        state.p += 1;
        continue;
      }
    }

    const prev = mapped.length ? mapped[mapped.length - 1] : null;
    const nextTw = transcriptWords[state.p] ?? null;
    const timing = interpolateTiming(prev, nextTw, interpolatedCount, scriptWords.length);
    mapped.push({
      text,
      start: timing.start,
      end: timing.end,
      matchType: "interpolate",
      whisperText: null,
      corrected: false,
      transcriptIndex: null,
    });
    interpolatedCount++;
  }

  const unmatchedWords = mapped
    .filter((w) => w.matchType === "interpolate")
    .map((w) => w.text);

  return {
    mapped,
    exactCount,
    fuzzyCount,
    positionalCount,
    interpolatedCount,
    clusterCount,
    corrections,
    transcriptPointerEnd: state.p,
    unmatchedWords,
    densityDrift: +densityDrift.toFixed(4),
  };
}

export function totalVideoSec(transcriptWords, mapped) {
  if (transcriptWords.length) {
    return +Math.max(...transcriptWords.map((w) => w.end)).toFixed(2);
  }
  if (mapped.length) {
    return +Math.max(...mapped.map((w) => w.end)).toFixed(2);
  }
  return 0;
}

export function toCaptionWords(mapped, duration) {
  return mapped.map(({ text, start, end }) => ({
    text,
    start: Math.max(0, Math.min(start, duration || start)),
    end: Math.min(duration || end, Math.max(end, start + 0.05)),
  }));
}
