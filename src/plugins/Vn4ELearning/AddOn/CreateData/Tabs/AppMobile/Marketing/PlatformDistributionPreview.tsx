import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Link,
    Paper,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
    PLATFORM_LABELS,
    type PlatformDistributionEntry,
} from './platformDistributionConstants';
import { buildGoogleImagesUrl, copyMarketingText } from './marketingImageUtils';

function parseThumbnailUrl(raw: unknown): string {
    if (raw === null || raw === undefined) return '';
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (t === '') return '';
        if (t.startsWith('{') || t.startsWith('[')) {
            try {
                const dec = JSON.parse(t);
                if (dec && typeof dec === 'object' && 'link' in dec) {
                    return String((dec as { link?: string }).link || '').trim();
                }
            } catch {
                return t;
            }
        }
        return t;
    }
    return '';
}

export function resolveDistributionPreviewImageUrl(
    entry: PlatformDistributionEntry,
    post: Record<string, unknown>,
    articleCoverUrl = '',
): { url: string; source: 'uploaded' | 'article_thumbnail' | 'none' } {
    const media = entry.media || {};
    const direct = String(media.url || media.image_url || '').trim();
    if (direct) {
        return { url: direct, source: 'uploaded' };
    }
    const reuse = media.reuse_article_thumbnail === true
        || media.reuse_article_thumbnail === 'true'
        || media.reuse_article_thumbnail === 1;
    if (reuse) {
        const thumb = parseThumbnailUrl(post.thumbnail);
        if (thumb) {
            return { url: thumb, source: 'article_thumbnail' };
        }
        const cover = String(articleCoverUrl || '').trim();
        if (cover) {
            return { url: cover, source: 'article_thumbnail' };
        }
    }
    return { url: '', source: 'none' };
}

function buildPostClipboardText(parts: {
    title: string;
    mainCopy: string;
    hashtags: string;
    linkTeaser: string;
}): string {
    return [
        parts.title,
        parts.mainCopy,
        parts.hashtags,
        parts.linkTeaser,
    ].filter(Boolean).join('\n\n');
}

