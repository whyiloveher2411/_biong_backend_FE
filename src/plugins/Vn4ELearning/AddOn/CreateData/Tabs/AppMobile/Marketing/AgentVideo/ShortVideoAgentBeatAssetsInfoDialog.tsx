import React from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import HideImageOutlinedIcon from '@mui/icons-material/HideImageOutlined';
import GraphicEqOutlinedIcon from '@mui/icons-material/GraphicEqOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import CloseIcon from '@mui/icons-material/Close';

/** Target xóa hàng loạt — khớp BE bulk-delete-beat-assets. */
export type BeatAssetDeleteTarget = 'image_prompt' | 'image' | 'audio';

type Props = {
    open: boolean;
    onClose: () => void;
    /** Số beat trong beat-map hiện tại (mẫu số chung). */
    totalBeats: number;
    missingImagePromptCount: number;
    missingImageCount: number;
    pendingAudioCount: number;
    /** Số beat đang CÓ tài nguyên (để confirm số lượng sẽ bị xóa). */
    imagePromptHaveCount: number;
    imageHaveCount: number;
    readyAudioCount: number;
    /** Target đang xóa (disable toàn bộ khi bận). */
    deletingTarget: BeatAssetDeleteTarget | '';
    onDelete: (target: BeatAssetDeleteTarget) => void | Promise<void>;
};

type StatRow = {
    target: BeatAssetDeleteTarget;
    label: string;
    hint: string;
    /** Số beat còn thiếu tài nguyên. */
    missing: number;
    /** Số beat đang có tài nguyên (sẽ bị xóa nếu bấm). */
    have: number;
    deleteLabel: string;
    /** Nhãn xác nhận nêu rõ giữ lại gì. */
    confirmKeep: string;
    Icon: typeof ImageOutlinedIcon;
    color: 'primary' | 'info' | 'warning';
};

/**
 * Panel thống kê tài nguyên beat (mở từ icon info cạnh label "Video").
 *
 * Mỗi dòng là 1 nhóm tài nguyên: số beat còn THIẾU + số beat ĐANG CÓ, kèm nút
 * xóa hàng loạt ngay trên chính dòng đó (có bước xác nhận riêng).
 */
