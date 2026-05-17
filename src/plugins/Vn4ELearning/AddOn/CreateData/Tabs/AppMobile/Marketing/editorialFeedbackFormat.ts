import { EDITORIAL_SUBSTEP_LABELS } from './editorialConstants';

export function formatEditorialPassSummary(substep: string, pass: Record<string, unknown>): string {
    if (!pass || typeof pass !== 'object') return '(Không có dữ liệu)';

    const lines: string[] = [];

    if (substep === 'ed_audience') {
        const af = pass.audience_feedback as Record<string, unknown> | undefined;
        if (af && typeof af === 'object') {
            const list = (key: string, label: string) => {
                const raw = af[key];
                const items = Array.isArray(raw) ? raw : (raw ? [raw] : []);
                if (items.length) {
                    lines.push(`${label}:`);
                    items.forEach((item) => lines.push(`  • ${String(item)}`));
                }
            };
            list('confusing', 'Không hiểu / khó hiểu');
            list('cliche', 'Sáo rỗng');
            list('impressive', 'Ấn tượng');
            if (af.action_intent) lines.push(`Hành động mong muốn: ${af.action_intent}`);
            if (af.why) lines.push(`Lý do: ${af.why}`);
            if (typeof af.would_act_now === 'boolean') {
                lines.push(`Sẽ hành động ngay: ${af.would_act_now ? 'Có' : 'Không'}`);
            }
        }
    }

    const changelog = pass.changelog;
    if (Array.isArray(changelog) && changelog.length > 0) {
        lines.push('Changelog:');
        changelog.slice(0, 8).forEach((c) => {
            if (typeof c === 'string') {
                lines.push(`  • ${c}`);
            } else if (c && typeof c === 'object') {
                const o = c as { change?: string; reason?: string };
                lines.push(`  • ${o.change || ''}${o.reason ? ` — ${o.reason}` : ''}`);
            }
        });
    }

    if (pass.outline_suggestion) {
        lines.push(`Gợi ý cấu trúc: ${String(pass.outline_suggestion)}`);
    }

    if (Array.isArray(pass.transition_notes) && pass.transition_notes.length > 0) {
        lines.push('Ghi chú chuyển tiếp:');
        pass.transition_notes.forEach((n) => lines.push(`  • ${String(n)}`));
    }

    if (Array.isArray(pass.evidence_list) && pass.evidence_list.length > 0) {
        lines.push('Bằng chứng / claim:');
        pass.evidence_list.slice(0, 6).forEach((ev) => {
            if (ev && typeof ev === 'object') {
                const e = ev as { claim?: string; evidence_type?: string; note?: string };
                lines.push(`  • [${e.evidence_type || '?'}] ${e.claim || ''}${e.note ? ` — ${e.note}` : ''}`);
            }
        });
    }

    const versions = pass.versions as Record<string, string> | undefined;
    if (versions && typeof versions === 'object') {
        if (versions.layman) lines.push(`Phiên bản phổ thông: ${versions.layman.slice(0, 200)}…`);
        if (versions.professional) lines.push(`Phiên bản chuyên ngành: ${versions.professional.slice(0, 200)}…`);
    }

    if (pass.content && typeof pass.content === 'string') {
        const preview = pass.content.length > 400
            ? `${pass.content.slice(0, 400)}…`
            : pass.content;
        lines.push(`Nội dung đã chỉnh (${pass.content.length} ký tự):\n${preview}`);
    }

    if (pass.acknowledged) {
        lines.push('Đã xác nhận bối cảnh.');
        if (pass.publish_place) lines.push(`Nơi đăng: ${pass.publish_place}`);
        if (pass.target_reader) lines.push(`Độc giả: ${pass.target_reader}`);
    }

    if (lines.length === 0) {
        return JSON.stringify(pass, null, 2);
    }

    return lines.join('\n');
}

export function substepLabel(sub: string): string {
    return EDITORIAL_SUBSTEP_LABELS[sub] || sub;
}
