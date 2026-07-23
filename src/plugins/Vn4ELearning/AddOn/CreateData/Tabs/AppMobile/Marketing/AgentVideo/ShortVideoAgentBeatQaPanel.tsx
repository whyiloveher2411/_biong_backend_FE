import React from 'react';
import {
    Box,
    Button,
    Chip,
    Divider,
    Popover,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    BEAT_QA_QUICK_NOTE_GROUPS,
    BEAT_QA_STATUSES,
    BEAT_QA_STATUS_LABELS,
    normalizeBeatQaStatus,
    type BeatHtmlEntry,
    type BeatQaQuickNoteGroup,
    type BeatQaQuickNoteOption,
    type BeatQaStatus,
    type BeatVersion,
} from './agentVideoBeatMap';

type PanelTab = 'qa' | 'version';
export type BeatQuickIterateStage = 'idle' | 'queued' | 'visual' | 'html';

type Props = {
    beatId: string;
    beatIndex: number | null;
    beatHtml: BeatHtmlEntry | null;
    versions?: BeatVersion[];
    activeVersionId?: string;
    visualDescription?: string;
    background?: string;
    phraseAnchor?: string;
    saving?: boolean;
    quickIterating?: boolean;
    iterateStage?: BeatQuickIterateStage;
    onSaveBeatQa: (qaStatus: BeatQaStatus, qaRefineNote: string) => Promise<boolean>;
    onQuickIterateBeat?: (qaRefineNote: string) => Promise<boolean>;
    onSaveBeatVersion: (draft: {
        qaStatus: BeatQaStatus;
        qaRefineNote: string;
    }) => Promise<string | null>;
    onRestoreBeatVersion: (versionId: string, label: string) => Promise<string | null>;
};

const PANEL_BG = '#0b0b0c';
const SURFACE = '#161618';
const SURFACE_HOVER = '#1e1e22';
const BORDER = 'rgba(255,255,255,0.08)';
const TEXT_MUTED = 'rgba(255,255,255,0.48)';
const TEXT_SOFT = 'rgba(255,255,255,0.72)';
const TEXT_PRIMARY = 'rgba(255,255,255,0.92)';

function truncateText(value: string, maxLen = 110): string {
    const text = String(value || '').trim();
    if (text.length <= maxLen) {
        return text;
    }
    return `${text.slice(0, maxLen - 1)}…`;
}

function formatSavedAt(iso: string): string {
    const raw = String(iso || '').trim();
    if (!raw) {
        return '—';
    }
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
        return raw;
    }
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
    return (
        <Typography
            variant="caption"
            sx={{
                display: 'block',
                color: TEXT_MUTED,
                fontSize: 10,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600,
            }}
        >
            {children}
        </Typography>
    );
}

function VersionRow({
    title,
    subtitle,
    body,
    active = false,
    action = null,
}: {
    title: string;
    subtitle?: string;
    body?: string;
    active?: boolean;
    action?: React.ReactNode;
}) {
    return (
        <Box
            sx={{
                position: 'relative',
                borderRadius: 1.5,
                bgcolor: active ? 'rgba(59,130,246,0.12)' : SURFACE,
                border: `1px solid ${active ? 'rgba(96,165,250,0.45)' : BORDER}`,
                px: 1.5,
                py: 1.25,
                overflow: 'hidden',
                '&::before': active
                    ? {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: 3,
                        bgcolor: '#60a5fa',
                    }
                    : undefined,
            }}
        >
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                        <Typography sx={{ color: TEXT_PRIMARY, fontWeight: 650, fontSize: 13 }}>
                            {title}
                        </Typography>
                        {active ? (
                            <Chip
                                label="Đang dùng"
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: 10,
                                    bgcolor: 'rgba(96,165,250,0.2)',
                                    color: '#93c5fd',
                                    border: '1px solid rgba(96,165,250,0.35)',
                                    '& .MuiChip-label': { px: 0.75 },
                                }}
                            />
                        ) : null}
                    </Stack>
                    {subtitle ? (
                        <Typography sx={{ mt: 0.4, color: TEXT_MUTED, fontSize: 11 }}>
                            {subtitle}
                        </Typography>
                    ) : null}
                </Box>
                {action}
            </Stack>
            {body ? (
                <Typography
                    sx={{
                        mt: 0.85,
                        color: TEXT_SOFT,
                        fontSize: 12,
                        lineHeight: 1.45,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                    }}
                >
                    {body}
                </Typography>
            ) : null}
        </Box>
    );
}

