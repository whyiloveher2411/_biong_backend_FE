/**
 * Avatar lip-sync v2 — preprocess timeline (ortho vowel-dominant + silence + lead + smooth).
 * Mouth keys: mouth_x..g (X/A/B/C/D/E/F/G trong spec).
 */

export const DEFAULT_LIP_SYNC_CONFIG = {
  fps: 30,
  visualLeadMs: 25,
  releaseMs: 40,
  minimumCueMs: 66,
  /** Mỗi viseme token cần tối thiểu ~50ms — word quá ngắn sẽ expand/snap */
  minMsPerToken: 50,
  /** Word ngắn hơn ngưỡng này (và có chỗ trong gap) sẽ expand */
  shortWordExpandBelowMs: 180,
  /** Snap word ngắn vào cụm năng lượng gần nhất trong gap (khi caption lệch) */
  energySnapPeakThreshold: 0.18,
  /** Không dịch caption start quá xa khi energy-snap (tránh nhảy cả giây) */
  energySnapMaxShiftMs: 120,
  /** Cửa sổ local quanh caption để tìm peak (không quét full gap) */
  energySnapLocalMs: 280,
  ignoreSilenceBelowMs: 50,
  holdPreviousBelowMs: 120,
  restAboveMs: 120,
  longSilenceMs: 250,
  /** Ép mouth_x khi RMS thấp liên tục ≥ ngưỡng này (kể cả type=speech) */
  energyForceRestMs: 140,
  /** Há miệng khi RMS cao liên tục nhưng timeline đang X (caption/whisper thiếu từ) */
  energyFillSpeechMs: 90,
  energyFillPeakThreshold: 0.22,
  wideOpenEnergyThreshold: 0.65,
  maxWideOpenRatio: 0.15,
  /** Reset về X giữa 2 từ cùng mouth */
  sameMouthReset: true,
  closeStepMs: 33, // 1f @30fps — đóng nhanh
  openStepMs: 66, // 2f — mở chậm hơn đóng
  leadByMouthMs: {
    mouth_a: 30,
    mouth_f: 28,
    mouth_b: 25,
    mouth_c: 25,
    mouth_d: 25,
    mouth_e: 25,
    mouth_g: 25,
    mouth_x: 0,
  },
  blinkIntervalMinSec: 2.5,
  blinkIntervalMaxSec: 6.0,
};

/** Spec letter → mouth_* */
const VISEME = {
  X: "mouth_x",
  A: "mouth_a",
  B: "mouth_b",
  C: "mouth_c",
  D: "mouth_d",
  E: "mouth_e",
  F: "mouth_f",
  G: "mouth_g",
};

/** Nhóm 1 lớn, nhóm 2 vừa, nhóm 3 = X */
export const MOUTH_GROUP = {
  mouth_g: 1,
  mouth_b: 1,
  mouth_f: 2,
  mouth_c: 2,
  mouth_d: 2,
  mouth_e: 2,
  mouth_a: 2,
  mouth_x: 3,
};

/**
 * @param {string} mouth
 * @returns {1|2|3}
 */
export function mouthGroup(mouth) {
  return MOUTH_GROUP[mouth] || 2;
}

/**
 * Chuỗi đóng về X (không gồm mouth đang đứng).
 * G/B → F → X; nhóm 2 → X.
 * @returns {{ mouth: string, type: string, durMs: number }[]}
 */
export function closePathToX(fromMouth, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const step = cfg.closeStepMs ?? 33;
  if (!fromMouth || fromMouth === "mouth_x") return [];
  const g = mouthGroup(fromMouth);
  if (g === 1) {
    return [
      { mouth: "mouth_f", type: "close", durMs: step },
      { mouth: "mouth_x", type: "close", durMs: step },
    ];
  }
  return [{ mouth: "mouth_x", type: "close", durMs: step }];
}

/**
 * Chuỗi mở từ X tới đích (không gồm X đầu).
 * B/G → F rồi đích; nhóm 2 → đích trực tiếp (mỗi bước openStepMs).
 * @returns {{ mouth: string, type: string, durMs: number }[]}
 */
export function openPathFromX(toMouth, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const step = cfg.openStepMs ?? 66;
  if (!toMouth || toMouth === "mouth_x") return [];
  const g = mouthGroup(toMouth);
  if (g === 1) {
    return [
      { mouth: "mouth_f", type: "open", durMs: step },
      { mouth: toMouth, type: "open", durMs: step },
    ];
  }
  return [{ mouth: toMouth, type: "open", durMs: step }];
}

/**
 * Mouth đầu/cuối của một word sau tokenize (+ collapse nhẹ).
 * @param {string} text
 * @param {object} [cfg]
 */
export function wordEdgeMouths(text, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  let tokens = tokenizeOrthoVisemes(text);
  if (!tokens.length) return { first: "mouth_x", last: "mouth_x" };
  const dur = Math.max(cfg.minimumCueMs / 1000, 0.2);
  tokens = collapseTokensForDuration(tokens, dur, cfg);
  return { first: tokens[0].mouth, last: tokens[tokens.length - 1].mouth };
}

