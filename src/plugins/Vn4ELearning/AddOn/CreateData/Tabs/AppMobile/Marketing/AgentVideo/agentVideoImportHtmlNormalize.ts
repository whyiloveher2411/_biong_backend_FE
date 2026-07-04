import { formatDurationSec } from './agentVideoHfPromptDuration';

export function parseHtmlDataDurationSec(html: string): number | null {
    const match = String(html || '').match(/data-duration=["'](\d+(?:\.\d+)?)["']/i);
    if (!match) {
        return null;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) && value > 0 ? value : null;
}

const DURATION_VAR_RE = /\b(const|let|var)\s+(DURATION|duration|CLIP_DURATION|clipDuration|TOTAL_DURATION|totalDuration|TOTAL|total)\s*=\s*(\d+(?:\.\d+)?)\b/g;

export function normalizeImportHtmlForAudio(
    html: string,
    expectedDurationSec: number,
): { html: string; patches: string[] } {
    const expected = Math.max(0.1, Number(expectedDurationSec) || 0);
    const patches: string[] = [];
    if (!html.trim() || !Number.isFinite(expected) || expected <= 0) {
        return { html, patches };
    }

    const label = formatDurationSec(expected);
    let result = html;

    const parsed = parseHtmlDataDurationSec(result);
    if (parsed != null && Math.abs(parsed - expected) > 1) {
        result = result.replace(
            /(<html\b[^>]*\bdata-duration=)(["'])(\d+(?:\.\d+)?)\2/i,
            `$1$2${label}$2`,
        );
        patches.push(`data-duration → ${label}s`);
    } else if (parsed == null && /<html\b/i.test(result)) {
        result = result.replace(/<html\b/i, `<html data-duration="${label}"`);
        patches.push(`thêm data-duration="${label}"`);
    }

    let durationVarPatched = false;
    result = result.replace(DURATION_VAR_RE, (match, kind, name, value) => {
        const num = Number(value);
        if (Math.abs(num - expected) <= 1) {
            return match;
        }
        durationVarPatched = true;
        return `${kind} ${name} = ${label}`;
    });
    if (durationVarPatched) {
        patches.push(`DURATION constant → ${label}`);
    }

    if (!/\b(DURATION|CLIP_DURATION|TOTAL_DURATION)\s*=/.test(result) && /function\s+render\s*\(/.test(result)) {
        const injection = `const DURATION = ${label}; // locked — Spacedev audio duration\n  `;
        if (/<script\b/i.test(result)) {
            result = result.replace(/<script(\b[^>]*)>/i, (m) => `${m}\n  ${injection}`);
            patches.push(`inject const DURATION = ${label}`);
        }
    }

    return { html: result, patches };
}

export function isImportHtmlDurationMismatch(
    html: string,
    expectedDurationSec: number,
    toleranceSec = 1,
): boolean {
    if (!html.trim() || !Number.isFinite(expectedDurationSec) || expectedDurationSec <= 0) {
        return false;
    }

    const parsed = parseHtmlDataDurationSec(html);
    if (parsed != null && Math.abs(parsed - expectedDurationSec) > toleranceSec) {
        return true;
    }

    const re = /\b(const|let|var)\s+(DURATION|duration|CLIP_DURATION|clipDuration|TOTAL_DURATION|totalDuration|TOTAL|total)\s*=\s*(\d+(?:\.\d+)?)\b/g;
    let match = re.exec(html);
    while (match) {
        if (Math.abs(Number(match[3]) - expectedDurationSec) > toleranceSec) {
            return true;
        }
        match = re.exec(html);
    }
    return false;
}
