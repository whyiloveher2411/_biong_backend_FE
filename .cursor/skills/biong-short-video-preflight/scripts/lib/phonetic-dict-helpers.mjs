import fs from "fs";
import path from "path";

const PHONETIC_SPAN_EXTRA = 3;
const PHONETIC_SPAN_EXACT_MIN = 0.55;
const PHONETIC_SPAN_FUZZY_MIN = 0.4;
const PHONETIC_SPAN_LAST_TOKEN_BOOST_MIN = 0.35;

function normCompareToken(word) {
  return String(word ?? "")
    .replace(/[.,!?;:…]+$/u, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-z0-9]/g, "");
}

function tokenizeTerm(term) {
  const trimmed = String(term ?? "").replace(/\s+/g, " ").trim();
  if (!trimmed) return [];
  const raw = trimmed.match(/[\p{L}\p{N}]+(?:[.\-][\p{L}\p{N}]+)*/gu) ?? [];
  return raw.map((piece) => piece.trim()).filter(Boolean);
}

/** Tách phiên âm theo khoảng trắng + dấu gạch (Ây-ai → Ây, ai). */
export function tokenizePhonetic(term) {
  const pieces = tokenizeTerm(term);
  const out = [];
  for (const piece of pieces) {
    const parts = String(piece)
      .split(/[-.]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length) {
      out.push(...parts);
    }
  }
  return out;
}

function resolvePhoneticTokens(entry) {
  const fromArray = Array.isArray(entry?.phonetic_tokens) && entry.phonetic_tokens.length
    ? entry.phonetic_tokens.flatMap((token) => tokenizePhonetic(token))
    : [];
  if (fromArray.length) {
    return fromArray;
  }
  const fromPhonetic = tokenizePhonetic(entry?.phonetic);
  if (fromPhonetic.length) {
    return fromPhonetic;
  }
  const fallback = String(entry?.phonetic ?? "").trim();
  return fallback ? [fallback] : [];
}

function sortDictEntries(entries) {
  return [...entries].sort((a, b) => {
    const termA = String(a.source_term ?? "").replace(/\s+/g, " ").trim();
    const termB = String(b.source_term ?? "").replace(/\s+/g, " ").trim();
    const tokensA = termA ? termA.split(" ").filter(Boolean).length : 0;
    const tokensB = termB ? termB.split(" ").filter(Boolean).length : 0;
    if (tokensA !== tokensB) return tokensB - tokensA;
    if (termA.length !== termB.length) return termB.length - termA.length;
    return termA.localeCompare(termB);
  });
}

function scriptTokensMatch(slice, sourceTokens) {
  if (slice.length !== sourceTokens.length) return false;
  return slice.every(
    (token, index) => normCompareToken(token) === normCompareToken(sourceTokens[index]),
  );
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const row = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i += 1) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= n; j += 1) {
      const tmp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return row[n];
}

function joinedSimilarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  if (a === b) return 1;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  // Tránh khớp giả: "ai" ⊂ "ayai" hoặc "la" ≈ substring
  if (shorter.length < Math.ceil(longer.length * 0.6)) {
    const dist = levenshtein(a, b);
    return 1 - dist / Math.max(a.length, b.length);
  }

  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length);
  let best = 1 - dist / maxLen;

  if (b.length > a.length) {
    // Chỉ cho bỏ prefix ngắn (ASR thừa đầu), không khớp suffix kiểu "nghệÂyai" ⊃ "ayai"
    const maxSkip = Math.min(2, b.length - a.length);
    for (let i = 0; i <= maxSkip; i += 1) {
      const slice = b.slice(i, i + a.length);
      const sliceDist = levenshtein(a, slice);
      best = Math.max(best, 1 - sliceDist / Math.max(a.length, 1));
    }
  } else if (a.length > b.length) {
    const maxSkip = Math.min(2, a.length - b.length);
    for (let i = 0; i <= maxSkip; i += 1) {
      const slice = a.slice(i, i + b.length);
      const sliceDist = levenshtein(slice, b);
      best = Math.max(best, 1 - sliceDist / Math.max(b.length, 1));
    }
  }

  return best;
}

