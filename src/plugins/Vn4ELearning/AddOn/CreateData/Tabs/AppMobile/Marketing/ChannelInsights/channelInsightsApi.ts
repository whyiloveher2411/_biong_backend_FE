import { postJson } from '../AgentVideo/agentVideoApi';

export type InsightsHistoryPoint = { at: string; age_hours: number | null; value: number; text: string };

export type InsightsMetric = {
    key: string;
    label: string;
    value: number;
    text: string;
    approx: boolean;
    delta_text: string | null;
    history: InsightsHistoryPoint[];
};

export type InsightsSource = {
    source: string;
    label: string;
    captured_at: string;
    previous_captured_at: string | null;
    reads: number;
    age_text: string | null;
    range: string;
    metrics: InsightsMetric[];
    traffic_sources: { name: string; pct: number }[];
    missing: { label: string; reason: string }[];
    warnings: string[];
};

export type InsightsBeat = { beat: string; start: number; end: number; text: string };

export type InsightsDrop = {
    from: number;
    to: number;
    drop_pp: number;
    share_of_remaining_pct: number | null;
    viewers: number | null;
    beats: InsightsBeat[];
};

export type InsightsRetention = {
    source: string;
    captured_at: string;
    basis: string;
    duration_sec: number;
    points: [number, number][];
    step_sec: number;
    base: number | null;
    low_sample: boolean;
    timeline_label: string | null;
    timeline_reason: string | null;
    verify: { checked: number; matched: number } | null;
    beats: InsightsBeat[];
    opening: (InsightsBeat & { from_pct: number; to_pct: number })[];
    drops: InsightsDrop[];
};

export type InsightsPost = {
    kind: 'long' | 'short' | 'facebook';
    platform: string;
    url: string;
    published_at: string;
    duration_sec: number | null;
    sources: InsightsSource[];
    retention: InsightsRetention | null;
    retention_missing: string | null;
    flags: string[];
};

export type InsightsAnalysis = { name: string; created_at: string; videos: number[]; markdown: string };

export type InsightsComment = {
    key: string;
    text: string;
    reply: boolean;
    kind: string | null;
    when: string;
    first_seen_at: string;
    label: string | null;
};

export type InsightsVideoChannel = {
    key: string;
    name: string;
    synced_at: string | null;
    posts: InsightsPost[];
    comments: InsightsComment[];
    analysis: InsightsAnalysis | null;
};

export type InsightsTableRow = {
    post_key: string;
    video: number | null;
    kind: string | null;
    title: string;
    published_at: string | null;
    age_text: string | null;
    captured_at: string;
    metrics: InsightsMetric[];
    flags: string[];
};

export type InsightsOverviewChannel = {
    key: string;
    name: string;
    synced_at: string | null;
    last_captured_at: string | null;
    totals: InsightsSource | null;
    youtube: InsightsTableRow[];
    facebook: InsightsTableRow[];
    viewer_comments: { total: number; by_label: Record<string, number> };
    evidence: { eligible: number; min: number; sufficient: boolean; block: string } | null;
    analysis: InsightsAnalysis | null;
};

export type InsightsResponse<T> = {
    success: boolean;
    ready?: boolean;
    hint?: string;
    channels: T[];
};

const BASE = 'plugin/vn4-e-learning/app-mobile/marketing/channel-insights';

async function fetchInsights<T>(path: string, body: Record<string, unknown>): Promise<InsightsResponse<T>> {
    const json = (await postJson(`${BASE}/${path}`, body)) as unknown as Partial<InsightsResponse<T>> & {
        message?: unknown;
    };
    if (!json || json.success !== true || !Array.isArray(json.channels)) {
        throw new Error(typeof json?.message === 'string' ? json.message : 'Không đọc được số liệu kênh');
    }
    return json as InsightsResponse<T>;
}

export function fetchVideoInsights(shortVideoId: number) {
    return fetchInsights<InsightsVideoChannel>('video', { short_video_id: shortVideoId });
}

export function fetchChannelOverview() {
    return fetchInsights<InsightsOverviewChannel>('overview', {});
}

export const KIND_NAMES: Record<string, string> = { long: 'Video dài', short: 'Short', facebook: 'Facebook' };

export const COMMENT_LABEL_NAMES: Record<string, string> = {
    'cau-hoi': 'Câu hỏi',
    'xin-chu-de': 'Xin chủ đề',
    'khen-cu-the': 'Khen cụ thể',
    'phan-nan-loi': 'Phàn nàn, báo lỗi',
    'hieu-sai': 'Hiểu sai',
    'tra-loi-kenh': 'Trả lời câu hỏi của kênh',
    spam: 'Spam',
    khac: 'Khác',
    'chua-xep-loai': 'Chưa xếp loại',
};

export function formatClock(sec: number): string {
    const s = Math.round(sec);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function formatDateTime(iso?: string | null): string {
    if (!iso) {
        return '';
    }
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
        ? iso
        : date.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatPct(v: number): string {
    return `${v.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}
