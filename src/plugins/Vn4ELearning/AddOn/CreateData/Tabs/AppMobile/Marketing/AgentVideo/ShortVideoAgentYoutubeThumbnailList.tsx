import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RateReviewIcon from '@mui/icons-material/RateReview';
import LoadingButton from 'components/atoms/LoadingButton';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';
import { translateYoutubeLabel } from 'helpers/shortVideoYoutubeLabelVi';
import type {
    YoutubeThumbnailConcept,
    YoutubeThumbnailParseResult,
    YoutubeThumbnailPoint,
} from 'helpers/shortVideoYoutubeThumbnailResponse';

type Props = {
    parsed: YoutubeThumbnailParseResult;
    shortVideoId: number;
    /** rank (dạng string) → URL ảnh đã generate. */
    imageUrls: Record<string, string>;
    /** rank (dạng string) → url chatbot đã tạo ảnh (mở lại để xem/update). */
    chatUrls: Record<string, string>;
    /** rank (dạng string) → feedback đang chờ update (badge + prefill). */
    feedbackNotes: Record<string, string>;
    /** rank đang render đồng bộ ('' nếu không có). */
    generatingRank: string;
    /** rank đang có job pending/processing (icon loading trên ô ảnh). */
    pendingRanks: Set<string>;
    /** rank đang gửi feedback (disable submit). */
    savingFeedbackRank: string;
    onOpenChat: (rank: number) => void;
    onSubmitFeedback: (rank: number, feedback: string) => Promise<boolean>;
    onGenerateImage: (rank: number, prompt: string) => void;
};

/** Chuẩn hóa điểm về thang 100 để tô màu (viral_score là /100). */
function scorePercent(value: number | null, maxValue: number | null = null): number | null {
    if (value === null || !Number.isFinite(value)) {
        return null;
    }
    const max = maxValue && maxValue > 0 ? maxValue : 100;
    return Math.max(0, Math.min(100, (value / max) * 100));
}

function scoreColor(value: number | null): 'success' | 'warning' | 'default' {
    if (value === null) {
        return 'default';
    }
    if (value >= 85) {
        return 'success';
    }
    if (value >= 70) {
        return 'warning';
    }
    return 'default';
}

