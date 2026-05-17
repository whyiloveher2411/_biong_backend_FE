import React from 'react';
import {
    Alert,
    Box,
    Typography,
    Chip,
    List,
    ListItemButton,
    ListItemText,
    Divider,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import Markdown from 'components/atoms/Markdown';

export type SerpOrganicItem = {
    title?: string;
    link?: string;
    snippet?: string;
    position?: number;
};

export type SerpRelatedItem = { query?: string };

export type SerpData = {
    organic?: SerpOrganicItem[];
    relatedSearches?: SerpRelatedItem[];
};

export type PipelineSummary = {
    topic?: string;
    writing_framework?: string;
    serp_data?: SerpData;
    serp_sources?: Array<{ title?: string; url?: string; snippet?: string }>;
    angles?: Array<{ id: string; title: string; summary?: string; why_unique?: string }>;
    selected_angle_id?: string;
    selected_angle?: { id: string; title: string; summary?: string } | null;
    outline?: {
        framework?: string;
        seo_keywords?: string[];
        sections?: Array<{
            heading: string;
            level?: number;
            key_points?: string[];
            emotional_hook?: string;
            reader_pain?: string;
        }>;
    };
    research_sources?: Array<{ title?: string; url?: string; snippet?: string }>;
    drafts?: { writer?: string; editor?: string; editor_with_slots?: string; reviewer_issues?: unknown[] };
    editorial_completed_substeps?: string[];
    editorial_passes?: Record<string, unknown>;
    completed_stages?: string[];
    image_placements?: Array<{
        id: string;
        role?: string;
        after_heading?: string;
        alt_text?: string;
        visual_prompt?: string;
        image_keyword?: string;
        placement_hint?: string;
        url?: string;
    }>;
    visual_prompt?: string;
    cover_image_keyword?: string;
    meta_description?: string;
    draft_title?: string;
    image_keyword?: string;
    text_on_image?: string;
};

const CONTENT_TYPE_LABELS: Record<string, string> = {
    long_form: 'Long-form / Blog',
    single_image: 'Single Image',
    carousel: 'Carousel',
    reels: 'Reels',
};

const FRAMEWORK_LABELS: Record<string, string> = {
    pas: 'PAS',
    storytelling: 'Storytelling',
};

function truncate(str: string, max: number): string {
    const s = String(str || '').trim();
    if (s.length <= max) return s;
    return s.slice(0, max) + '…';
}

function SummaryHeader({ title, subtitle }: { title: string; subtitle?: string }) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CheckCircleOutlineIcon fontSize="small" />
                {title}
            </Typography>
            {subtitle && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
                    {subtitle}
                </Typography>
            )}
        </Box>
    );
}