function RestoreVersionButton({
    label,
    disabled = false,
    loading = false,
    onConfirm,
}: {
    label: string;
    disabled?: boolean;
    loading?: boolean;
    onConfirm: () => Promise<void>;
}) {
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    const handleClose = () => {
        if (loading) {
            return;
        }
        setAnchorEl(null);
    };

    const handleConfirm = async () => {
        await onConfirm();
        setAnchorEl(null);
    };

    return (
        <>
            <LoadingButton
                size="small"
                variant="outlined"
                loading={loading && open}
                disabled={disabled || loading}
                onClick={(event) => {
                    setAnchorEl(event.currentTarget);
                }}
                sx={{
                    textTransform: 'none',
                    flexShrink: 0,
                    minWidth: 72,
                    color: disabled ? TEXT_MUTED : '#93c5fd',
                    borderColor: disabled ? BORDER : 'rgba(96,165,250,0.4)',
                    '&:hover': {
                        borderColor: 'rgba(96,165,250,0.7)',
                        bgcolor: 'rgba(59,130,246,0.1)',
                    },
                    '&.Mui-disabled': {
                        color: TEXT_MUTED,
                        borderColor: BORDER,
                    },
                }}
            >
                Restore
            </LoadingButton>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                    paper: {
                        sx: {
                            mt: 0.75,
                            width: 220,
                            bgcolor: '#141416',
                            border: `1px solid ${BORDER}`,
                            borderRadius: 1.5,
                            boxShadow: '0 10px 28px rgba(0,0,0,0.45)',
                            overflow: 'hidden',
                        },
                    },
                }}
            >
                <Box sx={{ p: 1.25 }}>
                    <Typography sx={{ color: TEXT_PRIMARY, fontSize: 12, fontWeight: 650, mb: 0.5 }}>
                        Restore {label}?
                    </Typography>
                    <Typography sx={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.45, mb: 1.25 }}>
                        Ghi đè bản đang làm việc (visual, HTML, QA). Timing không đổi.
                    </Typography>
                    <Stack direction="row" spacing={0.75} justifyContent="flex-end">
                        <Button
                            size="small"
                            onClick={handleClose}
                            disabled={loading}
                            sx={{
                                textTransform: 'none',
                                minWidth: 0,
                                px: 1,
                                color: TEXT_SOFT,
                            }}
                        >
                            Hủy
                        </Button>
                        <LoadingButton
                            size="small"
                            variant="contained"
                            loading={loading}
                            onClick={() => { void handleConfirm(); }}
                            sx={{
                                textTransform: 'none',
                                minWidth: 0,
                                px: 1.25,
                                fontWeight: 650,
                                bgcolor: '#3b82f6',
                                boxShadow: 'none',
                                '&:hover': { bgcolor: '#2563eb', boxShadow: 'none' },
                            }}
                        >
                            Restore
                        </LoadingButton>
                    </Stack>
                </Box>
            </Popover>
        </>
    );
}