/** Thanh điểm nhỏ cho score_breakdown trong dialog. */
function ScoreBreakdownBars({ concept }: { concept: YoutubeThumbnailConcept }) {
    if (concept.scoreBreakdown.length === 0) {
        return null;
    }

    const total = concept.scoreBreakdown.reduce((sum, item) => sum + (item.value || 0), 0);
    const maxValue = Math.max(...concept.scoreBreakdown.map((item) => item.value || 0), 1);

    return (
        <Box>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
                Điểm chi tiết{total > 0 ? ` (tổng ${total})` : ''}
            </Typography>
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                {concept.scoreBreakdown.map((item) => {
                    const percent = ((item.value || 0) / maxValue) * 100;
                    return (
                        <Box key={item.key}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="caption" sx={{ fontSize: 11 }}>
                                    {translateYoutubeLabel(item.key)}
                                </Typography>
                                <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600 }}>
                                    {item.value}
                                </Typography>
                            </Stack>
                            <Box
                                sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    bgcolor: 'action.hover',
                                    overflow: 'hidden',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: `${percent}%`,
                                        height: '100%',
                                        bgcolor: 'primary.main',
                                    }}
                                />
                            </Box>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}

function PointList({ points }: { points: YoutubeThumbnailPoint[] }) {
    if (points.length === 0) {
        return null;
    }
    return (
        <Box component="ul" sx={{ m: 0, mt: 0.5, pl: 2 }}>
            {points.map((point, index) => (
                <Box component="li" key={index} sx={{ mb: 0.25 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.45 }}>
                        {point.label ? <strong>{translateYoutubeLabel(point.label)}: </strong> : null}
                        {point.text}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
}

function CopyPromptButton({ prompt, size = 'small' }: { prompt: string; size?: 'small' | 'medium' }) {
    const [copied, setCopied] = React.useState(false);
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    const handleCopy = React.useCallback(async () => {
        if (!prompt.trim()) {
            return;
        }
        const ok = await writePromptTextToClipboard(prompt);
        if (!ok) {
            return;
        }
        setCopied(true);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => setCopied(false), 2000);
    }, [prompt]);

    return (
        <Button
            size={size}
            variant="text"
            disabled={!prompt.trim()}
            startIcon={copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            onClick={() => { void handleCopy(); }}
            sx={{ textTransform: 'none', minWidth: 0, py: 0, px: 0.5, fontSize: 11 }}
        >
            {copied ? 'Đã copy' : 'Copy prompt'}
        </Button>
    );
}

/** 1 ô ảnh trong grid: ảnh đã render hoặc placeholder, overlay loading khi pending. */
function ThumbnailTile({
    concept,
    imageUrl,
    chatUrl,
    feedbackNote,
    loading,
    canGenerate,
    onGenerateImage,
    onOpenDetail,
    onOpenChat,
    onOpenFeedback,
}: {
    concept: YoutubeThumbnailConcept;
    imageUrl: string;
    chatUrl: string;
    feedbackNote: string;
    loading: boolean;
    canGenerate: boolean;
    onGenerateImage: (rank: number, prompt: string) => void;
    onOpenDetail: () => void;
    onOpenChat: () => void;
    onOpenFeedback: () => void;
}) {
    return (
        <Box
            sx={{
                position: 'relative',
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.5,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                aspectRatio: '16 / 9',
            }}
        >
            {imageUrl ? (
                <Box
                    component="img"
                    src={imageUrl}
                    alt={`thumbnail-${concept.rank}`}
                    onClick={() => window.open(imageUrl, '_blank', 'noopener')}
                    sx={{
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        cursor: 'zoom-in',
                    }}
                />
            ) : (
                <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.25}
                    sx={{ height: '100%', color: 'text.disabled' }}
                >
                    <ImageOutlinedIcon fontSize="small" />
                    <Typography variant="caption" sx={{ fontSize: 10 }}>
                        #{concept.rank} chưa có ảnh
                    </Typography>
                </Stack>
            )}

            {/* Số thứ tự */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    px: 0.5,
                    py: 0.25,
                    borderBottomRightRadius: 1,
                    bgcolor: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                }}
            >
                #{concept.rank}
            </Box>

            {/* Điểm viral */}
            {concept.viralScore ? (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 2,
                        left: 28,
                        px: 0.5,
                        py: 0.15,
                        borderRadius: 0.75,
                        bgcolor: 'rgba(0,0,0,0.6)',
                        color: '#fff',
                        fontSize: 10,
                        fontWeight: 700,
                    }}
                >
                    {concept.viralScore}
                </Box>
            ) : null}

            {/* Badge feedback đang chờ update */}
            {feedbackNote ? (
                <Tooltip title={`Đang chờ update theo feedback: ${feedbackNote}`}>
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 30,
                            right: 2,
                            px: 0.5,
                            py: 0.15,
                            borderRadius: 1,
                            bgcolor: 'rgba(255,171,0,0.9)',
                            color: '#1b1b1b',
                            fontSize: 9,
                            fontWeight: 800,
                        }}
                    >
                        CHỜ FEEDBACK
                    </Box>
                </Tooltip>
            ) : null}

            {/* Nút detail */}
            <IconButton
                size="small"
                aria-label={`Chi tiết thumbnail #${concept.rank}`}
                onClick={onOpenDetail}
                sx={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    bgcolor: 'rgba(0,0,0,0.55)',
                    color: '#fff',
                    p: 0.35,
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                }}
            >
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>

            {/* Mở chatbot + để lại feedback (khi ảnh đã có url chatbot) */}
            {imageUrl && chatUrl && !loading ? (
                <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        p: 0.5,
                        bgcolor: 'rgba(0,0,0,0.35)',
                    }}
                >
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        startIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                        onClick={onOpenChat}
                        sx={{
                            textTransform: 'none',
                            fontSize: 10,
                            py: 0.1,
                            color: '#fff',
                            borderColor: 'rgba(255,255,255,0.5)',
                        }}
                    >
                        Chat
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        startIcon={<RateReviewIcon sx={{ fontSize: 13 }} />}
                        onClick={onOpenFeedback}
                        sx={{
                            textTransform: 'none',
                            fontSize: 10,
                            py: 0.1,
                            color: feedbackNote ? '#ffcc80' : '#fff',
                            borderColor: feedbackNote
                                ? 'rgba(255,171,0,0.8)'
                                : 'rgba(255,255,255,0.5)',
                        }}
                    >
                        Feedback
                    </Button>
                </Stack>
            ) : null}

            {/* Loading khi đang render/pending job */}
            {loading ? (
                <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={0.5}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        bgcolor: 'rgba(0,0,0,0.45)',
                        color: '#fff',
                    }}
                >
                    <CircularProgress size={22} sx={{ color: '#fff' }} />
                    <Typography variant="caption" sx={{ fontSize: 10 }}>
                        Đang tạo…
                    </Typography>
                </Stack>
            ) : null}

            {/* Nút tạo ảnh khi chưa có ảnh và không đang chạy */}
            {!imageUrl && !loading ? (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 0.5 }}>
                    <Button
                        size="small"
                        fullWidth
                        variant="outlined"
                        disabled={!canGenerate || !concept.imagePrompt}
                        onClick={() => onGenerateImage(concept.rank, concept.imagePrompt)}
                        sx={{
                            textTransform: 'none',
                            fontSize: 10,
                            py: 0.25,
                            bgcolor: 'background.paper',
                        }}
                    >
                        Tạo ảnh
                    </Button>
                </Box>
            ) : null}
        </Box>
    );
}

