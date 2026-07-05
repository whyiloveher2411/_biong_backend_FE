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
    /** Giải thích ngắn cho user chọn phong cách */
    descriptionVi: string;
};

export const HF_PROMPT_CATALOG: HfPromptCatalogItem[] = [
    {
        key: 'cinematic-title',
        label: 'Cinematic title',
        descriptionVi: 'Tiêu đề hoành tráng kiểu điện ảnh — chữ lớn, ánh sáng dramatic',
    },
    {
        key: 'kinetic-type',
        label: 'Kinetic type',
        descriptionVi: 'Chữ chuyển động theo nhịp — typography động, năng lượng cao',
    },
    {
        key: 'social-reel',
        label: 'Social reel',
        descriptionVi: 'Video ngắn mạng xã hội — nhanh, bắt mắt, dọc 9:16',
    },
    {
        key: 'data-story',
        label: 'Data story',
        descriptionVi: 'Kể chuyện bằng số liệu — biểu đồ, counter, infographic',
    },
    {
        key: 'product-reveal',
        label: 'Product reveal',
        descriptionVi: 'Giới thiệu sản phẩm — zoom, highlight, spotlight',
    },
    {
        key: 'lower-third-overlay',
        label: 'Lower third overlay',
        descriptionVi: 'Chú thích góc dưới — tên, vai trò, thông tin phụ',
    },
    {
        key: 'sting-transition',
        label: 'Sting transition',
        descriptionVi: 'Chuyển cảnh ngắn — logo, wipe, bridge giữa các đoạn',
    },
    {
        key: 'premium-spot',
        label: 'Premium spot',
        descriptionVi: 'Quảng cáo cao cấp — gradient, glow, cảm giác sang trọng',
    },
    {
        key: 'universal-composer',
        label: 'Universal composer',
        descriptionVi: 'Đa năng — agent tự chọn layout phù hợp từng beat',
    },
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
