import React from 'react';
import { Box, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Button from 'components/atoms/Button';
import { isKeyboardEditableTarget } from 'helpers/shortVideoEditorKeyboard';
import ShortVideoAgentLeftPanel from './ShortVideoAgentLeftPanel';
import ShortVideoAgentVideoPreview from './ShortVideoAgentVideoPreview';
import ShortVideoAgentWorkflowPanel from './ShortVideoAgentWorkflowPanel';
import ShortVideoAgentVideoTimeline from './ShortVideoAgentVideoTimeline';
import { useAgentVideoContent } from './useAgentVideoContent';
import type { ShortVideoAgentLeftTab } from 'helpers/shortVideoAgentVideoDrawerUrl';
import {
    canPlaybackPreviewSource,
    resolveActivePreviewSource,
    resolveDefaultPreviewSource,
    type AgentPreviewSource,
} from './agentVideoPreviewSource';

type Props = {
    open: boolean;
    shortVideoId: number;
    onClose: () => void;
    onUploaded?: () => void;
    initialTab?: ShortVideoAgentLeftTab;
};

const HEADER_BTN_SX = {
    color: 'common.white',
    bgcolor: 'rgba(255,255,255,0.14)',
    border: '1px solid rgba(255,255,255,0.5)',
    boxShadow: 'none',
    '&:hover': {
        bgcolor: 'rgba(255,255,255,0.24)',
        borderColor: 'common.white',
    },
} as const;

export default function ShortVideoAgentVideoWorkspace({
    open,
    shortVideoId,
    onClose,
    onUploaded,
    initialTab = 'script',
}: Props) {
    const state = useAgentVideoContent({ open, shortVideoId, onUploaded });
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [previewSource, setPreviewSource] = React.useState<AgentPreviewSource>('final');

    const previewInput = React.useMemo(() => ({
        renderMode: state.renderMode,
        hasAudio: state.hasAudio,
        agentVideoUrl: state.agentVideoUrl,
        beatMapReady: state.beatMapReady,
        beatsHtmlCompleted: state.beatsHtmlCompleted,
        beatHtml: state.beatHtml,
        importHtml: state.importHtml,
    }), [
        state.renderMode,
        state.hasAudio,
        state.agentVideoUrl,
        state.beatMapReady,
        state.beatsHtmlCompleted,
        state.beatHtml,
        state.importHtml,
    ]);

    const activePreviewSource = resolveActivePreviewSource(previewSource, previewInput);

    React.useEffect(() => {
        setPreviewSource(resolveDefaultPreviewSource(previewInput));
    }, [shortVideoId]);

    React.useEffect(() => {
        setPreviewSource((current) => resolveActivePreviewSource(current, previewInput));
    }, [previewInput]);

    React.useEffect(() => {
        if (!open) {
            return undefined;
        }

        const canPlayback = canPlaybackPreviewSource(activePreviewSource, previewInput);
        if (!canPlayback) {
            return undefined;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code !== 'Space' && event.key !== ' ') {
                return;
            }
            if (event.repeat || isKeyboardEditableTarget(event.target)) {
                return;
            }
            const video = videoRef.current;
            if (!video) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            if (video.paused) {
                void video.play();
            } else {
                video.pause();
            }
        };

        window.addEventListener('keydown', onKeyDown, true);
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }, [open, activePreviewSource, previewInput]);

    const useCustomHtmlPreview = activePreviewSource === 'html_beat';

    const drawerTitle = state.title
        ? `Short video #${shortVideoId} — ${state.title}`
        : `Short video #${shortVideoId}`;

    const headerAction = (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Chip
                label={state.statusChip.label}
                color={state.statusChip.color}
                size="small"
                sx={{
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'common.white',
                    borderColor: 'rgba(255,255,255,0.4)',
                    '& .MuiChip-label': { px: 1 },
                }}
                variant="outlined"
            />
            <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => state.loadRow()}
                sx={HEADER_BTN_SX}
            >
                Refresh
            </Button>
            {state.agentVideoUrl ? (
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<OpenInNewIcon />}
                    onClick={() => window.open(state.agentVideoUrl, '_blank', 'noopener,noreferrer')}
                    sx={{
                        color: 'grey.900',
                        bgcolor: 'warning.main',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                        '&:hover': { bgcolor: 'warning.dark' },
                    }}
                >
                    Mở video
                </Button>
            ) : null}
        </Box>
    );

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            title={drawerTitle}
            width={2600}
            headerAction={headerAction}
            restDialogContent={{
                sx: {
                    height: 'calc(100vh - 64px)',
                    p: 0,
                    bgcolor: 'background.default',
                },
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    minHeight: 0,
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        minHeight: 0,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            width: 640,
                            flexShrink: 0,
                            borderRight: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            bgcolor: 'background.paper',
                        }}
                    >
                        <ShortVideoAgentLeftPanel
                            state={state}
                            initialTab={initialTab}
                            onSaved={onUploaded}
                        />
                    </Box>

                    <ShortVideoAgentVideoPreview
                        state={state}
                        videoRef={videoRef}
                        previewSource={activePreviewSource}
                        onPreviewSourceChange={setPreviewSource}
                    />

                    <Box
                        sx={{
                            width: 300,
                            flexShrink: 0,
                            borderLeft: 1,
                            borderColor: 'divider',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: 0,
                            bgcolor: 'background.paper',
                        }}
                    >
                        <ShortVideoAgentWorkflowPanel state={state} />
                    </Box>
                </Box>
                <ShortVideoAgentVideoTimeline
                    shortVideoId={shortVideoId}
                    videoUrl={state.agentVideoUrl}
                    agentVideoRenderedAt={state.agentVideoRenderedAt}
                    videoRef={videoRef}
                    clipLabel={state.title || `Short video #${shortVideoId}`}
                    audioDurationSec={state.audioDurationSec}
                    estimatedDurationSec={state.agentVideoSummary?.estimated_duration_sec}
                    customHtmlPreview={useCustomHtmlPreview}
                    previewSourceKey={activePreviewSource}
                    beatMap={state.beatMapReady ? state.beatMap : null}
                    beatHtml={state.beatHtml}
                    activeBeatId={state.activeBeatId}
                    onBeatClick={state.focusBeatEditor}
                    onCopyBeatPrompt={(beatId) => { void state.handleCopyBeatHtmlPrompt(beatId); }}
                    onPasteBeatHtml={(beatId) => { void state.handlePasteBeatHtml(beatId); }}
                    copyingBeatHtmlPromptBeatId={state.copyingBeatHtmlPromptBeatId}
                    pastingBeatHtmlBeatId={state.pastingBeatHtmlBeatId}
                    savingImportHtml={state.savingImportHtml}
                />
            </Box>
        </DrawerCustom>
    );
}
