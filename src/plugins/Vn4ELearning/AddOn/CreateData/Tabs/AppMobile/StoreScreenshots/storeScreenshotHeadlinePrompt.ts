import type {
    StoreMetadata,
    StoreScreenshotTemplate,
} from './storeScreenshotTypes';
import {
    COPY_STYLE_PRESETS,
    getScreenshotPositionHint,
} from './storeScreenshotCopyStyleOptions';
import {
    buildVisualCopyVoiceLines,
    normalizeStylePresetId,
    STYLE_PRESETS,
} from './storeScreenshotStyleOptions';
import { STORE_SCREENSHOT_BULK_LANG, STORE_SCREENSHOT_PROMPT_LANG } from './storeScreenshotMultilang';
import {
    buildDecorJsonExample,
    buildDecorSuggestionPromptLines,
} from './storeScreenshotVisualDecorCatalog';

/** Cụm copy nhàm, corporate — model phải tránh (EN + VI). */
const BORING_COPY_BANNED_PHRASES = [
    'powerful app',
    'innovative solution',
    'seamless experience',
    'user-friendly',
    'best-in-class',
    'take your',
    'to the next level',
    'empower',
    'leverage',
    'streamline your',
    'enhance your',
    'optimize your',
    'discover the power',
    'all you need',
    'everything you need',
    'one-stop',
    'ứng dụng hàng đầu',
    'giải pháp toàn diện',
    'trải nghiệm tuyệt vời',
    'nâng tầm',
    'tối ưu hóa',
    'đột phá',
    'toàn diện',
    'mạnh mẽ',
    'tiện ích',
    'đa năng',
];

/** Gợi ý chiến lược subtitle theo copy_style_id (4 cách phối hợp ASO). */
const SUBTITLE_STRATEGY_BY_STYLE: Record<string, string> = {
    benefit_centric: 'Subtitle strategy A — Clarify the promise: explain HOW the app delivers the headline outcome (method, time, or visible UI on screen).',
    social_proof_numbers: 'Subtitle strategy A or C — Reinforce credibility with one verifiable fact; or remove download fear if metadata mentions free/no ads.',
    curiosity_fomo: 'Subtitle strategy A or C — Reveal the "secret" mechanism or exclusive access condition (only if metadata supports it).',
    action_oriented: 'Subtitle strategy A — Name the first repeatable action or daily habit shown on screen.',
    pain_point_solver: 'Subtitle strategy A — Show the direct relief mechanism (what the app does in one line).',
    simplicity_speed: 'Subtitle strategy A or B — Explain zero-friction automation; OR 2–3 comma-separated micro-features visible on this screen.',
    sequential_storytelling: 'Subtitle strategy D — Set context for this step in the carousel flow (what happens at Bước N / Step N).',
    brand_positioning: 'Subtitle strategy B or C — 2–3 comma-separated core capabilities from metadata/UI; OR quality/free barrier removal if metadata supports it.',
};

function buildAsoConversionFrameworkLines(order: number, totalCount: number): string[] {
    return [
        '## ASO conversion framework (3-second rule)',
        'Users decide in the first 3 seconds whether to keep swiping. Headline = hook (value or emotion in one glance). Subtitle = retention (answers "how?" or "why believe you?" before they swipe away).',
        '',
        '### 5 headline formulas — map 1:1 to copy_style_id (never swap formulas between ids)',
        '| copy_style_id | Formula | WRONG (feature label) → RIGHT (psychology hit) |',
        '| benefit_centric | Benefit-driven | "Nature sound app" → "Sleep soundly in 10 minutes" |',
        '| social_proof_numbers | Social proof & numbers | "Popular finance app" → "5M+ people track spending here" (numbers only if metadata has them) |',
        '| curiosity_fomo | Urgency & curiosity | "Shopping deals app" → "The spending hack members whisper about" |',
        '| action_oriented | Strong action verb | "English learning tool" → "Own conversational English" |',
        '| pain_point_solver | Pain point relief | "Password manager" → "Never forget a password again" |',
        '| simplicity_speed | Easy & fast (benefit + zero friction) | "Expense tracker" → "Track spending with zero typing" |',
        '| sequential_storytelling | Carousel step hook | "Restaurant list" → "Step 1: Pick your favorite dish" |',
        '| brand_positioning | Unique positioning (USP) | "AI assistant app" → "Your first personal AI assistant" |',
        '',
        'Headline must NEVER be a dry feature/category label. Always lead with outcome, action, pain relief, proof, curiosity, or positioning.',
        '',
        '### 4 subtitle pairing strategies — pick the best fit per copy_style_id (see catalog)',
        'Strategy A — Clarify the headline promise: explain the method, time box, or mechanism. (Headline: "Learn languages fast" → Subtitle: "Image-based memory drills, 5 min/day")',
        'Strategy B — Feature cluster: 2–3 short capabilities from THIS screen, comma- or middle-dot-separated — vivid nouns, not spec-sheet jargon. (Headline: "Edit video like a pro" → Subtitle: "Cut, add music, AI effects")',
        'Strategy C — Remove download barriers: free, no ads, no credit card — ONLY if explicitly stated in metadata; never invent.',
        `Strategy D — Sequential story: subtitle supports carousel position (#${order} of ${totalCount}); pairs with "Bước N"/"Step N" headline when using sequential_storytelling.`,
        '',
        'Subtitle pairing rules:',
        '- Each subtitle must use a DIFFERENT strategy than feels repetitive across the 8 variants when possible.',
        '- Strategy B is allowed in subtitle only — never as a boring headline feature dump.',
        '- Subtitle always adds information the headline does NOT already say.',
    ];
}

