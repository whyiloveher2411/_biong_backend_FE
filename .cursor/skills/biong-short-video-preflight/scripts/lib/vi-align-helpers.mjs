/**
 * Vietnamese script ↔ Whisper alignment helpers.
 * Display text luôn từ script — chỉ hỗ trợ matching timing.
 */

const norm = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
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
  nam: 5,
  sau: 6,
  bay: 7,
  tam: 8,
  chin: 9,
  muoi: 10,
};

/** ASR / TTS thường nghe khác chữ script */
const MATCH_ALIASES = {
  jack: "rac",
  rac: "rac",
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

    if (w === "nghin") {
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
  const n = norm(stripPunct(tw.text));
  const m = n.match(/^(\d+)%?$/);
  if (!m) return null;
  return { value: parseInt(m[1], 10), hasPercent: n.includes("%") };
}

export function transcriptDigitToken(tw) {
  const n = norm(stripPunct(tw.text));
  const digitsOnly = n.replace(/\./g, "");
  if (/^\d+$/.test(digitsOnly)) return parseInt(digitsOnly, 10);
  return null;
}

/** Số đơn / cụm không có "phần trăm": năm mươi → 50, bảy → 7 */
export function parseViPlainNumber(words, start) {
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

    if (w === "nghin") {
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

export function tryPlainNumberCluster(scriptWords, i, transcriptWords, p, lookahead = 20) {
  const parsed = parseViPlainNumber(scriptWords, i);
  if (!parsed || parsed.consumed < 1) return null;

  for (let j = p; j < Math.min(transcriptWords.length, p + lookahead); j++) {
    const d = transcriptDigitToken(transcriptWords[j]);
    if (d !== null && d === parsed.value) {
      const words = scriptWords.slice(i, i + parsed.consumed);
      const timings = splitClusterTiming(transcriptWords[j], words.length);
      return {
        words,
        consumed: parsed.consumed,
        transcriptEnd: j + 1,
        timings,
        whisperText: transcriptWords[j].text,
        matchType: "cluster-number",
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
      collapseDoubleChars(combined) === collapseDoubleChars(tn)
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
        collapseDoubleChars(combined) === collapseDoubleChars(twn)
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
  return 1 - dist / maxLen >= 0.88;
}

/** Script "cartoonkids" ↔ Whisper "cartoon" + "kids" */
export function tryCompoundSplit(scriptWord, transcriptWords, p, lookahead = 12) {
  const sw = norm(stripPunct(scriptWord));
  if (sw.length < 4) return null;

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
  for (let start = p; start < Math.min(transcriptWords.length, p + lookahead); start++) {
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

/** Cụm phần trăm viết chữ ↔ token "57%" */
export function tryPercentCluster(scriptWords, i, transcriptWords, p, lookahead = 20) {
  const parsed = parseViPercentPhrase(scriptWords, i);
  if (!parsed) return null;

  for (let j = p; j < Math.min(transcriptWords.length, p + lookahead); j++) {
    const pt = transcriptPercentToken(transcriptWords[j]);
    if (pt && pt.value === parsed.value) {
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
