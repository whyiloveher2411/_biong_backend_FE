import React from 'react';
import { Box, Chip, CircularProgress, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseIcon from '@mui/icons-material/Close';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import { useFloatingMessages } from 'hook/useFloatingMessages';
import {
    getShortVideoModel3dBeatIds,
    listShortVideoModel3ds,
    parseShortVideoModel3dApiMessage,
    saveShortVideoModel3dBeatIds,
    type ShortVideoModel3d,
} from 'helpers/marketingShortVideoModel3dApi';
import Model3dLibraryPickerDrawer from './Model3dLibraryPickerDrawer';

type Props = {
    shortVideoId: number;
    beatId: string;
    initialIds?: number[];
};

/**
 * Chọn trước model 3D cho beat (tuỳ chọn). Chỉ hiện model ĐÃ CHỌN; thêm qua drawer
 * danh sách model (không load hết ra ngoài).
 */
export default function BeatModel3dPicker({ shortVideoId, beatId, initialIds = [] }: Props) {
    const { showMessage } = useFloatingMessages();
    const [models, setModels] = React.useState<ShortVideoModel3d[]>([]);
    const [ids, setIds] = React.useState<number[]>(initialIds);
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [drawerOpen, setDrawerOpen] = React.useState(false);

    const initialKey = initialIds.join(',');

    React.useEffect(() => {
        setIds(initialIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [beatId, initialKey]);

    React.useEffect(() => {
        setLoading(true);
        listShortVideoModel3ds()
            .then((res) => setModels(Array.isArray(res?.models) ? res.models : []))
            .catch(() => setModels([]))
            .finally(() => setLoading(false));
    }, []);

    React.useEffect(() => {
        if (shortVideoId <= 0 || !beatId) {
            return undefined;
        }
        let cancelled = false;
        getShortVideoModel3dBeatIds(shortVideoId, beatId)
            .then((res) => {
                if (!cancelled && res?.success !== false && Array.isArray(res?.model_3d_ids)) {
                    setIds(res.model_3d_ids);
                }
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [shortVideoId, beatId]);

    const modelById = React.useMemo(() => {
        const out = new Map<number, ShortVideoModel3d>();
        models.forEach((m) => out.set(Number(m.id), m));
        return out;
    }, [models]);

    const persist = (next: number[]) => {
        const prev = ids;
        setIds(next);
        if (shortVideoId <= 0 || !beatId) {
            return;
        }
        setSaving(true);
        saveShortVideoModel3dBeatIds(shortVideoId, beatId, next)
            .then((res) => {
                setSaving(false);
                if (res?.success === false) {
                    showMessage(parseShortVideoModel3dApiMessage(res, 'Không lưu được model cho beat'), 'error');
                    setIds(prev);
                }
            })
            .catch((err: unknown) => {
                setSaving(false);
                showMessage(err instanceof Error ? err.message : 'Không lưu được model cho beat', 'error');
                setIds(prev);
            });
    };

    return (
        <Box sx={{ mt: 1.5 }}>
            <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.75 }}>
                <ViewInArOutlinedIcon fontSize="small" color="secondary" />
                <Typography variant="subtitle2">Model 3D chọn trước</Typography>
                <Chip size="small" variant="outlined" label="tuỳ chọn" />
                {ids.length > 0 ? <Chip size="small" color="secondary" variant="outlined" label={`${ids.length}`} /> : null}
                {saving ? <CircularProgress size={14} sx={{ ml: 'auto' }} /> : null}
            </Stack>

            <Box sx={{ display: 'grid', gap: 0.75, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
                {ids.map((id) => {
                    const model = modelById.get(id);
                    return (
                        <Stack
                            key={id}
                            direction="row"
                            spacing={0.75}
                            alignItems="center"
                            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 0.5, bgcolor: 'background.paper' }}
                        >
                            <Box sx={{ width: 34, height: 34, flexShrink: 0, borderRadius: 1, bgcolor: 'grey.100', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {model?.thumbnail_url ? (
                                    <Box component="img" src={model.thumbnail_url} alt={model.title || ''} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    <ViewInArOutlinedIcon fontSize="small" color="disabled" />
                                )}
                            </Box>
                            <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 0, flex: 1 }} noWrap>
                                {model?.slug || `#${id}`}
                            </Typography>
                            <Tooltip title="Bỏ khỏi beat">
                                <span>
                                    <IconButton size="small" onClick={() => persist(ids.filter((x) => x !== id))} disabled={saving}>
                                        <CloseIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Stack>
                    );
                })}

                <Box
                    onClick={() => setDrawerOpen(true)}
                    sx={{
                        border: '1px dashed',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                        minHeight: 44,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 0.5,
                        cursor: 'pointer',
                        color: 'text.secondary',
                        '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                    }}
                >
                    <AddOutlinedIcon fontSize="small" />
                    <Typography variant="caption">Thêm model</Typography>
                </Box>
            </Box>

            <Model3dLibraryPickerDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                models={models}
                loading={loading}
                mode="multi"
                selectedIds={ids}
                title="Chọn model 3D chọn trước"
                onConfirm={(next) => persist(next)}
            />
        </Box>
    );
}
