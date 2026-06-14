export function parseShortVideoApiMessage(
    message: unknown,
    fallback: string
): string {
    if (typeof message === 'string' && message.trim()) {
        return message.trim();
    }
    if (message && typeof message === 'object' && 'content' in message) {
        const content = (message as { content?: unknown }).content;
        if (typeof content === 'string' && content.trim()) {
            return content.trim();
        }
    }
    return fallback;
}
