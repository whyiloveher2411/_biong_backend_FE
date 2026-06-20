import React from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import useAjax from 'hook/useApi';
import DrawerCustom from 'components/molecules/DrawerCustom';

type SegmentPreviewConfig = {
    speech_chunk_max_chars?: number;
    speech_chunk_ideal_chars?: number;
    pause_ms_clause?: number;
    pause_ms_sentence_end?: number;
    pause_ms_line_break?: number;
    pause_ms_paragraph?: number;
};

type SegmentPreviewItem = {
    index?: number;
    text?: string;
    char_count?: number;
    pause_before_ms?: number;
    pause_after_ms?: number;
    pause_before_label?: string;
    pause_after_label?: string;
    over_max_chars?: boolean;
};

type PreviewResponse = {
    success?: boolean;
    message?: { content?: string } | string;
    marketing_post_id?: number;
    target_lang?: string;
    available_langs?: string[];
    speech_text?: string;
    speech_char_count?: number;
    segment_total?: number;
    total_pause_ms?: number;
    max_segment_chars?: number;
    config?: SegmentPreviewConfig;
    segments?: SegmentPreviewItem[];
};

type Props = {
    open: boolean;
    postId: number;
    onClose: () => void;
};

function formatMs(ms: number): string {
    if (ms <= 0) {
        return '—';
    }
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(1)}s`;
    }
    return `${ms}ms`;
}

function parseMessage(raw: PreviewResponse['message']): string {
    if (typeof raw === 'string') {
        return raw;
    }
    return raw?.content || '';
}

export default function MarketingOmniVoiceSegmentsPreviewDrawer({
    open,
    postId,
    onClose,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [targetLang, setTargetLang] = React.useState('');
    const [availableLangs, setAvailableLangs] = React.useState<string[]>([]);
    const [preview, setPreview] = React.useState<PreviewResponse | null>(null);

    const loadPreview = React.useCallback((lang = '') => {
        if (!postId) {
            return;
        }
        setLoading(true);
        setError('');
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/tts/preview-omnivoice-segments',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                id: postId,
                target_lang: lang,
            },
            loading: false,
            success: (res: PreviewResponse) => {
                setLoading(false);
                if (!res?.success) {
                    setError(parseMessage(res?.message) || 'Không tải được preview segment');
                    setPreview(null);
                    return;
                }
                const langs = (res.available_langs || []).map((l) => String(l).toLowerCase());
                setAvailableLangs(langs);
                const nextLang = String(res.target_lang || langs[0] || '').toLowerCase();
                setTargetLang(nextLang);
                setPreview(res);
            },
            error: (err: unknown) => {
                setLoading(false);
                const r = err as { message?: { content?: string } };
                setError(r?.message?.content || 'Không tải được preview segment');
                setPreview(null);
            },
        });
    }, [postId]);

    React.useEffect(() => {
        if (!open || !postId) {
            return;
        }
        loadPreview();
    }, [open, postId, loadPreview]);

    const handleLangChange = (lang: string) => {
        setTargetLang(lang);
        loadPreview(lang);
    };

    const config = preview?.config || {};
    const segments = preview?.segments || [];
    const estimatedPauseSec = ((preview?.total_pause_ms || 0) / 1000).toFixed(1);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Preview segment OmniVoice"
            width={920}
            restDialogContent={{
                sx: { p: 2 },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minHeight: '100%' }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} />
                    </Box>
                )}

                {!loading && error && (
                    <Alert severity="error">{error}</Alert>
                )}

                {!loading && !error && preview && (
                    <>
                        <Alert severity="info">
                            Xem trước cách chia segment và pause trước khi generate audio.
                            Kiểm tra chỗ ngắt quãng bất thường (pause dài, segment quá ngắn/dài).
                        </Alert>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
                            {availableLangs.length > 1 ? (
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <InputLabel id="omnivoice-segment-lang-label">Ngôn ngữ</InputLabel>
                                    <Select
                                        labelId="omnivoice-segment-lang-label"
                                        value={targetLang}
                                        label="Ngôn ngữ"
                                        onChange={(e) => handleLangChange(String(e.target.value))}
                                    >
                                        {availableLangs.map((lang) => (
                                            <MenuItem key={lang} value={lang}>
                                                {lang.toUpperCase()}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            ) : (
                                <Chip size="small" label={`Ngôn ngữ: ${targetLang.toUpperCase()}`} />
                            )}
                            <Chip size="small" color="primary" label={`${preview.segment_total || 0} segment`} />
                            <Chip size="small" label={`${preview.speech_char_count || 0} ký tự speech`} />
                            <Chip size="small" label={`Pause ước tính: ${estimatedPauseSec}s`} />
                            <Chip
                                size="small"
                                color={(preview.max_segment_chars || 0) > (config.speech_chunk_max_chars || 250) ? 'warning' : 'default'}
                                label={`Max segment: ${preview.max_segment_chars || 0}/${config.speech_chunk_max_chars || 250}`}
                            />
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Chip size="small" variant="outlined" label={`, ; : → ${formatMs(config.pause_ms_clause || 0)}`} />
                            <Chip size="small" variant="outlined" label={`. ! ? → ${formatMs(config.pause_ms_sentence_end || 0)}`} />
                            <Chip size="small" variant="outlined" label={`Xuống dòng → ${formatMs(config.pause_ms_line_break || 0)}`} />
                            <Chip size="small" variant="outlined" label={`Đoạn → ${formatMs(config.pause_ms_paragraph || 0)}`} />
                        </Box>

                        <TableContainer sx={{ maxHeight: 'calc(100vh - 280px)', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ width: 56 }}>#</TableCell>
                                        <TableCell sx={{ width: 72 }}>Ký tự</TableCell>
                                        <TableCell sx={{ width: 130 }}>Pause trước</TableCell>
                                        <TableCell sx={{ width: 130 }}>Pause sau</TableCell>
                                        <TableCell>Nội dung segment</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {segments.map((segment) => {
                                        const pauseBefore = segment.pause_before_ms || 0;
                                        const pauseAfter = segment.pause_after_ms || 0;
                                        const hasLongPause = pauseBefore >= 1500 || pauseAfter >= 1500;
                                        return (
                                            <TableRow
                                                key={segment.index}
                                                hover
                                                sx={{
                                                    bgcolor: segment.over_max_chars
                                                        ? 'warning.light'
                                                        : hasLongPause
                                                            ? 'action.hover'
                                                            : 'inherit',
                                                }}
                                            >
                                                <TableCell>{segment.index}</TableCell>
                                                <TableCell>{segment.char_count}</TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color={pauseBefore > 0 ? 'text.primary' : 'text.secondary'}>
                                                        {segment.pause_before_label || formatMs(pauseBefore)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" color={pauseAfter > 0 ? 'text.primary' : 'text.secondary'}>
                                                        {segment.pause_after_label || formatMs(pauseAfter)}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            whiteSpace: 'pre-wrap',
                                                            wordBreak: 'break-word',
                                                            fontFamily: 'inherit',
                                                        }}
                                                    >
                                                        {segment.text}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {segments.length === 0 && (
                            <Alert severity="warning">Không có segment nào.</Alert>
                        )}
                    </>
                )}
            </Box>
        </DrawerCustom>
    );
}
