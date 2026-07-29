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
    onUploadImageFile: (file: File) => Promise<string | null>;
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
    onUploadImageFile,
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
        setImagePrompt(initialImagePrompt);
        setCreativePrompt(initialCreativePrompt);
        setVisualDescription(initialVisualDescription);
        setBackground(initialBackground);
        setPreviewUrl(initialImageUrl);
        setAiLoading(false);
        setUploadingImage(false);
    }, [
        beatId,
        initialBackground,
        initialCreativePrompt,
        initialImagePrompt,
        initialImageUrl,
        initialVisualDescription,
        open,
    ]);

    const titleLabel = beatIndex != null && beatIndex > 0
        ? `Sửa ảnh beat · beat ${beatIndex}`
        : `Sửa ảnh beat · ${beatId || 'beat'}`;

    const dirty = imagePrompt !== initialImagePrompt
        || creativePrompt !== initialCreativePrompt
        || visualDescription !== initialVisualDescription
        || background !== initialBackground;
    const busy = saving || regenerating || aiLoading || uploadingImage;
    const promptValid = Boolean(validateBeatImagePrompt(imagePrompt.trim()));
    const canSave = dirty && !busy && promptValid;
    const canRegenerate = promptValid && !busy;

    const handleSave = async () => {
        if (!canSave) {
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

    const handleRegenerate = async () => {
        const prompt = imagePrompt.trim();
        if (!validateBeatImagePrompt(prompt)) {
            showMessage('image_prompt phải có mô tả English (~30–120 từ), được phép quote label tiếng Việt', 'warning');
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
                    loading={saving}
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
                    Chỉnh image_prompt → mở Duck.ai (không auto submit) → tự upload ảnh vào beat hiện tại.
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

                <TextField
                    label="Image prompt (Duck.ai)"
                    value={imagePrompt}
                    onChange={(event) => setImagePrompt(event.target.value)}
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    maxRows={6}
                    helperText="English ~30–120 từ; line art nét mỏng; chữ Việt phải sát nghĩa phrase_anchor (cấm 'Nguyên liệu 1/2/3'); icon outline"
                    disabled={busy}
                    InputProps={{
                        endAdornment: (
                            <InputAdornment position="end" sx={{ alignSelf: 'flex-start', mt: 0.5 }}>
                                <Tooltip title={canRegenerate ? 'Sinh lại ảnh qua Duck.ai' : 'Cần image_prompt hợp lệ'}>
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
                            </InputAdornment>
                        ),
                    }}
                />

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
