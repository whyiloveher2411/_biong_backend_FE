/**
 * Vietnamese script ↔ Whisper alignment helpers.
 * Display text luôn từ script — chỉ hỗ trợ matching timing.
 */

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/[^a-z0-9\u00C0-\u024F\u1E00-\u1EFF]/g, "");

function stripPunct(word) {
  return String(word ?? "").replace(/[.,!?;:…]+$/u, "");
}

const VI_ONES = {
  khong: 0,
  mot: 1,
  hai: 2,
  ba: 3,
  bon: 4,
  tu: 4,
  nam: 5,
  lam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
};

/** ASR / TTS thường nghe khác chữ script */
const MATCH_ALIASES = {
  jack: "rac",
  zakk: "rac",
  rac: "rac",
  cho: "tro",
  tro: "tro",
  tich: "tik",
  toc: "tok",
  review: "ribio",
  ribio: "ribio",
  gasbeat: "vay",
  nguyen: "muon",
  muon: "muon",
  cau: "cau",
  coview: "cauview",
  lot: "nuot",
  nuot: "nuot",
  nerd: "not",
  not: "not",
  gio: "do",
  do: "do",
  minh: "mem",
  mem: "mem",
  mo: "ngo",
  ngo: "ngo",
  chi: "tri",
  glm: "glm",
  grm: "glm",
  luc: "luc",
};

export function matchKey(word) {
  const n = norm(stripPunct(word));
  if (!n) return "";
  if (MATCH_ALIASES[n]) return MATCH_ALIASES[n];
  if (VI_ONES[n] !== undefined) return `d:${VI_ONES[n]}`;
  if (/^\d+%?$/.test(n)) {
    const pct = n.endsWith("%");
    const num = n.replace(/%$/, "");
    return pct ? `p:${num}` : `d:${num}`;
  }
  return n;
}

export function tokensMatchForAlign(scriptWord, whisperWord) {
  const a = matchKey(scriptWord);
  const b = matchKey(whisperWord);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.startsWith("d:") && b.startsWith("d:")) return a === b;
  if (a.startsWith("p:") && b.startsWith("p:")) return a === b;
  return false;
}

function viWordNum(word) {
  const n = norm(stripPunct(word));
  return VI_ONES[n];
}

/**
 * Parse cụm số tiếng Việt + "phần trăm" → { value, consumed }.
 * Hỗ trợ: năm mươi chín phần trăm, tám mươi ba phần trăm, mười phần trăm, …
 */
export function parseViPercentPhrase(words, start) {
  let i = start;
  let total = 0;
  let current = 0;
  let sawNumber = false;

  while (i < words.length) {
    const raw = words[i];
    const w = norm(stripPunct(raw));
    if (!w) {
      i++;
      continue;
    }

    if (w === "phan" && norm(stripPunct(words[i + 1] ?? "")) === "tram") {
      if (!sawNumber) return null;
      return { value: total + current, consumed: i + 2 - start, isPercent: true };
    }

    const one = viWordNum(raw);
    if (one !== undefined) {
      sawNumber = true;
      if (one === 10) {
        current = current === 0 ? 10 : current * 10;
      } else {
        current += one;
      }
      i++;
      continue;
    }

    if (w === "muoi") {
      sawNumber = true;
      current = (current || 0) * 10;
      i++;
      continue;
    }

    if (w === "tram") {
      sawNumber = true;
      total += (current || 1) * 100;
      current = 0;
      i++;
      continue;
    }

    if (w === "nghin" || w === "ngan") {
      sawNumber = true;
      total = (total + (current || 1)) * 1000;
      current = 0;
      i++;
      continue;
    }

    break;
  }

  return null;
}

/** "một trăm" → 100 */
export function parseViHundredPhrase(words, start) {
  const w0 = norm(stripPunct(words[start] ?? ""));
  const w1 = norm(stripPunct(words[start + 1] ?? ""));
  if (w0 === "mot" && w1 === "tram") {
    return { value: 100, consumed: 2 };
  }
  const n = viWordNum(words[start] ?? "");
  if (n !== undefined && w1 === "tram") {
    return { value: (n || 1) * 100, consumed: 2 };
  }
  return null;
}

export function transcriptPercentToken(tw) {
  const raw = String(tw.text ?? "")
    .trim()
    .replace(/%\.?$/, "")
    .replace(/\s/g, "");
  const decimal = raw.match(/^(\d+)[,.](\d+)$/);
  if (decimal) {
    return {
      value: parseFloat(`${decimal[1]}.${decimal[2]}`),
      hasPercent: String(tw.text).includes("%"),
    };
  }
  const n = norm(stripPunct(tw.text));
  const m = n.match(/^(\d+)%?\.?$/);
  if (!m) return null;
  return { value: parseInt(m[1], 10), hasPercent: String(tw.text).includes("%") };
}

