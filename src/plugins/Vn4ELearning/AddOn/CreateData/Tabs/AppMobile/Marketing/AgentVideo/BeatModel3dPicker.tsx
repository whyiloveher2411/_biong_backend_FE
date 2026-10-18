import React from 'react';
import { Box, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    getShortVideoModel3dBeatIds,
    listShortVideoModel3ds,
    parseShortVideoModel3dApiMessage,
    saveShortVideoModel3dBeatIds,
    type ShortVideoModel3d,
} from 'helpers/marketingShortVideoModel3dApi';

type Props = {
    shortVideoId: number;
    beatId: string;
    /** Danh sách id model 3D đang gắn với beat (từ beat_map section). */
    initialIds?: number[];
};

function formatHeight(height: number): string {
    if (!height || height <= 0) {
        return '';
    }
    return `${Number(height).toFixed(2).replace(/\.?0+$/, '')} m`;
}

/**
 * Chọn model 3D (thư viện dùng chung) cho 1 beat. Lưu ngay vào beat_map section
 * (`model_3d_ids`) — dùng để build catalog block + scaffold khi sinh HTML beat.
 */
export default function BeatModel3dPicker({ shortVideoId, beatId, initialIds = [] }: Props) {
    const { showMessage } = useFloatingMessages();
    const [models, setModels] = React.useState<ShortVideoModel3d[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [selected, setSelected] = React.useState<number[]>(initialIds);
    const [saving, setSaving] = React.useState(false);

    const initialKey = initialIds.join(',');

    React.useEffect(() => {
        setSelected(initialIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [beatId, initialKey]);

    // Nguồn truth: đọc ids đã lưu cho beat từ BE (không phụ thuộc beat_map phía FE).
    React.useEffect(() => {
        if (shortVideoId <= 0 || !beatId) {
            return undefined;
        }
        let cancelled = false;
        getShortVideoModel3dBeatIds(shortVideoId, beatId)
            .then((result) => {
                if (cancelled || result?.success === false) {
                    return;
                }
                setSelected(Array.isArray(result?.model_3d_ids) ? result.model_3d_ids : []);
            })
            .catch(() => {
                // giữ giá trị initialIds
            });
        return () => {
            cancelled = true;
        };
    }, [shortVideoId, beatId]);

    React.useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        listShortVideoModel3ds()
            .then((result) => {
                if (cancelled) {
                    return;
                }
                setLoading(false);
                if (result?.success === false) {
                    setError(parseShortVideoModel3dApiMessage(result, 'Không tải được thư viện model 3D'));
                    setModels([]);
                    return;
                }
                setModels(Array.isArray(result?.models) ? result.models : []);
            })
            .catch((err: unknown) => {
                if (cancelled) {
                    return;
                }
                setLoading(false);
                setError(err instanceof Error ? err.message : 'Không tải được thư viện model 3D');
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const persist = (nextIds: number[], prevIds: number[]) => {
        if (shortVideoId <= 0 || !beatId) {
            showMessage('Thiếu short video / beat', 'warning');
            setSelected(prevIds);
            return;
        }
        setSaving(true);
        saveShortVideoModel3dBeatIds(shortVideoId, beatId, nextIds)
            .then((result) => {
                setSaving(false);
                if (result?.success === false) {
                    showMessage(parseShortVideoModel3dApiMessage(result, 'Không lưu được model 3D cho beat'), 'error');
                    setSelected(prevIds);
                    return;
                }
                setSelected(Array.isArray(result?.model_3d_ids) ? result.model_3d_ids : nextIds);
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được model 3D cho beat', 'error');
                setSelected(prevIds);
            });
    };

    const toggle = (modelId: number) => {
        if (saving) {
            return;
        }
        const prev = selected;
        const next = prev.includes(modelId)
            ? prev.filter((id) => id !== modelId)
            : [...prev, modelId];
        setSelected(next);
        persist(next, prev);
    };

    return (
        <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                <ViewInArOutlinedIcon fontSize="small" color="primary" />
                <Typography variant="subtitle2">Model 3D</Typography>
                {selected.length > 0 ? (
                    <Chip size="small" color="primary" variant="outlined" label={`${selected.length} đã chọn`} />
                ) : null}
                {saving ? <CircularProgress size={14} sx={{ ml: 'auto' }} /> : null}
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Chọn model cho beat này — HTML beat sẽ dùng qua API <code>Assets</code>{' '}
                (chỉ các model được chọn mới có trong catalog).
            </Typography>

            {error ? (
                <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                    {error}
                </Typography>
            ) : null}

            {loading ? (
                <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={20} />
                </Box>
            ) : null}

            {!loading && models.length === 0 && !error ? (
                <Typography variant="caption" color="text.secondary">
                    Thư viện chưa có model 3D. Thêm ở nút “Quản lý model 3D” trên header.
                </Typography>
            ) : null}

            {!loading && models.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gap: 1,
                        gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))',
                    }}
                >
                    {models.map((model) => {
                        const active = selected.includes(model.id);
                        return (
                            <Tooltip
                                key={model.id}
                                title={[model.title, model.slug, model.kind, formatHeight(model.height)]
                                    .filter(Boolean)
                                    .join(' · ')}
                            >
                                <Box
                                    onClick={() => toggle(model.id)}
                                    sx={{
                                        position: 'relative',
                                        border: '2px solid',
                                        borderColor: active ? 'primary.main' : 'divider',
                                        borderRadius: 1.5,
                                        bgcolor: 'background.paper',
                                        overflow: 'hidden',
                                        cursor: saving ? 'wait' : 'pointer',
                                        transition: 'border-color .15s',
                                        '&:hover': { borderColor: active ? 'primary.main' : 'text.disabled' },
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: '100%',
                                            aspectRatio: '1 / 1',
                                            bgcolor: 'grey.100',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {model.thumbnail_url ? (
                                            <Box
                                                component="img"
                                                src={model.thumbnail_url}
                                                alt={model.title || model.slug}
                                                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        ) : (
                                            <ViewInArOutlinedIcon color="disabled" />
                                        )}
                                    </Box>
                                    <Box sx={{ px: 0.75, py: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }} noWrap>
                                            {model.slug || model.title || `#${model.id}`}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                            {model.kind === 'person' ? 'person' : 'prop'}
                                        </Typography>
                                    </Box>
                                    {active ? (
                                        <CheckCircleIcon
                                            color="primary"
                                            sx={{ position: 'absolute', top: 4, right: 4, fontSize: 20, bgcolor: 'background.paper', borderRadius: '50%' }}
                                        />
                                    ) : null}
                                </Box>
                            </Tooltip>
                        );
                    })}
                </Box>
            ) : null}
        </Box>
    );
}
