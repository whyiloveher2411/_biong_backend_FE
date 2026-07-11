import React from 'react';
import {
    Alert,
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
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import { readTextFromClipboard } from '../../StoreScreenshots/storeScreenshotClipboard';
import { openTtsPhoneticGeminiFillOnly } from 'helpers/marketingTtsPhoneticGeminiWorkflow';
import { extractPhoneticFromPastedText } from './agentVideoPhoneticClipboard';
import type { TtsPhoneticDictEntry } from './agentVideoApi';

type Props = {
    open: boolean;
    onClose: () => void;
    shortVideoId: number;
    sourceTerm: string;
    initialPhonetic?: string;
    existingEntry?: TtsPhoneticDictEntry | null;
    saving?: boolean;
    onSave: (payload: { sourceTerm: string; phonetic: string; id?: number }) => Promise<boolean>;
};

export default function ShortVideoAgentPhoneticDictDrawer({
    open,
    onClose,
    shortVideoId,
    sourceTerm,
    initialPhonetic = '',
    existingEntry,
    saving = false,
    onSave,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [draftSourceTerm, setDraftSourceTerm] = React.useState(sourceTerm);
    const [phonetic, setPhonetic] = React.useState(initialPhonetic);
    const [openingGemini, setOpeningGemini] = React.useState(false);
    const [pastingPhonetic, setPastingPhonetic] = React.useState(false);
    const isEdit = Boolean(existingEntry?.source_term);

    React.useEffect(() => {
        if (!open) {
            return;
        }
        setDraftSourceTerm(sourceTerm);
        setPhonetic(initialPhonetic);
    }, [initialPhonetic, open, sourceTerm]);

    const handleSave = async () => {
        const trimmedSourceTerm = draftSourceTerm.trim();
        const trimmedPhonetic = phonetic.trim();
        if (!trimmedSourceTerm || !trimmedPhonetic) {
            return;
        }

        const saved = await onSave({
            sourceTerm: trimmedSourceTerm,
            phonetic: trimmedPhonetic,
            id: existingEntry?.id,
        });
        if (saved) {
            onClose();
        }
    };

    const handleOpenGemini = async () => {
        const term = draftSourceTerm.trim();
        if (!term) {
            showMessage('Nhập từ/cụm gốc trước', 'warning');
            return;
        }
        if (!shortVideoId) {
            showMessage('Thiếu short_video_id', 'error');
            return;
        }

        setOpeningGemini(true);
        try {
            await openTtsPhoneticGeminiFillOnly({
                shortVideoId,
                sourceTerm: term,
                autoSubmit: true,
            });
            showMessage('Đã mở Gemini phiên âm — copy kết quả rồi bấm Dán', 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setOpeningGemini(false);
        }
    };

    const handlePastePhonetic = async () => {
        setPastingPhonetic(true);
        try {
            const raw = await readTextFromClipboard();
            const text = extractPhoneticFromPastedText(raw);
            if (!text.trim()) {
                showMessage('Clipboard trống hoặc không có phiên âm hợp lệ', 'warning');
                return;
            }
            setPhonetic(text);
            showMessage('Đã dán phiên âm từ clipboard', 'success');
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setPastingPhonetic(false);
        }
    };

    const trimmedSourceTerm = draftSourceTerm.trim();
    const trimmedPhonetic = phonetic.trim();
    const canSave = Boolean(trimmedSourceTerm && trimmedPhonetic);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={isEdit ? 'Chỉnh sửa phiên âm TTS' : 'Tạo phiên âm TTS'}
            width={420}
            // Whisper compare / audio settings dùng 1400 — phải cao hơn
            sx={{ zIndex: 1600 }}
            ModalProps={{
                sx: { zIndex: 1600 },
                style: { zIndex: 1600 },
            }}
            action={(
                <LoadingButton
                    variant="contained"
                    loading={saving}
                    startIcon={<SaveIcon />}
                    disabled={!canSave}
                    onClick={() => { void handleSave(); }}
                >
                    Lưu phiên âm
                </LoadingButton>
            )}
        >
            <Stack spacing={2}>
                <Alert severity="info" sx={{ py: 0.5 }}>
                    Script giữ nguyên từ gốc; TTS và Whisper align dùng phiên âm bạn nhập.
                </Alert>

                <TextField
                    label="Từ/cụm gốc"
                    value={draftSourceTerm}
                    onChange={(event) => setDraftSourceTerm(event.target.value)}
                    fullWidth
                    size="small"
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <Tooltip title="Mở Gemini và điền prompt phiên âm (bạn copy kết quả rồi Dán)">
                                    <span>
                                        <IconButton
                                            size="small"
                                            edge="end"
                                            disabled={openingGemini || !trimmedSourceTerm}
                                            onClick={() => { void handleOpenGemini(); }}
                                            aria-label="Mở Gemini phiên âm"
                                        >
                                            {openingGemini ? (
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

                <TextField
                    label="Phiên âm TTS"
                    value={phonetic}
                    onChange={(event) => setPhonetic(event.target.value)}
                    fullWidth
                    size="small"
                    autoFocus={!isEdit}
                    placeholder="Ví dụ: Ây ai"
                    helperText="Nhập cách đọc tiếng Việt mà engine TTS sẽ phát âm."
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end">
                                <Tooltip title="Dán phiên âm từ clipboard">
                                    <span>
                                        <IconButton
                                            size="small"
                                            edge="end"
                                            disabled={pastingPhonetic}
                                            onClick={() => { void handlePastePhonetic(); }}
                                            aria-label="Dán phiên âm"
                                        >
                                            {pastingPhonetic ? (
                                                <CircularProgress size={18} />
                                            ) : (
                                                <ContentPasteIcon fontSize="small" />
                                            )}
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            </InputAdornment>
                        ),
                    }}
                />

                {isEdit ? (
                    <Typography variant="caption" color="text.secondary">
                        Mục này đã có trong từ điển — lưu sẽ cập nhật phiên âm hiện tại.
                    </Typography>
                ) : (
                    <Typography variant="caption" color="text.secondary">
                        Mục mới sẽ áp dụng cho mọi pipeline TTS và caption align.
                    </Typography>
                )}
            </Stack>
        </DrawerCustom>
    );
}
