import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';

type StyleItem = {
    id: number;
    title: string;
    channel: string;
    status: string;
};

type StyleDetail = {
    id: number;
    title: string;
    youtube_channel_id: string;
    youtube_channel_name: string;
    sample_videos: string[];
    raw_transcripts: Array<{ url: string; title: string; text: string }>;
    style_profile: Record<string, unknown>;
    style_prompt_template: string;
    analyze_status: string;
    analyze_log: string;
    language: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

const STATUS_TEXT_COLORS: Record<string, string> = {
    pending: '#64748b',
    collecting: '#d97706',
    analyzing: '#2563eb',
    ready: '#059669',
    error: '#dc2626',
};

/** Mỗi section một màu nền riêng (hex) — không phụ thuộc palette MUI */
const SECTION_STYLE = {
    formCreate: {
        bgcolor: '#dbeafe',
        borderColor: '#2563eb',
        headerBg: '#2563eb',
    },
    formEdit: {
        bgcolor: '#c7d2fe',
        borderColor: '#4338ca',
        headerBg: '#4338ca',
    },
    list: {
        bgcolor: '#d1fae5',
        borderColor: '#059669',
        headerBg: '#059669',
    },
    page: '#cbd5e1',
} as const;

export default function AudioScriptStyleManagerDrawer({ open, onClose }: Props) {
    const api = useAjax();

    const parseErrorMessage = React.useCallback((err: unknown, fallback: string) => {
        if (typeof err === 'string' && err.trim()) {
            return err;
        }
        if (err && typeof err === 'object') {
            const anyErr = err as Record<string, unknown>;
            const msgObj = anyErr.message;
            if (typeof msgObj === 'string' && msgObj.trim()) {
                return msgObj;
            }
            if (msgObj && typeof msgObj === 'object') {
                const nested = msgObj as Record<string, unknown>;
                if (typeof nested.content === 'string' && nested.content.trim()) {
                    return nested.content;
                }
            }
            if (typeof anyErr.responseText === 'string' && anyErr.responseText.trim()) {
                return anyErr.responseText.slice(0, 300);
            }
        }
        return fallback;
    }, []);

    const [styles, setStyles] = React.useState<StyleItem[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);

    const [urls, setUrls] = React.useState('');
    const [title, setTitle] = React.useState('');
    const [channelName, setChannelName] = React.useState('');
    const [language, setLanguage] = React.useState('vi');
    const [promptTemplate, setPromptTemplate] = React.useState('');

    const [selectedId, setSelectedId] = React.useState<number | null>(null);
    const [detail, setDetail] = React.useState<StyleDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = React.useState(false);
    const [reanalyzing, setReanalyzing] = React.useState(false);
    const [deletingStyle, setDeletingStyle] = React.useState(false);

    const [info, setInfo] = React.useState('');
    const [error, setError] = React.useState('');

    const isEditMode = Boolean(selectedId && detail && detail.id === selectedId);

    const resetFormForCreate = React.useCallback(() => {
        setSelectedId(null);
        setDetail(null);
        setUrls('');
        setTitle('');
        setChannelName('');
        setLanguage('vi');
        setPromptTemplate('');
    }, []);

    const loadStyles = React.useCallback(() => {
        setLoading(true);
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-audio-script-styles',
            method: 'POST',
            data: {},
            success: (res: { styles?: StyleItem[] }) => {
                setStyles(res?.styles ?? []);
                setLoading(false);
            },
            error: () => {
                setLoading(false);
            },
        });
    }, []);

    React.useEffect(() => {
        if (open) {
            loadStyles();
            setError('');
            setInfo('');
            resetFormForCreate();
        }
    }, [open]);

    React.useEffect(() => {
        if (!detail) {
            return;
        }
        setTitle(detail.title || '');
        setChannelName(detail.youtube_channel_name || '');
        setLanguage(detail.language || 'vi');
        setPromptTemplate(detail.style_prompt_template || '');
        setUrls((detail.sample_videos || []).join('\n'));
    }, [detail]);

    const loadDetail = (id: number) => {
        setLoadingDetail(true);
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/get-audio-script-styles',
            method: 'POST',
            data: { id },
            success: (res: { style?: StyleDetail }) => {
                setDetail(res?.style ?? null);
                setLoadingDetail(false);
            },
            error: () => {
                setLoadingDetail(false);
            },
        });
    };

    const handleSubmitForm = () => {
        setSubmitting(true);
        setError('');
        setInfo('');

        if (isEditMode && detail) {
            const urlList = urls
                .split('\n')
                .map((u) => u.trim())
                .filter(Boolean);
            api.ajax({
                url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/update-audio-script-style',
                method: 'POST',
                data: {
                    id: detail.id,
                    title,
                    channel_name: channelName,
                    language,
                    style_prompt_template: promptTemplate,
                    youtube_urls: urlList,
                },
                success: (res: { success?: boolean; message?: { content?: string } | string }) => {
                    setSubmitting(false);
                    if (!res?.success) {
                        setError(typeof res.message === 'string' ? res.message : res.message?.content || 'Không thể cập nhật style');
                        return;
                    }
                    setInfo('Đã lưu chỉnh sửa style');
                    loadStyles();
                    loadDetail(detail.id);
                },
                error: (err: unknown) => {
                    setSubmitting(false);
                    setError(parseErrorMessage(err, 'Lỗi kết nối khi lưu chỉnh sửa'));
                },
            });
            return;
        }

        const urlList = urls
            .split('\n')
            .map((u) => u.trim())
            .filter(Boolean);
        if (urlList.length === 0) {
            setSubmitting(false);
            setError('Nhập ít nhất 1 URL YouTube');
            return;
        }

        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/create-audio-script-style',
            method: 'POST',
            data: {
                youtube_urls: urlList,
                title: title.trim() || undefined,
                channel_name: channelName.trim() || undefined,
                language,
            },
            success: (res: { success?: boolean; message?: { content?: string } | string; style_id?: number }) => {
                setSubmitting(false);
                if (!res?.success) {
                    setError(typeof res.message === 'string' ? res.message : res.message?.content || 'Lỗi tạo style');
                    return;
                }
                setInfo(typeof res.message === 'string' ? res.message : res.message?.content || 'Thành công');
                loadStyles();
                if (res.style_id) {
                    setSelectedId(res.style_id);
                    loadDetail(res.style_id);
                }
            },
            error: (err: unknown) => {
                setSubmitting(false);
                setError(parseErrorMessage(err, 'Lỗi kết nối server'));
            },
        });
    };

    const handleReanalyze = (id: number) => {
        setReanalyzing(true);
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/analyze-audio-script-style',
            method: 'POST',
            data: { id },
            success: (res: { success?: boolean; message?: { content?: string } | string }) => {
                setReanalyzing(false);
                if (res?.success) {
                    setInfo('Phân tích lại thành công');
                    loadDetail(id);
                    loadStyles();
                } else {
                    setError(typeof res.message === 'string' ? res.message : res.message?.content || 'Lỗi');
                }
            },
            error: (err: unknown) => {
                setReanalyzing(false);
                setError(parseErrorMessage(err, 'Lỗi kết nối'));
            },
        });
    };

    const handleDelete = () => {
        if (!detail) {
            return;
        }
        if (!window.confirm(`Bạn chắc chắn muốn xóa style "${detail.title || `#${detail.id}`}"?`)) {
            return;
        }
        setDeletingStyle(true);
        setError('');
        api.ajax({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/delete-audio-script-style',
            method: 'POST',
            data: { id: detail.id },
            success: (res: { success?: boolean; message?: { content?: string } | string }) => {
                setDeletingStyle(false);
                if (!res?.success) {
                    setError(typeof res.message === 'string' ? res.message : res.message?.content || 'Không thể xóa style');
                    return;
                }
                setInfo(typeof res.message === 'string' ? res.message : res.message?.content || 'Đã xóa style');
                loadStyles();
                resetFormForCreate();
            },
            error: (err: unknown) => {
                setDeletingStyle(false);
                setError(parseErrorMessage(err, 'Lỗi kết nối khi xóa style'));
            },
        });
    };

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Script Style Profiles"
            width={820}
            activeOnClose
        >
            <Box sx={{ p: 2, bgcolor: SECTION_STYLE.page }}>
                {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
                {info && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setInfo('')}>{info}</Alert>}

                <Box
                    sx={{
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: isEditMode ? SECTION_STYLE.formEdit.borderColor : SECTION_STYLE.formCreate.borderColor,
                        bgcolor: isEditMode ? SECTION_STYLE.formEdit.bgcolor : SECTION_STYLE.formCreate.bgcolor,
                        mb: 2,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1,
                            bgcolor: isEditMode ? SECTION_STYLE.formEdit.headerBg : SECTION_STYLE.formCreate.headerBg,
                            color: 'common.white',
                        }}
                    >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'white' }}>
                                1) {isEditMode ? 'Chỉnh sửa phong cách đã chọn' : 'Tạo phong cách mới từ YouTube'}
                            </Typography>
                            {isEditMode && detail ? (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Chip
                                        label={detail.analyze_status}
                                        size="small"
                                        sx={{
                                            bgcolor: 'common.white',
                                            color: STATUS_TEXT_COLORS[detail.analyze_status] || '#64748b',
                                            fontWeight: 600,
                                            '& .MuiChip-label': {
                                                color: STATUS_TEXT_COLORS[detail.analyze_status] || '#64748b',
                                            },
                                        }}
                                    />
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={resetFormForCreate}
                                        sx={{
                                            textTransform: 'none',
                                            bgcolor: 'common.white',
                                            color: isEditMode
                                                ? SECTION_STYLE.formEdit.headerBg
                                                : SECTION_STYLE.formCreate.headerBg,
                                            boxShadow: 'none',
                                            '&:hover': {
                                                bgcolor: 'grey.100',
                                                boxShadow: 'none',
                                            },
                                        }}
                                    >
                                        Tạo mới
                                    </Button>
                                </Stack>
                            ) : null}
                        </Stack>
                    </Box>

                    <Stack spacing={1.25} sx={{ p: 2 }}>
                        {loadingDetail && selectedId ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                                <CircularProgress size={24} />
                            </Box>
                        ) : (
                            <>
                        <TextField
                            size="small"
                            label="YouTube URLs (mỗi dòng 1 URL, 3-5 video cùng kênh)"
                            multiline
                            minRows={3}
                            maxRows={6}
                            value={urls}
                            onChange={(e) => setUrls(e.target.value)}
                            disabled={submitting}
                            helperText={isEditMode ? 'Bạn có thể cập nhật danh sách URL mẫu và bấm Lưu chỉnh sửa.' : undefined}
                        />
                        <Stack direction="row" spacing={1}>
                            <TextField
                                size="small"
                                label="Tên phong cách"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                disabled={submitting}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                size="small"
                                label="Tên kênh"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                disabled={submitting}
                                sx={{ flex: 1 }}
                            />
                            <TextField
                                size="small"
                                label="Ngôn ngữ"
                                select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                disabled={submitting}
                                sx={{ width: 110 }}
                                SelectProps={{ native: true }}
                            >
                                <option value="vi">VI</option>
                                <option value="en">EN</option>
                            </TextField>
                        </Stack>

                        <TextField
                            size="small"
                            label="Prompt template"
                            multiline
                            minRows={5}
                            maxRows={12}
                            value={promptTemplate}
                            onChange={(e) => setPromptTemplate(e.target.value)}
                            disabled={submitting}
                        />

                        <Stack direction="row" spacing={1}>
                            <Button
                                variant="contained"
                                size="small"
                                onClick={handleSubmitForm}
                                disabled={submitting || (!isEditMode && !urls.trim())}
                                sx={{ textTransform: 'none' }}
                            >
                                {submitting
                                    ? (isEditMode ? 'Đang lưu...' : 'Đang phân tích...')
                                    : (isEditMode ? 'Lưu chỉnh sửa' : 'Thu thập & Phân tích')}
                            </Button>
                            {isEditMode && detail ? (
                                <>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => handleReanalyze(detail.id)}
                                        disabled={reanalyzing || submitting}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {reanalyzing ? 'Đang phân tích lại...' : 'Phân tích lại'}
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        onClick={handleDelete}
                                        disabled={deletingStyle || submitting}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {deletingStyle ? 'Đang xóa...' : 'Xóa phong cách'}
                                    </Button>
                                </>
                            ) : null}
                        </Stack>
                            </>
                        )}
                    </Stack>
                </Box>

                <Box
                    sx={{
                        borderRadius: 2,
                        border: '2px solid',
                        borderColor: SECTION_STYLE.list.borderColor,
                        bgcolor: SECTION_STYLE.list.bgcolor,
                        mb: 2,
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        sx={{
                            px: 2,
                            py: 1,
                            bgcolor: SECTION_STYLE.list.headerBg,
                            color: 'common.white',
                        }}
                    >
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, flex: 1, color: 'white' }}>
                                2) Danh sách phong cách
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={loadStyles}
                                disabled={loading}
                                sx={{ color: 'common.white' }}
                            >
                                <RefreshIcon fontSize="small" />
                            </IconButton>
                        </Stack>
                    </Box>

                    <Box sx={{ p: 2 }}>
                    {loading && <CircularProgress size={20} />}

                    <Stack spacing={1}>
                        {styles.map((s) => {
                            const isSelected = selectedId === s.id;
                            return (
                            <Box
                                key={s.id}
                                sx={{
                                    p: 1.25,
                                    border: '2px solid',
                                    borderColor: isSelected ? SECTION_STYLE.list.headerBg : 'divider',
                                    borderRadius: 1,
                                    cursor: 'pointer',
                                    bgcolor: isSelected ? '#a7f3d0' : 'common.white',
                                    '&:hover': { borderColor: SECTION_STYLE.list.borderColor },
                                }}
                                onClick={() => {
                                    setSelectedId(s.id);
                                    loadDetail(s.id);
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <Typography variant="body2" fontWeight={isSelected ? 700 : 600} sx={{ flex: 1 }}>
                                        {s.title || `Style #${s.id}`}
                                    </Typography>
                                    {isSelected && (
                                        <Chip
                                            label="Đang chọn"
                                            size="small"
                                            sx={{
                                                bgcolor: SECTION_STYLE.list.headerBg,
                                                color: 'common.white',
                                                fontWeight: 700,
                                                '& .MuiChip-label': {
                                                    color: 'common.white',
                                                },
                                            }}
                                        />
                                    )}
                                    {s.channel && (
                                        <Typography variant="caption" color="text.secondary">
                                            {s.channel}
                                        </Typography>
                                    )}
                                    <Chip
                                        label={s.status}
                                        size="small"
                                        sx={{
                                            color: STATUS_TEXT_COLORS[s.status] || '#64748b',
                                            borderColor: STATUS_TEXT_COLORS[s.status] || '#64748b',
                                            fontWeight: 600,
                                            '& .MuiChip-label': {
                                                color: STATUS_TEXT_COLORS[s.status] || '#64748b',
                                            },
                                        }}
                                        variant="outlined"
                                    />
                                </Stack>
                            </Box>
                            );
                        })}
                        {!loading && styles.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Chưa có phong cách nào
                            </Typography>
                        )}
                    </Stack>
                    </Box>
                </Box>
            </Box>
        </DrawerCustom>
    );
}
