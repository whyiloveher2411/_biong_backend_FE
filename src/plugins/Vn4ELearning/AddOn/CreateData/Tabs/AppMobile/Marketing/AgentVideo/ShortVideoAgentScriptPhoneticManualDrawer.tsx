import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { fetchScriptPhoneticPrompt } from 'helpers/marketingShortVideoAgentPrompt';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    initialReading: string;
    onSave: (text: string) => Promise<boolean>;
};

export default function ShortVideoAgentScriptPhoneticManualDrawer({
    open,
    onClose,
    shortVideoId,
    initialReading = '',
    onSave,
}: Props) {
    const [contentMode, setContentMode] = React.useState<'text' | 'file'>('file');
    const [prompt, setPrompt] = React.useState('');
    const [content, setContent] = React.useState('');
    const [contentFileName, setContentFileName] = React.useState('content.txt');
    const [loadingPrompt, setLoadingPrompt] = React.useState(false);
    const [promptError, setPromptError] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [reading, setReading] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [saveError, setSaveError] = React.useState('');

    React.useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setReading(String(initialReading || '').trim());
        setPrompt('');
        setContent('');
        setContentFileName('content.txt');
        setPromptError('');
        setCopied(false);
        setSaveError('');
        setLoadingPrompt(true);
        void fetchScriptPhoneticPrompt(shortVideoId, contentMode)
            .then((res) => {
                if (cancelled) {
                    return;
                }
                if (!res?.success) {
                    setPromptError(
                        String(
                            typeof res?.message === 'object'
                                ? res?.message?.content || 'Không lấy được prompt chuẩn hóa giọng đọc'
                                : res?.message || 'Không lấy được prompt chuẩn hóa giọng đọc',
                        ),
                    );
                    return;
                }
                setPrompt(String(res.prompt || ''));
                if (contentMode === 'file') {
                    setContent(String(res.content || ''));
                    setContentFileName(String(res.content_file_name || 'content.txt'));
                }
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
    }, [open, shortVideoId, initialReading, contentMode]);

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

    const handleDownloadContent = () => {
        if (!content) {
            return;
        }
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = contentFileName || 'content.txt';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
    };

    const handleSave = async () => {
        const trimmed = reading.trim();
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
            title="Chuẩn hóa giọng đọc thủ công"
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
                            Cách nhận nội dung nguồn
                        </Typography>
                        <ToggleButtonGroup
                            exclusive
                            size="small"
                            value={contentMode}
                            onChange={(_event, value: 'text' | 'file' | null) => {
                                if (value) {
                                    setContentMode(value);
                                }
                            }}
                            aria-label="Cách nhận nội dung nguồn"
                        >
                            <ToggleButton value="text" aria-label="Nội dung trong prompt">
                                Text
                            </ToggleButton>
                            <ToggleButton value="file" aria-label="Tải file nội dung">
                                File content
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                        {contentMode === 'text'
                            ? 'Text: audio script nằm ngay trong prompt — copy prompt là đủ.'
                            : 'File content: prompt ngắn, không nhúng script — tải file và đính kèm khi hỏi chatbot để tránh hiểu nhầm.'}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="subtitle1" fontWeight={700} flex={1}>
                            Prompt chuẩn hóa giọng đọc
                        </Typography>
                        {loadingPrompt ? (
                            <CircularProgress size={18} />
                        ) : prompt ? (
                            <>
                                {contentMode === 'file' && (
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        startIcon={<DownloadIcon />}
                                        disabled={!content}
                                        onClick={handleDownloadContent}
                                    >
                                        Tải file {contentFileName}
                                    </Button>
                                )}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<ContentCopyIcon />}
                                    onClick={() => { void handleCopyPrompt(); }}
                                >
                                    {copied ? 'Đã copy' : 'Copy prompt'}
                                </Button>
                            </>
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
                        {contentMode === 'file' ? (
                            <>
                                Dùng nút Copy để lấy prompt, tải file {contentFileName} và đính kèm
                                file khi dán prompt vào chatbot bên ngoài (Gemini / ChatGPT / Claude…).
                            </>
                        ) : (
                            'Dùng nút Copy để lấy prompt, dán vào chatbot bên ngoài (Gemini / ChatGPT / Claude…).'
                        )}
                    </Typography>
                </Box>

                <Divider />

                <Box>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                        Bản đọc TTS sau chuẩn hóa
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        minRows={10}
                        maxRows={20}
                        size="small"
                        placeholder="Dán kết quả AI trả về vào đây (số đã được đổi thành cách đọc tiếng Việt)…"
                        value={reading}
                        onChange={(e) => {
                            setReading(e.target.value);
                            setSaveError('');
                        }}
                        inputProps={{ style: { fontSize: 12, fontFamily: 'monospace' } }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.75 }}>
                        Đây là bản đọc TTS riêng (chữ số → cách đọc tiếng Việt) — script gốc vẫn giữ nguyên.
                        Lưu xong bước "Chuẩn hóa giọng đọc" được đánh dấu hoàn tất, job auto đang chờ sẽ bị hủy.
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
                        disabled={!reading.trim()}
                        onClick={() => { void handleSave(); }}
                    >
                        Lưu bản đọc TTS
                    </LoadingButton>
                </Stack>
            </Stack>
        </DrawerCustom>
    );
}