function collectTranscriptIndexes(entries) {
  const indexes = [];
  for (const entry of entries) {
    if (Array.isArray(entry?.transcriptIndexes)) {
      for (const idx of entry.transcriptIndexes) {
        if (typeof idx === "number" && idx >= 0) {
          indexes.push(idx);
        }
      }
    }
    const single = entry?.transcriptIndex;
    if (typeof single === "number" && single >= 0) {
      indexes.push(single);
    }
  }
  return [...new Set(indexes)].sort((a, b) => a - b);
}

function matchTypeRank(matchType) {
  if (matchType === "phonetic-dict-exact" || matchType === "exact") return 3;
  if (matchType === "phonetic-dict" || matchType === "fuzzy" || String(matchType || "").startsWith("cluster")) {
    return 2;
  }
  return 1;
}

function buildSpanCandidate(window, i, len, similarity, matchedVia, expectedLen) {
  const matchType = similarity >= PHONETIC_SPAN_EXACT_MIN
    ? "phonetic-dict-exact"
    : "phonetic-dict";
  return {
    start: Number(window[0]?.start ?? 0),
    end: Number(window[window.length - 1]?.end ?? 0),
    whisperText: window.map((word) => String(word?.text ?? "").trim()).filter(Boolean).join(" "),
    transcriptIndexes: window.map((_, offset) => i + offset),
    transcriptIndex: i,
    matchType,
    similarity,
    lengthDelta: Math.abs(len - expectedLen),
    windowLen: len,
    matchedVia,
  };
}

function isBetterPhoneticCandidate(candidate, best) {
  if (!best) return true;
  if (candidate.rankScore > best.rankScore + 0.001) return true;
  if (Math.abs(candidate.rankScore - best.rankScore) > 0.001) return false;
  // ASR tách thừa (Ê sơ ai): ưu tiên cửa sổ dài hơn khi điểm gần bằng
  if (candidate.windowLen > best.windowLen) return true;
  if (candidate.windowLen < best.windowLen) return false;
  return candidate.similarity > best.similarity;
}

function isBetterSourceCandidate(candidate, best) {
  if (!best) return true;
  if (candidate.rankScore > best.rankScore + 0.001) return true;
  if (Math.abs(candidate.rankScore - best.rankScore) > 0.001) return false;
  // Khớp gốc: ưu tiên cửa sổ ngắn — không nuốt "là gì" sau "AI"
  if (candidate.windowLen < best.windowLen) return true;
  if (candidate.windowLen > best.windowLen) return false;
  return candidate.similarity > best.similarity;
}

/**
 * Tìm cửa sổ Whisper: ưu tiên khớp phiên âm; nếu không thì khớp bản gốc
 * (normalize bỏ chấm/ký tự đặc biệt, vd. A.I. ≈ AI).
 */
