import React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Chip,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import LoadingButton from 'components/atoms/LoadingButton';
import ShortVideoAgentResourcesPanel from './ShortVideoAgentResourcesPanel';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    active: boolean;
};

function StepLine({
    step,
    title,
    status,
    done,
    locked,
    accent,
    action,
}: {
    step: number;
    title: string;
    status?: React.ReactNode;
    done?: boolean;
    locked?: boolean;
    accent: string;
    action: React.ReactNode;
}) {
    return (
        <Box
            sx={{
                px: 1.25,
                py: 1,
                borderRadius: 1.5,
                border: '1px solid',
                borderColor: done ? accent : 'divider',
                bgcolor: (t) => (
                    t.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.03)'
                        : done
                            ? `${accent}12`
                            : 'background.paper'
                ),
                opacity: locked ? 0.5 : 1,
                pointerEvents: locked ? 'none' : 'auto',
            }}
        >
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Avatar
                    sx={{
                        width: 22,
                        height: 22,
                        fontSize: 12,
                        fontWeight: 700,
                        bgcolor: done ? accent : locked ? 'action.disabledBackground' : accent,
                        color: '#fff',
                        flexShrink: 0,
                    }}
                >
                    {step}
                </Avatar>
                <Typography variant="body2" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                    {title}
                </Typography>
                {status}
                <Box sx={{ flex: 1, minWidth: 8 }} />
                {action}
            </Stack>
        </Box>
    );
}

export default function ShortVideoAgentChatbotHtmlPanel({ state }: Props) {
    if (!state.scriptApproved || !state.hasAudio) {
        return (
            <Box sx={{ p: 2 }}>
                <Alert severity="info">
                    Cần duyệt script và có audio narration trước khi dùng tab Render.
                </Alert>
            </Box>
        );
    }

    const whisperReady = state.whisperStatus === 'completed' && !state.whisperStale;
    const beatCount = state.beatMap?.sections.length ?? 0;
    const beatDone = Boolean(state.beatMapReady && beatCount > 0);
    const isImportHtml = state.renderMode === 'import_html';

    return (
        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Stack spacing={1.5}>
                <Stack spacing={1}>
                    <Typography variant="subtitle2" fontWeight={600}>
                        Render
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
                        sx={{
                            width: 'fit-content',
                            '& .MuiToggleButton-root': {
                                px: 1.25,
                                py: 0.35,
                                fontWeight: 600,
                                textTransform: 'none',
                                fontSize: 13,
                            },
                        }}
                    >
                        <ToggleButton
                            value="import_html"
                            sx={{
                                '&.Mui-selected': {
                                    bgcolor: 'primary.main',
                                    color: '#fff',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                },
                            }}
                        >
                            HTML chatbot
                        </ToggleButton>
                        <ToggleButton value="creative">
                            Agent sáng tạo
                        </ToggleButton>
                    </ToggleButtonGroup>
                    {!isImportHtml ? (
                        <Alert severity="warning" sx={{ py: 0.5 }}>
                            Đang ở Agent sáng tạo — chọn HTML chatbot để chia beat, tài nguyên và render.
                        </Alert>
                    ) : null}
                    {!whisperReady ? (
                        <Alert severity="info" sx={{ py: 0.5 }}>
                            Chờ Whisper xong trên tab Script & TTS.
                        </Alert>
                    ) : null}
                </Stack>

                <StepLine
                    step={1}
                    title="Chia beat"
                    done={beatDone}
                    locked={!isImportHtml || !whisperReady}
                    accent="#00838f"
                    status={(
                        <Chip
                            size="small"
                            label={beatDone ? `${beatCount} beat` : 'Chưa có'}
                            color={beatDone ? 'success' : 'default'}
                            variant={beatDone ? 'filled' : 'outlined'}
                            sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                        />
                    )}
                    action={(
                        <LoadingButton
                            size="small"
                            variant={beatDone ? 'outlined' : 'contained'}
                            loading={state.openingBeatDivisionGemini}
                            disabled={!whisperReady || !isImportHtml}
                            startIcon={<OpenInNewIcon />}
                            onClick={() => { void state.handleOpenBeatDivisionGemini(); }}
                            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                        >
                            {beatDone ? 'Chia lại' : 'Mở Gemini'}
                        </LoadingButton>
                    )}
                />

                {isImportHtml ? (
                    <ShortVideoAgentResourcesPanel state={state} embedded />
                ) : null}
            </Stack>
        </Box>
    );
}
