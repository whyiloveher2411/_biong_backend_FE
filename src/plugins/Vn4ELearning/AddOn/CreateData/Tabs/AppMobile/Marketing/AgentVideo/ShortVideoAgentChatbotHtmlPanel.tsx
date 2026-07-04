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
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RefreshIcon from '@mui/icons-material/Refresh';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { parseBeatMapJson, validateBeatMap } from './agentVideoBeatMap';
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
                        {(state.transcribingWhisper || state.whisperStatus === 'processing') ? (
                            <Typography variant="caption" color="text.secondary">
                                Đang transcribe audio trên server…
                            </Typography>
                        ) : null}
                        {state.whisperStatus === 'failed' ? (
                            <LoadingButton
                                size="small"
                                variant="outlined"
                                loading={state.transcribingWhisper}
                                startIcon={<RefreshIcon />}
                                onClick={() => { void state.runWhisperTranscribe({ force: true }); }}
                            >
                                Chạy lại whisper
                            </LoadingButton>
                        ) : null}
                    </Box>
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
                        loading={state.copyingBeatDivisionPrompt}
                        disabled={state.whisperStatus !== 'completed'}
                        startIcon={<ContentCopyIcon />}
                        onClick={() => { void state.handleCopyBeatDivisionPrompt(); }}
                    >
                        Copy prompt chia beat
                    </LoadingButton>

                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1, mb: 1 }}>
                        Dán JSON beat-map từ chatbot (1 JSON duy nhất — không HTML).
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
                                label={`HTML: ${state.beatsHtmlCompleted}/${state.beatsHtmlTotal}`}
                                color={state.importHtmlReady ? 'success' : 'default'}
                            />

                            <Tabs
                                value={state.activeBeatId || state.beatMap.sections[0]?.id}
                                onChange={(_e, value) => state.setActiveBeatId(String(value))}
                                variant="scrollable"
                                scrollButtons="auto"
                                sx={{ mb: 1, minHeight: 36 }}
                            >
                                {state.beatMap.sections.map((beat) => {
                                    const hasHtml = Boolean(state.beatHtml[beat.id]?.html?.trim());
                                    return (
                                        <Tab
                                            key={beat.id}
                                            value={beat.id}
                                            label={hasHtml ? `${beat.id} ✓` : beat.id}
                                            sx={{ minHeight: 36, py: 0.5 }}
                                        />
                                    );
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

                {state.renderMode === 'import_html' && state.importHtmlReady ? (
                    <>
                        <Divider />
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Bước 4 — Ghép video từ HTML beat
                            </Typography>
                            <LoadingButton
                                size="small"
                                variant="contained"
                                color="primary"
                                fullWidth
                                loading={state.launchingImportAssemble}
                                disabled={state.agentVideoStatus === 'processing'}
                                startIcon={<PlayArrowIcon />}
                                onClick={() => { void state.handleLaunchAgentImportAssemble(); }}
                                sx={{ mb: 1 }}
                            >
                                {state.hasAgentVideo ? 'Ghép lại từ HTML' : 'Chạy agent ghép từ HTML'}
                            </LoadingButton>
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
                        </Box>
                    </>
                ) : null}

                {state.importHtmlReady ? (
                    <Alert severity="success">
                        {state.hasAgentVideo
                            ? 'Sẵn sàng ghép lại — bấm "Ghép lại từ HTML" để render MP4 mới từ beat HTML (khớp preview).'
                            : 'Sẵn sàng ghép — bấm "Chạy agent ghép từ HTML" để render video final.'}
                    </Alert>
                ) : (
                    <Alert severity="info">
                        Cần whisper, beat-map hợp lệ và HTML đủ mọi beat trước khi chạy agent ghép.
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