export function findBestPhoneticWhisperSpan(
  whisperWords,
  phoneticTokens,
  searchStart = 0,
  sourceTerm = "",
) {
  const phoneticTarget = phoneticTokens.map((token) => normCompareToken(token)).filter(Boolean).join("");
  const sourceTarget = tokenizeTerm(sourceTerm).map((token) => normCompareToken(token)).filter(Boolean).join("")
    || normCompareToken(sourceTerm);
  if ((!phoneticTarget && !sourceTarget) || !Array.isArray(whisperWords) || !whisperWords.length) {
    return null;
  }

  const start = Math.max(0, Number(searchStart) || 0);
  const phoneticCount = Math.max(1, phoneticTokens.length || 1);
  const sourceCount = Math.max(1, tokenizeTerm(sourceTerm).length || 1);
  // Cho phép 1 token Whisper (vd. "A.I.") dù phiên âm có 2 âm tiết
  const minWindow = 1;
  const maxWindow = Math.max(phoneticCount, sourceCount) + PHONETIC_SPAN_EXTRA;
  const lastPhonetic = normCompareToken(phoneticTokens[phoneticTokens.length - 1] || "");

  let bestPhonetic = null;
  let bestSource = null;

  for (let i = start; i < whisperWords.length; i += 1) {
    if (i > start + Math.max(8, maxWindow * 2)) {
      break;
    }
    for (let len = minWindow; len <= maxWindow && i + len <= whisperWords.length; len += 1) {
      const window = whisperWords.slice(i, i + len);
      const joined = window.map((word) => normCompareToken(word?.text)).filter(Boolean).join("");
      if (!joined) continue;

      const phoneticSim = phoneticTarget ? joinedSimilarity(phoneticTarget, joined) : 0;
      const sourceSim = sourceTarget ? joinedSimilarity(sourceTarget, joined) : 0;
      const lastWhisper = normCompareToken(window[window.length - 1]?.text);
      const lastTokenMatch = Boolean(lastPhonetic && lastWhisper && lastPhonetic === lastWhisper);

      // 1) Whisper ↔ phiên âm
      let phoneticScore = phoneticSim;
      if (
        lastTokenMatch
        && len <= phoneticCount + PHONETIC_SPAN_EXTRA
        && phoneticScore >= PHONETIC_SPAN_LAST_TOKEN_BOOST_MIN
      ) {
        phoneticScore = Math.max(phoneticScore, PHONETIC_SPAN_EXACT_MIN);
      }
      // Không kéo token sau khi đuôi phiên âm không khớp (vd. "A.I. là gì")
      const phoneticOk = phoneticScore >= PHONETIC_SPAN_FUZZY_MIN
        && (lastTokenMatch || len <= phoneticCount);
      if (phoneticOk) {
        const rankScore = lastTokenMatch
          ? phoneticScore * (1 + 0.12 * Math.min(len, phoneticCount + 1) / (phoneticCount + 1))
          : phoneticScore;
        const candidate = {
          ...buildSpanCandidate(window, i, len, phoneticScore, "phonetic", phoneticCount),
          rankScore,
        };
        if (isBetterPhoneticCandidate(candidate, bestPhonetic)) {
          bestPhonetic = candidate;
        }
      }

      // 2) Fallback Whisper ↔ bản gốc (chỉ cửa sổ gần độ dài gốc)
      if (
        sourceSim >= PHONETIC_SPAN_EXACT_MIN
        && len <= sourceCount + 1
      ) {
        const lengthPenalty = Math.abs(len - sourceCount) * 0.05 + Math.max(0, len - sourceCount) * 0.15;
        const candidate = {
          ...buildSpanCandidate(window, i, len, sourceSim, "source", sourceCount),
          rankScore: sourceSim - lengthPenalty,
        };
        if (isBetterSourceCandidate(candidate, bestSource)) {
          bestSource = candidate;
        }
      }
    }
  }

  return bestPhonetic || bestSource;
}

export function expandScriptWithPhoneticDict(scriptWords, dictEntries = []) {
  const entries = sortDictEntries(dictEntries ?? []);
  const phoneticWords = [];
  const segments = [];
  let i = 0;

  while (i < scriptWords.length) {
    let matched = null;

    for (const entry of entries) {
      const sourceTokens = tokenizeTerm(entry.source_term);
      if (!sourceTokens.length) continue;
      const slice = scriptWords.slice(i, i + sourceTokens.length);
      if (!scriptTokensMatch(slice, sourceTokens)) continue;
      matched = { entry, sourceTokens, scriptSlice: slice };
      break;
    }

    if (matched) {
      const resolvedPhoneticTokens = resolvePhoneticTokens(matched.entry);

      segments.push({
        type: "dict",
        sourceTerm: String(matched.entry.source_term ?? ""),
        displayText: matched.scriptSlice.join(" "),
        scriptStart: i,
        scriptCount: matched.sourceTokens.length,
        phoneticStart: phoneticWords.length,
        phoneticCount: resolvedPhoneticTokens.length,
        phoneticTokens: resolvedPhoneticTokens,
      });

      phoneticWords.push(...resolvedPhoneticTokens);
      i += matched.sourceTokens.length;
      continue;
    }

    segments.push({
      type: "plain",
      sourceTerm: "",
      displayText: scriptWords[i],
      scriptStart: i,
      scriptCount: 1,
      phoneticStart: phoneticWords.length,
      phoneticCount: 1,
      phoneticTokens: [scriptWords[i]],
    });
    phoneticWords.push(scriptWords[i]);
    i += 1;
  }

  return {
    scriptWords,
    phoneticWords,
    segments,
  };
}

