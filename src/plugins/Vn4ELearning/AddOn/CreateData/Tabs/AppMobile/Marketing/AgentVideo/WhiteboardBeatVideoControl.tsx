import React from 'react';
import {
    Box,
    Checkbox,
    CircularProgress,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

type Props = {
    videoUrl?: string | null;
    /** Đang chọn video làm nguồn render (media_source = 'video'). */
    selected?: boolean;
    saving?: boolean;
    disabled?: boolean;
    onUploadFile: (file: File) => Promise<string | null> | Promise<void> | void;
    onClear: () => Promise<boolean> | void;
    onSelectChange: (selected: boolean) => Promise<boolean> | void;
    /** Có ảnh beat để animate hay không (nút Animate chỉ bật khi có ảnh). */
    canAnimate?: boolean;
    /** Đang chạy animate (vibes.ai). */
    animating?: boolean;
    /** Convert ảnh beat → video bằng vibes.ai headless. */
    onAnimateImage?: () => Promise<void> | void;
};

/**
 * Box video thay thế ảnh beat — đặt dưới nút custom background.
 * Có video + được chọn → render dùng video (fit tốc độ theo audio beat);
 * bỏ chọn → render dùng ảnh beat. Chỉ chọn 1 trong 2 (ảnh/video).
 */
export default function WhiteboardBeatVideoControl({
    videoUrl,
    selected = false,
    saving = false,
    disabled = false,
    onUploadFile,
    onClear,
    onSelectChange,
    canAnimate = false,
    animating = false,
    onAnimateImage,
}: Props) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [uploading, setUploading] = React.useState(false);
    const url = String(videoUrl || '').trim();
    const hasVideo = url !== '';
    const busy = uploading || Boolean(saving);

    const pickFile = () => {
        if (busy || disabled) return;
        inputRef.current?.click();
    };

    const handleFile = async (file: File | null) => {
        if (!file) return;
        setUploading(true);
        try {
            await onUploadFile(file);
        } finally {
            setUploading(false);
        }
    };

    const handleClear = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (busy || disabled) return;
        void onClear();
    };

    return (
        <>
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
                title={hasVideo ? 'Click để đổi video thay thế' : 'Upload video thay thế ảnh beat'}
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
                        borderColor: hasVideo && selected ? 'primary.light' : 'rgba(255,255,255,0.45)',
                        bgcolor: 'rgba(0,0,0,0.45)',
                        overflow: 'hidden',
                        cursor: busy || disabled ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: disabled ? 0.55 : (hasVideo && !selected ? 0.7 : 1),
                        '&:hover': {
                            borderColor: 'common.white',
                            bgcolor: 'rgba(0,0,0,0.6)',
                        },
                    }}
                >
                    {hasVideo ? (
                        <>
                            <Box
                                component="video"
                                src={`${url}#t=0.1`}
                                muted
                                playsInline
                                preload="metadata"
                                draggable={false}
                                sx={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                    filter: selected ? 'none' : 'grayscale(0.35)',
                                }}
                            />
                            <PlayArrowIcon
                                sx={{
                                    position: 'absolute',
                                    color: 'common.white',
                                    fontSize: 22,
                                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))',
                                    pointerEvents: 'none',
                                }}
                            />
                        </>
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
                            video
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

                    {hasVideo && !busy ? (
                        <Stack
                            direction="row"
                            spacing={0.25}
                            sx={{ position: 'absolute', top: 1, right: 1 }}
                        >
                            <Tooltip placement="top" title="Xóa video thay thế">
                                <IconButton
                                    size="small"
                                    aria-label="Xóa video thay thế"
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

            {hasVideo && !busy ? (
                <Tooltip
                    placement="top"
                    title={selected
                        ? 'Đang dùng video để render (bỏ chọn để dùng ảnh beat)'
                        : 'Dùng video thay ảnh beat để render'}
                >
                    <Checkbox
                        size="small"
                        checked={selected}
                        disabled={disabled}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => {
                            event.stopPropagation();
                            void onSelectChange(event.target.checked);
                        }}
                        inputProps={{ 'aria-label': 'Dùng video beat' }}
                        sx={{
                            position: 'absolute',
                            top: -2,
                            left: -2,
                            p: 0.25,
                            color: 'common.white',
                            bgcolor: 'rgba(0,0,0,0.6)',
                            borderRadius: 0.5,
                            '&.Mui-checked': { color: 'primary.light' },
                            '& .MuiSvgIcon-root': { fontSize: 16 },
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' },
                        }}
                    />
                </Tooltip>
            ) : null}

            <input
                ref={inputRef}
                type="file"
                accept="video/*"
                hidden
                onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = '';
                    void handleFile(file);
                }}
            />
        </Box>

        {onAnimateImage ? (
            <Tooltip
                placement="right"
                title={canAnimate
                    ? (hasVideo ? 'Animate lại ảnh beat → video (vibes.ai)' : 'Animate ảnh beat → video (vibes.ai)')
                    : 'Beat chưa có ảnh để animate'}
            >
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                        event.stopPropagation();
                        if (animating || disabled || !canAnimate) return;
                        void onAnimateImage();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            if (!animating && !disabled && canAnimate) void onAnimateImage();
                        }
                    }}
                    sx={{
                        width: 56,
                        height: 22,
                        flexShrink: 0,
                        alignSelf: 'flex-start',
                        mt: 0.25,
                        borderRadius: 1,
                        border: '1.5px solid',
                        borderColor: canAnimate ? 'primary.light' : 'rgba(255,255,255,0.3)',
                        bgcolor: canAnimate ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)',
                        color: canAnimate ? 'common.white' : 'rgba(255,255,255,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25,
                        cursor: animating || disabled || !canAnimate ? 'not-allowed' : 'pointer',
                        opacity: disabled ? 0.55 : 1,
                        '&:hover': {
                            bgcolor: canAnimate ? 'primary.dark' : 'rgba(0,0,0,0.35)',
                        },
                    }}
                >
                    {animating ? (
                        <CircularProgress size={12} sx={{ color: 'common.white' }} />
                    ) : (
                        <AutoAwesomeIcon sx={{ fontSize: 13 }} />
                    )}
                    <Typography
                        variant="caption"
                        sx={{ fontSize: 9, lineHeight: 1, userSelect: 'none' }}
                    >
                        Animate
                    </Typography>
                </Box>
            </Tooltip>
        ) : null}
        </>
    );
}
