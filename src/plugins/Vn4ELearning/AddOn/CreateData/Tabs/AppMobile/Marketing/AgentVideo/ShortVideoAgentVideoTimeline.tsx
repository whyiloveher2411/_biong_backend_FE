import React from 'react';
import { Timeline, type TimelineState } from '@xzdarcy/react-timeline-editor';
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { Box, Button, Chip, CircularProgress, IconButton, LinearProgress, Menu, Tooltip, Typography } from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    TIMELINE_EDIT_AREA_TOP_GAP,
    TIMELINE_RULER_HEIGHT,
    timelineEditorWorkspaceEndSec,
} from 'helpers/shortVideoTimelineAdapter';
import {
    AGENT_VIDEO_TIMELINE_EFFECTS,
    AGENT_VIDEO_TRACK_ROW_HEIGHT,
    buildAgentVideoTimelineRows,
    resolveAgentVideoDurationSec,
    timeSecToTimelineLeftPx,
} from './agentVideoTimelineModel';
import AgentVideoBeatBoundaryOverlay from './AgentVideoBeatBoundaryOverlay';
import {
    PipelineGroupedMenuItems,
    resolveRestartableSet,
} from './FullAutoPipelineGroupedSteps';
import ShortVideoAgentBeatDivisionManualDrawer from './ShortVideoAgentBeatDivisionManualDrawer';
import ShortVideoAgentScriptManualDrawer from './ShortVideoAgentScriptManualDrawer';
import ShortVideoAgentScriptPhoneticManualDrawer from './ShortVideoAgentScriptPhoneticManualDrawer';
import ShortVideoAgentBgmManualDrawer from './ShortVideoAgentBgmManualDrawer';
import type { useAgentVideoContent } from './useAgentVideoContent';
import type {
    BeatImageFillMode,
    FullAutoPipelineStepKey,
    FullAutoPipelineSummary,
    FullAutoStepToggleKey,
    FullAutoStepToggles,
} from './agentVideoApi';
import { saveAgentTimelinePosition } from './agentVideoApi';
import {
    whiteboardRenderProgressLabel,
    type WhiteboardRenderProgress,
} from './agentVideoWhiteboardRenderProgress';
import TimelineZoomControls, {
    SHORT_VIDEO_AGENT_TIMELINE_COLLAPSED_STORAGE_KEY,
    SHORT_VIDEO_AGENT_TIMELINE_ZOOM_STORAGE_KEY,
    usePersistedTimelineScaleWidth,
    usePersistedTimelineTracksCollapsed,
} from '../TimelineZoomControls';
import {
    countBeatIdsWithHtml,
    countBeatQaByStatus,
    type BeatHtmlEntry,
    type BeatImageEntry,
    type BeatMap,
    type BeatQaStatus,
    type BeatVersion,
} from './agentVideoBeatMap';

const TRACK_LABELS_WIDTH = 100;
const TIMELINE_SCALE = 1;
const TIMELINE_SCALE_SPLIT_COUNT = 5;
const TIMELINE_START_LEFT = 20;
const CURSOR_HEAD_OVERFLOW = 10;
const HORIZONTAL_SCROLLBAR_HEIGHT = 12;

async function fallbackManualBeatDivisionSave(): Promise<boolean> {
    return false;
}

async function fallbackManualBeatDivisionSaveWithOptions(
    _map: BeatMap,
    _options?: { limitBeats?: number },
): Promise<boolean> {
    return fallbackManualBeatDivisionSave();
}

async function fallbackManualScriptSave(): Promise<boolean> {
    return false;
}

async function fallbackManualScriptPhoneticSave(): Promise<boolean> {
    return false;
}

function getTimelineScrollGrids(host: HTMLElement): HTMLElement[] {
    return Array.from(host.querySelectorAll<HTMLElement>('.timeline-editor-edit-area .ReactVirtualized__Grid'));
}

function getTimelineHorizontalScrollLeft(host: HTMLElement): number {
    const grids = getTimelineScrollGrids(host);
    if (grids.length === 0) {
        return 0;
    }
    return grids[0].scrollLeft;
}

function scrollTimelineGrids(host: HTMLElement, deltaPx: number): boolean {
    const grids = getTimelineScrollGrids(host);
    if (grids.length === 0) {
        return false;
    }
    const canScroll = grids.some((grid) => grid.scrollWidth > grid.clientWidth);
    if (!canScroll) {
        return false;
    }
    grids.forEach((grid) => {
        grid.scrollLeft += deltaPx;
    });
    return true;
}

function resolveTimelineWheelDelta(event: WheelEvent): number {
    const { deltaX, deltaY } = event;
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return deltaY;
    }
    if (deltaX !== 0) {
        return deltaX;
    }
    return 0;
}

function formatPlaybackClock(totalSec: number): string {
    const clamped = Math.max(0, totalSec);
    const minutes = Math.floor(clamped / 60);
    const remainder = clamped % 60;
    const wholeSec = Math.floor(remainder);
    const tenths = Math.floor((remainder - wholeSec) * 10);
    return `${minutes}:${String(wholeSec).padStart(2, '0')}.${tenths}`;
}

function truncateLabel(label: string, maxLen = 48): string {
    const text = String(label || '').trim();
    if (text.length <= maxLen) {
        return text;
    }
    return `${text.slice(0, maxLen - 1)}…`;
}

type AgentVideoSimpleClipProps = {
    clipLabel: string;
};