function buildEngagementCreativeLines(): string[] {
    return [
        '## Make it INTERESTING (non-negotiable — dull but truthful copy is still a FAIL)',
        'You are a top-tier creative copywriter for viral consumer apps — not a corporate brochure writer.',
        'Every variant must pass the thumb-stop test: would a real person pause mid-scroll and think "oh, that\'s for me"?',
        '',
        '### Techniques that create energy (use 1–2 per variant, stay truthful)',
        '- Concrete & sensory: name real objects on screen (buttons, streaks, charts, lessons) — not abstract "solutions".',
        '- Contrast in few words: "No X — still Y" / "Không X — vẫn Y" creates instant intrigue.',
        '- Micro-story: one line that implies before → after or struggle → relief tied to this screen.',
        '- Rhythm: short punchy headline + subtitle that adds a twist, proof, or "aha" — not a dry explanation.',
        '- Human voice: write like talking to one person on their phone — warm, direct, slightly bold.',
        '- Pattern interrupt: unexpected verb or angle within the copy_style_id device (still on-brand).',
        '- specificity beats vagueness: "15 phút" beats "nhanh chóng"; "ảnh trùng" beats "dọn dẹp bộ nhớ".',
        '',
        '### What makes copy BORING (reject these patterns)',
        '- Generic category labels: "learning app", "finance tracker", "productivity tool".',
        '- Feature dumps as headline: "Có streak, XP, badge" — features belong in subtitle (Strategy B) only, max 2–3 items from visible UI.',
        '- Parallel structure across all 8 variants — each must feel like a different creative angle, not 8 synonyms.',
        '- Subtitle that merely restates the headline in longer words.',
        '- Stiff, translated Vietnamese — vi must sound native, lively, and natural on the App Store, not like formal EN→VI.',
        '',
        '### Banned bland phrases (never use any):',
        BORING_COPY_BANNED_PHRASES.map((phrase) => `- "${phrase}"`).join('\n'),
        '',
        '### Quality bar before you output',
        '- Read all 8 headlines aloud — if any two sound interchangeable, rewrite until distinct.',
        '- At least half the headlines should create a small emotional spark (relief, pride, curiosity, urgency, delight).',
        '- Subtitle should add NEW information or texture — never echo the headline.',
    ];
}

type BuildHeadlineVariantsPromptInput = {
    appTitle: string;
    storeMetadata: StoreMetadata;
    template: StoreScreenshotTemplate;
    order: number;
    caption: string;
    totalCount: number;
};

function buildCopyStyleCatalogLines(): string[] {
    return COPY_STYLE_PRESETS.flatMap((preset) => [
        `- copy_style_id: ${preset.id} (${preset.label})`,
        `  Rhetorical device: ${preset.rhetoricalDevice}`,
        `  Guidance: ${preset.promptLine}`,
        `  ${SUBTITLE_STRATEGY_BY_STYLE[preset.id] ?? 'Subtitle: add new info — clarify, prove, or contextualize.'}`,
        `  Energy: push this style to feel alive on a store listing — vivid, specific, human; never bland or corporate.`,
        '',
    ]);
}