function mergeAlignedEntries(entries) {
  if (!entries.length) return null;

  const starts = entries.map((entry) => Number(entry.start ?? 0));
  const ends = entries.map((entry) => Number(entry.end ?? 0));
  const matchTypes = entries.map((entry) => String(entry.matchType ?? "interpolate"));
  const whisperTexts = entries
    .map((entry) => entry.whisperText)
    .filter((value) => value != null && String(value).trim() !== "");
  const transcriptIndexes = collectTranscriptIndexes(entries);

  const hasRed = matchTypes.some(
    (type) => type === "interpolate" || type === "positional" || type === "positional-gap",
  );
  const hasYellow = matchTypes.some(
    (type) => type.startsWith("cluster") || type === "fuzzy" || type === "phonetic-dict",
  );

  return {
    start: Math.min(...starts),
    end: Math.max(...ends),
    matchType: hasRed ? "phonetic-dict-interpolate" : (hasYellow ? "phonetic-dict" : "phonetic-dict-exact"),
    whisperText: whisperTexts.join(" "),
    corrected: entries.some((entry) => entry.corrected),
    transcriptIndex: transcriptIndexes[0] ?? entries[0]?.transcriptIndex ?? null,
    transcriptIndexes,
  };
}

function resolveDictSegmentMatch(segment, slice, whisperWords, searchStart) {
  const merged = mergeAlignedEntries(slice);
  const span = findBestPhoneticWhisperSpan(
    whisperWords,
    segment.phoneticTokens ?? [],
    searchStart,
    segment.sourceTerm || segment.displayText || "",
  );

  if (!span) {
    return merged;
  }

  if (!merged || matchTypeRank(span.matchType) >= matchTypeRank(merged.matchType)) {
    return {
      start: span.start,
      end: span.end,
      matchType: span.matchType,
      whisperText: span.whisperText,
      corrected: true,
      transcriptIndex: span.transcriptIndex,
      transcriptIndexes: span.transcriptIndexes,
    };
  }

  // Token-align tốt hơn span: vẫn chỉ giữ indexes của merge, không nuốt thêm từ span dài
  return {
    ...merged,
    transcriptIndex: merged.transcriptIndexes?.[0] ?? merged.transcriptIndex,
    transcriptIndexes: merged.transcriptIndexes ?? collectTranscriptIndexes([merged]),
  };
}

