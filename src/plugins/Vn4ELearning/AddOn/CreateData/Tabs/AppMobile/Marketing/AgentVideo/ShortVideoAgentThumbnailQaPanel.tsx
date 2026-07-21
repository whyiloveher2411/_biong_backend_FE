import React from 'react';
import {
    Box,
    Chip,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import type { ImportHtmlThumbnailBlock, ThumbnailQaStatus } from './agentVideoApi';

const THUMBNAIL_QA_LABELS: Record<Exclude<ThumbnailQaStatus, ''>, string> = {
    approved: 'Đã ổn',
    needs_regenerate: 'Cần làm lại',
};

function normalizeThumbnailQaStatus(raw: unknown): ThumbnailQaStatus {
    const value = String(raw || '').trim().toLowerCase();
    if (value === 'approved' || value === 'needs_regenerate') {
        return value;
    }
    return '';
}

type Props = {
    thumbnailBlock: ImportHtmlThumbnailBlock | null;
    hasHtml?: boolean;
    saving?: boolean;
    regenerating?: boolean;
    onSaveThumbnailQa: (
        qaStatus: ThumbnailQaStatus,
        qaNote: string,
    ) => Promise<boolean>;
    onRegenerateThumbnail: (qaNote: string) => Promise<boolean>;
};

export default function ShortVideoAgentThumbnailQaPanel({
    thumbnailBlock,
    hasHtml = false,
    saving = false,
    regenerating = false,
    onSaveThumbnailQa,
    onRegenerateThumbnail,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [qaStatus, setQaStatus] = React.useState<ThumbnailQaStatus>('');
    const [qaNote, setQaNote] = React.useState('');
    const qaStatusRef = React.useRef<ThumbnailQaStatus>('');
    const qaNoteRef = React.useRef('');
    const savingRef = React.useRef(false);

    React.useEffect(() => {
        const nextStatus = normalizeThumbnailQaStatus(thumbnailBlock?.qa_status);
        const nextNote = String(thumbnailBlock?.qa_note || '');
        setQaStatus(nextStatus);
        setQaNote(nextNote);
        qaStatusRef.current = nextStatus;
        qaNoteRef.current = nextNote;
    }, [
        thumbnailBlock?.qa_note,
        thumbnailBlock?.qa_status,
        thumbnailBlock?.updated_at,
        thumbnailBlock?.image_generated_at,
    ]);

    const initialStatus = normalizeThumbnailQaStatus(thumbnailBlock?.qa_status);
    const initialNote = String(thumbnailBlock?.qa_note || '');
    const dirty = qaStatus !== initialStatus || qaNote !== initialNote;
    const busy = saving || regenerating;
    const canRegenerate = hasHtml && Boolean(qaNote.trim()) && !busy;

    const persistQa = React.useCallback(async (
        nextStatus: ThumbnailQaStatus,
        nextNote: string,
        options?: { silent?: boolean },
    ): Promise<boolean> => {
        if (savingRef.current) {
            return false;
        }
        const statusChanged = nextStatus !== initialStatus;
        const noteChanged = nextNote !== initialNote;
        if (!statusChanged && !noteChanged) {
            return true;
        }
        savingRef.current = true;
        try {
            const saved = await onSaveThumbnailQa(nextStatus, nextNote);
            if (!saved && !options?.silent) {
                showMessage('Lưu QA thumbnail thất bại', 'error');
            }
            return saved;
        } finally {
            savingRef.current = false;
        }
    }, [initialNote, initialStatus, onSaveThumbnailQa, showMessage]);

    const handleStatusClick = async (nextStatus: ThumbnailQaStatus) => {
        if (busy || nextStatus === qaStatus) {
            return;
        }
        setQaStatus(nextStatus);
        qaStatusRef.current = nextStatus;
        await persistQa(nextStatus, qaNoteRef.current.trim(), { silent: true });
    };

    const handleNoteBlur = () => {
        if (busy) {
            return;
        }
        const trimmed = qaNoteRef.current.trim();
        if (trimmed === initialNote && qaStatus === initialStatus) {
            return;
        }
        void persistQa(qaStatusRef.current, trimmed, { silent: true });
    };

    const handleRegenerate = async () => {
        if (!canRegenerate) {
            if (!hasHtml) {
                showMessage('Cần có HTML thumbnail trước khi re-generate', 'warning');
            } else if (!qaNote.trim()) {
                showMessage('Nhập ghi chú yêu cầu làm lại trước khi re-generate', 'warning');
            }
            return;
        }
        const note = qaNote.trim();
        setQaStatus('needs_regenerate');
        qaStatusRef.current = 'needs_regenerate';
        const saved = await persistQa('needs_regenerate', note, { silent: true });
        if (!saved) {
            return;
        }
        const ok = await onRegenerateThumbnail(note);
        if (ok) {
            showMessage('Đã enqueue re-generate thumbnail theo ghi chú', 'success');
        }
    };

    return (
        <Box
            sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
                overflow: 'hidden',
            }}
        >
            <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
                <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ display: 'block', fontSize: 10, lineHeight: 1.4, letterSpacing: '0.08em' }}
                >
                    QA
                </Typography>
                <Typography variant="subtitle2" sx={{ mt: 0.25, fontWeight: 700 }}>
                    Đánh dấu thumbnail
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    Đã ổn = pipeline bỏ qua. Cần làm lại / chưa chọn = pipeline generate lại hết.
                    Ghi chú tự lưu khi blur — Re-generate dùng concept + HTML cũ + ghi chú.
                </Typography>
            </Box>
            <Stack spacing={1.5} sx={{ px: 2, pb: 2 }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip
                        label={THUMBNAIL_QA_LABELS.approved}
                        color={qaStatus === 'approved' ? 'success' : 'default'}
                        variant={qaStatus === 'approved' ? 'filled' : 'outlined'}
                        onClick={() => { void handleStatusClick('approved'); }}
                        disabled={busy}
                        size="small"
                    />
                    <Chip
                        label={THUMBNAIL_QA_LABELS.needs_regenerate}
                        color={qaStatus === 'needs_regenerate' ? 'warning' : 'default'}
                        variant={qaStatus === 'needs_regenerate' ? 'filled' : 'outlined'}
                        onClick={() => { void handleStatusClick('needs_regenerate'); }}
                        disabled={busy}
                        size="small"
                    />
                    {dirty && saving ? (
                        <Chip size="small" label="Đang lưu…" variant="outlined" />
                    ) : null}
                </Stack>
                <TextField
                    label="Ghi chú"
                    value={qaNote}
                    onChange={(event) => {
                        const next = event.target.value;
                        setQaNote(next);
                        qaNoteRef.current = next;
                    }}
                    onBlur={handleNoteBlur}
                    multiline
                    minRows={2}
                    size="small"
                    fullWidth
                    disabled={busy}
                    placeholder="VD: Quá đơn sơ, cần đặc sắc hơn — dùng khi Re-generate"
                />
                <LoadingButton
                    variant="contained"
                    size="small"
                    startIcon={<AutoFixHighIcon />}
                    loading={regenerating}
                    disabled={!canRegenerate}
                    onClick={() => { void handleRegenerate(); }}
                >
                    Re-generate
                </LoadingButton>
            </Stack>
        </Box>
    );
}
