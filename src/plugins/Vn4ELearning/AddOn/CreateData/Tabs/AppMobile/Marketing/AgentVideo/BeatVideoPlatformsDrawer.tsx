import React from 'react';
import {
    Alert,
    Box,
    Checkbox,
    CircularProgress,
    FormControlLabel,
    IconButton,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import LoadingButton from 'components/atoms/LoadingButton';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    fetchBeatVideoPlatforms,
    saveBeatVideoPlatforms,
    type BeatVideoPlatformItem,
} from 'helpers/beatVideoPlatformsApi';

type Props = {
    open: boolean;
    onClose: () => void;
};

const PLATFORM_HINT: Record<string, string> = {
    'chat.qwen.ai': 'Tài khoản Qwen (pool, xoay vòng) — cần VIDEO PROMPT hoặc prompt chung',
    'vibes.ai': 'Cookie pool vibes.ai — có auto-animate',
};

/**
 * Nội dung cài đặt convert ảnh → video: chọn nền tảng + thứ tự ưu tiên + hiển thị browser.
 * Tái sử dụng được trong tab của drawer Cài đặt chung.
 */
export function BeatVideoPlatformsContent({ active = true }: { active?: boolean }) {
    const { showMessage } = useFloatingMessages();

    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [items, setItems] = React.useState<BeatVideoPlatformItem[]>([]);
    const [openBrowser, setOpenBrowser] = React.useState(false);
    const [error, setError] = React.useState('');

    const load = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await fetchBeatVideoPlatforms();
            setItems(Array.isArray(result.platforms) ? result.platforms : []);
            setOpenBrowser(Boolean(result.open_browser));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Không tải được cài đặt nền tảng');
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (active) {
            void load();
        }
    }, [active, load]);

    const toggle = (key: string) => {
        setItems((prev) => prev.map((item) => (
            item.key === key ? { ...item, selected: !item.selected } : item
        )));
    };

    const move = (index: number, delta: number) => {
        setItems((prev) => {
            const next = [...prev];
            const target = index + delta;
            if (target < 0 || target >= next.length) {
                return prev;
            }
            [next[index], next[target]] = [next[target], next[index]];
            return next;
        });
    };

    const handleSave = async () => {
        if (saving) {
            return;
        }
        setSaving(true);
        try {
            const selected = items.filter((item) => item.selected).map((item) => item.key);
            const result = await saveBeatVideoPlatforms(selected, openBrowser);
            setItems(Array.isArray(result.platforms) ? result.platforms : items);
            setOpenBrowser(Boolean(result.open_browser));
            showMessage('Đã lưu cài đặt convert video', 'success');
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không lưu được cài đặt nền tảng', 'error');
        } finally {
            setSaving(false);
        }
    };

    const selectedCount = items.filter((item) => item.selected).length;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: 0, flex: 1 }}>
            <Alert severity="info" sx={{ py: 0.75 }}>
                Áp dụng cho TOÀN BỘ short video. Chọn nhiều nền tảng; thứ tự trên → dưới là
                thứ tự ưu tiên. Nền tảng đầu lỗi hoặc bị giới hạn sẽ tự chuyển sang nền tảng kế.
            </Alert>

            <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ flex: 1 }} />
                <Tooltip title="Tải lại">
                    <span>
                        <IconButton size="small" onClick={() => { void load(); }} disabled={loading}>
                            {loading ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>

            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5, bgcolor: 'background.paper' }}>
                <FormControlLabel
                    control={(
                        <Switch
                            checked={openBrowser}
                            onChange={(event) => setOpenBrowser(event.target.checked)}
                        />
                    )}
                    label={(
                        <Stack direction="row" spacing={0.75} alignItems="center">
                            <VisibilityOutlinedIcon fontSize="small" color="action" />
                            <Box>
                                <Typography variant="subtitle2" fontWeight={700}>
                                    Hiển thị browser khi convert
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Bật: mở browser 1920×1080 để xem quá trình (không chạy ẩn). Tắt: chạy headless nền.
                                </Typography>
                            </Box>
                        </Stack>
                    )}
                    sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                />
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }} className="custom_scroll">
                {loading && items.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress size={28} />
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : (
                    <Stack spacing={1.25}>
                        {items.map((item, index) => (
                            <Box
                                key={item.key}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                    border: 1,
                                    borderColor: item.selected ? 'primary.main' : 'divider',
                                    borderRadius: 2,
                                    px: 1.5,
                                    py: 1,
                                    bgcolor: 'background.paper',
                                }}
                            >
                                <Checkbox
                                    size="small"
                                    checked={item.selected}
                                    onChange={() => toggle(item.key)}
                                    sx={{ p: 0.5 }}
                                />
                                <Stack sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="subtitle2" fontWeight={700}>
                                        {item.label}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {PLATFORM_HINT[item.key] || 'Nền tảng convert video'}
                                    </Typography>
                                </Stack>
                                <Stack direction="row" spacing={0.25}>
                                    <Tooltip title="Ưu tiên lên">
                                        <span>
                                            <IconButton size="small" disabled={index === 0} onClick={() => move(index, -1)}>
                                                <ArrowUpwardIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Ưu tiên xuống">
                                        <span>
                                            <IconButton size="small" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                                                <ArrowDownwardIcon fontSize="small" />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                )}
            </Box>

            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                    Đã chọn {selectedCount} nền tảng
                </Typography>
                <LoadingButton
                    size="small"
                    variant="contained"
                    loading={saving}
                    disabled={selectedCount === 0}
                    onClick={() => { void handleSave(); }}
                >
                    Lưu cài đặt
                </LoadingButton>
            </Stack>
        </Box>
    );
}

export default function BeatVideoPlatformsDrawer({ open, onClose }: Props) {
    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Nền tảng convert ảnh → video"
            width={520}
            ModalProps={{ sx: { zIndex: 1500 } }}
            restDialogContent={{
                sx: {
                    p: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ height: '100%', p: 3, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <BeatVideoPlatformsContent active={open} />
            </Box>
        </DrawerCustom>
    );
}
