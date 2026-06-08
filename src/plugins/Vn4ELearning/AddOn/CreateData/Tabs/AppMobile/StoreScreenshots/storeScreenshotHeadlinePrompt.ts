import type {
    StoreMetadata,
    StoreScreenshotItem,
    StoreScreenshotTemplate,
} from './storeScreenshotTypes';
import {
    buildBulkJsonExampleRow,
    buildCopyDifferentiationLines,
    buildCopyStyleBulkBlockLines,
    normalizeCopyStylePresetId,
} from './storeScreenshotCopyStyleOptions';
import {
    buildVisualCopyVoiceLines,
    normalizeStylePresetId,
    STYLE_PRESETS,
} from './storeScreenshotStyleOptions';
import { STORE_SCREENSHOT_BULK_LANG, STORE_SCREENSHOT_PROMPT_LANG } from './storeScreenshotMultilang';

type BuildHeadlineBulkPromptInput = {
    appTitle: string;
    storeMetadata: StoreMetadata;
    template: StoreScreenshotTemplate;
    screenshots: StoreScreenshotItem[];
};

function buildScreenshotListLines(
    screenshots: StoreScreenshotItem[],
    template: StoreScreenshotTemplate,
): string[] {
    const sorted = [...screenshots].sort((a, b) => a.order - b.order);
    const totalCount = sorted.length;

    return sorted.flatMap((shot) => buildCopyStyleBulkBlockLines(shot, totalCount, template));
}

function buildJsonExampleLines(screenshots: StoreScreenshotItem[]): string[] {
    const sorted = [...screenshots].sort((a, b) => a.order - b.order);
    const sampleShots = sorted.slice(0, Math.min(3, sorted.length));

    if (sampleShots.length === 0) {
        return ['[]'];
    }

    const rows = sampleShots.map((shot) => buildBulkJsonExampleRow(
        shot.order,
        normalizeCopyStylePresetId(shot.copy_style_preset),
        STORE_SCREENSHOT_PROMPT_LANG,
        STORE_SCREENSHOT_BULK_LANG,
    ));

    return ['[', ...rows, sampleShots.length < sorted.length ? '  // ... one object per remaining screenshot' : '', ']'].filter(Boolean);
}

