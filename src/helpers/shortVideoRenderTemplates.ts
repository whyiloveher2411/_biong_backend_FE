import {
    type ShortVideoManifestSceneLayout,
    type ShortVideoRenderManifest,
    SHORT_VIDEO_DEFAULT_SCENE_GAP_SEC,
} from './shortVideoRenderManifestTypes';

export type ShortVideoTemplateApplyMode = 'replace_all_scenes' | 'keep_scene_overrides';

export type ShortVideoRenderTemplate = {
    id: string;
    label: string;
    description: string;
    style: ShortVideoRenderManifest['style'];
    text_profile: ShortVideoRenderManifest['text_profile'];
    scene_gap_sec?: number;
    defaultSceneLayout: ShortVideoManifestSceneLayout;
};

export const SHORT_VIDEO_RENDER_TEMPLATES: ShortVideoRenderTemplate[] = [
    {
        id: 'classic',
        label: 'Cổ điển',
        description: 'Nền đen, chữ trắng, highlight đỏ — mặc định TikTok tin tức.',
        style: {
            bg: '#000000',
            text: '#FFFFFF',
            active: '#E53935',
            reveal: 'progressive',
        },
        text_profile: {
            font_size: 48,
            max_lines: 3,
            text_box_height: 480,
            bottom_padding: 280,
        },
        scene_gap_sec: SHORT_VIDEO_DEFAULT_SCENE_GAP_SEC,
        defaultSceneLayout: {
            headline_top: 180,
            headline_font_size: 56,
            show_headline: true,
            show_karaoke: true,
            show_visual: true,
            visual_motion: 'pop',
        },
    },
    {
        id: 'news',
        label: 'Tin tức',
        description: 'Tông tối chuyên nghiệp, tiêu đề cao, phù hợp bản tin nhanh.',
        style: {
            bg: '#0B0B0F',
            text: '#FFFFFF',
            active: '#FF3B30',
            reveal: 'progressive',
        },
        text_profile: {
            font_size: 48,
            max_lines: 3,
            text_box_height: 480,
            bottom_padding: 280,
        },
        scene_gap_sec: SHORT_VIDEO_DEFAULT_SCENE_GAP_SEC,
        defaultSceneLayout: {
            headline_top: 160,
            headline_font_size: 56,
            show_headline: true,
            show_karaoke: true,
            show_visual: true,
            visual_motion: 'pop',
        },
    },
    {
        id: 'quote',
        label: 'Quote',
        description: 'Nền tím than, chữ sáng, tiêu đề lớn giữa màn — trích dẫn / insight.',
        style: {
            bg: '#1A1A2E',
            text: '#F5F5F5',
            active: '#FFB800',
            reveal: 'progressive',
        },
        text_profile: {
            font_size: 52,
            max_lines: 3,
            text_box_height: 400,
            bottom_padding: 320,
        },
        scene_gap_sec: SHORT_VIDEO_DEFAULT_SCENE_GAP_SEC,
        defaultSceneLayout: {
            headline_top: 420,
            headline_font_size: 64,
            show_headline: true,
            show_karaoke: true,
            show_visual: false,
            visual_motion: 'fade',
        },
    },
    {
        id: 'brand-light',
        label: 'Sáng',
        description: 'Nền trắng, chữ tối — phong cách sạch, dễ đọc ban ngày.',
        style: {
            bg: '#F5F5F7',
            text: '#1A1A1A',
            active: '#1976D2',
            reveal: 'progressive',
        },
        text_profile: {
            font_size: 46,
            max_lines: 3,
            text_box_height: 460,
            bottom_padding: 260,
        },
        scene_gap_sec: SHORT_VIDEO_DEFAULT_SCENE_GAP_SEC,
        defaultSceneLayout: {
            headline_top: 200,
            headline_font_size: 52,
            show_headline: true,
            show_karaoke: true,
            show_visual: true,
            visual_motion: 'fade',
        },
    },
];

export function getShortVideoRenderTemplate(
    templateId: string
): ShortVideoRenderTemplate | undefined {
    const id = templateId.trim();
    return SHORT_VIDEO_RENDER_TEMPLATES.find((item) => item.id === id);
}

export function sceneHasCustomLayout(scene: { layout?: ShortVideoManifestSceneLayout }): boolean {
    return Boolean(scene.layout && Object.keys(scene.layout).length > 0);
}

export function countScenesWithCustomLayout(manifest: ShortVideoRenderManifest): number {
    return manifest.scenes.filter((scene) => sceneHasCustomLayout(scene)).length;
}

function buildSceneLayoutFromTemplate(
    template: ShortVideoRenderTemplate
): ShortVideoManifestSceneLayout {
    return {
        ...template.defaultSceneLayout,
        background: template.style.bg,
        headline_color: template.style.text,
        text_color: template.style.text,
        active_color: template.style.active,
        font_size: template.text_profile.font_size,
        bottom_padding: template.text_profile.bottom_padding,
        text_box_height: template.text_profile.text_box_height,
    };
}

export function applyShortVideoTemplateToManifest(
    manifest: ShortVideoRenderManifest,
    templateId: string,
    mode: ShortVideoTemplateApplyMode
): ShortVideoRenderManifest {
    const template = getShortVideoRenderTemplate(templateId);
    if (!template) {
        return manifest;
    }

    const next: ShortVideoRenderManifest = {
        ...manifest,
        template_id: template.id,
        style: { ...template.style },
        text_profile: { ...template.text_profile },
        scene_gap_sec: template.scene_gap_sec ?? manifest.scene_gap_sec,
    };

    if (mode === 'keep_scene_overrides') {
        return next;
    }

    const sceneLayout = buildSceneLayoutFromTemplate(template);
    next.scenes = manifest.scenes.map((scene) => ({
        ...scene,
        layout: { ...sceneLayout },
    }));

    return next;
}
