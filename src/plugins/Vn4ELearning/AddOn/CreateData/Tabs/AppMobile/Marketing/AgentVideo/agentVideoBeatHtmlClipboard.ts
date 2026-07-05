/** Trích HTML beat thuần từ clipboard (bỏ markdown fence / text thừa từ chatbot). */
export function extractBeatHtmlFromPastedText(text: string): string {
    let body = String(text || '').trim();
    if (!body) {
        return '';
    }

    const fenced = body.match(/^```(?:html)?\s*([\s\S]*?)```\s*$/i);
    if (fenced?.[1]) {
        body = fenced[1].trim();
    } else {
        const inlineFence = body.match(/```(?:html)?\s*([\s\S]*?)```/i);
        if (inlineFence?.[1] && /<!doctype\s+html|<html\b/i.test(inlineFence[1])) {
            body = inlineFence[1].trim();
        }
    }

    const doctypeIdx = body.search(/<!doctype\s+html/i);
    const htmlIdx = body.search(/<html\b/i);
    const start = doctypeIdx >= 0 ? doctypeIdx : htmlIdx;
    if (start > 0) {
        body = body.slice(start);
    }

    const closingTag = body.match(/<\/html>/i);
    if (closingTag && closingTag.index != null) {
        body = body.slice(0, closingTag.index + closingTag[0].length);
    }

    return body.trim();
}
