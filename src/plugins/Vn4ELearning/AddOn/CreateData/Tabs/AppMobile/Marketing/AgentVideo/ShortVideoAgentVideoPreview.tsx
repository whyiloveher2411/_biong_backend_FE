import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    LinearProgress,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CropFreeIcon from '@mui/icons-material/CropFree';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShortVideoAgentBeatRegionDrawer from './ShortVideoAgentBeatRegionDrawer';
import { getBeatTimelineSegments } from './agentVideoBeatMap';
import { resolvePreviewPlaceholder } from './agentVideoUi';
import {
    canShowHtmlBeatPreview,
    canShowPreviewSourceTabs,
    resolveActivePreviewSource,
    resolvePreviewSourceTitle,
    type AgentPreviewSource,
} from './agentVideoPreviewSource';
import {
    whiteboardRenderPhaseSubtitle,
    whiteboardRenderProgressLabel,
} from './agentVideoWhiteboardRenderProgress';
import ShortVideoAgentCustomHtmlPreview from './ShortVideoAgentCustomHtmlPreview';
import ShortVideoAgentAvatarPipOverlay from './ShortVideoAgentAvatarPipOverlay';
import ShortVideoAgentBeatQaPanel from './ShortVideoAgentBeatQaPanel';
import ShortVideoAgentImageAnimationControls from './ShortVideoAgentImageAnimationControls';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    videoRef: React.Ref<HTMLVideoElement>;
    previewSource: AgentPreviewSource;
    onPreviewSourceChange: (source: AgentPreviewSource) => void;
    currentBeatId?: string;
};

function buildPreviewSourceInput(state: AgentVideoState) {
    return {
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
    };
}

function HtmlBeatMissingPlaceholder({ isWhiteboardMode = false }: { isWhiteboardMode?: boolean }) {
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
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
                {isWhiteboardMode ? 'Chưa có ảnh beat' : 'Chưa có HTML beat'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
                {isWhiteboardMode
                    ? 'Chọn tab Ảnh beat sau khi đã chia beat-map. Sinh/upload ảnh từ timeline hoặc chạy pipeline.'
                    : 'Dùng timeline hoặc tab Render bên trái để sinh HTML từng beat.'}
            </Typography>
        </Box>
    );
}

function PortraitPreviewFrame({
    children,
    maxWidth = 360,
}: {
    children: React.ReactNode;
    maxWidth?: number;
}) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [frameSize, setFrameSize] = React.useState({ width: maxWidth, height: maxWidth * (16 / 9) });

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const updateSize = () => {
            const parentWidth = container.clientWidth;
            const parentHeight = container.clientHeight;
            const widthFromHeight = parentHeight * (9 / 16);
            const width = Math.min(maxWidth, parentWidth, widthFromHeight);
            setFrameSize({
                width: Math.max(0, width),
                height: Math.max(0, width * (16 / 9)),
            });
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        return () => {
            observer.disconnect();
        };
    }, [maxWidth]);

    return (
        <Box
            ref={containerRef}
            sx={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box
                sx={{
                    width: frameSize.width,
                    height: frameSize.height,
                    flexShrink: 0,
                }}
            >
                {children}
            </Box>
        </Box>
    );
}

