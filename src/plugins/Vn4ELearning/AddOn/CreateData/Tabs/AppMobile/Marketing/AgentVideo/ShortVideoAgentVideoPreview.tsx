import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import { resolvePreviewPlaceholder } from './agentVideoUi';
import {
    canShowHtmlBeatPreview,
    canShowPreviewSourceTabs,
    resolveActivePreviewSource,
    resolvePreviewSourceTitle,
    type AgentPreviewSource,
} from './agentVideoPreviewSource';
import ShortVideoAgentCustomHtmlPreview from './ShortVideoAgentCustomHtmlPreview';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    videoRef: React.Ref<HTMLVideoElement>;
    previewSource: AgentPreviewSource;
    onPreviewSourceChange: (source: AgentPreviewSource) => void;
};

function buildPreviewSourceInput(state: AgentVideoState) {
    return {
        renderMode: state.renderMode,
        hasAudio: state.hasAudio,
        agentVideoUrl: state.agentVideoUrl,
        beatMapReady: state.beatMapReady,
        beatsHtmlCompleted: state.beatsHtmlCompleted,
        beatHtml: state.beatHtml,
        importHtml: state.importHtml,
    };
}

function HtmlBeatMissingPlaceholder() {
    return (
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
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
                Chưa có HTML beat
            </Typography>
            <Typography variant="body2" color="text.secondary">
                Dùng timeline hoặc tab Render bên trái để sinh HTML từng beat.
            </Typography>
        </Box>
    );
}

export default function ShortVideoAgentVideoPreview({
    state,
    videoRef,
    previewSource,
    onPreviewSourceChange,
}: Props) {
    const previewInput = React.useMemo(() => buildPreviewSourceInput(state), [state]);
    const activeSource = resolveActivePreviewSource(previewSource, previewInput);
    const showTabs = canShowPreviewSourceTabs(previewInput);
    const showHtmlBeat = activeSource === 'html_beat' && canShowHtmlBeatPreview(previewInput);

    const placeholder = resolvePreviewPlaceholder({
        agentVideoUrl: showHtmlBeat ? '' : state.agentVideoUrl,
        agentVideoStatus: state.agentVideoStatus,
        phase: state.workflowPhase,
        hasScript: state.hasScript,
        scriptApproved: state.scriptApproved,
        hasAudio: state.hasAudio,
        ttsPending: state.ttsPending,
        lastError: state.lastError,
    });

    const handleTabChange = (_event: React.SyntheticEvent, value: AgentPreviewSource) => {
        if (typeof videoRef === 'object' && videoRef !== null && 'current' in videoRef) {
            videoRef.current?.pause();
        }
        onPreviewSourceChange(value);
    };

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
            {showTabs ? (
                <Tabs
                    value={activeSource}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ mb: 2, flexShrink: 0, minHeight: 40 }}
                >
                    <Tab label="Video final" value="final" />
                    <Tab label="HTML beat" value="html_beat" />
                </Tabs>
            ) : (
                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2, flexShrink: 0 }}>
                    {resolvePreviewSourceTitle(activeSource)}
                </Typography>
            )}

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
                {activeSource === 'final' && state.agentVideoUrl ? (
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
                            ref={videoRef}
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
                ) : showHtmlBeat ? (
                    <ShortVideoAgentCustomHtmlPreview
                        beatMap={state.beatMap}
                        beatHtml={state.beatHtml}
                        audioUrl={state.audioFileUrl}
                        audioDurationSec={state.audioDurationSec}
                        videoRef={videoRef}
                    />
                ) : activeSource === 'html_beat' ? (
                    <HtmlBeatMissingPlaceholder />
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

            {activeSource === 'final' && state.agentVideoUrl && state.agentVideoRenderedAt ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
                    Render lúc: {state.agentVideoRenderedAt}
                </Typography>
            ) : null}

            {placeholder?.severity === 'error' && state.lastError && activeSource !== 'html_beat' ? (
                <Alert severity="error" sx={{ mt: 2, maxWidth: 480, mx: 'auto', width: '100%' }}>
                    {state.lastError}
                </Alert>
            ) : null}
        </Box>
    );
}