export function collapsePhoneticAlignToOriginal(
  phoneticAligned,
  segments,
  scriptWords,
  whisperWords = [],
) {
  const mapped = [];
  const corrections = [];
  let searchStart = 0;

  for (const segment of segments) {
    const slice = phoneticAligned.slice(
      segment.phoneticStart,
      segment.phoneticStart + segment.phoneticCount,
    );

    if (segment.phoneticCount > 1 || segment.type === "dict") {
      const displayText = segment.displayText
        || scriptWords.slice(segment.scriptStart, segment.scriptStart + segment.scriptCount).join(" ");

      const hintIndexes = collectTranscriptIndexes(slice);
      // Không nhảy tới hint token-align (thường chỉ trỏ token cuối như "ai") —
      // phải quét từ searchStart để bắt cả cụm ASR thừa đầu (Ê sơ ai).
      const localSearch = Math.max(
        0,
        Math.min(
          searchStart,
          hintIndexes.length ? hintIndexes[0] : searchStart,
        ),
      );

      const resolved = segment.type === "dict"
        ? resolveDictSegmentMatch(segment, slice, whisperWords, localSearch)
        : mergeAlignedEntries(slice);

      if (resolved) {
        const transcriptIndexes = collectTranscriptIndexes([resolved]);
        mapped.push({
          text: displayText,
          start: resolved.start,
          end: resolved.end,
          matchType: resolved.matchType,
          whisperText: resolved.whisperText,
          corrected: resolved.corrected,
          transcriptIndex: transcriptIndexes[0] ?? resolved.transcriptIndex ?? null,
          transcriptIndexes,
        });

        const whisperText = String(resolved.whisperText ?? "");
        if (whisperText && normCompareToken(displayText) !== normCompareToken(whisperText)) {
          corrections.push({
            index: mapped.length - 1,
            script: displayText,
            whisper: whisperText,
            matchType: resolved.matchType,
          });
        }

        if (transcriptIndexes.length) {
          searchStart = Math.max(...transcriptIndexes) + 1;
        }
      } else {
        mapped.push({
          text: displayText,
          start: 0,
          end: 0,
          matchType: "phonetic-dict-interpolate",
          whisperText: "",
          corrected: true,
          transcriptIndex: null,
          transcriptIndexes: [],
        });
      }
      continue;
    }

    const entry = slice[0];
    const displayText = scriptWords[segment.scriptStart] ?? segment.displayText;
    const transcriptIndexes = collectTranscriptIndexes(entry ? [entry] : []);
    mapped.push({
      text: displayText,
      start: entry?.start ?? 0,
      end: entry?.end ?? 0,
      matchType: entry?.matchType ?? "interpolate",
      whisperText: entry?.whisperText,
      corrected: entry?.corrected,
      transcriptIndex: transcriptIndexes[0] ?? entry?.transcriptIndex ?? null,
      transcriptIndexes,
    });
    if (transcriptIndexes.length) {
      searchStart = Math.max(...transcriptIndexes) + 1;
    }
  }

  const exactCount = mapped.filter(
    (entry) => entry.matchType === "exact" || entry.matchType === "phonetic-dict-exact",
  ).length;
  const transcriptPointerEnd = mapped.reduce((max, entry) => {
    const indexes = collectTranscriptIndexes([entry]);
    if (!indexes.length) return max;
    return Math.max(max, Math.max(...indexes) + 1);
  }, 0);

  return {
    mapped,
    exactCount,
    corrections,
    transcriptPointerEnd,
  };
}

export function alignScriptToWhisperWithPhoneticDict(
  scriptWords,
  whisperWords,
  dictEntries,
  alignFn,
  alignOptions = {},
) {
  if (!Array.isArray(dictEntries) || dictEntries.length === 0) {
    return alignFn(scriptWords, whisperWords, alignOptions);
  }

  const expanded = expandScriptWithPhoneticDict(scriptWords, dictEntries);
  const phoneticAlign = alignFn(expanded.phoneticWords, whisperWords, alignOptions);
  const collapsed = collapsePhoneticAlignToOriginal(
    phoneticAlign.mapped ?? [],
    expanded.segments,
    expanded.scriptWords,
    whisperWords,
  );

  return {
    ...phoneticAlign,
    mapped: collapsed.mapped,
    exactCount: collapsed.exactCount,
    corrections: [
      ...(phoneticAlign.corrections ?? []),
      ...collapsed.corrections,
    ],
    transcriptPointerEnd: collapsed.transcriptPointerEnd || phoneticAlign.transcriptPointerEnd,
    phoneticExpand: expanded,
  };
}

export function loadTtsPhoneticDict(projectDir) {
  const dictPath = path.join(projectDir, "assets/tts-phonetic-dict.json");
  if (!fs.existsSync(dictPath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(dictPath, "utf8"));
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (Array.isArray(parsed?.entries)) {
      return parsed.entries;
    }
  } catch {
    return [];
  }

  return [];
}