/** Whisper "65-75%." ↔ script sáu mươi lăm đến bảy mươi lăm phần trăm */
export function transcriptPercentRangeToken(tw) {
  const raw = String(tw.text ?? "")
    .trim()
    .replace(/%\.?$/u, "")
    .replace(/\s/g, "");
  const m = raw.match(/^(\d+)[-–](\d+)$/u);
  if (!m) return null;
  return { low: parseInt(m[1], 10), high: parseInt(m[2], 10) };
}

/** Cụm "X đến Y phần trăm" viết chữ (X,Y là số tiếng Việt hoặc chữ số) */
export function parseViPercentRangePhrase(words, start) {
  const first = parseViPlainNumber(words, start);
  if (!first) return null;
  let i = start + first.consumed;
  if (norm(stripPunct(words[i] ?? "")) !== "den") return null;
  i++;
  const second = parseViPlainNumber(words, i);
  if (!second) return null;
  i += second.consumed;
  if (
    norm(stripPunct(words[i] ?? "")) === "phan" &&
    norm(stripPunct(words[i + 1] ?? "")) === "tram"
  ) {
    return {
      low: first.value,
      high: second.value,
      consumed: i + 2 - start,
    };
  }
  return null;
}

export function tryViPercentRangeCluster(scriptWords, i, transcriptWords, p, lookahead = 20) {
  const parsed = parseViPercentRangePhrase(scriptWords, i);
  if (!parsed) return null;

  for (let j = p; j < Math.min(transcriptWords.length, p + lookahead); j++) {
    const rt = transcriptPercentRangeToken(transcriptWords[j]);
    if (rt && rt.low === parsed.low && rt.high === parsed.high) {
      const words = scriptWords.slice(i, i + parsed.consumed);
      const timings = splitClusterTiming(transcriptWords[j], words.length);
      return {
        words,
        consumed: parsed.consumed,
        transcriptEnd: j + 1,
        timings,
        whisperText: transcriptWords[j].text,
        matchType: "cluster-percent-range",
      };
    }
  }
  return null;
}

/** Script "10," + "2." ↔ Whisper "10,2%." */
export function parseDecimalPercentTokens(words, start) {
  const raw0 = String(words[start] ?? "");
  const raw1 = String(words[start + 1] ?? "");
  const m0 = raw0.match(/^(\d+),$/);
  const m1 = raw1.match(/^(\d+)\.?$/);
  if (!m0 || !m1) return null;
  return {
    value: parseFloat(`${m0[1]}.${m1[1]}`),
    consumed: 2,
    isPercent: true,
  };
}

export function transcriptDigitToken(tw) {
  const n = norm(stripPunct(tw.text));
  const digitsOnly = n.replace(/\./g, "");
  if (/^\d+$/.test(digitsOnly)) return parseInt(digitsOnly, 10);
  return null;
}

/** Số đơn / cụm không có "phần trăm": năm mươi → 50, bảy → 7, 25 → 25 */
export function parseViPlainNumber(words, start) {
  const arabic = String(words[start] ?? "")
    .trim()
    .match(/^(\d+)\.?$/);
  if (arabic) {
    return { value: parseInt(arabic[1], 10), consumed: 1 };
  }

  let i = start;
  let total = 0;
  let current = 0;
  let sawNumber = false;

  while (i < words.length) {
    const raw = words[i];
    const w = norm(stripPunct(raw));
    if (!w) {
      i++;
      continue;
    }

    if (w === "nam" && i > start) {
      const prev = norm(stripPunct(words[i - 1] ?? ""));
      const next = norm(stripPunct(words[i + 1] ?? ""));
      if (
        prev === "mot" &&
        (next === "truoc" || next === "nay" || next === "sau" || next === "qua")
      ) {
        break;
      }
    }

    if (w === "tam") {
      const next = norm(stripPunct(words[i + 1] ?? ""));
      const prev = norm(stripPunct(words[i - 1] ?? ""));
      const measureNext = ["guong", "giay", "anh", "vai", "goi", "ban"].includes(next);
      const isMeasureTam = /ấm/i.test(String(raw)) || (prev === "mot" && measureNext);
      if (isMeasureTam) break;
    }

    const one = viWordNum(raw);
    if (one !== undefined) {
      sawNumber = true;
      if (one === 10) {
        current = current === 0 ? 10 : current * 10;
      } else {
        current += one;
      }
      i++;
      continue;
    }

    if (w === "muoi") {
      sawNumber = true;
      current = (current || 0) * 10;
      i++;
      continue;
    }

    if (w === "tram") {
      sawNumber = true;
      total += (current || 1) * 100;
      current = 0;
      i++;
      continue;
    }

    if (w === "nghin" || w === "ngan") {
      sawNumber = true;
      total = (total + (current || 1)) * 1000;
      current = 0;
      i++;
      continue;
    }

    break;
  }

  if (!sawNumber) return null;
  return { value: total + current, consumed: i - start };
}

