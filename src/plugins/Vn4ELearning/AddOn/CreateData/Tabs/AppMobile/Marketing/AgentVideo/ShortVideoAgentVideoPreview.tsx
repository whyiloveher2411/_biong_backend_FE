import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Typography,
} from '@mui/material';
import { resolvePreviewPlaceholder } from './agentVideoUi';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

export default function ShortVideoAgentVideoPreview({ state }: Props) {
    const placeholder = resolvePreviewPlaceholder({
        agentVideoUrl: state.agentVideoUrl,
        agentVideoStatus: state.agentVideoStatus,
        phase: state.workflowPhase,
        hasScript: state.hasScript,
        scriptApproved: state.scriptApproved,
        hasAudio: state.hasAudio,
        ttsPending: state.ttsPending,
        lastError: state.lastError,
    });

    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                p: 3,
                bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
            }}
        >
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, flexShrink: 0 }}>
                Preview video HyperFrames
            </Typography>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {state.agentVideoUrl ? (
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 360,
                            aspectRatio: '9 / 16',
                            bgcolor: 'common.black',
                            borderRadius: 2,
                            overflow: 'hidden',
                            boxShadow: 3,
                        }}
                    >
                        <video
                            controls
                            src={state.agentVideoUrl}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                            }}
                        >
                            <track kind="captions" />
                        </video>
                    </Box>
                ) : placeholder ? (
                    <Box
                        sx={{
                            width: '100%',
                            maxWidth: 360,
                            aspectRatio: '9 / 16',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 2,
                            border: 2,
                            borderStyle: 'dashed',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            p: 3,
                            textAlign: 'center',
                        }}
                    >
                        {placeholder.loading ? (
                            <CircularProgress size={36} sx={{ mb: 2 }} />
                        ) : null}
                        <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                            {placeholder.title}
                        </Typography>
                        {placeholder.description ? (
                            <Typography variant="body2" color="text.secondary">
                                {placeholder.description}
                            </Typography>
                        ) : null}
                    </Box>
                ) : null}
            </Box>

            {state.agentVideoUrl && state.agentVideoRenderedAt ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Render lúc: {state.agentVideoRenderedAt}
                </Typography>
            ) : null}

            {placeholder?.severity === 'error' && state.lastError ? (
                <Alert severity="error" sx={{ mt: 2, maxWidth: 480, mx: 'auto', width: '100%' }}>
                    {state.lastError}
                </Alert>
            ) : null}
        </Box>
    );
}
