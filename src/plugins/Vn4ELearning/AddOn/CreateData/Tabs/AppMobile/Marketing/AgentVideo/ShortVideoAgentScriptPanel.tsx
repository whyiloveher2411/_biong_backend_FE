import React from 'react';
import {
    Alert,
    Box,
    Checkbox,
    Chip,
    FormControlLabel,
    FormGroup,
    Stack,
    Switch,
    TextField,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SaveIcon from '@mui/icons-material/Save';
import ReplayIcon from '@mui/icons-material/Replay';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { TTS_PLATFORM_OPTIONS } from './agentVideoUi';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

export default function ShortVideoAgentScriptPanel({ state }: Props) {
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
                <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
                    Sau duyệt script, CMS tự queue TTS. Khi có MP3 mới copy prompt render bước 2.
                </Typography>

                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Nền tảng TTS
                    </Typography>
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

                <Box>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2">Audio script (agent)</Typography>
                            {state.scriptDirty ? (
                                <Chip label="Chưa lưu" size="small" color="warning" variant="outlined" />
                            ) : null}
                        </Stack>
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                startIcon={<ContentCopyIcon />}
                                disabled={!state.hasScript}
                                onClick={() => { void state.handleCopyScript(); }}
                            >
                                Copy script
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ContentCopyIcon />}
                                disabled={!state.hasScript}
                                onClick={() => { void state.handleCopyImproveScriptPrompt(); }}
                            >
                                Copy prompt cải thiện
                            </Button>
                        </Stack>
                    </Stack>
                    {state.hasScript ? (
                        <>
                            <TextField
                                multiline
                                minRows={10}
                                maxRows={20}
                                fullWidth
                                value={state.audioScript}
                                onChange={(e) => state.setAudioScript(e.target.value)}
                                sx={{ mb: 1 }}
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
                        </>
                    ) : (
                        <Alert severity="info">
                            Chưa có script. Copy prompt bước 1 và chạy agent trong Cursor.
                        </Alert>
                    )}
                </Box>

                <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Audio file (MP3 — TTS hoặc upload thủ công)
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
    );
}