function SetupSummary({
    pipeline,
    contentType,
    onOpenRelatedSearch,
}: {
    pipeline: PipelineSummary;
    contentType: string;
    onOpenRelatedSearch: (query: string) => void;
}) {
    const organic = pipeline.serp_data?.organic || [];
    const related = pipeline.serp_data?.relatedSearches || [];
    const legacySources = pipeline.serp_sources || [];
    const hasSerp = organic.length > 0 || related.length > 0 || legacySources.length > 0;
    const hasTopic = Boolean(String(pipeline.topic || '').trim());

    if (!hasTopic && !hasSerp) return null;

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader
                title="Đã lưu — Thiết lập & SERP"
                subtitle="Cấu hình chủ đề và nguồn tham khảo từ Google Search"
            />
            {hasTopic && (
                <Box sx={{ mb: hasSerp ? 2 : 0 }}>
                    <Typography variant="body2" sx={{ mb: 0.5 }}>
                        <strong>Chủ đề:</strong> {pipeline.topic}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        <Chip size="small" label={CONTENT_TYPE_LABELS[contentType] || contentType} />
                        <Chip
                            size="small"
                            label={FRAMEWORK_LABELS[pipeline.writing_framework || 'pas'] || pipeline.writing_framework}
                            variant="outlined"
                        />
                    </Box>
                </Box>
            )}
            {organic.length > 0 && (
                <Box sx={{ mb: related.length > 0 ? 2 : 0 }}>
                    <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                        Kết quả organic ({organic.length})
                    </Typography>
                    <List dense disablePadding sx={{ bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
                        {organic.slice(0, 10).map((item, i) => (
                            <ListItemButton
                                key={`o-${i}-${item.link}`}
                                component="a"
                                href={item.link || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                disabled={!item.link}
                                divider={i < Math.min(organic.length, 10) - 1}
                                sx={{ py: 0.75 }}
                            >
                                <ListItemText
                                    primary={
                                        <Typography variant="body2" fontWeight={600}>
                                            {item.position ? `${item.position}. ` : ''}
                                            {item.title || item.link}
                                            <OpenInNewIcon sx={{ fontSize: 12, ml: 0.5, verticalAlign: 'middle', opacity: 0.5 }} />
                                        </Typography>
                                    }
                                    secondary={truncate(item.snippet || item.link || '', 120)}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
            )}
            {related.length > 0 && (
                <Box>
                    <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                        Tìm kiếm liên quan ({related.length})
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {related.map((item, i) => (
                            <Chip
                                key={`r-${i}`}
                                size="small"
                                icon={<SearchIcon />}
                                label={item.query}
                                clickable
                                variant="outlined"
                                onClick={() => item.query && onOpenRelatedSearch(item.query)}
                            />
                        ))}
                    </Box>
                </Box>
            )}
            {!organic.length && legacySources.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {legacySources.map((s, i) => (
                        <Chip
                            key={i}
                            size="small"
                            label={s.title || s.url}
                            clickable={!!s.url}
                            onClick={() => s.url && window.open(s.url, '_blank', 'noopener,noreferrer')}
                        />
                    ))}
                </Box>
            )}
        </Alert>
    );
}

function AnglesSummary({ pipeline }: { pipeline: PipelineSummary }) {
    const angles = pipeline.angles || [];
    if (!angles.length) return null;
    const selected = pipeline.selected_angle
        || angles.find((a) => a.id === pipeline.selected_angle_id);

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader
                title="Đã lưu — Góc nhìn"
                subtitle={`${angles.length} góc nhìn từ Google Overview${selected ? ' · đã chọn 1 góc' : ' · chọn 1 góc bên dưới'}`}
            />
            {selected && (
                <Chip
                    size="small"
                    color="primary"
                    label={`Đang chọn: ${selected.title}`}
                    sx={{ mb: 1.5 }}
                />
            )}
            {angles.map((a, i) => (
                <Box
                    key={a.id}
                    sx={{
                        mb: i < angles.length - 1 ? 1.5 : 0,
                        p: 1.25,
                        borderRadius: 1,
                        bgcolor: a.id === pipeline.selected_angle_id ? 'rgba(25, 118, 210, 0.08)' : 'rgba(255,255,255,0.45)',
                        border: '1px solid',
                        borderColor: a.id === pipeline.selected_angle_id ? 'primary.light' : 'divider',
                    }}
                >
                    <Typography variant="body2" fontWeight={700}>
                        {i + 1}. {a.title}
                    </Typography>
                    {a.summary && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {a.summary}
                        </Typography>
                    )}
                    {a.why_unique && (
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            <strong>Khác biệt:</strong> {a.why_unique}
                        </Typography>
                    )}
                </Box>
            ))}
        </Alert>
    );
}

function ResearchSummary({
    pipeline,
    knowledgeBase,
}: {
    pipeline: PipelineSummary;
    knowledgeBase: string;
}) {
    const kb = knowledgeBase || '';
    const sources = pipeline.research_sources || [];
    if (!kb && !sources.length) return null;

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader
                title="Đã lưu — Nghiên cứu"
                subtitle="Knowledge base và nguồn tham khảo cho các bước sau"
            />
            {kb && (
                <Box
                    sx={{
                        maxHeight: 220,
                        overflow: 'auto',
                        mb: sources.length ? 2 : 0,
                        p: 1.25,
                        borderRadius: 1,
                        bgcolor: 'rgba(255,255,255,0.5)',
                        '& p': { margin: '0.35em 0' },
                        fontSize: 13,
                    }}
                >
                    <Markdown>{truncate(kb, 4000)}</Markdown>
                </Box>
            )}
            {sources.length > 0 && (
                <Box>
                    <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                        Nguồn ({sources.length})
                    </Typography>
                    <List dense disablePadding>
                        {sources.slice(0, 8).map((s, i) => (
                            <ListItemButton
                                key={`src-${i}`}
                                component="a"
                                href={s.url || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                disabled={!s.url}
                                divider={i < Math.min(sources.length, 8) - 1}
                                sx={{ py: 0.5, px: 0 }}
                            >
                                <ListItemText
                                    primary={<Typography variant="body2">{s.title || s.url}</Typography>}
                                    secondary={truncate(s.snippet || s.url || '', 100)}
                                />
                            </ListItemButton>
                        ))}
                    </List>
                </Box>
            )}
        </Alert>
    );
}

function OutlineSummary({ pipeline }: { pipeline: PipelineSummary }) {
    const sections = pipeline.outline?.sections || [];
    if (!sections.length) return null;

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader
                title="Đã lưu — Dàn ý chiến lược"
                subtitle={`${sections.length} mục · khung ${FRAMEWORK_LABELS[pipeline.outline?.framework || ''] || pipeline.outline?.framework || 'PAS'}`}
            />
            {(pipeline.outline?.seo_keywords || []).length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                    {(pipeline.outline?.seo_keywords || []).slice(0, 12).map((kw, i) => (
                        <Chip key={i} size="small" label={String(kw)} variant="outlined" />
                    ))}
                </Box>
            )}
            {sections.map((sec, i) => (
                <Box key={i} sx={{ mb: i < sections.length - 1 ? 1.5 : 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                        {sec.level ? 'H' + sec.level + ': ' : ''}{sec.heading}
                    </Typography>
                    {(sec.key_points || []).map((pt, j) => (
                        <Typography key={j} variant="body2" color="text.secondary" sx={{ pl: 1.5, mt: 0.25 }}>
                            • {pt}
                        </Typography>
                    ))}
                    {sec.emotional_hook && (
                        <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                            Hook: {sec.emotional_hook}
                        </Typography>
                    )}
                    {sec.reader_pain && (
                        <Typography variant="caption" color="text.secondary" display="block">
                            Nỗi đau: {sec.reader_pain}
                        </Typography>
                    )}
                </Box>
            ))}
        </Alert>
    );
}

function WriterSummary({ pipeline, contentType }: { pipeline: PipelineSummary; contentType: string }) {
    const writerRaw = pipeline.drafts?.writer || '';
    if (!writerRaw) return null;

    if (contentType === 'single_image') {
        return (
            <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <SummaryHeader title="Đã lưu — Bản thảo (Single Image)" />
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 1 }}>{writerRaw}</Typography>
                {pipeline.visual_prompt && (
                    <>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" fontWeight={600}>Visual prompt</Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>{pipeline.visual_prompt}</Typography>
                    </>
                )}
            </Alert>
        );
    }

    if (contentType === 'carousel') {
        let slides: Array<{ headline?: string; body?: string }> = [];
        try {
            const parsed = JSON.parse(writerRaw);
            slides = Array.isArray(parsed?.slides) ? parsed.slides : [];
        } catch {
            /* ignore */
        }
        return (
            <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <SummaryHeader title="Đã lưu — Bản thảo (Carousel)" subtitle={`${slides.length || '?'} slide`} />
                {slides.map((sl, i) => (
                    <Box key={i} sx={{ mb: 1 }}>
                        <Typography variant="body2" fontWeight={700}>Slide {i + 1}: {sl.headline}</Typography>
                        <Typography variant="body2" color="text.secondary">{sl.body}</Typography>
                    </Box>
                ))}
            </Alert>
        );
    }

    if (contentType === 'reels') {
        let data: { hook?: string; script?: Array<{ time?: string; text?: string }> } = {};
        try {
            data = JSON.parse(writerRaw);
        } catch {
            /* ignore */
        }
        return (
            <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
                <SummaryHeader title="Đã lưu — Bản thảo (Reels)" />
                {data.hook && (
                    <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>Hook: {data.hook}</Typography>
                )}
                {(data.script || []).map((line, i) => (
                    <Typography key={i} variant="body2" color="text.secondary">
                        [{line.time}] {line.text}
                    </Typography>
                ))}
            </Alert>
        );
    }

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader
                title="Đã lưu — Bản thảo (Writer)"
                subtitle={pipeline.draft_title || undefined}
            />
            {pipeline.draft_title && (
                <Typography variant="body2" fontWeight={700} sx={{ mb: 1 }}>{pipeline.draft_title}</Typography>
            )}
            <Box sx={{ maxHeight: 240, overflow: 'auto', bgcolor: 'rgba(255,255,255,0.5)', p: 1.25, borderRadius: 1 }}>
                <Markdown>{truncate(writerRaw, 6000)}</Markdown>
            </Box>
        </Alert>
    );
}

