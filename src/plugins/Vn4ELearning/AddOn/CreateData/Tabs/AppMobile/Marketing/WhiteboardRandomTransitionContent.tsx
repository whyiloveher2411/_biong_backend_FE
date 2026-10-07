import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Paper,
    Snackbar,
    Stack,
    Tooltip,
    Typography,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded';
import ImageNotSupportedOutlinedIcon from '@mui/icons-material/ImageNotSupportedOutlined';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import {
    generateAllTransitionPreviews,
    getRandomTransitionSettings,
    saveRandomTransitionSettings,
    type RandomTransitionOption,
} from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/agentVideoApi';

type Notice = { type: 'success' | 'error'; text: string } | null;

/**
 * Nội dung setting CHUNG "Hiệu ứng ngẫu nhiên" — nhúng được vào tab của drawer
 * Cài đặt chung (AccountsManageDrawer). Chọn các hiệu ứng chuyển cảnh được phép
 * xuất hiện khi video dùng transition = random. Hover card để xem preview.
 */
export function WhiteboardRandomTransitionContent({ active = true }: { active?: boolean }) {
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [rendering, setRendering] = React.useState(false);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [notice, setNotice] = React.useState<Notice>(null);

    const [options, setOptions] = React.useState<RandomTransitionOption[]>([]);
    const [selected, setSelected] = React.useState<Set<string>>(new Set());
    const [savedSelection, setSavedSelection] = React.useState<Set<string>>(new Set());
    const [missingIds, setMissingIds] = React.useState<string[]>([]);

    const load = React.useCallback(async () => {
        setLoading(true);
        setLoadError(null);
        try {
            const res = await getRandomTransitionSettings();
            const list = Array.isArray(res?.transitions) ? res.transitions : [];
            const pool = Array.isArray(res?.pool_ids) ? res.pool_ids : [];
            setOptions(list);
            setSelected(new Set(pool));
            setSavedSelection(new Set(pool));
            setMissingIds(Array.isArray(res?.missing_preview_ids) ? res.missing_preview_ids : []);
        } catch {
            setLoadError('Không tải được cài đặt hiệu ứng ngẫu nhiên');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        if (active) {
            void load();
        } else {
            setNotice(null);
        }
    }, [active, load]);

    const toggle = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => setSelected(new Set(options.map((item) => item.id)));
    const clearAll = () => setSelected(new Set());

    const dirty = React.useMemo(() => {
        if (selected.size !== savedSelection.size) {
            return true;
        }
        for (const id of selected) {
            if (!savedSelection.has(id)) {
                return true;
            }
        }
        return false;
    }, [selected, savedSelection]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await saveRandomTransitionSettings(Array.from(selected));
            if (!res?.success) {
                setNotice({ type: 'error', text: 'Lưu thất bại, vui lòng thử lại' });
                return;
            }
            const saved = Array.isArray(res.ids) ? res.ids : Array.from(selected);
            setSavedSelection(new Set(saved));
            setSelected(new Set(saved));
            setNotice({ type: 'success', text: 'Đã lưu cấu hình hiệu ứng ngẫu nhiên' });
        } catch {
            setNotice({ type: 'error', text: 'Lưu thất bại, vui lòng thử lại' });
        } finally {
            setSaving(false);
        }
    };

    const handleRenderPreviews = async (force: boolean) => {
        setRendering(true);
        try {
            const res = await generateAllTransitionPreviews(force);
            const errors = Array.isArray(res?.errors) ? res.errors : [];
            await load();
            setNotice(
                errors.length > 0
                    ? { type: 'error', text: `Render xong nhưng có ${errors.length} lỗi` }
                    : {
                          type: 'success',
                          text: force
                              ? 'Đã render lại toàn bộ preview'
                              : 'Đã render xong các preview còn thiếu',
                      },
            );
        } catch {
            setNotice({ type: 'error', text: 'Render preview thất bại' });
        } finally {
            setRendering(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={28} />
            </Box>
        );
    }

    return (
        <Stack spacing={2} sx={{ pb: 1 }}>
            <Typography variant="body2" color="text.secondary">
                Chọn các hiệu ứng được phép xuất hiện khi video dùng chuyển cảnh{' '}
                <strong>Ngẫu nhiên</strong>. Cấu hình áp dụng cho <strong>tất cả video</strong>.
                Hover vào từng hiệu ứng để xem thử video.
            </Typography>

            {loadError && (
                <Alert severity="error" onClose={() => setLoadError(null)}>
                    {loadError}
                </Alert>
            )}

            <Paper
                variant="outlined"
                sx={{
                    px: 1.5,
                    py: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    flexWrap: 'wrap',
                }}
            >
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Đã chọn {selected.size}/{options.length}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Button size="small" onClick={selectAll} sx={{ textTransform: 'none' }}>
                    Chọn tất cả
                </Button>
                <Button size="small" onClick={clearAll} sx={{ textTransform: 'none' }}>
                    Bỏ chọn tất cả
                </Button>
                <Tooltip title="Render video demo cho các hiệu ứng chưa có preview (đã bị xoá)">
                    <span>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={rendering ? <CircularProgress size={14} /> : undefined}
                            disabled={rendering || missingIds.length === 0}
                            onClick={() => handleRenderPreviews(false)}
                            sx={{ textTransform: 'none' }}
                        >
                            Render preview thiếu ({missingIds.length})
                        </Button>
                    </span>
                </Tooltip>
                <Tooltip title="Render lại video demo cho TẤT CẢ hiệu ứng (ghi đè)">
                    <span>
                        <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<RestartAltRoundedIcon fontSize="small" />}
                            disabled={rendering}
                            onClick={() => handleRenderPreviews(true)}
                            sx={{ textTransform: 'none' }}
                        >
                            Render lại tất cả
                        </Button>
                    </span>
                </Tooltip>
            </Paper>

            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                    gap: 1.5,
                }}
            >
                {options.map((item) => (
                    <TransitionCard
                        key={item.id}
                        item={item}
                        selected={selected.has(item.id)}
                        onToggle={toggle}
                    />
                ))}
            </Box>

            {options.length === 0 && <Alert severity="info">Chưa có hiệu ứng chuyển cảnh nào.</Alert>}

            <Box
                sx={{
                    position: 'sticky',
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 1,
                    py: 1,
                    bgcolor: 'background.default',
                }}
            >
                <Button
                    variant="contained"
                    disabled={!dirty || saving}
                    startIcon={saving ? <CircularProgress size={16} /> : undefined}
                    onClick={handleSave}
                    sx={{ textTransform: 'none' }}
                >
                    Lưu
                </Button>
            </Box>

            <Snackbar
                open={notice !== null}
                autoHideDuration={4000}
                onClose={() => setNotice(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={notice?.type ?? 'success'}
                    variant="filled"
                    onClose={() => setNotice(null)}
                >
                    {notice?.text}
                </Alert>
            </Snackbar>
        </Stack>
    );
}

