import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Chip,
    IconButton,
    LinearProgress,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SubtitlesOutlinedIcon from '@mui/icons-material/SubtitlesOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';

type PlatformId = 'tiktok';

type ExtractMeta = {
    title?: string;
    uploader?: string;
    duration_sec?: number | null;
};

type ExtractResponse = {
    success?: boolean;
    platform?: string;
    meta?: ExtractMeta;
    raw_transcript?: string;
    cleaned_script?: string;
    message?: { content?: string } | string;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

const PLATFORMS: Array<{ id: PlatformId; label: string; enabled: boolean }> = [
    { id: 'tiktok', label: 'TikTok', enabled: true },
];

const PROGRESS_STEPS = [
    { key: 'open', label: 'Mở trang TikTok' },
    { key: 'caption', label: 'Bật / lấy caption' },
    { key: 'webvtt', label: 'Ghép WebVTT' },
] as const;

function parseApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message && typeof r.message === 'object' && r.message.content) {
        return r.message.content;
    }
    return 'Yêu cầu thất bại';
}

function isTikTokUrl(raw: string): boolean {
    const url = raw.trim();
    if (!url) return false;
    try {
        const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const host = new URL(withProtocol).hostname.replace(/^www\./i, '').toLowerCase();
        return (
            host === 'tiktok.com' ||
            host === 'vm.tiktok.com' ||
            host === 'vt.tiktok.com' ||
            host.endsWith('.tiktok.com')
        );
    } catch {
        return /tiktok\.com/i.test(url);
    }
}

