export function normalizeFeatureHighlightText(value?: string | null): string {
    return String(value || '').trim();
}

export function hasFeatureHighlight(value?: string | null): boolean {
    return normalizeFeatureHighlightText(value) !== '';
}

export function buildFeatureHighlightPromptLines(
    instruction: string | undefined | null,
    usesLogo: boolean,
): string[] {
    const text = normalizeFeatureHighlightText(instruction);
    const mainImageRef = usesLogo
        ? 'image 2 (main screenshot)'
        : 'the attached main screenshot';

    if (!text) {
        return [
            '## Feature highlight / UI focus (in-app screen)',
            'No specific UI focus requested — show the full in-app screen inside the device mockup with equal visual weight across UI.',
            'Do NOT add magnifying glass, callout bubble, zoom inset, dim overlay, halo spotlight, or feature highlight effects unless the user specified them.',
            'Preserve the complete app UI as in the source screenshot — no artificial focal point on a sub-region.',
        ];
    }

    return [
        '## Feature highlight / UI focus (ENABLED — in-app screen)',
        'Apply a Feature Highlight, In-app Focus, or UI Focus effect ON the app screen inside the device mockup.',
        'Industry terms: UI Element Callout, Visual Focus, Focal Point, Rule of Thirds anchoring.',
        '',
        `User instruction (follow closely): "${text}"`,
        '',
        '### Scope',
        `Locate the target element/region using ${mainImageRef} — only highlight UI that actually exists in the screenshot.`,
        'The focus effect applies INSIDE the phone screen content, not on the marketing background outside the device.',
        'Do not invent UI elements that are not in the source screenshot.',
        '',
        '### Allowed focus techniques (use what the user instruction implies)',
        '- Magnifying glass / lens zoom on a specific control or icon.',
        '- UI element callout — subtle pointer or label to a button, menu, hexagon node, badge, etc.',
        '- Visual focus: soft dim on non-target areas inside the screen, brighter target region.',
        '- Halo / soft glow on the focal element only (no background plate behind halo).',
        '- Mini zoom inset (picture-in-picture) of the focused region — keep it small and clear.',
        '- Focal point aligned to Rule of Thirds when composition allows.',
        '',
        '### Rules',
        'Highlight ONE primary region per user instruction — do not scatter multiple competing callouts.',
        'Non-focused in-app UI may be slightly dimmed or de-emphasized, but must remain recognizable.',
        'Focused region must stay sharp and readable at store thumbnail size.',
        'Do not cover the entire screen with effects — the rest of the UI should still read as the real app.',
        'Marketing elements outside the phone (headline, floating icons, logo) are unaffected.',
        '',
        'Wrong: ignore user instruction or highlight a random area not in the screenshot.',
        'Wrong: add focus effects outside the device screen.',
        `Right: execute the user instruction precisely on the matching UI in ${mainImageRef} (e.g. simple magnifying glass on the first hexagon node).`,
    ];
}