function ConceptDetailDialog({
    concept,
    imageUrl,
    chatUrl,
    feedbackNote,
    loading,
    savingFeedback,
    canGenerate,
    onClose,
    onGenerateImage,
    onOpenChat,
    onSubmitFeedback,
}: {
    concept: YoutubeThumbnailConcept | null;
    imageUrl: string;
    chatUrl: string;
    feedbackNote: string;
    loading: boolean;
    savingFeedback: boolean;
    canGenerate: boolean;
    onClose: () => void;
    onGenerateImage: (rank: number, prompt: string) => void;
    onOpenChat: () => void;
    onSubmitFeedback: (rank: number, feedback: string) => Promise<boolean>;
}) {
    const [feedbackDraft, setFeedbackDraft] = React.useState('');

    // Prefill feedback hiện tại khi mở concept khác (không reset theo mỗi lần poll).
    React.useEffect(() => {
        setFeedbackDraft(feedbackNote || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [concept?.rank]);

    return (
        <Dialog open={Boolean(concept)} onClose={onClose} fullWidth maxWidth="sm">
            {concept ? (
                <>
                    <DialogTitle sx={{ pr: 5, fontSize: 15 }}>
                        #{concept.rank} · {concept.conceptName || '(không có tên concept)'}
                        <IconButton
                            size="small"
                            onClick={onClose}
                            aria-label="Đóng"
                            sx={{ position: 'absolute', top: 8, right: 8 }}
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Stack spacing={1.25}>
                            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                {concept.hookType ? (
                                    <Chip size="small" variant="outlined" color="warning" label={concept.hookType} />
                                ) : null}
                                {concept.thumbnailText ? (
                                    <Chip size="small" variant="outlined" color="secondary" label={concept.thumbnailText} />
                                ) : null}
                                {concept.viralScore ? (
                                    <Chip
                                        size="small"
                                        color={scoreColor(scorePercent(concept.viralScoreValue))}
                                        label={`Viral: ${concept.viralScore}`}
                                    />
                                ) : null}
                            </Stack>

                            {concept.hook ? (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        {translateYoutubeLabel('hook')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, lineHeight: 1.5, mt: 0.25 }}>
                                        {concept.hook}
                                    </Typography>
                                </Box>
                            ) : null}

                            <ScoreBreakdownBars concept={concept} />

                            {imageUrl ? (
                                <Box
                                    component="img"
                                    src={imageUrl}
                                    alt={`thumbnail-${concept.rank}`}
                                    onClick={() => window.open(imageUrl, '_blank', 'noopener')}
                                    sx={{
                                        display: 'block',
                                        width: '100%',
                                        borderRadius: 1.5,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        cursor: 'zoom-in',
                                    }}
                                />
                            ) : (
                                <Stack
                                    alignItems="center"
                                    justifyContent="center"
                                    sx={{
                                        height: 160,
                                        borderRadius: 1.5,
                                        border: '1px dashed',
                                        borderColor: 'divider',
                                        color: 'text.disabled',
                                    }}
                                >
                                    <Typography variant="caption">Chưa có ảnh</Typography>
                                </Stack>
                            )}

                            {chatUrl ? (
                                <Box
                                    sx={{
                                        p: 1,
                                        borderRadius: 1.5,
                                        border: '1px solid',
                                        borderColor: feedbackNote ? 'warning.main' : 'divider',
                                        bgcolor: 'action.hover',
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                                            Chatbot &amp; feedback
                                        </Typography>
                                        <Button
                                            size="small"
                                            variant="text"
                                            startIcon={<OpenInNewIcon fontSize="small" />}
                                            onClick={onOpenChat}
                                            sx={{ textTransform: 'none', fontSize: 11, minWidth: 0, py: 0 }}
                                        >
                                            Mở url chatbot
                                        </Button>
                                    </Stack>
                                    {feedbackNote ? (
                                        <Chip
                                            size="small"
                                            color="warning"
                                            sx={{ mt: 0.5, height: 20, fontSize: 10 }}
                                            label={`Đang chờ update theo feedback: ${feedbackNote}`}
                                        />
                                    ) : null}
                                    <TextField
                                        multiline
                                        minRows={3}
                                        fullWidth
                                        size="small"
                                        placeholder="VD: chữ quá nhỏ, đổi nền sáng hơn, chủ thể to hơn…"
                                        value={feedbackDraft}
                                        onChange={(event) => setFeedbackDraft(event.target.value)}
                                        sx={{ mt: 0.75 }}
                                    />
                                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                                        <LoadingButton
                                            size="small"
                                            variant="contained"
                                            loading={savingFeedback}
                                            disabled={savingFeedback || !feedbackDraft.trim()}
                                            onClick={() => {
                                                const note = feedbackDraft.trim();
                                                if (note === '') {
                                                    return;
                                                }
                                                void onSubmitFeedback(concept.rank, note);
                                            }}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Gửi feedback &amp; render lại
                                        </LoadingButton>
                                    </Stack>
                                </Box>
                            ) : null}

                            {concept.why.length > 0 ? (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Vì sao có thể viral
                                    </Typography>
                                    <PointList points={concept.why} />
                                </Box>
                            ) : null}

                            {concept.visualComposition.length > 0 ? (
                                <Box>
                                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                                        Bố cục hình ảnh
                                    </Typography>
                                    <PointList points={concept.visualComposition} />
                                </Box>
                            ) : null}

                            {concept.imagePrompt ? (
                                <Box>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                                            Prompt ảnh
                                        </Typography>
                                        <CopyPromptButton prompt={concept.imagePrompt} />
                                    </Stack>
                                    <Box
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            mt: 0.5,
                                            p: 0.75,
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            bgcolor: 'action.hover',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontSize: 11,
                                            lineHeight: 1.5,
                                            maxHeight: 180,
                                            overflowY: 'auto',
                                        }}
                                    >
                                        {concept.imagePrompt}
                                    </Box>
                                </Box>
                            ) : null}
                        </Stack>
                    </DialogContent>
                    <DialogActions>
                        <LoadingButton
                            size="small"
                            variant="contained"
                            startIcon={<ImageOutlinedIcon fontSize="small" />}
                            loading={loading}
                            disabled={loading || !canGenerate || !concept.imagePrompt}
                            onClick={() => onGenerateImage(concept.rank, concept.imagePrompt)}
                            sx={{ textTransform: 'none' }}
                        >
                            {imageUrl ? 'Tạo lại ảnh' : 'Tạo ảnh'}
                        </LoadingButton>
                        <Button size="small" onClick={onClose} sx={{ textTransform: 'none' }}>
                            Đóng
                        </Button>
                    </DialogActions>
                </>
            ) : null}
        </Dialog>
    );
}

export default function ShortVideoAgentYoutubeThumbnailList({
    parsed,
    shortVideoId,
    imageUrls,
    chatUrls,
    feedbackNotes,
    generatingRank,
    pendingRanks,
    savingFeedbackRank,
    onOpenChat,
    onSubmitFeedback,
    onGenerateImage,
}: Props) {
    const [detailRank, setDetailRank] = React.useState<number | null>(null);

    const hasConcepts = parsed.concepts.length > 0;
    const hasVideoAnalysis = parsed.videoAnalysis.length > 0;
    const hasStrategy = parsed.strategyTriggers.length > 0;
    const hasWinner = Boolean(parsed.winner && (parsed.winner.raw || parsed.winner.points.length > 0));
    const hasAdvice = parsed.packagingAdvice.length > 0;

    const detailConcept = parsed.concepts.find((c) => c.rank === detailRank) || null;

    if (!hasConcepts && !hasVideoAnalysis && !hasStrategy && !hasWinner && !hasAdvice) {
        return null;
    }

    return (
        <Stack spacing={1.5}>
            {hasVideoAnalysis ? (
                <Accordion
                    disableGutters
                    variant="outlined"
                    sx={{ '&:before': { display: 'none' }, borderRadius: 2, overflow: 'hidden' }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            PHÂN TÍCH VIDEO
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <PointList points={parsed.videoAnalysis} />
                    </AccordionDetails>
                </Accordion>
            ) : null}

            {hasStrategy ? (
                <Accordion
                    disableGutters
                    variant="outlined"
                    sx={{ '&:before': { display: 'none' }, borderRadius: 2, overflow: 'hidden' }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                            YẾU TỐ TÂM LÝ
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <PointList points={parsed.strategyTriggers} />
                    </AccordionDetails>
                </Accordion>
            ) : null}

            {hasConcepts ? (
                <Stack spacing={1}>
                    <Typography variant="caption" fontWeight={700} color="text.secondary">
                        {parsed.concepts.length} CONCEPT ẢNH THU NHỎ — bấm icon để xem chi tiết
                    </Typography>
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                            gap: 1,
                        }}
                    >
                        {parsed.concepts.map((concept) => (
                            <ThumbnailTile
                                key={`${concept.rank}-${concept.conceptName}`}
                                concept={concept}
                                imageUrl={imageUrls[String(concept.rank)] || ''}
                                chatUrl={chatUrls[String(concept.rank)] || ''}
                                feedbackNote={feedbackNotes[String(concept.rank)] || ''}
                                loading={
                                    generatingRank === String(concept.rank)
                                    || pendingRanks.has(String(concept.rank))
                                }
                                canGenerate={shortVideoId > 0}
                                onGenerateImage={onGenerateImage}
                                onOpenDetail={() => setDetailRank(concept.rank)}
                                onOpenChat={() => onOpenChat(concept.rank)}
                                onOpenFeedback={() => setDetailRank(concept.rank)}
                            />
                        ))}
                    </Box>
                </Stack>
            ) : null}

            {hasWinner && parsed.winner ? (
                <Accordion
                    disableGutters
                    variant="outlined"
                    sx={{ '&:before': { display: 'none' }, borderRadius: 2, overflow: 'hidden' }}
                >
                    <AccordionSummary expandIcon={<ExpandMoreIcon fontSize="small" />}>
                        <Typography variant="caption" fontWeight={700} color="success.main">
                            NGƯỜI THẮNG: {parsed.winner.raw || '(không rõ)'}
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ pt: 0 }}>
                        <PointList points={parsed.winner.points} />
                    </AccordionDetails>
                </Accordion>
            ) : null}

            {hasAdvice ? (
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
                            {parsed.packagingAdvice.map((item) => (
                                <Box key={item.name}>
                                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                                        {item.name}
                                    </Typography>
                                    <PointList points={item.points} />
                                </Box>
                            ))}
                        </Stack>
                    </AccordionDetails>
                </Accordion>
            ) : null}

            <ConceptDetailDialog
                concept={detailConcept}
                imageUrl={detailConcept ? (imageUrls[String(detailConcept.rank)] || '') : ''}
                chatUrl={detailConcept ? (chatUrls[String(detailConcept.rank)] || '') : ''}
                feedbackNote={detailConcept ? (feedbackNotes[String(detailConcept.rank)] || '') : ''}
                loading={Boolean(detailConcept)
                    && (generatingRank === String(detailConcept.rank)
                        || pendingRanks.has(String(detailConcept.rank)))}
                savingFeedback={Boolean(detailConcept)
                    && savingFeedbackRank === String(detailConcept.rank)}
                canGenerate={shortVideoId > 0}
                onClose={() => setDetailRank(null)}
                onGenerateImage={onGenerateImage}
                onOpenChat={() => {
                    if (detailConcept) {
                        onOpenChat(detailConcept.rank);
                    }
                }}
                onSubmitFeedback={onSubmitFeedback}
            />
        </Stack>
    );
}
