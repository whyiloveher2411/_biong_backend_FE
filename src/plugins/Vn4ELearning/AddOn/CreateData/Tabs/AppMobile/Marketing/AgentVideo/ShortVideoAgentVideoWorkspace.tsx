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
import ShortVideoAgentBeatImageEditDrawer from './ShortVideoAgentBeatImageEditDrawer';
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
import { beatImagePromptToText, getBeatTimelineSegments, resolveActiveBeatSection } from './agentVideoBeatMap';

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
    const [editBeatImageId, setEditBeatImageId] = React.useState('');
    const [infoBeatId, setInfoBeatId] = React.useState('');
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);

    const currentBeatId = React.useMemo(() => {
        const beat = resolveActiveBeatSection(
            state.beatMapReady ? state.beatMap : null,
            currentTimeSec,
        );
        return beat?.id || '';
    }, [currentTimeSec, state.beatMap, state.beatMapReady]);

    const editBeatSegment = React.useMemo(() => {
        const beatId = editBeatHtmlId || editBeatImageId;
        if (!beatId) {
            return null;
        }
        return getBeatTimelineSegments(state.beatMap).find((segment) => segment.beatId === beatId)
            || null;
    }, [editBeatHtmlId, editBeatImageId, state.beatMap]);

    const editBeatSection = React.useMemo(() => {
        const beatId = editBeatHtmlId || editBeatImageId;
        if (!beatId || !state.beatMap?.sections?.length) {
            return null;
        }
        return state.beatMap.sections.find((section) => section.id === beatId) || null;
    }, [editBeatHtmlId, editBeatImageId, state.beatMap]);

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
        setEditBeatImageId('');
        state.focusBeatEditor(nextId);
        setEditBeatHtmlId(nextId);
    }, [state.focusBeatEditor]);

    const handleCloseEditBeatHtml = React.useCallback(() => {
        setEditBeatHtmlId('');
    }, []);

    const handleOpenEditBeatImage = React.useCallback((beatId: string) => {
        const nextId = String(beatId || '').trim();
        if (!nextId) {
            return;
        }
        setPreviewSource('html_beat');
        setInfoBeatId('');
        setEditBeatHtmlId('');
        state.focusBeatEditor(nextId);
        setEditBeatImageId(nextId);
    }, [state.focusBeatEditor]);

    const handleCloseEditBeatImage = React.useCallback(() => {
        setEditBeatImageId('');
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
        background: string,
    ) => {
        if (!infoBeatId) {
            return false;
        }
        return state.handleBeatVisualDescriptionChange(infoBeatId, visualDescription, background);
    }, [infoBeatId, state.handleBeatVisualDescriptionChange]);

    const handleSaveEditBeatHtml = React.useCallback(async (payload: {
        html: string;
        creativePrompt: string;
        visualDescription: string;
        background: string;
    }) => {
        if (!editBeatHtmlId) {
            return false;
        }
        const descriptionChanged = payload.visualDescription.trim()
            !== String(editBeatSection?.visual_description || '').trim();
        const backgroundChanged = payload.background.trim()
            !== String(editBeatSection?.background || '').trim();
        if (descriptionChanged || backgroundChanged) {
            const descriptionSaved = await state.handleBeatVisualDescriptionChange(
                editBeatHtmlId,
                payload.visualDescription,
                payload.background,
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
        editBeatSection?.background,
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

    const handleSaveEditBeatImage = React.useCallback(async (payload: {
        imagePrompt: string;
        creativePrompt: string;
        visualDescription: string;
        background: string;
    }) => {
        if (!editBeatImageId) {
            return false;
        }
        const descriptionChanged = payload.visualDescription.trim()
            !== String(editBeatSection?.visual_description || '').trim();
        const backgroundChanged = payload.background.trim()
            !== String(editBeatSection?.background || '').trim();
        if (descriptionChanged || backgroundChanged) {
            const descriptionSaved = await state.handleBeatVisualDescriptionChange(
                editBeatImageId,
                payload.visualDescription,
                payload.background,
            );
            if (!descriptionSaved) {
                return false;
            }
        }
        return state.commitBeatImageChange(editBeatImageId, {
            imagePrompt: payload.imagePrompt,
            creativePrompt: payload.creativePrompt,
        }, { immediate: true });
    }, [
        editBeatImageId,
        editBeatSection?.background,
        editBeatSection?.visual_description,
        state.commitBeatImageChange,
        state.handleBeatVisualDescriptionChange,
    ]);

    const handleRegenerateEditBeatImage = React.useCallback(async (payload: {
        imagePrompt: string;
    }) => {
        if (!editBeatImageId) {
            return null;
        }
        return state.handleOpenBeatImageDuckAiManual(editBeatImageId, payload.imagePrompt);
    }, [editBeatImageId, state.handleOpenBeatImageDuckAiManual]);

    const handleRegenerateEditBeatImageMetaAi = React.useCallback(async (payload: {
        imagePrompt: string;
    }) => {
        if (!editBeatImageId) {
            return null;
        }
        return state.handleOpenBeatImageMetaAiManual(editBeatImageId, payload.imagePrompt);
    }, [editBeatImageId, state.handleOpenBeatImageMetaAiManual]);

    const handleUploadBeatImageFile = React.useCallback(async (file: File) => {
        if (!editBeatImageId) {
            return null;
        }
        return state.handleUploadBeatImageFromFile(editBeatImageId, file);
    }, [editBeatImageId, state.handleUploadBeatImageFromFile]);

    const previewInput = React.useMemo(() => ({
        renderMode: state.renderMode,
        hasAudio: state.hasAudio,
        agentVideoUrl: state.agentVideoUrl,
        localFinalMp4Url: state.localFinalMp4OpenUrl || state.localFinalMp4Url,
        beatMapReady: state.beatMapReady,
        beatsHtmlCompleted: state.beatsHtmlCompleted,
        beatsImageCompleted: state.beatsImageCompleted,
        agentVisualMode: state.agentVisualMode,
        beatHtml: state.beatHtml,
        beatImage: state.beatImage,
        importHtml: state.importHtml,
    }), [
        state.renderMode,
        state.hasAudio,
        state.agentVideoUrl,
        state.localFinalMp4OpenUrl,
        state.localFinalMp4Url,
        state.beatMapReady,
        state.beatsHtmlCompleted,
        state.beatsImageCompleted,
        state.agentVisualMode,
        state.beatHtml,
        state.beatImage,
        state.importHtml,
    ]);

    const finalPreviewVideoUrl = state.localFinalMp4OpenUrl || state.agentVideoUrl;

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
            {finalPreviewVideoUrl ? (
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<OpenInNewIcon />}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        // Tab mới: ưu tiên CDN public (ổn định). Local chỉ khi chưa có agent_video_url.
                        const raw = String(
                            state.agentVideoUrl || state.localFinalMp4OpenUrl || finalPreviewVideoUrl || '',
                        ).trim();
                        if (!raw) return;
                        let openUrl = raw;
                        try {
                            const u = new URL(raw, window.location.origin);
                            u.searchParams.set('v', String(Date.now()));
                            openUrl = u.toString();
                        } catch {
                            const sep = raw.includes('?') ? '&' : '?';
                            openUrl = `${raw}${sep}v=${Date.now()}`;
                        }
                        // Quan trọng: features có `noopener` khiến window.open luôn trả null
                        // dù tab mới đã mở — không được fallback location.assign (sẽ navigate tab hiện tại).
                        const opened = window.open(openUrl, '_blank');
                        if (opened) {
                            try {
                                opened.opener = null;
                            } catch {
                                // ignore
                            }
                        }
                    }}
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
                        currentBeatId={currentBeatId}
                    />

                    <Box
                        sx={{
                            width: 380,
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
                    videoUrl={finalPreviewVideoUrl}
                    videoRef={videoRef}
                    clipLabel={state.title || `Short video #${shortVideoId}`}
                    audioDurationSec={state.audioDurationSec}
                    estimatedDurationSec={state.agentVideoSummary?.estimated_duration_sec}
                    shortVideoId={shortVideoId}
                    agentSourceFormat={state.agentSourceFormat}
                    onSaveBeatMapManual={state.handleManualBeatDivisionSave}
                    audioScript={state.audioScript}
                    onSaveScriptManual={state.handleManualScriptCreateSave}
                    audioScriptTtsReading={state.audioScriptTtsReading}
                    onSaveScriptPhonetic={state.handleManualScriptPhoneticSave}
                    customHtmlPreview={useCustomHtmlPreview}
                    previewSourceKey={activePreviewSource}
                    beatMap={state.beatMapReady ? state.beatMap : null}
                    beatHtml={state.beatHtml}
                    beatImage={state.beatImage}
                    isWhiteboardMode={state.isWhiteboardMode}
                    activeBeatId={state.activeBeatId}
                    onBeatClick={state.focusBeatEditor}
                    onCopyBeatPrompt={(beatId) => { void state.handleCopyBeatHtmlPrompt(beatId); }}
                    onPasteBeatHtml={(beatId) => {
                        setPreviewSource('html_beat');
                        void state.handlePasteBeatHtml(beatId);
                    }}
                    onEditBeatHtml={state.isWhiteboardMode ? handleOpenEditBeatImage : handleOpenEditBeatHtml}
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
                    onOpenAllMissingBeatMetaAi={() => {
                        state.handleOpenAllMissingBeatMetaAi();
                    }}
                    onOpenAllMissingBeatAiStudio={() => {
                        state.handleOpenAllMissingBeatAiStudio();
                    }}
                    onFillAllMissingBeatGeminiHeadless={() => {
                        state.handleFillAllMissingBeatGeminiHeadless();
                    }}
                    onOpenBeatGemini={(beatId) => {
                        void state.handleOpenBeatGemini(beatId);
                    }}
                    onOpenBeatMetaAi={(beatId) => {
                        void state.handleOpenBeatMetaAi(beatId);
                    }}
                    onOpenBeatGeminiHeadless={(beatId) => {
                        void state.handleOpenBeatGeminiHeadless(beatId);
                    }}
                    onRenderWhiteboardBeat={state.agentWhiteboardConfig?.assets_mode
                        ? undefined
                        : (beatId) => {
                            void state.handleRenderWhiteboardBeat(beatId);
                        }}
                    onAddBeatVideoToCapcut={(beatId) => {
                        void state.handleAddBeatVideoToCapcut(beatId);
                    }}
                    whiteboardBeatRenders={state.whiteboardBeatRenders}
                    renderingWhiteboardBeatIds={state.renderingWhiteboardBeatIds}
                    whiteboardRenderProgress={state.whiteboardRenderProgress}
                    uploadingBeatVideoToCapcutIds={state.uploadingBeatVideoToCapcutIds}
                    onSaveBeatQa={(beatId, qaStatus, qaRefineNote) => (
                        state.handleSaveBeatQa(beatId, qaStatus, qaRefineNote)
                    )}
                    onQuickIterateBeat={(beatId, qaRefineNote) => (
                        state.handleQuickIterateBeatFromQa(
                            beatId,
                            String(qaRefineNote || state.beatHtml[beatId]?.qa_refine_note || '').trim(),
                        )
                    )}
                    beatVersions={state.beatVersions}
                    beatActiveVersionId={state.beatActiveVersionId}
                    onRestoreBeatVersion={(beatId, versionId) => (
                        state.handleRestoreBeatVersion(beatId, versionId)
                    )}
                    copyingBeatHtmlPromptBeatId={state.copyingBeatHtmlPromptBeatId}
                    pastingBeatHtmlBeatId={state.pastingBeatHtmlBeatId}
                    deletingBeatHtmlBeatId={state.deletingBeatHtmlBeatId}
                    deletingAllBeatHtml={state.deletingAllBeatHtml}
                    missingBeatHtmlCount={state.missingBeatHtmlCount}
                    missingBeatImageCount={state.missingBeatImageCount}
                    openingAllMissingBeatGemini={state.openingAllMissingBeatGemini}
                    openingAllMissingBeatMetaAi={state.openingAllMissingBeatMetaAi}
                    openingAllMissingBeatAiStudio={state.openingAllMissingBeatAiStudio}
                    fillingAllMissingBeatGeminiHeadless={state.fillingAllMissingBeatGeminiHeadless}
                    fillingAllMissingBeatGeminiHeadlessProgress={
                        state.fillingAllMissingBeatGeminiHeadlessProgress
                    }
                    geminiFillStatus={state.geminiFillStatus}
                    geminiFillProgress={state.geminiFillProgress}
                    whisperStatus={state.whisperStatus}
                    openingBeatGeminiBeatIds={state.openingBeatGeminiBeatIds}
                    openingBeatGeminiHeadlessBeatIds={state.openingBeatGeminiHeadlessBeatIds}
                    quickIterateBeatStages={state.quickIterateBeatStages}
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
                    showPipelineControls
                    fullAutoPipeline={state.fullAutoPipeline}
                    fullAutoStepToggles={state.fullAutoStepToggles}
                    savingFullAutoStepToggles={state.savingFullAutoStepToggles}
                    onFullAutoStepToggleChange={(toggleKey, checked) => {
                        void state.handleFullAutoStepToggleChange(toggleKey, checked);
                    }}
                    beatImageFillMode={state.beatImageFillMode}
                    savingBeatImageFillMode={state.savingBeatImageFillMode}
                    onBeatImageFillModeChange={(mode) => {
                        void state.handleBeatImageFillModeChange(mode);
                    }}
                    beatImageFillOnlyMissing={state.beatImageFillOnlyMissing}
                    onBeatImageFillOnlyMissingChange={(checked) => {
                        void state.handleBeatImageFillOnlyMissingChange(checked);
                    }}
                    agentVisualMode={state.agentVisualMode}
                    startingFullAuto={state.startingFullAuto}
                    cancellingFullAuto={state.cancellingFullAuto}
                    onStartPipelineFromStep={(stepKey) => {
                        void state.handleStartFullAutoPipeline('restart', stepKey);
                    }}
                    onRunSinglePipelineStep={(stepKey) => {
                        if (typeof state.handleRunSinglePipelineStep === 'function') {
                            void state.handleRunSinglePipelineStep(stepKey);
                            return;
                        }
                        void state.handleStartFullAutoPipeline(
                            'restart',
                            stepKey,
                            undefined,
                            { singleStep: true },
                        );
                    }}
                    onCancelPipeline={() => {
                        void state.handleCancelFullAutoPipeline();
                    }}
                    onTimeUpdate={setCurrentTimeSec}
                />
            </Box>
            <ShortVideoAgentBeatHtmlEditDrawer
                open={Boolean(editBeatHtmlId)}
                onClose={handleCloseEditBeatHtml}
                beatId={editBeatHtmlId}
                beatIndex={editBeatSegment?.beatIndex ?? null}
                durationSec={editBeatSection?.durationSec ?? null}
                initialVisualDescription={String(editBeatSection?.visual_description || '')}
                initialBackground={String(editBeatSection?.background || '')}
                initialHtml={String(state.beatHtml[editBeatHtmlId]?.html || '')}
                initialCreativePrompt={String(state.beatHtml[editBeatHtmlId]?.creative_prompt || '')}
                saving={state.savingImportHtml}
                refining={state.refiningBeatHtmlBeatId === editBeatHtmlId}
                onSave={handleSaveEditBeatHtml}
                onAiRefine={handleAiRefineEditBeatHtml}
            />
            <ShortVideoAgentBeatImageEditDrawer
                open={Boolean(editBeatImageId)}
                onClose={handleCloseEditBeatImage}
                beatId={editBeatImageId}
                beatIndex={editBeatSegment?.beatIndex ?? null}
                durationSec={editBeatSection?.durationSec ?? null}
                initialVisualDescription={String(editBeatSection?.visual_description || '')}
                initialBackground={String(editBeatSection?.background || '')}
                initialImagePrompt={beatImagePromptToText(state.beatImage[editBeatImageId]?.image_prompt || editBeatSection?.image_prompt || '')}
                initialImageUrl={String(state.beatImage[editBeatImageId]?.image_url || '')}
                initialCreativePrompt={String(state.beatImage[editBeatImageId]?.creative_prompt || '')}
                clipAspect={state.agentClipAspect}
                saving={state.savingImportHtml}
                regenerating={state.regeneratingBeatImageBeatId === editBeatImageId}
                onSave={handleSaveEditBeatImage}
                onRegenerateZImage={handleRegenerateEditBeatImage}
                onRegenerateMetaAi={handleRegenerateEditBeatImageMetaAi}
                onUploadImageFile={handleUploadBeatImageFile}
            />
            <ShortVideoAgentBeatInfoDrawer
                open={Boolean(infoBeatId && infoBeatSection)}
                onClose={handleCloseBeatInfo}
                beatMap={state.beatMapReady ? state.beatMap : null}
                beat={infoBeatSection}
                beatHtml={infoBeatId ? state.beatHtml[infoBeatId] || null : null}
                beatImage={infoBeatId ? state.beatImage[infoBeatId] || null : null}
                isWhiteboardMode={state.isWhiteboardMode}
                audioUrl={state.audioFileUrl || state.agentVideoUrl}
                beatIndex={infoBeatIndex}
                clipAspect={state.agentClipAspect}
                saving={state.savingImportHtml}
                onSaveVisualDescription={handleSaveBeatInfoVisualDescription}
            />
            <ShortVideoAgentHeadlessPreview
                open={open}
                shortVideoId={shortVideoId}
                pipeline={state.fullAutoPipeline}
                geminiFillProgress={state.geminiFillProgress}
                headlessBrowserActive={state.headlessBrowserActive}
                agentGeminiOpenBrowser={state.agentGeminiOpenBrowser}
                agentVisualMode={state.agentVisualMode}
                stepToggles={state.fullAutoStepToggles}
                stepToggleDisabled={state.savingFullAutoStepToggles}
                onStepToggleChange={(toggleKey, checked) => {
                    void state.handleFullAutoStepToggleChange(toggleKey, checked);
                }}
                whiteboardRenderProgress={state.whiteboardRenderProgress}
                geminiScriptStatus={state.geminiScriptStatus}
                geminiScriptPhoneticStatus={state.geminiScriptPhoneticStatus}
                geminiDivisionStatus={state.geminiDivisionStatus}
                geminiImageFillStatus={state.geminiImageFillStatus}
                geminiFillStatus={state.geminiFillStatus}
                geminiThumbnailFillStatus={state.geminiThumbnailFillStatus}
                geminiThumbnailIdeaStatus={state.geminiThumbnailIdeaStatus}
                ttsPending={state.ttsPending}
                selectedTtsPlatforms={state.selectedPlatforms}
                cancelling={state.cancellingFullAuto}
                requestingNewChat={state.requestingHeadlessNewChat}
                onStop={state.handleCancelFullAutoPipeline}
                onNewChat={state.handleHeadlessNewChat}
                requestingNewSection={state.requestingHeadlessNewSection}
                onNewSection={state.handleHeadlessNewSection}
            />
        </DrawerCustom>
    );
}
