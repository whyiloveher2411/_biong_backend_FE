import React from 'react';
import {
    Alert,
    Box,
    Chip,
    Divider,
    Stack,
    Tab,
    Tabs,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { isKaraokeSyncPoor } from './agentVideoApi';
import { getBeatHtmlVisualState, getBeatRenderErrorMessage, parseBeatMapJson, validateBeatMap } from './agentVideoBeatMap';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    active: boolean;
};

function whisperStatusLabel(status: string): string {
    switch (status) {
        case 'completed':
            return 'Whisper sẵn sàng';
        case 'processing':
            return 'Đang chạy whisper…';
        case 'failed':
            return 'Whisper lỗi';
        default:
            return 'Chưa có whisper';
    }
}

function whisperStatusColor(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' {
    switch (status) {
        case 'completed':
            return 'success';
        case 'processing':
            return 'info';
        case 'failed':
            return 'error';
        default:
            return 'default';
    }
}

export default function ShortVideoAgentChatbotHtmlPanel({ state, active }: Props) {
    const autoWhisperStartedRef = React.useRef(false);
    const beatEditorSectionRef = React.useRef<HTMLDivElement>(null);

    const beatMapValidation = React.useMemo(() => {
        if (!state.beatMapJsonDraft.trim() || state.audioDurationSec == null || state.audioDurationSec <= 0) {
            return null;
        }
        const { map, errors } = parseBeatMapJson(state.beatMapJsonDraft);
        if (!map) {
            return { valid: false, errors, map: null };
        }
        const validation = validateBeatMap(map, state.audioDurationSec);
        return { valid: validation.valid, errors: validation.errors, map };
    }, [state.audioDurationSec, state.beatMapJsonDraft]);

    React.useEffect(() => {
        if (!active) {
            autoWhisperStartedRef.current = false;
            return;
        }
        if (!state.scriptApproved || !state.hasAudio) {
            return;
        }
        if (state.whisperStatus === 'completed' || state.whisperStatus === 'processing') {
            return;
        }
        if (autoWhisperStartedRef.current) {
            return;
        }
        autoWhisperStartedRef.current = true;
        void state.runWhisperTranscribe();
    }, [
        active,
        state,
        state.hasAudio,
        state.runWhisperTranscribe,
        state.scriptApproved,
        state.whisperStatus,
    ]);

    React.useEffect(() => {
        if (!active || !state.beatEditorFocusRequest) {
            return;
        }
        if (state.beatEditorFocusRequest.beatId !== state.activeBeatId) {
            return;
        }
        beatEditorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, [
        active,
        state.activeBeatId,
        state.beatEditorFocusRequest,
    ]);

    if (!state.scriptApproved || !state.hasAudio) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="info">
                    Cần duyệt script và có audio narration trước khi dùng HTML chatbot.
                </Alert>
            </Box>
        );
    }

    const activeBeat = state.beatMap?.sections.find((item) => item.id === state.activeBeatId)
        ?? state.beatMap?.sections[0];
    const activeBeatHtml = activeBeat ? (state.beatHtml[activeBeat.id]?.html || '') : '';
    const karaokeSyncPoor = isKaraokeSyncPoor(state.composition?.caption_sync);
    const showWhisperRerun =
        state.whisperStatus === 'failed'
        || (state.whisperStatus === 'completed' && (karaokeSyncPoor || state.hasAgentVideo));

    return (
        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={600}>
                    HTML chatbot
                </Typography>

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Luồng render
                    </Typography>
                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={state.renderMode}
                        onChange={(_event, value) => {
                            if (value === 'creative' || value === 'import_html') {
                                void state.handleRenderModeChange(value);
                            }
                        }}
                        disabled={state.savingImportHtml}
                        fullWidth
                    >
                        <ToggleButton value="creative" sx={{ flex: 1 }}>
                            Agent sáng tạo
                        </ToggleButton>
                        <ToggleButton value="import_html" sx={{ flex: 1 }}>
                            HTML chatbot
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Bước 1 — Whisper
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                            size="small"
                            label={whisperStatusLabel(state.whisperStatus)}
                            color={whisperStatusColor(state.whisperStatus)}
                        />
                        {state.whisperStatus === 'completed' ? (
                            <Typography variant="caption" color="text.secondary">
                                Karaoke sync tự động từ Whisper khi ghép video
                            </Typography>
                        ) : null}
                        {karaokeSyncPoor ? (
                            <Chip
                                size="small"
                                label="Karaoke có thể lệch"
                                color="warning"
                            />
                        ) : null}
                        {(state.transcribingWhisper || state.whisperStatus === 'processing') ? (
                            <Typography variant="caption" color="text.secondary">
                                Đang transcribe audio trên server…
                            </Typography>
                        ) : null}
                        {showWhisperRerun ? (
                            <LoadingButton
                                size="small"
                                variant={state.whisperStatus === 'failed' ? 'outlined' : 'outlined'}
                                color={karaokeSyncPoor ? 'warning' : 'primary'}
                                loading={state.transcribingWhisper}
                                startIcon={<RefreshIcon />}
                                onClick={() => { void state.runWhisperTranscribe({ force: true }); }}
                            >
                                {state.whisperStatus === 'failed' ? 'Chạy lại whisper' : 'Whisper lại'}
                            </LoadingButton>
                        ) : null}
                    </Box>
                    {karaokeSyncPoor ? (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            Timing karaoke lệch nhiều (khoảng trống lớn hoặc ít từ khớp Whisper).
                            Bấm Whisper lại, sau đó ghép lại video để cập nhật caption.
                        </Alert>
                    ) : null}
                </Box>

                {state.whisperError ? (
                    <Alert severity="error">{state.whisperError}</Alert>
                ) : null}

                <Divider />

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Bước 2 — Chia beat
                    </Typography>
                    <Chip
                        size="small"
                        sx={{ mb: 1 }}
                        label={
                            state.beatMapReady
                                ? `Đã có ${state.beatMap?.sections.length ?? 0} beat`
                                : 'Chưa chia beat'
                        }
                        color={state.beatMapReady ? 'success' : 'default'}
                    />

                    <LoadingButton
                        size="small"
                        variant="outlined"
                        fullWidth
                        loading={state.openingBeatDivisionGemini}
                        disabled={state.whisperStatus !== 'completed'}
                        startIcon={<OpenInNewIcon />}
                        onClick={() => { void state.handleOpenBeatDivisionGemini(); }}
                    >
                        Mở Gemini chia beat
                    </LoadingButton>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 0.5 }}>
                        1. Bấm Mở Gemini chia beat — extension tự điền và Gửi.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        2. Copy JSON beat-map từ Gemini → bấm Lưu beat-map vào CMS trên tab đó.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Hoặc dán JSON beat-map thủ công bên dưới (1 JSON duy nhất — không HTML).
                    </Typography>

                    <TextField
                        label="Beat map JSON"
                        placeholder='{"totalVideoSec":140.1,"sections":[...]}'
                        value={state.beatMapJsonDraft}
                        onChange={(e) => state.handleBeatMapJsonChange(e.target.value)}
                        multiline
                        minRows={8}
                        maxRows={16}
                        fullWidth
                        disabled={state.savingImportHtml || state.whisperStatus !== 'completed'}
                        helperText={state.savingImportHtml ? 'Đang lưu beat map…' : 'JSON phải phủ liên tục từ 0 đến hết audio'}
                        InputProps={{
                            sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 },
                        }}
                    />

                    {beatMapValidation && !beatMapValidation.valid ? (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                            {(beatMapValidation.errors || []).join('; ')}
                        </Alert>
                    ) : null}

                    {state.beatMapReady && state.beatMap?.sections?.length ? (
                        <Stack spacing={0.5} sx={{ mt: 1 }}>
                            {state.beatMap.sections.map((beat) => (
                                <Typography key={beat.id} variant="caption" color="text.secondary">
                                    {beat.id}
                                    {' '}
                                    (
                                    {beat.startSec.toFixed(1)}
                                    –
                                    {beat.endSec.toFixed(1)}
                                    s)
                                    {' · '}
                                    {beat.hf_prompt_type}
                                    {' · '}
                                    {beat.phrase_anchor.slice(0, 48)}
                                    {beat.phrase_anchor.length > 48 ? '…' : ''}
                                </Typography>
                            ))}
                        </Stack>
                    ) : null}
                </Box>

                {state.beatMapReady && state.beatMap?.sections?.length ? (
                    <>
                        <Divider />
                        <Box ref={beatEditorSectionRef}>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Bước 3 — HTML từng beat
                            </Typography>
                            <Chip
                                size="small"
                                sx={{ mb: 1 }}
                                label={
                                    state.beatsRenderErrorCount > 0
                                        ? `HTML: ${state.beatsHtmlCompleted}/${state.beatsHtmlTotal} · Lỗi: ${state.beatsRenderErrorCount}`
                                        : `HTML: ${state.beatsHtmlCompleted}/${state.beatsHtmlTotal}`
                                }
                                color={
                                    state.beatsRenderErrorCount > 0
                                        ? 'warning'
                                        : (state.importHtmlReady ? 'success' : 'default')
                                }
                            />

                            {state.missingBeatHtmlCount > 0 ? (
                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                    Beat thiếu HTML: dùng nút &quot;Mở Gemini tất cả beat thiếu&quot; trên thanh timeline (góc phải) — extension tự điền prompt; bạn kiểm tra rồi Lưu HTML từng tab.
                                </Typography>
                            ) : null}

                            <Tabs
                                value={state.activeBeatId || state.beatMap.sections[0]?.id}
                                onChange={(_e, value) => state.setActiveBeatId(String(value))}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ mb: 1, minHeight: 36 }}
                            >
                                {state.beatMap.sections.map((beat) => {
                                    const visualState = getBeatHtmlVisualState(state.beatHtml, beat.id);
                                    const tabLabel = visualState === 'ok'
                                        ? `${beat.id} ✓`
                                        : beat.id;
                                    const errorMessage = getBeatRenderErrorMessage(state.beatHtml, beat.id);
                                    const tab = (
                                        <Tab
                                            key={beat.id}
                                            value={beat.id}
                                            icon={visualState === 'error' ? <WarningAmberIcon fontSize="small" /> : undefined}
                                            iconPosition={visualState === 'error' ? 'end' : undefined}
                                            label={tabLabel}
                                            sx={{
                                                minHeight: 36,
                                                py: 0.5,
                                                color: visualState === 'error' ? 'warning.main' : undefined,
                                            }}
                                        />
                                    );
                                    if (visualState === 'error') {
                                        return (
                                            <Tooltip key={beat.id} title={errorMessage} arrow>
                                                <Box component="span" sx={{ display: 'inline-flex' }}>
                                                    {tab}
                                                </Box>
                                            </Tooltip>
                                        );
                                    }
                                    return tab;
                                })}
                            </Tabs>

                            {activeBeat ? (
                                <>
                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                        {activeBeat.startSec.toFixed(1)}
                                        s →
                                        {activeBeat.endSec.toFixed(1)}
                                        s ·
                                        {activeBeat.durationSec.toFixed(1)}
                                        s ·
                                        {activeBeat.hf_prompt_type}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                        Copy prompt → chatbot trả 1 file HTML cho beat này — dán vào ô dưới.
                                    </Typography>
                                    <LoadingButton
                                        size="small"
                                        variant="outlined"
                                        fullWidth
                                        loading={state.copyingBeatHtmlPromptBeatId === activeBeat.id}
                                        startIcon={<ContentCopyIcon />}
                                        onClick={() => { void state.handleCopyBeatHtmlPrompt(activeBeat.id); }}
                                    >
                                        Copy prompt HTML
                                        {' '}
                                        {activeBeat.id}
                                    </LoadingButton>

                                    <TextField
                                        label={`HTML ${activeBeat.id}`}
                                        placeholder="Dán 1 file HTML beat (self-contained) — CẤM karaoke/caption, CẤM nhiều file"
                                        value={activeBeatHtml}
                                        onChange={(e) => state.handleBeatHtmlChange(activeBeat.id, e.target.value)}
                                        multiline
                                        minRows={10}
                                        maxRows={20}
                                        fullWidth
                                        disabled={state.savingImportHtml}
                                        sx={{ mt: 1 }}
                                        InputProps={{
                                            sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12 },
                                        }}
                                    />
                                </>
                            ) : null}
                        </Box>
                    </>
                ) : null}

                {state.renderMode === 'import_html' && state.beatMapReady && state.whisperStatus === 'completed' ? (
                    <>
                        <Divider />
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Bước 4 — Tự động HTML beat + ghép video
                            </Typography>
                            <LoadingButton
                                size="small"
                                variant="contained"
                                color="secondary"
                                fullWidth
                                loading={state.launchingImportHtmlFull}
                                disabled={state.agentVideoStatus === 'processing'}
                                startIcon={<PlayArrowIcon />}
                                onClick={() => { void state.handleLaunchAgentImportHtmlFull(); }}
                                sx={{ mb: 1 }}
                            >
                                Tự động HTML beat + ghép video
                            </LoadingButton>
                            {state.importHtmlReady ? (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    fullWidth
                                    startIcon={<ContentCopyIcon />}
                                    onClick={() => { void state.handleCopyPrompt('import_assemble'); }}
                                >
                                    Copy prompt ghép
                                </Button>
                            ) : (
                                <Typography variant="caption" color="text.secondary" display="block">
                                    HTML beat: {state.beatsHtmlCompleted}/{state.beatsHtmlTotal || 0} — agent sẽ sinh phần thiếu
                                </Typography>
                            )}
                        </Box>
                    </>
                ) : null}

                {state.importHtmlReady ? (
                    <Alert severity="success">
                        {state.hasAgentVideo
                            ? 'Sẵn sàng ghép lại — dùng "Ghép lại từ HTML" trên timeline hoặc "Tự động HTML beat + ghép video".'
                            : 'Sẵn sàng ghép — dùng "Chạy agent ghép từ HTML" trên timeline hoặc "Tự động HTML beat + ghép video".'}
                    </Alert>
                ) : state.beatMapReady && state.whisperStatus === 'completed' ? (
                    <Alert severity="info">
                        HTML beat: {state.beatsHtmlCompleted}/{state.beatsHtmlTotal || 0} — bấm &quot;Tự động HTML beat + ghép video&quot; để agent sinh phần thiếu rồi render.
                    </Alert>
                ) : (
                    <Alert severity="info">
                        Cần whisper và beat-map hợp lệ trước khi chạy auto HTML + ghép video.
                    </Alert>
                )}

                {state.renderMode !== 'import_html' ? (
                    <Alert severity="warning">
                        Đang ở luồng agent sáng tạo — chuyển sang &quot;HTML chatbot&quot; để dùng preview và agent ghép.
                    </Alert>
                ) : null}
            </Stack>
        </Box>
    );
}
