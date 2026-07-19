import { getAccessToken } from 'store/user/user.reducers';
import { getAdminApiPrefix, getApiHost } from 'helpers/apiHost';
import { getLanguage } from 'helpers/i18n';
import { convertToURL } from 'helpers/url';
import {
    openExternalTabViaExtension,
    queryAvatarAssetGeminiEnabled,
    waitForExtensionReady,
} from 'helpers/openExternalTabViaExtension';
import { copyTextToClipboard } from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/StoreScreenshots/storeScreenshotClipboard';
import { encodeExternalImageUrl } from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/StoreScreenshots/storeScreenshotImageUtils';

const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/0/app?pageId=none';

const AVATAR_PROMPT_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/get-prompt';

const AVATAR_UPLOAD_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/upload-asset';

const AVATAR_LIST_SPRITES_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/list-sprites';

const AVATAR_BUILD_ASSETS_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/build-assets';

const AVATAR_BUILD_DEMO_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/build-demo';

const AVATAR_DEMO_FILE_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/demo-file';

const AVATAR_SAVE_COMPOSITE_HINTS_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/save-composite-hints';

const AVATAR_SPRITE_FILE_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/sprite-file';

const AVATAR_LAYOUT_PANELS_API =
    'plugin/vn4-e-learning/app-mobile/marketing/short-video/avatar/layout-panels';

export const AVATAR_SLICE_ASSET_KEYS = [
    'master',
    'base_face',
    'eyes_open',
    'eyes_half_blink',
    'eyes_closed_blink',
    'mouth_x',
    'mouth_a',
    'mouth_b',
    'mouth_c',
    'mouth_d',
    'mouth_e',
    'mouth_f',
    'mouth_g',
] as const;

export type AvatarSliceAssetKey = (typeof AVATAR_SLICE_ASSET_KEYS)[number];

export type AvatarPanelRect = { x: number; y: number; w: number; h: number };

export type AvatarPanelsMap = Partial<Record<AvatarSliceAssetKey, AvatarPanelRect>>;

export const AVATAR_SLICE_FIELD_LABELS: Record<AvatarSliceAssetKey, string> = {
    master: '01 Master (avatar)',
    base_face: '01b Base face',
    eyes_open: 'Eyes open',
    eyes_half_blink: 'Eyes half blink',
    eyes_closed_blink: 'Eyes closed blink',
    mouth_x: 'Mouth X (rest)',
    mouth_a: 'Mouth A',
    mouth_b: 'Mouth B',
    mouth_c: 'Mouth C',
    mouth_d: 'Mouth D',
    mouth_e: 'Mouth E',
    mouth_f: 'Mouth F',
    mouth_g: 'Mouth G',
};

export type ShortVideoAvatarPromptResponse = {
    success?: boolean;
    step?: string;
    title?: string;
    prompt?: string;
    field?: string | null;
    stores_image?: boolean;
    needs_master?: boolean;
    message?: { content?: string } | string;
};

function parseApiMessage(res: unknown, fallback: string): string {
    if (!res || typeof res !== 'object') {
        return fallback;
    }
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string' && r.message.trim()) {
        return r.message;
    }
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return String(r.message.content);
    }
    return fallback;
}

export async function fetchShortVideoAvatarPrompt(step: string): Promise<ShortVideoAvatarPromptResponse> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(convertToURL(getAdminApiPrefix(), AVATAR_PROMPT_API), {
        method: 'POST',
        headers,
        body: JSON.stringify({
            step,
            __l: window.btoa(`${getLanguage().code}#${Date.now()}`),
        }),
    });

    const result = (await response.json()) as ShortVideoAvatarPromptResponse;
    if (!result?.success) {
        throw new Error(parseApiMessage(result, 'Không lấy được prompt'));
    }
    if (!String(result.prompt || '').trim()) {
        throw new Error('Prompt trống');
    }
    return result;
}

