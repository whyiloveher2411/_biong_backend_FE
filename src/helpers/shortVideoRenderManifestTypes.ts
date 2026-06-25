export type ShortVideoSceneVisualType = 'none' | 'image' | 'video';

export type ShortVideoVisualVerticalAlign = 'top' | 'center' | 'bottom';

export type ShortVideoVisualBackgroundMode = 'none' | 'color' | 'gradient' | 'media_blur';

export type ShortVideoVisualGradientDirection =
    | 'to_bottom'
    | 'to_top'
    | 'to_left'
    | 'to_right'
    | 'to_bottom_right'
    | 'to_bottom_left'
    | 'to_top_right'
    | 'to_top_left';

export type ShortVideoVisualGradientStop = {
    color: string;
    opacity?: number;
    position: number;
};

export type ShortVideoVisualBackgroundGradient = {
    direction: ShortVideoVisualGradientDirection;
    stops: ShortVideoVisualGradientStop[];
};

export type ShortVideoVisualLayoutFields = {
    visual_vertical_align?: ShortVideoVisualVerticalAlign;
    visual_inset_top?: number;
    visual_inset_bottom?: number;
    visual_background_mode?: ShortVideoVisualBackgroundMode;
    visual_background_color?: string;
    visual_background_gradient?: ShortVideoVisualBackgroundGradient;
    visual_background_blur?: number;
};

export type ShortVideoVisualClip = {
    id: string;
    type: ShortVideoSceneVisualType;
    ref: string;
    image_ref?: string;
    video_ref?: string;
    video_preview_url?: string;
    motion?: string;
    start_sec: number;
    duration_sec: number;
    visual_start_sec?: number;
    visual_youtube_id?: string;
    /** false = phát tiếng video; undefined/true = tắt tiếng (mặc định) */
    visual_youtube_muted?: boolean;
    /** Âm lượng audio nhúng trong video clip — 0..1 */
    audio_volume?: number;
    /** Chỉ inject lúc preview/render — không lưu DB */
    visual_playback_url?: string;
    label?: string;
    /** Track timeline chứa clip visual */
    timeline_track_id?: string;
    /** Ẩn clip khỏi preview/export — toggle từ timeline editor */
    timeline_hidden?: boolean;
    /** z-index trong cùng track — undefined = auto theo loại item */
    z_index?: number;
} & ShortVideoVisualLayoutFields;

export type ShortVideoTextClipMotion =
    | 'none'
    | 'fade'
    | 'pop'
    | 'slide_up'
    | 'slide_down'
    | 'slide_left'
    | 'slide_right';

export const TEXT_CLIP_SLIDE_ENTER_MOTIONS: ShortVideoTextClipMotion[] = [
    'slide_up',
    'slide_down',
    'slide_left',
    'slide_right',
];

export const TEXT_CLIP_ENTER_SLIDE_OPTIONS: ReadonlyArray<{
    value: ShortVideoTextClipMotion;
    label: string;
}> = [
    { value: 'slide_up', label: 'Slide up' },
    { value: 'slide_down', label: 'Slide down' },
    { value: 'slide_left', label: 'Slide left' },
    { value: 'slide_right', label: 'Slide right' },
];

export const TEXT_CLIP_ENTER_SLIDE_GROUP = {
    id: 'slide',
    label: 'Slide',
    options: TEXT_CLIP_ENTER_SLIDE_OPTIONS,
} as const;

export const TEXT_CLIP_EXIT_SLIDE_OPTIONS = TEXT_CLIP_ENTER_SLIDE_OPTIONS;

export const TEXT_CLIP_EXIT_SLIDE_GROUP = {
    id: 'slide',
    label: 'Slide',
    options: TEXT_CLIP_EXIT_SLIDE_OPTIONS,
} as const;

export type ShortVideoTextAlign = 'left' | 'center' | 'right';

export type ShortVideoTextTransform = 'none' | 'uppercase' | 'lowercase' | 'capitalize';

export type ShortVideoTextFontWeight = 400 | 600 | 700 | 800 | 900;

export type ShortVideoTextClipBackgroundEffect =
    | 'disabled'
    | 'sliding'
    | 'scaling'
    | 'scaling_w_clip';

export const TEXT_CLIP_BACKGROUND_EFFECT_OPTIONS: ReadonlyArray<{
    value: ShortVideoTextClipBackgroundEffect;
    label: string;
}> = [
    { value: 'disabled', label: 'Tắt' },
    { value: 'sliding', label: 'Trượt' },
    { value: 'scaling', label: 'Thu phóng' },
    { value: 'scaling_w_clip', label: 'Thu phóng theo clip' },
] as const;

