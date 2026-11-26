import React from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { fetchVideoInsights, formatDateTime, type InsightsVideoChannel } from '../ChannelInsights/channelInsightsApi';
import { AnalysisBlock, CommentList, PostBlock } from '../ChannelInsights/ChannelInsightsParts';
import { useInsights } from '../ChannelInsights/useInsights';
import type { useAgentVideoContent } from './useAgentVideoContent';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
};

export default function ShortVideoAgentInsightsPanel({ state }: Props) {
    const id = state.shortVideoId;
    const { data, error, loading, reload } = useInsights<InsightsVideoChannel>(
        id > 0 ? String(id) : null,
        () => fetchVideoInsights(id),
    );

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Stack spacing={2}>
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
                {data && data.ready !== false && data.channels.length === 0 ? (
                    <Alert severity="info">
                        Chưa có số liệu cho video này: cần có link ở tab “Đã đăng” rồi gọi skill biong-channel-insights.
                    </Alert>
                ) : null}
                {data?.channels.map((channel) => (
                    <Stack key={channel.key} spacing={2}>
                        <Box>
                            <Typography variant="h6" component="div">{channel.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{`Đồng bộ vào CMS ${formatDateTime(channel.synced_at)}`}</Typography>
                        </Box>
                        <AnalysisBlock analysis={channel.analysis} />
                        {channel.posts.map((post) => <PostBlock key={post.kind} post={post} />)}
                        <CommentList comments={channel.comments} />
                    </Stack>
                ))}
            </Stack>
        </Box>
    );
}