export function buildShortVideoAvatarGeminiUrl(input: {
    avatarId: number;
    step: string;
    field?: string | null;
    masterImageUrl?: string;
}): string {
    const url = new URL(GEMINI_WEB_APP_URL);
    const accessToken = getAccessToken() ?? '';
    const hashParams = new URLSearchParams({
        copy_avatar_asset_gemini: '1',
        avatar_asset_fill_only: '1',
        avatar_asset_prompt_from_clipboard: '1',
        store_screenshot_fill_only: '1',
        store_screenshot_prompt_from_clipboard: '1',
        app_mobile: '0',
        avatar_id: String(input.avatarId),
        avatar_asset_step: String(input.step),
        screenshot_id: `avatar-${input.avatarId}-${input.step}`,
        avatar_asset_open_nonce: String(Date.now()),
        store_screenshot_open_nonce: String(Date.now()),
        store_screenshot_uses_logo: '0',
        cms_api_host: getApiHost(),
    });

    const field = String(input.field || '').trim();
    if (field) {
        hashParams.set('avatar_asset_field', field);
    }

    if (accessToken) {
        hashParams.set('access_token', accessToken);
    }

    const masterImageUrl = String(input.masterImageUrl || '').trim();
    if (masterImageUrl) {
        const encoded = encodeExternalImageUrl(masterImageUrl);
        hashParams.set('store_screenshot_source_url', encoded);
        hashParams.set('avatar_asset_source_url', encoded);
    }

    url.hash = hashParams.toString();
    return url.toString();
}

export async function openShortVideoAvatarGemini(input: {
    avatarId: number;
    step: string;
    prompt: string;
    field?: string | null;
    masterImageUrl?: string;
}): Promise<void> {
    const prompt = String(input.prompt || '').trim();
    if (!prompt) {
        throw new Error('Prompt trống');
    }

    const extensionReady = await waitForExtensionReady(8000);
    if (!extensionReady) {
        throw new Error(
            'Chưa phát hiện extension Chrome trên tab CMS này. Hãy reload extension, F5 trang CMS, rồi thử lại.',
        );
    }

    const toggleEnabled = await queryAvatarAssetGeminiEnabled(4000);
    if (!toggleEnabled) {
        throw new Error(
            'Hãy bật "Avatar asset Gemini" trong extension (nhóm Marketing) rồi thử lại.',
        );
    }

    await copyTextToClipboard(prompt);
    await new Promise((resolve) => window.setTimeout(resolve, 120));

    const geminiUrl = buildShortVideoAvatarGeminiUrl({
        avatarId: input.avatarId,
        step: input.step,
        field: input.field,
        masterImageUrl: input.masterImageUrl,
    });

    openExternalTabViaExtension(geminiUrl);
}

export async function uploadShortVideoAvatarAsset(input: {
    avatarId: number;
    field: string;
    file: File;
}): Promise<{
    success?: boolean;
    url?: string;
    media?: JsonFormat;
    post?: JsonFormat;
    message?: { content?: string } | string;
}> {
    const formData = new FormData();
    formData.append('avatar_id', String(input.avatarId));
    formData.append('id', String(input.avatarId));
    formData.append('field', input.field);
    formData.append('image', input.file);
    formData.append('__l', window.btoa(`${getLanguage().code}#${Date.now()}`));

    const headers: Record<string, string> = { Accept: 'application/json' };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(convertToURL(getAdminApiPrefix(), AVATAR_UPLOAD_API), {
        method: 'POST',
        headers,
        body: formData,
    });

    const result = (await response.json()) as {
        success?: boolean;
        url?: string;
        media?: JsonFormat;
        post?: JsonFormat;
        message?: { content?: string } | string;
    };

    if (!result?.success) {
        throw new Error(parseApiMessage(result, 'Upload thất bại'));
    }

    return result;
}

async function postAvatarJsonApi<T extends { success?: boolean; message?: { content?: string } | string }>(
    apiPath: string,
    body: Record<string, unknown>,
    fallbackError: string,
): Promise<T> {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    };
    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(convertToURL(getAdminApiPrefix(), apiPath), {
        method: 'POST',
        headers,
        body: JSON.stringify({
            ...body,
            __l: window.btoa(`${getLanguage().code}#${Date.now()}`),
        }),
    });

    const result = (await response.json()) as T;
    if (!result?.success) {
        throw new Error(parseApiMessage(result, fallbackError));
    }
    return result;
}