function buildVariantsJsonExample(): string {
    return JSON.stringify({
        ...buildDecorJsonExample(),
        variants: COPY_STYLE_PRESETS.map((preset) => ({
            copy_style_id: preset.id,
            headline: {
                [STORE_SCREENSHOT_PROMPT_LANG]: preset.exampleEn.headline,
                [STORE_SCREENSHOT_BULK_LANG]: preset.example.headline,
            },
            subtitle: {
                [STORE_SCREENSHOT_PROMPT_LANG]: preset.exampleEn.subtitle,
                [STORE_SCREENSHOT_BULK_LANG]: preset.example.subtitle,
            },
        })),
    }, null, 2);
}

export function buildHeadlineVariantsPrompt({
    appTitle,
    storeMetadata,
    template,
    order,
    caption,
    totalCount,
}: BuildHeadlineVariantsPromptInput): string {
    const visualPreset = STYLE_PRESETS.find(
        (item) => item.id === normalizeStylePresetId(template.style_preset),
    ) ?? STYLE_PRESETS[0];
    const captionLine = caption.trim()
        ? `Screen content (supplementary): ${caption.trim()}`
        : 'Screen content: (empty — infer one specific UI moment from the attached image)';

    const lines = [
        'You are a senior creative copywriter for App Store & Google Play screenshot carousels — your copy wins scroll-stops AND downloads.',
        '',
        '## Primary goal (non-negotiable)',
        'Maximize user attraction and download intent. Each headline/subtitle pair must hook within 3 seconds and earn the swipe to the next screenshot.',
        'Two equal gates — BOTH must pass: (A) TRUTHFUL to this app and screen, (B) INTERESTING enough to stop the scroll. Safe, bland, corporate copy is unacceptable even if factually correct.',
        'Priority order: (1) truthfulness to metadata + visible UI; (2) thumb-stop energy & vivid specificity; (3) match copy_style_id rhetorical device; (4) match shared visual template voice.',
        'Never invent user counts, rankings, awards, discounts, "top 1", "first in the world", or time-limited offers unless explicitly stated in metadata.',
        'Catalog examples below are ENERGY references — match their punch and personality for this app, do not copy wording verbatim.',
        'Never write dry feature lists as headlines, internal jargon, or generic filler. Comma-separated features are OK in subtitle only (Strategy B, max 2–3 items).',
        '',
        '## Attached screenshot image (critical)',
        'A screenshot image is attached to this message. READ the image carefully — identify the main UI, labels, icons, and user moment on screen.',
        'Every variant MUST reference something concrete visible in the image (or the clear user action shown).',
        'The text description below is supplementary — if it conflicts with the image, trust the image.',
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
        '## Shared visual template — copy voice (mandatory for ALL variants)',
        `User selected image style: ${visualPreset.label}`,
        ...buildVisualCopyVoiceLines(template),
        '',
        '## This screenshot',
        `Listing position: screenshot #${order} of ${totalCount}`,
        captionLine,
        getScreenshotPositionHint(order, totalCount),
        '',
        '## Truthfulness checklist (apply to EVERY variant)',
        '- Headline/subtitle must describe what THIS app actually does on THIS screen — not a generic app in the same category.',
        '- If metadata lacks numbers (users, %, rank, price), use qualitative benefits instead of fake stats.',
        '- sequential_storytelling: step number must match screenshot position when using "Step N:" / "Bước N:".',
        '- social_proof_numbers & curiosity_fomo: extra strict — no fabricated proof or scarcity.',
        '- Strategy C (free/no ads): only when metadata explicitly states it.',
        '',
        ...buildAsoConversionFrameworkLines(order, totalCount),
        '',
        ...buildEngagementCreativeLines(),
        '',
        '## Copy style catalog — write ONE variant per copy_style_id below',
        'Each variant must use a DIFFERENT rhetorical device AND a DIFFERENT emotional angle. Do not reuse the same headline opening across variants.',
        'Push each style to its creative extreme while staying truthful — benefit_centric should feel rewarding, pain_point_solver should feel relieving, curiosity_fomo should feel irresistible, etc.',
        '',
        ...buildCopyStyleCatalogLines(),
        ...buildDecorSuggestionPromptLines(template.brand_color),
        '## Task',
        `Write headline + subtitle for screenshot #${order} in ALL ${COPY_STYLE_PRESETS.length} copy_style_id styles listed above.`,
        'Each style must sound noticeably different while matching the shared visual template voice.',
        '',
        '### Language (strict — both required per field)',
        `- headline.${STORE_SCREENSHOT_PROMPT_LANG} and subtitle.${STORE_SCREENSHOT_PROMPT_LANG}: English — PRIMARY, used in AI image prompts.`,
        `- headline.${STORE_SCREENSHOT_BULK_LANG} and subtitle.${STORE_SCREENSHOT_BULK_LANG}: Vietnamese — faithful, natural, same meaning as English.`,
        '- Do not output other language keys. Do not use flat strings — always nested objects with both en and vi.',
        '',
        '### Headline rules',
        '- Max ~8 words for headline.en; punchy, vivid, scroll-stopping — prefer strong verbs and concrete nouns over adjectives.',
        '- Headline must reference visible screen content from the attached image AND align with app metadata (name, description, keywords).',
        `- ALL copy must sound like it belongs on a "${visualPreset.label}" visual — but never sacrifice personality for politeness.`,
        '- If a copy style example mentions numbers or superlatives, adapt or omit them unless metadata supports them for this app.',
        '- Vietnamese headline (vi): colloquial App Store tone — short, rhythmic, memorable; avoid stiff Sino-Vietnamese or bureaucratic phrasing.',
        '',
        '### Subtitle rules (ASO pairing)',
        '- One supporting line; pick Strategy A, B, C, or D per copy_style_id guidance in the catalog above.',
        '- Strategy A (clarify): answer "how does the app do what the headline promises?" using visible UI or metadata.',
        '- Strategy B (feature cluster): 2–3 comma-separated capabilities from THIS screen — e.g. "Cắt ghép, chèn nhạc, hiệu ứng AI" / "Cut, add music, AI effects".',
        '- Strategy C (barrier removal): "Free, no ads" / "Miễn phí, không quảng cáo" — metadata only.',
        '- Strategy D (sequential): contextualize this screenshot\'s role in the user journey when order matters.',
        '- Never repeat headline verbatim; subtitle can be slightly longer than headline when it delivers the "how" or proof beat.',
        '- Vietnamese subtitle (vi): natural App Store rhythm; comma clusters should feel snappy, not like a spec sheet.',
        '',
        '## Output format (strict)',
        'Return ONLY a raw JSON object. No markdown fences, no explanation, no extra keys.',
        `Root object must include decor fields AND "variants" array with exactly ${COPY_STYLE_PRESETS.length} objects.`,
        'Schema:',
        '{ "background_pattern": "<id>", "floating_icons_enabled": true, "icons": ["..."], "background_motifs": ["..."], "variants": [ ... ] }',
        'Optional root key: "background_color": "#RRGGBB" — only when distinct from template brand; omit otherwise.',
        '',
        'Rules:',
        '- background_pattern: required, one allowed id from decor catalog.',
        '- background_color: optional — include ONLY a hex (#RRGGBB) sampled from screenshot that differs from template brand_color; NEVER echo brand color; omit when template brand is enough.',
        '- floating_icons_enabled: required boolean; if false, icons must be [].',
        '- icons: array of 0–3 strings; embed icon style in each string.',
        '- background_motifs: array of 0–6 strings; if background_pattern is "none", must be [].',
        `- Each copy_style_id must be unique and one of: ${COPY_STYLE_PRESETS.map((p) => p.id).join(', ')}.`,
        `- headline and subtitle must be objects with BOTH keys "${STORE_SCREENSHOT_PROMPT_LANG}" and "${STORE_SCREENSHOT_BULK_LANG}".`,
        '- All string values must be plain text (no line breaks inside values).',
        '',
        'Example shape (tone reference only — write fresh copy for this app and image):',
        buildVariantsJsonExample(),
    ];

    return lines.filter((line) => line !== '').join('\n');
}

export function buildHeadlineVariantsJsonPlaceholder(): string {
    return JSON.stringify({
        ...buildDecorJsonExample(),
        variants: COPY_STYLE_PRESETS.map((preset) => ({
            copy_style_id: preset.id,
            headline: {
                [STORE_SCREENSHOT_PROMPT_LANG]: preset.exampleEn.headline,
                [STORE_SCREENSHOT_BULK_LANG]: preset.example.headline,
            },
            subtitle: {
                [STORE_SCREENSHOT_PROMPT_LANG]: preset.exampleEn.subtitle,
                [STORE_SCREENSHOT_BULK_LANG]: preset.example.subtitle,
            },
        })),
    }, null, 2);
}