function CopyableBlock({
    label,
    value,
    multiline = false,
    monospace = false,
}: {
    label: string;
    value: string;
    multiline?: boolean;
    monospace?: boolean;
}) {
    const [copied, setCopied] = React.useState(false);
    const trimmed = value.trim();
    if (!trimmed) return null;

    const handleCopy = async () => {
        await copyMarketingText(trimmed);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box sx={{ mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                    {label}
                </Typography>
                <Tooltip title={copied ? 'Đã sao chép' : 'Sao chép'}>
                    <IconButton size="small" onClick={handleCopy} aria-label={`Sao chép ${label}`}>
                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </Tooltip>
            </Box>
            <Typography
                variant="body2"
                sx={{
                    whiteSpace: multiline ? 'pre-wrap' : 'normal',
                    fontFamily: monospace ? 'monospace' : 'inherit',
                    fontSize: monospace ? 12 : undefined,
                    mt: 0.25,
                }}
            >
                {trimmed}
            </Typography>
        </Box>
    );
}

interface Props {
    platform: string;
    entry: PlatformDistributionEntry;
    post: Record<string, unknown>;
    articleCoverUrl?: string;
    imageUrl: string;
    onImageUrlChange: (url: string) => void;
    onSaveImageUrl: () => void;
    savingImage?: boolean;
}

export default function PlatformDistributionPreview({
    platform,
    entry,
    post,
    articleCoverUrl = '',
    imageUrl,
    onImageUrlChange,
    onSaveImageUrl,
    savingImage,
}: Props) {
    const platformLabel = PLATFORM_LABELS[platform] || platform;
    const strategy = entry.strategy || {};
    const copy = entry.copy || {};
    const media = entry.media || {};
    const previewImage = resolveDistributionPreviewImageUrl(entry, post, articleCoverUrl);

    const displayUrl = imageUrl.trim() || previewImage.url;

    const mainCopy = String(
        copy.caption
        || copy.primary_text
        || copy.description
        || '',
    ).trim();
    const title = String(copy.title || '').trim();
    const hashtags = Array.isArray(copy.hashtags)
        ? (copy.hashtags as string[]).map((h) => `#${String(h).replace(/^#/, '')}`).join(' ')
        : '';
    const linkTeaser = String(copy.link_teaser || '').trim();
    const hook = String(strategy.hook || '').trim();
    const keyMessage = String(strategy.key_message || '').trim();
    const cta = String(strategy.cta || '').trim();
    const visualPrompt = String(media.visual_prompt || '').trim();
    const imageKeyword = String(media.image_keyword || '').trim();
    const altText = String(media.alt_text || '').trim();

    const fullPostText = buildPostClipboardText({
        title,
        mainCopy,
        hashtags,
        linkTeaser,
    });

    const [postCopied, setPostCopied] = React.useState(false);
    const copyFullPost = async () => {
        if (!fullPostText.trim()) return;
        await copyMarketingText(fullPostText);
        setPostCopied(true);
        window.setTimeout(() => setPostCopied(false), 2000);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <Alert severity="info">
                Xem trước toàn bộ nội dung sẽ đăng lên <strong>{platformLabel}</strong>.
                Dùng nút sao chép để lấy text khi đăng thủ công lên nền tảng.
            </Alert>

            {/* —— Thông tin & nội dung copy —— */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                    Thông tin & nội dung copy
                </Typography>

                <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Chiến lược
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                    {strategy.post_format && (
                        <Chip size="small" label={`Format: ${strategy.post_format}`} />
                    )}
                    {hook && (
                        <Chip size="small" variant="outlined" label={`Hook: ${hook.slice(0, 72)}${hook.length > 72 ? '…' : ''}`} />
                    )}
                </Box>
                <CopyableBlock label="Thông điệp" value={keyMessage} multiline />
                <CopyableBlock label="CTA" value={cta} />
                <CopyableBlock label="Hook (đầy đủ)" value={hook} multiline />

                <Divider sx={{ my: 2 }} />

                <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
                    Copy đăng bài
                </Typography>
                <CopyableBlock label="Tiêu đề" value={title} />
                <CopyableBlock label="Nội dung / Caption" value={mainCopy} multiline />
                <CopyableBlock label="Hashtag" value={hashtags} />
                <CopyableBlock label="Link / teaser" value={linkTeaser} />
                <CopyableBlock label="Alt ảnh" value={altText} multiline />

                {fullPostText && (
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ContentCopyIcon />}
                        onClick={copyFullPost}
                        sx={{ mt: 1 }}
                    >
                        {postCopied ? 'Đã copy toàn bộ bài đăng' : 'Copy toàn bộ bài đăng'}
                    </Button>
                )}
            </Paper>

            {/* —— Xem trước trực quan (tách biệt) —— */}
            <Paper
                elevation={0}
                sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    bgcolor: 'background.paper',
                }}
            >
                <Box
                    sx={{
                        px: 2,
                        py: 1,
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                    }}
                >
                    <Typography variant="subtitle2" fontWeight={700}>
                        Xem trước bài đăng — {platformLabel}
                    </Typography>
                    {fullPostText && (
                        <Tooltip title={postCopied ? 'Đã sao chép' : 'Sao chép nội dung hiển thị'}>
                            <IconButton
                                size="small"
                                onClick={copyFullPost}
                                sx={{ color: 'inherit' }}
                                aria-label="Sao chép nội dung bài đăng"
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                {displayUrl ? (
                    <Box
                        component="img"
                        src={displayUrl}
                        alt={altText || 'Ảnh đăng MXH'}
                        sx={{
                            width: '100%',
                            maxHeight: 400,
                            objectFit: 'cover',
                            display: 'block',
                            bgcolor: 'grey.200',
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            height: 220,
                            bgcolor: 'grey.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 2,
                            borderBottom: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Typography variant="body2" color="text.secondary" align="center">
                            Chưa có ảnh trong preview — thêm URL hoặc dùng thumbnail bài ở mục Ảnh & media bên dưới.
                        </Typography>
                    </Box>
                )}

                <Box sx={{ p: 2.5 }}>
                    {title && (
                        <Typography variant="h6" sx={{ fontSize: 17, fontWeight: 700, mb: 1 }}>
                            {title}
                        </Typography>
                    )}
                    {mainCopy && (
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
                            {mainCopy}
                        </Typography>
                    )}
                    {hashtags && (
                        <Typography variant="body2" color="primary.main" sx={{ mt: 1.5, fontWeight: 500 }}>
                            {hashtags}
                        </Typography>
                    )}
                    {linkTeaser && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {linkTeaser}
                        </Typography>
                    )}
                    {!title && !mainCopy && !hashtags && !linkTeaser && (
                        <Typography variant="body2" color="text.secondary" fontStyle="italic">
                            Chưa có nội dung copy — hoàn thành bước Copy đăng bài trước.
                        </Typography>
                    )}
                </Box>
            </Paper>

            {/* —— Ảnh & media (công cụ) —— */}
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                    Ảnh & media
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    Dán URL sau khi tìm ảnh, hoặc dùng prompt / từ khóa để sinh hoặc tìm ảnh mới.
                </Typography>

                {previewImage.source === 'article_thumbnail' && !imageUrl.trim() && (
                    <Alert severity="success" sx={{ mb: 1.5 }}>
                        Preview đang dùng <strong>thumbnail bài viết gốc</strong>.
                    </Alert>
                )}
                {previewImage.source === 'uploaded' && (
                    <Alert severity="success" sx={{ mb: 1.5 }}>
                        Đang hiển thị URL ảnh đã lưu ở bước Media.
                    </Alert>
                )}

                <TextField
                    size="small"
                    fullWidth
                    label="URL ảnh (dán link sau khi tìm trên Google Images)"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => onImageUrlChange(e.target.value)}
                    onBlur={onSaveImageUrl}
                    sx={{ mb: 1 }}
                />
                <LoadingButton variant="outlined" size="small" loading={savingImage} onClick={onSaveImageUrl}>
                    Lưu URL ảnh
                </LoadingButton>

                {(visualPrompt || imageKeyword) && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        {visualPrompt && (
                            <Box sx={{ mb: 2 }}>
                                <CopyableBlock
                                    label="Prompt AI (sinh ảnh — copy vào công cụ AI)"
                                    value={visualPrompt}
                                    multiline
                                    monospace
                                />
                            </Box>
                        )}
                        {imageKeyword && (
                            <Box>
                                <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                                    {`Từ khóa Google Images${media.dimensions ? ` · ${media.dimensions}` : ''}${media.aspect_ratio ? ` · ${media.aspect_ratio}` : ''}`}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    <Link
                                        component="button"
                                        type="button"
                                        variant="body2"
                                        onClick={() => window.open(
                                            buildGoogleImagesUrl(imageKeyword),
                                            '_blank',
                                            'noopener,noreferrer',
                                        )}
                                        sx={{
                                            fontFamily: 'monospace',
                                            fontSize: 12,
                                            flex: 1,
                                            minWidth: 0,
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        {imageKeyword}
                                    </Link>
                                    <Tooltip title="Sao chép từ khóa">
                                        <IconButton
                                            size="small"
                                            onClick={() => copyMarketingText(imageKeyword)}
                                            aria-label="Sao chép từ khóa"
                                        >
                                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Button
                                        variant="contained"
                                        size="small"
                                        endIcon={<OpenInNewIcon />}
                                        onClick={() => window.open(
                                            buildGoogleImagesUrl(imageKeyword),
                                            '_blank',
                                            'noopener,noreferrer',
                                        )}
                                    >
                                        Mở Google Images
                                    </Button>
                                </Box>
                            </Box>
                        )}
                    </>
                )}
            </Paper>
        </Box>
    );
}