export type ShortVideoAvatarSpriteItem = {
    name: string;
    size: number;
};

export async function listShortVideoAvatarSprites(): Promise<{
    sprites: ShortVideoAvatarSpriteItem[];
    images_dir?: string;
}> {
    const result = await postAvatarJsonApi<{
        success?: boolean;
        sprites?: ShortVideoAvatarSpriteItem[];
        images_dir?: string;
        message?: { content?: string } | string;
    }>(AVATAR_LIST_SPRITES_API, {}, 'Không liệt kê được sprite');

    return {
        sprites: Array.isArray(result.sprites) ? result.sprites : [],
        images_dir: result.images_dir,
    };
}

/** Keys chỉnh trong editor composite (không gồm master/base_face). */
export const AVATAR_COMPOSITE_EYE_KEYS = [
    'eyes_open',
    'eyes_half_blink',
    'eyes_closed_blink',
] as const;

export const AVATAR_COMPOSITE_MOUTH_KEYS = [
    'mouth_x',
    'mouth_a',
    'mouth_b',
    'mouth_c',
    'mouth_d',
    'mouth_e',
    'mouth_f',
    'mouth_g',
] as const;

export const AVATAR_COMPOSITE_STATE_KEYS = [
    ...AVATAR_COMPOSITE_EYE_KEYS,
    ...AVATAR_COMPOSITE_MOUTH_KEYS,
] as const;

export type AvatarCompositeEyeKey = (typeof AVATAR_COMPOSITE_EYE_KEYS)[number];
export type AvatarCompositeMouthKey = (typeof AVATAR_COMPOSITE_MOUTH_KEYS)[number];
export type AvatarCompositeStateKey = (typeof AVATAR_COMPOSITE_STATE_KEYS)[number];

/** Transform 1 state (hoặc default part). */
export type AvatarCompositeStateTransform = {
    anchor_x_ratio: number;
    anchor_y_ratio: number;
    scale_to_face_width: number;
    offset_x_px: number;
    offset_y_px: number;
    relative_to?: string;
};

export type AvatarCompositePartHints = AvatarCompositeStateTransform & {
    by_state?: Partial<Record<AvatarCompositeStateKey, AvatarCompositeStateTransform>>;
};

export type AvatarCompositeHints = {
    version?: number;
    eyes: AvatarCompositePartHints;
    mouth: AvatarCompositePartHints;
    head_width_px?: number;
    content_bbox?: unknown;
    calibrated_from?: string;
};

export const DEFAULT_AVATAR_COMPOSITE_STATE: AvatarCompositeStateTransform = {
    anchor_x_ratio: 0.5,
    anchor_y_ratio: 0.3,
    scale_to_face_width: 0.37,
    offset_x_px: 0,
    offset_y_px: 60,
    relative_to: 'content_bbox',
};

export const DEFAULT_AVATAR_COMPOSITE_HINTS: AvatarCompositeHints = {
    version: 2,
    eyes: {
        anchor_x_ratio: 0.5,
        anchor_y_ratio: 0.3,
        scale_to_face_width: 0.37,
        offset_x_px: 0,
        offset_y_px: 60,
        relative_to: 'content_bbox',
        by_state: {},
    },
    mouth: {
        anchor_x_ratio: 0.5,
        anchor_y_ratio: 0.56,
        scale_to_face_width: 0.17,
        offset_x_px: 0,
        offset_y_px: 40,
        relative_to: 'content_bbox',
        by_state: {},
    },
};