/** "năm hai nghìn hai mươi sáu" ↔ Whisper "2026" (năm = year, not số 5) */
export function tryYearCluster(scriptWords, i, transcriptWords, p, lookahead = 20) {
  const w0 = norm(stripPunct(scriptWords[i] ?? ""));
  if (w0 !== "nam") return null;

  const parsed = parseViPlainNumber(scriptWords, i + 1);
  if (!parsed || parsed.value < 1900 || parsed.value > 2100) return null;

  for (let j = p; j < Math.min(transcriptWords.length, p + lookahead); j++) {
    const d = transcriptDigitToken(transcriptWords[j]);
    if (d !== null && d === parsed.value) {
      const words = scriptWords.slice(i, i + 1 + parsed.consumed);
      const timings = splitClusterTiming(transcriptWords[j], words.length);
      return {
        words,
        consumed: 1 + parsed.consumed,
        transcriptEnd: j + 1,
        timings,
        whisperText: transcriptWords[j].text,
        matchType: "cluster-year",
      };
    }
  }
  return null;
}

/** "hề hay biết" ↔ Whisper "hề ai biết" */
export function tryHayAiHomophone(scriptWords, i, transcriptWords, p) {
  const prev = i > 0 ? norm(stripPunct(scriptWords[i - 1] ?? "")) : "";
  const w = norm(stripPunct(scriptWords[i] ?? ""));
  if (prev !== "he" || w !== "hay") return null;
  const tw = transcriptWords[p];
  if (!tw) return null;
  const t = norm(stripPunct(tw.text));
  if (t !== "ai") return null;
  return {
    words: [scriptWords[i]],
    consumed: 1,
    transcriptEnd: p + 1,
    timings: [{ start: tw.start, end: tw.end }],
    whisperText: tw.text,
    matchType: "homophone",
  };
}

/** Whisper "9" ↔ script "chính" (lại chính câu hỏi) */
export function tryChinhNineHomophone(scriptWords, i, transcriptWords, p) {
  const w = norm(stripPunct(scriptWords[i] ?? ""));
  if (w !== "chinh") return null;
  const tw = transcriptWords[p];
  if (!tw) return null;
  const d = transcriptDigitToken(tw);
  if (d !== 9) return null;
  return {
    words: [scriptWords[i]],
    consumed: 1,
    transcriptEnd: p + 1,
    timings: [{ start: tw.start, end: tw.end }],
    whisperText: tw.text,
    matchType: "homophone-digit",
  };
}

export function tryPlainNumberCluster(scriptWords, i, transcriptWords, p, lookahead = 20) {
  const parsed = parseViPlainNumber(scriptWords, i);
  if (!parsed || parsed.consumed < 1) return null;

  const maxJump = parsed.consumed === 1 && parsed.value <= 10 ? 3 : lookahead;

  for (let j = p; j < Math.min(transcriptWords.length, p + maxJump); j++) {
    const d = transcriptDigitToken(transcriptWords[j]);
    const pt = transcriptPercentToken(transcriptWords[j]);
    const matches =
      (d !== null && d === parsed.value) ||
      (pt && Math.abs(pt.value - parsed.value) < 0.001);
    if (matches) {
      const words = scriptWords.slice(i, i + parsed.consumed);
      const timings = splitClusterTiming(transcriptWords[j], words.length);
      return {
        words,
        consumed: parsed.consumed,
        transcriptEnd: j + 1,
        timings,
        whisperText: transcriptWords[j].text,
        matchType: pt ? "cluster-plain-percent" : "cluster-number",
      };
    }
  }
  return null;
}

