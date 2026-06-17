import React from 'react';
import type { PlayerRef } from '@remotion/player';
import { Timeline, type TimelineState } from '@xzdarcy/react-timeline-editor';
import '@xzdarcy/react-timeline-editor/dist/react-timeline-editor.css';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SyncIcon from '@mui/icons-material/Sync';
import { Box, Button, CircularProgress, IconButton, Menu, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';
import { resolveSceneHeadlineText } from 'helpers/shortVideoRenderManifest';
import {
    addVisualClipAtSec,
    manifestUsesVisualClips,
    removeVisualClipFromManifest,
    updateVisualClipInManifest,
} from 'helpers/shortVideoVisualClips';
import {
    addNarrationSceneAtCompositionSec,
    addTimelineTrack,
    applyTimelineRowsToManifest,
    getProjectTimelineDurationSec,
    getTrackRowHeight,
    moveActionBetweenRows,
    packTimelineTrackSequential,
    resolveTimelineTracks,
    resolveTrackRowIdFromPointer,
    timelineEditorWorkspaceEndSec,
    manifestHasEditableVisualTimeline,
    manifestToTimelineRows,
    SHORT_VIDEO_TIMELINE_EFFECTS,
    TIMELINE_PACK_GAP_OPTIONS_SEC,
    TIMELINE_DEFAULT_TRACK_NARRATION_ID,
    TIMELINE_DEFAULT_TRACK_VISUAL_ID,
    TIMELINE_EDIT_AREA_TOP_GAP,
    TIMELINE_RULER_HEIGHT,
    TIMELINE_TRACK_ROW_HEIGHT,
    timelineActionEditKey,
    updateSceneTimelineLabelInManifest,
    updateTimelineTrackNameInManifest,
    type ShortVideoTimelineAction,
    type TimelineRow,
} from 'helpers/shortVideoTimelineAdapter';
import { timelineLayoutFingerprint } from 'helpers/shortVideoTimelineLayout';
import ShortVideoAudioWaveform from 'helpers/shortVideoAudioWaveform';
import {
    isShortVideoTimelineDebugEnabled,
    shortVideoTimelineDebug,
    summarizeManifestLayout,
    summarizeTimelineRows,
} from 'helpers/shortVideoTimelineDebug';

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

function getTimelineScrollGrids(host: HTMLElement): HTMLElement[] {
    const timeGrid = host.querySelector(
        '.timeline-editor-time-area .ReactVirtualized__Grid'
    ) as HTMLElement | null;
    const editGrid = host.querySelector(
        '.timeline-editor-edit-area .ReactVirtualized__Grid'
    ) as HTMLElement | null;
    return [timeGrid, editGrid].filter(Boolean) as HTMLElement[];
}

function getTimelineEditGrid(host: HTMLElement): HTMLElement | null {
    return host.querySelector(
        '.timeline-editor-edit-area .ReactVirtualized__Grid'
    ) as HTMLElement | null;
}

function getTimelineHorizontalScrollLeft(host: HTMLElement): number {
    const grids = getTimelineScrollGrids(host);
    if (grids.length === 0) {
        return 0;
    }
    return grids[0].scrollLeft;
}

function scrollTimelineHorizontally(host: HTMLElement, delta: number): void {
    getTimelineScrollGrids(host).forEach((grid) => {
        grid.scrollLeft += delta;
    });
}

function formatPackGapLabel(gapSec: number): string {
    if (gapSec === 0) {
        return 'Không gap (0s)';
    }
    const text = Number.isInteger(gapSec) ? String(gapSec) : gapSec.toFixed(1).replace('.', ',');
    return `Gap ${text}s`;
}

function TrackLabelRow({
    label,
    height,
    packMenuTitle,
    onPackWithGap,
    packDisabled,
    editing,
    editValue,
    onEditChange,
    onEditBlur,
    onEditKeyDown,
    onRename,
}: {
    label: string;
    height: number;
    packMenuTitle: string;
    onPackWithGap: (gapSec: number) => void;
    packDisabled?: boolean;
    editing?: boolean;
    editValue?: string;
    onEditChange?: (value: string) => void;
    onEditBlur?: () => void;
    onEditKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onRename?: () => void;
}) {
    const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
    const menuOpen = Boolean(menuAnchor);

    return (
        <Box
            sx={{
                height,
                display: 'flex',
                alignItems: 'center',
                gap: 0.25,
                px: 0.5,
                minWidth: 0,
            }}
        >
            {editing ? (
                <TextField
                    autoFocus
                    size="small"
                    variant="outlined"
                    value={editValue ?? ''}
                    onChange={(event) => onEditChange?.(event.target.value)}
                    onBlur={onEditBlur}
                    onKeyDown={onEditKeyDown}
                    onMouseDown={(event) => event.stopPropagation()}
                    inputProps={{
                        maxLength: 80,
                        style: {
                            color: '#f3f4f6',
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
                            bgcolor: 'rgba(255,255,255,0.08)',
                            '& fieldset': {
                                borderColor: 'rgba(255,255,255,0.2)',
                            },
                        },
                    }}
                />
            ) : (
                <Typography
                    component="span"
                    sx={{
                        flex: 1,
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'grey.200',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1.2,
                    }}
                >
                    {label}
                </Typography>
            )}
            <Tooltip title="Tùy chọn track">
                <span>
                    <IconButton
                        size="small"
                        aria-label="Tùy chọn track"
                        disabled={packDisabled && !onRename}
                        onClick={(event) => setMenuAnchor(event.currentTarget)}
                        sx={{
                            width: 22,
                            height: 22,
                            color: 'grey.400',
                            flexShrink: 0,
                            '&:hover': { color: 'grey.200', bgcolor: 'rgba(255,255,255,0.08)' },
                        }}
                    >
                        <MoreHorizIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                </span>
            </Tooltip>
            <Menu
                anchorEl={menuAnchor}
                open={menuOpen}
                onClose={() => setMenuAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: { minWidth: 180, mt: 0.5 },
                    },
                }}
            >
                <MenuItem
                    disabled={!onRename}
                    onClick={() => {
                        onRename?.();
                        setMenuAnchor(null);
                    }}
                >
                    Đổi tên track
                </MenuItem>
                <MenuItem disabled sx={{ opacity: 1, fontSize: 12, color: 'text.secondary' }}>
                    {packMenuTitle}
                </MenuItem>
                {TIMELINE_PACK_GAP_OPTIONS_SEC.map((gapSec) => (
                    <MenuItem
                        key={gapSec}
                        disabled={packDisabled}
                        onClick={() => {
                            onPackWithGap(gapSec);
                            setMenuAnchor(null);
                        }}
                        sx={{ pl: 3 }}
                    >
                        {formatPackGapLabel(gapSec)}
                    </MenuItem>
                ))}
            </Menu>
        </Box>
    );
}