function asFiniteNumber(value: unknown, fallback: number): number {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function cloneStateTransform(t: AvatarCompositeStateTransform): AvatarCompositeStateTransform {
    return {
        anchor_x_ratio: t.anchor_x_ratio,
        anchor_y_ratio: t.anchor_y_ratio,
        scale_to_face_width: t.scale_to_face_width,
        offset_x_px: t.offset_x_px,
        offset_y_px: t.offset_y_px,
        relative_to: t.relative_to || 'content_bbox',
    };
}

function parseStateTransform(
    raw: Record<string, unknown> | null | undefined,
    fallback: AvatarCompositeStateTransform,
): AvatarCompositeStateTransform {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
        anchor_x_ratio: asFiniteNumber(src.anchor_x_ratio, fallback.anchor_x_ratio),
        anchor_y_ratio: asFiniteNumber(src.anchor_y_ratio, fallback.anchor_y_ratio),
        scale_to_face_width: asFiniteNumber(src.scale_to_face_width, fallback.scale_to_face_width),
        offset_x_px: Math.round(asFiniteNumber(src.offset_x_px, fallback.offset_x_px)),
        offset_y_px: Math.round(asFiniteNumber(src.offset_y_px, fallback.offset_y_px)),
        relative_to: String(src.relative_to || fallback.relative_to || 'content_bbox'),
    };
}

function partDefaults(part: 'eyes' | 'mouth'): AvatarCompositeStateTransform {
    const d = DEFAULT_AVATAR_COMPOSITE_HINTS[part];
    return cloneStateTransform(d);
}

/** Seed đủ by_state từ default part (migrate v1 → v2). */
export function seedAvatarCompositeByState(
    hints: AvatarCompositeHints,
): AvatarCompositeHints {
    const eyesBase = parseStateTransform(hints.eyes as unknown as Record<string, unknown>, partDefaults('eyes'));
    const mouthBase = parseStateTransform(hints.mouth as unknown as Record<string, unknown>, partDefaults('mouth'));
    const eyesBy: Partial<Record<AvatarCompositeStateKey, AvatarCompositeStateTransform>> = {
        ...(hints.eyes.by_state || {}),
    };
    const mouthBy: Partial<Record<AvatarCompositeStateKey, AvatarCompositeStateTransform>> = {
        ...(hints.mouth.by_state || {}),
    };
    for (const key of AVATAR_COMPOSITE_EYE_KEYS) {
        eyesBy[key] = parseStateTransform(
            eyesBy[key] as unknown as Record<string, unknown>,
            eyesBase,
        );
    }
    for (const key of AVATAR_COMPOSITE_MOUTH_KEYS) {
        mouthBy[key] = parseStateTransform(
            mouthBy[key] as unknown as Record<string, unknown>,
            mouthBase,
        );
    }
    return {
        ...hints,
        version: 2,
        eyes: { ...eyesBase, by_state: eyesBy },
        mouth: { ...mouthBase, by_state: mouthBy },
    };
}

/** Resolve transform cho 1 state (by_state → part default → system default). */
export function resolveAvatarCompositeState(
    hints: AvatarCompositeHints,
    stateKey: AvatarCompositeStateKey,
): AvatarCompositeStateTransform {
    const part: 'eyes' | 'mouth' = stateKey.startsWith('eyes_') ? 'eyes' : 'mouth';
    const seeded = seedAvatarCompositeByState(hints);
    const fromState = seeded[part].by_state?.[stateKey];
    if (fromState) {
        return cloneStateTransform(fromState);
    }
    return cloneStateTransform(seeded[part]);
}

export function updateAvatarCompositeState(
    hints: AvatarCompositeHints,
    stateKey: AvatarCompositeStateKey,
    patch: Partial<AvatarCompositeStateTransform>,
): AvatarCompositeHints {
    const seeded = seedAvatarCompositeByState(hints);
    const part: 'eyes' | 'mouth' = stateKey.startsWith('eyes_') ? 'eyes' : 'mouth';
    const current = resolveAvatarCompositeState(seeded, stateKey);
    const next = { ...current, ...patch };
    if (patch.offset_x_px != null) {
        next.offset_x_px = Math.round(patch.offset_x_px);
    }
    if (patch.offset_y_px != null) {
        next.offset_y_px = Math.round(patch.offset_y_px);
    }
    return {
        ...seeded,
        [part]: {
            ...seeded[part],
            by_state: {
                ...seeded[part].by_state,
                [stateKey]: next,
            },
        },
    };
}

