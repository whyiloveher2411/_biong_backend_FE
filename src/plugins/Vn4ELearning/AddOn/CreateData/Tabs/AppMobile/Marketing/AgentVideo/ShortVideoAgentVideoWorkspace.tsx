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
import ShortVideoAgentBeatHtmlEditDrawer from './ShortVideoAgentBeatHtmlEditDrawer';
import ShortVideoAgentBeatInfoDrawer from './ShortVideoAgentBeatInfoDrawer';
import ShortVideoAgentHeadlessPreview from './ShortVideoAgentHeadlessPreview';
import { useAgentVideoContent } from './useAgentVideoContent';
import type { ShortVideoAgentLeftTab } from 'helpers/shortVideoAgentVideoDrawerUrl';
import {
    canPlaybackPreviewSource,
    resolveActivePreviewSource,
    resolveDefaultPreviewSource,
    type AgentPreviewSource,
} from './agentVideoPreviewSource';
import { getBeatTimelineSegments } from './agentVideoBeatMap';

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
    initialTab = 'content',
}: Props) {
    const state = useAgentVideoContent({ open, shortVideoId, onUploaded });
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const [previewSource, setPreviewSource] = React.useState<AgentPreviewSource>('html_beat');
    const [editBeatHtmlId, setEditBeatHtmlId] = React.useState('');
    const [infoBeatId, setInfoBeatId] = React.useState('');

    const editBeatSegment = React.useMemo(() => {
        if (!editBeatHtmlId) {
            return null;
        }
        return getBeatTimelineSegments(state.beatMap).find((segment) => segment.beatId === editBeatHtmlId)
            || null;
    }, [editBeatHtmlId, state.beatMap]);

    const editBeatSection = React.useMemo(() => {
        if (!editBeatHtmlId || !state.beatMap?.sections?.length) {
            return null;
        }
        return state.beatMap.sections.find((section) => section.id === editBeatHtmlId) || null;
    }, [editBeatHtmlId, state.beatMap]);

    const infoBeatSection = React.useMemo(() => {
        if (!infoBeatId || !state.beatMap?.sections?.length) {
            return null;
        }
        return state.beatMap.sections.find((section) => section.id === infoBeatId) || null;
    }, [infoBeatId, state.beatMap]);

    const infoBeatIndex = React.useMemo(() => {
        if (!infoBeatId || !state.beatMap?.sections?.length) {
            return null;
        }
        const index = state.beatMap.sections.findIndex((section) => section.id === infoBeatId);
        return index >= 0 ? index + 1 : null;
    }, [infoBeatId, state.beatMap]);

    const handleOpenEditBeatHtml = React.useCallback((beatId: string) => {
        const nextId = String(beatId || '').trim();
        if (!nextId) {
            return;
        }
        setPreviewSource('html_beat');
        setInfoBeatId('');
        state.focusBeatEditor(nextId);
        setEditBeatHtmlId(nextId);
    }, [state.focusBeatEditor]);

    const handleCloseEditBeatHtml = React.useCallback(() => {
        setEditBeatHtmlId('');
    }, []);

    const handleOpenBeatInfo = React.useCallback((beatId: string) => {
        const nextId = String(beatId || '').trim();
        if (!nextId) {
            return;
        }
        setEditBeatHtmlId('');
        state.focusBeatEditor(nextId);
        setInfoBeatId(nextId);
    }, [state.focusBeatEditor]);

    const handleCloseBeatInfo = React.useCallback(() => {
        setInfoBeatId('');
    }, []);

    React.useEffect(() => {
        if (infoBeatId && !infoBeatSection) {
            setInfoBeatId('');
        }
    }, [infoBeatId, infoBeatSection]);

    const handleSaveBeatInfoVisualDescription = React.useCallback(async (
        visualDescription: string,
    ) => {
        if (!infoBeatId) {
            return false;
        }
        return state.handleBeatVisualDescriptionChange(infoBeatId, visualDescription);
    }, [infoBeatId, state.handleBeatVisualDescriptionChange]);

    const handleSaveEditBeatHtml = React.useCallback(async (payload: {
        html: string;
        creativePrompt: string;
        visualDescription: string;
    }) => {
        if (!editBeatHtmlId) {
            return false;
        }
        if (
            payload.visualDescription.trim()
            !== String(editBeatSection?.visual_description || '').trim()
        ) {
            const descriptionSaved = await state.handleBeatVisualDescriptionChange(
                editBeatHtmlId,
                payload.visualDescription,
            );
            if (!descriptionSaved) {
                return false;
            }
        }
        return state.commitBeatHtmlChange(editBeatHtmlId, payload.html, {
            immediate: true,
            creativePrompt: payload.creativePrompt,
        });
    }, [
        editBeatHtmlId,
        editBeatSection?.visual_description,
        state.commitBeatHtmlChange,
        state.handleBeatVisualDescriptionChange,
    ]);

    const handleAiRefineEditBeatHtml = React.useCallback(async (payload: {
        prompt: string;
        html: string;
    }) => {
        if (!editBeatHtmlId) {
            return null;
        }
        return state.handleRefineBeatHtmlViaGemini(editBeatHtmlId, payload);
    }, [editBeatHtmlId, state.handleRefineBeatHtmlViaGemini]);

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
                    videoUrl={state.agentVideoUrl}
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
                    onPasteBeatHtml={(beatId) => {
                        setPreviewSource('html_beat');
                        void state.handlePasteBeatHtml(beatId);
                    }}
                    onEditBeatHtml={handleOpenEditBeatHtml}
                    onOpenBeatInfo={handleOpenBeatInfo}
                    onDeleteBeatHtml={(beatId) => {
                        void state.handleDeleteBeatHtml(beatId);
                    }}
                    onDeleteAllBeatHtml={() => {
                        void state.handleDeleteAllBeatHtml();
                    }}
                    onOpenAllMissingBeatGemini={() => {
                        state.handleOpenAllMissingBeatGemini();
                    }}
                    onFillAllMissingBeatGeminiHeadless={() => {
                        state.handleFillAllMissingBeatGeminiHeadless();
                    }}
                    onOpenBeatGemini={(beatId) => {
                        void state.handleOpenBeatGemini(beatId);
                    }}
                    onOpenBeatGeminiHeadless={(beatId) => {
                        void state.handleOpenBeatGeminiHeadless(beatId);
                    }}
                    copyingBeatHtmlPromptBeatId={state.copyingBeatHtmlPromptBeatId}
                    pastingBeatHtmlBeatId={state.pastingBeatHtmlBeatId}
                    deletingBeatHtmlBeatId={state.deletingBeatHtmlBeatId}
                    deletingAllBeatHtml={state.deletingAllBeatHtml}
                    missingBeatHtmlCount={state.missingBeatHtmlCount}
                    openingAllMissingBeatGemini={state.openingAllMissingBeatGemini}
                    fillingAllMissingBeatGeminiHeadless={state.fillingAllMissingBeatGeminiHeadless}
                    fillingAllMissingBeatGeminiHeadlessProgress={
                        state.fillingAllMissingBeatGeminiHeadlessProgress
                    }
                    geminiFillStatus={state.geminiFillStatus}
                    geminiFillProgress={state.geminiFillProgress}
                    whisperStatus={state.whisperStatus}
                    openingBeatGeminiBeatIds={state.openingBeatGeminiBeatIds}
                    openingBeatGeminiHeadlessBeatIds={state.openingBeatGeminiHeadlessBeatIds}
                    savingImportHtml={state.savingImportHtml}
                    beatPlaybackSeekRequest={state.beatPlaybackSeekRequest}
                    agentVideoStatus={state.agentVideoStatus}
                    showImportAssemble={
                        state.renderMode === 'import_html'
                        && state.importHtmlReady
                    }
                    hasAgentVideo={state.hasAgentVideo}
                    launchingImportAssemble={state.launchingImportAssemble}
                    onLaunchImportAssemble={() => { void state.handleLaunchAgentImportAssemble(); }}
                />
            </Box>
            <ShortVideoAgentBeatHtmlEditDrawer
                open={Boolean(editBeatHtmlId)}
                onClose={handleCloseEditBeatHtml}
                beatId={editBeatHtmlId}
                beatIndex={editBeatSegment?.beatIndex ?? null}
                durationSec={editBeatSection?.durationSec ?? null}
                initialVisualDescription={String(editBeatSection?.visual_description || '')}
                initialHtml={String(state.beatHtml[editBeatHtmlId]?.html || '')}
                initialCreativePrompt={String(state.beatHtml[editBeatHtmlId]?.creative_prompt || '')}
                saving={state.savingImportHtml}
                refining={state.refiningBeatHtmlBeatId === editBeatHtmlId}
                onSave={handleSaveEditBeatHtml}
                onAiRefine={handleAiRefineEditBeatHtml}
            />
            <ShortVideoAgentBeatInfoDrawer
                open={Boolean(infoBeatId && infoBeatSection)}
                onClose={handleCloseBeatInfo}
                beatMap={state.beatMapReady ? state.beatMap : null}
                beat={infoBeatSection}
                beatHtml={infoBeatId ? state.beatHtml[infoBeatId] || null : null}
                audioUrl={state.audioFileUrl || state.agentVideoUrl}
                beatIndex={infoBeatIndex}
                saving={state.savingImportHtml}
                onSaveVisualDescription={handleSaveBeatInfoVisualDescription}
            />
            <ShortVideoAgentHeadlessPreview
                open={open}
                shortVideoId={shortVideoId}
                pipeline={state.fullAutoPipeline}
                geminiFillProgress={state.geminiFillProgress}
                cancelling={state.cancellingFullAuto}
                requestingNewChat={state.requestingHeadlessNewChat}
                onStop={state.handleCancelFullAutoPipeline}
                onNewChat={state.handleHeadlessNewChat}
            />
        </DrawerCustom>
    );
}
