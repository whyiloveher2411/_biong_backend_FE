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
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import ErrorIcon from '@mui/icons-material/Error';
import SaveIcon from '@mui/icons-material/Save';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    fetchBeatDivisionDraft,
    fetchBeatDivisionPrompt,
    fetchBeatVisualPrompt,
    saveBeatDivisionDraft,
} from './agentVideoApi';
import {
    normalizeBeatMapTimings,
    parseBeatMapJson,
    parseBeatVisualChunkJson,
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
    /** limitBeats > 0 → chế độ test: chỉ cập nhật N beat đầu của beat map hiện tại. */
    onSave: (map: BeatMap, options?: { limitBeats?: number }) => Promise<boolean>;
};

/** Số beat mặc định cho chế độ test nhanh. */
const TEST_LIMIT_BEATS = 3;

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

function analyzePhase1Response(
    text: string,
    audioDurationSec: number | null,
    relaxDurationBounds: boolean,
    isWhiteboard: boolean,
): AnalysisResult {
    const parsed = parseBeatMapJson(text, {
        requireImagePrompt: false,
        requireVisualDescription: false,
    });
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
    const map = normalizeBeatMapTimings(parsed.map);
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
        if (!isWhiteboard && !String(section.background || '').trim()) {
            errors.push('Thiếu background');
        }
        return { id: section.id, valid: errors.length === 0, errors };
    });

    const validation = audioDurationSec != null && audioDurationSec > 0
        ? validateBeatMap(map, audioDurationSec, {
            relaxDurationBounds,
            requireVisualDescription: false,
        })
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

