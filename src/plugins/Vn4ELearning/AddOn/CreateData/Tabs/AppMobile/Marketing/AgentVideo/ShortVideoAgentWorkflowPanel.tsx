import React from 'react';
import {
    Alert,
    Box,
    Divider,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Button from 'components/atoms/Button';
import LoadingButton from 'components/atoms/LoadingButton';
import { formatTtsChain, hfThemeLabel, phaseLabel, platformLabel } from './agentVideoUi';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
                {label}
            </Typography>
            <Typography variant="caption" fontWeight={500} sx={{ textAlign: 'right' }}>
                {value}
            </Typography>
        </Box>
    );
}

export default function ShortVideoAgentWorkflowPanel({ state }: Props) {
    const chainDisplay = state.ttsChain.length > 0
        ? formatTtsChain(state.ttsChain)
        : state.chainLabel;

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
                    Workflow HyperFrames
                </Typography>

                {state.ttsFailed && state.lastError ? (
                    <Alert severity="error">
                        {state.lastError}
                    </Alert>
                ) : null}

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Trạng thái
                    </Typography>
                    <MetaRow label="Phase" value={phaseLabel(state.workflowPhase)} />
                    <MetaRow
                        label="Workflow mode"
                        value={state.workflowMode === 'auto_tts_full' ? 'TTS tự động' : '2 bước thủ công'}
                    />
                    <MetaRow label="TTS status" value={state.agentTtsStatus || '—'} />
                    <MetaRow
                        label="TTS job"
                        value={state.agentTtsJobId != null ? `#${state.agentTtsJobId}` : '—'}
                    />
                    <MetaRow label="TTS chain" value={chainDisplay} />
                    <MetaRow label="Video status" value={state.agentVideoStatus || 'none'} />
                    <MetaRow
                        label="Rendered at"
                        value={state.agentVideoRenderedAt || '—'}
                    />
                </Box>

                {state.agentVideoSummary ? (
                    <>
                        <Divider />
                        <Box>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Metadata script
                            </Typography>
                            <MetaRow
                                label="Ước tính"
                                value={
                                    state.agentVideoSummary.estimated_duration_sec != null
                                        ? `${state.agentVideoSummary.estimated_duration_sec}s`
                                        : '—'
                                }
                            />
                            <MetaRow
                                label="CTA mode"
                                value={state.agentVideoSummary.cta_mode || '—'}
                            />
                            <MetaRow
                                label="Markers"
                                value={String(state.agentVideoSummary.marker_count ?? 0)}
                            />
                        </Box>
                    </>
                ) : null}

                <Divider />

                <Box>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Theme HyperFrames
                    </Typography>
                    <FormControl fullWidth size="small" disabled={state.savingHfTheme}>
                        <InputLabel id="hf-theme-select-label">Theme</InputLabel>
                        <Select
                            labelId="hf-theme-select-label"
                            label="Theme"
                            value={state.hfTheme || 'auto'}
                            onChange={(e) => { void state.handleHfThemeChange(String(e.target.value)); }}
                        >
                            {(state.hfThemeCatalog.length > 0
                                ? state.hfThemeCatalog
                                : [{ key: 'auto', label: 'Tự động (agent)' }]
                            ).map((item) => (
                                <MenuItem key={item.key} value={item.key}>
                                    {item.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <MetaRow
                        label="Theme render"
                        value={
                            state.hfThemeResolved
                                ? `${hfThemeLabel(state.hfThemeResolved, state.hfThemeCatalog)}${state.hfThemeSource ? ` (${state.hfThemeSource})` : ''}`
                                : '—'
                        }
                    />
                </Box>

                <Divider />

                <Stack spacing={1}>
                    <Typography variant="caption" color="text.secondary">
                        Hành động
                    </Typography>

                    {!state.scriptApproved && (
                        <Button
                            size="small"
                            variant="contained"
                            fullWidth
                            startIcon={<ContentCopyIcon />}
                            onClick={() => { void state.handleCopyPrompt('1'); }}
                        >
                            Copy prompt bước 1
                        </Button>
                    )}

                    {state.readyForPhase2 && !state.hasAgentVideo && (
                        <Button
                            size="small"
                            variant="contained"
                            color="primary"
                            fullWidth
                            startIcon={<ContentCopyIcon />}
                            onClick={() => { void state.handleCopyPrompt('2'); }}
                        >
                            Copy prompt render video (bước 2)
                        </Button>
                    )}

                    {state.hasAgentVideo && (
                        <Button
                            size="small"
                            variant="outlined"
                            fullWidth
                            startIcon={<ContentCopyIcon />}
                            onClick={() => { void state.handleCopyPrompt('continue'); }}
                        >
                            Copy prompt tiếp tục
                        </Button>
                    )}

                    {state.ttsFailed && state.scriptApproved && !state.hasAudio && (
                        <LoadingButton
                            size="small"
                            variant="outlined"
                            color="warning"
                            fullWidth
                            loading={state.retryingTts}
                            onClick={() => { void state.handleRetryTts(); }}
                        >
                            Thử lại TTS
                        </LoadingButton>
                    )}

                    {state.needsTtsEnqueue && state.scriptApproved && !state.hasAudio && !state.ttsFailed && (
                        <LoadingButton
                            size="small"
                            variant="outlined"
                            color="primary"
                            fullWidth
                            loading={state.retryingTts}
                            onClick={() => { void state.handleRetryTts('Đã queue TTS narration'); }}
                        >
                            Sinh TTS (queue)
                        </LoadingButton>
                    )}
                </Stack>

                {state.selectedPlatforms.length > 0 ? (
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Nền tảng đang chọn
                        </Typography>
                        <Typography variant="caption">
                            {state.selectedPlatforms.map(platformLabel).join(', ')}
                        </Typography>
                    </Box>
                ) : null}
            </Stack>
        </Box>
    );
}
