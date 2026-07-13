/**
 * @deprecated Không tách beat trong code.
 * Beat-map từ CMS giữ nguyên; gợi ý 5–20s chỉ nằm ở prompt chia beat (AI).
 * Giữ export no-op để không phá import cũ.
 *
 * @param {Array<Record<string, unknown>>} sections
 * @return {{ sections: Array<Record<string, unknown>>, splitCount: number, splitDetails: string[] }}
 */
export function normalizeOversizedBeatSections(sections) {
  const input = Array.isArray(sections) ? sections : [];
  return {
    sections: input.map((sec) => ({ ...sec })),
    splitCount: 0,
    splitDetails: [],
  };
}
