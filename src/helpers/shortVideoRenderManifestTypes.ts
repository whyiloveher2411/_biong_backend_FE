export type ShortVideoSceneVisualType = 'none' | 'image' | 'video';

export type ShortVideoVisualClip = {
    id: string;
    type: ShortVideoSceneVisualType;
    ref: string;
    motion?: string;
    start_sec: number;
    duration_sec: number;
    visual_start_sec?: number;
    visual_youtube_id?: string;
    /** Chỉ inject lúc preview/render — không lưu DB */
    visual_playback_url?: string;
    label?: string;
};

export type ShortVideoManifestWord = {
    text: string;
    start: number;
    end: number;
    source?: string;
};

export type ShortVideoManifestSceneLayout = {
    background?: string;
    headline_text?: string;
    headline_color?: string;
    headline_font_size?: number;
    headline_top?: number;
    show_headline?: boolean;
    text_color?: string;
    active_color?: string;
    font_size?: number;
    bottom_padding?: number;
    text_box_height?: number;
    show_karaoke?: boolean;
    visual_type?: ShortVideoSceneVisualType;
    visual_ref?: string;
    visual_youtube_id?: string;
    /** Chỉ inject lúc preview/render — không lưu DB */
    visual_playback_url?: string;
    visual_motion?: string;
    /** Giây bắt đầu phát trong file video (chỉ visual_type = video) */
    visual_start_sec?: number;
    show_visual?: boolean;
};

export type ShortVideoManifestScene = {
    id: string;
    voiceover: string;
    on_screen_text: string;
    duration_hint_sec: number;
    visual: {
        type: string;
        ref: string;
        motion: string;
    };
    audio_url: string;
    duration_sec: number;
    start_offset_sec: number;
    words: ShortVideoManifestWord[];
    layout?: ShortVideoManifestSceneLayout;
};

export type ShortVideoRenderManifest = {
    schema_version: string;
    width: number;
    height: number;
    fps: number;
    lang: string;
    duration_sec: number;
    scene_gap_sec?: number;
    /** Template preset đã chọn trong CMS (classic, news, quote, …). */
    template_id?: string;
    style: {
        bg: string;
        text: string;
        active: string;
        reveal: string;
    };
    text_profile: {
        font_size: number;
        max_lines: number;
        text_box_height: number;
        bottom_padding: number;
    };
    alignment_mode: string;
    scenes: ShortVideoManifestScene[];
    visual_clips?: ShortVideoVisualClip[];
    warnings: string[];
};
