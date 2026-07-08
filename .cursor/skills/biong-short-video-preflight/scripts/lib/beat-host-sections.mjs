/**
 * Parse beat-host <section id="beat-N"> từ index.html.
 * Chỉ dùng id="beat-N" (không dùng data-composition-id) — tránh nhầm beat_17 vs beat-18.
 */

/** Track đã dùng bởi narration, BGM, overlay, ambient, beat-progress. */
export const SFX_RESERVED_TRACKS = new Set([10, 11, 20, 21, 30, 31]);

export function parseBeatHostSections(html) {
  const beats = [];
  const re =
    /<section\b[^>]*\bid="beat-(\d+)"[^>]*\bdata-start="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const num = parseInt(m[1], 10);
    const start = parseFloat(m[2]);
    if (Number.isFinite(num) && Number.isFinite(start)) {
      beats.push({ num, start });
    }
  }
  beats.sort((a, b) => a.start - b.start);
  return beats;
}

export function nextSfxTrackIndex(trackIndex) {
  let idx = trackIndex;
  while (SFX_RESERVED_TRACKS.has(idx)) idx += 1;
  const out = idx;
  return { trackIndex: out + 1, value: out };
}
