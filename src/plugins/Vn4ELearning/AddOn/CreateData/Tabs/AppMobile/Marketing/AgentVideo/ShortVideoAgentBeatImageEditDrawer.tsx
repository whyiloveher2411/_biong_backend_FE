import React from 'react';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
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
import {
    joinPlainImagePromptSections,
    plainImagePromptSectionColor,
    plainImagePromptSectionLabel,
    splitPlainImagePromptSections,
} from './agentVideoManualBeats';
import { validateBeatImagePrompt } from './agentVideoBeatMap';
import ShortVideoAgentBeatImagePreview from './ShortVideoAgentBeatImagePreview';

type Props = {
    open: boolean;
    onClose: () => void;
    beatId: string;
    beatIndex?: number | null;
    durationSec?: number | null;
    initialVisualDescription: string;
    initialBackground?: string;
    initialImagePrompt: string;
    initialImageUrl?: string;
    initialCreativePrompt?: string;
    clipAspect?: import('./agentVideoClipAspect').ClipAspect;
    saving?: boolean;
    regenerating?: boolean;
    onSave: (payload: {
        imagePrompt: string;
        creativePrompt: string;
        visualDescription: string;
        background: string;
    }) => Promise<boolean>;
    onRegenerateZImage: (payload: { imagePrompt: string }) => Promise<string | null>;
    onRegenerateMetaAi?: (payload: { imagePrompt: string }) => Promise<string | null>;
    onUploadImageFile: (file: File) => Promise<string | null>;
    /** Video 2s: prompt ảnh plain text hiện tại của beat (từ marks) — bật chế độ */
    /** split-section thay vì JSON image_prompt. */
    video2sPlainImagePrompt?: string | null;
    /** Video 2s: lưu plain prompt (sections ghép lại) về marks beat này. */
    onSaveVideo2sPlainPrompt?: (prompt: string) => Promise<boolean>;
    /** Video 2s: đang lưu plain prompt (save-mark-prompt). */
    savingVideo2sPrompt?: boolean;
};

