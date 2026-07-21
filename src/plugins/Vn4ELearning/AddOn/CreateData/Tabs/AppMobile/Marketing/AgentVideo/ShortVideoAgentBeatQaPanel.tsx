import React from 'react';
import {
    Box,
    Chip,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    BEAT_QA_QUICK_NOTE_OPTIONS,
    BEAT_QA_STATUSES,
    BEAT_QA_STATUS_LABELS,
    normalizeBeatQaStatus,
    type BeatHtmlEntry,
    type BeatQaQuickNoteOption,
    type BeatQaStatus,
} from './agentVideoBeatMap';

type Props = {
    beatId: string;
    beatIndex: number | null;
    beatHtml: BeatHtmlEntry | null;
    saving?: boolean;
    onSaveBeatQa: (qaStatus: BeatQaStatus, qaRefineNote: string) => Promise<boolean>;
};

export default function ShortVideoAgentBeatQaPanel({
    beatId,
    beatIndex,
    beatHtml,
    saving = false,
    onSaveBeatQa,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [qaStatus, setQaStatus] = React.useState<BeatQaStatus>('');
    const [qaRefineNote, setQaRefineNote] = React.useState('');
    const syncedBeatRef = React.useRef('');

    React.useEffect(() => {
        if (!beatId || syncedBeatRef.current === beatId) {
            return;
        }
        syncedBeatRef.current = beatId;
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
    const canSaveQa = Boolean(beatId) && qaDirty && !saving;

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

    const handleQuickNote = async (option: BeatQaQuickNoteOption) => {
        if (!beatId || saving) {
            return;
        }
        const nextStatus = option.qaStatus ?? 'needs_visual_tweak';
        const nextNote = option.note;
        setQaStatus(nextStatus);
        setQaRefineNote(nextNote);
        const saved = await onSaveBeatQa(nextStatus, nextNote);
        if (saved) {
            showMessage('Đã lưu QA beat', 'success');
        }
    };

    const beatLabel = beatIndex != null && beatIndex > 0
        ? `Beat ${beatIndex}`
        : beatId;

    return (
        <Box
            sx={{
                width: '100%',
                flexShrink: 0,
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
                    Đánh dấu chất lượng beat
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                    {beatLabel}
                </Typography>
            </Box>
            <Stack spacing={1.5} sx={{ px: 2, pb: 2 }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    <Chip
                        label={BEAT_QA_STATUS_LABELS.approved}
                        color={qaStatus === 'approved' ? 'success' : 'default'}
                        variant={qaStatus === 'approved' ? 'filled' : 'outlined'}
                        onClick={() => { setQaStatus('approved'); }}
                        sx={{ cursor: 'pointer' }}
                    />
                    {BEAT_QA_STATUSES.filter((item) => item !== 'approved').map((status) => (
                        <Chip
                            key={status}
                            label={BEAT_QA_STATUS_LABELS[status]}
                            color={qaStatus === status ? 'warning' : 'default'}
                            variant={qaStatus === status ? 'filled' : 'outlined'}
                            onClick={() => { setQaStatus(status); }}
                            sx={{ cursor: 'pointer' }}
                        />
                    ))}
                    <Chip
                        label="Bỏ đánh dấu"
                        variant={qaStatus === '' ? 'filled' : 'outlined'}
                        onClick={() => { setQaStatus(''); }}
                        sx={{ cursor: 'pointer' }}
                    />
                </Stack>
                {BEAT_QA_QUICK_NOTE_OPTIONS.length > 0 ? (
                    <Stack spacing={0.75}>
                        <Typography variant="caption" color="text.secondary">
                            Ghi chú nhanh
                        </Typography>
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                            {BEAT_QA_QUICK_NOTE_OPTIONS.map((option) => (
                                <Chip
                                    key={option.note}
                                    label={option.label}
                                    variant="outlined"
                                    color="info"
                                    size="small"
                                    disabled={saving}
                                    onClick={() => { void handleQuickNote(option); }}
                                    sx={{ cursor: saving ? 'default' : 'pointer' }}
                                />
                            ))}
                        </Stack>
                    </Stack>
                ) : null}
                <TextField
                    label="Ghi chú refine"
                    placeholder="Mô tả lý do cần sửa — dùng khi refine visual hoặc HTML"
                    value={qaRefineNote}
                    onChange={(event) => { setQaRefineNote(event.target.value); }}
                    multiline
                    minRows={3}
                    fullWidth
                    size="small"
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <LoadingButton
                        size="small"
                        variant="outlined"
                        loading={saving}
                        disabled={!canSaveQa}
                        onClick={() => { void handleSaveQa(); }}
                        sx={{ textTransform: 'none' }}
                    >
                        Lưu QA beat
                    </LoadingButton>
                </Box>
            </Stack>
        </Box>
    );
}
