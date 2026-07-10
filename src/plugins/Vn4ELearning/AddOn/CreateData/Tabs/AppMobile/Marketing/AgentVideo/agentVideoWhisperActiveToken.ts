import type { CaptionAlignToken } from './agentVideoCaptionScriptAlign';

const END_PAD_SEC = 0.02;

export function resolveActiveTokenIndex(
    tokens: CaptionAlignToken[],
    currentTimeSec: number,
): number | null {
    if (!tokens.length || currentTimeSec < 0) {
        return null;
    }

    for (let i = 0; i < tokens.length; i += 1) {
        const token = tokens[i];
        if (currentTimeSec >= token.start && currentTimeSec <= token.end + END_PAD_SEC) {
            return token.index;
        }
    }

    let fallbackIndex: number | null = null;
    for (let i = 0; i < tokens.length; i += 1) {
        if (tokens[i].start <= currentTimeSec) {
            fallbackIndex = tokens[i].index;
        } else {
            break;
        }
    }

    return fallbackIndex;
}
