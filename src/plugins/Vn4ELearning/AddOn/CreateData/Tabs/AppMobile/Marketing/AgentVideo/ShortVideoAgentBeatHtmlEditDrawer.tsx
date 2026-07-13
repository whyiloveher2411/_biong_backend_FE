import React from 'react';
import {
    Alert,
    Box,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import SaveIcon from '@mui/icons-material/Save';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { formatDurationSec } from './agentVideoHfPromptDuration';

type Props = {
    open: boolean;
    onClose: () => void;
    beatId: string;
    beatIndex?: number | null;
    durationSec?: number | null;
    initialHtml: string;
    saving?: boolean;
    onSave: (html: string) => Promise<boolean>;
};

export default function ShortVideoAgentBeatHtmlEditDrawer({
    open,
    onClose,
    beatId,
    beatIndex = null,
    durationSec = null,
    initialHtml,
    saving = false,
    onSave,
}: Props) {
    const [draftHtml, setDraftHtml] = React.useState(initialHtml);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        setDraftHtml(initialHtml);
    }, [initialHtml, open, beatId]);

    const titleLabel = beatIndex != null && beatIndex > 0
        ? `Sửa HTML · beat ${beatIndex}`
        : `Sửa HTML · ${beatId || 'beat'}`;

    const dirty = draftHtml !== initialHtml;
    const canSave = dirty && !saving;

    const handleSave = async () => {
        if (!canSave) {
            return;
        }
        const saved = await onSave(draftHtml);
        if (saved) {
            onClose();
        }
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={(
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <CodeIcon fontSize="small" />
                    <span>{titleLabel}</span>
                </Box>
            )}
            width={720}
            sx={{ zIndex: 1600 }}
            ModalProps={{
                sx: { zIndex: 1600 },
                style: { zIndex: 1600 },
            }}
            restDialogContent={{
                sx: {
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    overflow: 'hidden',
                    pb: 1,
                },
            }}
            action={(
                <LoadingButton
                    variant="contained"
                    color="primary"
                    loading={saving}
                    disabled={!canSave}
                    startIcon={<SaveIcon />}
                    onClick={() => { void handleSave(); }}
                >
                    Lưu HTML beat
                </LoadingButton>
            )}
        >
            <Stack spacing={1.5} sx={{ height: '100%', minHeight: 0 }}>
                <Alert severity="info" sx={{ py: 0.5, flexShrink: 0 }}>
                    Chỉnh HTML của beat đã chọn rồi bấm Lưu. Nút lưu luôn neo ở đáy drawer.
                </Alert>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ flexShrink: 0 }}>
                    <Typography variant="caption" color="text.secondary">
                        ID: {beatId || '—'}
                    </Typography>
                    {durationSec != null && durationSec > 0 ? (
                        <Typography variant="caption" color="text.secondary">
                            Duration: {formatDurationSec(durationSec)}s
                        </Typography>
                    ) : null}
                    {dirty ? (
                        <Typography variant="caption" color="warning.main" fontWeight={600}>
                            Chưa lưu
                        </Typography>
                    ) : (
                        <Typography variant="caption" color="success.main">
                            Khớp bản đã lưu
                        </Typography>
                    )}
                </Stack>

                <TextField
                    label="HTML beat"
                    value={draftHtml}
                    onChange={(event) => setDraftHtml(event.target.value)}
                    multiline
                    fullWidth
                    minRows={18}
                    maxRows={28}
                    size="small"
                    placeholder="<div class=&quot;clip&quot; data-start=&quot;0&quot; data-duration=&quot;…&quot;>…</div>"
                    InputProps={{
                        sx: {
                            alignItems: 'flex-start',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: 12,
                            lineHeight: 1.45,
                        },
                    }}
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        '& .MuiInputBase-root': {
                            height: '100%',
                            alignItems: 'stretch',
                        },
                        '& textarea': {
                            height: '100% !important',
                            overflow: 'auto !important',
                        },
                    }}
                />
            </Stack>
        </DrawerCustom>
    );
}
