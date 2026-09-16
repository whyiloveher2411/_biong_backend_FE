import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    Collapse,
    IconButton,
    Radio,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';
import type {
    YoutubeSeoScore,
    YoutubeTitleItem,
    YoutubeTitleParseResult,
} from 'helpers/shortVideoYoutubeTitleResponse';
import { translateYoutubeLabel } from 'helpers/shortVideoYoutubeLabelVi';

type Props = {
    parsed: YoutubeTitleParseResult;
    /** Tiêu đề user đã chọn ('' = chưa chọn). */
    selectedTitle?: string;
    onSelectTitle?: (title: string) => void;
};

function scoreColor(value: number | null): 'success' | 'warning' | 'default' {
    if (value === null) {
        return 'default';
    }
    if (value >= 8.5) {
        return 'success';
    }
    if (value >= 7) {
        return 'warning';
    }
    return 'default';
}

/** Nút copy nhanh tiêu đề (dùng chung cho card + winner). */
function QuickCopyTitleButton({ title, label }: { title: string; label?: string }) {
    const [copied, setCopied] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    const handleCopy = React.useCallback(async (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!title.trim()) {
            return;
        }
        const ok = await writePromptTextToClipboard(title);
        if (!ok) {
            return;
        }
        setCopied(true);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => setCopied(false), 2000);
    }, [title]);

    return (
        <Tooltip title={copied ? 'Đã copy' : (label || 'Copy tiêu đề')} placement="top">
            <span>
                <IconButton
                    size="small"
                    disabled={!title.trim()}
                    onClick={handleCopy}
                    aria-label={label || 'Copy tiêu đề'}
                    sx={{ p: 0.5 }}
                >
                    {copied
                        ? <CheckIcon sx={{ fontSize: 16 }} color="success" />
                        : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                </IconButton>
            </span>
        </Tooltip>
    );
}

/** State copy dùng chung cho các nút copy text (description, tags…). */
function useCopyFeedback() {
    const [copied, setCopied] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    const copy = React.useCallback(async (text: string) => {
        if (!text.trim()) {
            return false;
        }
        const ok = await writePromptTextToClipboard(text);
        if (!ok) {
            return false;
        }
        setCopied(true);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => setCopied(false), 2000);
        return true;
    }, []);

    return { copied, copy };
}

/** Nút copy dạng button có nhãn (dùng cho description / tags). */
function CopyTextButton({ text, label, fullWidth }: { text: string; label: string; fullWidth?: boolean }) {
    const { copied, copy } = useCopyFeedback();

    return (
        <Button
            size="small"
            variant="outlined"
            disabled={!text.trim()}
            startIcon={copied
                ? <CheckIcon fontSize="small" color="success" />
                : <ContentCopyIcon fontSize="small" />}
            onClick={(event) => {
                event.stopPropagation();
                void copy(text);
            }}
            sx={{
                textTransform: 'none',
                fontSize: 11,
                py: 0.25,
                minHeight: 26,
                ...(fullWidth ? { width: '100%' } : {}),
            }}
        >
            {copied ? 'Đã copy' : label}
        </Button>
    );
}

function scoreChipColor(value: number | null): 'success' | 'warning' | 'error' | 'default' {
    if (value === null) {
        return 'default';
    }
    if (value >= 80) {
        return 'success';
    }
    if (value >= 60) {
        return 'warning';
    }
    return 'error';
}

/** Box điểm SEO to, rõ — click để xem nhận xét chi tiết. */
function SeoScoreCard({ label, seo }: { label: string; seo: YoutubeSeoScore | null }) {
    const [open, setOpen] = React.useState(false);
    if (!seo) {
        return null;
    }
    const color = scoreChipColor(seo.score);
    const colorMain = color === 'success'
        ? 'success.main'
        : color === 'warning'
            ? 'warning.main'
            : color === 'error'
                ? 'error.main'
                : 'text.disabled';
    const hasNotes = seo.notes.length > 0;

    return (
        <Box
            onClick={() => hasNotes && setOpen((prev) => !prev)}
            sx={{
                flex: 1,
                minWidth: 150,
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.25,
                bgcolor: 'background.paper',
                cursor: hasNotes ? 'pointer' : 'default',
            }}
        >
            <Typography variant="caption" fontWeight={700} color="text.secondary">
                {label}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={0.5} sx={{ mt: 0.25 }}>
                <Typography sx={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: colorMain }}>
                    {seo.score ?? '—'}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    /100
                </Typography>
                {hasNotes ? (
                    <ExpandMoreIcon
                        fontSize="small"
                        sx={{
                            ml: 'auto',
                            color: 'text.disabled',
                            transform: open ? 'rotate(180deg)' : 'none',
                            transition: 'transform 150ms',
                        }}
                    />
                ) : null}
            </Stack>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <Box component="ul" sx={{ m: 0, mt: 1, pl: 2 }}>
                    {seo.notes.map((note, index) => (
                        <Box component="li" key={index} sx={{ mb: 0.25 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.45 }}>
                                {note}
                            </Typography>
                        </Box>
                    ))}
                </Box>
            </Collapse>
        </Box>
    );
}