/** Gán timing chia đều cho N từ script trong 1 cụm Whisper */
export function splitClusterTiming(tw, count) {
  const dur = Math.max(0.05, tw.end - tw.start);
  const slice = dur / count;
  return Array.from({ length: count }, (_, k) => ({
    start: +(tw.start + slice * k).toFixed(3),
    end: +(tw.start + slice * (k + 1)).toFixed(3),
  }));
}

/** Whisper gộp 2+ từ ↔ nhiều token script liên tiếp: "hìnhảnh" ↔ "hình" + "ảnh" */
export function tryMergedTranscriptCluster(scriptWords, i, transcriptWords, p, lookahead = 12) {
  const tw = transcriptWords[p];
  if (!tw) return null;
  const tn = norm(stripPunct(tw.text));
  if (tn.length < 4) return null;

  for (let len = 2; len <= 4 && i + len <= scriptWords.length; len++) {
    const words = scriptWords.slice(i, i + len);
    const combined = words.map((w) => norm(stripPunct(w))).join("");
    if (
      combined === tn ||
      collapseDoubleChars(combined) === collapseDoubleChars(tn) ||
      portmanteauMatch(combined, tn)
    ) {
      const timings = splitClusterTiming(tw, words.length);
      return {
        words,
        consumed: len,
        transcriptEnd: p + 1,
        timings,
        whisperText: tw.text,
        matchType: "cluster-merged-transcript",
      };
    }
  }

  for (let start = p; start < Math.min(transcriptWords.length, p + lookahead); start++) {
    const twn = norm(stripPunct(transcriptWords[start]?.text ?? ""));
    if (twn.length < 4) continue;
    for (let len = 2; len <= 4 && i + len <= scriptWords.length; len++) {
      const words = scriptWords.slice(i, i + len);
      const combined = words.map((w) => norm(stripPunct(w))).join("");
      if (
        combined === twn ||
        collapseDoubleChars(combined) === collapseDoubleChars(twn) ||
        portmanteauMatch(combined, twn)
      ) {
        const timings = splitClusterTiming(transcriptWords[start], words.length);
        return {
          words,
          consumed: len,
          transcriptEnd: start + 1,
          timings,
          whisperText: transcriptWords[start].text,
          matchType: "cluster-merged-transcript",
        };
      }
    }
  }

  return null;
}

/** Whisper "Jack"/"Zakk" + "AI" ↔ script "rác" + "AI" */
export function tryRacAiCluster(scriptWords, i, transcriptWords, p) {
  const sw = norm(stripPunct(scriptWords[i] ?? ""));
  const sw1 = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (sw !== "rac" || sw1 !== "ai") return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if (!["jack", "zakk", "rac"].includes(t0) || t1 !== "ai") return null;
  const tw = {
    start: transcriptWords[p].start,
    end: transcriptWords[p + 1].end,
  };
  const timings = splitClusterTiming(tw, 2);
  return {
    words: [scriptWords[i], scriptWords[i + 1]],
    consumed: 2,
    transcriptEnd: p + 2,
    timings,
    whisperText: `${transcriptWords[p].text} ${transcriptWords[p + 1].text}`,
    matchType: "cluster-rac-ai",
  };
}

/** Whisper "tích" + "tóc" ↔ script "TikTok." */
export function tryTikTokCluster(scriptWords, i, transcriptWords, p) {
  const sw = norm(stripPunct(scriptWords[i] ?? ""));
  if (sw !== "tiktok") return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if (t0 !== "tich" || t1 !== "toc") return null;
  const tw = {
    start: transcriptWords[p].start,
    end: transcriptWords[p + 1].end,
  };
  return {
    words: [scriptWords[i]],
    consumed: 1,
    transcriptEnd: p + 2,
    timings: [{ start: tw.start, end: tw.end }],
    whisperText: `${transcriptWords[p].text} ${transcriptWords[p + 1].text}`,
    matchType: "cluster-tiktok",
  };
}

/** Whisper "co-view" ↔ script "câu" + "view" */
export function tryCoViewCluster(scriptWords, i, transcriptWords, p) {
  const a = norm(stripPunct(scriptWords[i] ?? ""));
  const b = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (a !== "cau" || b !== "view") return null;
  const tw = transcriptWords[p];
  if (!tw) return null;
  const tn = norm(stripPunct(tw.text));
  if (tn !== "coview" && tn !== "cauview") return null;
  const timings = splitClusterTiming(tw, 2);
  return {
    words: [scriptWords[i], scriptWords[i + 1]],
    consumed: 2,
    transcriptEnd: p + 1,
    timings,
    whisperText: tw.text,
    matchType: "cluster-co-view",
  };
}

