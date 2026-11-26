import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {
    COMMENT_LABEL_NAMES,
    KIND_NAMES,
    fetchChannelOverview,
    formatDateTime,
    type InsightsOverviewChannel,
    type InsightsTableRow,
} from './channelInsightsApi';
import { Sparkline } from './ChannelInsightsCharts';
import { AnalysisBlock, FlagChips, Fold, SourceBlock } from './ChannelInsightsParts';
import { useInsights } from './useInsights';

const YOUTUBE_COLUMNS: [string, string][] = [
    ['views', 'Lượt xem'],
    ['watch_hours', 'Giờ xem'],
    ['subscribers', 'Người đăng ký'],
    ['impressions', 'Lượt hiển thị'],
    ['ctr_pct', 'CTR'],
    ['avg_view_sec', 'Xem TB'],
    ['avg_view_pct', '% xem TB'],
];

const FACEBOOK_COLUMNS: [string, string][] = [
    ['views', 'Lượt xem'],
    ['viewers', 'Người xem'],
    ['views_3s', 'Xem từ 3 s'],
    ['avg_view_sec', 'Xem TB'],
    ['interactions', 'Tương tác'],
    ['comments', 'Bình luận'],
    ['follows', 'Theo dõi'],
];

function VideoTable({ title, rows, columns }: { title: string; rows: InsightsTableRow[]; columns: [string, string][] }) {
    if (rows.length === 0) {
        return null;
    }
    return (
        <Box>
            <Typography variant="subtitle2" gutterBottom>{title}</Typography>
            <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 220 }}>Video</TableCell>
                            {columns.map(([key, label]) => <TableCell key={key} align="right">{label}</TableCell>)}
                            <TableCell>Xu hướng lượt xem</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => {
                            const byKey = new Map(row.metrics.map((m) => [m.key, m]));
                            const views = byKey.get('views');
                            return (
                                <TableRow key={row.post_key}>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {row.video !== null ? `#${row.video} · ` : 'Bài khác · '}{row.title}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" component="div">
                                            {[
                                                row.kind ? KIND_NAMES[row.kind] ?? row.kind : '',
                                                row.age_text ? `${row.age_text} tuổi lúc đọc` : '',
                                                `đọc ${formatDateTime(row.captured_at)}`,
                                            ].filter(Boolean).join(' · ')}
                                        </Typography>
                                        <FlagChips flags={row.flags} />
                                    </TableCell>
                                    {columns.map(([key]) => (
                                        <TableCell key={key} align="right" sx={{ whiteSpace: 'nowrap' }}>{byKey.get(key)?.text ?? '–'}</TableCell>
                                    ))}
                                    <TableCell>
                                        {views && views.history.length > 1 ? (
                                            <Sparkline history={views.history} label="Lượt xem" />
                                        ) : (
                                            <Typography variant="caption" color="text.secondary">mới đọc 1 lần</Typography>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export function ChannelOverview({ channel }: { channel: InsightsOverviewChannel }) {
    const labels = Object.entries(channel.viewer_comments.by_label);
    return (
        <Stack spacing={2}>
            <Box>
                <Typography variant="h5" component="div">{channel.name}</Typography>
                <Typography variant="caption" color="text.secondary">
                    {`Lần đọc mới nhất ${formatDateTime(channel.last_captured_at)} · đồng bộ vào CMS ${formatDateTime(channel.synced_at)}`}
                </Typography>
            </Box>
            {channel.evidence ? (
                <Stack spacing={1}>
                    <Alert severity={channel.evidence.sufficient ? 'success' : 'warning'}>
                        {channel.evidence.sufficient
                            ? `Đủ dữ liệu so sánh: ${channel.evidence.eligible} video dài đạt điều kiện.`
                            : `Chưa đủ dữ liệu để kết luận cấp kênh: ${channel.evidence.eligible}/${channel.evidence.min} video dài đạt điều kiện.`}
                    </Alert>
                    <Fold title="Khối CHANNEL EVIDENCE dùng khi tìm chủ đề">
                        <Typography component="pre" variant="caption" sx={{ m: 0, whiteSpace: 'pre-wrap' }}>{channel.evidence.block}</Typography>
                    </Fold>
                </Stack>
            ) : null}
            {channel.totals ? <SourceBlock source={channel.totals} /> : <Alert severity="info">Chưa đọc bảng kênh YouTube.</Alert>}
            <VideoTable title="YouTube theo video" rows={channel.youtube} columns={YOUTUBE_COLUMNS} />
            <VideoTable title="Facebook theo bài" rows={channel.facebook} columns={FACEBOOK_COLUMNS} />
            <Typography variant="caption" color="text.secondary">
                Chỉ so số cùng nguồn, cùng loại video, cùng độ tuổi. YouTube và Facebook đếm lượt xem khác nhau. “≈” là số trang đã làm tròn.
            </Typography>
            <Box>
                <Typography variant="subtitle2" gutterBottom>{`Bình luận của người xem đã đọc: ${channel.viewer_comments.total}`}</Typography>
                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                    {labels.map(([key, count]) => <Chip key={key} size="small" label={`${COMMENT_LABEL_NAMES[key] ?? key}: ${count}`} />)}
                </Stack>
            </Box>
            <AnalysisBlock analysis={channel.analysis} />
        </Stack>
    );
}

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function MarketingChannelInsightsDrawer({ open, onClose }: Props) {
    const { data, error, loading, reload } = useInsights<InsightsOverviewChannel>(open ? 'overview' : null, fetchChannelOverview);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Số liệu kênh"
            width={1200}
            sx={{ '& .MuiDrawer-paper': { width: 'min(1200px, 100vw)' } }}
        >
            <Stack spacing={3} sx={{ py: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
                        Số chỉ đổi khi chạy skill biong-channel-insights. Nút tải lại chỉ đọc lại database, không đọc YouTube hay Facebook.
                    </Typography>
                    <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={reload} disabled={loading} sx={{ textTransform: 'none', flexShrink: 0 }}>
                        Tải lại
                    </Button>
                </Stack>
                {loading && !data ? <CircularProgress size={24} sx={{ alignSelf: 'center' }} /> : null}
                {error ? <Alert severity="error">{error}</Alert> : null}
                {data && data.ready === false ? <Alert severity="info">{data.hint}</Alert> : null}
                {data?.channels.map((channel) => <ChannelOverview key={channel.key} channel={channel} />)}
            </Stack>
        </DrawerCustom>
    );
}