function emptyHintsClone(): AvatarCompositeHints {
    return seedAvatarCompositeByState({
        version: 2,
        eyes: { ...DEFAULT_AVATAR_COMPOSITE_HINTS.eyes, by_state: {} },
        mouth: { ...DEFAULT_AVATAR_COMPOSITE_HINTS.mouth, by_state: {} },
    });
}

/** Parse field CMS (object | JSON string) → hints chuẩn v2 (có by_state). */
export function parseAvatarCompositeHints(raw: unknown): AvatarCompositeHints {
    let data: unknown = raw;
    if (typeof raw === 'string') {
        const trim = raw.trim();
        if (!trim) {
            return emptyHintsClone();
        }
        try {
            data = JSON.parse(trim);
        } catch {
            return emptyHintsClone();
        }
    }
    if (!data || typeof data !== 'object') {
        return emptyHintsClone();
    }
    const obj = data as Record<string, unknown>;
    const eyesIn = (obj.eyes && typeof obj.eyes === 'object' ? obj.eyes : {}) as Record<string, unknown>;
    const mouthIn = (obj.mouth && typeof obj.mouth === 'object' ? obj.mouth : {}) as Record<string, unknown>;
    const eyesBase = parseStateTransform(eyesIn, partDefaults('eyes'));
    const mouthBase = parseStateTransform(mouthIn, partDefaults('mouth'));
    const eyesByRaw =
        eyesIn.by_state && typeof eyesIn.by_state === 'object'
            ? (eyesIn.by_state as Record<string, unknown>)
            : {};
    const mouthByRaw =
        mouthIn.by_state && typeof mouthIn.by_state === 'object'
            ? (mouthIn.by_state as Record<string, unknown>)
            : {};
    const eyesBy: Partial<Record<AvatarCompositeStateKey, AvatarCompositeStateTransform>> = {};
    const mouthBy: Partial<Record<AvatarCompositeStateKey, AvatarCompositeStateTransform>> = {};
    for (const key of AVATAR_COMPOSITE_EYE_KEYS) {
        const row = eyesByRaw[key];
        eyesBy[key] = parseStateTransform(
            row && typeof row === 'object' ? (row as Record<string, unknown>) : null,
            eyesBase,
        );
    }
    for (const key of AVATAR_COMPOSITE_MOUTH_KEYS) {
        const row = mouthByRaw[key];
        mouthBy[key] = parseStateTransform(
            row && typeof row === 'object' ? (row as Record<string, unknown>) : null,
            mouthBase,
        );
    }
    const out: AvatarCompositeHints = {
        version: 2,
        eyes: { ...eyesBase, by_state: eyesBy },
        mouth: { ...mouthBase, by_state: mouthBy },
    };
    if (Object.prototype.hasOwnProperty.call(obj, 'head_width_px')) {
        out.head_width_px = asFiniteNumber(obj.head_width_px, 0) || undefined;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'content_bbox')) {
        out.content_bbox = obj.content_bbox;
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'calibrated_from')) {
        out.calibrated_from = String(obj.calibrated_from || '');
    }
    return out;
}

export async function buildShortVideoAvatarAssets(input: {
    avatarId: number;
    sourceFile: string;
    panels: Record<string, AvatarPanelRect>;
}): Promise<{
    post_id?: string;
    source?: string;
    export_dir?: string;
    asset_count?: number;
    fields_synced?: string[];
    fields_failed?: Array<{ field: string; error?: string }>;
    post?: JsonFormat;
    composite_hints?: AvatarCompositeHints;
    detect_mode?: string;
    message?: { content?: string } | string;
}> {
    return postAvatarJsonApi(
        AVATAR_BUILD_ASSETS_API,
        {
            avatar_id: input.avatarId,
            id: input.avatarId,
            sourceFile: input.sourceFile,
            panels: input.panels,
        },
        'Build asset thất bại',
    );
}