/** Whisper "non-lớt" ↔ script "non" + "nớt" */
export function tryHyphenTranscriptCluster(scriptWords, i, transcriptWords, p) {
  const tw = transcriptWords[p];
  if (!tw) return null;
  const raw = stripPunct(tw.text);
  if (!raw.includes("-")) return null;

  const parts = raw.split("-").map((x) => norm(stripPunct(x))).filter(Boolean);
  if (parts.length < 2) return null;

  for (let k = 0; k < parts.length; k++) {
    const sw = scriptWords[i + k];
    if (!sw) return null;
    const sn = norm(stripPunct(sw));
    if (sn !== parts[k] && !tokensMatchForAlign(sw, parts[k])) return null;
  }

  const words = scriptWords.slice(i, i + parts.length);
  const timings = splitClusterTiming(tw, words.length);
  return {
    words,
    consumed: parts.length,
    transcriptEnd: p + 1,
    timings,
    whisperText: tw.text,
    matchType: "cluster-hyphen",
  };
}

function collapseDoubleChars(s) {
  return String(s).replace(/(.)\1+/g, "$1");
}

function portmanteauMatch(a, b) {
  if (a === b) return true;
  if (a.replace(/yr/g, "") === b || b.replace(/yr/g, "") === a) return true;
  if (a.replace(/ryr/g, "r") === b.replace(/ryr/g, "r")) return true;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return true;
  let dist = 0;
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) if (a[i] !== b[i]) dist++;
  dist += Math.abs(a.length - b.length);
  return 1 - dist / maxLen >= 0.82;
}

/** Script "cartoonkids" ↔ Whisper "cartoon" + "kids" */
export function tryCompoundSplit(scriptWord, transcriptWords, p, lookahead = 12) {
  const sw = norm(stripPunct(scriptWord));
  if (sw.length < 4) return null;

  const atP = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  if (atP === sw) return null;

  const matchesCombined = (combined) =>
    combined === sw ||
    collapseDoubleChars(combined) === collapseDoubleChars(sw) ||
    portmanteauMatch(combined, sw);

  for (let len = 2; len <= 4; len++) {
    if (p + len > transcriptWords.length) continue;
    const slice = transcriptWords.slice(p, p + len);
    const combined = slice.map((t) => norm(stripPunct(t.text))).join("");
    if (matchesCombined(combined)) {
      return {
        consumed: 1,
        transcriptEnd: p + len,
        timing: {
          start: slice[0].start,
          end: slice[slice.length - 1].end,
        },
        whisperText: slice.map((t) => t.text).join(" "),
      };
    }
  }

  // Tìm trong lookahead nếu pointer đã lệch (hashtag ghép: nurseryrhyme)
  for (let start = p + 1; start < Math.min(transcriptWords.length, p + lookahead); start++) {
    for (let len = 2; len <= 4; len++) {
      if (start + len > transcriptWords.length) continue;
      const slice = transcriptWords.slice(start, start + len);
      const combined = slice.map((t) => norm(stripPunct(t.text))).join("");
      if (matchesCombined(combined)) {
        return {
          consumed: 1,
          transcriptEnd: start + len,
          timing: {
            start: slice[0].start,
            end: slice[slice.length - 1].end,
          },
          whisperText: slice.map((t) => t.text).join(" "),
        };
      }
    }
  }

  return null;
}

/** "For" + "You" ↔ "4U" */
export function tryForYouCluster(scriptWords, i, transcriptWords, p) {
  const a = norm(stripPunct(scriptWords[i] ?? ""));
  const b = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (a !== "for" || b !== "you") return null;
  const tw = transcriptWords[p];
  if (!tw) return null;
  const tn = norm(stripPunct(tw.text));
  if (tn === "4u" || tn === "foryou") {
    const timings = splitClusterTiming(tw, 2);
    return {
      words: [scriptWords[i], scriptWords[i + 1]],
      consumed: 2,
      transcriptEnd: p + 1,
      timings,
      whisperText: tw.text,
    };
  }
  return null;
}

/**
 * "năm chấm sáu" ↔ Whisper "5.6" (TTS đọc số thập phân).
 */
