import React from 'react';
import {
    Alert,
    Box,
    IconButton,
    Link,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import useAjax from 'hook/useApi';
import { buildGoogleImagesUrl, copyMarketingText } from './marketingImageUtils';

export type ImagePlacement = {
    id: string;
    role?: string;
    after_heading?: string;
    alt_text?: string;
    visual_prompt?: string;
    image_keyword?: string;
    placement_hint?: string;
    url?: string;
};

interface Props {
    postId: number;
    placements: ImagePlacement[];
    onPlacementsChange?: (placements: ImagePlacement[]) => void;
    onSynced?: (payload: {
        content_text?: string;
        image_placements?: ImagePlacement[];
    }) => void;
}

const tableSx = {
    border: '1px solid',
    borderColor: 'divider',
    '& .MuiTableCell-root': {
        borderRight: '1px solid',
        borderColor: 'divider',
        borderBottom: '1px solid',
        borderBottomColor: 'divider',
        py: 1.5,
        px: 1.25,
        verticalAlign: 'top',
    },
    '& .MuiTableCell-root:last-of-type': {
        borderRight: 'none',
    },
    '& .MuiTableHead-root .MuiTableCell-root': {
        bgcolor: 'grey.100',
        fontWeight: 700,
        fontSize: 12,
    },
};

function roleLabel(role?: string): string {
    if (role === 'cover') return 'Cover';
    return 'Trong bài';
}

export default function MarketingImagePlacementsEditor({ postId, placements, onPlacementsChange, onSynced }: Props) {
    const api = useAjax();
    const inlinePlacements = React.useMemo(
        () => placements.filter((p) => p.role !== 'cover'),
        [placements],
    );
    const [rows, setRows] = React.useState<ImagePlacement[]>(inlinePlacements);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setRows(inlinePlacements);
    }, [inlinePlacements]);

    const syncUrls = React.useCallback((nextRows: ImagePlacement[]) => {
        if (!postId || nextRows.length === 0) return;
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/sync-image-urls',
            method: 'POST',
            loading: false,
            data: {
                post_id: postId,
                placements: nextRows.map((r) => ({ id: r.id, url: r.url || '' })),
            },
            success: (res: {
                content_text?: string;
                image_placements?: ImagePlacement[];
            }) => {
                if (res?.image_placements) {
                    setRows(res.image_placements);
                }
                onSynced?.(res);
            },
        });
    }, [api, postId, onSynced]);

    const mergeWithCover = (inlineRows: ImagePlacement[]): ImagePlacement[] => {
        const cover = placements.find((p) => p.role === 'cover');
        return cover ? [cover, ...inlineRows] : inlineRows;
    };

    const handleUrlChange = (id: string, url: string) => {
        const nextInline = rows.map((r) => (r.id === id ? { ...r, url } : r));
        const next = mergeWithCover(nextInline);
        setRows(nextInline);
        onPlacementsChange?.(next);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            syncUrls(mergeWithCover(nextInline));
        }, 400);
    };

    if (rows.length === 0) {
        return null;
    }

    return (
        <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
                Dán URL ảnh vào từng dòng — markdown bài viết tự cập nhật. Bấm từ khóa để mở Google Images (nếu không dùng ảnh AI).
            </Alert>
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1 }}>
                <Table size="small" sx={tableSx}>
                    <TableHead>
                        <TableRow>
                            <TableCell width="14%">Vị trí</TableCell>
                            <TableCell width="16%">Alt</TableCell>
                            <TableCell width="28%">Prompt (EN)</TableCell>
                            <TableCell width="14%">Từ khóa ảnh</TableCell>
                            <TableCell width="28%">URL ảnh</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row) => {
                            const keyword = String(row.image_keyword || '').trim();
                            return (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Typography variant="caption" fontWeight={700} display="block">
                                            {roleLabel(row.role)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                            {row.placement_hint || row.after_heading || row.id}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontSize: 12 }}>
                                            {row.alt_text || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                                            <Typography
                                                variant="body2"
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    fontSize: 11,
                                                    flex: 1,
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    wordBreak: 'break-word',
                                                }}
                                            >
                                                {row.visual_prompt || '—'}
                                            </Typography>
                                            {row.visual_prompt && (
                                                <Tooltip title="Sao chép prompt đầy đủ">
                                                    <IconButton
                                                        size="small"
                                                        onClick={() => copyMarketingText(row.visual_prompt || '')}
                                                        sx={{ mt: -0.25 }}
                                                    >
                                                        <ContentCopyIcon sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        {keyword ? (
                                            <Link
                                                component="button"
                                                type="button"
                                                variant="body2"
                                                onClick={() => window.open(
                                                    buildGoogleImagesUrl(keyword),
                                                    '_blank',
                                                    'noopener,noreferrer',
                                                )}
                                                sx={{
                                                    fontFamily: 'monospace',
                                                    fontSize: 11,
                                                    textAlign: 'left',
                                                    display: 'inline-flex',
                                                    alignItems: 'flex-start',
                                                    gap: 0.25,
                                                }}
                                            >
                                                {keyword}
                                                <OpenInNewIcon sx={{ fontSize: 12, mt: 0.25, flexShrink: 0 }} />
                                            </Link>
                                        ) : (
                                            <Typography variant="body2" color="text.secondary">—</Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <TextField
                                            size="small"
                                            fullWidth
                                            placeholder="https://..."
                                            value={row.url || ''}
                                            onChange={(e) => handleUrlChange(row.id, e.target.value)}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