function applyRowSelection(
    rows: TimelineRow[],
    selectedVisualClipId: string,
    selectedNarrationSceneId: string
): TimelineRow[] {
    return rows.map((row) => ({
        ...row,
        actions: row.actions.map((action) => {
            const extended = action as ShortVideoTimelineAction;
            const kind = extended.data?.kind;
            if (kind === 'visual') {
                const clipId = extended.data?.clipId || action.id;
                return { ...action, selected: clipId === selectedVisualClipId };
            }
            if (kind === 'narration') {
                const sceneId = extended.data?.sceneId || action.id.replace(/^narr_/, '');
                return { ...action, selected: sceneId === selectedNarrationSceneId };
            }
            return action;
        }),
    }));
}

function formatPlaybackClock(totalSec: number): string {
    const clamped = Math.max(0, totalSec);
    const minutes = Math.floor(clamped / 60);
    const remainder = clamped % 60;
    const wholeSec = Math.floor(remainder);
    const tenths = Math.floor((remainder - wholeSec) * 10);
    return `${minutes}:${String(wholeSec).padStart(2, '0')}.${tenths}`;
}

type TimelineItemLabelEditorProps = {
    editing: boolean;
    editValue: string;
    label: string;
    onEditChange: (value: string) => void;
    onEditBlur: () => void;
    onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
};

function TimelineItemLabelEditor({
    editing,
    editValue,
    label,
    onEditChange,
    onEditBlur,
    onEditKeyDown,
}: TimelineItemLabelEditorProps) {
    if (editing) {
        return (
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
        );
    }
    return (
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
    );
}

function NarrationActionBlock({
    action,
    editing,
    editValue,
    onEditChange,
    onEditBlur,
    onEditKeyDown,
    previewOffsetY = 0,
}: {
    action: ShortVideoTimelineAction;
    editing: boolean;
    editValue: string;
    onEditChange: (value: string) => void;
    onEditBlur: () => void;
    onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    previewOffsetY?: number;
}) {
    const label = action.data?.label || action.id;
    const status = action.data?.status;
    const audioPeaks = action.data?.audioPeaks;
    const isPending = status === 'pending';
    const isRunning = status === 'running';
    const isActive = Boolean(action.selected);
    const showWaveform = status === 'ready' && Array.isArray(audioPeaks) && audioPeaks.length > 0;
    return (
        <Box
            title={isPending ? 'Chưa có audio — cần sinh TTS hoặc thêm lời thoại' : undefined}
            sx={{
                width: '100%',
                height: '100%',
                position: 'relative',
                px: 1,
                display: 'flex',
                alignItems: 'center',
                bgcolor: isPending
                    ? 'rgba(185, 28, 28, 0.68)'
                    : (isRunning ? 'rgba(30, 58, 95, 0.68)' : 'rgba(107, 114, 128, 0.68)'),
                color: isPending ? '#fee2e2' : '#f3f4f6',
                fontSize: 11,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                borderRadius: 1,
                border: isActive
                    ? '2px solid #fbbf24'
                    : isPending
                        ? '1px solid #fca5a5'
                        : (isRunning ? '1px dashed rgba(96, 165, 250, 0.9)' : '1px solid rgba(255,255,255,0.16)'),
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                backdropFilter: 'saturate(110%)',
                transform: previewOffsetY !== 0 ? `translateY(${previewOffsetY}px)` : undefined,
                zIndex: previewOffsetY !== 0 ? 20 : undefined,
            }}
        >
            {showWaveform ? <ShortVideoAudioWaveform peaks={audioPeaks} /> : null}
            <Box
                sx={{
                    position: 'relative',
                    zIndex: 1,
                    minWidth: 0,
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    ...(showWaveform
                        ? {
                            px: 0.5,
                            py: 0.25,
                            borderRadius: 0.5,
                            background: 'linear-gradient(90deg, rgba(55, 65, 81, 0.72) 0%, rgba(55, 65, 81, 0.45) 100%)',
                        }
                        : undefined),
                }}
            >
                <TimelineItemLabelEditor
                    editing={editing}
                    editValue={editValue}
                    label={label}
                    onEditChange={onEditChange}
                    onEditBlur={onEditBlur}
                    onEditKeyDown={onEditKeyDown}
                />
            </Box>
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
    previewOffsetY = 0,
}: {
    action: ShortVideoTimelineAction;
    editing: boolean;
    editValue: string;
    onEditChange: (value: string) => void;
    onEditBlur: () => void;
    onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    previewOffsetY?: number;
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
                bgcolor: 'rgba(30, 58, 138, 0.72)',
                color: '#eff6ff',
                fontSize: 11,
                overflow: 'hidden',
                borderRadius: 1,
                border: action.selected
                    ? '2px solid'
                    : '1px solid',
                borderColor: action.selected ? 'warning.main' : 'rgba(147, 197, 253, 0.45)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.1)',
                backdropFilter: 'saturate(115%)',
                transform: previewOffsetY !== 0 ? `translateY(${previewOffsetY}px)` : undefined,
                zIndex: previewOffsetY !== 0 ? 20 : undefined,
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
            <TimelineItemLabelEditor
                editing={editing}
                editValue={editValue}
                label={label}
                onEditChange={onEditChange}
                onEditBlur={onEditBlur}
                onEditKeyDown={onEditKeyDown}
            />
        </Box>
    );
}

