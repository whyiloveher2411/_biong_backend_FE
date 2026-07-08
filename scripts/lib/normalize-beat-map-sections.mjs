const MAX_BEAT_DURATION_SEC = 20;
const MIN_BEAT_DURATION_SEC = 5;

function roundSec(value) {
  return Math.round(Number(value) * 1000) / 1000;
}

/**
 * Tách beat dài hơn 20s thành nhiều phần (5–20s mỗi phần).
 * Beat HTML phần sau clone từ beat gốc (split_from).
 *
 * @param {Array<Record<string, unknown>>} sections
 * @return {{ sections: Array<Record<string, unknown>>, splitCount: number, splitDetails: string[] }}
 */
export function normalizeOversizedBeatSections(sections) {
  const input = Array.isArray(sections) ? sections : [];
  const out = [];
  const splitDetails = [];

  for (const sec of input) {
    const start = Number(sec.startSec ?? 0);
    const end = Number(sec.endSec ?? start);
    const duration = Number(sec.durationSec ?? end - start);
    if (!(duration > MAX_BEAT_DURATION_SEC)) {
      out.push({ ...sec });
      continue;
    }

    const sourceId = String(sec.id || sec.beat_id || `beat_${out.length + 1}`);
    let chunkCount = Math.ceil(duration / MAX_BEAT_DURATION_SEC);
    let chunkDur = duration / chunkCount;
    while (chunkCount > 1 && chunkDur < MIN_BEAT_DURATION_SEC) {
      chunkCount -= 1;
      chunkDur = duration / chunkCount;
    }
    if (chunkCount < 2) {
      out.push({ ...sec });
      continue;
    }

    splitDetails.push(`${sourceId} ${duration.toFixed(1)}s → ${chunkCount} beat`);

    for (let part = 0; part < chunkCount; part++) {
      const partStart = roundSec(start + part * chunkDur);
      const partEnd = roundSec(part === chunkCount - 1 ? end : start + (part + 1) * chunkDur);
      const partId = part === 0 ? sourceId : `${sourceId}_part${part + 1}`;
      out.push({
        ...sec,
        id: partId,
        beat_id: partId,
        startSec: partStart,
        endSec: partEnd,
        durationSec: roundSec(partEnd - partStart),
        split_from: part === 0 ? undefined : sourceId,
        phrase_anchor:
          part === 0
            ? sec.phrase_anchor
            : `${String(sec.phrase_anchor || sourceId)} (phần ${part + 1})`,
      });
    }
  }

  return {
    sections: out,
    splitCount: out.length - input.length,
    splitDetails,
  };
}
