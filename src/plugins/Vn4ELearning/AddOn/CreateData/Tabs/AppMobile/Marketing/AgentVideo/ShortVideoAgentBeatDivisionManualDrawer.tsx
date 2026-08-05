import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { fetchBeatDivisionPrompt } from './agentVideoApi';
import {
    parseBeatMapJson,
    validateBeatMap,
    type BeatMap,
} from './agentVideoBeatMap';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    audioDurationSec?: number | null;
    agentSourceFormat?: string;
    isWhiteboard: boolean;
    onSave: (map: BeatMap) => Promise<boolean>;
};

type BeatAnalysis = {
    id: string;
    valid: boolean;
    errors: string[];
};

type AnalysisResult = {
    valid: boolean;
    beatCount: number;
    totalVideoSec: number;
    map: BeatMap | null;
    globalErrors: string[];
    beats: BeatAnalysis[];
};

function analyzeBeatResponse(
    text: string,
    audioDurationSec: number | null,
    relaxDurationBounds: boolean,
    isWhiteboard: boolean,
): AnalysisResult {
    const parsed = parseBeatMapJson(text, { requireImagePrompt: isWhiteboard });
    if (!parsed.map) {
        return {
            valid: false,
            beatCount: 0,
            totalVideoSec: 0,
            map: null,
            globalErrors: parsed.errors,
            beats: [],
        };
    }
    const map = parsed.map;
    const globalErrors = [...parsed.errors];

    const beats: BeatAnalysis[] = map.sections.map((section) => {
        const errors: string[] = [];
        if (!/^beat_\d+$/.test(section.id)) {
            errors.push(`id phải dạng beat_N (hiện tại: ${section.id || '(trống)'})`);
        }
        if (section.endSec <= section.startSec) {
            errors.push('startSec/endSec không hợp lệ (endSec phải > startSec)');
        }
        if (section.durationSec <= 0) {
            errors.push('durationSec phải > 0');
        }
        if (!String(section.phrase_anchor || '').trim()) {
            errors.push('Thiếu phrase_anchor');
        }
        if (!String(section.visual_description || '').trim()) {
            errors.push('Thiếu visual_description');
        }
        if (!String(section.background || '').trim()) {
            errors.push('Thiếu background');
        }
        if (isWhiteboard && !String(section.image_prompt || '').trim()) {
            errors.push('Thiếu image_prompt (whiteboard)');
        }
        return { id: section.id, valid: errors.length === 0, errors };
    });

    const validation = audioDurationSec != null && audioDurationSec > 0
        ? validateBeatMap(map, audioDurationSec, { relaxDurationBounds })
        : { valid: true, errors: [] as string[] };
    globalErrors.push(...validation.errors);

    const valid = globalErrors.length === 0 && beats.every((beat) => beat.valid);

    return {
        valid,
        beatCount: map.sections.length,
        totalVideoSec: map.totalVideoSec,
        map,
        globalErrors,
        beats,
    };
}

