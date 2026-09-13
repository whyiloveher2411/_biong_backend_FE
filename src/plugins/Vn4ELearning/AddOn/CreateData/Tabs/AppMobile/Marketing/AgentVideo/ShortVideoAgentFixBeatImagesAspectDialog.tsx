import React from 'react';
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    checkBeatImagesAspect,
    confirmFixBeatImagesAspect,
    parseApiMessage,
} from './agentVideoApi';
import { useFloatingMessages } from 'hook/useFloatingMessages';

type Props = {
    shortVideoId: number;
    open: boolean;
    onClose: () => void;
};

/** 1 beat cần làm lại — mode quyết định cách chạy job. */
type FixItem = {
    beat_id: string;
    mode: 'chat' | 'regen' | 'missing';
    width?: number;
    height?: number;
    actual_aspect?: string;
    expected_aspect?: string;
};

const FIX_MODE_NOTE: Record<FixItem['mode'], string> = {
    chat: 'Fix theo chat cũ (update ảnh, không tạo mới)',
    regen: 'Không có chat cũ — bỏ ảnh và tạo mới như fill thường',
    missing: 'Ảnh đã xóa — tạo chat MỚI (không dùng chat cũ)',
};

/**
 * "Làm lại các ảnh không đúng tỉ lệ" — bước Ảnh beat (pipeline popup):
 * Mở dialog → check toàn bộ ảnh beat (dimension thật, so ratio với agent_clip_aspect)
 * + beat đã XÓA ảnh → user xác nhận → tạo job per ảnh:
 * - còn ảnh + có chat_url → job mode aspect_fix: mở lại chat cũ + prompt update tỉ lệ;
 * - ảnh đã xóa / không chat_url → bỏ ảnh + job fill thường tạo chat mới.
 */
export default function ShortVideoAgentFixBeatImagesAspectDialog({
    shortVideoId,
    open,
    onClose,
}: Props) {
    const { showMessage } = useFloatingMessages();
    const [checking, setChecking] = React.useState(false);
    const [confirming, setConfirming] = React.useState(false);
    const [checked, setChecked] = React.useState(false);
    const [scan, setScan] = React.useState<FixItem[]>([]);
    const [total, setTotal] = React.useState(0);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());

    const load = React.useCallback(async () => {
        if (shortVideoId <= 0) {
            showMessage('Thiếu short video id', 'error');
            return;
        }
        setChecking(true);
        setChecked(false);
        setScan([]);
        setSelected(new Set());
        try {
            const res = await checkBeatImagesAspect(shortVideoId);
            const mismatched = Array.isArray(res.mismatched_beats) ? res.mismatched_beats : [];
            const missing = Array.isArray(res.missing_beats) ? res.missing_beats : [];
            const items: FixItem[] = [
                ...mismatched.map((item) => ({
                    beat_id: item.beat_id,
                    mode: item.has_chat ? 'chat' : 'regen' as FixItem['mode'],
                    width: item.width,
                    height: item.height,
                    actual_aspect: item.actual_aspect,
                    expected_aspect: item.expected_aspect,
                })),
                ...missing
                    .filter((item) => item?.beat_id)
                    .map((item) => ({ beat_id: item.beat_id, mode: 'missing' as const })),
            ];
            setScan(items);
            setTotal(Number(res.total || 0));
            setSelected(new Set(items.map((item) => item.beat_id)));
            setChecked(true);
            if (items.length === 0) {
                showMessage(
                    parseApiMessage(res.message) || 'Tất cả ảnh beat đều đúng tỉ lệ',
                    'success',
                );
                onClose();
                return;
            }
            showMessage(
                parseApiMessage(res.message)
                    || `Có ${items.length} beat cần làm lại ảnh`,
                'warning',
            );
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setChecking(false);
        }
    }, [onClose, shortVideoId, showMessage]);

    React.useEffect(() => {
        if (open) {
            void load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const confirm = React.useCallback(async () => {
        if (selected.size === 0) {
            return;
        }
        setConfirming(true);
        try {
            const res = await confirmFixBeatImagesAspect(shortVideoId, Array.from(selected));
            const queued = Number(
                res.queued_total
                ?? (Number(res.aspect_fix_queued || 0) + Number(res.regen_queued || 0)),
            );
            showMessage(
                parseApiMessage(res.message)
                    || `Đã tạo ${queued} job làm lại ảnh (chat cũ nếu còn, tạo chat mới nếu ảnh đã xóa)`,
                queued > 0 ? 'success' : 'warning',
            );
            onClose();
        } catch (e) {
            showMessage(e instanceof Error ? e.message : String(e), 'error');
        } finally {
            setConfirming(false);
        }
    }, [onClose, selected, shortVideoId, showMessage]);

    const toggle = React.useCallback((beatId: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(beatId)) {
                next.delete(beatId);
            } else {
                next.add(beatId);
            }
            return next;
        });
    }, []);

    return (
        <Dialog
            open={open}
            onClose={checking || confirming ? undefined : onClose}
            fullWidth
            maxWidth="sm"
        >
            <DialogTitle sx={{ fontSize: 15 }}>Làm lại các ảnh không đúng tỉ lệ</DialogTitle>
            <DialogContent>
                {checking ? (
                    <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary', fontSize: 13 }}>
                        Đang kiểm tra tỉ lệ các ảnh beat (đọc dimension thật của từng ảnh)…
                    </Box>
                ) : !checked ? (
                    <Box sx={{ py: 3, textAlign: 'center', color: 'text.secondary', fontSize: 12 }}>
                        Bấm Đóng rồi mở lại để kiểm tra.
                    </Box>
                ) : (
                    <Stack spacing={1} sx={{ pt: 0.5 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                            {scan.length} beat cần làm lại ảnh / tổng {total} ảnh beat. Ảnh còn và có
                            chat cũ → mở lại chat Meta.ai và gửi prompt update đúng tỉ lệ (không làm
                            lại mới); ảnh không có chat / ảnh đã xóa → bỏ và tạo chat MỚI.
                        </Typography>
                        {scan.map((item) => (
                            <Box
                                key={item.beat_id}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    border: '1px solid rgba(0,0,0,0.12)',
                                }}
                            >
                                <Checkbox
                                    size="small"
                                    checked={selected.has(item.beat_id)}
                                    disabled={confirming}
                                    onChange={() => toggle(item.beat_id)}
                                />
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                                        {item.beat_id}
                                        {item.mode === 'missing' ? (
                                            ' — Ảnh đã xóa'
                                        ) : (
                                            <>
                                                {' — '}
                                                {item.width}x{item.height} ({item.actual_aspect}) ≠{' '}
                                                {item.expected_aspect}
                                            </>
                                        )}
                                    </Typography>
                                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                                        {FIX_MODE_NOTE[item.mode]}
                                    </Typography>
                                </Box>
                            </Box>
                        ))}
                    </Stack>
                )}
            </DialogContent>
            <DialogActions>
                {checked && scan.length > 0 ? (
                    <Tooltip title="Chỉ kiểm tra lại danh sách ảnh sai tỉ lệ (không tạo job)">
                        <span>
                            <Button size="small" disabled={checking || confirming} onClick={() => void load()}>
                                Kiểm tra lại
                            </Button>
                        </span>
                    </Tooltip>
                ) : null}
                <Button
                    size="small"
                    disabled={checking || confirming}
                    onClick={onClose}
                >
                    Đóng
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    disabled={checking || confirming || selected.size === 0}
                    onClick={() => void confirm()}
                >
                    {confirming ? 'Đang tạo job…' : `Tạo job (${selected.size})`}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