function TitleItemCard({
    item,
    selected,
    selectable,
    onSelect,
}: {
    item: YoutubeTitleItem;
    selected: boolean;
    selectable: boolean;
    onSelect: () => void;
}) {
    const [expanded, setExpanded] = React.useState(false);
    const hasDetails = Boolean(item.curiosityGap || item.curiosityDevice)
        || item.subScores.length > 0
        || item.why.length > 0;

    return (
        <Box
            onClick={selectable ? onSelect : undefined}
            sx={{
                border: 1,
                borderColor: selected ? 'primary.main' : 'divider',
                borderRadius: 2,
                px: 1.25,
                py: 1,
                bgcolor: selected ? 'action.selected' : 'background.paper',
                cursor: selectable ? 'pointer' : 'default',
            }}
        >
            <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                    size="small"
                    color="primary"
                    label={item.rankLabel}
                    sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11, fontWeight: 700 } }}
                />
                <Typography sx={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 13.5, lineHeight: 1.35 }}>
                    {item.title || '(không có tiêu đề)'}
                </Typography>
                {item.viralScore ? (
                    <Chip
                        size="small"
                        color={scoreColor(item.viralScoreValue)}
                        label={item.viralScore}
                        sx={{ height: 20, '& .MuiChip-label': { px: 0.75, fontSize: 11, fontWeight: 700 } }}
                    />
                ) : null}
                {item.title ? (
                    <QuickCopyTitleButton title={item.title} label={`Copy tiêu đề ${item.rankLabel}`} />
                ) : null}
                {hasDetails ? (
                    <Tooltip title={expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}>
                        <IconButton
                            size="small"
                            aria-label={expanded ? 'Ẩn chi tiết' : 'Xem chi tiết'}
                            onClick={(event) => {
                                event.stopPropagation();
                                setExpanded((prev) => !prev);
                            }}
                            sx={{ p: 0.25 }}
                        >
                            <ExpandMoreIcon
                                fontSize="small"
                                sx={{
                                    color: 'text.secondary',
                                    transform: expanded ? 'rotate(180deg)' : 'none',
                                    transition: 'transform 150ms',
                                }}
                            />
                        </IconButton>
                    </Tooltip>
                ) : null}
                {selectable && item.title ? (
                    <Radio
                        size="small"
                        checked={selected}
                        onChange={(event) => {
                            event.stopPropagation();
                            onSelect();
                        }}
                        inputProps={{ 'aria-label': `Chọn tiêu đề ${item.rankLabel}` }}
                        sx={{ p: 0.25 }}
                    />
                ) : null}
            </Stack>

            <Collapse in={expanded} timeout="auto" unmountOnExit>
                <Box sx={{ pt: 0.5 }}>
                    {item.curiosityGap || item.curiosityDevice ? (
                        <Typography
                            variant="caption"
                            sx={{ display: 'block', fontSize: 11.5, lineHeight: 1.4, color: 'text.secondary' }}
                        >
                            {item.curiosityDevice ? <strong>{translateYoutubeLabel(item.curiosityDevice)}</strong> : null}
                            {item.curiosityDevice && item.curiosityGap ? ' · ' : null}
                            {item.curiosityGap}
                        </Typography>
                    ) : null}

                    {item.subScores.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                            {item.subScores.map((score) => (
                                <Chip
                                    key={score.label}
                                    size="small"
                                    variant="outlined"
                                    label={`${translateYoutubeLabel(score.label)}: ${score.value}`}
                                    sx={{ height: 18, '& .MuiChip-label': { px: 0.6, fontSize: 10 } }}
                                />
                            ))}
                        </Stack>
                    ) : null}

                    {item.why.length > 0 ? (
                        <Box component="ul" sx={{ m: 0, mt: 0.75, pl: 2 }}>
                            {item.why.map((point, index) => (
                                <Box component="li" key={index} sx={{ mb: 0.25 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.45 }}>
                                        {point.label ? <strong>{translateYoutubeLabel(point.label)}: </strong> : null}
                                        {point.text}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    ) : null}
                </Box>
            </Collapse>
        </Box>
    );
}

export default function ShortVideoAgentYoutubeTitleList({
    parsed,
    selectedTitle = '',
    onSelectTitle,
}: Props) {
    const selectable = Boolean(onSelectTitle);
    const hasItems = parsed.items.length > 0;
    const hasAudience = parsed.audienceInsight.length > 0;
    const hasWinner = Boolean(parsed.winner && (parsed.winner.title || parsed.winner.sections.length > 0));
    const packaging = parsed.packaging;
    const hasPackaging = Boolean(
        packaging
        && (packaging.concepts.length > 0
            || packaging.textOptions.length > 0
            || packaging.combinations.length > 0
            || packaging.refinements.length > 0),
    );

    const description = parsed.description || '';
    const firstComment = parsed.firstComment || '';
    const hashtags = parsed.hashtags;
    const tags = parsed.tags;
    const seoTitle = parsed.seo?.title ?? null;
    const seoDescription = parsed.seo?.description ?? null;
    const hasDescription = Boolean(description) || hashtags.length > 0;
    const hasFirstComment = Boolean(firstComment);
    const hasTags = tags.length > 0;
    const hasSeo = Boolean(seoTitle || seoDescription);

    if (!hasItems && !hasAudience && !hasWinner && !hasPackaging && !hasDescription && !hasFirstComment && !hasTags && !hasSeo) {
        return null;
    }

    return (
        <Stack spacing={1.5}>
            {hasDescription ? (
                <Box
                    sx={{
                        border: 1,
                        borderColor: 'primary.main',
                        borderRadius: 2,
                        p: 1.25,
                        bgcolor: 'action.hover',
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 0.75 }}
                    >
                        <Typography variant="caption" fontWeight={700} color="primary.main">
                            MÔ TẢ VIDEO
                        </Typography>
                        <CopyTextButton text={description} label="Copy mô tả" />
                    </Stack>
                    {description ? (
                        <Typography
                            variant="body2"
                            sx={{ fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                        >
                            {description}
                        </Typography>
                    ) : null}
                    {hashtags.length > 0 ? (
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                            {hashtags.map((tag) => (
                                <Chip
                                    key={tag}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    label={tag}
                                    sx={{ height: 20, '& .MuiChip-label': { px: 0.6, fontSize: 10.5 } }}
                                />
                            ))}
                        </Stack>
                    ) : null}
                </Box>
            ) : null}

            {hasFirstComment ? (
                <Box
                    sx={{
                        border: 1,
                        borderColor: 'secondary.main',
                        borderRadius: 2,
                        p: 1.25,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 0.75 }}
                    >
                        <Typography variant="caption" fontWeight={700} color="secondary.main">
                            COMMENT ĐẦU TIÊN (ghim)
                        </Typography>
                        <CopyTextButton text={firstComment} label="Copy comment" />
                    </Stack>
                    <Typography
                        variant="body2"
                        sx={{ fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                    >
                        {firstComment}
                    </Typography>
                </Box>
            ) : null}

            {hasTags ? (
                <Box
                    sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1.25,
                        bgcolor: 'background.paper',
                    }}
                >
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        spacing={1}
                        sx={{ mb: 0.75 }}
                    >
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            TAGS ({tags.length})
                        </Typography>
                        <CopyTextButton text={tags.join(', ')} label="Copy tags" />
                    </Stack>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {tags.map((tag) => (
                            <Chip
                                key={tag}
                                size="small"
                                variant="outlined"
                                label={tag}
                                sx={{ height: 20, '& .MuiChip-label': { px: 0.6, fontSize: 10.5 } }}
                            />
                        ))}
                    </Stack>
                </Box>
            ) : null}

            {hasSeo ? (
                <Box>
                    <Typography
                        variant="caption"
                        fontWeight={700}
                        color="text.secondary"
                        sx={{ display: 'block', mb: 0.5 }}
                    >
                        ĐIỂM SEO (bấm để xem chi tiết)
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <SeoScoreCard label="Tiêu đề" seo={seoTitle} />
                        <SeoScoreCard label="Mô tả" seo={seoDescription} />
                    </Stack>
                </Box>
            ) : null}

            {hasAudience ? (
                <Box
                    sx={{
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 2,
                        p: 1.25,
                        bgcolor: 'action.hover',
                    }}
                >
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                        CHÂN DUNG KHÁN GIẢ
                    </Typography>
                    <Stack spacing={0.5} sx={{ mt: 0.75 }}>
                        {parsed.audienceInsight.map((entry) => (
                            <Typography key={entry.label} variant="body2" sx={{ fontSize: 12, lineHeight: 1.45 }}>
                                {entry.label ? <strong>{translateYoutubeLabel(entry.label)}: </strong> : null}
                                {entry.value}
                            </Typography>
                        ))}
                    </Stack>
                </Box>
            ) : null}

            {hasItems ? (
                <Stack spacing={1}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                        TOP {parsed.items.length} TIÊU ĐỀ{selectable ? ' — chọn 1 để dùng cho thumbnail' : ''}
                    </Typography>
                    {parsed.items.map((item) => (
                        <TitleItemCard
                            key={`${item.rankNumber}-${item.title}`}
                            item={item}
                            selected={Boolean(item.title) && item.title === selectedTitle}
                            selectable={selectable && Boolean(item.title)}
                            onSelect={() => onSelectTitle?.(item.title)}
                        />
                    ))}
                </Stack>
            ) : null}

            {hasWinner && parsed.winner ? (
                <Accordion
                    disableGutters
                    variant="outlined"
                    sx={{ '&:before': { display: 'none' }, borderRadius: 2, overflow: 'hidden' }}
                >
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon fontSize="small" />}
                        sx={{
                            '& .MuiAccordionSummary-content': {
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                minWidth: 0,
                            },
                        }}
                    >
                        <Typography
                            variant="caption"
                            fontWeight={700}
                            color="success.main"
                            sx={{ minWidth: 0, flex: 1 }}
                        >
                            NGƯỜI THẮNG: {parsed.winner.title || '(không rõ)'}
                        </Typography>
                        {parsed.winner.title ? (
                            <QuickCopyTitleButton title={parsed.winner.title} label="Copy tiêu đề thắng" />
                        ) : null}
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <Stack spacing={1}>
                            {parsed.winner.sections.map((section) => (
                                <Box key={section.heading}>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        {translateYoutubeLabel(section.heading)}
                                    </Typography>
                                    <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                                        {section.lines.map((line, index) => (
                                            <Typography
                                                key={index}
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ fontSize: 12, lineHeight: 1.5 }}
                                            >
                                                {line}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            ) : null}

            {hasPackaging && packaging ? (
                <Accordion
                    disableGutters
                    variant="outlined"
                    sx={{ '&:before': { display: 'none' }, borderRadius: 2, overflow: 'hidden' }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                        <Typography variant="caption" fontWeight={700} color="secondary.main">
                            GỢI Ý ĐÓNG GÓI
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <Stack spacing={1.25}>
                            {packaging.concepts.length > 0 ? (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Ý tưởng ảnh thu nhỏ
                                    </Typography>
                                    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                        {packaging.concepts.map((concept, index) => (
                                            <Typography
                                                key={`${concept.name}-${index}`}
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ fontSize: 12, lineHeight: 1.5 }}
                                            >
                                                <strong>{index + 1}. {concept.name}</strong>
                                                {concept.description ? `: ${concept.description}` : ''}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            ) : null}

                            {packaging.textOptions.length > 0 ? (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Text trên ảnh thu nhỏ
                                    </Typography>
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                                        {packaging.textOptions.map((option) => (
                                            <Chip key={option} size="small" variant="outlined" label={option} />
                                        ))}
                                    </Stack>
                                </Box>
                            ) : null}

                            {packaging.combinations.length > 0 ? (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Kết hợp tiêu đề + ảnh thu nhỏ
                                    </Typography>
                                    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                                        {packaging.combinations.map((combo) => (
                                            <Box key={combo.name}>
                                                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                                                    {translateYoutubeLabel(combo.name)}
                                                </Typography>
                                                {combo.lines.map((line, index) => (
                                                    <Typography
                                                        key={index}
                                                        variant="body2"
                                                        color="text.secondary"
                                                        sx={{ fontSize: 12, lineHeight: 1.5 }}
                                                    >
                                                        {line}
                                                    </Typography>
                                                ))}
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            ) : null}

                            {packaging.refinements.length > 0 ? (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Tinh chỉnh A/B
                                    </Typography>
                                    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
                                        {packaging.refinements.map((line, index) => (
                                            <Typography
                                                key={index}
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ fontSize: 12, lineHeight: 1.5 }}
                                            >
                                                {line}
                                            </Typography>
                                        ))}
                                    </Stack>
                                </Box>
                            ) : null}
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            ) : null}
        </Stack>
    );
}
