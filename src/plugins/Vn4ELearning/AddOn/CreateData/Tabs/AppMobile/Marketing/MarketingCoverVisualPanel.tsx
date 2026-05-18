import React from 'react';
import {
    Box,
    IconButton,
    Link,
    Paper,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import useAjax from 'hook/useApi';
import type { ImagePlacement } from './MarketingImagePlacementsEditor';
import { buildGoogleImagesUrl, copyMarketingText } from './marketingImageUtils';

export type CoverVisualFields = {
    visualPrompt: string;
    imageKeyword: string;
    url: string;
};

type PipelineLike = {
    visual_prompt?: string;
    cover_image_keyword?: string;
    image_placements?: ImagePlacement[];
};

export function getCoverFieldsFromPipeline(pipeline: PipelineLike): CoverVisualFields {
    const cover = (pipeline.image_placements || []).find((p) => p.role === 'cover');
    return {
        visualPrompt: String(cover?.visual_prompt || pipeline.visual_prompt || '').trim(),
        imageKeyword: String(cover?.image_keyword || pipeline.cover_image_keyword || '').trim(),
        url: String(cover?.url || '').trim(),
    };
}

interface Props {
    postId: number;
    pipeline: PipelineLike;
    showUrlField?: boolean;
    onUpdated?: (payload: {
        pipeline?: PipelineLike & Record<string, unknown>;
        preview_markdown?: string;
        editorial_working_content?: string;
        image_placements?: ImagePlacement[];
    }) => void;
}

export default function MarketingCoverVisualPanel({
    postId,
    pipeline,
    showUrlField = false,
    onUpdated,
}: Props) {
    const api = useAjax();
    const initial = React.useMemo(() => getCoverFieldsFromPipeline(pipeline), [pipeline]);
    const [visualPrompt, setVisualPrompt] = React.useState(initial.visualPrompt);
    const [imageKeyword, setImageKeyword] = React.useState(initial.imageKeyword);
    const [coverUrl, setCoverUrl] = React.useState(initial.url);
    const saveMetaRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveUrlRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        const next = getCoverFieldsFromPipeline(pipeline);
        setVisualPrompt(next.visualPrompt);
        setImageKeyword(next.imageKeyword);
        setCoverUrl(next.url);
    }, [pipeline]);

    const saveCoverMeta = React.useCallback((vp: string, kw: string) => {
        if (!postId) return;
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                cover_visual_prompt: vp,
                cover_image_keyword: kw,
            },
            success: (res: { pipeline?: PipelineLike & Record<string, unknown> }) => {
                if (res?.pipeline) {
                    onUpdated?.({ pipeline: res.pipeline });
                }
            },
        });
    }, [api, postId, onUpdated]);

    const scheduleSaveMeta = (vp: string, kw: string) => {
        if (saveMetaRef.current) {
            clearTimeout(saveMetaRef.current);
        }
        saveMetaRef.current = setTimeout(() => saveCoverMeta(vp, kw), 500);
    };

    const syncCoverUrl = React.useCallback((url: string) => {
        const trimmed = url.trim();
        if (!postId || trimmed === '') return;

        const coverId = (pipeline.image_placements || []).find((p) => p.role === 'cover')?.id || 'img_cover';
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/sync-image-urls',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                placements: [{ id: coverId, url: trimmed }],
            },
            success: (res: {
                preview_markdown?: string;
                editorial_working_content?: string;
                image_placements?: ImagePlacement[];
                pipeline?: PipelineLike & Record<string, unknown>;
                thumbnail_saved?: boolean;
            }) => {
                onUpdated?.(res);
            },
            error: () => {
                api.ajax({
                    url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/save-pipeline',
                    method: 'POST',
                    loading: false,
                    data: {
                        post_id: postId,
                        cover_thumbnail_url: trimmed,
                    },
                    success: (res: { pipeline?: PipelineLike & Record<string, unknown> }) => {
                        if (res?.pipeline) {
                            onUpdated?.({ pipeline: res.pipeline });
                        }
                    },
                });
            },
        });
    }, [api, postId, pipeline.image_placements, onUpdated]);

    const handleVisualChange = (value: string) => {
        setVisualPrompt(value);
        scheduleSaveMeta(value, imageKeyword);
    };

    const handleKeywordChange = (value: string) => {
        setImageKeyword(value);
        scheduleSaveMeta(visualPrompt, value);
    };

    const handleUrlChange = (value: string) => {
        setCoverUrl(value);
        if (saveUrlRef.current) {
            clearTimeout(saveUrlRef.current);
        }
        saveUrlRef.current = setTimeout(() => syncCoverUrl(value), 400);
    };

    const hasContent = visualPrompt || imageKeyword || coverUrl;
    if (!hasContent && !showUrlField) {
        return null;
    }

    const keywordTrimmed = imageKeyword.trim();

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 1, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Ảnh cover / Thumbnail
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                Dùng prompt EN cho AI sinh ảnh, hoặc từ khóa ngắn để tìm trên Google Images.
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>
                            Visual prompt (EN — AI image)
                        </Typography>
                        {visualPrompt && (
                            <Tooltip title="Sao chép prompt">
                                <IconButton size="small" onClick={() => copyMarketingText(visualPrompt)}>
                                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                    <TextField
                        fullWidth
                        multiline
                        minRows={2}
                        maxRows={6}
                        size="small"
                        placeholder="Detailed English prompt for cover image generation…"
                        value={visualPrompt}
                        onChange={(e) => handleVisualChange(e.target.value)}
                        onBlur={() => saveCoverMeta(visualPrompt, imageKeyword)}
                        sx={{
                            '& .MuiInputBase-input': {
                                fontFamily: 'monospace',
                                fontSize: 12,
                            },
                        }}
                    />
                </Box>

                <Box>
                    <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                        Từ khóa Google Images (EN, 2–6 từ)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <TextField
                            size="small"
                            fullWidth
                            sx={{ flex: 1, minWidth: 200 }}
                            placeholder="cozy cabin forest"
                            value={imageKeyword}
                            onChange={(e) => handleKeywordChange(e.target.value)}
                            onBlur={() => saveCoverMeta(visualPrompt, imageKeyword)}
                            InputProps={{
                                sx: { fontFamily: 'monospace', fontSize: 12 },
                            }}
                        />
                        {keywordTrimmed ? (
                            <Link
                                component="button"
                                type="button"
                                variant="body2"
                                onClick={() => window.open(
                                    buildGoogleImagesUrl(keywordTrimmed),
                                    '_blank',
                                    'noopener,noreferrer',
                                )}
                                sx={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    whiteSpace: 'nowrap',
                                    mt: 1,
                                    fontFamily: 'monospace',
                                    fontSize: 12,
                                }}
                            >
                                Mở Google Images
                                <OpenInNewIcon sx={{ fontSize: 14 }} />
                            </Link>
                        ) : null}
                    </Box>
                </Box>

                {showUrlField && (
                    <Box>
                        <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                            URL ảnh cover
                        </Typography>
                        <TextField
                            size="small"
                            fullWidth
                            placeholder="https://..."
                            value={coverUrl}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            onBlur={() => syncCoverUrl(coverUrl)}
                        />
                    </Box>
                )}
            </Box>
        </Paper>
    );
}