export function tryDecimalChamCluster(scriptWords, i, transcriptWords, p, lookahead = 20) {
  const w0 = norm(stripPunct(scriptWords[i] ?? ""));
  const w1 = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (w0 !== "nam" || w1 !== "cham") return null;

  const digit = viWordNum(scriptWords[i + 2] ?? "");
  if (digit === undefined) return null;

  const expected = `5.${digit}`;

  for (let j = p; j < Math.min(transcriptWords.length, p + lookahead); j++) {
    const raw = stripPunct(transcriptWords[j]?.text ?? "").replace(/\s/g, "");
    if (raw === expected) {
      const words = scriptWords.slice(i, i + 3);
      const timings = splitClusterTiming(transcriptWords[j], words.length);
      return {
        words,
        consumed: 3,
        transcriptEnd: j + 1,
        timings,
        whisperText: transcriptWords[j].text,
        matchType: "cluster-decimal-cham",
      };
    }
  }
  return null;
}

/** "từ thừa" ↔ Whisper "tư thừa" */
export function tryTuThuaHomophone(scriptWords, i, transcriptWords, p) {
  const sw = norm(stripPunct(scriptWords[i] ?? ""));
  const sw1 = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (sw !== "tu" || !sw1.startsWith("thua")) return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if (t0 !== "tu" || !t1.startsWith("thua")) return null;
  const tw0 = transcriptWords[p];
  const tw1 = transcriptWords[p + 1];
  return {
    words: [scriptWords[i], scriptWords[i + 1]],
    consumed: 2,
    transcriptEnd: p + 2,
    timings: [
      { start: tw0.start, end: tw0.end },
      { start: tw1.start, end: tw1.end },
    ],
    whisperText: `${tw0.text} ${tw1.text}`,
    matchType: "cluster-tu-thua",
  };
}

/** "rườm rà" ↔ Whisper "rượm già" / "giềm giả" (TTS đồng âm) */
export function tryRuomRaHomophone(scriptWords, i, transcriptWords, p) {
  const a = norm(stripPunct(scriptWords[i] ?? ""));
  const b = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (a !== "ruom" || b !== "ra") return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if (!["ruom", "ruoum", "giem"].includes(t0) || !["ra", "gia"].includes(t1)) return null;
  const tw0 = transcriptWords[p];
  const tw1 = transcriptWords[p + 1];
  return {
    words: [scriptWords[i], scriptWords[i + 1]],
    consumed: 2,
    transcriptEnd: p + 2,
    timings: [
      { start: tw0.start, end: tw0.end },
      { start: tw1.start, end: tw1.end },
    ],
    whisperText: `${tw0.text} ${tw1.text}`,
    matchType: "cluster-ruom-ra",
  };
}

/** "lúc ra" ↔ Whisper "rút ra" (TTS đồng âm) */
export function tryLucRaHomophone(scriptWords, i, transcriptWords, p) {
  const a = norm(stripPunct(scriptWords[i] ?? ""));
  const b = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (a !== "luc" || b !== "ra") return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if ((t0 === "rut" || t0 === "luc") && t1 === "ra") {
    const tw = transcriptWords[p];
    return {
      words: [scriptWords[i]],
      consumed: 1,
      transcriptEnd: p + 1,
      timings: [{ start: tw.start, end: tw.end }],
      whisperText: tw.text,
      matchType: "cluster-luc-ra",
    };
  }
  return null;
}

/** Cụm phần trăm viết chữ ↔ token "57%" */
export function tryPercentCluster(scriptWords, i, transcriptWords, p, lookahead = 20) {
  const decimalParsed = parseDecimalPercentTokens(scriptWords, i);
  const parsed = decimalParsed ?? parseViPercentPhrase(scriptWords, i);
  if (!parsed) return null;

  for (let j = p; j < Math.min(transcriptWords.length, p + lookahead); j++) {
    const pt = transcriptPercentToken(transcriptWords[j]);
    if (pt && Math.abs(pt.value - parsed.value) < 0.001) {
      const words = scriptWords.slice(i, i + parsed.consumed);
      const timings = splitClusterTiming(transcriptWords[j], words.length);
      return {
        words,
        consumed: parsed.consumed,
        transcriptEnd: j + 1,
        timings,
        whisperText: transcriptWords[j].text,
        matchType: "cluster-percent",
      };
    }
  }
  return null;
}

