import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ShortVideoAgentInsightsPanel from './ShortVideoAgentInsightsPanel';
import { ChannelOverview } from '../ChannelInsights/MarketingChannelInsightsDrawer';
import { postJson } from './agentVideoApi';

jest.mock('./agentVideoApi', () => ({ postJson: jest.fn() }));
jest.mock('react-markdown', () => ({ children }: { children: string }) => <div>{children}</div>);
jest.mock('components/molecules/DrawerCustom', () => () => null);

const post = jest.mocked(postJson);
const state = { shortVideoId: 5 } as unknown as React.ComponentProps<typeof ShortVideoAgentInsightsPanel>['state'];

const views = {
    key: 'views', label: 'Lượt xem', value: 25, text: '25', approx: false, delta_text: '+15',
    history: [
        { at: '2026-12-01T08:00:00+07:00', age_hours: 24, value: 10, text: '10' },
        { at: '2026-12-02T08:00:00+07:00', age_hours: 48, value: 25, text: '25' },
    ],
};
const source = {
    source: 'yt_table', label: 'Bảng thử', captured_at: '2026-12-02T08:00:00+07:00', previous_captured_at: '2026-12-01T08:00:00+07:00',
    reads: 2, age_text: '48 giờ', range: '', metrics: [views], traffic_sources: [], missing: [], warnings: [],
};
const retention = {
    source: 'yt_engagement', captured_at: '2026-12-02T08:00:00+07:00', basis: 'thử', duration_sec: 100,
    points: [[0, 100], [50, 40], [100, 10]], step_sec: 50, base: 40, low_sample: true,
    timeline_label: 'beat map thử', timeline_reason: null, verify: { checked: 7, matched: 7 }, beats: [], opening: [],
    drops: [{ from: 50, to: 100, drop_pp: 30, share_of_remaining_pct: 75, viewers: 12, beats: [{ beat: 'beat_4', start: 50, end: 60, text: 'câu thử' }] }],
};
const channel = {
    key: 'k', name: 'Kênh thử', synced_at: null, analysis: null,
    posts: [{
        kind: 'long', platform: 'youtube', url: 'https://youtu.be/xxxxxxxxxxx', published_at: '', duration_sec: 100,
        sources: [source], retention, retention_missing: null, flags: ['Cờ thử'],
    }],
    comments: [{ key: 'c', text: 'bình luận bịa', reply: false, kind: 'long', when: '1 giờ trước', first_seen_at: '2026-12-02T08:00:00+07:00', label: 'cau-hoi' }],
};

beforeEach(() => post.mockReset());

test('shows metrics, trend, drop beats and comments of the video', async () => {
    post.mockResolvedValue({ success: true, ready: true, channels: [channel] } as never);
    render(<ShortVideoAgentInsightsPanel state={state} />);
    expect(await screen.findByText('Kênh thử')).toBeTruthy();
    expect(post).toHaveBeenCalledWith('plugin/vn4-e-learning/app-mobile/marketing/channel-insights/video', { short_video_id: 5 });
    expect(screen.getByText('+15 so lần trước')).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Lượt xem: / })).toBeTruthy();
    expect(screen.getByRole('img', { name: /^Đường giữ chân, 3 điểm/ })).toBeTruthy();
    expect(screen.getByText(/0:50 → 1:40: −30 điểm %/)).toBeTruthy();
    expect(screen.getByText(/beat_4: “câu thử”/)).toBeTruthy();
    expect(screen.getByText(/không phải lý do họ rời/)).toBeTruthy();
    expect(screen.getByText(/Chưa đủ dữ liệu: chỉ dùng để xem lại hình/)).toBeTruthy();
    expect(screen.getByText('Cờ thử')).toBeTruthy();
    expect(screen.getByText('bình luận bịa')).toBeTruthy();
    expect(screen.getByText(/Câu hỏi/)).toBeTruthy();
});

test('says what to do when nothing has been read yet', async () => {
    post.mockResolvedValue({ success: true, ready: true, channels: [] } as never);
    render(<ShortVideoAgentInsightsPanel state={state} />);
    expect(await screen.findByText(/Chưa có số liệu cho video này/)).toBeTruthy();
});

test('shows the server error and can retry', async () => {
    post.mockResolvedValueOnce({ success: false, message: 'Lỗi thử' } as never);
    post.mockResolvedValue({ success: true, ready: false, hint: 'Chưa có bảng', channels: [] } as never);
    render(<ShortVideoAgentInsightsPanel state={state} />);
    expect(await screen.findByText('Lỗi thử')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại' }));
    expect(await screen.findByText('Chưa có bảng')).toBeTruthy();
});

test('channel overview warns when there is not enough data and lists videos', () => {
    render(
        <ChannelOverview
            channel={{
                key: 'k', name: 'Kênh thử', synced_at: null, last_captured_at: null, totals: null, analysis: null,
                youtube: [{ post_key: 'youtube:x', video: 5, kind: 'long', title: 'Tiêu đề thử', published_at: null, age_text: '48 giờ', captured_at: source.captured_at, metrics: [views], flags: [] }],
                facebook: [],
                viewer_comments: { total: 1, by_label: { 'xin-chu-de': 1 } },
                evidence: { eligible: 1, min: 5, sufficient: false, block: 'KHỐI THỬ' },
            }}
        />,
    );
    expect(screen.getByText(/1\/5 video dài đạt điều kiện/)).toBeTruthy();
    expect(screen.getByText('#5 · Tiêu đề thử')).toBeTruthy();
    expect(screen.getByText('Xin chủ đề: 1')).toBeTruthy();
    expect(screen.queryByText('KHỐI THỬ')).toBeNull();
    expect(screen.getByText('Chưa đọc bảng kênh YouTube.')).toBeTruthy();
});
