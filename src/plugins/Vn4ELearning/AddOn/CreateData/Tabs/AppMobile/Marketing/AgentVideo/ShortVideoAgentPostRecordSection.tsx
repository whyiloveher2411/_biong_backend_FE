import React from 'react';
import {
    Alert,
    Box,
    Button,
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
import type { SocialPublishBlock, SocialPublishPost } from './agentVideoApi';
import { WorkflowSection } from './workflowPanelSection';

/**
 * Bản đăng đầy đủ đã lưu cho từng nền tảng (agent_video_json.social_publish.posts,
 * skill biong-social-publish → scripts/social-publish/save-post.php).
 */
const TITLES: Record<string, string> = {
    youtube: 'Bản đăng YouTube',
    youtube_shorts: 'Bản đăng YouTube Shorts',
    facebook: 'Bản đăng Facebook',
};

type Props = {
    socialPublish: SocialPublishBlock | null | undefined;
    platforms: string[];
    /** Ảnh thumbnail đã lưu trong CMS — hiện khi chưa có bản đăng. */
    savedImages?: string[];
};

const yesNo = (value?: boolean) => (typeof value === 'boolean' ? (value ? 'Có' : 'Không') : '');

function formatTime(value?: string): string {
    if (!value) {
        return '';
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function CopyButton({ text, label }: { text: string; label: string }) {
    const { showMessage } = useFloatingMessages();
    return (
        <Tooltip title={`Copy ${label}`}>
            <IconButton
                size="small"
                aria-label={`Copy ${label}`}
                onClick={() => {
                    void navigator.clipboard.writeText(text).then(
                        () => { showMessage(`Đã copy ${label}`, 'success'); },
                        () => { showMessage(`Không copy được ${label}`, 'error'); },
                    );
                }}
            >
                <ContentCopyIcon sx={{ fontSize: 15 }} />
            </IconButton>
        </Tooltip>
    );
}

function TextBlock({ label, text }: { label: string; text?: string }) {
    if (!text) {
        return null;
    }
    return (
        <Box>
            <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{label}</Typography>
                <CopyButton text={text} label={label} />
            </Stack>
            <Box
                sx={{
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                    p: 1,
                    maxHeight: 180,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: 13,
                    lineHeight: 1.5,
                }}
            >
                {text}
            </Box>
        </Box>
    );
}

function PostRecord({ post }: { post: SocialPublishPost }) {
    const published = post.status === 'published';
    const settings = ([
        ['Tài khoản', post.account],
        ['Chế độ hiển thị', post.visibility],
        ['Lịch đăng', formatTime(post.scheduled_at)],
        ['Đăng lúc', formatTime(post.published_at)],
        ['Playlist', post.playlist],
        ['Ngôn ngữ', post.language],
        ['Danh mục', post.category],
        ['Dành cho trẻ em', yesNo(post.made_for_kids)],
        ['Nội dung chỉnh sửa/AI', yesNo(post.altered_content)],
        ['Loại bài', post.kind],
        ['File video', post.video_file],
        ['Thời lượng', post.duration_sec ? `${post.duration_sec} giây` : ''],
        ['Video liên quan', post.related_video],
        ['Thẻ cuối video', post.end_text],
        ['Phong cách thumbnail', post.thumbnail_style],
        ['Ghi chú', post.note],
    ] as [string, string | undefined][]).filter(([, value]) => Boolean(value));

    return (
        <Stack spacing={1.25}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip size="small" color={published ? 'success' : 'warning'} label={published ? 'Đã đăng' : 'Bản nháp'} />
                {post.url ? (
                    <Button
                        size="small"
                        component="a"
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                        sx={{ textTransform: 'none' }}
                    >
                        Mở bài đăng
                    </Button>
                ) : null}
                {post.updated_at ? (
                    <Typography variant="caption" color="text.secondary">Cập nhật {formatTime(post.updated_at)}</Typography>
                ) : null}
            </Stack>

            {post.thumbnail_url ? (
                <Link href={post.thumbnail_url} target="_blank" rel="noopener noreferrer">
                    <Box
                        component="img"
                        src={post.thumbnail_url}
                        alt="Thumbnail đã đăng"
                        sx={{ display: 'block', width: '100%', borderRadius: 1, border: 1, borderColor: 'divider' }}
                    />
                </Link>
            ) : (
                <Typography variant="caption" color="text.secondary">Chưa lưu ảnh thumbnail cho bản đăng này.</Typography>
            )}

            <TextBlock label="Tiêu đề" text={post.title} />
            <TextBlock label="Mô tả" text={post.description} />
            <TextBlock label="Tags" text={post.tags?.join(', ')} />
            <TextBlock label="Hashtags" text={post.hashtags?.join(' ')} />
            <TextBlock label="Comment đầu" text={post.first_comment} />

            {settings.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', columnGap: 1.5, rowGap: 0.25 }}>
                    {settings.map(([label, value]) => (
                        <React.Fragment key={label}>
                            <Typography variant="caption" color="text.secondary">{label}</Typography>
                            <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>{value}</Typography>
                        </React.Fragment>
                    ))}
                </Box>
            ) : null}
        </Stack>
    );
}

export default function ShortVideoAgentPostRecordSection({ socialPublish, platforms, savedImages = [] }: Props) {
    const posts = socialPublish?.posts ?? {};
    const present = platforms.filter((platform) => posts[platform]);

    if (present.length === 0) {
        return (
            <Stack spacing={1}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                    Chưa lưu bản đăng nào. Skill biong-social-publish lưu mô tả, ảnh và cài đặt đăng vào đây ngay khi soạn nháp.
                </Alert>
                {savedImages.length > 0 ? (
                    <WorkflowSection title="Ảnh thumbnail đã lưu" tone="neutral">
                        <Stack spacing={1}>
                            {savedImages.map((url) => (
                                <Link key={url} href={url} target="_blank" rel="noopener noreferrer">
                                    <Box component="img" src={url} alt="Thumbnail đã lưu" sx={{ display: 'block', width: '100%', borderRadius: 1 }} />
                                </Link>
                            ))}
                        </Stack>
                    </WorkflowSection>
                ) : null}
            </Stack>
        );
    }

    return (
        <Stack spacing={1.5}>
            {present.map((platform, index) => (
                <WorkflowSection
                    key={platform}
                    collapsible
                    defaultExpanded={index === 0}
                    title={TITLES[platform] ?? platform}
                    tone="social"
                >
                    <PostRecord post={posts[platform]} />
                </WorkflowSection>
            ))}
        </Stack>
    );
}