const MOUTH_DISTANCE = {
  "mouth_x-mouth_a": 1,
  "mouth_x-mouth_b": 2,
  "mouth_x-mouth_c": 2,
  "mouth_x-mouth_d": 2,
  "mouth_x-mouth_e": 2,
  "mouth_x-mouth_f": 1,
  "mouth_x-mouth_g": 3,
  "mouth_d-mouth_e": 1,
  "mouth_e-mouth_d": 1,
  "mouth_b-mouth_g": 1,
  "mouth_g-mouth_b": 1,
  "mouth_b-mouth_c": 2,
  "mouth_c-mouth_b": 2,
  "mouth_e-mouth_g": 3,
  "mouth_g-mouth_e": 3,
  "mouth_a-mouth_g": 3,
  "mouth_f-mouth_g": 3,
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function round3(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

/**
 * @param {string} raw
 */
export function normalizeWordText(raw) {
  return String(raw || "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

/**
 * Strip Vietnamese tone marks but keep base letters (ă→a via NFD? Actually ă is a+breve).
 * For mapping we want: ăâ→a family, ê→e, ôơ→o, ư→u.
 */
export function stripTones(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/**
 * Tokenize Vietnamese orthography into viseme tokens (vowel-dominant).
 * Returns list of { letter, mouth, weight }.
 * @param {string} word
 */
export function tokenizeOrthoVisemes(word) {
  const w = normalizeWordText(word);
  if (!w) return [];
  const s = w; // keep NFC for digraphs like ph; map with strip per char
  const out = [];
  let i = 0;
  while (i < s.length) {
    // digraphs first
    const two = s.slice(i, i + 2);
    const twoBase = stripTones(two);
    if (twoBase === "ph" || two === "ph") {
      out.push({ letter: "ph", mouth: VISEME.F, weight: 1 });
      i += 2;
      continue;
    }
    if (twoBase === "ch" || twoBase === "tr" || twoBase === "nh" || twoBase === "ng" || twoBase === "gh" || twoBase === "kh" || twoBase === "th") {
      // no own mouth — skip (vowel-dominant)
      i += 2;
      continue;
    }

    const ch = s[i];
    const base = stripTones(ch);
    i += 1;

    if (!base || /[0-9]/.test(base)) continue;

    if (base === "m" || base === "b" || base === "p") {
      out.push({ letter: base, mouth: VISEME.A, weight: 1 });
      continue;
    }
    if (base === "f" || base === "v") {
      out.push({ letter: base, mouth: VISEME.F, weight: 1 });
      continue;
    }
    // vowels (after tone strip: ăâ→a, ê→e, ôơ→o, ư→u)
    if (base === "a") {
      out.push({ letter: "a", mouth: VISEME.B, weight: 2.2 });
      continue;
    }
    if (base === "e" || base === "i" || base === "y") {
      out.push({ letter: base, mouth: VISEME.C, weight: 2 });
      continue;
    }
    if (base === "o") {
      out.push({ letter: "o", mouth: VISEME.D, weight: 2 });
      continue;
    }
    if (base === "u") {
      out.push({ letter: "u", mouth: VISEME.E, weight: 2 });
      continue;
    }
    // other consonants — skip
  }

  // If only skipped consonants, fallback rest then open
  if (!out.length && w.length) {
    out.push({ letter: "?", mouth: VISEME.B, weight: 2 });
  }
  return out;
}

/**
 * @deprecated Prefer tokenizeOrthoVisemes — kept for legacy tests
 */
export function mouthKeyForWord(word) {
  const tokens = tokenizeOrthoVisemes(word);
  if (!tokens.length) return "mouth_x";
  // Prefer first labial/fricative then first vowel
  const labial = tokens.find((t) => t.mouth === VISEME.A || t.mouth === VISEME.F);
  if (labial) return labial.mouth;
  const vowel = tokens.find((t) =>
    [VISEME.B, VISEME.C, VISEME.D, VISEME.E, VISEME.G].includes(t.mouth),
  );
  return vowel?.mouth || tokens[0].mouth;
}

/**
 * @param {object} w
 */
function normalizeTimedWord(w) {
  if (!w || typeof w !== "object") return null;
  const text = String(w.word ?? w.text ?? "").trim();
  const start = Number(w.start ?? w.startSec);
  const end = Number(w.end ?? w.endSec);
  if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return null;
  }
  return { start, end, text };
}

export function normalizeTimedWords(words) {
  if (!Array.isArray(words)) return [];
  const out = [];
  for (const w of words) {
    const n = normalizeTimedWord(w);
    if (n) out.push(n);
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

/**
 * Tìm cửa sổ quanh peak năng lượng trong [lo, hi].
 * Ưu tiên gần preferredMid khi có nhiều peak tương đương.
 * @param {(t:number)=>number} energyAt
 * @returns {{ start: number, end: number, score: number, peak: number, mean: number } | null}
 */
export function findBestEnergyWindow(energyAt, lo, hi, targetDur, preferredMid = null) {
  if (typeof energyAt !== "function" || !(hi > lo) || !(targetDur > 0)) return null;
  const span = hi - lo;
  if (span < 0.06) return null;
  const step = 0.02;
  // 1) Thu thập local peaks
  const peaks = [];
  let prev = energyAt(lo);
  let cur = energyAt(lo + step);
  for (let t = lo + step; t <= hi - step + 1e-9; t += step) {
    const next = energyAt(t + step);
    if (cur >= prev && cur >= next && cur > 0.05) {
      peaks.push({ t, e: cur });
    }
    prev = cur;
    cur = next;
  }
  if (!peaks.length) {
    // fallback: max sample
    let maxT = lo;
    let maxE = 0;
    for (let t = lo; t <= hi; t += step) {
      const e = energyAt(t);
      if (e > maxE) {
        maxE = e;
        maxT = t;
      }
    }
    if (maxE > 0.05) peaks.push({ t: maxT, e: maxE });
  }
  if (!peaks.length) return null;

  // 2) Với mỗi peak: expand tới targetDur (hoặc hết vùng trên half-peak)
  let best = null;
  const dur = Math.min(targetDur, span);
  for (const p of peaks) {
    const half = Math.max(0.08, p.e * 0.4);
    let left = p.t;
    let right = p.t;
    while (left - step >= lo && energyAt(left - step) >= half && p.t - (left - step) < dur) {
      left -= step;
    }
    while (right + step <= hi && energyAt(right + step) >= half && right + step - p.t < dur) {
      right += step;
    }
    // pad to at least min(dur, available) centered on peak
    let start = left;
    let end = right;
    const have = end - start;
    if (have < dur) {
      const need = dur - have;
      const takeL = Math.min(need / 2, start - lo);
      const takeR = Math.min(need - takeL, hi - end);
      start -= takeL;
      end += takeR;
      // nếu còn thiếu, lấy thêm phía kia
      const still = dur - (end - start);
      if (still > 0.001) {
        if (start - lo >= still) start -= still;
        else if (hi - end >= still) end += still;
      }
    }
    start = Math.max(lo, start);
    end = Math.min(hi, end);
    if (end - start < 0.06) continue;

    let sum = 0;
    let n = 0;
    let peak = 0;
    for (let t = start; t <= end; t += step) {
      const v = energyAt(t);
      sum += v;
      n += 1;
      if (v > peak) peak = v;
    }
    const mean = n ? sum / n : 0;
    let score = mean * 0.35 + peak * 0.65;
    if (preferredMid != null && Number.isFinite(preferredMid)) {
      const mid = (start + end) / 2;
      score -= Math.min(0.4, Math.abs(mid - preferredMid) * 0.15);
    }
    if (!best || score > best.score) {
      best = { start, end, score, peak, mean };
    }
  }
  return best;
}

/**
 * Expand / energy-snap các word quá ngắn (caption lệch — vd OpenCut chỉ 100ms).
 * Không đè word khác; chỉ lấy chỗ trong gap.
 * Energy: lấy peak sớm nhất còn trống trong gap (tránh nhảy sang cụm sau).
 *
 * @param {{start:number,end:number,text:string}[]} words
 * @param {object} [cfg]
 * @param {(t:number)=>number} [energyAt]
 * @param {number} [totalSec]
 */
export function expandShortWords(words, cfg = DEFAULT_LIP_SYNC_CONFIG, energyAt = null, totalSec = 0) {
  if (!words.length) return [];
  const out = words.map((w) => ({ ...w }));
  const minToken = (cfg.minMsPerToken ?? 50) / 1000;
  const shortBelow = (cfg.shortWordExpandBelowMs ?? 180) / 1000;
  const peakTh = cfg.energySnapPeakThreshold ?? 0.18;
  const maxShift = (cfg.energySnapMaxShiftMs ?? 120) / 1000;
  const localRad = (cfg.energySnapLocalMs ?? 280) / 1000;
  const total = totalSec > 0 ? totalSec : Math.max(...out.map((w) => w.end), 0.1);

  for (let i = 0; i < out.length; i += 1) {
    const w = out[i];
    const origStart = w.start;
    const origEnd = w.end;
    const tokens = tokenizeOrthoVisemes(w.text);
    const need = Math.max(
      shortBelow,
      Math.min(0.55, Math.max(cfg.minimumCueMs / 1000, tokens.length * minToken)),
    );
    const dur = w.end - w.start;
    if (dur >= need - 0.001) continue;

    const prevEnd = i > 0 ? out[i - 1].end : 0;
    const nextStart = i + 1 < out.length ? out[i + 1].start : total;
    const room = nextStart - prevEnd;
    if (room < cfg.minimumCueMs / 1000) continue;

    const target = Math.min(need, room * 0.95);
    const mid = (w.start + w.end) / 2;

    // 1) Energy snap — chỉ trong cửa sổ local quanh caption (±localRad, clamp maxShift)
    let placed = false;
    if (typeof energyAt === "function") {
      const midE = energyAt(mid);
      if (midE < peakTh * 0.7 || dur < shortBelow) {
        const gapLo = prevEnd + 0.02;
        const gapHi = nextStart - 0.02;
        const snapLo = Math.max(gapLo, origStart - Math.min(localRad, maxShift));
        const snapHi = Math.min(gapHi, origEnd + Math.min(localRad, maxShift));
        if (snapHi > snapLo + 0.06) {
          const step = 0.02;
          let bestT = null;
          let bestE = 0;
          let bestDist = Infinity;
          for (let t = snapLo; t <= snapHi; t += step) {
            const e = energyAt(t);
            if (e < peakTh) continue;
            const dist = Math.abs(t - mid);
            // Ưu tiên peak mạnh; tie-break gần caption mid
            if (e > bestE + 0.04 || (Math.abs(e - bestE) <= 0.04 && dist < bestDist)) {
              bestE = e;
              bestT = t;
              bestDist = dist;
            }
          }
          if (bestT != null && bestE >= peakTh) {
            const half = target / 2;
            let start = bestT - half * 0.35;
            let end = start + target;
            if (start < gapLo) {
              start = gapLo;
              end = Math.min(gapHi, start + target);
            }
            if (end > gapHi) {
              end = gapHi;
              start = Math.max(gapLo, end - target);
            }
            // Hard cap: không lệch origStart quá maxShift
            if (Math.abs(start - origStart) > maxShift) {
              start = origStart + Math.sign(start - origStart) * maxShift;
              end = Math.min(gapHi, Math.max(start + target * 0.5, start + (origEnd - origStart)));
              end = Math.min(gapHi, Math.max(end, start + Math.min(target, gapHi - start)));
            }
            w.start = round3(start);
            w.end = round3(Math.max(w.start + cfg.minimumCueMs / 1000, end));
            placed = true;
          }
        }
      }
    }

    // 2) Expand đối xứng trong gap (cũng không vượt maxShift khỏi orig)
    if (!placed) {
      const deficit = target - (w.end - w.start);
      if (deficit > 0.001) {
        const leftRoom = Math.max(0, Math.min(w.start - prevEnd, origStart + maxShift - (w.start - deficit)));
        const rightRoom = Math.max(0, nextStart - w.end);
        let takeL = Math.min(Math.max(0, w.start - prevEnd), deficit / 2, maxShift);
        let takeR = Math.min(rightRoom, deficit - takeL);
        if (takeL + takeR < deficit - 0.001) {
          const rem = deficit - takeL - takeR;
          takeL += Math.min(Math.max(0, w.start - prevEnd) - takeL, rem, maxShift - takeL);
          takeR += Math.min(rightRoom - takeR, rem);
        }
        w.start = round3(Math.max(prevEnd, w.start - takeL));
        w.end = round3(Math.min(nextStart, w.end + takeR));
        if (w.start < origStart - maxShift) w.start = round3(origStart - maxShift);
        if (w.end < w.start + cfg.minimumCueMs / 1000) {
          w.end = round3(Math.min(nextStart, w.start + Math.max(cfg.minimumCueMs / 1000, origEnd - origStart)));
        }
      }
    }
  }
  return out;
}

/**
 * Rút gọn token khi word vẫn quá ngắn để chia nhiều viseme.
 */
function collapseTokensForDuration(tokens, durSec, cfg) {
  const min = (cfg.minimumCueMs || 66) / 1000;
  if (!tokens.length) return tokens;
  if (durSec >= tokens.length * min * 0.85) return tokens;
  // Giữ labial/fricative đầu + nguyên âm chính
  const labial = tokens.find((t) => t.mouth === "mouth_a" || t.mouth === "mouth_f");
  const vowels = tokens.filter((t) =>
    ["mouth_b", "mouth_c", "mouth_d", "mouth_e", "mouth_g"].includes(t.mouth),
  );
  if (durSec < min * 1.5) {
    const one = labial || vowels[0] || tokens[0];
    return [{ ...one, weight: 2 }];
  }
  const out = [];
  if (labial) out.push(labial);
  if (vowels.length) {
    // lấy vowel có weight cao nhất / đầu
    out.push(vowels.reduce((a, b) => (b.weight >= a.weight ? b : a)));
  }
  if (!out.length) out.push(tokens[0]);
  // unique mouths giữ thứ tự
  const seen = new Set();
  return out.filter((t) => {
    if (seen.has(t.mouth)) return false;
    seen.add(t.mouth);
    return true;
  });
}

/**
 * Expand words into raw mouth cues (no silence yet).
 * @param {{start:number,end:number,text:string}[]} words
 * @param {object} [cfg]
 */
export function wordsToOrthoCues(words, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const cues = [];
  for (const word of words) {
    let tokens = tokenizeOrthoVisemes(word.text);
    if (!tokens.length) continue;
    const dur = word.end - word.start;
    tokens = collapseTokensForDuration(tokens, dur, cfg);
    const totalW = tokens.reduce((s, t) => s + t.weight, 0) || 1;
    let t0 = word.start;
    for (const tok of tokens) {
      const slice = (dur * tok.weight) / totalW;
      const t1 = t0 + slice;
      cues.push({
        start: round3(t0),
        end: round3(t1),
        mouth: tok.mouth,
        type: "speech",
      });
      t0 = t1;
    }
    // snap last end to word.end
    if (cues.length) {
      cues[cues.length - 1].end = round3(word.end);
    }
  }
  return cues;
}

/**
 * Insert silence handling between speech cues / words.
 * @param {{start:number,end:number,mouth:string,type?:string}[]} speechCues
 * @param {object} cfg
 */
export function insertSilenceCues(speechCues, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  if (!speechCues.length) return [{ start: 0, end: 0, mouth: "mouth_x", type: "silence" }];
  const sorted = [...speechCues].sort((a, b) => a.start - b.start);
  const out = [];
  const ignore = cfg.ignoreSilenceBelowMs / 1000;
  const hold = cfg.holdPreviousBelowMs / 1000;
  const rest = cfg.restAboveMs / 1000;

  // leading silence
  if (sorted[0].start > ignore) {
    const gap = sorted[0].start;
    if (gap >= rest) {
      out.push({ start: 0, end: round3(sorted[0].start), mouth: "mouth_x", type: "silence" });
    } else if (gap >= ignore) {
      // short — hold will use next mouth half; mark as short hold toward first
      out.push({
        start: 0,
        end: round3(sorted[0].start),
        mouth: sorted[0].mouth,
        type: "short_pause",
      });
    }
  }

  for (let i = 0; i < sorted.length; i += 1) {
    out.push({ ...sorted[i], type: sorted[i].type || "speech" });
    const next = sorted[i + 1];
    if (!next) continue;
    const gapStart = sorted[i].end;
    const gapEnd = next.start;
    const gap = gapEnd - gapStart;
    if (gap <= ignore) {
      // stitch: extend current to next.start
      out[out.length - 1].end = round3(next.start);
      continue;
    }
    if (gap < hold) {
      const mid = gapStart + gap / 2;
      out.push({
        start: round3(gapStart),
        end: round3(mid),
        mouth: sorted[i].mouth,
        type: "short_pause",
      });
      out.push({
        start: round3(mid),
        end: round3(gapEnd),
        mouth: next.mouth,
        type: "short_pause",
      });
      continue;
    }
    // clear rest
    out.push({
      start: round3(gapStart),
      end: round3(gapEnd),
      mouth: "mouth_x",
      type: gap >= cfg.longSilenceMs / 1000 ? "long_silence" : "silence",
    });
  }

  return mergeAdjacentSameMouth(out);
}

export function mergeAdjacentSameMouth(cues) {
  if (!cues.length) return [];
  const out = [];
  for (const c of cues) {
    const prev = out[out.length - 1];
    const abut = prev && prev.mouth === c.mouth && Math.abs(prev.end - c.start) < 0.001;
    const eitherClose = prev?.type === "close" || c.type === "close";
    if (abut && !eitherClose) {
      prev.end = c.end;
      if (c.type === "speech" || prev.type === "speech") prev.type = "speech";
      else if (c.type === "open") prev.type = prev.type || "open";
    } else {
      out.push({ ...c });
    }
  }
  return out;
}

/**
 * Cắt cửa sổ [winStart, winEnd] khỏi timeline rồi chèn chain.
 * @param {object[]} cues
 * @param {number} winStart
 * @param {number} winEnd
 * @param {object[]} chain — {start,end,mouth,type}
 */
function spliceCueWindow(cues, winStart, winEnd, chain) {
  const out = [];
  for (const c of cues) {
    if (c.end <= winStart + 1e-6 || c.start >= winEnd - 1e-6) {
      out.push({ ...c });
      continue;
    }
    // phần trước window
    if (c.start < winStart - 1e-6) {
      out.push({ ...c, end: round3(Math.min(c.end, winStart)) });
    }
    // phần sau window
    if (c.end > winEnd + 1e-6) {
      out.push({ ...c, start: round3(Math.max(c.start, winEnd)) });
    }
  }
  for (const step of chain) {
    if (step.end > step.start + 1e-4) out.push({ ...step });
  }
  out.sort((a, b) => a.start - b.start || a.end - b.end);
  return out.filter((c) => c.end > c.start + 1e-4);
}

/**
 * Chèn đóng→X→mở giữa 2 từ cùng mouth (không có silence ≥ rest sẵn).
 * @param {object[]} cues
 * @param {{start:number,end:number,text:string}[]} words
 * @param {object} [cfg]
 */
export function insertSameMouthResetTransitions(cues, words, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  if (cfg.sameMouthReset === false || !words?.length || !cues?.length) {
    return cues.map((c) => ({ ...c }));
  }
  const closeStep = (cfg.closeStepMs ?? 33) / 1000;
  const openStep = (cfg.openStepMs ?? 66) / 1000;
  const rest = (cfg.restAboveMs ?? 120) / 1000;
  let out = cues.map((c) => ({ ...c }));

  for (let i = 0; i < words.length - 1; i += 1) {
    const wA = words[i];
    const wB = words[i + 1];
    const mouthA = wordEdgeMouths(wA.text, cfg).last;
    const mouthB = wordEdgeMouths(wB.text, cfg).first;
    if (!mouthA || !mouthB || mouthA === "mouth_x" || mouthB === "mouth_x") continue;
    if (mouthA !== mouthB) continue;

    const gapStart = wA.end;
    const gapEnd = wB.start;
    const midLo = Math.min(gapStart, gapEnd);
    const midHi = Math.max(gapStart, gapEnd);
    const gap = midHi - midLo;

    const xCover = out
      .filter((c) => c.mouth === "mouth_x" && c.end > midLo - 0.01 && c.start < midHi + 0.01)
      .reduce((s, c) => {
        const a = Math.max(c.start, midLo);
        const b = Math.min(c.end, midHi);
        return s + Math.max(0, b - a);
      }, 0);
    if (gap >= rest - 0.001 && xCover >= rest - 0.02) continue;

    const closeSteps = closePathToX(mouthA, cfg);
    const openSteps = openPathFromX(mouthB, cfg);
    const closeDur = closeSteps.reduce((s, st) => s + st.durMs / 1000, 0);
    const openDur = openSteps.reduce((s, st) => s + st.durMs / 1000, 0);
    const need = closeDur + openDur;
    if (need < 0.03) continue;

    let winEnd = gapEnd > gapStart ? gapEnd : wB.start;
    let winStart = winEnd - need;
    const minStart = wA.start + Math.min(0.08, (wA.end - wA.start) * 0.35);
    const maxEnd = wB.end - Math.min(0.08, (wB.end - wB.start) * 0.35);
    if (winStart < minStart) {
      winStart = minStart;
      winEnd = winStart + need;
    }
    if (winEnd > maxEnd) {
      winEnd = maxEnd;
      winStart = winEnd - need;
    }
    if (winStart < minStart - 0.001 || winEnd > maxEnd + 0.001) continue;
    if (winEnd - winStart < need - 0.015) continue;
    if (winStart - wA.start < closeStep * 0.5 || wB.end - winEnd < openStep * 0.5) continue;

    const chain = [];
    let t = winStart;
    for (const st of [...closeSteps, ...openSteps]) {
      const d = st.durMs / 1000;
      chain.push({
        start: round3(t),
        end: round3(t + d),
        mouth: st.mouth,
        type: st.type,
      });
      t += d;
    }
    if (chain.length) chain[chain.length - 1].end = round3(winEnd);

    out = spliceCueWindow(out, winStart, winEnd, chain);
  }

  return mergeAdjacentSameMouth(out);
}

/**
 * Apply visual lead (shift starts earlier).
 */
export function applyVisualLead(cues, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  if (!cues.length) return [];
  const out = cues.map((c) => ({ ...c }));
  for (let i = 0; i < out.length; i += 1) {
    const leadMs = cfg.leadByMouthMs?.[out[i].mouth] ?? cfg.visualLeadMs;
    if (!leadMs || out[i].mouth === "mouth_x") continue;
    // Không lead cue đóng/mở reset — tránh nuốt X / gộp F
    if (out[i].type === "close" || out[i].type === "open") continue;
    const lead = leadMs / 1000;
    const prevEnd = i > 0 ? out[i - 1].end : 0;
    const newStart = Math.max(prevEnd, out[i].start - lead);
    // shrink previous if needed
    if (i > 0 && out[i - 1].end > newStart) {
      out[i - 1].end = round3(newStart);
      if (out[i - 1].end <= out[i - 1].start) {
        out[i - 1].end = out[i - 1].start;
      }
    }
    out[i].start = round3(newStart);
  }
  return mergeAdjacentSameMouth(out.filter((c) => c.end > c.start + 0.001));
}

/**
 * Drop/merge cues shorter than minimum.
 * Speech không bao giờ bị nuốt vào mouth_x — expand vào silence thay vì merge.
 */
export function enforceMinDuration(cues, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const min = cfg.minimumCueMs / 1000;
  if (!cues.length) return [];
  let out = cues.map((c) => ({ ...c }));
  let i = 0;
  while (i < out.length) {
    const c = out[i];
    const dur = c.end - c.start;
    // close/open: giữ nếu ≥ ~1 frame; không nuốt vào speech
    if (c.type === "close" || c.type === "open") {
      const floor = Math.min(min, ((cfg.closeStepMs ?? 33) / 1000) * 0.85);
      if (dur >= floor || out.length === 1) {
        i += 1;
        continue;
      }
      // quá ngắn — merge vào neighbor cùng type hoặc bỏ bằng cách kéo neighbor
      const prev = out[i - 1];
      const next = out[i + 1];
      if (prev && (prev.type === "close" || prev.type === "open") && prev.mouth === c.mouth) {
        prev.end = c.end;
        out.splice(i, 1);
        continue;
      }
      if (next && (next.type === "close" || next.type === "open")) {
        next.start = c.start;
        out.splice(i, 1);
        continue;
      }
      i += 1;
      continue;
    }
    if (dur >= min || out.length === 1) {
      i += 1;
      continue;
    }
    const prev = out[i - 1];
    const next = out[i + 1];
    const isSpeech = c.mouth !== "mouth_x" && c.type !== "silence" && c.type !== "long_silence";

    // Speech ngắn: ưu tiên mở rộng vào neighbor X, không merge speech→X
    if (isSpeech) {
      const need = min - dur;
      let grew = false;
      if (prev && prev.mouth === "mouth_x") {
        const take = Math.min(need, prev.end - prev.start - 0.001);
        if (take > 0.001) {
          prev.end = round3(prev.end - take);
          c.start = round3(c.start - take);
          grew = true;
        }
      }
      const still = min - (c.end - c.start);
      if (still > 0.001 && next && next.mouth === "mouth_x") {
        const take = Math.min(still, next.end - next.start - 0.001);
        if (take > 0.001) {
          next.start = round3(next.start + take);
          c.end = round3(c.end + take);
          grew = true;
        }
      }
      if (c.end - c.start >= min - 0.001) {
        if (prev && prev.end <= prev.start + 0.001) out.splice(i - 1, 1);
        else if (next && next.end <= next.start + 0.001) out.splice(i + 1, 1);
        else i += 1;
        continue;
      }
      // vẫn ngắn: merge vào speech neighbor (không phải X)
      if (prev && prev.mouth !== "mouth_x" && next && next.mouth !== "mouth_x") {
        const prevDur = prev.end - prev.start;
        const nextDur = next.end - next.start;
        if (prevDur >= nextDur) {
          prev.end = c.end;
          out.splice(i, 1);
        } else {
          next.start = c.start;
          out.splice(i, 1);
        }
        continue;
      }
      if (prev && prev.mouth !== "mouth_x") {
        prev.end = c.end;
        out.splice(i, 1);
        continue;
      }
      if (next && next.mouth !== "mouth_x") {
        next.start = c.start;
        out.splice(i, 1);
        continue;
      }
      if (grew) {
        i += 1;
        continue;
      }
    }

    if (prev && next) {
      const preferPrev =
        (prev.mouth !== "mouth_x" && next.mouth === "mouth_x") ||
        (next.mouth === "mouth_x"
          ? true
          : prev.end - prev.start >= next.end - next.start);
      if (preferPrev) {
        prev.end = c.end;
        out.splice(i, 1);
      } else {
        next.start = c.start;
        out.splice(i, 1);
      }
    } else if (prev) {
      prev.end = c.end;
      out.splice(i, 1);
    } else if (next) {
      next.start = c.start;
      out.splice(i, 1);
    } else {
      i += 1;
    }
  }
  return mergeAdjacentSameMouth(out.filter((c) => c.end > c.start + 0.0005));
}

/**
 * Release: after last speech before long silence / end, hold then X.
 */
export function applyRelease(cues, totalSec, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const release = cfg.releaseMs / 1000;
  if (!cues.length) {
    return [{ start: 0, end: round3(totalSec), mouth: "mouth_x", type: "silence" }];
  }
  let out = cues.map((c) => ({ ...c }));
  // Ensure coverage to totalSec
  const last = out[out.length - 1];
  if (last.end < totalSec - 0.001) {
    if (last.mouth !== "mouth_x") {
      const holdEnd = Math.min(totalSec, last.end + release);
      if (holdEnd > last.end) {
        // extend last slightly then X
        last.end = round3(holdEnd);
      }
      if (holdEnd < totalSec) {
        out.push({
          start: round3(holdEnd),
          end: round3(totalSec),
          mouth: "mouth_x",
          type: "silence",
        });
      }
    } else {
      last.end = round3(totalSec);
    }
  }
  // For speech→silence transitions: if silence starts immediately after open mouth, add tiny hold
  const rebuilt = [];
  for (let i = 0; i < out.length; i += 1) {
    const c = out[i];
    const next = out[i + 1];
    rebuilt.push(c);
    if (
      next
      && c.mouth !== "mouth_x"
      && c.mouth !== "mouth_a"
      && next.mouth === "mouth_x"
      && next.start - c.end < 0.001
      && c.type !== "close"
      && c.type !== "open"
      && next.type !== "close"
      && next.type !== "open"
    ) {
      const holdEnd = Math.min(next.end, c.end + release);
      if (holdEnd > c.end + 0.01) {
        c.end = round3(holdEnd);
        next.start = round3(holdEnd);
      }
    }
  }
  return mergeAdjacentSameMouth(rebuilt.filter((c) => c.end > c.start + 0.0005));
}

function mouthDistance(a, b) {
  if (a === b) return 0;
  const k1 = `${a}-${b}`;
  const k2 = `${b}-${a}`;
  return MOUTH_DISTANCE[k1] ?? MOUTH_DISTANCE[k2] ?? 2;
}

function intermediateMouth(a, b) {
  // E→G via D; X→G via B
  if ((a === "mouth_e" && b === "mouth_g") || (a === "mouth_g" && b === "mouth_e")) {
    return "mouth_d";
  }
  if ((a === "mouth_x" && b === "mouth_g") || (a === "mouth_g" && b === "mouth_x")) {
    return "mouth_b";
  }
  if ((a === "mouth_a" && b === "mouth_g") || (a === "mouth_g" && b === "mouth_a")) {
    return "mouth_b";
  }
  return null;
}

/**
 * Insert one intermediate when distance high and enough time.
 */
export function applyCoarticulation(cues, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const minDur = 0.1;
  const out = [];
  for (let i = 0; i < cues.length; i += 1) {
    const c = cues[i];
    const next = cues[i + 1];
    out.push({ ...c });
    if (!next) continue;
    if (c.type === "close" || c.type === "open" || next.type === "close" || next.type === "open") {
      continue;
    }
    const dist = mouthDistance(c.mouth, next.mouth);
    const span = next.start - c.end;
    // look at junction — if abutting and distance high, steal from next
    if (dist < 3) continue;
    const mid = intermediateMouth(c.mouth, next.mouth);
    if (!mid) continue;
    const avail = next.end - next.start;
    if (avail < minDur + cfg.minimumCueMs / 1000) continue;
    const insertDur = Math.min(0.05, avail / 3);
    const insertStart = next.start;
    const insertEnd = next.start + insertDur;
    out.push({
      start: round3(insertStart),
      end: round3(insertEnd),
      mouth: mid,
      type: "coart",
    });
    next.start = round3(insertEnd);
  }
  return mergeAdjacentSameMouth(out);
}

/**
 * Chỉ tinh chỉnh GAP (short_pause), không đụng speech.
 * Plan: gap word ngắn nhưng RMS thấp kéo dài → nâng lên long silence.
 * Cấm wipe type=speech — TTS/whisper lệch nhẹ khiến midpoint “low energy”
 * và trước đây đã xóa ~50% khẩu hình (lệch pha giữa clip).
 *
 * @param {(t:number)=>number} energyAt
 * @param {(t:number)=>boolean} [isLowEnergy]
 */
export function refineSilenceWithEnergy(cues, energyAt, isLowEnergy, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  if (typeof energyAt !== "function" && typeof isLowEnergy !== "function") {
    return cues.map((c) => ({ ...c }));
  }
  const rest = cfg.restAboveMs / 1000;
  const out = cues.map((c) => ({ ...c }));
  for (const c of out) {
    if (c.mouth === "mouth_x") continue;
    // Chỉ short_pause / hold-across-gap — không bao giờ speech
    if (c.type !== "short_pause") continue;
    const dur = c.end - c.start;
    if (dur < rest) continue;
    const samples = [0.25, 0.5, 0.75].map((p) => c.start + dur * p);
    let low = 0;
    for (const t of samples) {
      if (typeof isLowEnergy === "function") {
        if (isLowEnergy(t)) low += 1;
      } else if (energyAt(t) < 0.12) {
        low += 1;
      }
    }
    if (low >= 2) {
      c.mouth = "mouth_x";
      c.type = dur >= cfg.longSilenceMs / 1000 ? "long_silence" : "silence";
    }
  }
  return mergeAdjacentSameMouth(out);
}

/**
 * Ép mouth_x trên mọi cửa sổ RMS thấp kéo dài — kể cả type=speech.
 * Whisper/caption thường kéo end vào đoạn im → miệng há khi không có tiếng (lệch pha).
 * Không đụng burst ngắn (< energyForceRestMs) để tránh flicker plosive.
 *
 * @param {object[]} cues
 * @param {(t:number)=>boolean} [isLowEnergy]
 * @param {(t:number)=>number} [energyAt]
 * @param {object} [cfg]
 */
export function forceRestFromEnergy(cues, isLowEnergy, energyAt, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  if (!cues?.length) return [];
  if (typeof isLowEnergy !== "function" && typeof energyAt !== "function") {
    return cues.map((c) => ({ ...c }));
  }
  const lowFn = (t) => {
    if (typeof isLowEnergy === "function") return isLowEnergy(t);
    return energyAt(t) < 0.12;
  };
  const minRest = (cfg.energyForceRestMs ?? cfg.restAboveMs ?? 140) / 1000;
  const step = 0.02;
  const total = Math.max(...cues.map((c) => c.end), 0);
  const windows = [];
  let runStart = null;
  for (let t = 0; t <= total + 1e-6; t += step) {
    const low = t <= total ? lowFn(t) : false;
    if (low) {
      if (runStart == null) runStart = t;
    } else if (runStart != null) {
      const end = Math.min(total, t);
      if (end - runStart >= minRest - 1e-6) {
        windows.push([round3(runStart), round3(end)]);
      }
      runStart = null;
    }
  }
  if (runStart != null && total - runStart >= minRest - 1e-6) {
    windows.push([round3(runStart), round3(total)]);
  }
  if (!windows.length) return cues.map((c) => ({ ...c }));

  let out = cues.map((c) => ({ ...c }));
  for (const [lo, hi] of windows) {
    // Chừa mép ~30ms — tránh cắt sát onset/offset âm thanh
    const pad = 0.03;
    const winStart = lo + pad;
    const winEnd = hi - pad;
    if (winEnd - winStart < minRest * 0.55) continue;
    out = spliceCueWindow(out, winStart, winEnd, [
      {
        start: round3(winStart),
        end: round3(winEnd),
        mouth: "mouth_x",
        type: winEnd - winStart >= (cfg.longSilenceMs ?? 250) / 1000
          ? "long_silence"
          : "silence",
      },
    ]);
  }
  return mergeAdjacentSameMouth(out);
}

/**
 * Há miệng khi RMS cao kéo dài nhưng cue đang mouth_x (caption/whisper thiếu từ).
 * Chèn mouth_b (nguyên âm trung tính) — không đoán ortho từ text.
 *
 * @param {object[]} cues
 * @param {(t:number)=>number} energyAt
 * @param {(t:number)=>boolean} [isLowEnergy]
 * @param {object} [cfg]
 */
export function fillSpeechFromEnergy(cues, energyAt, isLowEnergy, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  if (!cues?.length || typeof energyAt !== "function") {
    return cues.map((c) => ({ ...c }));
  }
  const minFill = (cfg.energyFillSpeechMs ?? 90) / 1000;
  const peakTh = cfg.energyFillPeakThreshold ?? 0.22;
  const step = 0.02;
  const total = Math.max(...cues.map((c) => c.end), 0);
  const isHigh = (t) => {
    if (typeof isLowEnergy === "function" && isLowEnergy(t)) return false;
    return energyAt(t) >= peakTh;
  };

  const windows = [];
  let runStart = null;
  for (let t = 0; t <= total + 1e-6; t += step) {
    const high = t <= total ? isHigh(t) : false;
    if (high) {
      if (runStart == null) runStart = t;
    } else if (runStart != null) {
      const end = Math.min(total, t);
      if (end - runStart >= minFill - 1e-6) {
        windows.push([round3(runStart), round3(end)]);
      }
      runStart = null;
    }
  }
  if (runStart != null && total - runStart >= minFill - 1e-6) {
    windows.push([round3(runStart), round3(total)]);
  }
  if (!windows.length) return cues.map((c) => ({ ...c }));

  let out = cues.map((c) => ({ ...c }));
  for (const [lo, hi] of windows) {
    // Chỉ fill đoạn đang X — không đè speech/ortho đã có
    const xCoverage = out
      .filter((c) => c.mouth === "mouth_x" && c.end > lo && c.start < hi)
      .reduce((s, c) => {
        const a = Math.max(c.start, lo);
        const b = Math.min(c.end, hi);
        return s + Math.max(0, b - a);
      }, 0);
    if (xCoverage < minFill * 0.7) continue;

    // Cắt từng khoảng X giao với [lo,hi]
    const xSpans = [];
    for (const c of out) {
      if (c.mouth !== "mouth_x") continue;
      const a = Math.max(c.start, lo);
      const b = Math.min(c.end, hi);
      if (b - a >= minFill * 0.55) xSpans.push([round3(a), round3(b)]);
    }
    for (const [a, b] of xSpans) {
      out = spliceCueWindow(out, a, b, [
        {
          start: a,
          end: b,
          mouth: "mouth_b",
          type: "speech_energy",
        },
      ]);
    }
  }
  return mergeAdjacentSameMouth(out);
}

/**
 * Upgrade B→G using energy callback; cap ratio.
 * @param {(t:number)=>number} energyAt — 0..1 peak-normalized, optional
 */
export function applyWideOpenEmphasis(cues, energyAt, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  if (typeof energyAt !== "function") return cues.map((c) => ({ ...c }));
  const speech = cues.filter((c) => c.mouth !== "mouth_x");
  const speechDur = speech.reduce((s, c) => s + (c.end - c.start), 0) || 1;
  let gDur = 0;
  const maxG = speechDur * cfg.maxWideOpenRatio;
  const out = cues.map((c) => ({ ...c }));
  for (const c of out) {
    if (c.mouth !== "mouth_b") continue;
    const mid = (c.start + c.end) / 2;
    const e = energyAt(mid);
    if (!(e >= cfg.wideOpenEnergyThreshold)) continue;
    const dur = c.end - c.start;
    if (gDur + dur > maxG) continue;
    c.mouth = "mouth_g";
    gDur += dur;
  }
  return mergeAdjacentSameMouth(out);
}

/**
 * Quantize to fps without gaps/overlaps.
 * Snap mỗi biên theo thời gian gốc; không cộng dồn +1 frame (tránh drift giữa clip).
 */
export function quantizeCues(cues, totalSec, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const fps = cfg.fps || 30;
  const totalFrames = Math.max(1, Math.round(totalSec * fps));
  if (!cues.length) {
    return [
      {
        start: 0,
        end: round3(totalSec),
        startFrame: 0,
        endFrame: totalFrames,
        mouth: "mouth_x",
        type: "silence",
      },
    ];
  }

  const frames = cues.map((c) => ({
    ...c,
    startFrame: clamp(Math.round(c.start * fps), 0, totalFrames),
    endFrame: clamp(Math.round(c.end * fps), 0, totalFrames),
  }));

  frames[0].startFrame = 0;
  for (let i = 0; i < frames.length; i += 1) {
    if (i > 0) {
      // Nối sát cue trước — không đẩy cả chuỗi về sau bằng min-1-frame cascade
      frames[i].startFrame = frames[i - 1].endFrame;
    }
    // Giữ end theo thời gian gốc nếu còn hợp lệ; chỉ kéo tối thiểu khi bị đè
    const idealEnd = clamp(Math.round(cues[i].end * fps), 0, totalFrames);
    if (idealEnd > frames[i].startFrame) {
      frames[i].endFrame = idealEnd;
    } else if (cues[i].type === "close" || cues[i].type === "open") {
      // Giữ tối thiểu 1 frame cho chuỗi reset
      frames[i].endFrame = Math.min(totalFrames, frames[i].startFrame + 1);
    } else {
      // Cue quá ngắn sau snap: gộp vào neighbor thay vì +1 frame tích lũy
      frames[i].endFrame = frames[i].startFrame;
    }
  }
  // Nếu close/open đẩy đè cue sau, dịch endFrame các cue sau
  for (let i = 1; i < frames.length; i += 1) {
    if (frames[i].startFrame < frames[i - 1].endFrame) {
      frames[i].startFrame = frames[i - 1].endFrame;
    }
    if (frames[i].endFrame <= frames[i].startFrame) {
      if (frames[i].type === "close" || frames[i].type === "open") {
        frames[i].endFrame = Math.min(totalFrames, frames[i].startFrame + 1);
      }
    }
  }
  frames[frames.length - 1].endFrame = totalFrames;

  const merged = [];
  for (const f of frames) {
    if (f.endFrame <= f.startFrame) {
      // zero-length → merge mouth vào prev hoặc skip (absorbs into next via start chain)
      if (merged.length) {
        // keep prev; next will start at same frame
        continue;
      }
      f.endFrame = f.startFrame + 1;
    }
    f.start = round3(f.startFrame / fps);
    f.end = round3(f.endFrame / fps);
    const prev = merged[merged.length - 1];
    const eitherClose = prev?.type === "close" || f.type === "close";
    if (
      prev
      && prev.mouth === f.mouth
      && prev.endFrame === f.startFrame
      && !eitherClose
    ) {
      prev.endFrame = f.endFrame;
      prev.end = f.end;
      if (f.type === "speech" || prev.type === "speech") prev.type = "speech";
    } else if (prev && prev.endFrame > f.startFrame) {
      f.startFrame = prev.endFrame;
      f.start = round3(f.startFrame / fps);
      if (f.endFrame <= f.startFrame) continue;
      merged.push({ ...f });
    } else {
      merged.push({ ...f });
    }
  }
  if (merged.length) {
    merged[merged.length - 1].endFrame = totalFrames;
    merged[merged.length - 1].end = round3(totalSec);
  }
  return merged;
}

/**
 * Collect preferred blink windows (long silence).
 */
export function preferredBlinkWindows(cues, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const min = cfg.restAboveMs / 1000;
  return cues
    .filter((c) => c.mouth === "mouth_x" && c.end - c.start >= min)
    .map((c) => ({ start: c.start, end: c.end }));
}

/**
 * Build blink timeline cues.
 */
export function buildBlinkTimeline(totalSec, mouthCues, cfg = DEFAULT_LIP_SYNC_CONFIG) {
  const fps = cfg.fps || 30;
  const half = 1 / fps;
  const closed = 2 / fps;
  const blinkDur = half + closed + half;
  const windows = preferredBlinkWindows(mouthCues, cfg);
  const gWindows = mouthCues.filter((c) => c.mouth === "mouth_g");

  const events = [];
  let t = cfg.blinkIntervalMinSec * 0.4;
  let cycle = 0;
  while (t < totalSec - blinkDur) {
    const seed = ((cycle * 1103515245 + 12345) >>> 0) % 1000;
    const span = cfg.blinkIntervalMaxSec - cfg.blinkIntervalMinSec;
    const interval = cfg.blinkIntervalMinSec + (seed / 1000) * span;

    // Prefer silence window near t
    let blinkAt = t;
    const prefer = windows.find((w) => w.end - w.start >= blinkDur && t >= w.start - 0.4 && t <= w.end);
    if (prefer) {
      blinkAt = clamp(t, prefer.start, prefer.end - blinkDur);
    }

    // Avoid G
    const hitsG = gWindows.some((g) => blinkAt < g.end && blinkAt + blinkDur > g.start);
    if (!hitsG && blinkAt >= 0) {
      events.push({
        start: round3(blinkAt),
        halfCloseEnd: round3(blinkAt + half),
        closedEnd: round3(blinkAt + half + closed),
        halfOpenEnd: round3(blinkAt + blinkDur),
      });
    }

    t = blinkAt + interval;
    cycle += 1;
  }

  return events;
}

/**
 * Eyes key at time from blink events.
 */
export function eyesKeyFromBlinkEvents(t, blinkEvents) {
  const time = Math.max(0, Number(t) || 0);
  for (const b of blinkEvents || []) {
    if (time >= b.start && time < b.halfCloseEnd) return "eyes_half_blink";
    if (time >= b.halfCloseEnd && time < b.closedEnd) return "eyes_closed_blink";
    if (time >= b.closedEnd && time < b.halfOpenEnd) return "eyes_half_blink";
  }
  return "eyes_open";
}

/**
 * Mouth key at time from cues (binary search).
 */
export function mouthKeyFromCues(t, cues) {
  const time = Number(t);
  if (!Number.isFinite(time) || !cues?.length) return "mouth_x";
  let lo = 0;
  let hi = cues.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = cues[mid];
    if (time < c.start) hi = mid - 1;
    else if (time >= c.end) lo = mid + 1;
    else return c.mouth;
  }
  return "mouth_x";
}

/**
 * Full preprocess pipeline.
 * @param {object} opts
 * @param {Array} opts.words
 * @param {number} opts.totalSec
 * @param {(t:number)=>number} [opts.energyAt]
 * @param {object} [opts.config]
 */
export function buildLipSyncTimeline({
  words,
  totalSec,
  energyAt = null,
  isLowEnergy = null,
  config = DEFAULT_LIP_SYNC_CONFIG,
}) {
  const cfg = { ...DEFAULT_LIP_SYNC_CONFIG, ...config };
  const total = Math.max(0.1, Number(totalSec) || 0.1);
  let timed = normalizeTimedWords(words);
  timed = expandShortWords(timed, cfg, energyAt, total);

  let cues = wordsToOrthoCues(timed, cfg);
  cues = insertSilenceCues(cues, cfg);
  // Ensure start at 0
  if (!cues.length || cues[0].start > 0.001) {
    cues.unshift({
      start: 0,
      end: cues[0]?.start ?? total,
      mouth: "mouth_x",
      type: "silence",
    });
  }
  cues = refineSilenceWithEnergy(cues, energyAt, isLowEnergy, cfg);
  cues = insertSameMouthResetTransitions(cues, timed, cfg);
  cues = applyVisualLead(cues, cfg);
  cues = applyWideOpenEmphasis(cues, energyAt, cfg);
  cues = enforceMinDuration(cues, cfg);
  cues = applyCoarticulation(cues, cfg);
  cues = applyRelease(cues, total, cfg);
  cues = enforceMinDuration(cues, cfg);
  // Cuối cùng: đóng miệng khi audio im; há miệng khi audio nói mà cue đang X
  cues = forceRestFromEnergy(cues, isLowEnergy, energyAt, cfg);
  cues = fillSpeechFromEnergy(cues, energyAt, isLowEnergy, cfg);
  cues = enforceMinDuration(cues, cfg);
  cues = quantizeCues(cues, total, cfg);

  const blinkEvents = buildBlinkTimeline(total, cues, cfg);

  const speaking = cues.filter((c) => c.mouth !== "mouth_x");
  const speakingSec = speaking.reduce((s, c) => s + (c.end - c.start), 0);
  const silenceSec = total - speakingSec;
  const gSec = speaking
    .filter((c) => c.mouth === "mouth_g")
    .reduce((s, c) => s + (c.end - c.start), 0);

  return {
    version: 2,
    fps: cfg.fps,
    totalSec: round3(total),
    mouthCues: cues,
    blinkEvents,
    stats: {
      cueCount: cues.length,
      speakingSec: round3(speakingSec),
      silenceSec: round3(Math.max(0, silenceSec)),
      gRatio: speakingSec > 0 ? round3(gSec / speakingSec) : 0,
    },
  };
}

// --- Legacy runtime helpers (compat) ---

export function mouthKeyAt(t, words) {
  const timeline = buildLipSyncTimeline({
    words,
    totalSec: Math.max(
      0.1,
      ...(normalizeTimedWords(words).map((w) => w.end)),
    ),
  });
  return mouthKeyFromCues(t, timeline.mouthCues);
}

export function eyesKeyAt(t, blinkEvents = null) {
  if (blinkEvents) return eyesKeyFromBlinkEvents(t, blinkEvents);
  // legacy fallback
  const time = Math.max(0, Number(t) || 0);
  const period = 4.2;
  const cycle = Math.floor(time / period);
  const local = time - cycle * period;
  const seed = ((cycle * 1103515245 + 12345) >>> 0) % 1000;
  const blinkStart = Math.min(3.2 + (seed % 16) / 10, 3.95);
  if (local < blinkStart) return "eyes_open";
  if (local < blinkStart + 0.04) return "eyes_half_blink";
  if (local < blinkStart + 0.1) return "eyes_closed_blink";
  if (local < blinkStart + 0.14) return "eyes_half_blink";
  return "eyes_open";
}

export function avatarPoseAt(t, rawWords) {
  const words = normalizeTimedWords(rawWords);
  const totalSec = Math.max(0.1, ...words.map((w) => w.end), 0.1);
  const tl = buildLipSyncTimeline({ words, totalSec });
  return {
    mouth: mouthKeyFromCues(t, tl.mouthCues),
    eyes: eyesKeyFromBlinkEvents(t, tl.blinkEvents),
  };
}

export const MOUTH_KEYS = [
  "mouth_x",
  "mouth_a",
  "mouth_b",
  "mouth_c",
  "mouth_d",
  "mouth_e",
  "mouth_f",
  "mouth_g",
];

export const EYE_KEYS = ["eyes_open", "eyes_half_blink", "eyes_closed_blink"];
