/**
 * Post-transcribe sanity checks — profile-driven, không hardcode vi.
 */
import { getLocaleProfile } from "./transcribe-locale.mjs";

const VI_DIACRITIC_RE =
  /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

const CJK_RE =
  /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u1100-\u11ff]/;

export function hasVietnameseDiacritics(text) {
  return VI_DIACRITIC_RE.test(String(text ?? ""));
}

export function hasCjkChars(text) {
  return CJK_RE.test(String(text ?? ""));
}

function wordTexts(words) {
  return (Array.isArray(words) ? words : []).map((w) =>
    typeof w === "string" ? w : String(w?.text ?? ""),
  );
}

function countPatternWords(words, pattern) {
  if (!pattern) return 0;
  let n = 0;
  for (const t of wordTexts(words)) {
    if (pattern.test(t)) n++;
  }
  return n;
}

export function isAsciiWord(text) {
  const t = String(text ?? "").trim();
  if (!t) return false;
  return /^[a-z0-9'.-]+$/i.test(t) && !hasVietnameseDiacritics(t);
}

export function countAsciiWords(words) {
  let count = 0;
  for (const t of wordTexts(words)) {
    if (isAsciiWord(t)) count++;
  }
  return count;
}

/** @deprecated use countPatternWords with profile */
export function countDiacriticWords(words) {
  return countPatternWords(words, VI_DIACRITIC_RE);
}

function checkDiacriticLatin(scriptWords, transcriptWords) {
  const scriptMark = countPatternWords(scriptWords, VI_DIACRITIC_RE);
  const transcriptMark = countPatternWords(transcriptWords, VI_DIACRITIC_RE);

  if (scriptMark >= 10 && transcriptMark === 0) {
    return {
      fail: true,
      reason: `Script có ${scriptMark} từ đặc trưng nhưng transcript 0 — có thể dùng small.en thay vì --language vi`,
    };
  }

  const transcriptLen = transcriptWords.length;
  if (transcriptLen > 0 && scriptMark >= 5) {
    const asciiRatio = countAsciiWords(transcriptWords) / transcriptLen;
    const scriptAsciiRatio =
      scriptWords.length > 0 ? countAsciiWords(scriptWords) / scriptWords.length : 0;
    if (asciiRatio > 0.6 && scriptAsciiRatio < 0.4 && transcriptMark < scriptMark * 0.2) {
      return {
        fail: true,
        reason: `Transcript ${(asciiRatio * 100).toFixed(0)}% ASCII thuần trong khi script có dấu tiếng Việt`,
      };
    }
  }

  return { fail: false };
}

function checkCjk(scriptWords, transcriptWords, profile) {
  const pattern = profile.scriptPattern ?? CJK_RE;
  const scriptMark = countPatternWords(scriptWords, pattern);
  const transcriptMark = countPatternWords(transcriptWords, pattern);

  if (scriptMark >= 8 && transcriptMark === 0) {
    return {
      fail: true,
      reason: `Script có ${scriptMark} từ ${profile.label} nhưng transcript không có ký tự đích — kiểm tra --language ${profile.code}`,
    };
  }

  if (scriptWords.length >= 10 && transcriptWords.length >= 10) {
    const transcriptAscii = countAsciiWords(transcriptWords) / transcriptWords.length;
    if (scriptMark >= 5 && transcriptMark < scriptMark * 0.15 && transcriptAscii > 0.7) {
      return {
        fail: true,
        reason: `Transcript có vẻ bị dịch sang Latin (${(transcriptAscii * 100).toFixed(0)}% ASCII) thay vì ${profile.label}`,
      };
    }
  }

  return { fail: false };
}

function checkLatin(scriptWords, transcriptWords) {
  const transcriptLen = transcriptWords.length;
  if (transcriptLen < 5) return { fail: false };

  const cjkInScript = countPatternWords(scriptWords, CJK_RE);
  const cjkInTranscript = countPatternWords(transcriptWords, CJK_RE);
  if (cjkInScript >= 5 && cjkInTranscript === 0) {
    return {
      fail: true,
      reason: "Script có CJK nhưng transcript Latin — sai ngôn ngữ hoặc model",
    };
  }

  return { fail: false };
}

/**
 * @param {string[]} scriptWords
 * @param {string[] | {text:string}[]} transcriptWords
 * @param {{ lang?: string, profile?: object }} [options]
 */
export function detectWrongLanguageTranscript(scriptWords, transcriptWords, options = {}) {
  const profile = options.profile ?? getLocaleProfile(options.lang);
  const sanity = profile.sanity ?? "generic";

  switch (sanity) {
    case "diacritic-latin":
      return checkDiacriticLatin(scriptWords, transcriptWords);
    case "cjk":
      return checkCjk(scriptWords, transcriptWords, profile);
    case "latin":
      return checkLatin(scriptWords, transcriptWords);
    default:
      return { fail: false };
  }
}

/** @deprecated — dùng detectWrongLanguageTranscript(..., { lang: 'vi' }) */
export function detectViScriptEnTranscript(scriptWords, transcriptWords) {
  return detectWrongLanguageTranscript(scriptWords, transcriptWords, { lang: "vi" });
}

export function checkTranscriptWordCountDrift(
  scriptWordCount,
  transcriptWordCount,
  maxDrift = 0.4,
) {
  if (scriptWordCount <= 0) return { fail: false };
  const drift = Math.abs(transcriptWordCount - scriptWordCount) / scriptWordCount;
  if (drift > maxDrift) {
    return {
      fail: true,
      reason: `Số từ transcript (${transcriptWordCount}) lệch script (${scriptWordCount}) ${(drift * 100).toFixed(0)}% > ${(maxDrift * 100).toFixed(0)}%`,
    };
  }
  return { fail: false };
}
