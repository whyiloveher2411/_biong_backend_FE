export function buildGoogleImagesUrl(keyword: string): string {
    const url = new URL('https://www.google.com/search');
    url.searchParams.set('q', keyword.trim());
    url.searchParams.set('tbm', 'isch');
    url.searchParams.set('hl', 'vi');
    return url.toString();
}

export async function copyMarketingText(text: string): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}
