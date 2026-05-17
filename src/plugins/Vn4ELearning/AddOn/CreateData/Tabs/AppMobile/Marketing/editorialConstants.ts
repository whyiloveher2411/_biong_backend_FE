export const EDITORIAL_SUBSTEPS_FULL = [
    'ed_context',
    'ed_grammar',
    'ed_clarity',
    'ed_structure',
    'ed_voice',
    'ed_evidence',
    'ed_audience',
] as const;

export const EDITORIAL_SUBSTEPS_SHORT = [
    'ed_polish',
    'ed_structure_voice',
    'ed_audience',
] as const;

export type EditorialSubstep = typeof EDITORIAL_SUBSTEPS_FULL[number] | typeof EDITORIAL_SUBSTEPS_SHORT[number];

export const EDITORIAL_SUBSTEP_LABELS: Record<string, string> = {
    ed_context: 'Bối cảnh & ràng buộc',
    ed_grammar: 'Ngữ pháp & mượt mà',
    ed_clarity: 'Tinh giản & rõ ràng',
    ed_structure: 'Cấu trúc & logic',
    ed_voice: 'Giọng văn (2 phiên bản)',
    ed_evidence: 'Chống bịa & bằng chứng',
    ed_audience: 'Phản hồi độc giả',
    ed_polish: 'Chỉnh sửa & tinh gọn',
    ed_structure_voice: 'Cấu trúc & giọng văn',
};

export function editorialSubstepsForContentType(contentType: string): string[] {
    if (contentType === 'long_form') {
        return [...EDITORIAL_SUBSTEPS_FULL];
    }
    return [...EDITORIAL_SUBSTEPS_SHORT];
}