export async function fetchShortVideoAvatarSpriteFile(input: {
    sourceFile: string;
}): Promise<{
    name: string;
    width: number;
    height: number;
    data_url: string;
    template_panels?: AvatarPanelsMap;
}> {
    const result = await postAvatarJsonApi<{
        success?: boolean;
        name?: string;
        width?: number;
        height?: number;
        data_url?: string;
        template_panels?: AvatarPanelsMap;
        message?: { content?: string } | string;
    }>(
        AVATAR_SPRITE_FILE_API,
        { sourceFile: input.sourceFile, source: input.sourceFile },
        'Không tải được sprite',
    );
    if (!result.data_url || !result.width || !result.height) {
        throw new Error('Sprite thiếu data_url / kích thước');
    }
    return {
        name: String(result.name || input.sourceFile),
        width: Number(result.width),
        height: Number(result.height),
        data_url: String(result.data_url),
        template_panels: result.template_panels,
    };
}

export async function fetchShortVideoAvatarLayoutPanels(input: {
    avatarId: number;
}): Promise<{
    panels: AvatarPanelsMap | null;
    source?: string | null;
    detect_mode?: string | null;
}> {
    const result = await postAvatarJsonApi<{
        success?: boolean;
        panels?: AvatarPanelsMap | null;
        source?: string | null;
        detect_mode?: string | null;
        message?: { content?: string } | string;
    }>(
        AVATAR_LAYOUT_PANELS_API,
        { avatar_id: input.avatarId, id: input.avatarId },
        'Không đọc được layout panels',
    );
    return {
        panels: result.panels && typeof result.panels === 'object' ? result.panels : null,
        source: result.source ?? null,
        detect_mode: result.detect_mode ?? null,
    };
}

export async function buildShortVideoAvatarDemo(input: {
    avatarId: number;
    compositeHints?: AvatarCompositeHints;
    /** true = ghi draft FE vào DB rồi build (Demo ngay trong editor). false/omit = chỉ đọc DB đã Lưu. */
    preferClientHints?: boolean;
}): Promise<{
    post_id?: string;
    demo_url?: string;
    demo_path?: string;
    demo_version?: number;
    combo_count?: number;
    frame_count?: number;
    composite_hints?: AvatarCompositeHints;
    hints_source?: string;
    applied_eyes_closed_blink?: AvatarCompositeStateTransform;
    applied_mouth_x?: AvatarCompositeStateTransform;
    post?: JsonFormat;
    message?: { content?: string } | string;
}> {
    const body: Record<string, unknown> = {
        avatar_id: input.avatarId,
        id: input.avatarId,
    };
    if (input.preferClientHints && input.compositeHints) {
        const seeded = seedAvatarCompositeByState(input.compositeHints);
        body.prefer_client_hints = 1;
        body.composite_hints = seeded;
        body.composite_hints_json = JSON.stringify(seeded);
    }
    return postAvatarJsonApi(AVATAR_BUILD_DEMO_API, body, 'Build demo thất bại');
}

export async function saveShortVideoAvatarCompositeHints(input: {
    avatarId: number;
    compositeHints: AvatarCompositeHints;
}): Promise<{
    post_id?: string;
    composite_hints?: AvatarCompositeHints;
    post?: JsonFormat;
    message?: { content?: string } | string;
}> {
    const seeded = seedAvatarCompositeByState(input.compositeHints);
    return postAvatarJsonApi(
        AVATAR_SAVE_COMPOSITE_HINTS_API,
        {
            avatar_id: input.avatarId,
            id: input.avatarId,
            composite_hints: seeded,
            composite_hints_json: JSON.stringify(seeded),
        },
        'Lưu composite hints thất bại',
    );
}

export async function fetchShortVideoAvatarDemoFile(input: {
    avatarId: number;
}): Promise<{ demo_url?: string; demo_path?: string; demo_version?: number }> {
    const result = await postAvatarJsonApi<{
        success?: boolean;
        demo_url?: string;
        demo_path?: string;
        demo_version?: number;
        message?: { content?: string } | string;
    }>(
        AVATAR_DEMO_FILE_API,
        {
            avatar_id: input.avatarId,
            id: input.avatarId,
        },
        'Chưa có demo video',
    );
    return {
        demo_url: result.demo_url,
        demo_path: result.demo_path,
        demo_version: result.demo_version,
    };
}