export default function ShortVideoAgentVideoPreview({
    state,
    videoRef,
    previewSource,
    onPreviewSourceChange,
    currentBeatId = '',
}: Props) {
    const previewInput = React.useMemo(() => buildPreviewSourceInput(state), [state]);
    const activeSource = resolveActivePreviewSource(previewSource, previewInput);
    const showTabs = canShowPreviewSourceTabs(previewInput);
    const showHtmlBeat = activeSource === 'html_beat' && canShowHtmlBeatPreview(previewInput);
    const isWhiteboardMode = state.isWhiteboardMode;
    const beatPreviewTabLabel = isWhiteboardMode ? 'Ảnh beat' : 'HTML beat';
    const whiteboardRenderProgress = state.whiteboardRenderProgress;
    const showWhiteboardRenderProgress = Boolean(
        isWhiteboardMode
        && whiteboardRenderProgress?.active,
    );
    const whiteboardProgressTitle = showWhiteboardRenderProgress
        ? whiteboardRenderProgressLabel(whiteboardRenderProgress)
        : '';
    const whiteboardProgressSubtitle = showWhiteboardRenderProgress
        ? whiteboardRenderPhaseSubtitle(whiteboardRenderProgress)
        : '';

    const placeholder = resolvePreviewPlaceholder({
        agentVideoUrl: showHtmlBeat ? '' : (state.localFinalMp4OpenUrl || state.agentVideoUrl),
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

    const showAvatarPip = Boolean(state.agentAvatarId > 0);
    const avatarMasterUrl = React.useMemo(() => {
        const fromState = String(state.agentAvatarMasterUrl || '').trim();
        if (fromState) {
            return fromState;
        }
        const id = Number(state.agentAvatarId || 0);
        if (!(id > 0)) {
            return '';
        }
        const found = state.verifiedAvatars.find((item) => item.id === id);
        return String(found?.master_url || '').trim();
    }, [state.agentAvatarMasterUrl, state.agentAvatarId, state.verifiedAvatars]);
    const avatarAnchor = state.agentAvatarAnchor || 'bottom_right';
    const showKaraoke = state.agentShowKaraoke !== false;

    // Tab Ảnh beat (whiteboard): ảnh + điều khiển chuyển động hiển thị NGAY trong box
    // bên dưới — KHÔNG còn box preview ảnh lớn phía trên (ảnh chỉ là hình, xem ở dưới rõ hơn).
    const showImageAnimationControls = activeSource === 'html_beat'
        && isWhiteboardMode
        && Boolean(currentBeatId)
        && Boolean(state.beatImage[currentBeatId || '']?.image_url);

    // URL ảnh beat hiện tại — button mở tab mới để check ảnh gốc.
    const currentBeatImageUrl = String(
        state.beatImage[currentBeatId || '']?.image_url || '',
    ).trim();

    const activeBeatIndex = React.useMemo(() => {
        if (!currentBeatId || !state.beatMap?.sections?.length) {
            return null;
        }
        const index = state.beatMap.sections.findIndex((section) => section.id === currentBeatId);
        return index >= 0 ? index + 1 : null;
    }, [currentBeatId, state.beatMap?.sections]);

    const currentBeatSection = React.useMemo(() => {
        if (!currentBeatId || !state.beatMap?.sections?.length) {
            return null;
        }
        return state.beatMap.sections.find((section) => section.id === currentBeatId) || null;
    }, [currentBeatId, state.beatMap?.sections]);

    const currentBeatVersions = React.useMemo(() => {
        if (!currentBeatId) {
            return [];
        }
        return state.beatVersions?.[currentBeatId] || [];
    }, [currentBeatId, state.beatVersions]);

    const showBeatQaPanel = Boolean(state.beatMapReady && state.beatMap?.sections?.length);

    const handleSaveCurrentBeatQa = React.useCallback(async (
        qaStatus: import('./agentVideoBeatMap').BeatQaStatus,
        qaRefineNote: string,
    ) => {
        if (!currentBeatId) {
            return false;
        }
        return state.handleSaveBeatQa(currentBeatId, qaStatus, qaRefineNote);
    }, [currentBeatId, state.handleSaveBeatQa]);

    // Prev/Next beat: seek timeline đến GIỮA beat trước/tiếp theo — giúp edit nhanh.
    const beatSegments = React.useMemo(
        () => getBeatTimelineSegments(state.beatMapReady ? state.beatMap : null),
        [state.beatMapReady, state.beatMap],
    );
    const activeSegmentIndex = React.useMemo(() => {
        if (!currentBeatId) {
            return -1;
        }
        return beatSegments.findIndex((segment) => segment.beatId === currentBeatId);
    }, [currentBeatId, beatSegments]);
    const handleSeekAdjacentBeat = React.useCallback((delta: -1 | 1) => {
        if (activeSegmentIndex < 0) {
            return;
        }
        const target = beatSegments[activeSegmentIndex + delta];
        if (!target) {
            return;
        }
        const midSec = (target.startSec + target.endSec) / 2;
        // Timeline lắng nghe beatPlaybackSeekRequest → tự seek video + cập nhật
        // con trỏ + beat hiện tại (không phụ thuộc video element đã mount).
        if (typeof state.handleSeekBeatPlayback === 'function') {
            state.handleSeekBeatPlayback(target.beatId, midSec);
        }
    }, [activeSegmentIndex, beatSegments, state.handleSeekBeatPlayback]);

    const handleQuickIterateCurrentBeat = React.useCallback(async (qaRefineNote: string) => {
        if (!currentBeatId) {
            return false;
        }
        return state.handleQuickIterateBeatFromQa(currentBeatId, qaRefineNote);
    }, [currentBeatId, state.handleQuickIterateBeatFromQa]);

    const handleEditHtmlCurrentBeat = React.useCallback(async (qaRefineNote: string) => {
        if (!currentBeatId) {
            return false;
        }
        return state.handleEditHtmlBeatFromQa(currentBeatId, qaRefineNote);
    }, [currentBeatId, state.handleEditHtmlBeatFromQa]);

    const currentBeatQuickIterating = Boolean(
        currentBeatId
        && (
            state.quickIterateActiveBeatId === currentBeatId
            || Boolean(state.quickIterateBeatStages?.[currentBeatId])
        ),
    );

    const currentBeatIterateStage = React.useMemo((): 'idle' | 'queued' | 'visual' | 'html' => {
        if (!currentBeatId) {
            return 'idle';
        }
        return state.quickIterateBeatStages?.[currentBeatId] || 'idle';
    }, [currentBeatId, state.quickIterateBeatStages]);

    const currentBeatIterateKind = React.useMemo((): 'quick_iterate' | 'edit_html' | null => {
        if (!currentBeatId || !Array.isArray(state.quickIterateQueue)) {
            return null;
        }
        const item = state.quickIterateQueue.find(
            (entry: { beatId?: string; kind?: string }) => entry.beatId === currentBeatId,
        );
        if (item?.kind === 'edit_html' || item?.kind === 'quick_iterate') {
            return item.kind;
        }
        return null;
    }, [currentBeatId, state.quickIterateQueue]);

    const handleSaveCurrentBeatVersion = React.useCallback(async (draft: {
        qaStatus: import('./agentVideoBeatMap').BeatQaStatus;
        qaRefineNote: string;
    }) => {
        if (!currentBeatId) {
            return null;
        }
        return state.handleSaveBeatVersion(currentBeatId, draft);
    }, [currentBeatId, state.handleSaveBeatVersion]);

    const handleRestoreCurrentBeatVersion = React.useCallback(async (
        versionId: string,
        _label: string,
    ) => {
        if (!currentBeatId) {
            return null;
        }
        return state.handleRestoreBeatVersion(currentBeatId, versionId);
    }, [currentBeatId, state.handleRestoreBeatVersion]);

    const [regionDrawerOpen, setRegionDrawerOpen] = React.useState(false);

    return (
        <Box
            sx={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                bgcolor: (theme) =>
                    theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50',
            }}
        >
            <Box sx={{ px: 3, pt: 3, flexShrink: 0 }}>
                {showTabs ? (
                    <Tabs
                        value={activeSource}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{ mb: 2, minHeight: 40 }}
                    >
                        <Tab label="Video final" value="final" />
                        <Tab label={beatPreviewTabLabel} value="html_beat" />
                    </Tabs>
                ) : (
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                        {resolvePreviewSourceTitle(activeSource, state.agentVisualMode)}
                    </Typography>
                )}
            </Box>

            {showWhiteboardRenderProgress ? (
                <Box sx={{ px: 3, pb: 1.5 }}>
                    <Box
                        sx={{
                            borderRadius: 1.5,
                            border: '1px solid',
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                            px: 1.5,
                            py: 1,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                mb: 0.75,
                            }}
                        >
                            <Typography variant="caption" fontWeight={700} color="text.primary">
                                {whiteboardProgressTitle}
                            </Typography>
                            {whiteboardRenderProgress.failed.length > 0 ? (
                                <Chip
                                    size="small"
                                    color="error"
                                    label={`${whiteboardRenderProgress.failed.length} lỗi`}
                                    sx={{ height: 22, '& .MuiChip-label': { px: 0.75, fontSize: 11 } }}
                                />
                            ) : null}
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.max(0, Math.min(100, whiteboardRenderProgress.percent))}
                            sx={{ height: 6, borderRadius: 1, mb: 0.5 }}
                        />
                        {whiteboardProgressSubtitle ? (
                            <Typography variant="caption" color="text.secondary" display="block">
                                {whiteboardProgressSubtitle}
                            </Typography>
                        ) : null}
                    </Box>
                </Box>
            ) : null}

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'row',
                    px: 3,
                    pb: 3,
                    gap: 2,
                    overflow: 'hidden',
                }}
            >
                {/* Cột trái: clip preview */}
                <Box
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        overflow: 'hidden',
                    }}
                >
                    {showImageAnimationControls ? (
                        <Box
                            sx={{
                                flex: 1,
                                minHeight: 0,
                                overflow: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            }}
                        >
                            <ShortVideoAgentImageAnimationControls
                                beatId={currentBeatId || ''}
                                imageUrl={state.beatImage[currentBeatId || '']?.image_url || ''}
                                clipAspect={state.agentClipAspect}
                                clipConfig={state.agentWhiteboardConfig || null}
                                clipSaving={state.savingWhiteboardConfig}
                                onClipConfigChange={(patch) => {
                                    state.handleAgentWhiteboardConfigChange(patch);
                                }}
                                savedOverride={state.agentWhiteboardBeatOverrides?.[currentBeatId || ''] || null}
                                saving={state.savingWhiteboardBeatOverride}
                                onSave={(override) => state.handleSaveWhiteboardBeatOverride(
                                    currentBeatId || '',
                                    override,
                                )}
                            />
                        </Box>
                    ) : (
                        <PortraitPreviewFrame>
                            {activeSource === 'final' && (state.localFinalMp4OpenUrl || state.agentVideoUrl) ? (
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        bgcolor: 'common.black',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        boxShadow: 3,
                                    }}
                                >
                                    <video
                                        ref={videoRef}
                                        controls
                                        key={state.localFinalMp4OpenUrl || state.agentVideoUrl}
                                        src={state.localFinalMp4OpenUrl || state.agentVideoUrl}
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
                                    beatImage={state.beatImage}
                                    isWhiteboardMode={isWhiteboardMode}
                                    audioUrl={state.audioFileUrl}
                                    audioDurationSec={state.audioDurationSec}
                                    videoRef={videoRef}
                                    showAvatarPip={showAvatarPip}
                                    avatarMasterUrl={avatarMasterUrl}
                                    avatarAnchor={avatarAnchor}
                                    showKaraoke={showKaraoke}
                                    clipAspect={state.agentClipAspect}
                                />
                            ) : activeSource === 'html_beat' ? (
                                <HtmlBeatMissingPlaceholder isWhiteboardMode={isWhiteboardMode} />
                            ) : placeholder ? (
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: '100%',
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
                                        position: 'relative',
                                        overflow: 'hidden',
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
                                    <ShortVideoAgentAvatarPipOverlay
                                        show={showAvatarPip && Boolean(avatarMasterUrl)}
                                        masterUrl={avatarMasterUrl}
                                        anchor={avatarAnchor}
                                        showKaraoke={showKaraoke}
                                    />
                                </Box>
                            ) : null}
                        </PortraitPreviewFrame>
                    )}

                    {activeSource === 'final' && (state.localFinalMp4OpenUrl || state.agentVideoUrl) && state.agentVideoRenderedAt ? (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                            {state.localFinalMp4OpenUrl ? 'Local final' : 'CDN'}
                            {' · '}
                            Render lúc: {state.localFinalMp4ModifiedAt || state.agentVideoRenderedAt}
                        </Typography>
                    ) : null}

                    {currentBeatImageUrl ? (
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                startIcon={<OpenInNewIcon />}
                                component="a"
                                href={currentBeatImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ textTransform: 'none' }}
                            >
                                Mở ảnh beat
                            </Button>
                            {isWhiteboardMode && currentBeatId ? (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                    startIcon={<CropFreeIcon />}
                                    onClick={() => setRegionDrawerOpen(true)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Chọn vùng ảnh
                                </Button>
                            ) : null}
                        </Box>
                    ) : null}

                    {beatSegments.length > 1 && activeSegmentIndex >= 0 ? (
                        <Box
                            sx={{
                                mt: 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 1,
                                px: 2,
                                width: '100%',
                            }}
                        >
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ChevronLeftIcon />}
                                disabled={activeSegmentIndex <= 0}
                                onClick={() => handleSeekAdjacentBeat(-1)}
                                sx={{ textTransform: 'none' }}
                            >
                                Beat trước
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                endIcon={<ChevronRightIcon />}
                                disabled={activeSegmentIndex >= beatSegments.length - 1}
                                onClick={() => handleSeekAdjacentBeat(1)}
                                sx={{ textTransform: 'none' }}
                            >
                                Beat sau
                            </Button>
                        </Box>
                    ) : null}

                    {placeholder?.severity === 'error' && state.lastError && activeSource !== 'html_beat' ? (
                        <Alert severity="error" sx={{ mt: 1, maxWidth: 480, mx: 'auto', width: '100%' }}>
                            {state.lastError}
                        </Alert>
                    ) : null}
                </Box>

                {/* Cột phải: QA / Version — nền đen để tách khỏi preview */}
                {showBeatQaPanel ? (
                    <Box
                        sx={{
                            width: 340,
                            flexShrink: 0,
                            minHeight: 0,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            bgcolor: '#0b0b0c',
                            borderRadius: 2,
                            overflow: 'hidden',
                        }}
                    >
                        {currentBeatId ? (
                            <ShortVideoAgentBeatQaPanel
                                beatId={currentBeatId}
                                beatIndex={activeBeatIndex}
                                beatHtml={state.beatHtml[currentBeatId] || null}
                                beatImage={state.beatImage[currentBeatId] || null}
                                isWhiteboardMode={isWhiteboardMode}
                                versions={currentBeatVersions}
                                activeVersionId={String(state.beatActiveVersionId?.[currentBeatId] || '')}
                                visualDescription={String(currentBeatSection?.visual_description || '')}
                                background={String(currentBeatSection?.background || '')}
                                phraseAnchor={String(currentBeatSection?.phrase_anchor || '')}
                                saving={state.savingImportHtml}
                                quickIterating={currentBeatQuickIterating}
                                iterateStage={currentBeatIterateStage}
                                iterateKind={currentBeatIterateKind}
                                whiteboardBeatRender={state.whiteboardBeatRenders?.[currentBeatId] || null}
                                uploadingBeatVideoToCapcut={
                                    (state.uploadingBeatVideoToCapcutIds || []).includes(currentBeatId)
                                }
                                beatDurationSec={Number(currentBeatSection?.durationSec ?? 8) || 8}
                                isLastBeat={
                                    activeBeatIndex != null
                                    && Boolean(state.beatMap?.sections?.length)
                                    && activeBeatIndex >= (state.beatMap?.sections?.length || 0) - 1
                                }
                                agentWhiteboardConfig={state.agentWhiteboardConfig || {}}
                                whiteboardBeatOverride={
                                    state.agentWhiteboardBeatOverrides?.[currentBeatId] || null
                                }
                                savingWhiteboardBeatOverride={state.savingWhiteboardBeatOverride}
                                onSaveBeatQa={handleSaveCurrentBeatQa}
                                onQuickIterateBeat={handleQuickIterateCurrentBeat}
                                onEditHtmlBeat={handleEditHtmlCurrentBeat}
                                onSaveBeatVersion={handleSaveCurrentBeatVersion}
                                onRestoreBeatVersion={handleRestoreCurrentBeatVersion}
                                onRenderWhiteboardBeat={
                                    isWhiteboardMode && !state.agentWhiteboardConfig?.assets_mode
                                        ? () => { void state.handleRenderWhiteboardBeat(currentBeatId); }
                                        : undefined
                                }
                                renderingBeatVideo={state.renderingWhiteboardBeatIds.includes(currentBeatId)}
                                onAddBeatVideoToCapcut={
                                    isWhiteboardMode
                                        ? () => { void state.handleAddBeatVideoToCapcut(currentBeatId); }
                                        : undefined
                                }
                                onSaveWhiteboardBeatOverride={
                                    isWhiteboardMode
                                        ? (override) => state.handleSaveWhiteboardBeatOverride(
                                            currentBeatId,
                                            override,
                                        )
                                        : undefined
                                }
                            />
                        ) : (
                            <Typography
                                variant="body2"
                                sx={{
                                    textAlign: 'center',
                                    mt: 6,
                                    px: 2,
                                    color: 'rgba(255,255,255,0.45)',
                                }}
                            >
                                Di chuyển con trỏ trên timeline để chọn beat
                            </Typography>
                        )}
                    </Box>
                ) : null}
            </Box>
            {currentBeatId && currentBeatImageUrl ? (
                <ShortVideoAgentBeatRegionDrawer
                    open={regionDrawerOpen}
                    onClose={() => setRegionDrawerOpen(false)}
                    state={state}
                    beatId={currentBeatId}
                    imageUrl={currentBeatImageUrl}
                />
            ) : null}
        </Box>
    );
}
