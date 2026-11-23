import React from 'react';
import {
    Alert,
    Box,
    Chip,
    IconButton,
    Link,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import type { SocialPublishLink } from './agentVideoApi';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

/** Thứ tự + nhãn hiển thị; nền tảng lạ vẫn hiện theo key. */
const PLATFORM_LABELS: Record<string, string> = {
    youtube: 'YouTube',
    youtube_shorts: 'YouTube Shorts',
    facebook: 'Facebook',
    instagram: 'Instagram',
    threads: 'Threads',
    tiktok: 'TikTok',
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    pinterest: 'Pinterest',
    bluesky: 'Bluesky',
    reddit: 'Reddit',
};

const KIND_LABELS: Record<string, string> = {
    video: 'Video đầy đủ',
    teaser: 'Teaser',
    link: 'Bài dẫn link',
    reel: 'Reel',
    short: 'Short',
    post: 'Bài viết',
};

function formatTime(value?: string): string {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export default function ShortVideoAgentPublishedLinksPanel({ state }: Props) {
    const { showMessage } = useFloatingMessages();
    const links = state.socialPublish?.links ?? {};
    const order = Object.keys(PLATFORM_LABELS);
    const entries = Object.entries(links)
        .filter((entry): entry is [string, SocialPublishLink] => Boolean(entry[1]?.url))
        .sort(([a], [b]) => {
            const ia = order.indexOf(a);
            const ib = order.indexOf(b);
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
        });

    const copy = (url: string) => {
        void navigator.clipboard.writeText(url).then(
            () => { showMessage('Đã copy link', 'success'); },
            () => { showMessage('Không copy được link', 'error'); },
        );
    };

    return (
        <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
            <Stack spacing={1.5}>
                {entries.length === 0 ? (
                    <Alert severity="info">
                        Video chưa đăng lên nền tảng nào. Gọi skill biong-social-publish với id video này và danh sách
                        nền tảng; link từng bài sẽ hiện ở đây.
                    </Alert>
                ) : null}
                {entries.map(([platform, link]) => (
                    <Box
                        key={platform}
                        sx={{
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            p: 1.5,
                        }}
                    >
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="subtitle2" sx={{ flex: 1 }}>
                                {PLATFORM_LABELS[platform] ?? platform}
                            </Typography>
                            {link.kind ? (
                                <Chip size="small" label={KIND_LABELS[link.kind] ?? link.kind} />
                            ) : null}
                            <Tooltip title="Copy link">
                                <IconButton size="small" onClick={() => { copy(link.url); }}>
                                    <ContentCopyIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Mở bài đăng">
                                <IconButton
                                    size="small"
                                    component="a"
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <OpenInNewIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                        <Link
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            sx={{ wordBreak: 'break-all' }}
                        >
                            {link.url}
                        </Link>
                        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                            {[link.account, formatTime(link.posted_at)].filter(Boolean).join(' · ')}
                        </Typography>
                        {link.title ? (
                            <Typography variant="caption" component="div" sx={{ mt: 0.25 }}>
                                {link.title}
                            </Typography>
                        ) : null}
                        {link.note ? (
                            <Typography variant="caption" color="warning.main" component="div" sx={{ mt: 0.25 }}>
                                {link.note}
                            </Typography>
                        ) : null}
                    </Box>
                ))}
            </Stack>
        </Box>
    );
}