export default function ShortVideoAgentBeatDivisionManualDrawer({
    open,
    onClose,
    shortVideoId,
    audioDurationSec,
    agentSourceFormat = '',
    isWhiteboard,
    onSave,
}: Props) {
    const [prompt, setPrompt] = React.useState('');
    const [loadingPrompt, setLoadingPrompt] = React.useState(false);
    const [promptError, setPromptError] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [aiResponse, setAiResponse] = React.useState('');
    const [analyzing, setAnalyzing] = React.useState(false);
    const [analysis, setAnalysis] = React.useState<AnalysisResult | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState('');

    const relaxDurationBounds = ['github_top', 'github_top_daily', 'github_top_weekly', 'github_top_monthly'].includes(
        String(agentSourceFormat || ''),
    );

    React.useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setPrompt('');
        setPromptError('');
        setCopied(false);
        setAiResponse('');
        setAnalysis(null);
        setSaveError('');
        setLoadingPrompt(true);
        void fetchBeatDivisionPrompt(shortVideoId)
            .then((res) => {
                if (cancelled) {
                    return;
                }
                if (!res?.success) {
                    setPromptError(String(res?.message || 'Không lấy được prompt chia beat'));
                    return;
                }
                setPrompt(String(res.prompt || ''));
            })
            .catch((e) => {
                if (!cancelled) {
                    setPromptError(e instanceof Error ? e.message : String(e));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingPrompt(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open, shortVideoId]);

    const handleCopyPrompt = async () => {
        if (!prompt) {
            return;
        }
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setPromptError('Không copy được — trình duyệt chặn clipboard');
        }
    };

    const handleAnalyze = () => {
        setAnalyzing(true);
        setSaveError('');
        window.setTimeout(() => {
            const result = analyzeBeatResponse(
                aiResponse,
                audioDurationSec ?? null,
                relaxDurationBounds,
                isWhiteboard,
            );
            setAnalysis(result);
            setAnalyzing(false);
        }, 0);
    };

    const handleSave = async () => {
        if (!analysis?.map || !analysis.valid) {
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            const ok = await onSave(analysis.map);
            if (ok) {
                onClose();
            } else {
                setSaveError('Lưu thất bại — vui lòng thử lại');
            }
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    const canSave = Boolean(analysis?.valid && analysis?.map);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Chia beat thủ công"
            width={760}
            restDialogContent={{
                sx: {
                    pt: 2,
                    px: 2,
                    pb: 2,
                },
            }}
        >
            <Stack spacing={2} sx={{ pt: 3, px: 2.5, pb: 3 }}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} flex={1}>
                            Prompt chia beat
                        </Typography>
                        {loadingPrompt ? (
                            <CircularProgress size={18} />
                        ) : prompt ? (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ContentCopyIcon />}
                                onClick={() => { void handleCopyPrompt(); }}
                            >
                                {copied ? 'Đã copy' : 'Copy prompt'}
                            </Button>
                        ) : null}
                    </Stack>
                    {promptError ? (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {promptError}
                        </Alert>
                    ) : null}
                    <TextField
                        fullWidth
                        multiline
                        minRows={10}
                        maxRows={18}
                        size="small"
                        value={prompt}
                        onChange={() => undefined}
                        placeholder={loadingPrompt ? 'Đang tải prompt…' : 'Chưa có prompt'}
                        inputProps={{ readOnly: true, style: { fontSize: 12, fontFamily: 'monospace' } }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        Dùng nút Copy để lấy prompt, dán vào chatbot bên ngoài (Gemini / ChatGPT / Claude…).
                    </Typography>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                        Phản hồi từ AI
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={10}
                        maxRows={20}
                        size="small"
                        placeholder="Dán toàn bộ JSON beat map AI trả về (schema_version 2) vào đây…"
                        value={aiResponse}
                        onChange={(e) => {
                            setAiResponse(e.target.value);
                            setAnalysis(null);
                            setSaveError('');
                        }}
                        inputProps={{ style: { fontSize: 12, fontFamily: 'monospace' } }}
                    />
                </Box>

                {analysis ? (
                    <Box>
                        <Alert
                            severity={analysis.valid ? 'success' : 'error'}
                            icon={analysis.valid ? <CheckCircleIcon fontSize="inherit" /> : <ErrorIcon fontSize="inherit" />}
                            sx={{ mb: 1 }}
                        >
                            {analysis.valid
                                ? `Hợp lệ: ${analysis.beatCount} beat, tổng ${Math.round(analysis.totalVideoSec)}s`
                                : `Có lỗi: ${analysis.globalErrors.length} lỗi tổng thể, ${analysis.beats.filter((b) => !b.valid).length} beat lỗi`}
                        </Alert>
                        {analysis.globalErrors.length > 0 ? (
                            <Box
                                sx={{
                                    maxHeight: 120,
                                    overflow: 'auto',
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    p: 1,
                                    mb: 1,
                                }}
                            >
                                {analysis.globalErrors.map((err, idx) => (
                                    <Typography key={`g-${idx}`} variant="caption" color="error" display="block" sx={{ lineHeight: 1.4 }}>
                                        • {err}
                                    </Typography>
                                ))}
                            </Box>
                        ) : null}
                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {analysis.beats.map((beat) => (
                                <Chip
                                    key={beat.id}
                                    size="small"
                                    color={beat.valid ? 'success' : 'error'}
                                    icon={beat.valid
                                        ? <CheckCircleIcon />
                                        : <ErrorIcon />}
                                    label={beat.valid ? beat.id : `${beat.id} · ${beat.errors.length} lỗi`}
                                    title={beat.errors.join('\n')}
                                />
                            ))}
                        </Stack>
                        {analysis.beats.some((b) => !b.valid) ? (
                            <Box sx={{ mt: 1 }}>
                                {analysis.beats.filter((b) => !b.valid).map((beat) => (
                                    <Box key={beat.id} sx={{ mb: 0.5 }}>
                                        <Typography variant="caption" color="error" fontWeight={700}>
                                            {beat.id}:
                                        </Typography>
                                        {beat.errors.map((err, idx) => (
                                            <Typography key={`${beat.id}-${idx}`} variant="caption" color="error" display="block" sx={{ pl: 1.5, lineHeight: 1.4 }}>
                                                - {err}
                                            </Typography>
                                        ))}
                                    </Box>
                                ))}
                            </Box>
                        ) : null}
                    </Box>
                ) : null}

                {saveError ? (
                    <Alert severity="error">{saveError}</Alert>
                ) : null}

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => { void handleAnalyze(); }}
                        disabled={!aiResponse.trim() || analyzing}
                        startIcon={analyzing ? <CircularProgress size={14} /> : undefined}
                    >
                        Phân tích
                    </Button>
                    <LoadingButton
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        loading={saving}
                        disabled={!canSave}
                        onClick={() => { void handleSave(); }}
                    >
                        Lưu
                    </LoadingButton>
                </Stack>
            </Stack>
        </DrawerCustom>
    );
}