export default function ShortVideoAgentBeatImageEditDrawer({
    open,
    onClose,
    beatId,
    beatIndex = null,
    durationSec = null,
    initialVisualDescription,
    initialBackground = '',
    initialImagePrompt,
    initialImageUrl = '',
    initialCreativePrompt = '',
    clipAspect = '9:16',
    saving = false,
    regenerating = false,
    onSave,
    onRegenerateZImage,
    onRegenerateMetaAi,
    onUploadImageFile,
    video2sPlainImagePrompt = '',
    onSaveVideo2sPlainPrompt,
    savingVideo2sPrompt = false,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [imagePrompt, setImagePrompt] = React.useState(initialImagePrompt);
    const [creativePrompt, setCreativePrompt] = React.useState(initialCreativePrompt);
    const [visualDescription, setVisualDescription] = React.useState(initialVisualDescription);
    const [background, setBackground] = React.useState(initialBackground);
    const [previewUrl, setPreviewUrl] = React.useState(initialImageUrl);
    const [aiLoading, setAiLoading] = React.useState(false);
    const [uploadingImage, setUploadingImage] = React.useState(false);
    const syncedOpenKeyRef = React.useRef('');
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // Video 2s — chế độ split-section: prompt plain text tách thành từng section,
    // mỗi section 1 textarea. Danh sách section derive TỪ prompt nên field mới
    // (thêm sau trong format Meta.ai) tự xuất hiện không cần sửa UI.
    const plainMode = Boolean(onSaveVideo2sPlainPrompt);
    const [promptSections, setPromptSections] = React.useState(() =>
        splitPlainImagePromptSections(String(video2sPlainImagePrompt ?? '')));
    const initialPlainPrompt = String(video2sPlainImagePrompt ?? '');
    const plainJoined = plainMode ? joinPlainImagePromptSections(promptSections) : '';
    const plainDirty = plainJoined.trim() !== initialPlainPrompt.trim();
    // Prompt SAVED gần nhất — so để phân biệt "prompt đổi từ DB" vs "user đang gõ chưa lưu".
    const savedPlainRef = React.useRef(initialPlainPrompt);

    React.useEffect(() => {
        if (!open) {
            syncedOpenKeyRef.current = '';
            savedPlainRef.current = '';
            return;
        }
        const openKey = `${beatId}::open`;
        if (syncedOpenKeyRef.current === openKey) {
            return;
        }
        syncedOpenKeyRef.current = openKey;
        setImagePrompt(initialImagePrompt);
        setCreativePrompt(initialCreativePrompt);
        setVisualDescription(initialVisualDescription);
        setBackground(initialBackground);
        setPreviewUrl(initialImageUrl);
        setAiLoading(false);
        setUploadingImage(false);
        setPromptSections(splitPlainImagePromptSections(initialPlainPrompt));
        savedPlainRef.current = initialPlainPrompt;
    }, [
        beatId,
        initialBackground,
        initialCreativePrompt,
        initialImagePrompt,
        initialImageUrl,
        initialPlainPrompt,
        initialVisualDescription,
        open,
    ]);

    // Prompt đổi từ DB (marks load chậm lúc refresh, import mới, beat khác) → tự
    // sync; user đang gõ (joined khác CẢ bản saved cũ lẫn bản mới) thì không đè.
    React.useEffect(() => {
        if (!open || !plainMode) {
            return;
        }
        const previousSaved = savedPlainRef.current;
        savedPlainRef.current = initialPlainPrompt;
        setPromptSections((prev) => {
            const joined = joinPlainImagePromptSections(prev).trim();
            if (
                joined !== ''
                && joined !== previousSaved.trim()
                && joined !== initialPlainPrompt.trim()
            ) {
                return prev;
            }
            return splitPlainImagePromptSections(initialPlainPrompt);
        });
    }, [
        beatId,
        initialPlainPrompt,
        open,
        plainMode,
    ]);

    const handlePromptSectionChange = (index: number, value: string) => {
        setPromptSections((prev) => prev
            .map((item, itemIndex) => (itemIndex === index ? { ...item, value } : item)));
    };

    const titleLabel = beatIndex != null && beatIndex > 0
        ? `Sửa ảnh beat · beat ${beatIndex}`
        : `Sửa ảnh beat · ${beatId || 'beat'}`;

    const dirty = plainMode
        ? plainDirty
        : imagePrompt !== initialImagePrompt
            || creativePrompt !== initialCreativePrompt
            || visualDescription !== initialVisualDescription
            || background !== initialBackground;
    const busy = saving || regenerating || aiLoading || uploadingImage || savingVideo2sPrompt;
    const promptValid = plainMode
        ? plainJoined.trim() !== ''
        : Boolean(validateBeatImagePrompt(imagePrompt.trim()));
    const canSave = dirty && !busy && promptValid;
    const canRegenerate = promptValid && !busy;

    const handleSave = async () => {
        if (!canSave) {
            return;
        }
        if (plainMode) {
            if (!onSaveVideo2sPlainPrompt) {
                return;
            }
            const saved = await onSaveVideo2sPlainPrompt(plainJoined);
            if (saved) {
                onClose();
            }
            return;
        }
        const saved = await onSave({
            imagePrompt: imagePrompt.trim(),
            creativePrompt,
            visualDescription,
            background,
        });
        if (saved) {
            onClose();
        }
    };

    const resolveRegeneratePrompt = (): { prompt: string; valid: boolean } => {
        if (plainMode) {
            return { prompt: plainJoined.trim(), valid: plainJoined.trim() !== '' };
        }
        const trimmed = imagePrompt.trim();
        return validateBeatImagePrompt(trimmed)
            ? { prompt: trimmed, valid: true }
            : { prompt: '', valid: false };
    };

    const handleRegenerate = async () => {
        const { prompt, valid } = resolveRegeneratePrompt();
        if (!valid || !prompt) {
            showMessage('Prompt không hợp lệ', 'warning');
            return;
        }
        setAiLoading(true);
        try {
            const nextUrl = await onRegenerateZImage({ imagePrompt: prompt });
            if (nextUrl) {
                setPreviewUrl(nextUrl);
            }
        } finally {
            setAiLoading(false);
        }
    };

    const handleUploadImage = async (file?: File | null) => {
        if (!file) {
            return;
        }
        setUploadingImage(true);
        try {
            const nextUrl = await onUploadImageFile(file);
            if (nextUrl) {
                setPreviewUrl(nextUrl);
            }
        } finally {
            setUploadingImage(false);
        }
    };

    const handleRegenerateMetaAi = async () => {
        if (!onRegenerateMetaAi) {
            return;
        }
        const { prompt, valid } = resolveRegeneratePrompt();
        if (!valid || !prompt) {
            showMessage('Prompt không hợp lệ', 'warning');
            return;
        }
        setAiLoading(true);
        try {
            const nextUrl = await onRegenerateMetaAi({ imagePrompt: prompt });
            if (nextUrl) {
                setPreviewUrl(nextUrl);
            }
        } finally {
            setAiLoading(false);
        }
    };

    const regenerateAdornment = (
        <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
            <Stack direction="row" spacing={0.25}>
                <Tooltip title="Sinh lại ảnh qua Duck.ai">
                    <span>
                        <IconButton
                            color="primary"
                            edge="end"
                            disabled={!canRegenerate}
                            onClick={() => { void handleRegenerate(); }}
                            aria-label="Sinh lại ảnh Duck.ai"
                        >
                            {(aiLoading || regenerating) ? (
                                <CircularProgress size={18} />
                            ) : (
                                <AutoAwesomeIcon fontSize="small" />
                            )}
                        </IconButton>
                    </span>
                </Tooltip>
                {onRegenerateMetaAi ? (
                    <Tooltip title="Sinh lại ảnh qua Meta.ai">
                        <span>
                            <IconButton
                                color="secondary"
                                edge="end"
                                disabled={!canRegenerate}
                                onClick={() => { void handleRegenerateMetaAi(); }}
                                aria-label="Sinh lại ảnh Meta.ai"
                            >
                                {(aiLoading || regenerating) ? (
                                    <CircularProgress size={18} />
                                ) : (
                                    <AutoAwesomeIcon fontSize="small" />
                                )}
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : null}
            </Stack>
        </InputAdornment>
    );

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title={(
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                    <ImageOutlinedIcon fontSize="small" />
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
                    loading={plainMode ? savingVideo2sPrompt : saving}
                    disabled={!canSave}
                    startIcon={<SaveIcon />}
                    onClick={() => { void handleSave(); }}
                >
                    Lưu ảnh beat
                </LoadingButton>
            )}
        >
            <Stack spacing={1.5} sx={{ height: '100%', minHeight: 0 }}>
                <Alert severity="info" sx={{ py: 0.5, flexShrink: 0 }}>
                    Chỉnh image_prompt → mở Duck.ai hoặc Meta.ai → download ảnh → tự lưu vào beat hiện tại.
                </Alert>

                <ShortVideoAgentBeatImagePreview
                    beatId={beatId}
                    imageUrl={previewUrl}
                    clipAspect={clipAspect}
                />

                <TextField
                    label="Visual description"
                    value={visualDescription}
                    onChange={(event) => setVisualDescription(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={4}
                    disabled={busy}
                />

                <TextField
                    label="Background"
                    value={background}
                    onChange={(event) => setBackground(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={3}
                    disabled={busy}
                />

                {!plainMode ? (
                    <TextField
                        label="Image prompt (Duck.ai / Meta.ai)"
                        value={imagePrompt}
                        onChange={(event) => setImagePrompt(event.target.value)}
                        fullWidth
                        size="small"
                        multiline
                        minRows={3}
                        maxRows={6}
                        helperText="English ~30–120 từ; line art nét mỏng; chữ Việt phải sát nghĩa phrase_anchor (cấm 'Nguyên liệu 1/2/3'); icon outline"
                        disabled={busy}
                        InputProps={{ endAdornment: regenerateAdornment }}
                    />
                ) : (
                    <Box>
                        <Stack
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                            spacing={1}
                            sx={{ mb: 0.75 }}
                        >
                            <Stack spacing={0}>
                                <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                                    Prompt image
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Mỗi mục 1 ô riêng — cắt theo “TÊN MỤC:” trong prompt; mục mới xuất hiện trong prompt tự thêm ô (không cần sửa UI)
                                </Typography>
                            </Stack>
                            <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                                {onRegenerateMetaAi ? (
                                    <Tooltip title={canRegenerate ? 'Sinh lại ảnh qua Meta.ai' : 'Cần có nội dung prompt'}>
                                        <span>
                                            <IconButton
                                                color="secondary"
                                                size="small"
                                                disabled={!canRegenerate}
                                                onClick={() => { void handleRegenerateMetaAi(); }}
                                                aria-label="Sinh lại ảnh Meta.ai"
                                            >
                                                {(aiLoading || regenerating) ? (
                                                    <CircularProgress size={18} />
                                                ) : (
                                                    <AutoAwesomeIcon fontSize="small" />
                                                )}
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                ) : null}
                                {regenerating ? <CircularProgress size={18} /> : null}
                            </Stack>
                        </Stack>
                        {promptSections.length === 0 ? (
                            <Typography variant="caption" color="warning.main" display="block">
                                Beat chưa có prompt ảnh — bấm “Sinh prompt ảnh từ Meta.ai” hoặc nhập các mục bên dưới.
                            </Typography>
                        ) : null}
                        <Stack spacing={1.25} sx={{ mt: 0.75 }}>
                        {promptSections.map((section, index) => (
                            <TextField
                                key={`${section.key}#${index}`}
                                label={plainImagePromptSectionLabel(section.key)}
                                value={section.value}
                                onChange={(event) => handlePromptSectionChange(index, event.target.value)}
                                fullWidth
                                size="small"
                                multiline
                                minRows={3}
                                maxRows={16}
                                disabled={busy}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        bgcolor: plainImagePromptSectionColor(index),
                                    },
                                }}
                            />
                        ))}
                        </Stack>
                    </Box>
                )}

                <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                    <LoadingButton
                        size="small"
                        variant="outlined"
                        loading={uploadingImage}
                        disabled={busy}
                        startIcon={<UploadFileIcon fontSize="small" />}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Upload ảnh cho beat này
                    </LoadingButton>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(event) => {
                            const file = event.target.files?.[0] || null;
                            void handleUploadImage(file);
                            event.currentTarget.value = '';
                        }}
                    />
                </Stack>

                <TextField
                    label="Prompt sáng tạo / ghi chú"
                    value={creativePrompt}
                    onChange={(event) => setCreativePrompt(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    maxRows={4}
                    placeholder="Ghi chú nội bộ cho lần sinh lại tiếp theo…"
                    disabled={busy}
                />

                {(aiLoading || regenerating || uploadingImage) ? (
                    <Typography variant="caption" color="info.main" sx={{ flexShrink: 0 }}>
                        {uploadingImage ? 'Đang upload ảnh vào beat…' : 'Đang mở Duck.ai…'}
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
            </Stack>
        </DrawerCustom>
    );
}
