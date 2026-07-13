import React from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CodeIcon from '@mui/icons-material/Code';
import SaveIcon from '@mui/icons-material/Save';
import {
    Alert,
    Box,
    CircularProgress,
    IconButton,
    InputAdornment,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { formatDurationSec } from './agentVideoHfPromptDuration';

type Props = {
    open: boolean;
    onClose: () => void;
    beatId: string;
    beatIndex?: number | null;
    durationSec?: number | null;
    initialHtml: string;
    initialCreativePrompt?: string;
    saving?: boolean;
    refining?: boolean;
    onSave: (payload: { html: string; creativePrompt: string }) => Promise<boolean>;
    onAiRefine: (payload: { prompt: string; html: string }) => Promise<string | null>;
};

export default function ShortVideoAgentBeatHtmlEditDrawer({
    open,
    onClose,
    beatId,
    beatIndex = null,
    durationSec = null,
    initialHtml,
    initialCreativePrompt = '',
    saving = false,
    refining = false,
    onSave,
    onAiRefine,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [draftHtml, setDraftHtml] = React.useState(initialHtml);
    const [creativePrompt, setCreativePrompt] = React.useState(initialCreativePrompt);
    const [aiLoading, setAiLoading] = React.useState(false);
    const syncedOpenKeyRef = React.useRef('');

    // Chỉ sync từ CMS khi mở drawer / đổi beat — tránh AI vừa đổ draft lại bị reset bởi prop cha.
    React.useEffect(() => {
        if (!open) {
            syncedOpenKeyRef.current = '';
            return;
        }
        const openKey = `${beatId}::open`;
        if (syncedOpenKeyRef.current === openKey) {
            return;
        }
        syncedOpenKeyRef.current = openKey;
        setDraftHtml(initialHtml);
        setCreativePrompt(initialCreativePrompt);
        setAiLoading(false);
    }, [beatId, initialCreativePrompt, initialHtml, open]);

    const titleLabel = beatIndex != null && beatIndex > 0
        ? `Sửa HTML · beat ${beatIndex}`
        : `Sửa HTML · ${beatId || 'beat'}`;

    const dirty = draftHtml !== initialHtml
        || creativePrompt !== initialCreativePrompt;
    const busy = saving || refining || aiLoading;
    const canSave = dirty && !busy;
    const canAi = Boolean(creativePrompt.trim()) && Boolean(draftHtml.trim()) && !busy;

    const handleSave = async () => {
        if (!canSave) {
            return;
        }
        const saved = await onSave({
            html: draftHtml,
            creativePrompt,
        });
        if (saved) {
            onClose();
        }
    };

    const handleAiRefine = async () => {
        const prompt = creativePrompt.trim();
        if (!prompt) {
            showMessage('Nhập prompt trước khi gọi AI', 'warning');
            return;
        }
        if (!draftHtml.trim()) {
            showMessage('Chưa có HTML beat để refine', 'warning');
            return;
        }

        setAiLoading(true);
        try {
            const nextHtml = await onAiRefine({
                prompt,
                html: draftHtml,
            });
            if (nextHtml != null) {
                setDraftHtml(nextHtml);
            }
        } finally {
            setAiLoading(false);
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
                    Nhập prompt sáng tạo → AI refine (Gemini Headless) đổ vào draft. Bấm Lưu mới ghi HTML lên CMS.
                </Alert>

                <TextField
                    label="Prompt sáng tạo / refine"
                    value={creativePrompt}
                    onChange={(event) => setCreativePrompt(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={4}
                    placeholder="Vd. thêm particle glow phía sau title, giữ layout hiện tại…"
                    disabled={busy}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                                <Tooltip title={canAi ? 'Gọi Gemini Headless refine' : 'Cần prompt + HTML beat'}>
                                    <span>
                                        <IconButton
                                            color="primary"
                                            edge="end"
                                            disabled={!canAi}
                                            onClick={() => { void handleAiRefine(); }}
                                            aria-label="AI refine HTML beat"
                                        >
                                            {(aiLoading || refining) ? (
                                                <CircularProgress size={18} />
                                            ) : (
                                                <AutoAwesomeIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </InputAdornment>
                        ),
                    }}
                />

                {(aiLoading || refining) ? (
                    <Typography variant="caption" color="info.main" sx={{ flexShrink: 0 }}>
                        Đang gọi Gemini Headless refine…
                    </Typography>
                ) : null}

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
                    minRows={16}
                    maxRows={26}
                    size="small"
                    disabled={busy}
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
