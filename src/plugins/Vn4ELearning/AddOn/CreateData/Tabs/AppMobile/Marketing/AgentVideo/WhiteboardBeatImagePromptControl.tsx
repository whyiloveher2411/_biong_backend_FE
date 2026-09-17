import React from 'react';
import { Box, Button, Stack, TextField, Tooltip, Typography } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import LoadingButton from 'components/atoms/LoadingButton';
import type { useAgentVideoContent } from './useAgentVideoContent';
import {
    buildVideo2sChatbotPrompt,
    joinPlainImagePromptSections,
    plainImagePromptSectionColor,
    plainImagePromptSectionLabel,
    resolveVideo2sPlainImagePrompt,
    splitPlainImagePromptSections,
} from './agentVideoManualBeats';

type Props = {
    state: ReturnType<typeof useAgentVideoContent>;
    /** beat_N — beat đang mở trong region editor. */
    beatId: string;
    headline?: string;
};

/**
 * Prompt image của beat video 2s ngay trong tab "Chỉnh sửa" — hiện khi KHÔNG
 * chọn vùng/ảnh/hiệu ứng nào. Mỗi mục của prompt (cắt theo "TÊN MỤC:" IN HOA)
 * là 1 textarea riêng; mục mới xuất hiện trong prompt tự thêm ô (không
 * whitelist cứng — không phải sửa UI khi format thay đổi).
 */
export default function WhiteboardBeatImagePromptControl({ state, beatId, headline }: Props) {
    const plainPrompt = resolveVideo2sPlainImagePrompt(state.manualBeatMarks, beatId);
    const [sections, setSections] = React.useState(() => splitPlainImagePromptSections(plainPrompt));
    const editing = Boolean(state.savingVideo2sBeatPrompt || state.savingManualBeat);
    // Prompt SAVED gần nhất — so để phân biệt "prompt đổi từ DB" vs "user đang gõ chưa lưu".
    const savedPromptRef = React.useRef(plainPrompt);

    // Beat chưa load marks lúc refresh (plainPrompt='' rỗng) → khi marks về thì
    // tự sync; user đang gõ (joined khác CẢ bản cũ lẫn bản mới) thì không đè.
    React.useEffect(() => {
        const previousSaved = savedPromptRef.current;
        savedPromptRef.current = plainPrompt;
        setSections((prev) => {
            const joined = joinPlainImagePromptSections(prev).trim();
            if (
                joined.trim() !== ''
                && joined !== previousSaved.trim()
                && joined !== plainPrompt.trim()
            ) {
                return prev;
            }
            return splitPlainImagePromptSections(plainPrompt);
        });
    }, [plainPrompt]);

    const joined = joinPlainImagePromptSections(sections);
    const dirty = joined.trim() !== plainPrompt.trim();
    const promptEmpty = sections.length === 0;

    const [copied, setCopied] = React.useState(false);
    const chatbotPrompt = buildVideo2sChatbotPrompt(joined, state.agentClipAspect);

    const handleCopy = async () => {
        if (!chatbotPrompt) {
            return;
        }
        try {
            await navigator.clipboard.writeText(chatbotPrompt);
            setCopied(true);
            state.showMessage('Đã copy prompt gửi chatbot AI', 'success');
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            state.showMessage('Không copy được — trình duyệt chặn clipboard', 'error');
        }
    };

    const handleSave = async () => {
        const ok = await state.handleSaveVideo2sBeatPrompt(beatId, joined);
        if (ok) {
            setSections(splitPlainImagePromptSections(joined));
        }
    };

    return (
        <Box
            sx={{
                p: 1.25,
                borderRadius: 2,
                border: 1,
                borderColor: 'divider',
                borderLeft: '4px solid',
                borderLeftColor: 'primary.main',
                bgcolor: 'background.default',
            }}
        >
            <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 0.75 }}
            >
                <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
                        {headline || 'Prompt image'}
                    </Typography>
                </Stack>
                {!promptEmpty ? (
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                        <Tooltip title="Copy toàn bộ prompt sẽ gửi cho chatbot AI (kèm tỉ lệ khung hình)">
                            <span>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color={copied ? 'success' : 'primary'}
                                    disabled={!chatbotPrompt}
                                    startIcon={copied
                                        ? <CheckIcon fontSize="small" />
                                        : <ContentCopyIcon fontSize="small" />}
                                    onClick={() => { void handleCopy(); }}
                                    sx={{ textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                                >
                                    {copied ? 'Đã copy' : 'Copy prompt'}
                                </Button>
                            </span>
                        </Tooltip>
                        <LoadingButton
                            size="small"
                            variant="contained"
                            color="primary"
                            loading={Boolean(state.savingVideo2sBeatPrompt)}
                            disabled={!dirty || editing || joined.trim() === ''}
                            startIcon={<SaveOutlinedIcon fontSize="small" />}
                            onClick={() => { void handleSave(); }}
                            sx={{ flexShrink: 0, textTransform: 'none', fontWeight: 700 }}
                        >
                            Lưu
                        </LoadingButton>
                    </Stack>
                ) : null}
            </Stack>
            {promptEmpty ? (
                <Stack spacing={0.75}>
                    <Typography variant="caption" color="warning.main" display="block">
                        Beat chưa có prompt ảnh — sinh từ Meta.ai hoặc tạo mục để nhập tay.
                    </Typography>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddOutlinedIcon fontSize="small" />}
                        onClick={() => {
                            setSections([
                                { key: 'SCRIPT SENTENCE', value: '' },
                                { key: 'IMAGE PROMPT', value: '' },
                                { key: 'NEGATIVE PROMPT', value: '' },
                            ]);
                        }}
                        sx={{ textTransform: 'none', alignSelf: 'flex-start' }}
                    >
                        Tạo mục prompt mặc định
                    </Button>
                </Stack>
            ) : (
                <Stack spacing={3}>
                    {sections.map((section, index) => (
                        <TextField
                            key={`${section.key}#${index}`}
                            label={plainImagePromptSectionLabel(section.key)}
                            value={section.value}
                            onChange={(event) => {
                                const value = event.target.value;
                                setSections((prev) => prev
                                    .map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item)));
                            }}
                            fullWidth
                            size="small"
                            multiline
                            minRows={3}
                            maxRows={16}
                            disabled={editing}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: plainImagePromptSectionColor(index),
                                },
                                '& textarea': {
                                    fontSize: 14,
                                },
                            }}
                        />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
