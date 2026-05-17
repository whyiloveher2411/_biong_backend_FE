import type { NotificationMessageVariant } from './NotificationAiLlmButtons';

export function parseRepeaterMessagesFromPost(raw: unknown): ANY[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

export function variantFingerprint(v: {
    title?: Record<string, string>;
    body?: Record<string, string>;
}): string {
    const title = v.title || {};
    const body = v.body || {};
    const keys = Array.from(new Set([...Object.keys(title), ...Object.keys(body)])).sort();
    const parts = keys.map((k) => `${k}:${title[k] || ''}|${body[k] || ''}`);
    return parts.join(';;');
}

export function isVariantEmpty(v: NotificationMessageVariant, codes: string[]): boolean {
    if (!codes.length) {
        return !Object.values(v.title || {}).some((t) => t?.trim())
            && !Object.values(v.body || {}).some((b) => b?.trim());
    }
    return codes.every((c) => !(v.title[c]?.trim()) && !(v.body[c]?.trim()));
}

export function stripEmptyVariants(
    variants: NotificationMessageVariant[],
    codes: string[]
): NotificationMessageVariant[] {
    const nonEmpty = variants.filter((v) => !isVariantEmpty(v, codes));
    return nonEmpty.length > 0 ? nonEmpty : variants;
}

/** Thêm variant mới vào cuối, bỏ qua trùng fingerprint với danh sách hiện có. */
export function appendVariantsUnique(
    current: NotificationMessageVariant[],
    incoming: NotificationMessageVariant[],
    codes: string[]
): NotificationMessageVariant[] {
    const base = stripEmptyVariants(current, codes);
    const fps = new Set(base.map((v) => variantFingerprint(v)));
    const toAdd: NotificationMessageVariant[] = [];
    incoming.forEach((v) => {
        const normalized = v;
        if (isVariantEmpty(normalized, codes)) return;
        const fp = variantFingerprint(normalized);
        if (fps.has(fp)) return;
        fps.add(fp);
        toAdd.push(normalized);
    });
    return [...base, ...toAdd];
}

export function toRepeaterMessages(variants: NotificationMessageVariant[]): ANY[] {
    return variants.map((v) => ({
        open: false,
        confirmDelete: false,
        delete: 0,
        title: { ...v.title },
        body: { ...v.body },
    }));
}

/** Gộp repeater CMS: giữ row cũ, thêm row mới (không trùng nội dung). */
export function mergeRepeaterAppend(existing: ANY[], incoming: ANY[]): ANY[] {
    const kept = (existing || []).filter((x) => x && x.delete !== 1);
    const fps = new Set(
        kept.map((x) =>
            variantFingerprint({
                title: typeof x.title === 'object' ? x.title : {},
                body: typeof x.body === 'object' ? x.body : {},
            })
        )
    );
    const added: ANY[] = [];
    incoming.forEach((row) => {
        const fp = variantFingerprint({
            title: typeof row.title === 'object' ? row.title : {},
            body: typeof row.body === 'object' ? row.body : {},
        });
        if (fps.has(fp)) return;
        fps.add(fp);
        added.push({
            open: false,
            confirmDelete: false,
            delete: 0,
            ...row,
        });
    });
    return [...kept, ...added];
}