function GenericTimelineActionBlock({
    action,
    editing,
    editValue,
    onEditChange,
    onEditBlur,
    onEditKeyDown,
    previewOffsetY = 0,
}: {
    action: ShortVideoTimelineAction;
    editing: boolean;
    editValue: string;
    onEditChange: (value: string) => void;
    onEditBlur: () => void;
    onEditKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    previewOffsetY?: number;
}) {
    const label = action.data?.label || action.id;
    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                px: 1,
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'rgba(55, 65, 81, 0.68)',
                color: '#f3f4f6',
                fontSize: 11,
                overflow: 'hidden',
                borderRadius: 1,
                border: action.selected ? '2px solid #fbbf24' : '1px solid rgba(255,255,255,0.16)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)',
                backdropFilter: 'saturate(110%)',
                transform: previewOffsetY !== 0 ? `translateY(${previewOffsetY}px)` : undefined,
                zIndex: previewOffsetY !== 0 ? 20 : undefined,
            }}
        >
            <TimelineItemLabelEditor
                editing={editing}
                editValue={editValue}
                label={label}
                onEditChange={onEditChange}
                onEditBlur={onEditBlur}
                onEditKeyDown={onEditKeyDown}
            />
        </Box>
    );
}

function resolveTimelineItemLabelForEdit(
    manifest: ShortVideoRenderManifest,
    _rowId: string,
    action: ShortVideoTimelineAction
): string {
    const itemId = action.data?.clipId || action.data?.sceneId || action.id;
    if (action.data?.kind === 'visual') {
        const clip = (manifest.visual_clips ?? []).find((entry) => entry.id === itemId);
        return clip?.label?.trim() || itemId;
    }
    if (action.data?.kind === 'narration') {
        const scene = manifest.scenes.find((entry) => entry.id === itemId);
        if (!scene) {
            return itemId;
        }
        return scene.timeline_label?.trim()
            || resolveSceneHeadlineText(scene).trim()
            || scene.id;
    }
    return action.data?.label?.trim() || itemId;
}