async function copyText(text: string): Promise<boolean> {
    if (!text) {
        return false;
    }
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
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
    const [phaseMode, setPhaseMode] = React.useState<'single' | 'two_phase'>('single');
    const [prompt, setPrompt] = React.useState('');
    const [contentMode, setContentMode] = React.useState<'text' | 'file'>('file');
    const [testMode, setTestMode] = React.useState(false);
    const [content, setContent] = React.useState('');
    const [contentFileName, setContentFileName] = React.useState('content.txt');
    const [loadingPrompt, setLoadingPrompt] = React.useState(false);
    const [promptError, setPromptError] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [aiResponse, setAiResponse] = React.useState('');
    const [analyzing, setAnalyzing] = React.useState(false);
    const [analysis, setAnalysis] = React.useState<AnalysisResult | null>(null);
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState('');

    // ---- 2 giai đoạn ----
    const [phase1Prompt, setPhase1Prompt] = React.useState('');
    const [phase1Text, setPhase1Text] = React.useState('');
    const [phase1Analysis, setPhase1Analysis] = React.useState<AnalysisResult | null>(null);
    const [phase1Map, setPhase1Map] = React.useState<BeatMap | null>(null);
    const [phase2Text, setPhase2Text] = React.useState('');
    const [phase2Map, setPhase2Map] = React.useState<BeatMap | null>(null);
    const [phase2Errors, setPhase2Errors] = React.useState<string[]>([]);
    const [copied1, setCopied1] = React.useState(false);
    const [copied2, setCopied2] = React.useState(false);
    const [loadingPhase2Prompt, setLoadingPhase2Prompt] = React.useState(false);
    const [savingPhase1, setSavingPhase1] = React.useState(false);
    const [savingPhase2, setSavingPhase2] = React.useState(false);
    const [savingFinal, setSavingFinal] = React.useState(false);

    const relaxDurationBounds = ['github_top', 'github_top_daily', 'github_top_weekly', 'github_top_monthly'].includes(
        String(agentSourceFormat || ''),
    );

    const isTwoPhase = phaseMode === 'two_phase';

    // Load prompt + draft khi mở drawer.
    React.useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setPrompt('');
        setContent('');
        setContentFileName('content.txt');
        setPromptError('');
        setCopied(false);
        setAiResponse('');
        setAnalysis(null);
        setSaveError('');
        setPhase1Prompt('');
        setPhase1Text('');
        setPhase1Analysis(null);
        setPhase1Map(null);
        setPhase2Text('');
        setPhase2Map(null);
        setPhase2Errors([]);
        setCopied1(false);
        setCopied2(false);
        setLoadingPrompt(true);

        const divisionPhase = isTwoPhase ? 'segmentation' : 'full';
        void fetchBeatDivisionPrompt(
            shortVideoId,
            contentMode,
            !isTwoPhase && testMode ? TEST_LIMIT_BEATS : 0,
            divisionPhase,
        )
            .then((res) => {
                if (cancelled) {
                    return;
                }
                if (!res?.success) {
                    setPromptError(String(res?.message || 'Không lấy được prompt chia beat'));
                    return;
                }
                if (isTwoPhase) {
                    setPhase1Prompt(String(res.prompt || ''));
                } else {
                    setPrompt(String(res.prompt || ''));
                }
                if (contentMode === 'file') {
                    setContent(String(res.content || ''));
                    setContentFileName(String(res.content_file_name || 'content.txt'));
                }
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

        if (isTwoPhase) {
            void fetchBeatDivisionDraft(shortVideoId)
                .then((res) => {
                    if (cancelled || !res?.success) {
                        return;
                    }
                    const phase1Raw = String(res.phase1_json || '').trim();
                    const phase2Raw = String(res.phase2_json || '').trim();
                    if (phase1Raw) {
                        setPhase1Text(phase1Raw);
                        const result = analyzePhase1Response(
                            phase1Raw,
                            audioDurationSec ?? null,
                            relaxDurationBounds,
                            isWhiteboard,
                        );
                        setPhase1Analysis(result);
                        if (result.valid && result.map) {
                            setPhase1Map(result.map);
                        }
                    }
                    if (phase2Raw) {
                        setPhase2Text(phase2Raw);
                    }
                })
                .catch(() => undefined);
        }

        return () => {
            cancelled = true;
        };
    }, [open, shortVideoId, contentMode, testMode, isTwoPhase]);

    const handleCopyPrompt = async () => {
        const ok = await copyText(prompt);
        setCopied(ok);
        if (ok) {
            window.setTimeout(() => setCopied(false), 2000);
        } else {
            setPromptError('Không copy được — trình duyệt chặn clipboard');
        }
    };

    const handleDownloadContent = () => {
        if (!content) {
            return;
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = contentFileName || 'content.txt';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    // ---- Single mode ----
    const handleAnalyze = () => {
        setAnalyzing(true);
        setSaveError('');
        window.setTimeout(() => {
            const parsed = parseBeatMapJson(aiResponse, { requireImagePrompt: isWhiteboard });
            if (!parsed.map) {
                setAnalysis({
                    valid: false,
                    beatCount: 0,
                    totalVideoSec: 0,
                    map: null,
                    globalErrors: parsed.errors,
                    beats: [],
                });
                setAnalyzing(false);
                return;
            }
            const map = normalizeBeatMapTimings(parsed.map);
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
                if (!isWhiteboard && !String(section.background || '').trim()) {
                    errors.push('Thiếu background');
                }
                if (isWhiteboard && !String(section.image_prompt || '').trim()) {
                    errors.push('Thiếu image_prompt (whiteboard)');
                }
                return { id: section.id, valid: errors.length === 0, errors };
            });

            const validation = !testMode && audioDurationSec != null && audioDurationSec > 0
                ? validateBeatMap(map, audioDurationSec, { relaxDurationBounds })
                : { valid: true, errors: [] as string[] };
            globalErrors.push(...validation.errors);
            const valid = globalErrors.length === 0 && beats.every((beat) => beat.valid);
            setAnalysis({
                valid,
                beatCount: map.sections.length,
                totalVideoSec: map.totalVideoSec,
                map,
                globalErrors,
                beats,
            });
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
            const ok = await onSave(analysis.map, testMode ? { limitBeats: TEST_LIMIT_BEATS } : undefined);
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

    // ---- 2 giai đoạn ----
    const handleSavePhase1 = async () => {
        setSavingPhase1(true);
        setSaveError('');
        setPhase2Map(null);
        const result = analyzePhase1Response(
            phase1Text,
            audioDurationSec ?? null,
            relaxDurationBounds,
            isWhiteboard,
        );
        setPhase1Analysis(result);
        setPhase1Map(result.valid && result.map ? result.map : null);
        if (!result.valid) {
            setSavingPhase1(false);
            return;
        }
        try {
            await saveBeatDivisionDraft(shortVideoId, '1', phase1Text);
            setSaveError('');
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : String(e));
        } finally {
            setSavingPhase1(false);
        }
    };

    const handleCopyPhase1Prompt = async () => {
        const ok = await copyText(phase1Prompt);
        setCopied1(ok);
        if (ok) {
            window.setTimeout(() => setCopied1(false), 2000);
        }
    };

    const handleCopyPhase2Prompt = async () => {
        if (!phase1Map) {
            setPhase2Errors(['Lưu giai đoạn 1 trước — prompt giai đoạn 2 cần danh sách beat']);
            return;
        }
        setLoadingPhase2Prompt(true);
        setPhase2Errors([]);
        try {
            const res = await fetchBeatVisualPrompt(
                shortVideoId,
                phase1Map.sections,
                0,
                Math.max(phase1Map.sections.length, 1),
                true,
            );
            if (!res?.success) {
                setPhase2Errors([String(res?.message || 'Không lấy được prompt giai đoạn 2')]);
                return;
            }
            const ok = await copyText(String(res.prompt || ''));
            setCopied2(ok);
            if (ok) {
                window.setTimeout(() => setCopied2(false), 2000);
            } else {
                setPhase2Errors(['Không copy được — trình duyệt chặn clipboard']);
            }
        } catch (e) {
            setPhase2Errors([e instanceof Error ? e.message : String(e)]);
        } finally {
            setLoadingPhase2Prompt(false);
        }
    };

    const handleSavePhase2 = async () => {
        if (!phase1Map) {
            setPhase2Errors(['Lưu giai đoạn 1 trước']);
            return;
        }
        setSavingPhase2(true);
        setSaveError('');
        setPhase2Errors([]);

        const ids = phase1Map.sections.map((section) => section.id);
        const parsed = parseBeatVisualChunkJson(phase2Text, ids);
        if (parsed.errors.length > 0) {
            setPhase2Errors(parsed.errors);
            setPhase2Map(null);
            setSavingPhase2(false);
            return;
        }

        const sections = phase1Map.sections.map((section) => ({
            ...section,
            visual_description: parsed.visualDescriptions[section.id] ?? section.visual_description,
            image_prompt: parsed.imagePrompts[section.id] ?? section.image_prompt,
        }));
        const map: BeatMap = { ...phase1Map, sections };

        const validation = audioDurationSec != null && audioDurationSec > 0
            ? validateBeatMap(map, audioDurationSec, { relaxDurationBounds, requireImagePrompt: isWhiteboard })
            : { valid: true, errors: [] as string[] };
        if (validation.errors.length > 0) {
            setPhase2Errors(validation.errors.slice(0, 5));
            setPhase2Map(null);
            setSavingPhase2(false);
            return;
        }

        setPhase2Map(map);
        try {
            await saveBeatDivisionDraft(shortVideoId, '2', phase2Text);
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : String(e));
        } finally {
            setSavingPhase2(false);
        }
    };

    const handleSaveFinal = async () => {
        if (!phase2Map) {
            return;
        }
        setSavingFinal(true);
        setSaveError('');
        try {
            const ok = await onSave(phase2Map);
            if (ok) {
                onClose();
            } else {
                setSaveError('Lưu thất bại — vui lòng thử lại');
            }
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : String(e));
        } finally {
            setSavingFinal(false);
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
                            Chế độ chia beat
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={phaseMode}
                            onChange={(_event, value: 'single' | 'two_phase' | null) => {
                                if (value) {
                                    setPhaseMode(value);
                                }
                            }}
                            aria-label="Chế độ chia beat"
                        >
                            <ToggleButton value="single" aria-label="1 prompt duy nhất">
                                1 prompt
                            </ToggleButton>
                            <ToggleButton value="two_phase" aria-label="2 giai đoạn">
                                2 giai đoạn
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {isTwoPhase
                            ? 'Giai đoạn 1: chia beat (script + whisper). Giai đoạn 2: sinh image_prompt — 2 prompt riêng, model không quên rule với video dài. JSON đã lưu sẽ giữ lại khi refresh, bạn có thể sửa thủ công.'
                            : '1 prompt duy nhất: chia beat + image_prompt trong cùng 1 lần gửi — chỉ phù hợp script ngắn (test 3 beat).'}
                    </Typography>
                </Box>

                {!isTwoPhase ? (
                    <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700} flex={1}>
                                Cách nhận nội dung nguồn
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={contentMode}
                                onChange={(_event, value: 'text' | 'file' | null) => {
                                    if (value) {
                                        setContentMode(value);
                                    }
                                }}
                                aria-label="Cách nhận nội dung nguồn"
                            >
                                <ToggleButton value="text" aria-label="Nội dung trong prompt">
                                    Text
                                </ToggleButton>
                                <ToggleButton value="file" aria-label="Tải file nội dung">
                                    File content
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            {contentMode === 'text'
                                ? 'Text: audio script + whisper word timing nằm ngay trong prompt — copy prompt là đủ.'
                                : 'File content: prompt ngắn, không nhúng script/whisper — tải file và đính kèm khi hỏi chatbot để tránh hiểu nhầm.'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700} flex={1}>
                                Chế độ test nhanh
                            </Typography>
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={testMode ? 'test' : 'full'}
                                onChange={(_event, value: 'test' | 'full' | null) => {
                                    if (value) {
                                        setTestMode(value === 'test');
                                    }
                                }}
                                aria-label="Chế độ test nhanh"
                            >
                                <ToggleButton value="full" aria-label="Chia tất cả beat">
                                    Tất cả beat
                                </ToggleButton>
                                <ToggleButton value="test" aria-label={`Chỉ ${TEST_LIMIT_BEATS} beat đầu`}>
                                    Test {TEST_LIMIT_BEATS} beat đầu
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                            {testMode
                                ? `Test nhanh: file mẫu chỉ chứa ${TEST_LIMIT_BEATS} dòng script + whisper đầu; AI chỉ cần chia ${TEST_LIMIT_BEATS} beat. Khi Lưu sẽ chỉ cập nhật ${TEST_LIMIT_BEATS} beat đầu của beat map hiện tại (giữ nguyên các beat còn lại).`
                                : 'Tất cả beat: file đầy đủ toàn bộ script + whisper; Lưu sẽ thay thế toàn bộ beat map.'}
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700} flex={1}>
                                Prompt chia beat
                            </Typography>
                            {loadingPrompt ? (
                                <CircularProgress size={18} />
                            ) : prompt ? (
                                <>
                                    {contentMode === 'file' && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            startIcon={<DownloadIcon />}
                                            disabled={!content}
                                            onClick={handleDownloadContent}
                                        >
                                            Tải file {contentFileName}
                                        </Button>
                                    )}
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<ContentCopyIcon />}
                                        onClick={() => { void handleCopyPrompt(); }}
                                    >
                                        {copied ? 'Đã copy' : 'Copy prompt'}
                                    </Button>
                                </>
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
                            {contentMode === 'file'
                                ? 'Dùng nút Copy để lấy prompt, tải file content.txt và đính kèm file khi dán prompt vào chatbot bên ngoài (Gemini / ChatGPT / Claude…).'
                                : 'Dùng nút Copy để lấy prompt, dán vào chatbot bên ngoài (Gemini / ChatGPT / Claude…).'}
                        </Typography>
                    </Box>
                ) : null}

                {isTwoPhase ? (
                    <>
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight={700} flex={1}>
                                    Cách nhận nội dung nguồn (giai đoạn 1)
                                </Typography>
                                <ToggleButtonGroup
                                    exclusive
                                    size="small"
                                    value={contentMode}
                                    onChange={(_event, value: 'text' | 'file' | null) => {
                                        if (value) {
                                            setContentMode(value);
                                        }
                                    }}
                                    aria-label="Cách nhận nội dung nguồn"
                                >
                                    <ToggleButton value="text" aria-label="Nội dung trong prompt">
                                        Text
                                    </ToggleButton>
                                    <ToggleButton value="file" aria-label="Tải file nội dung">
                                        File content
                                    </ToggleButton>
                                </ToggleButtonGroup>
                            </Stack>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                                {contentMode === 'text'
                                    ? 'Text: audio script + whisper word timing nằm ngay trong prompt giai đoạn 1 — copy prompt là đủ.'
                                    : 'File content: prompt giai đoạn 1 ngắn, không nhúng script/whisper — tải file content.txt và đính kèm khi hỏi chatbot để tránh hiểu nhầm.'}
                            </Typography>
                        </Box>

                        {/* Giai đoạn 1 */}
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="subtitle1" fontWeight={700} flex={1}>
                                    Giai đoạn 1 — Chia beat (segmentation)
                                </Typography>
                                {contentMode === 'file' && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        disabled={!content}
                                        onClick={handleDownloadContent}
                                    >
                                        Tải file {contentFileName}
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ContentCopyIcon />}
                                    disabled={loadingPrompt || !phase1Prompt}
                                    onClick={() => { void handleCopyPhase1Prompt(); }}
                                >
                                    {copied1 ? 'Đã copy' : 'Copy prompt giai đoạn 1'}
                                </Button>
                            </Stack>
                            <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
                                <Typography variant="body2" component="div">
                                    <b>Mục đích:</b> Chỉ chia beat + timing — đọc script &amp; Whisper, trả JSON beat-map
                                    (id/startSec/endSec/phrase_anchor). <b>Không tạo bất kỳ visual nào</b> (không image_prompt,
                                    không visual_description) — mô hình chỉ tập trung segmentation, ít lỗi hơn.
                                </Typography>
                            </Alert>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Copy prompt → {contentMode === 'file' ? 'tải file và đính kèm khi dán vào ' : 'dán vào '}chatbot
                                (Gemini / ChatGPT / Claude…) → dán JSON beat-map trả về
                                (id/startSec/endSec/phrase_anchor, KHÔNG image_prompt) vào ô dưới →
                                Lưu giai đoạn 1. JSON được lưu lại — refresh không mất.
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={8}
                                maxRows={16}
                                size="small"
                                placeholder="Dán JSON beat-map giai đoạn 1 vào đây…"
                                value={phase1Text}
                                onChange={(e) => {
                                    setPhase1Text(e.target.value);
                                    setPhase1Analysis(null);
                                    setPhase1Map(null);
                                    setPhase2Map(null);
                                    setPhase2Errors([]);
                                }}
                                inputProps={{ style: { fontSize: 12, fontFamily: 'monospace' } }}
                            />
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <LoadingButton
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    loading={savingPhase1}
                                    disabled={!phase1Text.trim()}
                                    onClick={() => { void handleSavePhase1(); }}
                                >
                                    Lưu giai đoạn 1
                                </LoadingButton>
                                {phase1Analysis ? (
                                    phase1Analysis.valid ? (
                                        <Chip
                                            size="small"
                                            color="success"
                                            icon={<CheckCircleIcon />}
                                            label={`Giai đoạn 1 hợp lệ: ${phase1Analysis.beatCount} beat`}
                                        />
                                    ) : (
                                        <Chip
                                            size="small"
                                            color="error"
                                            icon={<ErrorIcon />}
                                            label={`${phase1Analysis.globalErrors.length} lỗi tổng thể, ${phase1Analysis.beats.filter((b) => !b.valid).length} beat lỗi`}
                                        />
                                    )
                                ) : null}
                            </Stack>
                            {phase1Analysis && !phase1Analysis.valid ? (
                                <Box
                                    sx={{
                                        mt: 1,
                                        maxHeight: 120,
                                        overflow: 'auto',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                    }}
                                >
                                    {[...phase1Analysis.globalErrors, ...phase1Analysis.beats.flatMap((b) => (
                                        b.valid ? [] : [`${b.id}: ${b.errors.join('; ')}`]
                                    ))].slice(0, 12).map((err, idx) => (
                                        <Typography key={`p1-${idx}`} variant="caption" color="error" display="block" sx={{ lineHeight: 1.4 }}>
                                            • {err}
                                        </Typography>
                                    ))}
                                </Box>
                            ) : null}
                        </Box>

                        <Divider />

                        {/* Giai đoạn 2 */}
                        <Box>
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                                <Typography variant="subtitle1" fontWeight={700} flex={1}>
                                    Giai đoạn 2 — image_prompt ({phase1Map ? `${phase1Map.sections.length} beat` : 'chờ giai đoạn 1'})
                                </Typography>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={loadingPhase2Prompt ? <CircularProgress size={14} /> : <ContentCopyIcon />}
                                    disabled={loadingPhase2Prompt || !phase1Map}
                                    onClick={() => { void handleCopyPhase2Prompt(); }}
                                >
                                    {copied2 ? 'Đã copy' : 'Copy prompt giai đoạn 2'}
                                </Button>
                            </Stack>
                            <Alert severity="info" sx={{ mb: 1, py: 0.5 }}>
                                <Typography variant="body2" component="div">
                                    <b>Mục đích:</b> Sinh visual cho từng beat — đọc <b>phrase_anchor</b> từ giai đoạn 1, trả
                                    <b> visual_description</b> (1 câu ≤20 từ) + <b>image_prompt</b> (6 key). Mô hình chỉ tập trung
                                    visual, không chia beat lại — hết lỗi "quên rule" khi video dài.
                                </Typography>
                            </Alert>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                Copy prompt giai đoạn 2 → dán vào chatbot → dán JSON trả về
                                ({'{ "sections": [{ "id": "beat_N", "visual_description": "...", "image_prompt": {6 key} }] }'}) vào ô dưới →
                                Lưu giai đoạn 2 → Lưu beat map. JSON được lưu lại — refresh không mất.
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={8}
                                maxRows={16}
                                size="small"
                                placeholder={phase1Map
                                    ? `Dán JSON giai đoạn 2 (${phase1Map.sections.length} beat: ${phase1Map.sections[0]?.id} → ${phase1Map.sections[phase1Map.sections.length - 1]?.id}) vào đây…`
                                    : 'Lưu giai đoạn 1 trước để có danh sách beat…'}
                                value={phase2Text}
                                onChange={(e) => {
                                    setPhase2Text(e.target.value);
                                    setPhase2Map(null);
                                    setPhase2Errors([]);
                                }}
                                inputProps={{ style: { fontSize: 12, fontFamily: 'monospace' } }}
                            />
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                                <LoadingButton
                                    size="small"
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    loading={savingPhase2}
                                    disabled={!phase2Text.trim() || !phase1Map}
                                    onClick={() => { void handleSavePhase2(); }}
                                >
                                    Lưu giai đoạn 2
                                </LoadingButton>
                                {phase2Map ? (
                                    <Chip
                                        size="small"
                                        color="success"
                                        icon={<CheckCircleIcon />}
                                        label={`Giai đoạn 2 hợp lệ: ${phase2Map.sections.length} beat`}
                                    />
                                ) : null}
                            </Stack>
                            {phase2Errors.length > 0 ? (
                                <Box
                                    sx={{
                                        mt: 1,
                                        maxHeight: 120,
                                        overflow: 'auto',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                    }}
                                >
                                    {phase2Errors.slice(0, 8).map((err, idx) => (
                                        <Typography key={`p2-${idx}`} variant="caption" color="error" display="block" sx={{ lineHeight: 1.4 }}>
                                            • {err}
                                        </Typography>
                                    ))}
                                </Box>
                            ) : null}
                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
                                <LoadingButton
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<SaveIcon />}
                                    loading={savingFinal}
                                    disabled={!phase2Map}
                                    onClick={() => { void handleSaveFinal(); }}
                                >
                                    Lưu beat map ({phase1Map?.sections.length ?? 0} beat)
                                </LoadingButton>
                            </Stack>
                        </Box>
                    </>
                ) : null}

                {saveError ? (
                    <Alert severity="error">{saveError}</Alert>
                ) : null}

                {!isTwoPhase ? (
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
                            {testMode ? `Lưu ${TEST_LIMIT_BEATS} beat đầu` : 'Lưu'}
                        </LoadingButton>
                    </Stack>
                ) : null}
            </Stack>
        </DrawerCustom>
    );
}