/** "một phần ba" ↔ Whisper "1%" / "1/3" / "33%" (TTS đọc phân số) */
export function tryMotPhanBaCluster(scriptWords, i, transcriptWords, p, lookahead = 15) {
  const w0 = norm(stripPunct(scriptWords[i] ?? ""));
  const w1 = norm(stripPunct(scriptWords[i + 1] ?? ""));
  const w2 = norm(stripPunct(scriptWords[i + 2] ?? ""));
  if (w0 !== "mot" || w1 !== "phan" || w2 !== "ba") return null;

  for (let j = p; j < Math.min(transcriptWords.length, p + lookahead); j++) {
    const tw = transcriptWords[j];
    const raw = String(tw?.text ?? "").trim();
    const n = norm(stripPunct(raw));
    const pt = transcriptPercentToken(tw);
    const isThird =
      raw === "1%" ||
      raw === "1/3" ||
      n === "13" ||
      n === "33" ||
      (pt && (pt.value === 1 || pt.value === 33));
    if (isThird) {
      const words = scriptWords.slice(i, i + 3);
      const timings = splitClusterTiming(transcriptWords[j], words.length);
      return {
        words,
        consumed: 3,
        transcriptEnd: j + 1,
        timings,
        whisperText: transcriptWords[j].text,
        matchType: "cluster-mot-phan-ba",
      };
    }
  }
  return null;
}

/** "ba trên một trăm" ↔ "3" "trên" "100" */
export function tryFractionCluster(scriptWords, i, transcriptWords, p, lookahead = 15) {
  const w0 = norm(stripPunct(scriptWords[i] ?? ""));
  const w1 = norm(stripPunct(scriptWords[i + 1] ?? ""));
  const hundred = parseViHundredPhrase(scriptWords, i + 2);
  if (w1 !== "tren" || !hundred) return null;

  const numWord = viWordNum(scriptWords[i] ?? "");
  if (numWord === undefined) return null;

  for (let j = p; j < Math.min(transcriptWords.length - 2, p + lookahead); j++) {
    const d0 = transcriptDigitToken(transcriptWords[j]);
    const mid = norm(stripPunct(transcriptWords[j + 1]?.text ?? ""));
    const d1 = transcriptDigitToken(transcriptWords[j + 2]);
    if (d0 === numWord && mid === "tren" && d1 === hundred.value) {
      const words = scriptWords.slice(i, i + 2 + hundred.consumed);
      const twStart = transcriptWords[j];
      const twEnd = transcriptWords[j + 2];
      const timings = splitClusterTiming(
        { start: twStart.start, end: twEnd.end },
        words.length,
      );
      return {
        words,
        consumed: words.length,
        transcriptEnd: j + 3,
        timings,
        whisperText: `${transcriptWords[j].text} ${transcriptWords[j + 1].text} ${transcriptWords[j + 2].text}`,
        matchType: "cluster-fraction",
      };
    }
  }
  return null;
}

/** "chong chóng" ↔ Whisper "trong tróng" (TTS đồng âm) */
export function tryChongChongHomophone(scriptWords, i, transcriptWords, p) {
  const a = norm(stripPunct(scriptWords[i] ?? ""));
  const b = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (a !== "chong" || b !== "chong") return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if (t0 !== "trong" || t1 !== "trong") return null;
  const timings = [
    { start: transcriptWords[p].start, end: transcriptWords[p].end },
    { start: transcriptWords[p + 1].start, end: transcriptWords[p + 1].end },
  ];
  return {
    words: [scriptWords[i], scriptWords[i + 1]],
    consumed: 2,
    transcriptEnd: p + 2,
    timings,
    whisperText: `${transcriptWords[p].text} ${transcriptWords[p + 1].text}`,
    matchType: "cluster-homophone",
  };
}

/** "rủng rỉnh" ↔ Whisper "dùng dừng" (TTS đồng âm) */
export function tryRungRinhHomophone(scriptWords, i, transcriptWords, p) {
  const a = norm(stripPunct(scriptWords[i] ?? ""));
  const b = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (a !== "rung" || b !== "rinh") return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if (t0 !== "dung" || t1 !== "dung") return null;
  const timings = [
    { start: transcriptWords[p].start, end: transcriptWords[p].end },
    { start: transcriptWords[p + 1].start, end: transcriptWords[p + 1].end },
  ];
  return {
    words: [scriptWords[i], scriptWords[i + 1]],
    consumed: 2,
    transcriptEnd: p + 2,
    timings,
    whisperText: `${transcriptWords[p].text} ${transcriptWords[p + 1].text}`,
    matchType: "cluster-homophone",
  };
}

