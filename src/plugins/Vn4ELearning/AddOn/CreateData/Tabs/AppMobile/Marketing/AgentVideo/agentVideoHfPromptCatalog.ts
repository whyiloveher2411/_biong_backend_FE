export type HfPromptTypeKey =
    | 'cinematic-title'
    | 'kinetic-type'
    | 'social-reel'
    | 'data-story'
    | 'product-reveal'
    | 'lower-third-overlay'
    | 'sting-transition'
    | 'premium-spot'
    | 'universal-composer';

export type HfPromptCatalogItem = {
    key: HfPromptTypeKey;
    label: string;
};

export const HF_PROMPT_CATALOG: HfPromptCatalogItem[] = [
    { key: 'cinematic-title', label: 'Cinematic title' },
    { key: 'kinetic-type', label: 'Kinetic type' },
    { key: 'social-reel', label: 'Social reel' },
    { key: 'data-story', label: 'Data story' },
    { key: 'product-reveal', label: 'Product reveal' },
    { key: 'lower-third-overlay', label: 'Lower third overlay' },
    { key: 'sting-transition', label: 'Sting transition' },
    { key: 'premium-spot', label: 'Premium spot' },
    { key: 'universal-composer', label: 'Universal composer' },
];

export const DEFAULT_HF_PROMPT_TYPE: HfPromptTypeKey = 'universal-composer';

const templateCache: Partial<Record<HfPromptTypeKey, string>> = {};

function resolvePromptPublicUrl(key: HfPromptTypeKey): string {
    const publicUrl = String(process.env.PUBLIC_URL || '').replace(/\/$/, '');
    return `${publicUrl}/hyperframes-prompts/${key}.md`;
}

export function isHfPromptTypeKey(key: string): key is HfPromptTypeKey {
    return HF_PROMPT_CATALOG.some((entry) => entry.key === key);
}

export async function loadHfPromptTemplate(key: string): Promise<string> {
    const normalized: HfPromptTypeKey = isHfPromptTypeKey(key) ? key : DEFAULT_HF_PROMPT_TYPE;
    const cached = templateCache[normalized];
    if (cached) {
        return cached;
    }

    const url = resolvePromptPublicUrl(normalized);
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`Không tải được template HyperFrames (${normalized}) — HTTP ${response.status}`);
    }

    const text = (await response.text()).trim();
    if (!text) {
        throw new Error(`Template HyperFrames (${normalized}) rỗng`);
    }

    templateCache[normalized] = text;
    return text;
}
