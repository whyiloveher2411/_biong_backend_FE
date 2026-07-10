import { tokenizeScript, type CaptionAlignToken } from './agentVideoCaptionScriptAlign';

export type ScriptLineWithTokens = {
    tokens: CaptionAlignToken[];
    isBlank: boolean;
};

export function buildScriptLinesWithTokens(
    audioScript: string,
    tokens: CaptionAlignToken[],
): ScriptLineWithTokens[] {
    const rawLines = audioScript.split('\n');
    let tokenIndex = 0;
    const lines: ScriptLineWithTokens[] = [];

    rawLines.forEach((rawLine) => {
        const lineWords = tokenizeScript(rawLine);
        const lineTokens: CaptionAlignToken[] = [];
        lineWords.forEach(() => {
            if (tokenIndex < tokens.length) {
                lineTokens.push(tokens[tokenIndex]);
                tokenIndex += 1;
            }
        });
        lines.push({
            tokens: lineTokens,
            isBlank: rawLine.trim() === '' && lineWords.length === 0,
        });
    });

    return lines;
}