/** "rối ren" ↔ "rồi gian" */
export function tryRoiRenHomophone(scriptWords, i, transcriptWords, p) {
  const a = norm(stripPunct(scriptWords[i] ?? ""));
  const b = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (a !== "roi" || b !== "ren") return null;
  const t0 = norm(stripPunct(transcriptWords[p]?.text ?? ""));
  const t1 = norm(stripPunct(transcriptWords[p + 1]?.text ?? ""));
  if (t0 !== "roi" || t1 !== "gian") return null;
  const timings = [
    { start: transcriptWords[p].start, end: transcriptWords[p].end },
    { start: transcriptWords[p + 1].start, end: transcriptWords[p + 1].end },
  ];
  return {
    words: [scriptWords[i], scriptWords[i + 1]],
    consumed: 2,
    transcriptEnd: p + 2,
    timings,
    whisperText: `${transcriptWords[p].text} ${transcriptWords[p + 1].text}`,
    matchType: "cluster-homophone",
  };
}

/** "Tháng Năm" (script) ↔ Whisper "Tháng" "5" — TTS đọc tháng 5 */
export function tryThangNamPairCluster(scriptWords, i, transcriptWords, p) {
  const w0 = norm(stripPunct(scriptWords[i] ?? ""));
  const w1 = norm(stripPunct(scriptWords[i + 1] ?? ""));
  if (w0 !== "thang" || w1 !== "nam") return null;
  const tw0 = transcriptWords[p];
  const tw1 = transcriptWords[p + 1];
  if (!tw0 || !tw1) return null;
  const t0 = norm(stripPunct(tw0.text));
  const t1 = norm(stripPunct(tw1.text));
  if (t0 !== "thang" || t1 !== "5") return null;
  const words = [scriptWords[i], scriptWords[i + 1]];
  const timings = [
    { start: tw0.start, end: tw0.end },
    { start: tw1.start, end: tw1.end },
  ];
  return {
    words,
    consumed: 2,
    transcriptEnd: p + 2,
    timings,
    whisperText: `${tw0.text} ${tw1.text}`,
    matchType: "cluster-homophone",
  };
}

/** "Tháng Năm" (script) ↔ Whisper "Tháng" "5" — single token fallback */
export function tryThangMonthHomophone(scriptWords, i, transcriptWords, p) {
  const prev = i > 0 ? norm(stripPunct(scriptWords[i - 1])) : "";
  const w = norm(stripPunct(scriptWords[i] ?? ""));
  if (prev !== "thang" || w !== "nam") return null;
  const tw = transcriptWords[p];
  if (!tw) return null;
  const t = norm(stripPunct(tw.text));
  if (t !== "5") return null;
  return {
    words: [scriptWords[i]],
    consumed: 1,
    transcriptEnd: p + 1,
    timings: [{ start: tw.start, end: tw.end }],
    whisperText: tw.text,
    matchType: "cluster-homophone",
  };
}

const WHISPER_SINGLE_HOMOPHONES = {
  sa: ["xa"],
  code: ["cot"],
  chop: ["chap"],
  chi: ["tri"],
  san: ["xan"],
  mac: ["ngoc"],
  nganh: ["hanh"],
  he: ["the"],
  quo: ["cua"],
  mu: ["ngu"],
  gia: ["ra"],
  chay: ["trai"],
  dan: ["ran"],
};

/** Whisper đồng âm 1 từ phổ biến (sa/xa, code/cốt, Mặc/Ngọc, …) */
export function tryWhisperSingleHomophone(scriptWord, transcriptWords, p) {
  const sw = norm(stripPunct(scriptWord));
  const alts = WHISPER_SINGLE_HOMOPHONES[sw];
  if (!alts) return null;
  const tw = transcriptWords[p];
  if (!tw) return null;
  const t = norm(stripPunct(tw.text));
  if (!alts.includes(t)) return null;
  return {
    timing: { start: tw.start, end: tw.end },
    whisperText: tw.text,
    transcriptEnd: p + 1,
    matchType: "homophone",
  };
}

/** Bỏ qua filler Whisper thừa (Hmm, ừm, …) */
export function trySkipTranscriptFiller(transcriptWords, p) {
  const tw = transcriptWords[p];
  if (!tw) return null;
  const t = norm(stripPunct(tw.text));
  if (!["hmm", "um", "uh"].includes(t)) return null;
  return { transcriptEnd: p + 1 };
}

/** "Sale," ↔ "cell" (TTS loanword) */
export function trySaleCellHomophone(scriptWord, transcriptWords, p) {
  const sw = norm(stripPunct(scriptWord));
  if (sw !== "sale") return null;
  const tw = transcriptWords[p];
  if (!tw) return null;
  const t0 = norm(stripPunct(tw.text));
  if (t0 !== "cell") return null;
  return {
    timing: { start: tw.start, end: tw.end },
    whisperText: tw.text,
    transcriptEnd: p + 1,
    matchType: "homophone",
  };
}
