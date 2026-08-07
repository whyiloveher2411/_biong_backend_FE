import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SaveIcon from '@mui/icons-material/Save';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { fetchScriptCreatePrompt } from './agentVideoApi';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    initialScript: string;
    onSave: (text: string) => Promise<boolean>;
};

export default function ShortVideoAgentScriptManualDrawer({
    open,
    onClose,
    shortVideoId,
    initialScript = '',
    onSave,
}: Props) {
    const [prompt, setPrompt] = React.useState('');
    const [loadingPrompt, setLoadingPrompt] = React.useState(false);
    const [promptError, setPromptError] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [script, setScript] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState('');

    React.useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setScript(String(initialScript || '').trim());
        setPrompt('');
        setPromptError('');
        setCopied(false);
        setSaveError('');
        setLoadingPrompt(true);
        void fetchScriptCreatePrompt(shortVideoId)
            .then((res) => {
                if (cancelled) {
                    return;
                }
                if (!res?.success) {
                    setPromptError(String(res?.message || 'Không lấy được prompt tạo script'));
                    return;
                }
                setPrompt(String(res.prompt || ''));
            })
            .catch((e) => {
                if (!cancelled) {
                    setPromptError(e instanceof Error ? e.message : String(e));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoadingPrompt(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open, shortVideoId, initialScript]);

    const handleCopyPrompt = async () => {
        if (!prompt) {
            return;
        }
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setPromptError('Không copy được — trình duyệt chặn clipboard');
        }
    };

    const handleSave = async () => {
        const trimmed = script.trim();
        if (!trimmed) {
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            const ok = await onSave(trimmed);
            if (ok) {
                onClose();
            } else {
                setSaveError('Lưu thất bại — vui lòng thử lại');
            }
        } catch (e) {
            setSaveError(e instanceof Error ? e.message : String(e));
        } finally {
            setSaving(false);
        }
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Tạo script thủ công"
            width={760}
            restDialogContent={{
                sx: {
                    pt: 2,
                    px: 2,
                    pb: 2,
                },
            }}
        >
            <Stack spacing={2} sx={{ pt: 3, px: 2.5, pb: 3 }}>
                <Box>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} flex={1}>
                            Prompt tạo script
                        </Typography>
                        {loadingPrompt ? (
                            <CircularProgress size={18} />
                        ) : prompt ? (
                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<ContentCopyIcon />}
                                onClick={() => { void handleCopyPrompt(); }}
                            >
                                {copied ? 'Đã copy' : 'Copy prompt'}
                            </Button>
                        ) : null}
                    </Stack>
                    {promptError ? (
                        <Alert severity="error" sx={{ mb: 1 }}>
                            {promptError}
                        </Alert>
                    ) : null}
                    <TextField
                        fullWidth
                        multiline
                        minRows={10}
                        maxRows={18}
                        size="small"
                        value={prompt}
                        onChange={() => undefined}
                        placeholder={loadingPrompt ? 'Đang tải prompt…' : 'Chưa có prompt'}
                        inputProps={{ readOnly: true, style: { fontSize: 12, fontFamily: 'monospace' } }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        Dùng nút Copy để lấy prompt, dán vào chatbot bên ngoài (Gemini / ChatGPT / Claude…).
                    </Typography>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                        Audio script
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={10}
                        maxRows={20}
                        size="small"
                        placeholder="Dán audio script AI trả về vào đây…"
                        value={script}
                        onChange={(e) => {
                            setScript(e.target.value);
                            setSaveError('');
                        }}
                        inputProps={{ style: { fontSize: 12, fontFamily: 'monospace' } }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        Script phải bắt đầu bằng thẻ [SFX: ...] ở hook (vd. [SFX: vine boom]) — backend sẽ
                        kiểm tra khi lưu.
                    </Typography>
                </Box>

                {saveError ? (
                    <Alert severity="error">{saveError}</Alert>
                ) : null}

                <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <LoadingButton
                        size="small"
                        variant="contained"
                        color="primary"
                        startIcon={<SaveIcon />}
                        loading={saving}
                        disabled={!script.trim()}
                        onClick={() => { void handleSave(); }}
                    >
                        Lưu
                    </LoadingButton>
                </Stack>
            </Stack>
        </DrawerCustom>
    );
}