function moveActionToTargetRow(
    rows: TimelineRow[],
    actionId: string,
    toRowId: string
): { rows: TimelineRow[]; fromRowId: string | null } {
    const fromRow = rows.find((row) => row.actions.some((action) => action.id === actionId));
    if (!fromRow || fromRow.id === toRowId) {
        return { rows, fromRowId: fromRow?.id ?? null };
    }
    return {
        rows: moveActionBetweenRows(rows, actionId, fromRow.id, toRowId),
        fromRowId: fromRow.id,
    };
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
    const trackLabelsScrollRef = React.useRef<HTMLDivElement | null>(null);
    const syncingVerticalScrollRef = React.useRef(false);
    const fps = manifest.fps || 30;
    const [committedOverlayManifest, setCommittedOverlayManifest] = React.useState<ShortVideoRenderManifest | null>(null);
    const [committedRowsOverlay, setCommittedRowsOverlay] = React.useState<TimelineRow[] | null>(null);
    const displayManifest = committedOverlayManifest ?? manifest;
    const contentDurationSec = Math.max(0.1, getProjectTimelineDurationSec(displayManifest));
    const timelineDurationSec = contentDurationSec;
    const timelineWorkspaceEndSec = timelineEditorWorkspaceEndSec(contentDurationSec);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);
    const [editingActionKey, setEditingActionKey] = React.useState('');
    const [editingLabelDraft, setEditingLabelDraft] = React.useState('');
    const [editingTrackId, setEditingTrackId] = React.useState('');
    const [editingTrackNameDraft, setEditingTrackNameDraft] = React.useState('');
    const [dragPreviewTarget, setDragPreviewTarget] = React.useState<{ actionId: string; rowId: string } | null>(null);
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

    const timelineRef = React.useRef<TimelineState>(null);
    const syncingFromPlayerRef = React.useRef(false);
    const manifestRef = React.useRef(manifest);
    const previousManifestRef = React.useRef(manifest);
    const dragBaseManifestRef = React.useRef<ShortVideoRenderManifest | null>(null);
    const latestDragRowsRef = React.useRef<TimelineRow[] | null>(null);
    const actionDragSessionRef = React.useRef<{
        actionId: string;
        currentRowId: string;
        pendingRowId: string;
        lastClientY: number;
        cleanup?: () => void;
    } | null>(null);

    const timelineTracks = React.useMemo(
        () => resolveTimelineTracks(displayManifest),
        [displayManifest]
    );

    const editorData = React.useMemo(() => {
        if (committedRowsOverlay) {
            return applyRowSelection(
                committedRowsOverlay,
                selectedVisualClipId,
                selectedNarrationSceneId
            );
        }
        return manifestToTimelineRows(
            displayManifest,
            selectedVisualClipId,
            narrationRunningSceneIds,
            selectedNarrationSceneId
        );
    }, [
        committedRowsOverlay,
        displayManifest,
        selectedVisualClipId,
        narrationRunningSceneIds,
        selectedNarrationSceneId,
    ]);

    React.useEffect(() => {
        if (!isShortVideoTimelineDebugEnabled()) {
            return;
        }
        shortVideoTimelineDebug('Timeline', 'editorData.render', {
            source: committedRowsOverlay ? 'committedRows' : committedOverlayManifest ? 'committedManifest' : 'manifestProp',
            rows: summarizeTimelineRows(editorData),
            layout: summarizeManifestLayout(displayManifest),
        });
    }, [editorData, displayManifest, committedRowsOverlay, committedOverlayManifest]);

    const syncPlayerTime = React.useCallback(
        (timelineTimeSec: number) => {
            const clamped = Math.max(0, Math.min(timelineTimeSec, timelineDurationSec));
            playerRef.current?.seekTo(Math.round(clamped * fps));
            setCurrentTimeSec(clamped);
        },
        [fps, playerRef, timelineDurationSec]
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
        const overlaySynced = !committedOverlayManifest
            || timelineLayoutFingerprint(manifest) === timelineLayoutFingerprint(committedOverlayManifest);
        if (!overlaySynced && committedOverlayManifest) {
            shortVideoTimelineDebug('Timeline', 'manifestProp.stale', {
                propLayout: summarizeManifestLayout(manifest),
                overlayLayout: summarizeManifestLayout(committedOverlayManifest),
            });
        }
        if (overlaySynced) {
            manifestRef.current = manifest;
            if (!dragBaseManifestRef.current) {
                previousManifestRef.current = manifest;
            }
        }
        if (!committedOverlayManifest) {
            return;
        }
        if (timelineLayoutFingerprint(manifest) === timelineLayoutFingerprint(committedOverlayManifest)) {
            shortVideoTimelineDebug('Timeline', 'overlay.clear', {
                reason: 'manifest prop synced',
                layout: summarizeManifestLayout(manifest),
            });
            setCommittedOverlayManifest(null);
            setCommittedRowsOverlay(null);
        }
    }, [manifest, committedOverlayManifest]);

    const beginTimelineDragSession = React.useCallback(() => {
        dragBaseManifestRef.current = manifestRef.current;
        shortVideoTimelineDebug('Timeline', 'drag.start', {
            layout: summarizeManifestLayout(manifestRef.current),
        });
    }, []);

    const endTimelineDragSession = React.useCallback(() => {
        shortVideoTimelineDebug('Timeline', 'drag.end', {
            hasCommittedOverlay: Boolean(committedOverlayManifest),
            hasCommittedRows: Boolean(committedRowsOverlay),
        });
        window.setTimeout(() => {
            dragBaseManifestRef.current = null;
        }, 0);
    }, [committedOverlayManifest, committedRowsOverlay]);

    const stopActionDragSession = React.useCallback((shouldEnd = true) => {
        actionDragSessionRef.current?.cleanup?.();
        actionDragSessionRef.current = null;
        latestDragRowsRef.current = null;
        setDragPreviewTarget(null);
        if (shouldEnd) {
            endTimelineDragSession();
        }
    }, [endTimelineDragSession]);

    const handleActionMoveStart = React.useCallback(
        ({ action, row }: { action: ShortVideoTimelineAction; row: TimelineRow }) => {
            beginTimelineDragSession();
            const onMouseUp = () => {
                stopActionDragSession(true);
            };
            const onMouseMove = (event: MouseEvent) => {
                const session = actionDragSessionRef.current;
                const host = timelineHostRef.current;
                const editGrid = host ? getTimelineEditGrid(host) : null;
                if (!session || !editGrid) {
                    return;
                }
                if (event.buttons === 0) {
                    stopActionDragSession(true);
                    return;
                }
                session.lastClientY = event.clientY;
                const targetRowId = resolveTrackRowIdFromPointer(
                    manifestRef.current,
                    event.clientY,
                    editGrid,
                    TIMELINE_EDIT_AREA_TOP_GAP
                );
                if (targetRowId) {
                    session.pendingRowId = targetRowId;
                    setDragPreviewTarget((prev) => {
                        if (prev?.actionId === session.actionId && prev.rowId === targetRowId) {
                            return prev;
                        }
                        return { actionId: session.actionId, rowId: targetRowId };
                    });
                }
            };
            document.addEventListener('mousemove', onMouseMove, { passive: true });
            document.addEventListener('mouseup', onMouseUp, { passive: true });
            actionDragSessionRef.current = {
                actionId: action.id,
                currentRowId: row.id,
                pendingRowId: row.id,
                lastClientY: 0,
                cleanup: () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                },
            };
            setDragPreviewTarget({ actionId: action.id, rowId: row.id });
            latestDragRowsRef.current = committedRowsOverlay ?? editorData;
        },
        [beginTimelineDragSession, committedRowsOverlay, editorData, stopActionDragSession]
    );

    const handleActionMoveEnd = React.useCallback(() => {
        stopActionDragSession(true);
    }, [stopActionDragSession]);

    const handleActionMoving = React.useCallback((_params: {
        action: ShortVideoTimelineAction;
        row: TimelineRow;
        start: number;
        end: number;
    }): boolean => {
        const session = actionDragSessionRef.current;
        if (!session) {
            return true;
        }
        if (!latestDragRowsRef.current) {
            latestDragRowsRef.current = committedRowsOverlay ?? editorData;
        }
        return true;
    }, [committedRowsOverlay, editorData]);

    const rowIndexById = React.useMemo(() => {
        const map = new Map<string, number>();
        timelineTracks.forEach((track, idx) => {
            map.set(track.id, idx);
        });
        return map;
    }, [timelineTracks]);

    const resolvePreviewOffsetY = React.useCallback((actionId: string, sourceRowId: string): number => {
        if (!dragPreviewTarget || dragPreviewTarget.actionId !== actionId) {
            return 0;
        }
        const targetRowId = dragPreviewTarget.rowId;
        if (!targetRowId || targetRowId === sourceRowId) {
            return 0;
        }
        const sourceIndex = rowIndexById.get(sourceRowId);
        const targetIndex = rowIndexById.get(targetRowId);
        if (sourceIndex === undefined || targetIndex === undefined) {
            return 0;
        }
        if (sourceIndex === targetIndex) {
            return 0;
        }
        let offset = 0;
        if (targetIndex > sourceIndex) {
            for (let i = sourceIndex; i < targetIndex; i += 1) {
                const rowId = timelineTracks[i]?.id;
                if (rowId) {
                    offset += getTrackRowHeight(rowId);
                }
            }
            return offset;
        }
        for (let i = targetIndex; i < sourceIndex; i += 1) {
            const rowId = timelineTracks[i]?.id;
            if (rowId) {
                offset -= getTrackRowHeight(rowId);
            }
        }
        return offset;
    }, [dragPreviewTarget, rowIndexById, timelineTracks]);

    const applyCrossRowMoveIfNeeded = React.useCallback((rows: TimelineRow[]): TimelineRow[] => {
        const session = actionDragSessionRef.current;
        if (!session) {
            return rows;
        }
        const targetRowId = session.pendingRowId;
        if (!targetRowId) {
            return rows;
        }
        const moved = moveActionToTargetRow(rows, session.actionId, targetRowId);
        if (moved.fromRowId && moved.fromRowId !== targetRowId) {
            session.currentRowId = targetRowId;
        }
        return moved.rows;
    }, []);

    const commitManifestChange = React.useCallback(
        (next: ShortVideoRenderManifest, rowsFromTimeline?: TimelineRow[]) => {
            previousManifestRef.current = next;
            manifestRef.current = next;
            if (rowsFromTimeline) {
                setCommittedRowsOverlay(rowsFromTimeline);
            }
            setCommittedOverlayManifest(next);
            shortVideoTimelineDebug('Timeline', 'commit', {
                rows: rowsFromTimeline ? summarizeTimelineRows(rowsFromTimeline) : undefined,
                nextLayout: summarizeManifestLayout(next),
                propLayout: summarizeManifestLayout(manifest),
            });
            onManifestChange(next);
        },
        [manifest, onManifestChange]
    );

    const handleTimelineChange = React.useCallback(
        (rows: TimelineRow[]) => {
            const currentManifest = manifestRef.current;
            if (!manifestHasEditableVisualTimeline(currentManifest)) {
                shortVideoTimelineDebug('Timeline', 'onChange.rejected', { reason: 'no visual track' });
                return false;
            }
            latestDragRowsRef.current = rows;
            if (!dragBaseManifestRef.current) {
                dragBaseManifestRef.current = previousManifestRef.current;
            }
            const rippleBase = dragBaseManifestRef.current;
            const rowsAfterCrossMove = applyCrossRowMoveIfNeeded(rows);
            latestDragRowsRef.current = rowsAfterCrossMove;
            const next = applyTimelineRowsToManifest(rowsAfterCrossMove, currentManifest, rippleBase);
            const overlayRows = manifestToTimelineRows(
                next,
                selectedVisualClipId,
                narrationRunningSceneIds,
                selectedNarrationSceneId,
                rowsAfterCrossMove
            );
            commitManifestChange(next, overlayRows);
            return true;
        },
        [commitManifestChange, narrationRunningSceneIds, selectedNarrationSceneId, selectedVisualClipId, applyCrossRowMoveIfNeeded]
    );

    const commitPackedManifest = React.useCallback(
        (next: ShortVideoRenderManifest) => {
            const overlayRows = manifestToTimelineRows(
                next,
                selectedVisualClipId,
                narrationRunningSceneIds,
                selectedNarrationSceneId
            );
            commitManifestChange(next, overlayRows);
        },
        [
            commitManifestChange,
            narrationRunningSceneIds,
            selectedNarrationSceneId,
            selectedVisualClipId,
        ]
    );

    const handlePackTrack = React.useCallback((trackId: string, gapSec: number) => {
        const source = manifestRef.current;
        commitPackedManifest(packTimelineTrackSequential(source, trackId, gapSec));
    }, [commitPackedManifest]);

    const handleAddTrack = React.useCallback(() => {
        const next = addTimelineTrack(manifestRef.current);
        commitPackedManifest(next);
    }, [commitPackedManifest]);

    const handleStartRenameTrack = React.useCallback((trackId: string) => {
        const track = resolveTimelineTracks(manifestRef.current).find((entry) => entry.id === trackId);
        setEditingTrackId(trackId);
        setEditingTrackNameDraft(track?.name ?? '');
    }, []);

    const handleCommitRenameTrack = React.useCallback(() => {
        if (!editingTrackId) {
            return;
        }
        const trimmed = editingTrackNameDraft.trim();
        const tracks = resolveTimelineTracks(manifestRef.current);
        const current = tracks.find((entry) => entry.id === editingTrackId);
        if (current && trimmed && trimmed !== current.name) {
            commitManifestChange(
                updateTimelineTrackNameInManifest(manifestRef.current, editingTrackId, trimmed)
            );
        }
        setEditingTrackId('');
        setEditingTrackNameDraft('');
    }, [commitManifestChange, editingTrackId, editingTrackNameDraft]);

    const handleTrackRenameKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleCommitRenameTrack();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                setEditingTrackId('');
                setEditingTrackNameDraft('');
            }
        },
        [handleCommitRenameTrack]
    );

    const countTrackItems = React.useCallback((trackId: string, source: ShortVideoRenderManifest = manifestRef.current) => {
        const sceneCount = source.scenes.filter(
            (scene) => (scene.timeline_track_id?.trim() || TIMELINE_DEFAULT_TRACK_NARRATION_ID) === trackId
        ).length;
        const clipCount = (source.visual_clips ?? []).filter(
            (clip) => (clip.timeline_track_id?.trim() || TIMELINE_DEFAULT_TRACK_VISUAL_ID) === trackId
        ).length;
        return sceneCount + clipCount;
    }, []);

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
        const scrollLeft = getTimelineHorizontalScrollLeft(root);
        const absoluteLeft = Math.max(timelineStartLeft, localX + scrollLeft);
        const time = ((absoluteLeft - timelineStartLeft) / timelineScaleWidth) * timelineScale;
        const clamped = Math.max(0, Math.min(time, timelineDurationSec));

        syncTimelineCursor(clamped);
        syncPlayerTime(clamped);
    }, [
        timelineDurationSec,
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
        const added = addVisualClipAtSec(manifest, currentTimeSec);
        const next = { ...added, duration_sec: getProjectTimelineDurationSec(added) };
        commitManifestChange(next);
        const newClip = next.visual_clips?.[next.visual_clips.length - 1];
        if (newClip?.id) {
            onSelectVisualClip(newClip.id);
        }
    }, [commitManifestChange, currentTimeSec, manifest, onSelectVisualClip]);

    const handleCreateNarrationAtSec = React.useCallback(
        (manifestTimelineSec: number, trackId = TIMELINE_DEFAULT_TRACK_NARRATION_ID) => {
            const created = addNarrationSceneAtCompositionSec(manifest, manifestTimelineSec, trackId);
            commitManifestChange(created.manifest);
            onSelectVisualClip('');
            onSelectNarrationScene?.(created.createdSceneId);
            onSeekScene?.(created.createdSceneId);
            syncPlayerTime(manifestTimelineSec);
        },
        [commitManifestChange, manifest, onSeekScene, onSelectNarrationScene, onSelectVisualClip, syncPlayerTime]
    );

    const handleDeleteVisual = React.useCallback(() => {
        if (!selectedVisualClipId) {
            return;
        }
        const next = removeVisualClipFromManifest(manifest, selectedVisualClipId);
        commitManifestChange(next);
        onSelectVisualClip('');
    }, [commitManifestChange, manifest, onSelectVisualClip, selectedVisualClipId]);

    const handleStartRenameItem = React.useCallback((
        rowId: string,
        action: ShortVideoTimelineAction
    ) => {
        setEditingActionKey(timelineActionEditKey(rowId, action));
        setEditingLabelDraft(resolveTimelineItemLabelForEdit(manifestRef.current, rowId, action));
    }, []);

    const handleCommitRenameItem = React.useCallback(() => {
        if (!editingActionKey) {
            return;
        }
        const separatorIndex = editingActionKey.indexOf(':');
        if (separatorIndex <= 0) {
            setEditingActionKey('');
            setEditingLabelDraft('');
            return;
        }
        const rowId = editingActionKey.slice(0, separatorIndex);
        const itemId = editingActionKey.slice(separatorIndex + 1);
        const nextLabel = editingLabelDraft.trim();
        const currentManifest = manifestRef.current;
        const isVisualItem = (currentManifest.visual_clips ?? []).some((entry) => entry.id === itemId);

        if (isVisualItem) {
            const pseudoAction = {
                id: itemId,
                data: { kind: 'visual' as const, clipId: itemId },
            } as ShortVideoTimelineAction;
            const previousLabel = resolveTimelineItemLabelForEdit(
                currentManifest,
                rowId,
                pseudoAction
            );
            if (previousLabel !== nextLabel) {
                const nextManifest = updateVisualClipInManifest(currentManifest, itemId, {
                    label: nextLabel || undefined,
                });
                commitManifestChange(nextManifest);
            }
        } else {
            const pseudoAction = {
                id: itemId,
                data: { kind: 'narration' as const, sceneId: itemId },
            } as ShortVideoTimelineAction;
            const previousLabel = resolveTimelineItemLabelForEdit(
                currentManifest,
                rowId,
                pseudoAction
            );
            if (previousLabel !== nextLabel) {
                const nextManifest = updateSceneTimelineLabelInManifest(
                    currentManifest,
                    itemId,
                    nextLabel || undefined
                );
                commitManifestChange(nextManifest);
            }
        }

        setEditingActionKey('');
        setEditingLabelDraft('');
    }, [commitManifestChange, editingActionKey, editingLabelDraft]);

    const handleRenameKeyDown = React.useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleCommitRenameItem();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                setEditingActionKey('');
                setEditingLabelDraft('');
            }
        },
        [handleCommitRenameItem]
    );

    const handleDoubleClickAction = React.useCallback(
        (
            _e: React.MouseEvent<HTMLElement>,
            param: { action: ShortVideoTimelineAction; row: TimelineRow; time: number }
        ) => {
            const action = param.action as ShortVideoTimelineAction;
            const itemId = action.data?.clipId || action.data?.sceneId;
            if (!itemId) {
                return;
            }
            handleStartRenameItem(param.row.id, action);
        },
        [handleStartRenameItem]
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
            if (param.row.id === TIMELINE_DEFAULT_TRACK_NARRATION_ID) {
                handleCreateNarrationAtSec(param.time, param.row.id);
                return;
            }
            const added = addVisualClipAtSec(manifest, param.time, {
                timeline_track_id: param.row.id,
            });
            const next = { ...added, duration_sec: getProjectTimelineDurationSec(added) };
            commitManifestChange(next);
            const newClip = next.visual_clips?.[next.visual_clips.length - 1];
            if (newClip?.id) {
                onSelectVisualClip(newClip.id);
            }
        },
        [commitManifestChange, handleCreateNarrationAtSec, manifest, onSelectVisualClip]
    );

    const visualTrackEnabled = manifestHasEditableVisualTimeline(manifest);
    const hasVisualClips = manifestUsesVisualClips(manifest);
    const minScaleCount = Math.max(20, Math.ceil(timelineWorkspaceEndSec) + 2);
    const rulerHeight = TIMELINE_RULER_HEIGHT;
    /** Khoảng trống phía trên ruler để đầu playhead nhô lên (giống editor video). */
    const cursorHeadOverflow = 10;
    const maxTimelineExtraHeight = 320;
    const minTimelineCollapsedContentHeight = 8;
    const tracksHeight =
        TIMELINE_EDIT_AREA_TOP_GAP
        + timelineTracks.reduce((sum, track) => sum + getTrackRowHeight(track.id), 0);
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
    const tracksViewportHeight = Math.max(0, timelineContentHeight - rulerHeight);
    const isTimelineCollapsed = timelineContentHeight <= minTimelineCollapsedContentHeight + 2;

    React.useEffect(() => {
        const host = timelineHostRef.current;
        if (!host || !visualTrackEnabled) {
            return;
        }

        const onWheel = (event: WheelEvent) => {
            if (event.shiftKey) {
                return;
            }
            if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) {
                return;
            }
            if (event.deltaY === 0) {
                return;
            }
            event.preventDefault();
            scrollTimelineHorizontally(host, event.deltaY);
        };

        host.addEventListener('wheel', onWheel, { passive: false });
        return () => {
            host.removeEventListener('wheel', onWheel);
        };
    }, [visualTrackEnabled, editorData]);

    React.useEffect(() => {
        const host = timelineHostRef.current;
        const labelsEl = trackLabelsScrollRef.current;
        if (!host || !labelsEl || !visualTrackEnabled) {
            return;
        }

        let editGrid: HTMLElement | null = null;
        let syncFromLabels: (() => void) | null = null;
        let syncFromEdit: (() => void) | null = null;
        let cancelled = false;

        const attach = () => {
            if (cancelled) {
                return;
            }
            editGrid = getTimelineEditGrid(host);
            if (!editGrid) {
                window.requestAnimationFrame(attach);
                return;
            }

            syncFromLabels = () => {
                if (!editGrid || syncingVerticalScrollRef.current) {
                    return;
                }
                syncingVerticalScrollRef.current = true;
                editGrid.scrollTop = labelsEl.scrollTop;
                syncingVerticalScrollRef.current = false;
            };

            syncFromEdit = () => {
                if (!editGrid || syncingVerticalScrollRef.current) {
                    return;
                }
                syncingVerticalScrollRef.current = true;
                labelsEl.scrollTop = editGrid.scrollTop;
                syncingVerticalScrollRef.current = false;
            };

            labelsEl.addEventListener('scroll', syncFromLabels, { passive: true });
            editGrid.addEventListener('scroll', syncFromEdit, { passive: true });
        };

        attach();

        return () => {
            cancelled = true;
            if (syncFromLabels) {
                labelsEl.removeEventListener('scroll', syncFromLabels);
            }
            if (syncFromEdit && editGrid) {
                editGrid.removeEventListener('scroll', syncFromEdit);
            }
        };
    }, [visualTrackEnabled, editorData, tracksViewportHeight, tracksHeight]);

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
                    {formatPlaybackClock(currentTimeSec)} / {formatPlaybackClock(timelineDurationSec)}
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
                        width: 100,
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        height: timelineTotalHeight - cursorHeadOverflow,
                        borderRight: 1,
                        borderColor: 'rgba(255,255,255,0.12)',
                        bgcolor: '#141618',
                        position: 'relative',
                        zIndex: 110,
                    }}
                >
                    <Box
                        sx={{
                            height: rulerHeight,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 0.5,
                        }}
                    >
                        <Button
                            size="small"
                            variant="text"
                            onClick={handleAddTrack}
                            sx={{
                                minWidth: 0,
                                px: 0.5,
                                py: 0,
                                fontSize: 10,
                                lineHeight: 1.2,
                                color: 'grey.300',
                            }}
                        >
                            Thêm track
                        </Button>
                    </Box>
                    <Box
                        ref={trackLabelsScrollRef}
                        data-timeline-track-labels
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            height: tracksViewportHeight,
                            maxHeight: tracksViewportHeight,
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            scrollbarWidth: 'thin',
                            scrollbarColor: '#313132 #191b1d',
                            '&::-webkit-scrollbar': {
                                width: 6,
                            },
                            '&::-webkit-scrollbar-thumb': {
                                background: '#4a4a4d',
                                borderRadius: '6px',
                            },
                            '&::-webkit-scrollbar-track': {
                                background: '#141618',
                            },
                        }}
                    >
                        <Box
                            sx={{
                                minHeight: tracksHeight,
                                pt: `${TIMELINE_EDIT_AREA_TOP_GAP}px`,
                                boxSizing: 'border-box',
                            }}
                        >
                            {timelineTracks.map((track) => (
                                <TrackLabelRow
                                    key={track.id}
                                    label={track.name}
                                    height={getTrackRowHeight(track.id)}
                                    packMenuTitle="Sắp xếp nối tiếp theo thời gian"
                                    onPackWithGap={(gapSec) => handlePackTrack(track.id, gapSec)}
                                    packDisabled={countTrackItems(track.id, manifest) < 2}
                                    editing={editingTrackId === track.id}
                                    editValue={editingTrackNameDraft}
                                    onEditChange={setEditingTrackNameDraft}
                                    onEditBlur={handleCommitRenameTrack}
                                    onEditKeyDown={handleTrackRenameKeyDown}
                                    onRename={() => handleStartRenameTrack(track.id)}
                                />
                            ))}
                        </Box>
                    </Box>
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
                        '& .timeline-editor-time-area': {
                            position: 'relative',
                            zIndex: 1,
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
                        '& .timeline-editor-action .timeline-editor-action-left-stretch:after, & .timeline-editor-action .timeline-editor-action-right-stretch:after': {
                            opacity: '0 !important',
                            border: '0 !important',
                        },
                        '& .timeline-editor-edit-area .ReactVirtualized__Grid': {
                            overflow: 'scroll !important',
                            overflowX: 'scroll !important',
                            overflowY: 'auto !important',
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
                        rowHeight={TIMELINE_TRACK_ROW_HEIGHT}
                        gridSnap
                        dragLine
                        disableDrag={!visualTrackEnabled}
                        autoScroll
                        style={{
                            width: '100%',
                            height: timelineTotalHeight - cursorHeadOverflow,
                        }}
                        onChange={handleTimelineChange}
                        onActionMoveStart={handleActionMoveStart}
                        onActionMoving={handleActionMoving}
                        onActionResizeStart={beginTimelineDragSession}
                        onActionMoveEnd={handleActionMoveEnd}
                        onActionResizeEnd={endTimelineDragSession}
                        onCursorDrag={handleCursorDrag}
                        onClickTimeArea={handleClickTimeArea}
                        onClickActionOnly={handleClickActionOnly}
                        onDoubleClickAction={handleDoubleClickActionWithGuard}
                        onDoubleClickRow={handleDoubleClickRow}
                        getActionRender={(action, row) => {
                            const extended = action as ShortVideoTimelineAction;
                            const isEditing = editingActionKey === timelineActionEditKey(row.id, extended);
                            const previewOffsetY = resolvePreviewOffsetY(extended.id, row.id);
                            const labelEditorProps = {
                                editing: isEditing,
                                editValue: editingLabelDraft,
                                onEditChange: setEditingLabelDraft,
                                onEditBlur: handleCommitRenameItem,
                                onEditKeyDown: handleRenameKeyDown,
                                previewOffsetY,
                            };
                            if (extended.data?.kind === 'narration') {
                                return (
                                    <NarrationActionBlock
                                        action={extended}
                                        {...labelEditorProps}
                                    />
                                );
                            }
                            if (extended.data?.kind === 'visual') {
                                return (
                                    <VisualActionBlock
                                        action={extended}
                                        {...labelEditorProps}
                                    />
                                );
                            }
                            return (
                                <GenericTimelineActionBlock
                                    action={extended}
                                    {...labelEditorProps}
                                />
                            );
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