function AgentVideoSimpleClip({ clipLabel }: AgentVideoSimpleClipProps) {
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 0.75,
                border: '1px solid rgba(147, 197, 253, 0.45)',
                bgcolor: 'rgba(30, 58, 138, 0.72)',
                display: 'flex',
                alignItems: 'center',
                px: 1,
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    color: '#eff6ff',
                    fontSize: 11,
                    lineHeight: 1.2,
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                }}
            >
                {truncateLabel(clipLabel)}
            </Typography>
        </Box>
    );
}

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    videoUrl: string;
    videoRef: React.RefObject<HTMLVideoElement>;
    clipLabel?: string;
    /** State đầy đủ của AgentVideo — dùng cho drawer audio background thủ công. */
    agentState?: AgentVideoState;
    audioDurationSec?: number | null;
    estimatedDurationSec?: number | null;
    shortVideoId?: number;
    agentSourceFormat?: string;
    onSaveBeatMapManual?: (map: BeatMap, options?: { limitBeats?: number }) => Promise<boolean>;
    /** Audio script hiện tại — prefill drawer tạo script thủ công. */
    audioScript?: string;
    /** Lưu script thủ công → mark script_create done. */
    onSaveScriptManual?: (text: string) => Promise<boolean>;
    /** Bản đọc TTS hiện tại — prefill drawer chuẩn hóa giọng đọc thủ công. */
    audioScriptTtsReading?: string;
    /** Lưu bản đọc TTS thủ công → mark script_phonetic_normalize done. */
    onSaveScriptPhonetic?: (text: string) => Promise<boolean>;
    customHtmlPreview?: boolean;
    previewSourceKey?: string;
    beatMap?: BeatMap | null;
    beatHtml?: Record<string, BeatHtmlEntry>;
    beatImage?: Record<string, BeatImageEntry>;
    isWhiteboardMode?: boolean;
    activeBeatId?: string;
    onBeatClick?: (beatId: string) => void;
    onCopyBeatPrompt?: (beatId: string) => void;
    onPasteBeatHtml?: (beatId: string) => void;
    onEditBeatHtml?: (beatId: string) => void;
    onOpenBeatInfo?: (beatId: string) => void;
    onDeleteBeatHtml?: (beatId: string) => void;
    onDeleteAllBeatHtml?: () => void;
    onOpenAllMissingBeatGemini?: () => void;
    onOpenAllMissingBeatMetaAi?: () => void;
    onOpenAllMissingBeatAiStudio?: () => void;
    onFillAllMissingBeatGeminiHeadless?: () => void;
    onOpenBeatGemini?: (beatId: string) => void;
    onOpenBeatMetaAi?: (beatId: string) => void;
    onOpenBeatGeminiHeadless?: (beatId: string) => void;
    onRenderWhiteboardBeat?: (beatId: string) => void;
    onAddBeatVideoToCapcut?: (beatId: string) => void;
    whiteboardBeatRenders?: Record<string, { status?: string; error?: string }>;
    renderingWhiteboardBeatIds?: string[];
    whiteboardRenderProgress?: WhiteboardRenderProgress | null;
    uploadingBeatVideoToCapcutIds?: string[];
    onSaveBeatQa?: (beatId: string, qaStatus: BeatQaStatus, qaRefineNote?: string) => Promise<boolean>;
    onQuickIterateBeat?: (beatId: string, qaRefineNote?: string) => Promise<boolean>;
    beatVersions?: Record<string, BeatVersion[]>;
    beatActiveVersionId?: Record<string, string>;
    onRestoreBeatVersion?: (beatId: string, versionId: string, label: string) => Promise<string | null>;
    onTimeUpdate?: (timeSec: number) => void;
    copyingBeatHtmlPromptBeatId?: string;
    pastingBeatHtmlBeatId?: string;
    deletingBeatHtmlBeatId?: string;
    deletingAllBeatHtml?: boolean;
    missingBeatHtmlCount?: number;
    missingBeatImageCount?: number;
    openingAllMissingBeatGemini?: boolean;
    openingAllMissingBeatMetaAi?: boolean;
    openingAllMissingBeatAiStudio?: boolean;
    fillingAllMissingBeatGeminiHeadless?: boolean;
    fillingAllMissingBeatGeminiHeadlessProgress?: {
        current: number;
        total: number;
        beatId: string;
    } | null;
    geminiFillStatus?: string;
    geminiFillProgress?: {
        current: number;
        total: number;
        beatId: string;
        succeeded?: number;
        failed?: string[];
        error?: string;
    } | null;
    whisperStatus?: string;
    openingBeatGeminiBeatIds?: string[];
    openingBeatGeminiHeadlessBeatIds?: string[];
    quickIterateBeatStages?: Record<string, 'queued' | 'visual' | 'html'>;
    savingImportHtml?: boolean;
    beatPlaybackSeekRequest?: { beatId: string; startSec: number; nonce: number } | null;
    /** Vị trí timeline (giây) cần restore 1 lần sau khi video sẵn sàng. */
    restoreTimelineSec?: number | null;
    onRestoreTimelineApplied?: () => void;
    agentVideoStatus?: string;
    showImportAssemble?: boolean;
    hasAgentVideo?: boolean;
    launchingImportAssemble?: boolean;
    onLaunchImportAssemble?: () => void;
    showPipelineControls?: boolean;
    fullAutoPipeline?: FullAutoPipelineSummary | null;
    fullAutoStepToggles?: FullAutoStepToggles;
    savingFullAutoStepToggles?: boolean;
    onFullAutoStepToggleChange: (toggleKey: FullAutoStepToggleKey, checked: boolean) => void;
    beatImageFillMode?: BeatImageFillMode;
    savingBeatImageFillMode?: boolean;
    onBeatImageFillModeChange?: (mode: BeatImageFillMode) => void;
    beatImageFillOnlyMissing?: boolean;
    onBeatImageFillOnlyMissingChange?: (checked: boolean) => void;
    agentVisualMode?: string;
    startingFullAuto?: boolean;
    cancellingFullAuto?: boolean;
    onStartPipelineFromStep?: (stepKey: FullAutoPipelineStepKey) => void;
    onRunSinglePipelineStep?: (stepKey: FullAutoPipelineStepKey) => void;
    onCancelPipeline?: () => void;
};