function ReviewerSummary({ pipeline }: { pipeline: PipelineSummary }) {
    const issues = (pipeline.drafts?.reviewer_issues || []) as Array<{
        section?: string;
        type?: string;
        problem?: string;
        suggestion?: string;
    }>;
    if (!issues.length) return null;

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader title="Đã lưu — Phản biện" subtitle={`${issues.length} nhận xét`} />
            {issues.map((issue, i) => (
                <Box key={i} sx={{ mb: i < issues.length - 1 ? 1.5 : 0 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', flexWrap: 'wrap' }}>
                        {issue.type && (
                            <Chip size="small" label={issue.type} variant="outlined" sx={{ height: 20, fontSize: 10 }} />
                        )}
                        {issue.section && (
                            <Typography variant="caption" color="primary" fontWeight={600}>{issue.section}</Typography>
                        )}
                    </Box>
                    <Typography variant="body2">{issue.problem}</Typography>
                    {issue.suggestion && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                            → {issue.suggestion}
                        </Typography>
                    )}
                </Box>
            ))}
        </Alert>
    );
}

function IllustrationsSummary({ pipeline }: { pipeline: PipelineSummary }) {
    const placements = pipeline.image_placements || [];
    if (!placements.length) return null;

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader title="Đã lưu — Minh họa" subtitle={`${placements.length} ảnh`} />
            {placements.map((img, i) => (
                <Box key={img.id || i} sx={{ mb: i < placements.length - 1 ? 1.5 : 0 }}>
                    <Typography variant="body2" fontWeight={700}>
                        {img.role === 'cover' ? 'Cover' : 'Inline'} — {img.alt_text || img.id}
                    </Typography>
                    {img.after_heading && (
                        <Typography variant="caption" color="text.secondary" display="block">
                            Sau: {img.after_heading}
                        </Typography>
                    )}
                    {img.placement_hint && (
                        <Typography variant="caption" color="text.secondary" display="block">
                            {img.placement_hint}
                        </Typography>
                    )}
                    {img.visual_prompt && (
                        <Box
                            sx={{
                                mt: 0.75,
                                p: 1,
                                bgcolor: 'rgba(255,255,255,0.6)',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                            }}
                        >
                            <Typography variant="caption" fontWeight={600} display="block" sx={{ mb: 0.5 }}>
                                Visual prompt (EN)
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    fontFamily: 'monospace',
                                    fontSize: 11,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {img.visual_prompt}
                            </Typography>
                        </Box>
                    )}
                    {img.image_keyword && (
                        <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                            <strong>Từ khóa Google Images:</strong> {img.image_keyword}
                        </Typography>
                    )}
                </Box>
            ))}
        </Alert>
    );
}

