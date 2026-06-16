import React from 'react';
import type { PlayerRef } from '@remotion/player';
import { Timeline, type TimelineState } from '@xzdarcy/react-timeline-editor';
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SyncIcon from '@mui/icons-material/Sync';
import { Box, CircularProgress, IconButton, TextField, Typography } from '@mui/material';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';
import {
    addVisualClipAtSec,
    manifestUsesVisualClips,
    removeVisualClipFromManifest,
    updateVisualClipInManifest,
} from 'helpers/shortVideoVisualClips';
import {
    addNarrationSceneAtCompositionSec,
    applyTimelineRowsToManifest,
    compositionSecToManifestSec,
    defaultVisualClipFromSceneAtSec,
    getCompositionDurationSec,
    manifestHasEditableVisualTimeline,
    manifestToTimelineRows,
    SHORT_VIDEO_TIMELINE_EFFECTS,
    TIMELINE_ROW_NARRATION,
    TIMELINE_NARRATION_ROW_HEIGHT,
    TIMELINE_ROW_VISUAL,
    TIMELINE_RULER_HEIGHT,
    TIMELINE_SPARE_ROW_COUNT,
    TIMELINE_SPARE_ROW_HEIGHT,
    TIMELINE_VISUAL_ROW_HEIGHT,
    type ShortVideoTimelineAction,
    type TimelineRow,
} from 'helpers/shortVideoTimelineAdapter';

type Props = {
    manifest: ShortVideoRenderManifest;
    playerRef: React.MutableRefObject<PlayerRef | null>;
    playerInstance: PlayerRef | null;
    selectedVisualClipId: string;
    selectedNarrationSceneId?: string;
    onSelectVisualClip: (clipId: string) => void;
    onManifestChange: (manifest: ShortVideoRenderManifest) => void;
    onSeekScene?: (sceneId: string) => void;
    rightSlot?: React.ReactNode;
    onSyncClick?: () => void;
    saving?: boolean;
    onSelectNarrationScene?: (sceneId: string) => void;
    narrationRunningSceneIds?: string[];
};

const TIMELINE_HEIGHT_STORAGE_KEY = 'short_video_editor_timeline_extra_height_v1';

function formatPlaybackClock(totalSec: number): string {
    const sec = Math.max(0, Math.floor(totalSec));
    const minutes = Math.floor(sec / 60);
    const remainder = sec % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function NarrationActionBlock({ action }: { action: ShortVideoTimelineAction }) {
    const label = action.data?.label || action.id;
    const status = action.data?.status;
    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isActive = Boolean(action.selected);
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                px: 1,
                display: 'flex',
                alignItems: 'center',
                bgcolor: isRunning ? '#1e3a5f' : 'grey.600',
                color: isPending ? '#fff4d6' : 'grey.100',
                fontSize: 11,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                borderRadius: 1,
                border: isActive
                    ? '2px solid #fbbf24'
                    : isPending
                        ? '1px dashed #f59e0b'
                        : (isRunning ? '1px dashed #60a5fa' : '1px solid transparent'),
            }}
        >
            {label}
        </Box>
    );
}

function VisualActionBlock({
    action,
    editing,
    editValue,
    onEditChange,
    onEditBlur,
    onEditKeyDown,
}: {
    action: ShortVideoTimelineAction;
    editing: boolean;
    editValue: string;
    onEditChange: (value: string) => void;
    onEditBlur: () => void;
    onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
    const label = action.data?.label || action.id;
    const thumb = action.data?.thumbnailUrl;
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 0.75,
                bgcolor: 'primary.dark',
                color: 'primary.contrastText',
                fontSize: 11,
                overflow: 'hidden',
                borderRadius: 1,
                border: '2px solid',
                borderColor: action.selected ? 'warning.main' : 'transparent',
            }}
        >
            {thumb ? (
                <Box
                    component="img"
                    src={thumb}
                    alt=""
                    sx={{
                        width: 28,
                        height: 28,
                        objectFit: 'cover',
                        borderRadius: 0.5,
                        flexShrink: 0,
                    }}
                />
            ) : null}
            {editing ? (
                <TextField
                    autoFocus
                    size="small"
                    variant="outlined"
                    value={editValue}
                    onChange={(event) => onEditChange(event.target.value)}
                    onBlur={onEditBlur}
                    onKeyDown={onEditKeyDown}
                    onMouseDown={(event) => event.stopPropagation()}
                    inputProps={{
                        maxLength: 120,
                        style: {
                            color: 'inherit',
                            fontSize: 11,
                            padding: '2px 6px',
                            lineHeight: '16px',
                        },
                    }}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        '& .MuiOutlinedInput-root': {
                            height: 24,
                            bgcolor: '#fff',
                            color: '#111',
                            '& fieldset': {
                                borderColor: 'rgba(0,0,0,0.22)',
                            },
                            '&:hover fieldset': {
                                borderColor: 'rgba(0,0,0,0.4)',
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: 'warning.main',
                            },
                        },
                    }}
                />
            ) : (
                <Box
                    component="span"
                    sx={{
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {label}
                </Box>
            )}
        </Box>
    );
}

