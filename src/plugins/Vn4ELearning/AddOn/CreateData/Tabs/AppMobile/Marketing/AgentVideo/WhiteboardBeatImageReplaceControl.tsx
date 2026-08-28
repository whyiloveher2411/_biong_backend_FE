import React from 'react';
import {
    Box,
    Checkbox,
    CircularProgress,
    Tooltip,
    Typography,
} from '@mui/material';

type Props = {
    imageUrl?: string | null;
    disabled?: boolean;
    saving?: boolean;
    onPickFile: (file: File) => Promise<void> | void;
    /** Hiện checkbox "dán ảnh beat lên background" — chỉ khi beat có custom bg đang bật. */
    showOverBackground?: boolean;
    overBackground?: boolean;
    onOverBackgroundChange?: (next: boolean) => void;
};

/**
 * Box đổi ảnh beat — trên nút custom background.
 * Chỉ chọn file rồi đẩy lên cha (cha confirm + xóa timeline trước khi upload).
 */
export default function WhiteboardBeatImageReplaceControl({
    imageUrl,
    disabled = false,
    saving = false,
    onPickFile,
    showOverBackground = false,
    overBackground = false,
    onOverBackgroundChange,
}: Props) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const beatUrl = String(imageUrl || '').trim();
    const hasImage = beatUrl !== '';
    const busy = Boolean(saving);

    const pickFile = () => {
        if (busy || disabled) return;
        inputRef.current?.click();
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
            <Tooltip placement="right" title="Click để đổi ảnh beat">
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
                        borderColor: hasImage ? 'warning.light' : 'rgba(255,255,255,0.45)',
                        bgcolor: 'rgba(0,0,0,0.45)',
                        overflow: 'hidden',
                        cursor: busy || disabled ? 'wait' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: disabled ? 0.55 : 1,
                        '&:hover': {
                            borderColor: 'common.white',
                            bgcolor: 'rgba(0,0,0,0.6)',
                        },
                    }}
                >
                    {hasImage ? (
                        <Box
                            component="img"
                            src={beatUrl}
                            alt="Ảnh beat"
                            draggable={false}
                            sx={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
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
                            đổi ảnh
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

                    {showOverBackground && !busy ? (
                        <Tooltip
                            placement="top"
                            title={overBackground
                                ? 'Đang dán toàn bộ ảnh beat lên custom background'
                                : 'Dán toàn bộ ảnh beat lên custom background'}
                        >
                            <Checkbox
                                size="small"
                                checked={overBackground}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) => {
                                    event.stopPropagation();
                                    onOverBackgroundChange?.(event.target.checked);
                                }}
                                inputProps={{ 'aria-label': 'Dán ảnh beat lên custom background' }}
                                sx={{
                                    position: 'absolute',
                                    top: -2,
                                    right: -2,
                                    p: 0.25,
                                    color: 'common.white',
                                    bgcolor: 'rgba(0,0,0,0.6)',
                                    borderRadius: 0.5,
                                    '&.Mui-checked': { color: 'warning.light' },
                                    '& .MuiSvgIcon-root': { fontSize: 16 },
                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' },
                                }}
                            />
                        </Tooltip>
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
                    if (file) {
                        void onPickFile(file);
                    }
                }}
            />
        </Box>
    );
}
