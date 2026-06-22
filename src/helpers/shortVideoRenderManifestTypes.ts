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
    /** false = phát tiếng YouTube; undefined/true = tắt tiếng (mặc định) */
    visual_youtube_muted?: boolean;
    /** Chỉ inject lúc preview/render — không lưu DB */
    visual_playback_url?: string;
    label?: string;
    /** Track timeline chứa clip visual */
    timeline_track_id?: string;
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
    /** false = phát tiếng YouTube; undefined/true = tắt tiếng (mặc định) */
    visual_youtube_muted?: boolean;
    /** Chỉ inject lúc preview/render — không lưu DB */
    visual_playback_url?: string;
    visual_motion?: string;
    /** Giây bắt đầu phát trong file video (chỉ visual_type = video) */
    visual_start_sec?: number;
    show_visual?: boolean;
};

export type ShortVideoSceneAudioTtsSettings = {
    provider: 'saydi';
    lang_code: string;
    voice_sample: string;
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
    layout?: ShortVideoManifestSceneLayout;
};

export type ShortVideoTimelineTrack = {
    id: string;
    name: string;
    order: number;
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
    /** Cấu trúc track timeline NLE — persist khi user tạo/đổi tên track */
    timeline_tracks?: ShortVideoTimelineTrack[];
    warnings: string[];
};
