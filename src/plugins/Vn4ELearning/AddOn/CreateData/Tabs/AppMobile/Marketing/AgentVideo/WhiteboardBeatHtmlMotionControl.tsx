import React from 'react';
import {
    Box,
    Checkbox,
    CircularProgress,
    Tooltip,
    Typography,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';

type Props = {
    /** Beat đã có HTML motion (beat_html[beatId].html) hay chưa. */
    hasHtml?: boolean;
    /** Đang chọn HTML motion làm nguồn render (media_source = 'html'). */
    selected?: boolean;
    saving?: boolean;
    disabled?: boolean;
    /** Click box → mở popup nhập/sửa HTML. */
    onOpenEditor: () => Promise<void> | void;
    /** Tick/bỏ tick checkbox chọn nguồn render HTML motion. */
    onSelectChange: (selected: boolean) => Promise<boolean> | void;
};

/**
 * Box HTML motion — đặt dưới box Animate. Click mở popup nhập HTML; tick checkbox
 * để render beat bằng HTML (HyperFrames) thay cho ảnh/video. Chỉ 1 trong 3 nguồn
 * image / video / html được chọn.
 */
export default function WhiteboardBeatHtmlMotionControl({
    hasHtml = false,
    selected = false,
    saving = false,
    disabled = false,
    onOpenEditor,
    onSelectChange,
}: Props) {
    const busy = Boolean(saving);

    const openEditor = () => {
        if (busy || disabled) return;
        void onOpenEditor();
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
                title={hasHtml ? 'Sửa HTML motion của beat' : 'Nhập HTML motion cho beat'}
            >
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={openEditor}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openEditor();
                        }
                    }}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 1,
                        border: '1.5px dashed',
                        borderColor: hasHtml && selected ? 'primary.light' : 'rgba(255,255,255,0.45)',
                        bgcolor: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.25,
                        cursor: busy || disabled ? 'wait' : 'pointer',
                        opacity: disabled ? 0.55 : (hasHtml && !selected ? 0.7 : 1),
                        '&:hover': {
                            borderColor: 'common.white',
                            bgcolor: 'rgba(0,0,0,0.65)',
                        },
                    }}
                >
                    <CodeIcon
                        sx={{
                            fontSize: 18,
                            color: hasHtml ? 'common.white' : 'rgba(255,255,255,0.85)',
                            filter: hasHtml && !selected ? 'grayscale(0.35)' : 'none',
                        }}
                    />
                    <Typography
                        variant="caption"
                        sx={{
                            color: hasHtml ? 'common.white' : 'rgba(255,255,255,0.85)',
                            fontSize: 9,
                            lineHeight: 1.15,
                            textAlign: 'center',
                            px: 0.5,
                            userSelect: 'none',
                        }}
                    >
                        HTML
                    </Typography>

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
                </Box>
            </Tooltip>

            {hasHtml && !busy ? (
                <Tooltip
                    placement="top"
                    title={selected
                        ? 'Đang dùng HTML motion để render (bỏ chọn để dùng ảnh/video)'
                        : 'Dùng HTML motion thay ảnh/video để render'}
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
                        inputProps={{ 'aria-label': 'Dùng HTML motion cho beat' }}
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
        </Box>
    );
}