function EditorSummary({ pipeline }: { pipeline: PipelineSummary }) {
    const content = pipeline.drafts?.editor || '';
    if (!content) return null;

    return (
        <Alert severity="info" sx={{ '& .MuiAlert-message': { width: '100%' } }}>
            <SummaryHeader title="Đã lưu — Biên tập" subtitle={pipeline.draft_title || undefined} />
            {pipeline.draft_title && (
                <Typography variant="body2" fontWeight={700}>{pipeline.draft_title}</Typography>
            )}
            {pipeline.meta_description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1 }}>
                    <strong>Meta:</strong> {pipeline.meta_description}
                </Typography>
            )}
            {pipeline.visual_prompt && (
                <Typography variant="caption" display="block" sx={{ mb: 0.5, fontFamily: 'monospace' }}>
                    Visual prompt: {truncate(pipeline.visual_prompt, 200)}
                </Typography>
            )}
            {(pipeline.cover_image_keyword || (pipeline.image_placements || []).find((p) => p.role === 'cover')?.image_keyword) && (
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                    <strong>Từ khóa Google Images:</strong>{' '}
                    {pipeline.cover_image_keyword
                        || (pipeline.image_placements || []).find((p) => p.role === 'cover')?.image_keyword}
                </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                {content.length.toLocaleString('vi-VN')} ký tự — cuộn để xem toàn bộ
            </Typography>
            <Box sx={{ maxHeight: 360, overflow: 'auto', bgcolor: 'rgba(255,255,255,0.5)', p: 1.25, borderRadius: 1, mt: 1 }}>
                <Markdown>{content}</Markdown>
            </Box>
        </Alert>
    );
}