export default function ShortVideoAgentBeatAssetsInfoDialog({
    open,
    onClose,
    totalBeats,
    missingImagePromptCount,
    missingImageCount,
    pendingAudioCount,
    imagePromptHaveCount,
    imageHaveCount,
    readyAudioCount,
    deletingTarget,
    onDelete,
}: Props) {
    const theme = useTheme();
    const [confirmTarget, setConfirmTarget] = React.useState<BeatAssetDeleteTarget | null>(null);
    const busy = deletingTarget !== '';

    React.useEffect(() => {
        if (!open) {
            setConfirmTarget(null);
        }
    }, [open]);

    const rows: StatRow[] = [
        {
            target: 'image_prompt',
            label: 'Image prompt',
            hint: 'Prompt ảnh để sinh hình cho beat',
            missing: missingImagePromptCount,
            have: imagePromptHaveCount,
            deleteLabel: 'Xóa hết',
            confirmKeep: 'Ảnh beat và URL chatbot được giữ nguyên.',
            Icon: ImageOutlinedIcon,
            color: 'primary',
        },
        {
            target: 'image',
            label: 'Hình của beat',
            hint: 'Ảnh đã tải/tạo cho beat',
            missing: missingImageCount,
            have: imageHaveCount,
            deleteLabel: 'Xóa hết',
            confirmKeep: 'Image prompt và URL chatbot được giữ nguyên.',
            Icon: HideImageOutlinedIcon,
            color: 'info',
        },
        {
            target: 'audio',
            label: 'Audio của beat',
            hint: 'Audio TTS/upload riêng cho beat',
            missing: pendingAudioCount,
            have: readyAudioCount,
            deleteLabel: 'Xóa hết',
            confirmKeep: 'File MP3 ghép (merged) được giữ nguyên.',
            Icon: GraphicEqOutlinedIcon,
            color: 'warning',
        },
    ];

    const confirmRow = rows.find((row) => row.target === confirmTarget) || null;
    const totalMissing = rows.reduce((sum, row) => sum + row.missing, 0);

    const handleConfirm = async () => {
        if (!confirmTarget) {
            return;
        }
        const target = confirmTarget;
        setConfirmTarget(null);
        await onDelete(target);
    };

    const rowTint = (color: StatRow['color']) => alpha(theme.palette[color].main, 0.12);

    return (
        <>
            <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
                <DialogTitle
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        pr: 6,
                        borderBottom: 1,
                        borderColor: 'divider',
                    }}
                >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 15, fontWeight: 700, color: 'primary.contrastText' }}>
                            Tài nguyên beat
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'primary.contrastText', mt: 0.25 }}>
                            {totalBeats} beat trong beat-map hiện tại ·{' '}
                            {totalMissing > 0
                                ? `${totalMissing} tài nguyên còn thiếu`
                                : 'đã đầy đủ'}
                        </Typography>
                    </Box>
                    <Tooltip title="Đóng">
                        <span>
                            <IconButton
                                size="small"
                                onClick={onClose}
                                disabled={busy}
                                aria-label="Đóng"
                                sx={{ color: 'primary.contrastText' }}
                            >
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </span>
                    </Tooltip>
                </DialogTitle>

                <DialogContent sx={{ pt: 2, pb: 2.5 }}>
                    {totalBeats === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                                Chưa có beat trong beat-map hiện tại.
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1.25}>
                            {rows.map((row) => {
                                const RowIcon = row.Icon;
                                const isDeleting = deletingTarget === row.target;
                                const canDelete = row.have > 0 && !busy;
                                return (
                                    <Box
                                        key={row.target}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1.5,
                                            p: 1.25,
                                            borderRadius: 2,
                                            border: 1,
                                            borderColor: 'divider',
                                            bgcolor: 'background.paper',
                                            transition: 'border-color 120ms ease, box-shadow 120ms ease',
                                            '&:hover': {
                                                borderColor: alpha(theme.palette[row.color].main, 0.5),
                                                boxShadow: `0 1px 6px ${alpha(theme.palette.common.black, 0.08)}`,
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 40,
                                                height: 40,
                                                flexShrink: 0,
                                                borderRadius: 1.5,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                bgcolor: rowTint(row.color),
                                                color: `${row.color}.main`,
                                            }}
                                        >
                                            <RowIcon fontSize="small" />
                                        </Box>

                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>
                                                {row.label}
                                            </Typography>
                                            <Typography
                                                sx={{
                                                    fontSize: 11,
                                                    color: 'text.secondary',
                                                    mt: 0.15,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {row.hint}
                                            </Typography>
                                            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.6 }}>
                                                <Box
                                                    sx={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 0.4,
                                                        px: 0.7,
                                                        py: 0.15,
                                                        borderRadius: 0.75,
                                                        bgcolor: row.missing > 0
                                                            ? alpha(theme.palette.warning.main, 0.14)
                                                            : alpha(theme.palette.success.main, 0.14),
                                                        color: row.missing > 0 ? 'warning.dark' : 'success.dark',
                                                    }}
                                                >
                                                    {row.missing > 0
                                                        ? <WarningAmberRoundedIcon sx={{ fontSize: 12 }} />
                                                        : <CheckCircleOutlineRoundedIcon sx={{ fontSize: 12 }} />}
                                                    <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>
                                                        Thiếu {row.missing}
                                                    </Typography>
                                                </Box>
                                                <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
                                                    Đang có {row.have}/{totalBeats}
                                                </Typography>
                                            </Stack>
                                        </Box>

                                        <Tooltip
                                            title={row.have > 0
                                                ? `${row.deleteLabel} ${row.label.toLowerCase()} của ${row.have} beat đang có`
                                                : `Không có ${row.label.toLowerCase()} để xóa`}
                                        >
                                            <span>
                                                <Button
                                                    size="small"
                                                    color="error"
                                                    variant="outlined"
                                                    disabled={!canDelete}
                                                    startIcon={isDeleting
                                                        ? <CircularProgress size={12} color="inherit" />
                                                        : <DeleteOutlineIcon fontSize="small" />}
                                                    onClick={() => setConfirmTarget(row.target)}
                                                    sx={{ textTransform: 'none', fontSize: 12, flexShrink: 0 }}
                                                >
                                                    {row.deleteLabel}
                                                </Button>
                                            </span>
                                        </Tooltip>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2, borderTop: 1, borderColor: 'divider' }}>
                    <Button size="small" onClick={onClose} disabled={busy} sx={{ textTransform: 'none' }}>
                        Đóng
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={confirmRow !== null}
                onClose={busy ? undefined : () => setConfirmTarget(null)}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
                    Xác nhận xóa
                </DialogTitle>
                <DialogContent>
                    {confirmRow ? (
                        <Box
                            sx={{
                                display: 'flex',
                                gap: 1.25,
                                p: 1.25,
                                borderRadius: 1.5,
                                bgcolor: alpha(theme.palette.error.main, 0.08),
                                border: 1,
                                borderColor: alpha(theme.palette.error.main, 0.3),
                            }}
                        >
                            <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: 20, flexShrink: 0 }} />
                            <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                                    Xóa hết {confirmRow.label.toLowerCase()} của {confirmRow.have} beat đang có?
                                </Typography>
                                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                                    {confirmRow.confirmKeep} Thao tác này không thể hoàn tác.
                                </Typography>
                            </Box>
                        </Box>
                    ) : null}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button
                        size="small"
                        disabled={busy}
                        onClick={() => setConfirmTarget(null)}
                        sx={{ textTransform: 'none' }}
                    >
                        Hủy
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        variant="contained"
                        disabled={busy}
                        startIcon={busy ? <CircularProgress size={12} color="inherit" /> : <DeleteOutlineIcon fontSize="small" />}
                        onClick={() => { void handleConfirm(); }}
                        sx={{ textTransform: 'none' }}
                    >
                        Xóa
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