export type ShortVideoTextClip = {
    id: string;
    content: string;
    start_sec: number;
    duration_sec: number;
    timeline_track_id?: string;
    label?: string;
    font_size?: number;
    font_weight?: ShortVideoTextFontWeight;
    color?: string;
    opacity?: number;
    text_align?: ShortVideoTextAlign;
    /** Chiều cao dòng — % của cỡ chữ, vd. 100 = line-height 1.0 */
    line_height_percent?: number;
    /** Khoảng cách chữ (px canvas) */
    letter_spacing_px?: number;
    /** Nghiêng ngang toàn box (độ), vd. -7 giống Creatomate x_skew */
    skew_x_deg?: number;
    text_transform?: ShortVideoTextTransform;
    /** Chiều rộng tối đa box text — % chiều rộng canvas, mặc định 92 */
    box_max_width_percent?: number;
    background_color?: string;
    background_opacity?: number;
    /** Hiệu ứng nền khi animate — undefined = legacy (nền + chữ cùng transform) */
    background_effect?: ShortVideoTextClipBackgroundEffect;
    padding_x?: number;
    padding_y?: number;
    border_radius?: number;
    position_x?: number;
    position_y?: number;
    motion?: ShortVideoTextClipMotion;
    /** Thời lượng enter animation (giây) — mặc định 0.5 khi undefined */
    enter_duration_sec?: number;
    /** Hiệu ứng exit — none = không có exit animation */
    exit_motion?: ShortVideoTextClipMotion | 'none';
    /** Thời lượng exit animation (giây) — mặc định 0.5 khi undefined */
    exit_duration_sec?: number;
    /** Ẩn clip khỏi preview/export — toggle từ timeline editor */
    timeline_hidden?: boolean;
    /** z-index trong cùng track — undefined = auto theo loại item */
    z_index?: number;
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
    visual_image_ref?: string;
    visual_video_ref?: string;
    visual_video_preview_url?: string;
    visual_youtube_id?: string;
    /** false = phát tiếng video; undefined/true = tắt tiếng (mặc định) */
    visual_youtube_muted?: boolean;
    /** Âm lượng audio nhúng trong video scene (legacy layout) — 0..1 */
    visual_audio_volume?: number;
    /** Chỉ inject lúc preview/render — không lưu DB */
    visual_playback_url?: string;
    visual_motion?: string;
    /** Giây bắt đầu phát trong file video (chỉ visual_type = video) */
    visual_start_sec?: number;
    show_visual?: boolean;
} & ShortVideoVisualLayoutFields;

export type ShortVideoSaydiAudioTtsSettings = {
    provider: 'saydi';
    lang_code: string;
    voice_sample: string;
};

export type ShortVideoVbeeAudioTtsSettings = {
    provider: 'vbee';
    voice_code: string;
    speed?: number;
};

export type ShortVideoSceneAudioTtsSettings =
    | ShortVideoSaydiAudioTtsSettings
    | ShortVideoVbeeAudioTtsSettings;

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
    /** Biên độ sóng âm chuẩn hoá 0..1 — dùng timeline waveform */
    audio_peaks?: number[];
    /** Nhãn hiển thị trên timeline NLE — tách khỏi voiceover / on_screen_text */
    timeline_label?: string;
    /** Track timeline chứa scene narration */
    timeline_track_id?: string;
    /** Giây bắt đầu phát trong file audio gốc — dùng khi cắt clip trên timeline */
    audio_trim_start_sec?: number;
    /** Thời lượng file audio gốc — giới hạn kéo dài clip trên timeline */
    audio_source_duration_sec?: number;
    /** Cấu hình TTS khi render audio — lưu per scene */
    audio_tts_settings?: ShortVideoSceneAudioTtsSettings;
    /** Âm lượng narration/voiceover — 0..1, mặc định 1 */
    audio_volume?: number;
    layout?: ShortVideoManifestSceneLayout;
    /** Ẩn scene khỏi preview/export — toggle từ timeline editor */
    timeline_hidden?: boolean;
    /** z-index trong cùng track — undefined = auto theo loại item */
    z_index?: number;
};

export type ShortVideoHtmlClip = {
    id: string;
    start_sec: number;
    duration_sec: number;
    /** Fragment body hoặc full document */
    html: string;
    css?: string;
    js?: string;
    label?: string;
    timeline_track_id?: string;
    timeline_hidden?: boolean;
    z_index?: number;
    /** Transient — inject lúc render, không lưu DB */
    prerender_playback_url?: string;
};

export type ShortVideoTimelineTrack = {
    id: string;
    name: string;
    order: number;
    /** Ẩn toàn bộ item trên track khỏi preview/export */
    timeline_hidden?: boolean;
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
    text_clips?: ShortVideoTextClip[];
    html_clips?: ShortVideoHtmlClip[];
    /** Cấu trúc track timeline NLE — persist khi user tạo/đổi tên track */
    timeline_tracks?: ShortVideoTimelineTrack[];
    warnings: string[];
    /** Chỉ dùng lúc preview editor — ẩn text clip khỏi Remotion khi render overlay HTML */
    preview_suppress_text_clip_ids?: string[];
    /** Chỉ dùng lúc preview editor — ẩn html clip khỏi Remotion khi render overlay iframe */
    preview_suppress_html_clip_ids?: string[];
};