export function buildHeadlineBulkPrompt({
    appTitle,
    storeMetadata,
    template,
    screenshots,
}: BuildHeadlineBulkPromptInput): string {
    const sorted = [...screenshots].sort((a, b) => a.order - b.order);
    const totalCount = sorted.length;
    const visualPreset = STYLE_PRESETS.find(
        (item) => item.id === normalizeStylePresetId(template.style_preset),
    ) ?? STYLE_PRESETS[0];

    const lines = [
        'You are an expert App Store and Google Play copywriter focused on screenshot carousel conversion.',
        '',
        '## Primary goal (non-negotiable)',
        'Maximize user attraction and download intent. Every headline and subtitle must earn attention within 2 seconds on a phone store listing.',
        'Priority order: (1) match SHARED visual template copy voice for ALL screenshots, (2) match REQUIRED copy_style_id per screenshot, (3) tie copy to screen content, (4) truthfulness to metadata.',
        'Never write dry feature lists, internal jargon, or generic filler. Write for humans deciding whether to tap Install.',
        '',
        '## App context (metadata)',
        `App name: ${appTitle || storeMetadata.title || 'App'}`,
        storeMetadata.description?.trim()
            ? `Description: ${storeMetadata.description.trim()}`
            : '',
        storeMetadata.promotional_text?.trim()
            ? `Promotional text: ${storeMetadata.promotional_text.trim()}`
            : '',
        storeMetadata.keywords?.trim()
            ? `Keywords: ${storeMetadata.keywords.trim()}`
            : '',
        '',
        '## Shared visual template — copy voice (mandatory for EVERY screenshot)',
        `User selected image style: ${visualPreset.label}`,
        ...buildVisualCopyVoiceLines(template),
        '',
        '## Differentiation & anti-generic rules (critical)',
        ...buildCopyDifferentiationLines(sorted),
        '',
        '## Screenshots in listing order (do not reorder)',
        'Each block below layers per-screenshot copy_style_id ON TOP of the shared visual template voice above. Never contradict the visual template tone.',
        '',
        ...buildScreenshotListLines(sorted, template),
        '## Task',
        `Write one headline and one subtitle for each of the ${totalCount} screenshots listed above.`,
        '',
        '### Language (strict — both required per field)',
        `- headline.${STORE_SCREENSHOT_PROMPT_LANG} and subtitle.${STORE_SCREENSHOT_PROMPT_LANG}: English — PRIMARY, used in AI image prompts. Must match visual template voice AND per-screenshot rhetorical device.`,
        `- headline.${STORE_SCREENSHOT_BULK_LANG} and subtitle.${STORE_SCREENSHOT_BULK_LANG}: Vietnamese review translation — faithful, natural, same meaning as English.`,
        '- Do not output other language keys. Do not use flat strings — always nested objects with both en and vi.',
        '',
        '### Headline rules',
        '- Max ~8 words for headline.en; punchy, specific, scroll-stopping.',
        '- Headline must reference the screen content or one concrete user moment — not vague "master skills" marketing.',
        `- ALL copy must sound like it belongs on a "${visualPreset.label}" visual — e.g. playful_gamified allows streak/reward/level language; dark_premium must stay sleek; minimal_light stays understated.`,
        '- Screenshot #1 must stop the scroll. Last screenshot may use action_momentum if assigned.',
        '- If copy_style_id is curiosity_hook → headline MUST be a question or open loop.',
        '- If copy_style_id is problem_solution → headline MUST name a pain or relief.',
        '- If copy_style_id is action_momentum → headline MUST start with a strong verb.',
        '- If copy_style_id is social_proof → only use numbers/claims supported by metadata.',
        '',
        '### Subtitle rules',
        '- One supporting line; shorter than headline; never repeat headline verbatim.',
        '- Subtitle adds proof, context, friction removal, or completes the rhetorical device.',
        '- Subtitle must also match the shared visual template voice.',
        '',
        'If screen content is empty, infer one specific UI moment — do not invent unsupported claims.',
        '',
        '## Output format (strict)',
        'Return ONLY a raw JSON array. No markdown fences, no explanation, no extra keys.',
        `The array must contain exactly ${totalCount} objects.`,
        'Each object must use this schema:',
        `{ "screenshot": <number>, "headline": { "${STORE_SCREENSHOT_PROMPT_LANG}": "<string>", "${STORE_SCREENSHOT_BULK_LANG}": "<string>" }, "subtitle": { "${STORE_SCREENSHOT_PROMPT_LANG}": "<string>", "${STORE_SCREENSHOT_BULK_LANG}": "<string>" } }`,
        '',
        'Rules:',
        `- "screenshot" must be a unique integer from 1 to ${totalCount} matching the listing order above.`,
        '- Do not skip, merge, duplicate, or reorder screenshot numbers.',
        `- headline and subtitle must be objects with BOTH keys "${STORE_SCREENSHOT_PROMPT_LANG}" and "${STORE_SCREENSHOT_BULK_LANG}".`,
        '- All string values must be plain text (no line breaks inside values).',
        '',
        `Example shape using the actual copy_style_id per screenshot (tone reference only — write fresh copy for this app matching "${visualPreset.label}" voice, keep screenshot numbers 1..${totalCount}):`,
        ...buildJsonExampleLines(sorted),
    ];

    return lines.filter((line) => line !== '').join('\n');
}

export function buildHeadlineBulkJsonPlaceholder(count: number): string {
    const rows = Array.from({ length: count }, (_, index) => ({
        screenshot: index + 1,
        headline: { [STORE_SCREENSHOT_PROMPT_LANG]: '', [STORE_SCREENSHOT_BULK_LANG]: '' },
        subtitle: { [STORE_SCREENSHOT_PROMPT_LANG]: '', [STORE_SCREENSHOT_BULK_LANG]: '' },
    }));
    return JSON.stringify(rows, null, 2);
}
