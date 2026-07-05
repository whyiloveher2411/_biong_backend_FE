import React from 'react';
import {
    Alert,
    Box,
    Divider,
    Checkbox,
    Chip,
    FormControlLabel,
    FormGroup,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import ReplayIcon from '@mui/icons-material/Replay';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { TTS_PLATFORM_OPTIONS } from './agentVideoUi';
import { useAgentVideoOpenGeminiScriptActions } from './agentVideoOpenGeminiScript';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

const stepCardSx = {
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 2,
    p: 1.5,
    bgcolor: 'background.paper',
} as const;

function StepHeader({
    step,
    title,
    description,
    trailing,
}: {
    step: number;
    title: string;
    description?: string;
    trailing?: React.ReactNode;
}) {
    return (
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: description ? 0.5 : 0 }}>
                    <Chip label={`Bước ${step}`} size="small" color="primary" variant="outlined" />
                    <Typography variant="subtitle2">{title}</Typography>
                </Stack>
                {description ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                        {description}
                    </Typography>
                ) : null}
            </Box>
            {trailing}
        </Stack>
    );
}

export default function ShortVideoAgentScriptPanel({ state }: Props) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);
    const { openCreateScriptGemini, openImproveScriptGemini } = useAgentVideoOpenGeminiScriptActions();
    const [openingCreateScriptGemini, setOpeningCreateScriptGemini] = React.useState(false);
    const [openingImproveScriptGemini, setOpeningImproveScriptGemini] = React.useState(false);

    const handleOpenCreateScriptGemini = async () => {
        setOpeningCreateScriptGemini(true);
        try {
            await openCreateScriptGemini({
                shortVideoId: state.shortVideoId,
                title: state.title,
                audioScript: state.audioScript,
                hasScript: state.hasScript,
            });
        } finally {
            setOpeningCreateScriptGemini(false);
        }
    };

    const handleOpenImproveScriptGemini = async () => {
        setOpeningImproveScriptGemini(true);
        try {
            await openImproveScriptGemini({
                shortVideoId: state.shortVideoId,
                title: state.title,
                audioScript: state.audioScript,
                hasScript: state.hasScript,
            });
        } finally {
            setOpeningImproveScriptGemini(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        void state.handleUploadMp3(file);
    };

    return (
        <Box
            sx={{
                height: '100%',
                overflow: 'auto',
                p: 2,
            }}
        >
            <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight={600}>
                    Audio script & TTS
                </Typography>

                <Box sx={stepCardSx}>
                    <Stack spacing={1.25}>
                        <StepHeader
                            step={1}
                            title="Sinh script (chatbot)"
                            description="Mở Gemini qua extension — tự điền prompt và Gửi."
                        />
                        <Typography variant="caption" color="text.secondary" component="div">
                            <Box component="span" display="block">1. Bấm Mở Gemini sinh script (hoặc cải thiện).</Box>
                            <Box component="span" display="block">2. Kiểm tra kết quả trên tab Gemini, copy audio script.</Box>
                            <Box component="span" display="block">3. Bấm Lưu script vào CMS trên tab Gemini → sang bước 2 để duyệt.</Box>
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <LoadingButton
                                size="small"
                                variant="contained"
                                loading={openingCreateScriptGemini}
                                startIcon={<OpenInNewIcon />}
                                onClick={() => { void handleOpenCreateScriptGemini(); }}
                            >
                                Mở Gemini sinh script
                            </LoadingButton>
                            <LoadingButton
                                size="small"
                                variant="outlined"
                                startIcon={<OpenInNewIcon />}
                                disabled={!state.hasScript}
                                loading={openingImproveScriptGemini}
                                onClick={() => { void handleOpenImproveScriptGemini(); }}
                            >
                                Mở Gemini cải thiện
                            </LoadingButton>
                            <Button
                                size="small"
                                variant="text"
                                disabled={!state.hasScript}
                                onClick={() => { void state.handleCopyScript(); }}
                            >
                                Copy script
                            </Button>
                        </Stack>
                        <TextField
                            multiline
                            minRows={10}
                            maxRows={20}
                            fullWidth
                            placeholder="Dán audio script từ chatbot vào đây…"
                            value={state.audioScript}
                            onChange={(e) => state.setAudioScript(e.target.value)}
                        />
                        {!state.hasScript ? (
                            <Alert severity="info">
                                Chưa có nội dung script. Bấm Mở Gemini sinh script — extension tự điền và Gửi.
                            </Alert>
                        ) : null}
                    </Stack>
                </Box>

                {state.hasScript ? (
                    <Box sx={stepCardSx}>
                        <Stack spacing={1.25}>
                            <StepHeader
                                step={2}
                                title="Lưu & duyệt script"
                                description="Lưu script lên CMS trước khi duyệt để queue TTS."
                                trailing={(
                                    <Stack direction="row" spacing={0.5} flexShrink={0}>
                                        {state.scriptDirty ? (
                                            <Chip label="Chưa lưu" size="small" color="warning" variant="outlined" />
                                        ) : null}
                                        {state.scriptApproved ? (
                                            <Chip label="Đã duyệt" size="small" color="success" variant="outlined" />
                                        ) : null}
                                    </Stack>
                                )}
                            />
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <LoadingButton
                                    size="small"
                                    loading={state.savingScript}
                                    variant="outlined"
                                    startIcon={<SaveIcon />}
                                    onClick={() => { void state.handleSaveScript(); }}
                                >
                                    Lưu script
                                </LoadingButton>
                                <LoadingButton
                                    size="small"
                                    loading={state.approvingScript}
                                    variant="contained"
                                    color="success"
                                    disabled={state.scriptApproved}
                                    startIcon={<CheckCircleOutlineIcon />}
                                    onClick={() => { void state.handleApproveScript(); }}
                                >
                                    {state.scriptApproved ? 'Đã duyệt' : 'Duyệt script'}
                                </LoadingButton>
                            </Stack>
                        </Stack>
                    </Box>
                ) : null}

                <Box sx={stepCardSx}>
                    <Stack spacing={1.25}>
                        <StepHeader
                            step={3}
                            title="Audio (TTS + MP3)"
                            description="Bật TTS tự động hoặc upload MP3 thủ công sau khi script được duyệt."
                        />

                        <FormControlLabel
                            control={(
                                <Switch
                                    checked={state.agentTtsAuto}
                                    disabled={state.savingTtsMode}
                                    onChange={(e) => { void state.handleTtsAutoChange(e.target.checked); }}
                                />
                            )}
                            label="TTS tự động agent"
                        />

                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Thứ tự ưu tiên: OmniVoice → VieNeu → Saydi → Vbee
                            </Typography>
                            <FormGroup>
                                {TTS_PLATFORM_OPTIONS.map((option) => (
                                    <FormControlLabel
                                        key={option.key}
                                        control={(
                                            <Checkbox
                                                checked={state.selectedPlatforms.includes(option.key)}
                                                disabled={!state.agentTtsAuto || state.savingTtsMode}
                                                onChange={() => { void state.handlePlatformToggle(option.key); }}
                                            />
                                        )}
                                        label={option.label}
                                    />
                                ))}
                            </FormGroup>
                            {state.agentTtsAuto && (
                                <Chip
                                    label={`Chain: ${state.chainLabel}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ mt: 1 }}
                                />
                            )}
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Audio file (MP3)
                            </Typography>
                            {state.hasAudio ? (
                                <Stack spacing={1}>
                                    <audio controls src={state.audioFileUrl} style={{ width: '100%' }}>
                                        <track kind="captions" />
                                    </audio>
                                    {state.audioDurationSec != null && (
                                        <Typography variant="caption" color="text.secondary">
                                            Thời lượng: {state.audioDurationSec.toFixed(1)}s
                                        </Typography>
                                    )}
                                    {state.scriptApproved && !state.ttsPending && (
                                        <LoadingButton
                                            size="small"
                                            variant="outlined"
                                            color="secondary"
                                            loading={state.regeneratingTts}
                                            startIcon={<ReplayIcon />}
                                            onClick={() => { void state.handleRegenerateTts(); }}
                                        >
                                            Tạo lại audio TTS (queue)
                                        </LoadingButton>
                                    )}
                                </Stack>
                            ) : (
                                <Alert severity="warning" sx={{ mb: 1 }}>
                                    {state.ttsPending
                                        ? 'CMS đang sinh MP3 qua TTS — vui lòng chờ vài phút.'
                                        : state.scriptApproved
                                            ? 'Chưa có MP3. CMS queue TTS sau duyệt, hoặc upload MP3 thủ công.'
                                            : 'Chưa có MP3. Duyệt script trước — CMS sẽ queue TTS tự động.'}
                                </Alert>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="audio/mpeg,.mp3"
                                hidden
                                onChange={handleFileChange}
                            />
                            <LoadingButton
                                loading={state.uploading}
                                variant="contained"
                                disabled={state.hasScript && !state.scriptApproved && !state.hasAudio}
                                startIcon={<UploadFileIcon />}
                                sx={{ mt: 1 }}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {state.hasAudio ? 'Upload lại MP3' : 'Upload MP3'}
                            </LoadingButton>
                        </Box>
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
}
