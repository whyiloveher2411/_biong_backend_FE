import React from 'react';
import {
    Box,
    Checkbox,
    Chip,
    CircularProgress,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DoneIcon from '@mui/icons-material/Done';
import ViewInArOutlinedIcon from '@mui/icons-material/ViewInArOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import type { ShortVideoModel3d } from 'helpers/marketingShortVideoModel3dApi';

type Props = {
    open: boolean;
    onClose: () => void;
    models: ShortVideoModel3d[];
    loading?: boolean;
    mode?: 'single' | 'multi';
    /** Ids đang chọn (multi). */
    selectedIds?: number[];
    /** Lọc theo kind ('person' | 'prop' | '' = tất cả). */
    kind?: string;
    title?: string;
    /** single: chọn 1 id. */
    onPick?: (id: number) => void;
    /** multi: xác nhận danh sách id. */
    onConfirm?: (ids: number[]) => void;
};

function heightLabel(height: number): string {
    if (!height || height <= 0) {
        return '';
    }
    return `${Number(height).toFixed(2).replace(/\.?0+$/, '')} m`;
}

/**
 * Drawer chọn model 3D từ thư viện — tìm kiếm + lọc theo kind.
 * single: click chọn & đóng. multi: tick nhiều rồi bấm "Chọn".
 */
export default function Model3dLibraryPickerDrawer({
    open,
    onClose,
    models,
    loading = false,
    mode = 'single',
    selectedIds = [],
    kind = '',
    title = 'Chọn model 3D',
    onPick,
    onConfirm,
}: Props) {
    const [query, setQuery] = React.useState('');
    const [kindFilter, setKindFilter] = React.useState(kind);
    const [picked, setPicked] = React.useState<number[]>(selectedIds);

    React.useEffect(() => {
        if (open) {
            setQuery('');
            setKindFilter(kind);
            setPicked(mode === 'multi' ? selectedIds : []);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, kind, mode]);

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return models.filter((m) => {
            if (kindFilter && (m.kind || 'prop') !== kindFilter) {
                return false;
            }
            if (!q) {
                return true;
            }
            return `${m.slug} ${m.title} ${m.description}`.toLowerCase().includes(q);
        });
    }, [models, query, kindFilter]);

    const toggle = (id: number) => {
        if (mode === 'single') {
            onPick?.(id);
            onClose();
            return;
        }
        setPicked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const headerAction = mode === 'multi' ? (
        <Stack direction="row" spacing={1}>
            <Typography variant="caption" sx={{ color: 'common.white', alignSelf: 'center' }}>
                {picked.length} đã chọn
            </Typography>
            <Tooltip title="Xác nhận">
                <span>
                    <IconButton size="small" color="inherit" onClick={() => { onConfirm?.(picked); onClose(); }}>
                        <DoneIcon sx={{ color: 'common.white' }} />
                    </IconButton>
                </span>
            </Tooltip>
        </Stack>
    ) : undefined;

    return (
        <DrawerCustom open={open} onClose={onClose} title={title} width={720} activeOnClose headerAction={headerAction}>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <TextField
                    size="small"
                    placeholder="Tìm theo slug / tên / mô tả…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    fullWidth
                    InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                />
                <TextField select size="small" value={kindFilter} onChange={(e) => setKindFilter(e.target.value)} sx={{ minWidth: 150 }}>
                    <MenuItem value="">Tất cả</MenuItem>
                    <MenuItem value="person">person</MenuItem>
                    <MenuItem value="prop">prop</MenuItem>
                </TextField>
            </Stack>

            {loading ? (
                <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                </Box>
            ) : null}

            {!loading && filtered.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>
                    Không có model phù hợp.
                </Typography>
            ) : null}

            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))' } }}>
                {filtered.map((model) => {
                    const active = picked.includes(model.id);
                    return (
                        <Stack
                            key={model.id}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            onClick={() => toggle(model.id)}
                            sx={{
                                border: '2px solid',
                                borderColor: active ? 'primary.main' : 'divider',
                                borderRadius: 1.5,
                                p: 0.75,
                                cursor: 'pointer',
                                bgcolor: 'background.paper',
                                '&:hover': { borderColor: active ? 'primary.main' : 'text.disabled' },
                            }}
                        >
                            <Box
                                sx={{
                                    width: 48,
                                    height: 48,
                                    flexShrink: 0,
                                    borderRadius: 1,
                                    bgcolor: 'grey.100',
                                    overflow: 'hidden',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {model.thumbnail_url ? (
                                    <Box component="img" src={model.thumbnail_url} alt={model.title || model.slug} sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                ) : (
                                    <ViewInArOutlinedIcon color="disabled" />
                                )}
                            </Box>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                    <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                                        {model.slug || `#${model.id}`}
                                    </Typography>
                                    <Chip size="small" label={model.kind === 'person' ? 'person' : 'prop'} variant="outlined" sx={{ height: 16, fontSize: 10 }} />
                                </Stack>
                                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                                    {[model.title, heightLabel(model.height)].filter(Boolean).join(' · ')}
                                </Typography>
                            </Box>
                            {mode === 'multi' ? (
                                <Checkbox size="small" checked={active} sx={{ p: 0.5 }} />
                            ) : null}
                        </Stack>
                    );
                })}
            </Box>
        </DrawerCustom>
    );
}