export default function ShortVideoAgentBeatQaPanel({
    beatId,
    beatHtml,
    versions = [],
    activeVersionId = '',
    visualDescription = '',
    saving = false,
    quickIterating = false,
    iterateStage = 'idle',
    onSaveBeatQa,
    onQuickIterateBeat,
    onSaveBeatVersion,
    onRestoreBeatVersion,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [tab, setTab] = React.useState<PanelTab>('qa');
    const [qaStatus, setQaStatus] = React.useState<BeatQaStatus>('');
    const [qaRefineNote, setQaRefineNote] = React.useState('');
    const syncedBeatRef = React.useRef('');

    React.useEffect(() => {
        if (!beatId || syncedBeatRef.current === beatId) {
            return;
        }
        syncedBeatRef.current = beatId;
        setTab('qa');
        setQaStatus(normalizeBeatQaStatus(beatHtml?.qa_status));
        setQaRefineNote(String(beatHtml?.qa_refine_note || ''));
    }, [beatHtml?.qa_refine_note, beatHtml?.qa_status, beatId]);

    React.useEffect(() => {
        if (!beatId) {
            syncedBeatRef.current = '';
            return;
        }
        const nextStatus = normalizeBeatQaStatus(beatHtml?.qa_status);
        const nextNote = String(beatHtml?.qa_refine_note || '');
        if (syncedBeatRef.current !== beatId) {
            return;
        }
        setQaStatus((current) => (current === nextStatus ? current : nextStatus));
        setQaRefineNote((current) => (current === nextNote ? current : nextNote));
    }, [beatHtml?.qa_refine_note, beatHtml?.qa_status, beatId]);

    const initialQaStatus = normalizeBeatQaStatus(beatHtml?.qa_status);
    const initialQaRefineNote = String(beatHtml?.qa_refine_note || '');
    const qaDirty = qaStatus !== initialQaStatus || qaRefineNote !== initialQaRefineNote;
    const isQuickIterateRunning = iterateStage === 'visual' || iterateStage === 'html';
    const busy = saving || quickIterating;
    const canSaveQa = Boolean(beatId) && qaDirty && !busy;
    const hasBeatHtml = Boolean(String(beatHtml?.html || '').trim());
    // Beat đang chờ trong hàng đợi vẫn lưu/restore version được; chỉ khóa khi đang chạy visual/html.
    const canSaveVersion = Boolean(beatId) && hasBeatHtml && !saving && !isQuickIterateRunning;
    const canQuickIterate = Boolean(
        beatId
        && hasBeatHtml
        && !busy
        && typeof onQuickIterateBeat === 'function'
    );

    const iterateStageLabel = iterateStage === 'queued'
        ? 'Chờ trong hàng đợi…'
        : iterateStage === 'visual'
            ? 'Đang tạo visual mới…'
            : iterateStage === 'html'
                ? 'Đang fill HTML…'
                : '';

    const sortedVersions = React.useMemo(
        () => [...versions].sort((a, b) => String(b.saved_at || '').localeCompare(String(a.saved_at || ''))),
        [versions],
    );

    const handleSaveQa = async () => {
        if (!canSaveQa) {
            return;
        }
        if (
            (qaStatus === 'needs_html_refill' || qaStatus === 'needs_visual_tweak')
            && !qaRefineNote.trim()
        ) {
            showMessage('Nên nhập ghi chú refine khi đánh dấu beat cần sửa', 'warning');
        }
        const saved = await onSaveBeatQa(qaStatus, qaRefineNote.trim());
        if (saved) {
            showMessage('Đã lưu QA beat', 'success');
        }
    };

    const handleQuickIterate = async () => {
        if (!onQuickIterateBeat) {
            return;
        }
        const note = qaRefineNote.trim();
        if (!canQuickIterate) {
            if (!hasBeatHtml) {
                showMessage('Cần có HTML beat trước khi tạo visual + fill', 'warning');
            }
            return;
        }
        setQaStatus('needs_visual_tweak');
        await onQuickIterateBeat(note);
    };

    const handleSaveVersion = async () => {
        if (!canSaveVersion) {
            return;
        }
        const label = await onSaveBeatVersion({
            qaStatus,
            qaRefineNote: qaRefineNote.trim(),
        });
        if (label) {
            setTab('version');
        }
    };

    const handleRestoreVersion = async (version: BeatVersion) => {
        if (!version.version_id || saving || isQuickIterateRunning) {
            return;
        }
        if (activeVersionId && activeVersionId === version.version_id) {
            showMessage(`Đang dùng ${version.label} rồi`, 'info');
            return;
        }
        const label = await onRestoreBeatVersion(version.version_id, version.label);
        if (label) {
            setTab('version');
        }
    };

    const handleQuickNote = async (group: BeatQaQuickNoteGroup, option: BeatQaQuickNoteOption) => {
        if (!beatId || busy) {
            return;
        }
        const nextStatus = group.qaStatus;
        const nextNote = option.note;
        setQaStatus(nextStatus);
        setQaRefineNote(nextNote);
        const saved = await onSaveBeatQa(nextStatus, nextNote);
        if (saved) {
            showMessage('Đã lưu QA beat', 'success');
        }
    };

    const statusChipSx = (active: boolean, tone: 'success' | 'warning' | 'neutral') => {
        const palette = {
            success: {
                activeBg: 'rgba(34,197,94,0.22)',
                activeBorder: 'rgba(74,222,128,0.5)',
                activeColor: '#86efac',
            },
            warning: {
                activeBg: 'rgba(245,158,11,0.2)',
                activeBorder: 'rgba(251,191,36,0.45)',
                activeColor: '#fcd34d',
            },
            neutral: {
                activeBg: 'rgba(255,255,255,0.12)',
                activeBorder: 'rgba(255,255,255,0.28)',
                activeColor: TEXT_PRIMARY,
            },
        }[tone];
        return {
            cursor: 'pointer',
            height: 28,
            borderRadius: 1.25,
            bgcolor: active ? palette.activeBg : SURFACE,
            color: active ? palette.activeColor : TEXT_SOFT,
            border: `1px solid ${active ? palette.activeBorder : BORDER}`,
            '&:hover': {
                bgcolor: active ? palette.activeBg : SURFACE_HOVER,
            },
            '& .MuiChip-label': { px: 1, fontSize: 12, fontWeight: active ? 650 : 500 },
        };
    };

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                bgcolor: PANEL_BG,
                color: TEXT_PRIMARY,
                borderRadius: 2,
                border: `1px solid ${BORDER}`,
                overflow: 'hidden',
            }}
        >
            <Box sx={{ px: 1.5, pt: 0.75, flexShrink: 0 }}>
                <Tabs
                    value={tab}
                    onChange={(_, next: PanelTab) => { setTab(next); }}
                    variant="fullWidth"
                    sx={{
                        minHeight: 40,
                        '& .MuiTabs-indicator': {
                            height: 2,
                            borderRadius: 1,
                            bgcolor: '#60a5fa',
                        },
                        '& .MuiTab-root': {
                            minHeight: 40,
                            textTransform: 'none',
                            fontSize: 13,
                            fontWeight: 600,
                            color: TEXT_MUTED,
                            '&.Mui-selected': { color: TEXT_PRIMARY },
                        },
                    }}
                >
                    <Tab label="QA" value="qa" />
                    <Tab label={`Version · ${versions.length}`} value="version" />
                </Tabs>
            </Box>
            <Divider sx={{ borderColor: BORDER }} />

            {tab === 'qa' ? (
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Stack
                        spacing={2}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            px: 1.75,
                            py: 1.75,
                        }}
                    >
                        <Box>
                            <SectionLabel>Trạng thái</SectionLabel>
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                                <Chip
                                    label={BEAT_QA_STATUS_LABELS.approved}
                                    disabled={busy}
                                    onClick={() => { setQaStatus('approved'); }}
                                    sx={statusChipSx(qaStatus === 'approved', 'success')}
                                />
                                {BEAT_QA_STATUSES.filter((item) => item !== 'approved').map((status) => (
                                    <Chip
                                        key={status}
                                        label={BEAT_QA_STATUS_LABELS[status]}
                                        disabled={busy}
                                        onClick={() => { setQaStatus(status); }}
                                        sx={statusChipSx(qaStatus === status, 'warning')}
                                    />
                                ))}
                                <Chip
                                    label="Bỏ đánh dấu"
                                    disabled={busy}
                                    onClick={() => { setQaStatus(''); }}
                                    sx={statusChipSx(qaStatus === '', 'neutral')}
                                />
                            </Stack>
                        </Box>

                        {BEAT_QA_QUICK_NOTE_GROUPS.length > 0 ? (
                            <Stack spacing={1.5}>
                                <SectionLabel>Ghi chú nhanh</SectionLabel>
                                {BEAT_QA_QUICK_NOTE_GROUPS.map((group) => (
                                    <Box key={group.id}>
                                        <Typography
                                            sx={{
                                                mb: 0.75,
                                                fontSize: 11,
                                                fontWeight: 650,
                                                color: group.id === 'visual_tweak' ? '#fbbf24' : '#7dd3fc',
                                            }}
                                        >
                                            {group.label}
                                        </Typography>
                                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                            {group.options.map((option) => (
                                                <Chip
                                                    key={`${group.id}:${option.note}`}
                                                    label={option.label}
                                                    size="small"
                                                    disabled={busy}
                                                    onClick={() => { void handleQuickNote(group, option); }}
                                                    sx={{
                                                        height: 26,
                                                        cursor: busy ? 'default' : 'pointer',
                                                        bgcolor: SURFACE,
                                                        color: TEXT_SOFT,
                                                        border: `1px solid ${BORDER}`,
                                                        opacity: busy ? 0.55 : 1,
                                                        '&:hover': {
                                                            bgcolor: busy ? SURFACE : SURFACE_HOVER,
                                                            borderColor: group.id === 'visual_tweak'
                                                                ? 'rgba(251,191,36,0.35)'
                                                                : 'rgba(125,211,252,0.35)',
                                                        },
                                                        '& .MuiChip-label': {
                                                            px: 1,
                                                            fontSize: 11,
                                                        },
                                                    }}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                ))}
                            </Stack>
                        ) : null}

                        <Box>
                            <SectionLabel>Ghi chú refine</SectionLabel>
                            <TextField
                                placeholder="Mô tả lý do cần sửa…"
                                value={qaRefineNote}
                                onChange={(event) => { setQaRefineNote(event.target.value); }}
                                multiline
                                minRows={3}
                                fullWidth
                                size="small"
                                disabled={busy}
                                sx={{
                                    mt: 1,
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: SURFACE,
                                        color: TEXT_PRIMARY,
                                        borderRadius: 1.5,
                                        '& fieldset': { borderColor: BORDER },
                                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
                                        '&.Mui-focused fieldset': { borderColor: 'rgba(96,165,250,0.55)' },
                                    },
                                    '& .MuiInputBase-input::placeholder': {
                                        color: TEXT_MUTED,
                                        opacity: 1,
                                    },
                                }}
                            />
                        </Box>
                    </Stack>

                    <Box
                        sx={{
                            flexShrink: 0,
                            px: 1.75,
                            py: 1.25,
                            borderTop: `1px solid ${BORDER}`,
                            bgcolor: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: 0.75,
                        }}
                    >
                        {iterateStageLabel ? (
                            <Typography sx={{ color: '#93c5fd', fontSize: 11 }}>
                                {iterateStageLabel}
                            </Typography>
                        ) : null}
                        <Stack direction="row" spacing={1} justifyContent="flex-end" useFlexGap flexWrap="wrap">
                            <LoadingButton
                                size="small"
                                variant="outlined"
                                startIcon={<AutoFixHighIcon sx={{ fontSize: 16 }} />}
                                loading={quickIterating}
                                disabled={!canQuickIterate && !quickIterating}
                                onClick={() => { void handleQuickIterate(); }}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 650,
                                    borderColor: canQuickIterate || quickIterating
                                        ? 'rgba(251,191,36,0.45)'
                                        : BORDER,
                                    color: canQuickIterate || quickIterating
                                        ? '#fcd34d'
                                        : TEXT_MUTED,
                                    '&:hover': {
                                        borderColor: 'rgba(251,191,36,0.65)',
                                        bgcolor: 'rgba(245,158,11,0.12)',
                                    },
                                    '&.Mui-disabled': {
                                        borderColor: BORDER,
                                        color: TEXT_MUTED,
                                    },
                                }}
                            >
                                Tạo visual + fill
                            </LoadingButton>
                            <LoadingButton
                                size="small"
                                variant="contained"
                                loading={saving && !quickIterating}
                                disabled={!canSaveQa}
                                onClick={() => { void handleSaveQa(); }}
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 650,
                                    bgcolor: canSaveQa ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                                    color: canSaveQa ? '#fff' : TEXT_MUTED,
                                    boxShadow: 'none',
                                    '&:hover': {
                                        bgcolor: canSaveQa ? '#2563eb' : 'rgba(255,255,255,0.08)',
                                        boxShadow: 'none',
                                    },
                                    '&.Mui-disabled': {
                                        bgcolor: 'rgba(255,255,255,0.08)',
                                        color: TEXT_MUTED,
                                    },
                                }}
                            >
                                Lưu QA
                            </LoadingButton>
                        </Stack>
                    </Box>
                </Box>
            ) : (
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Stack
                        spacing={1.5}
                        sx={{
                            flex: 1,
                            minHeight: 0,
                            overflowY: 'auto',
                            px: 1.75,
                            py: 1.75,
                        }}
                    >
                        <VersionRow
                            title="Đang làm việc"
                            subtitle="Bản hiện tại trên preview"
                            body={truncateText(visualDescription || 'Chưa có visual description')}
                            active={!activeVersionId}
                        />

                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <SectionLabel>Đã lưu</SectionLabel>
                            <Typography sx={{ color: TEXT_MUTED, fontSize: 11 }}>
                                {sortedVersions.length} version
                            </Typography>
                        </Stack>

                        {sortedVersions.length === 0 ? (
                            <Box
                                sx={{
                                    borderRadius: 1.5,
                                    border: `1px dashed ${BORDER}`,
                                    px: 1.5,
                                    py: 2,
                                    textAlign: 'center',
                                }}
                            >
                                <Typography sx={{ color: TEXT_MUTED, fontSize: 12, lineHeight: 1.5 }}>
                                    Chưa có snapshot. Lưu version để giữ lại visual + HTML hiện tại.
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={1}>
                                {sortedVersions.map((version) => {
                                    const qaLabel = version.qa_status
                                        ? (BEAT_QA_STATUS_LABELS[version.qa_status] || version.qa_status)
                                        : 'Chưa QA';
                                    const isActive = Boolean(
                                        activeVersionId && activeVersionId === version.version_id,
                                    );
                                    return (
                                        <VersionRow
                                            key={version.version_id}
                                            title={version.label}
                                            subtitle={`${formatSavedAt(version.saved_at)} · ${qaLabel}`}
                                            body={truncateText(version.visual_description || '—')}
                                            active={isActive}
                                            action={(
                                                <RestoreVersionButton
                                                    label={version.label}
                                                    disabled={saving || isQuickIterateRunning || isActive}
                                                    loading={saving}
                                                    onConfirm={async () => {
                                                        await handleRestoreVersion(version);
                                                    }}
                                                />
                                            )}
                                        />
                                    );
                                })}
                            </Stack>
                        )}
                    </Stack>

                    <Box
                        sx={{
                            flexShrink: 0,
                            px: 1.75,
                            py: 1.25,
                            borderTop: `1px solid ${BORDER}`,
                            bgcolor: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'stretch',
                            gap: 0.75,
                        }}
                    >
                        {!hasBeatHtml ? (
                            <Typography sx={{ color: '#fbbf24', fontSize: 11 }}>
                                Cần có HTML mới lưu được version
                            </Typography>
                        ) : null}
                        <LoadingButton
                            size="small"
                            variant="contained"
                            loading={saving}
                            disabled={!canSaveVersion}
                            onClick={() => { void handleSaveVersion(); }}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 650,
                                alignSelf: 'flex-end',
                                bgcolor: canSaveVersion ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                                color: canSaveVersion ? '#fff' : TEXT_MUTED,
                                boxShadow: 'none',
                                '&:hover': {
                                    bgcolor: canSaveVersion ? '#2563eb' : 'rgba(255,255,255,0.08)',
                                    boxShadow: 'none',
                                },
                                '&.Mui-disabled': {
                                    bgcolor: 'rgba(255,255,255,0.08)',
                                    color: TEXT_MUTED,
                                },
                            }}
                        >
                            Lưu version
                        </LoadingButton>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