interface Props {
    stage: string;
    pipeline: PipelineSummary;
    contentType: string;
    post: Record<string, unknown>;
    buildGoogleSerpUrl: (topic: string) => string;
}

export default function StageSavedSummary({ stage, pipeline, contentType, post, buildGoogleSerpUrl }: Props) {
    const completed = (pipeline.completed_stages || []).includes(stage);

    if (stage === 'setup') {
        return (
            <SetupSummary
                pipeline={pipeline}
                contentType={contentType}
                onOpenRelatedSearch={(q) => window.open(buildGoogleSerpUrl(q), '_blank', 'noopener,noreferrer')}
            />
        );
    }

    if (!completed && stage !== 'setup') {
        return null;
    }

    switch (stage) {
        case 'angles':
            return <AnglesSummary pipeline={pipeline} />;
        case 'research':
            return (
                <ResearchSummary
                    pipeline={pipeline}
                    knowledgeBase={String(post.knowledge_base || '')}
                />
            );
        case 'outline':
            return <OutlineSummary pipeline={pipeline} />;
        case 'writer':
            return <WriterSummary pipeline={pipeline} contentType={contentType} />;
        case 'reviewer':
            return <ReviewerSummary pipeline={pipeline} />;
        case 'editor':
            return <EditorSummary pipeline={pipeline} />;
        case 'editorial': {
            const done = (pipeline.editorial_completed_substeps || []).length;
            if (!done) return null;
            return (
                <Alert severity="info">
                    <SummaryHeader
                        title="Biên tập nâng cao"
                        subtitle={`${(pipeline.editorial_completed_substeps || []).length} bước đã hoàn thành`}
                    />
                </Alert>
            );
        }
        case 'illustrations':
            return <IllustrationsSummary pipeline={pipeline} />;
        case 'image_urls': {
            const placements = pipeline.image_placements || [];
            const withUrl = placements.filter((p) => String(p.url || '').trim()).length;
            if (!placements.length) return null;
            return (
                <Alert severity="info">
                    <SummaryHeader
                        title="Đã cập nhật URL ảnh"
                        subtitle={`${withUrl}/${placements.length} ảnh có URL`}
                    />
                </Alert>
            );
        }
        default:
            return null;
    }
}