export default function ShortVideoAgentVideoTimeline({
    videoUrl,
    videoRef,
    clipLabel = 'HyperFrames',
    agentState,
    audioDurationSec,
    estimatedDurationSec,
    shortVideoId = 0,
    agentSourceFormat = '',
    onSaveBeatMapManual,
    audioScript = '',
    onSaveScriptManual,
    audioScriptTtsReading = '',
    onSaveScriptPhonetic,
    customHtmlPreview = false,
    previewSourceKey = '',
    beatMap = null,
    beatHtml = {},
    beatImage = {},
    isWhiteboardMode = false,
    activeBeatId = '',
    onBeatClick,
    onCopyBeatPrompt,
    onPasteBeatHtml,
    onEditBeatHtml,
    onOpenBeatInfo,
    onDeleteBeatHtml,
    onDeleteAllBeatHtml,
    onOpenAllMissingBeatGemini,
    onOpenAllMissingBeatMetaAi,
    onOpenAllMissingBeatAiStudio,
    onFillAllMissingBeatGeminiHeadless,
    onOpenBeatGemini,
    onOpenBeatMetaAi,
    onOpenBeatGeminiHeadless,
    onRenderWhiteboardBeat,
    onAddBeatVideoToCapcut,
    whiteboardBeatRenders = {},
    renderingWhiteboardBeatIds = [],
    whiteboardRenderProgress = null,
    uploadingBeatVideoToCapcutIds = [],
    onSaveBeatQa,
    onQuickIterateBeat,
    beatVersions = {},
    beatActiveVersionId = {},
    onRestoreBeatVersion,
    onTimeUpdate,
    copyingBeatHtmlPromptBeatId = '',
    pastingBeatHtmlBeatId = '',
    deletingBeatHtmlBeatId = '',
    deletingAllBeatHtml = false,
    missingBeatHtmlCount = 0,
    missingBeatImageCount = 0,
    openingAllMissingBeatGemini = false,
    openingAllMissingBeatMetaAi = false,
    openingAllMissingBeatAiStudio = false,
    fillingAllMissingBeatGeminiHeadless = false,
    fillingAllMissingBeatGeminiHeadlessProgress = null,
    geminiFillStatus = 'none',
    geminiFillProgress = null,
    whisperStatus = 'none',
    openingBeatGeminiBeatIds = [],
    openingBeatGeminiHeadlessBeatIds = [],
    quickIterateBeatStages = {},
    savingImportHtml = false,
    beatPlaybackSeekRequest = null,
    restoreTimelineSec = null,
    onRestoreTimelineApplied,
    agentVideoStatus = 'none',
    showImportAssemble = false,
    hasAgentVideo = false,
    launchingImportAssemble = false,
    onLaunchImportAssemble,
    showPipelineControls = false,
    fullAutoPipeline = null,
    fullAutoStepToggles,
    savingFullAutoStepToggles = false,
    onFullAutoStepToggleChange,
    beatImageFillMode = 'auto',
    savingBeatImageFillMode = false,
    onBeatImageFillModeChange,
    beatImageFillOnlyMissing = true,
    onBeatImageFillOnlyMissingChange,
    agentVisualMode = '',
    startingFullAuto = false,
    cancellingFullAuto = false,
    onStartPipelineFromStep,
    onRunSinglePipelineStep,
    onCancelPipeline,
}: Props) {
    const timelineRef = React.useRef<TimelineState>(null);
    const timelineHostRef = React.useRef<HTMLDivElement>(null);
    const syncingFromVideoRef = React.useRef(false);
    const isScrubbingRef = React.useRef(false);
    const [mediaDurationSec, setMediaDurationSec] = React.useState<number | null>(null);
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [tracksCollapsed, setTracksCollapsed] = usePersistedTimelineTracksCollapsed(
        SHORT_VIDEO_AGENT_TIMELINE_COLLAPSED_STORAGE_KEY,
    );
    const [timelineScrollLeft, setTimelineScrollLeft] = React.useState(0);
    const [restartMenuAnchor, setRestartMenuAnchor] = React.useState<null | HTMLElement>(null);
    const [beatDivisionManualOpen, setBeatDivisionManualOpen] = React.useState(false);

    const [scriptManualOpen, setScriptManualOpen] = React.useState(false);
    const [scriptPhoneticManualOpen, setScriptPhoneticManualOpen] = React.useState(false);
    const [bgmManualOpen, setBgmManualOpen] = React.useState(false);
    const [timelineScaleWidth, setTimelineScaleWidth] = usePersistedTimelineScaleWidth(
        SHORT_VIDEO_AGENT_TIMELINE_ZOOM_STORAGE_KEY,
    );
    const isPlayingRef = React.useRef(false);
    const onTimeUpdateRef = React.useRef(onTimeUpdate);
    onTimeUpdateRef.current = onTimeUpdate;
    const persistTimelineTimerRef = React.useRef<number | null>(null);
    const lastPersistedTimelineSecRef = React.useRef<number | null>(null);
    const restoreAppliedRef = React.useRef(false);
    const onRestoreTimelineAppliedRef = React.useRef(onRestoreTimelineApplied);
    onRestoreTimelineAppliedRef.current = onRestoreTimelineApplied;

    React.useEffect(() => {
        onTimeUpdateRef.current?.(currentTimeSec);
    }, [currentTimeSec]);

    React.useEffect(() => {
        restoreAppliedRef.current = false;
        lastPersistedTimelineSecRef.current = null;
        if (persistTimelineTimerRef.current != null) {
            window.clearTimeout(persistTimelineTimerRef.current);
            persistTimelineTimerRef.current = null;
        }
    }, [shortVideoId]);

    const schedulePersistTimelineSec = React.useCallback((sec: number) => {
        if (!shortVideoId || shortVideoId <= 0) {
            return;
        }
        if (persistTimelineTimerRef.current != null) {
            window.clearTimeout(persistTimelineTimerRef.current);
        }
        persistTimelineTimerRef.current = window.setTimeout(() => {
            persistTimelineTimerRef.current = null;
            // Đang play → không lưu (theo yêu cầu).
            if (isPlayingRef.current) {
                return;
            }
            const clamped = Math.max(0, Math.round(sec * 1000) / 1000);
            const prev = lastPersistedTimelineSecRef.current;
            if (prev != null && Math.abs(prev - clamped) < 0.25) {
                return;
            }
            lastPersistedTimelineSecRef.current = clamped;
            void saveAgentTimelinePosition(shortVideoId, clamped).catch(() => {
                // Im lặng — không spam toast khi debounce lưu vị trí.
            });
        }, 1500);
    }, [shortVideoId]);

    React.useEffect(() => () => {
        if (persistTimelineTimerRef.current != null) {
            window.clearTimeout(persistTimelineTimerRef.current);
        }
    }, []);

    const effectiveMissingCount = isWhiteboardMode ? missingBeatImageCount : missingBeatHtmlCount;
    // Mỗi lần click chỉ mở 10 beat thiếu ảnh — hiển thị batch + số còn lại.
    const imageBatchSize = isWhiteboardMode ? Math.min(10, effectiveMissingCount) : 0;
    const imageRemaining = Math.max(0, effectiveMissingCount - imageBatchSize);

    const beatsWithHtmlCount = React.useMemo(
        () => countBeatIdsWithHtml(beatHtml),
        [beatHtml],
    );
    const beatQaCounts = React.useMemo(() => {
        if (isWhiteboardMode) {
            const pseudoHtml: Record<string, BeatHtmlEntry> = {};
            Object.entries(beatImage).forEach(([beatId, entry]) => {
                pseudoHtml[beatId] = {
                    html: '',
                    qa_status: entry.qa_status,
                    qa_refine_note: entry.qa_refine_note,
                };
            });
            return countBeatQaByStatus(beatMap, pseudoHtml);
        }
        return countBeatQaByStatus(beatMap, beatHtml);
    }, [beatMap, beatHtml, beatImage, isWhiteboardMode]);
    const showBeatQaSummary = Boolean(beatMap?.sections?.length) && (
        beatQaCounts.approved > 0
        || beatQaCounts.needs_html_refill > 0
        || beatQaCounts.needs_visual_tweak > 0
    );
    const showWhiteboardRenderProgress = Boolean(
        isWhiteboardMode
        && whiteboardRenderProgress?.active
        && Number(whiteboardRenderProgress?.total || 0) > 0,
    );
    const whiteboardProgressChipLabel = showWhiteboardRenderProgress && whiteboardRenderProgress
        ? (() => {
            const base = `${whiteboardRenderProgress.completed}/${whiteboardRenderProgress.total} · ${whiteboardRenderProgress.percent}%`;
            if (whiteboardRenderProgress.phase === 'mux') {
                return `Mux · ${base}`;
            }
            if (whiteboardRenderProgress.phase === 'concat') {
                return `Ghép · ${base}`;
            }
            const beatNote = whiteboardRenderProgress.activeBeatId
                ? ` · ${whiteboardRenderProgress.activeBeatId}`
                : '';
            return `${base}${beatNote}`;
        })()
        : '';
    const geminiFillQueueActive = geminiFillStatus === 'queued'
        || geminiFillStatus === 'processing';
    const showDeleteAllBeatHtml = Boolean(beatMap?.sections?.length) && beatsWithHtmlCount > 0;
    const showOpenAllMissingGemini = Boolean(beatMap?.sections?.length) && effectiveMissingCount > 0;
    const showFillAllMissingGeminiHeadless = (
        showOpenAllMissingGemini || geminiFillQueueActive
    ) && Boolean(onFillAllMissingBeatGeminiHeadless) && !isWhiteboardMode;
    const pipelineRunning = String(fullAutoPipeline?.status || '').trim().toLowerCase() === 'running';
    const restartableSet = React.useMemo(
        () => resolveRestartableSet(
            fullAutoPipeline?.restartable_steps,
            fullAutoPipeline?.steps,
            fullAutoPipeline?.current_step,
        ),
        [
            fullAutoPipeline?.restartable_steps,
            fullAutoPipeline?.steps,
            fullAutoPipeline?.current_step,
        ],
    );
    const showPipelineRunControls = showPipelineControls && Boolean(onStartPipelineFromStep);
    const showTimelineActions = showOpenAllMissingGemini
        || showFillAllMissingGeminiHeadless
        || showDeleteAllBeatHtml
        || showImportAssemble
        || showPipelineRunControls;
    const timelineActionsBusy = deletingAllBeatHtml
        || openingAllMissingBeatGemini
        || openingAllMissingBeatMetaAi
        || openingAllMissingBeatAiStudio
        || fillingAllMissingBeatGeminiHeadless
        || geminiFillQueueActive
        || savingImportHtml
        || launchingImportAssemble
        || startingFullAuto
        || Boolean(deletingBeatHtmlBeatId);
    const showBeatTimelineOverlay = customHtmlPreview && Boolean(beatMap?.sections?.length);

    const timelineLayout = React.useMemo(() => ({
        startLeft: TIMELINE_START_LEFT,
        scaleWidth: timelineScaleWidth,
        timelineScale: TIMELINE_SCALE,
    }), [timelineScaleWidth]);

    const hasVideo = customHtmlPreview || String(videoUrl || '').trim() !== '';
    const contentDurationSec = React.useMemo(
        () => resolveAgentVideoDurationSec({
            mediaDurationSec,
            audioDurationSec,
            estimatedDurationSec,
        }),
        [audioDurationSec, estimatedDurationSec, mediaDurationSec],
    );

    const timelineWorkspaceEndSec = React.useMemo(
        () => timelineEditorWorkspaceEndSec(contentDurationSec),
        [contentDurationSec],
    );

    const editorData = React.useMemo(
        () => buildAgentVideoTimelineRows(contentDurationSec),
        [contentDurationSec],
    );

    const minScaleCount = Math.max(20, Math.ceil(timelineWorkspaceEndSec) + 2);
    const timelineContentWidthPx = React.useMemo(
        () => timeSecToTimelineLeftPx(minScaleCount, timelineLayout),
        [minScaleCount, timelineLayout],
    );
    const tracksViewportHeight = TIMELINE_EDIT_AREA_TOP_GAP + AGENT_VIDEO_TRACK_ROW_HEIGHT;
    const timelineContentHeight = TIMELINE_RULER_HEIGHT + tracksViewportHeight;
    const timelineTotalHeight = timelineContentHeight + HORIZONTAL_SCROLLBAR_HEIGHT + CURSOR_HEAD_OVERFLOW;

    const syncTimelineCursor = React.useCallback((timeSec: number) => {
        if (!timelineRef.current) {
            return;
        }
        syncingFromVideoRef.current = true;
        timelineRef.current.setTime(timeSec);
        syncingFromVideoRef.current = false;
    }, []);

    const seekToTime = React.useCallback((timeSec: number, options?: { pauseVideo?: boolean; persist?: boolean }) => {
        const video = videoRef.current;
        const clamped = Math.max(0, Math.min(timeSec, contentDurationSec));
        if (options?.pauseVideo !== false && video && !video.paused) {
            video.pause();
        }
        if (video) {
            video.currentTime = clamped;
        }
        setCurrentTimeSec(clamped);
        syncTimelineCursor(clamped);
        // Seek/scrub/pause seek → lưu; play-through không gọi seekToTime.
        if (options?.persist !== false) {
            schedulePersistTimelineSec(clamped);
        }
    }, [contentDurationSec, schedulePersistTimelineSec, syncTimelineCursor, videoRef]);

    React.useEffect(() => {
        if (!beatPlaybackSeekRequest) {
            return;
        }
        seekToTime(beatPlaybackSeekRequest.startSec, { pauseVideo: true });
    }, [beatPlaybackSeekRequest, seekToTime]);

    // Restore vị trí đã lưu 1 lần khi video/metadata sẵn sàng.
    React.useEffect(() => {
        if (restoreAppliedRef.current) {
            return;
        }
        if (restoreTimelineSec == null || !(restoreTimelineSec > 0)) {
            return;
        }
        if (!hasVideo || !(contentDurationSec > 0)) {
            return;
        }
        restoreAppliedRef.current = true;
        const clamped = Math.max(0, Math.min(restoreTimelineSec, contentDurationSec));
        lastPersistedTimelineSecRef.current = clamped;
        seekToTime(clamped, { pauseVideo: true, persist: false });
        onRestoreTimelineAppliedRef.current?.();
    }, [contentDurationSec, hasVideo, restoreTimelineSec, seekToTime]);

    React.useLayoutEffect(() => {
        if (!hasVideo) {
            setMediaDurationSec(null);
            setCurrentTimeSec(0);
            setIsPlaying(false);
            return undefined;
        }

        const video = videoRef.current;
        if (!video) {
            return undefined;
        }

        const updateDuration = () => {
            const duration = video.duration;
            if (Number.isFinite(duration) && duration > 0) {
                setMediaDurationSec(duration);
            }
        };

        const onTimeUpdate = () => {
            if (isScrubbingRef.current) {
                return;
            }
            if (!customHtmlPreview && isPlayingRef.current) {
                return;
            }
            const sec = video.currentTime;
            setCurrentTimeSec(sec);
            syncTimelineCursor(sec);
        };

        const onPlay = () => {
            isPlayingRef.current = true;
            setIsPlaying(true);
        };
        const onPause = () => {
            isPlayingRef.current = false;
            setIsPlaying(false);
            onTimeUpdate();
            // Pause sau khi play → lưu vị trí hiện tại (debounce).
            schedulePersistTimelineSec(video.currentTime || 0);
        };
        const onEnded = () => {
            isPlayingRef.current = false;
            setIsPlaying(false);
            onTimeUpdate();
        };

        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('durationchange', updateDuration);
        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('play', onPlay);
        video.addEventListener('pause', onPause);
        video.addEventListener('ended', onEnded);
        updateDuration();

        return () => {
            video.removeEventListener('loadedmetadata', updateDuration);
            video.removeEventListener('durationchange', updateDuration);
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('play', onPlay);
            video.removeEventListener('pause', onPause);
            video.removeEventListener('ended', onEnded);
        };
    }, [customHtmlPreview, hasVideo, previewSourceKey, schedulePersistTimelineSec, syncTimelineCursor, videoRef, videoUrl]);

    React.useEffect(() => {
        if (!hasVideo) {
            return undefined;
        }

        if (!customHtmlPreview && !isPlaying) {
            return undefined;
        }

        let frameId = 0;
        const tick = () => {
            if (isScrubbingRef.current) {
                frameId = window.requestAnimationFrame(tick);
                return;
            }
            const video = videoRef.current;
            if (!video || video.paused) {
                return;
            }
            const sec = video.currentTime;
            setCurrentTimeSec(sec);
            syncTimelineCursor(sec);
            frameId = window.requestAnimationFrame(tick);
        };

        frameId = window.requestAnimationFrame(tick);
        return () => {
            window.cancelAnimationFrame(frameId);
        };
    }, [customHtmlPreview, hasVideo, isPlaying, previewSourceKey, syncTimelineCursor, videoRef]);

    const updateTimeFromClientX = React.useCallback((clientX: number, interactArea: HTMLElement) => {
        const host = timelineHostRef.current;
        if (!host) {
            return;
        }

        const rect = interactArea.getBoundingClientRect();
        const localX = clientX - rect.left;
        const scrollLeft = getTimelineHorizontalScrollLeft(host);
        const absoluteLeft = Math.max(TIMELINE_START_LEFT, localX + scrollLeft);
        const time = ((absoluteLeft - TIMELINE_START_LEFT) / timelineScaleWidth) * TIMELINE_SCALE;
        seekToTime(time, { pauseVideo: true });
    }, [seekToTime, timelineScaleWidth]);

    React.useEffect(() => {
        const host = timelineHostRef.current;
        if (!host || !hasVideo) {
            return undefined;
        }

        const onMouseDown = (event: MouseEvent) => {
            if (event.button !== 0) {
                return;
            }

            const target = event.target as HTMLElement | null;
            let interactArea = target?.closest('.timeline-editor-time-area-interact') as HTMLElement | null;
            if (!interactArea) {
                const editArea = target?.closest('.timeline-editor-edit-area') as HTMLElement | null;
                const onClip = Boolean(target?.closest('.timeline-editor-action'));
                if (editArea && !onClip) {
                    interactArea = editArea;
                }
            }
            if (!interactArea) {
                return;
            }

            const scrubArea = interactArea;

            event.preventDefault();
            isScrubbingRef.current = true;
            updateTimeFromClientX(event.clientX, scrubArea);

            const onMouseMove = (moveEvent: MouseEvent) => {
                updateTimeFromClientX(moveEvent.clientX, scrubArea);
            };

            const onMouseUp = (upEvent: MouseEvent) => {
                updateTimeFromClientX(upEvent.clientX, scrubArea);
                isScrubbingRef.current = false;
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        };

        host.addEventListener('mousedown', onMouseDown);
        return () => {
            host.removeEventListener('mousedown', onMouseDown);
        };
    }, [hasVideo, updateTimeFromClientX]);

    const handleTogglePlayback = React.useCallback(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }
        if (video.paused) {
            void video.play();
        } else {
            video.pause();
        }
    }, [videoRef]);

    const handleCursorDrag = React.useCallback((time: number) => {
        if (syncingFromVideoRef.current) {
            return;
        }
        seekToTime(time, { pauseVideo: true });
    }, [seekToTime]);

    const handleClickTimeArea = React.useCallback((time: number) => {
        seekToTime(time, { pauseVideo: true });
        return true;
    }, [seekToTime]);

    const handleTimelineChange = React.useCallback(() => {
        // Read-only timeline — clip edits disabled via disableDrag.
    }, []);

    React.useLayoutEffect(() => {
        if (!hasVideo) {
            setTimelineScrollLeft(0);
            return undefined;
        }

        const host = timelineHostRef.current;
        if (!host) {
            return undefined;
        }

        const syncScrollLeft = () => {
            setTimelineScrollLeft(getTimelineHorizontalScrollLeft(host));
        };

        syncScrollLeft();

        const grids = getTimelineScrollGrids(host);
        grids.forEach((grid) => {
            grid.addEventListener('scroll', syncScrollLeft, { passive: true });
        });

        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(syncScrollLeft)
            : null;
        observer?.observe(host);

        return () => {
            grids.forEach((grid) => {
                grid.removeEventListener('scroll', syncScrollLeft);
            });
            observer?.disconnect();
        };
    }, [editorData, hasVideo]);

    React.useEffect(() => {
        const host = timelineHostRef.current;
        if (!host || !hasVideo) {
            return undefined;
        }

        const onWheel = (event: WheelEvent) => {
            const horizontalDelta = resolveTimelineWheelDelta(event);
            if (horizontalDelta === 0) {
                return;
            }
            const scrolled = scrollTimelineGrids(host, horizontalDelta);
            if (!scrolled) {
                return;
            }
            event.preventDefault();
            setTimelineScrollLeft(getTimelineHorizontalScrollLeft(host));
        };

        host.addEventListener('wheel', onWheel, { passive: false, capture: true });
        return () => {
            host.removeEventListener('wheel', onWheel, { capture: true });
        };
    }, [editorData, hasVideo]);

    return (
        <Box
            sx={{
                flexShrink: 0,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.75,
                    borderBottom: tracksCollapsed ? 0 : 1,
                    borderColor: 'divider',
                    userSelect: 'none',
                }}
            >
                <IconButton
                    size="small"
                    aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                    disabled={!hasVideo}
                    onClick={handleTogglePlayback}
                >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatPlaybackClock(currentTimeSec)} / {formatPlaybackClock(contentDurationSec)}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 8 }} />
                {showWhiteboardRenderProgress && whiteboardRenderProgress ? (
                    <Tooltip
                        title={whiteboardRenderProgressLabel(whiteboardRenderProgress)}
                        placement="top"
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.75,
                                minWidth: 140,
                                maxWidth: 280,
                            }}
                        >
                            <Chip
                                size="small"
                                color={whiteboardRenderProgress.failed.length > 0 ? 'error' : 'info'}
                                label={whiteboardProgressChipLabel}
                                sx={{
                                    height: 22,
                                    maxWidth: '100%',
                                    '& .MuiChip-label': {
                                        px: 0.75,
                                        fontSize: 11,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    },
                                }}
                            />
                            <LinearProgress
                                variant="determinate"
                                value={Math.max(0, Math.min(100, whiteboardRenderProgress.percent))}
                                sx={{ flex: 1, minWidth: 48, height: 4, borderRadius: 1 }}
                            />
                        </Box>
                    </Tooltip>
                ) : null}
                {showBeatQaSummary ? (
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        {`Ổn: ${beatQaCounts.approved} · HTML: ${beatQaCounts.needs_html_refill} · Visual: ${beatQaCounts.needs_visual_tweak}`}
                    </Typography>
                ) : null}
                {hasVideo ? (
                    <TimelineZoomControls
                        value={timelineScaleWidth}
                        onChange={setTimelineScaleWidth}
                    />
                ) : null}
                {(showTimelineActions) ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {showOpenAllMissingGemini && onOpenAllMissingBeatGemini ? (
                            <Tooltip
                                title={isWhiteboardMode
                                    ? `Mở Duck.ai 10 beat thiếu ảnh mỗi lần click (còn ${imageRemaining}). Prompt sẽ được điền sẵn, bạn tự submit. Mỗi beat cần ĐỦ 2 ảnh: IMAGE 1 object layer (nền trong suốt) + IMAGE 2 background plate — download cả 2 ảnh trên Duck.ai → tự lưu beat.`
                                    : 'Extension tự điền prompt và bấm Gửi trên mỗi tab — kiểm tra kết quả rồi Lưu HTML từng tab'}
                                placement="top"
                            >
                                <span>
                                    <LoadingButton
                                        size="small"
                                        variant="contained"
                                        color="primary"
                                        disabled={!hasVideo || timelineActionsBusy || whisperStatus !== 'completed'}
                                        loading={openingAllMissingBeatGemini}
                                        onClick={() => { onOpenAllMissingBeatGemini(); }}
                                        startIcon={<AutoAwesomeIcon fontSize="small" />}
                                        sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                    >
                                        {isWhiteboardMode
                                            ? (imageRemaining > 0
                                                ? `Mở Duck.ai 10 beat (còn ${imageRemaining})`
                                                : `Mở Duck.ai ${imageBatchSize} beat thiếu ảnh (đủ 2 lớp)`)
                                            : `Mở Gemini tất cả beat thiếu (${effectiveMissingCount})`}
                                    </LoadingButton>
                                </span>
                            </Tooltip>
                        ) : null}
                        {isWhiteboardMode && showOpenAllMissingGemini && onOpenAllMissingBeatMetaAi ? (
                            <Tooltip
                                title={`Mở Meta.ai 10 beat thiếu ảnh mỗi lần click (còn ${imageRemaining}). Prompt sẽ được điền sẵn, bạn tự submit. Mỗi beat cần ĐỦ 2 ảnh: IMAGE 1 object layer (nền trong suốt) + IMAGE 2 background plate — download cả 2 ảnh trên Meta.ai → tự lưu beat.`}
                                placement="top"
                            >
                                <span>
                                    <LoadingButton
                                        size="small"
                                        variant="contained"
                                        color="secondary"
                                        disabled={!hasVideo || timelineActionsBusy || whisperStatus !== 'completed'}
                                        loading={openingAllMissingBeatMetaAi}
                                        onClick={() => { onOpenAllMissingBeatMetaAi(); }}
                                        startIcon={<AutoAwesomeIcon fontSize="small" />}
                                        sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                    >
                                        {imageRemaining > 0
                                            ? `Mở Meta.ai 10 beat (còn ${imageRemaining})`
                                            : `Mở Meta.ai ${imageBatchSize} beat thiếu ảnh (đủ 2 lớp)`}
                                    </LoadingButton>
                                </span>
                            </Tooltip>
                        ) : null}
                        {!isWhiteboardMode && showOpenAllMissingGemini && onOpenAllMissingBeatAiStudio ? (
                            <Tooltip
                                title="Extension mở AI Studio (Gemini 3.6 Flash), điền prompt + Run — bấm Lưu HTML để extract từ response vào CMS"
                                placement="top"
                            >
                                <span>
                                    <LoadingButton
                                        size="small"
                                        variant="contained"
                                        color="info"
                                        disabled={!hasVideo || timelineActionsBusy || whisperStatus !== 'completed'}
                                        loading={openingAllMissingBeatAiStudio}
                                        onClick={() => { onOpenAllMissingBeatAiStudio(); }}
                                        startIcon={<AutoAwesomeIcon fontSize="small" />}
                                        sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                    >
                                        {`Mở AI Studio tất cả beat thiếu (${effectiveMissingCount})`}
                                    </LoadingButton>
                                </span>
                            </Tooltip>
                        ) : null}
                        {showFillAllMissingGeminiHeadless ? (
                            <Tooltip
                                title="Đưa beat thiếu vào queue nền (worker Gemini Headless). Có thể đóng CMS — progress cập nhật trên chip/badge."
                                placement="top"
                            >
                                <span>
                                    <LoadingButton
                                        size="small"
                                        variant="outlined"
                                        color="secondary"
                                        disabled={
                                            !hasVideo
                                            || timelineActionsBusy
                                            || whisperStatus !== 'completed'
                                            || geminiFillQueueActive
                                        }
                                        loading={
                                            fillingAllMissingBeatGeminiHeadless
                                            || geminiFillQueueActive
                                        }
                                        onClick={() => { onFillAllMissingBeatGeminiHeadless?.(); }}
                                        startIcon={<AutoAwesomeIcon fontSize="small" />}
                                        sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                    >
                                        {(() => {
                                            const progress = geminiFillQueueActive
                                                ? geminiFillProgress
                                                : fillingAllMissingBeatGeminiHeadlessProgress;
                                            if (
                                                progress
                                                && Number(progress.total || 0) > 0
                                                && (
                                                    geminiFillQueueActive
                                                    || fillingAllMissingBeatGeminiHeadless
                                                )
                                            ) {
                                                const beatNote = progress.beatId
                                                    ? `: ${progress.beatId}`
                                                    : '';
                                                return `Queue fill ${progress.current}/${progress.total}${beatNote}`;
                                            }
                                            if (geminiFillQueueActive) {
                                                return 'Đang fill HTML beat (queue)…';
                                            }
                                            return `API fill tất cả beat thiếu (${effectiveMissingCount})`;
                                        })()}
                                    </LoadingButton>
                                </span>
                            </Tooltip>
                        ) : null}
                        {showPipelineRunControls ? (
                            <>
                                <LoadingButton
                                    size="small"
                                    variant="contained"
                                    color="success"
                                    startIcon={<PlayArrowIcon fontSize="small" />}
                                    endIcon={<ArrowDropDownIcon fontSize="small" />}
                                    loading={startingFullAuto}
                                    disabled={pipelineRunning || startingFullAuto}
                                    onClick={(event) => {
                                        setRestartMenuAnchor(event.currentTarget);
                                    }}
                                    sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                >
                                    Chạy pipeline
                                </LoadingButton>
                                <Menu
                                    anchorEl={restartMenuAnchor}
                                    open={Boolean(restartMenuAnchor)}
                                    onClose={() => setRestartMenuAnchor(null)}
                                    anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                                >
                                    <PipelineGroupedMenuItems
                                        steps={fullAutoPipeline?.steps}
                                        headlessSteps={fullAutoPipeline?.headless_steps}
                                        aiSteps={fullAutoPipeline?.ai_steps}
                                        qaLoops={fullAutoPipeline?.qa_loops}
                                        agentVisualMode={agentVisualMode}
                                        pipelineStatus={fullAutoPipeline?.status}
                                        currentStep={fullAutoPipeline?.current_step}
                                        stepToggles={fullAutoStepToggles}
                                        stepToggleDisabled={savingFullAutoStepToggles || startingFullAuto}
                                        onStepToggleChange={onFullAutoStepToggleChange}
                                        beatImageFillMode={beatImageFillMode}
                                        beatImageFillModeDisabled={savingBeatImageFillMode || startingFullAuto}
                                        beatImageFillOnlyMissing={beatImageFillOnlyMissing}
                                        beatImageFillOnlyMissingDisabled={savingBeatImageFillMode || startingFullAuto}
                                        onBeatImageFillOnlyMissingChange={(checked) => {
                                            onBeatImageFillOnlyMissingChange?.(checked);
                                        }}
                                        onBeatImageFillModeChange={onBeatImageFillModeChange}
                                        restartableSet={restartableSet}
                                        disabled={startingFullAuto}
                                        onSelectStep={(stepKey: FullAutoPipelineStepKey) => {
                                            setRestartMenuAnchor(null);
                                            onStartPipelineFromStep?.(stepKey);
                                        }}
                                        onRunSingleStep={(stepKey: FullAutoPipelineStepKey) => {
                                            setRestartMenuAnchor(null);
                                            onRunSinglePipelineStep?.(stepKey);
                                        }}
                                        runSingleStepDisabled={pipelineRunning || startingFullAuto}
                                        runningSingleStep={startingFullAuto}
                                        onRerunRenderUpload={() => {
                                            setRestartMenuAnchor(null);
                                            onStartPipelineFromStep?.('render');
                                        }}
                                        rerunningRenderUpload={startingFullAuto}
                                        rerunRenderUploadDisabled={pipelineRunning || startingFullAuto}
                                        onManualBeatDivision={() => {
                                            setRestartMenuAnchor(null);
                                            setBeatDivisionManualOpen(true);
                                        }}
                                        manualBeatDivisionDisabled={pipelineRunning || startingFullAuto}
                                        onManualScriptCreate={() => {
                                            setRestartMenuAnchor(null);
                                            setScriptManualOpen(true);
                                        }}
                                        manualScriptCreateDisabled={pipelineRunning || startingFullAuto}
                                        onManualScriptPhonetic={() => {
                                            setRestartMenuAnchor(null);
                                            setScriptPhoneticManualOpen(true);
                                        }}
                                        manualScriptPhoneticDisabled={pipelineRunning || startingFullAuto}
                                        onManualBgm={() => {
                                            setRestartMenuAnchor(null);
                                            setBgmManualOpen(true);
                                        }}
                                        manualBgmDisabled={pipelineRunning || startingFullAuto}
                                    />
                                </Menu>
                                {pipelineRunning ? (
                                    <LoadingButton
                                        size="small"
                                        variant="outlined"
                                        color="inherit"
                                        startIcon={<StopIcon fontSize="small" />}
                                        loading={cancellingFullAuto}
                                        disabled={cancellingFullAuto}
                                        onClick={() => { onCancelPipeline?.(); }}
                                        sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                    >
                                        Dừng
                                    </LoadingButton>
                                ) : null}
                            </>
                        ) : null}
                        {
                        // eslint-disable-next-line no-constant-condition
                        showImportAssemble && onLaunchImportAssemble && false ? (
                            <Tooltip
                                title={hasAgentVideo
                                    ? 'Agent ghép lại video từ HTML beat đã lưu trên CMS'
                                    : 'Agent ghép và render video từ HTML beat đã đủ'}
                                placement="top"
                            >
                                <span>
                                    <LoadingButton
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        disabled={!hasVideo || timelineActionsBusy || agentVideoStatus === 'processing'}
                                        loading={launchingImportAssemble}
                                        onClick={() => { void onLaunchImportAssemble?.(); }}
                                        startIcon={<PlayArrowIcon fontSize="small" />}
                                        sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                    >
                                        {hasAgentVideo ? 'Ghép lại từ HTML' : 'Chạy agent ghép từ HTML'}
                                    </LoadingButton>
                                </span>
                            </Tooltip>
                        ) : null}
                        {showDeleteAllBeatHtml && onDeleteAllBeatHtml ? (
                            <Tooltip title={`Xóa HTML của ${beatsWithHtmlCount} beat đang có dữ liệu`} placement="top">
                                <span>
                                    <Button
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        disabled={!hasVideo || timelineActionsBusy}
                                        onClick={() => { void onDeleteAllBeatHtml(); }}
                                        startIcon={deletingAllBeatHtml ? (
                                            <CircularProgress size={14} color="inherit" />
                                        ) : (
                                            <DeleteOutlineIcon fontSize="small" />
                                        )}
                                        sx={{ textTransform: 'none', fontSize: 12, py: 0.25 }}
                                    >
                                        Xóa tất cả beat
                                    </Button>
                                </span>
                            </Tooltip>
                        ) : null}
                    </Box>
                ) : null}
                <Tooltip title={tracksCollapsed
                    ? 'Mở rộng timeline video'
                    : 'Thu nhỏ timeline video — chỉ giữ thanh điều khiển'}
                >
                    <IconButton
                        size="small"
                        aria-label={tracksCollapsed ? 'Mở rộng timeline video' : 'Thu nhỏ timeline video'}
                        onClick={() => setTracksCollapsed(!tracksCollapsed)}
                    >
                        {tracksCollapsed ? <UnfoldMoreIcon /> : <UnfoldLessIcon />}
                    </IconButton>
                </Tooltip>
            </Box>

            <Box
                sx={{
                    maxHeight: tracksCollapsed
                        ? 0
                        : (hasVideo ? timelineTotalHeight : 44),
                    overflow: 'hidden',
                    transition: 'max-height 0.28s ease',
                }}
            >
            {!hasVideo ? (
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 1.25 }}>
                    Chưa có video trên timeline
                </Typography>
            ) : (
                <Box
                    ref={timelineHostRef}
                    sx={{
                        height: timelineTotalHeight,
                        minHeight: timelineTotalHeight,
                        maxHeight: timelineTotalHeight,
                        display: 'flex',
                        overflow: 'visible',
                        pt: `${CURSOR_HEAD_OVERFLOW}px`,
                        boxSizing: 'border-box',
                        bgcolor: '#191b1d',
                        userSelect: 'none',
                    }}
                >
                    <Box
                        sx={{
                            width: TRACK_LABELS_WIDTH,
                            flexShrink: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            height: timelineTotalHeight - CURSOR_HEAD_OVERFLOW,
                            borderRight: 1,
                            borderColor: 'rgba(255,255,255,0.12)',
                            bgcolor: '#141618',
                        }}
                    >
                        <Box
                            sx={{
                                height: TIMELINE_RULER_HEIGHT,
                                flexShrink: 0,
                            }}
                        />
                        <Box
                            sx={{
                                height: AGENT_VIDEO_TRACK_ROW_HEIGHT + TIMELINE_EDIT_AREA_TOP_GAP,
                                display: 'flex',
                                alignItems: 'center',
                                px: 1,
                                mt: `${TIMELINE_EDIT_AREA_TOP_GAP}px`,
                            }}
                        >
                            <Typography
                                variant="caption"
                                sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 600 }}
                            >
                                Video
                            </Typography>
                        </Box>
                    </Box>

                    <Box
                        sx={{
                            position: 'relative',
                            flex: 1,
                            minWidth: 0,
                            height: timelineTotalHeight - CURSOR_HEAD_OVERFLOW,
                            overflow: 'visible',
                            '& .timeline-editor': {
                                height: `${timelineTotalHeight - CURSOR_HEAD_OVERFLOW}px !important`,
                                width: '100% !important',
                                minHeight: `${timelineTotalHeight - CURSOR_HEAD_OVERFLOW}px`,
                                maxHeight: `${timelineTotalHeight - CURSOR_HEAD_OVERFLOW}px`,
                                overflow: 'visible !important',
                                userSelect: 'none !important',
                            },
                            '& .timeline-editor-cursor': {
                                top: '0 !important',
                                height: '100% !important',
                                zIndex: 1,
                                pointerEvents: 'auto',
                            },
                            '& .timeline-editor-cursor-top': {
                                top: '0 !important',
                                width: '10px !important',
                                height: '15px !important',
                                transform: 'translate(-50%, -100%) scaleX(2) !important',
                            },
                            '& .timeline-editor-cursor-top path': {
                                fill: '#5297FF',
                            },
                            '& .timeline-editor-edit-area': {
                                flex: '1 1 auto',
                                minHeight: 0,
                                marginTop: `${TIMELINE_EDIT_AREA_TOP_GAP}px`,
                                overflow: 'hidden',
                            },
                            '& .timeline-editor-action': {
                                backgroundColor: 'transparent !important',
                            },
                            '& .timeline-editor-action .timeline-editor-action-left-stretch, & .timeline-editor-action .timeline-editor-action-right-stretch': {
                                opacity: '0 !important',
                            },
                        }}
                    >
                        <Timeline
                            ref={timelineRef}
                            editorData={editorData}
                            effects={AGENT_VIDEO_TIMELINE_EFFECTS}
                            scale={TIMELINE_SCALE}
                            scaleWidth={timelineScaleWidth}
                            scaleSplitCount={TIMELINE_SCALE_SPLIT_COUNT}
                            startLeft={TIMELINE_START_LEFT}
                            minScaleCount={minScaleCount}
                            rowHeight={AGENT_VIDEO_TRACK_ROW_HEIGHT}
                            gridSnap
                            dragLine
                            disableDrag
                            autoScroll
                            style={{
                                width: '100%',
                                height: timelineTotalHeight - CURSOR_HEAD_OVERFLOW,
                            }}
                            onChange={handleTimelineChange}
                            onCursorDrag={handleCursorDrag}
                            onClickTimeArea={handleClickTimeArea}
                            getActionRender={() => (
                                <AgentVideoSimpleClip
                                    clipLabel={clipLabel}
                                />
                            )}
                        />
                        {showBeatTimelineOverlay ? (
                            <AgentVideoBeatBoundaryOverlay
                                beatMap={beatMap}
                                beatHtml={beatHtml}
                                beatImage={beatImage}
                                isWhiteboardMode={isWhiteboardMode}
                                activeBeatId={activeBeatId}
                                copyingBeatHtmlPromptBeatId={copyingBeatHtmlPromptBeatId}
                                pastingBeatHtmlBeatId={pastingBeatHtmlBeatId}
                                deletingBeatHtmlBeatId={deletingBeatHtmlBeatId}
                                openingBeatGeminiBeatIds={openingBeatGeminiBeatIds}
                                openingBeatGeminiHeadlessBeatIds={openingBeatGeminiHeadlessBeatIds}
                                quickIterateBeatStages={quickIterateBeatStages}
                                savingImportHtml={savingImportHtml}
                                onBeatClick={onBeatClick}
                                onCopyPrompt={onCopyBeatPrompt}
                                onPasteHtml={onPasteBeatHtml}
                                onEditHtml={onEditBeatHtml}
                                onOpenInfo={onOpenBeatInfo}
                                onDeleteBeatData={onDeleteBeatHtml}
                                onOpenGemini={onOpenBeatGemini}
                                onOpenMetaAi={onOpenBeatMetaAi}
                                onOpenGeminiHeadless={onOpenBeatGeminiHeadless}
                                onRenderWhiteboardBeat={onRenderWhiteboardBeat}
                                onAddBeatVideoToCapcut={onAddBeatVideoToCapcut}
                                whiteboardBeatRenders={whiteboardBeatRenders}
                                renderingWhiteboardBeatIds={renderingWhiteboardBeatIds}
                                uploadingBeatVideoToCapcutIds={uploadingBeatVideoToCapcutIds}
                                onSaveBeatQa={onSaveBeatQa}
                                onQuickIterateBeat={onQuickIterateBeat}
                                beatVersions={beatVersions}
                                beatActiveVersionId={beatActiveVersionId}
                                onRestoreBeatVersion={onRestoreBeatVersion}
                                scrollLeft={timelineScrollLeft}
                                contentWidthPx={timelineContentWidthPx}
                                layout={timelineLayout}
                                rulerHeight={TIMELINE_RULER_HEIGHT}
                                trackTopGap={TIMELINE_EDIT_AREA_TOP_GAP}
                                trackHeight={AGENT_VIDEO_TRACK_ROW_HEIGHT}
                                totalHeight={timelineContentHeight}
                            />
                        ) : null}
                    </Box>
                </Box>
            )}
            </Box>
            <ShortVideoAgentBeatDivisionManualDrawer
                open={beatDivisionManualOpen}
                onClose={() => setBeatDivisionManualOpen(false)}
                shortVideoId={shortVideoId}
                audioDurationSec={audioDurationSec}
                agentSourceFormat={agentSourceFormat}
                isWhiteboard={isWhiteboardMode}
                onSave={onSaveBeatMapManual ?? fallbackManualBeatDivisionSaveWithOptions}
            />
            <ShortVideoAgentScriptManualDrawer
                open={scriptManualOpen}
                onClose={() => setScriptManualOpen(false)}
                shortVideoId={shortVideoId}
                initialScript={audioScript}
                onSave={onSaveScriptManual ?? fallbackManualScriptSave}
            />
            <ShortVideoAgentScriptPhoneticManualDrawer
                open={scriptPhoneticManualOpen}
                onClose={() => setScriptPhoneticManualOpen(false)}
                shortVideoId={shortVideoId}
                initialReading={audioScriptTtsReading}
                onSave={onSaveScriptPhonetic ?? fallbackManualScriptPhoneticSave}
            />
            {agentState ? (
                <ShortVideoAgentBgmManualDrawer
                    open={bgmManualOpen}
                    onClose={() => setBgmManualOpen(false)}
                    state={agentState}
                />
            ) : null}
        </Box>
    );
}