function formatDuration(sec: number | null | undefined): string {
    if (sec == null || !Number.isFinite(sec) || sec <= 0) return '';
    const total = Math.round(sec);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}p ${s}s` : `${s}s`;
}

export default function MarketingGetScriptDrawer({ open, onClose }: Props) {
    const api = useAjax();

    const [platform, setPlatform] = React.useState<PlatformId>('tiktok');
    const [url, setUrl] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [progressStep, setProgressStep] = React.useState(0);
    const [error, setError] = React.useState<string | null>(null);
    const [info, setInfo] = React.useState<string | null>(null);
    const [copied, setCopied] = React.useState(false);
    const [result, setResult] = React.useState<{
        platform: string;
        meta: ExtractMeta;
        raw_transcript: string;
        cleaned_script: string;
    } | null>(null);

    React.useEffect(() => {
        if (!open) {
            setLoading(false);
            setProgressStep(0);
            setError(null);
            setInfo(null);
            setCopied(false);
        }
    }, [open]);

    React.useEffect(() => {
        if (!loading) return undefined;
        setProgressStep(0);
        const timers = [
            window.setTimeout(() => setProgressStep(1), 4000),
            window.setTimeout(() => setProgressStep(2), 15000),
        ];
        return () => timers.forEach((t) => window.clearTimeout(t));
    }, [loading]);

    const canSubmit = url.trim() !== '' && !loading;

    const handleExtract = () => {
        const trimmed = url.trim();
        if (!trimmed) {
            setError('Nhập link video');
            return;
        }
        if (platform === 'tiktok' && !isTikTokUrl(trimmed)) {
            setError('URL không phải link TikTok hợp lệ');
            return;
        }

        setLoading(true);
        setError(null);
        setInfo(null);
        setCopied(false);
        setResult(null);

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/extract-video-script',
            method: 'POST',
            data: {
                url: trimmed,
                platform,
            },
            loading: false,
            success: (res) => {
                setLoading(false);
                setProgressStep(PROGRESS_STEPS.length);
                const data = res as ExtractResponse;
                if (!data?.success) {
                    setError(parseApiMessage(data));
                    return;
                }
                setResult({
                    platform: String(data.platform || platform),
                    meta: data.meta || {},
                    raw_transcript: String(data.raw_transcript || ''),
                    cleaned_script: String(data.cleaned_script || ''),
                });
                setInfo(parseApiMessage(data) || 'Đã lấy script thành công');
            },
            error: () => {
                setLoading(false);
                setProgressStep(0);
                setError('Yêu cầu thất bại');
            },
        });
    };

    const handleCopy = async (text: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setError('Không copy được vào clipboard');
        }
    };

    const durationLabel = formatDuration(result?.meta?.duration_sec);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Get script"
            width={600}
            activeOnClose
            restDialogContent={{
                sx: {
                    pt: 2.5,
                    px: 3,
                    pb: 2,
                    backgroundColor: 'body.background',
                },
            }}
        >
            <Stack spacing={2.5} sx={{ pb: 1 }}>
                <Box>
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                    >
                        1. Nguồn
                    </Typography>
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                        {PLATFORMS.map((p) => (
                            <Chip
                                key={p.id}
                                label={p.label}
                                size="small"
                                color={platform === p.id ? 'primary' : 'default'}
                                variant={platform === p.id ? 'filled' : 'outlined'}
                                disabled={!p.enabled}
                                onClick={() => p.enabled && setPlatform(p.id)}
                                sx={{ textTransform: 'none' }}
                            />
                        ))}
                        <Chip
                            label="YouTube (sắp có)"
                            size="small"
                            variant="outlined"
                            disabled
                            sx={{ textTransform: 'none' }}
                        />
                    </Stack>
                    <TextField
                        fullWidth
                        size="small"
                        label="Link video"
                        placeholder="https://www.tiktok.com/@user/video/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        disabled={loading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && canSubmit) {
                                handleExtract();
                            }
                        }}
                    />
                    <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<SubtitlesOutlinedIcon fontSize="small" />}
                            onClick={handleExtract}
                            disabled={!canSubmit}
                            sx={{ textTransform: 'none' }}
                        >
                            Lấy script
                        </Button>
                    </Stack>
                </Box>

                {loading && (
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                        >
                            2. Tiến trình
                        </Typography>
                        <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />
                        <Stack spacing={0.75}>
                            {PROGRESS_STEPS.map((step, idx) => {
                                const done = progressStep > idx;
                                const active = progressStep === idx;
                                return (
                                    <Stack
                                        key={step.key}
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                    >
                                        {done ? (
                                            <CheckCircleOutlineIcon
                                                fontSize="small"
                                                color="success"
                                            />
                                        ) : (
                                            <RadioButtonUncheckedIcon
                                                fontSize="small"
                                                color={active ? 'primary' : 'disabled'}
                                            />
                                        )}
                                        <Typography
                                            variant="body2"
                                            color={
                                                done || active
                                                    ? 'text.primary'
                                                    : 'text.secondary'
                                            }
                                            sx={{ fontWeight: active ? 600 : 400 }}
                                        >
                                            {step.label}
                                            {active ? '…' : ''}
                                        </Typography>
                                    </Stack>
                                );
                            })}
                        </Stack>
                    </Box>
                )}

                {error && (
                    <Alert severity="error" onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {info && !error && (
                    <Alert severity="success" onClose={() => setInfo(null)}>
                        {info}
                    </Alert>
                )}

                {result && (
                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontWeight: 600, display: 'block', mb: 1 }}
                        >
                            3. Kết quả
                        </Typography>
                        <Stack
                            direction="row"
                            spacing={0.75}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mb: 1.5 }}
                        >
                            <Chip
                                size="small"
                                label={(result.platform || platform).toUpperCase()}
                                variant="outlined"
                            />
                            {result.meta?.uploader ? (
                                <Chip
                                    size="small"
                                    label={result.meta.uploader}
                                    variant="outlined"
                                />
                            ) : null}
                            {durationLabel ? (
                                <Chip size="small" label={durationLabel} variant="outlined" />
                            ) : null}
                        </Stack>
                        {result.meta?.title ? (
                            <Typography
                                variant="body2"
                                sx={{ mb: 1.5, fontWeight: 500 }}
                                color="text.primary"
                            >
                                {result.meta.title}
                            </Typography>
                        ) : null}

                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mb: 0.75 }}
                        >
                            <Typography variant="subtitle2">Caption (WebVTT)</Typography>
                            <Tooltip title={copied ? 'Đã copy' : 'Copy'}>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleCopy(result.cleaned_script)}
                                        disabled={!result.cleaned_script}
                                    >
                                        <ContentCopyIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'divider',
                                bgcolor: 'background.paper',
                                maxHeight: 280,
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            <Typography variant="body2">
                                {result.cleaned_script || '—'}
                            </Typography>
                        </Box>

                        {result.raw_transcript
                        && result.raw_transcript.trim() !== result.cleaned_script.trim() ? (
                            <Accordion
                                disableGutters
                                elevation={0}
                                sx={{
                                    mt: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    '&:before': { display: 'none' },
                                }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="body2" color="text.secondary">
                                        Caption gốc (WebVTT)
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack
                                        direction="row"
                                        justifyContent="flex-end"
                                        sx={{ mb: 0.5 }}
                                    >
                                        <Tooltip title="Copy raw">
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    handleCopy(result.raw_transcript)
                                                }
                                            >
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {result.raw_transcript}
                                    </Typography>
                                </AccordionDetails>
                            </Accordion>
                        ) : null}
                    </Box>
                )}
            </Stack>
        </DrawerCustom>
    );
}