type CardProps = {
    item: RandomTransitionOption;
    selected: boolean;
    onToggle: (id: string) => void;
};

function TransitionCard({ item, selected, onToggle }: CardProps) {
    return (
        <Paper
            variant="outlined"
            onClick={() => onToggle(item.id)}
            sx={{
                position: 'relative',
                cursor: 'pointer',
                overflow: 'hidden',
                borderRadius: 2,
                borderWidth: 2,
                borderColor: selected ? 'primary.main' : 'divider',
                transition: 'border-color 120ms ease, box-shadow 120ms ease',
                '&:hover': {
                    boxShadow: 4,
                },
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '16 / 9',
                    backgroundColor: '#0d1117',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                {item.has_preview && item.preview_url ? (
                    <video
                        src={item.preview_url}
                        muted
                        loop
                        playsInline
                        preload="none"
                        onMouseEnter={(event) => {
                            void event.currentTarget.play().catch(() => undefined);
                        }}
                        onMouseLeave={(event) => {
                            event.currentTarget.pause();
                            event.currentTarget.currentTime = 0;
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                ) : (
                    <Stack alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
                        <ImageNotSupportedOutlinedIcon fontSize="small" />
                        <Typography variant="caption">Chưa có preview</Typography>
                    </Stack>
                )}

                {selected && (
                    <CheckCircleRoundedIcon
                        color="primary"
                        sx={{ position: 'absolute', top: 6, right: 6, bgcolor: '#fff', borderRadius: '50%' }}
                    />
                )}
            </Box>

            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ px: 1, py: 0.75 }}>
                {selected ? (
                    <CheckCircleRoundedIcon color="primary" sx={{ fontSize: 18, flex: '0 0 auto' }} />
                ) : (
                    <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: 'text.disabled', flex: '0 0 auto' }} />
                )}
                <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, lineHeight: 1.2, flex: 1, minWidth: 0 }}
                    noWrap
                    title={item.label}
                >
                    {item.label}
                </Typography>
                {item.has_preview && (
                    <PlayArrowRoundedIcon sx={{ fontSize: 16, color: 'text.disabled', flex: '0 0 auto' }} />
                )}
            </Stack>
        </Paper>
    );
}
