import React from 'react';
import {
    Box,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { uploadAgentVisualImage } from './agentVideoApi';

type Props = {
    shortVideoId: number;
    url?: string | null;
    hidden?: boolean;
    saving?: boolean;
    onChange: (patch: {
        custom_background_url?: string | null;
        custom_background_hidden?: boolean;
    }) => Promise<boolean> | boolean | void;
};

/**
 * Box custom background per-beat — dưới nút hiệu ứng riêng.
 * Có ảnh + không ẩn → render dùng nền này; mắt ẩn = giữ URL, preview/render dùng ảnh beat.
 */
export default function WhiteboardCustomBackgroundControl({
    shortVideoId,
    url,
    hidden = false,
    saving = false,
    onChange,
}: Props) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = React.useState(false);
    const bgUrl = String(url || '').trim();
    const hasBg = bgUrl !== '';
    const isHidden = Boolean(hidden);
    const busy = uploading || saving;

    const pickFile = () => {
        if (busy) return;
        inputRef.current?.click();
    };

    const handleFile = async (file: File | null) => {
        if (!file || shortVideoId <= 0) return;
        setUploading(true);
        try {
            const res = await uploadAgentVisualImage(shortVideoId, file);
            const nextUrl = String(res?.url || res?.preview_url || '').trim();
            if (!res?.success || !nextUrl) {
                return;
            }
            await onChange({
                custom_background_url: nextUrl,
                custom_background_hidden: false,
            });
        } finally {
            setUploading(false);
        }
    };

    const handleClear = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (busy) return;
        void onChange({
            custom_background_url: '',
            custom_background_hidden: false,
        });
    };

    const handleToggleHidden = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (!hasBg || busy) return;
        void onChange({ custom_background_hidden: !isHidden });
    };

    return (
        <Box
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            sx={{
                position: 'relative',
                width: 56,
                height: 56,
                flexShrink: 0,
                alignSelf: 'flex-start',
            }}
        >
            <Tooltip
                placement="right"
                title={hasBg ? 'Click để đổi background' : 'Upload custom background'}
            >
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={pickFile}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            pickFile();
                        }
                    }}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 1,
                        border: '1.5px dashed',
                        borderColor: hasBg && !isHidden ? 'primary.light' : 'rgba(255,255,255,0.45)',
                        bgcolor: 'rgba(0,0,0,0.45)',
                        overflow: 'hidden',
                        cursor: busy ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: isHidden && hasBg ? 0.55 : 1,
                        '&:hover': {
                            borderColor: 'common.white',
                            bgcolor: 'rgba(0,0,0,0.6)',
                        },
                    }}
                >
                    {hasBg ? (
                        <Box
                            component="img"
                            src={bgUrl}
                            alt="Custom background"
                            draggable={false}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                                filter: isHidden ? 'grayscale(0.4)' : 'none',
                            }}
                        />
                    ) : (
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'rgba(255,255,255,0.85)',
                                fontSize: 9,
                                lineHeight: 1.15,
                                textAlign: 'center',
                                px: 0.5,
                                userSelect: 'none',
                            }}
                        >
                            background
                        </Typography>
                    )}

                    {busy ? (
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'rgba(0,0,0,0.45)',
                            }}
                        >
                            <CircularProgress size={18} sx={{ color: 'common.white' }} />
                        </Box>
                    ) : null}

                    {hasBg && !busy ? (
                        <Stack
                            direction="row"
                            spacing={0.25}
                            sx={{
                                position: 'absolute',
                                top: 1,
                                right: 1,
                            }}
                        >
                            <Tooltip
                                placement="top"
                                title={isHidden
                                    ? 'Hiện custom background (preview + render)'
                                    : 'Ẩn custom background (giữ ảnh, dùng nền beat)'}
                            >
                                <IconButton
                                    size="small"
                                    aria-label={isHidden ? 'Hiện custom background' : 'Ẩn custom background'}
                                    onClick={handleToggleHidden}
                                    sx={{
                                        width: 18,
                                        height: 18,
                                        p: 0,
                                        bgcolor: 'rgba(0,0,0,0.7)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
                                    }}
                                >
                                    {isHidden
                                        ? <VisibilityOffIcon sx={{ fontSize: 12 }} />
                                        : <VisibilityIcon sx={{ fontSize: 12 }} />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip placement="top" title="Xóa custom background">
                                <IconButton
                                    size="small"
                                    aria-label="Xóa custom background"
                                    onClick={handleClear}
                                    sx={{
                                        width: 18,
                                        height: 18,
                                        p: 0,
                                        bgcolor: 'rgba(0,0,0,0.7)',
                                        color: 'common.white',
                                        '&:hover': { bgcolor: 'error.main' },
                                    }}
                                >
                                    <CloseIcon sx={{ fontSize: 12 }} />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    ) : null}
                </Box>
            </Tooltip>

            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = '';
                    void handleFile(file);
                }}
            />
        </Box>
    );
}