export default function ShortVideoEditorTimeline({
    manifest,
    playerRef,
    playerInstance,
    selectedVisualClipId,
    selectedNarrationSceneId = '',
    onSelectVisualClip,
    onManifestChange,
    onSeekScene,
    rightSlot,
    onSyncClick,
    saving = false,
    onSelectNarrationScene,
    narrationRunningSceneIds = [],
}: Props) {
    const timelineHostRef = React.useRef<HTMLDivElement | null>(null);
    const fps = manifest.fps || 30;
    const durationSec = Math.max(0.1, getCompositionDurationSec(manifest));
    const timelineRef = React.useRef<TimelineState>(null);
    const syncingFromPlayerRef = React.useRef(false);
    const previousManifestRef = React.useRef(manifest);
    const dragBaseManifestRef = React.useRef<ShortVideoRenderManifest | null>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
    const [editingClipId, setEditingClipId] = React.useState('');
    const [editingLabelDraft, setEditingLabelDraft] = React.useState('');
    const [showSyncLoading, setShowSyncLoading] = React.useState(false);
    const syncLoadingShownAtRef = React.useRef(0);
    const hideSyncLoadingTimerRef = React.useRef<number | null>(null);
    const [timelineExtraHeight, setTimelineExtraHeight] = React.useState(() => {
        if (typeof window === 'undefined') {
            return 0;
        }
        const raw = window.localStorage.getItem(TIMELINE_HEIGHT_STORAGE_KEY);
        const parsed = raw ? Number(raw) : 0;
        return Number.isFinite(parsed) ? parsed : 0;
    });

    React.useEffect(() => {
        if (saving) {
            if (hideSyncLoadingTimerRef.current) {
                window.clearTimeout(hideSyncLoadingTimerRef.current);
                hideSyncLoadingTimerRef.current = null;
            }
            syncLoadingShownAtRef.current = Date.now();
            setShowSyncLoading(true);
            return;
        }

        if (!showSyncLoading) {
            return;
        }

        const elapsed = Date.now() - syncLoadingShownAtRef.current;
        const remaining = Math.max(0, 500 - elapsed);
        if (remaining === 0) {
            setShowSyncLoading(false);
            return;
        }

        hideSyncLoadingTimerRef.current = window.setTimeout(() => {
            hideSyncLoadingTimerRef.current = null;
            setShowSyncLoading(false);
        }, remaining);
    }, [saving, showSyncLoading]);

    React.useEffect(() => () => {
        if (hideSyncLoadingTimerRef.current) {
            window.clearTimeout(hideSyncLoadingTimerRef.current);
            hideSyncLoadingTimerRef.current = null;
        }
    }, []);

    const editorData = React.useMemo(
        () => manifestToTimelineRows(
            manifest,
            selectedVisualClipId,
            narrationRunningSceneIds,
            selectedNarrationSceneId
        ),
        [manifest, selectedVisualClipId, narrationRunningSceneIds, selectedNarrationSceneId]
    );

    const syncPlayerTime = React.useCallback(
        (timeSec: number) => {
            const clamped = Math.max(0, Math.min(timeSec, durationSec));
            playerRef.current?.seekTo(Math.round(clamped * fps));
            setCurrentTimeSec(clamped);
        },
        [durationSec, fps, playerRef]
    );

    const syncTimelineCursor = React.useCallback((timeSec: number) => {
        if (!timelineRef.current) {
            return;
        }
        syncingFromPlayerRef.current = true;
        timelineRef.current.setTime(timeSec);
        syncingFromPlayerRef.current = false;
    }, []);

    React.useEffect(() => {
        const player = playerInstance;
        if (!player) {
            setIsPlaying(false);
            setCurrentTimeSec(0);
            return;
        }

        const onPlay = () => setIsPlaying(true);
        const onPause = () => {
            setIsPlaying(false);
            const frame = playerRef.current?.getCurrentFrame() ?? 0;
            const sec = frame / fps;
            setCurrentTimeSec(sec);
            syncTimelineCursor(sec);
        };
        const onTimeUpdate = () => {
            const frame = playerRef.current?.getCurrentFrame() ?? 0;
            const sec = frame / fps;
            setCurrentTimeSec(sec);
            syncTimelineCursor(sec);
        };
        const onEnded = () => {
            setIsPlaying(false);
            onTimeUpdate();
        };

        player.addEventListener('play', onPlay);
        player.addEventListener('pause', onPause);
        player.addEventListener('timeupdate', onTimeUpdate);
        player.addEventListener('frameupdate', onTimeUpdate);
        player.addEventListener('ended', onEnded);

        return () => {
            player.removeEventListener('play', onPlay);
            player.removeEventListener('pause', onPause);
            player.removeEventListener('timeupdate', onTimeUpdate);
            player.removeEventListener('frameupdate', onTimeUpdate);
            player.removeEventListener('ended', onEnded);
        };
    }, [fps, playerInstance, playerRef, syncTimelineCursor]);

    const handleTogglePlayback = React.useCallback(() => {
        playerRef.current?.toggle();
    }, [playerRef]);

    React.useEffect(() => {
        previousManifestRef.current = manifest;
    }, [manifest]);

    React.useEffect(() => {
        const clearDragBase = () => {
            dragBaseManifestRef.current = null;
        };
        window.addEventListener('mouseup', clearDragBase);
        return () => {
            window.removeEventListener('mouseup', clearDragBase);
        };
    }, []);

    const handleTimelineChange = React.useCallback(
        (rows: TimelineRow[]) => {
            if (!manifestHasEditableVisualTimeline(manifest)) {
                return;
            }
            if (!dragBaseManifestRef.current) {
                dragBaseManifestRef.current = previousManifestRef.current;
            }
            const rippleBase = dragBaseManifestRef.current;
            const next = applyTimelineRowsToManifest(rows, manifest, rippleBase);
            previousManifestRef.current = next;
            onManifestChange(next);
        },
        [manifest, onManifestChange]
    );

    const handleCursorDrag = React.useCallback(
        (time: number) => {
            if (syncingFromPlayerRef.current) {
                return;
            }
            syncPlayerTime(time);
        },
        [syncPlayerTime]
    );

    const handleClickTimeArea = React.useCallback(
        (time: number) => {
            syncPlayerTime(time);
            syncTimelineCursor(time);
            return true;
        },
        [syncPlayerTime, syncTimelineCursor]
    );

    const timelineScale = 1;
    const timelineScaleWidth = 56;
    const timelineScaleSplitCount = 5;
    const timelineStartLeft = 20;

    const updateTimeFromClientX = React.useCallback((clientX: number, interactArea: HTMLElement) => {
        const root = timelineHostRef.current;
        if (!root) {
            return;
        }

        const rect = interactArea.getBoundingClientRect();
        const localX = clientX - rect.left;
        const timeAreaGrid = root.querySelector(
            '.timeline-editor-time-area .ReactVirtualized__Grid'
        ) as HTMLElement | null;
        const editGrid = root.querySelector(
            '.timeline-editor-edit-area .ReactVirtualized__Grid'
        ) as HTMLElement | null;
        const scrollLeft = timeAreaGrid?.scrollLeft ?? editGrid?.scrollLeft ?? 0;
        const absoluteLeft = Math.max(timelineStartLeft, localX + scrollLeft);
        const time = ((absoluteLeft - timelineStartLeft) / timelineScaleWidth) * timelineScale;
        const clamped = Math.max(0, Math.min(time, durationSec));

        syncTimelineCursor(clamped);
        syncPlayerTime(clamped);
    }, [
        durationSec,
        syncPlayerTime,
        syncTimelineCursor,
        timelineScale,
        timelineScaleWidth,
        timelineStartLeft,
    ]);

    React.useEffect(() => {
        const host = timelineHostRef.current;
        if (!host) {
            return;
        }

        const onMouseDown = (event: MouseEvent) => {
            if (event.button !== 0) {
                return;
            }

            const target = event.target as HTMLElement | null;
            const interactArea = target?.closest('.timeline-editor-time-area-interact') as HTMLElement | null;
            if (!interactArea) {
                return;
            }

            event.preventDefault();
            updateTimeFromClientX(event.clientX, interactArea);

            const onMouseMove = (moveEvent: MouseEvent) => {
                updateTimeFromClientX(moveEvent.clientX, interactArea);
            };

            const onMouseUp = (upEvent: MouseEvent) => {
                updateTimeFromClientX(upEvent.clientX, interactArea);
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
    }, [updateTimeFromClientX]);

    const handleClickActionOnly = React.useCallback(
        (
            _e: React.MouseEvent<HTMLElement>,
            param: { action: ShortVideoTimelineAction; row: TimelineRow; time: number }
        ) => {
            const action = param.action as ShortVideoTimelineAction;
            if (action.data?.kind === 'visual' && action.data.clipId) {
                onSelectVisualClip(action.data.clipId);
                syncPlayerTime(action.start);
                return;
            }
            if (action.data?.kind === 'narration' && action.data.sceneId) {
                onSelectVisualClip('');
                onSelectNarrationScene?.(action.data.sceneId);
                onSeekScene?.(action.data.sceneId);
                syncPlayerTime(action.start);
            }
        },
        [onSeekScene, onSelectNarrationScene, onSelectVisualClip, syncPlayerTime]
    );

    const handleAddVisual = React.useCallback(() => {
        if (!manifestHasEditableVisualTimeline(manifest)) {
            return;
        }
        const defaults = defaultVisualClipFromSceneAtSec(manifest, currentTimeSec);
        const manifestStartSec = compositionSecToManifestSec(manifest, currentTimeSec);
        const next = addVisualClipAtSec(manifest, manifestStartSec, defaults);
        onManifestChange(next);
        const newClip = next.visual_clips?.[next.visual_clips.length - 1];
        if (newClip?.id) {
            onSelectVisualClip(newClip.id);
        }
    }, [currentTimeSec, manifest, onManifestChange, onSelectVisualClip]);

    const handleCreateNarrationAtSec = React.useCallback(
        (compositionSec: number) => {
            const created = addNarrationSceneAtCompositionSec(manifest, compositionSec);
            onManifestChange(created.manifest);
            onSelectVisualClip('');
            onSelectNarrationScene?.(created.createdSceneId);
            onSeekScene?.(created.createdSceneId);
            syncPlayerTime(compositionSec);
        },
        [manifest, onManifestChange, onSeekScene, onSelectNarrationScene, onSelectVisualClip, syncPlayerTime]
    );

    const handleDeleteVisual = React.useCallback(() => {
        if (!selectedVisualClipId) {
            return;
        }
        const next = removeVisualClipFromManifest(manifest, selectedVisualClipId);
        onManifestChange(next);
        onSelectVisualClip('');
    }, [manifest, onManifestChange, onSelectVisualClip, selectedVisualClipId]);

    const handleStartRenameVisual = React.useCallback((clipId: string, label: string) => {
        setEditingClipId(clipId);
        setEditingLabelDraft(label);
    }, []);

    const handleCommitRenameVisual = React.useCallback(() => {
        if (!editingClipId) {
            return;
        }
        const nextLabel = editingLabelDraft.trim();
        const currentClip = (manifest.visual_clips ?? []).find((clip) => clip.id === editingClipId);
        if (currentClip) {
            const currentLabel = (currentClip.label ?? '').trim();
            if (currentLabel !== nextLabel) {
                const nextManifest = updateVisualClipInManifest(manifest, editingClipId, {
                    label: nextLabel || undefined,
                });
                onManifestChange(nextManifest);
            }
        }
        setEditingClipId('');
        setEditingLabelDraft('');
    }, [editingClipId, editingLabelDraft, manifest, onManifestChange]);

    const handleRenameKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleCommitRenameVisual();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                setEditingClipId('');
                setEditingLabelDraft('');
            }
        },
        [handleCommitRenameVisual]
    );

    const handleDoubleClickAction = React.useCallback(
        (
            _e: React.MouseEvent<HTMLElement>,
            param: { action: ShortVideoTimelineAction; row: TimelineRow; time: number }
        ) => {
            const action = param.action as ShortVideoTimelineAction;
            if (action.data?.kind !== 'visual' || !action.data.clipId) {
                return;
            }
            handleStartRenameVisual(action.data.clipId, action.data?.label || '');
        },
        [handleStartRenameVisual]
    );

    const suppressNextRowDoubleClickRef = React.useRef(false);
    const handleDoubleClickActionWithGuard = React.useCallback(
        (event: React.MouseEvent<HTMLElement>, param: { action: ShortVideoTimelineAction; row: TimelineRow; time: number }) => {
            suppressNextRowDoubleClickRef.current = true;
            window.setTimeout(() => {
                suppressNextRowDoubleClickRef.current = false;
            }, 80);
            handleDoubleClickAction(event, param);
        },
        [handleDoubleClickAction]
    );

    const handleDoubleClickRow = React.useCallback(
        (
            _event: React.MouseEvent<HTMLElement>,
            param: { row: TimelineRow; time: number }
        ) => {
            if (suppressNextRowDoubleClickRef.current) {
                return;
            }
            if (param.row.id === TIMELINE_ROW_VISUAL) {
                const defaults = defaultVisualClipFromSceneAtSec(manifest, param.time);
                const manifestStartSec = compositionSecToManifestSec(manifest, param.time);
                const next = addVisualClipAtSec(manifest, manifestStartSec, defaults);
                onManifestChange(next);
                const newClip = next.visual_clips?.[next.visual_clips.length - 1];
                if (newClip?.id) {
                    onSelectVisualClip(newClip.id);
                }
                return;
            }
            if (param.row.id === TIMELINE_ROW_NARRATION) {
                handleCreateNarrationAtSec(param.time);
            }
        },
        [handleCreateNarrationAtSec, manifest, onManifestChange, onSelectVisualClip]
    );

    const visualTrackEnabled = manifestHasEditableVisualTimeline(manifest);
    const hasVisualClips = manifestUsesVisualClips(manifest);
    const minScaleCount = Math.max(20, Math.ceil(durationSec) + 2);
    const narrationRowHeight = TIMELINE_NARRATION_ROW_HEIGHT;
    const visualRowHeight = TIMELINE_VISUAL_ROW_HEIGHT;
    const spareRowHeight = TIMELINE_SPARE_ROW_HEIGHT;
    const rulerHeight = TIMELINE_RULER_HEIGHT;
    /** Khoảng trống phía trên ruler để đầu playhead nhô lên (giống editor video). */
    const cursorHeadOverflow = 10;
    const maxTimelineExtraHeight = 320;
    const minTimelineCollapsedContentHeight = 8;
    const tracksHeight =
        narrationRowHeight
        + visualRowHeight
        + TIMELINE_SPARE_ROW_COUNT * spareRowHeight;
    const baseTimelineContentHeight = rulerHeight + tracksHeight;
    const minTimelineExtraHeight = minTimelineCollapsedContentHeight - baseTimelineContentHeight;
    const clampTimelineExtraHeight = React.useCallback(
        (value: number) => Math.max(minTimelineExtraHeight, Math.min(maxTimelineExtraHeight, value)),
        [minTimelineExtraHeight]
    );
    /** Luôn dành chỗ cho scrollbar ngang — tránh nhảy layout khi hover (lib ẩn scrollbar mặc định). */
    const horizontalScrollbarHeight = 12;
    const clampedTimelineExtraHeight = clampTimelineExtraHeight(timelineExtraHeight);
    const timelineContentHeight = Math.max(
        minTimelineCollapsedContentHeight,
        baseTimelineContentHeight + clampedTimelineExtraHeight
    );
    const timelineTotalHeight = timelineContentHeight + horizontalScrollbarHeight + cursorHeadOverflow;
    const isTimelineCollapsed = timelineContentHeight <= minTimelineCollapsedContentHeight + 2;

    React.useEffect(() => {
        const next = clampTimelineExtraHeight(timelineExtraHeight);
        if (next !== timelineExtraHeight) {
            setTimelineExtraHeight(next);
        }
    }, [clampTimelineExtraHeight, timelineExtraHeight]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        window.localStorage.setItem(TIMELINE_HEIGHT_STORAGE_KEY, String(clampedTimelineExtraHeight));
    }, [clampedTimelineExtraHeight]);

    const handleResizeTimelineHeight = React.useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            event.preventDefault();
            const startY = event.clientY;
            const startHeight = clampedTimelineExtraHeight;

            const onMouseMove = (moveEvent: MouseEvent) => {
                const deltaY = moveEvent.clientY - startY;
                const nextHeight = clampTimelineExtraHeight(startHeight - deltaY);
                setTimelineExtraHeight(nextHeight);
            };

            const onMouseUp = () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };

            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
        },
        [clampTimelineExtraHeight, clampedTimelineExtraHeight]
    );

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
                    borderBottom: 1,
                    borderColor: 'divider',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}
            >
                <IconButton
                    size="small"
                    aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                    onClick={handleTogglePlayback}
                >
                    {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
                <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatPlaybackClock(currentTimeSec)} / {formatPlaybackClock(durationSec)}
                </Typography>
                <Box sx={{ flex: 1 }} />
                {visualTrackEnabled ? (
                    <>
                        <IconButton
                            size="small"
                            aria-label="Thêm visual tại playhead"
                            onClick={handleAddVisual}
                        >
                            <AddIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            aria-label="Xóa visual đang chọn"
                            disabled={!selectedVisualClipId}
                            onClick={handleDeleteVisual}
                        >
                            <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                            size="small"
                            aria-label="Đồng bộ lưu manifest"
                            onClick={onSyncClick}
                            disabled={showSyncLoading}
                            sx={{ width: 32, height: 32 }}
                        >
                            <Box
                                sx={{
                                    width: 16,
                                    height: 16,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {showSyncLoading ? (
                                    <CircularProgress size={16} thickness={5} />
                                ) : (
                                    <SyncIcon sx={{ fontSize: 16 }} />
                                )}
                            </Box>
                        </IconButton>
                    </>
                ) : null}
                {rightSlot}
            </Box>
            {!visualTrackEnabled ? (
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5 }}>
                    Timeline visual có sau khi làm mới manifest
                </Typography>
            ) : null}
            <Box
                sx={{
                    flex: 1,
                    height: timelineTotalHeight,
                    minHeight: timelineTotalHeight,
                    maxHeight: timelineTotalHeight,
                    display: 'flex',
                    overflow: 'visible',
                    pt: `${cursorHeadOverflow}px`,
                    boxSizing: 'border-box',
                    bgcolor: '#191b1d',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                }}
            >
                <Box
                    sx={{
                        width: 88,
                        flexShrink: 0,
                        pt: `${rulerHeight}px`,
                        borderRight: 1,
                        borderColor: 'rgba(255,255,255,0.12)',
                        bgcolor: '#141618',
                    }}
                >
                    <Box
                        sx={{
                            height: narrationRowHeight,
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            color: 'grey.400',
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    >
                        Lời thoại
                    </Box>
                    <Box
                        sx={{
                            height: visualRowHeight,
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            color: 'grey.400',
                            fontSize: 11,
                            fontWeight: 600,
                        }}
                    >
                        Visual
                    </Box>
                    {Array.from({ length: TIMELINE_SPARE_ROW_COUNT }, (_, index) => (
                        <Box
                            key={`spare-label-${index + 1}`}
                            sx={{
                                height: spareRowHeight,
                                borderTop: 1,
                                borderColor: 'rgba(255,255,255,0.06)',
                            }}
                        />
                    ))}
                </Box>
                <Box
                    ref={timelineHostRef}
                    sx={{
                        position: 'relative',
                        flex: 1,
                        minWidth: 0,
                        height: timelineTotalHeight - cursorHeadOverflow,
                        minHeight: timelineTotalHeight - cursorHeadOverflow,
                        maxHeight: timelineTotalHeight - cursorHeadOverflow,
                        overflow: 'visible',
                        '& .timeline-editor': {
                            height: `${timelineTotalHeight - cursorHeadOverflow}px !important`,
                            width: '100% !important',
                            minHeight: `${timelineTotalHeight - cursorHeadOverflow}px`,
                            maxHeight: `${timelineTotalHeight - cursorHeadOverflow}px`,
                            overflow: 'visible !important',
                            userSelect: 'none !important',
                            WebkitUserSelect: 'none !important',
                        },
                        '& .timeline-editor *': {
                            userSelect: 'none !important',
                            WebkitUserSelect: 'none !important',
                        },
                        '& .timeline-editor-cursor': {
                            top: '0 !important',
                            height: '100% !important',
                            zIndex: 100,
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
                        '& .timeline-editor-time-area': {
                            position: 'relative',
                            zIndex: 1,
                        },
                        '& .timeline-editor-edit-area': {
                            flex: '1 1 auto',
                            minHeight: 0,
                            marginTop: '10px',
                            overflow: 'hidden',
                        },
                        '& .timeline-editor-edit-area .ReactVirtualized__Grid': {
                            overflow: 'scroll !important',
                            overflowX: 'scroll !important',
                            overflowY: 'hidden !important',
                            scrollbarGutter: 'stable',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#313132 #191b1d',
                        },
                        '& .timeline-editor-edit-area .ReactVirtualized__Grid::-webkit-scrollbar': {
                            height: `${horizontalScrollbarHeight}px !important`,
                            width: '0 !important',
                        },
                        '& .timeline-editor:hover .timeline-editor-edit-area .ReactVirtualized__Grid::-webkit-scrollbar': {
                            height: `${horizontalScrollbarHeight}px !important`,
                        },
                        '& .timeline-editor-edit-area .ReactVirtualized__Grid::-webkit-scrollbar-thumb': {
                            background: '#4a4a4d',
                            borderRadius: '6px',
                        },
                        '& .timeline-editor-edit-area .ReactVirtualized__Grid::-webkit-scrollbar-track': {
                            background: '#141618',
                        },
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            top: `${-cursorHeadOverflow}px`,
                            left: 0,
                            right: 0,
                            height: `${cursorHeadOverflow}px`,
                            cursor: 'ns-resize',
                            zIndex: 130,
                        }}
                        onMouseDown={handleResizeTimelineHeight}
                    />
                    <Timeline
                        ref={timelineRef}
                        editorData={editorData}
                        effects={SHORT_VIDEO_TIMELINE_EFFECTS}
                        scale={timelineScale}
                        scaleWidth={timelineScaleWidth}
                        scaleSplitCount={timelineScaleSplitCount}
                        startLeft={timelineStartLeft}
                        minScaleCount={minScaleCount}
                        rowHeight={40}
                        gridSnap
                        dragLine
                        disableDrag={!visualTrackEnabled}
                        autoScroll
                        style={{
                            width: '100%',
                            height: timelineTotalHeight - cursorHeadOverflow,
                        }}
                        onChange={handleTimelineChange}
                        onCursorDrag={handleCursorDrag}
                        onClickTimeArea={handleClickTimeArea}
                        onClickActionOnly={handleClickActionOnly}
                        onDoubleClickAction={handleDoubleClickActionWithGuard}
                        onDoubleClickRow={handleDoubleClickRow}
                        getActionRender={(action, row) => {
                            const extended = action as ShortVideoTimelineAction;
                            if (row.id === 'narration') {
                                return <NarrationActionBlock action={extended} />;
                            }
                            if (row.id === 'visual') {
                                const clipId = extended.data?.clipId || '';
                                return (
                                    <VisualActionBlock
                                        action={extended}
                                        editing={Boolean(clipId) && editingClipId === clipId}
                                        editValue={editingLabelDraft}
                                        onEditChange={setEditingLabelDraft}
                                        onEditBlur={handleCommitRenameVisual}
                                        onEditKeyDown={handleRenameKeyDown}
                                    />
                                );
                            }
                            return null;
                        }}
                    />
                </Box>
            </Box>
            {visualTrackEnabled && !hasVisualClips ? (
                <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5 }}>
                    Chưa có clip visual — bấm + để thêm
                </Typography>
            ) : null}
            {isTimelineCollapsed ? (
                <Box
                    sx={{
                        position: 'fixed',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: '10px',
                        cursor: 'ns-resize',
                        zIndex: 1400,
                    }}
                    onMouseDown={handleResizeTimelineHeight}
                />
            ) : null}
        </Box>
    );
}
