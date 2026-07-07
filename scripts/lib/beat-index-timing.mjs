/** Tránh clip beat chồng nhau trên cùng track (IEEE float start+duration). */
export function snapBeatSectionsForIndex(sections, totalVideoSec) {
  const list = Array.isArray(sections) ? sections : [];
  const total = Math.round(Number(totalVideoSec || 0) * 1000) / 1000;
  const out = [];

  for (let i = 0; i < list.length; i++) {
    const sec = list[i];
    const start = Math.round(Number(sec.startSec ?? 0) * 1000) / 1000;
    const nextStart =
      i < list.length - 1
        ? Math.round(Number(list[i + 1].startSec) * 1000) / 1000
        : total;
    let dur = Math.round((nextStart - start) * 1000) / 1000;
    if (i < list.length - 1 && dur > 0.002) {
      dur = Math.round((dur - 0.001) * 1000) / 1000;
    }
    out.push({ ...sec, startSec: start, durationSec: Math.max(0.001, dur) });
  }

  return out;
}
