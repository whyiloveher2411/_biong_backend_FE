import React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';

type LanguageItem = {
    code: string;
    name: string;
    flag_code?: string;
    icon_url?: string;
};

type TranslateLangStatus = {
    needs_translate?: boolean;
    translate_complete?: boolean;
    partial_items?: string[];
};

type PrepareData = {
    success?: boolean;
    source_lang?: string;
    languages?: LanguageItem[];
    missing_languages?: LanguageItem[];
    missing_langs?: string[];
    filled_langs?: string[];
    can_translate?: boolean;
    translate_status?: Record<string, TranslateLangStatus>;
    source?: { title?: string; content_block_count?: number };
    message?: { content?: string } | string;
};

function extractApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message?.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

type Props = {
    open: boolean;
    onClose: () => void;
    data: CreatePostTypeData;
    onRefreshPost?: () => void;
};

export default function MarketingContentTranslateDrawer({ open, onClose, data, onRefreshPost }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const postId = Number(data.post?.id || 0);
    const [loadingPrepare, setLoadingPrepare] = React.useState(false);
    const [prepareError, setPrepareError] = React.useState<string | null>(null);
    const [prepareData, setPrepareData] = React.useState<PrepareData | null>(null);
    const [aiLoading, setAiLoading] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [confirmProvider, setConfirmProvider] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [statusAlert, setStatusAlert] = React.useState<{
        severity: 'info' | 'success' | 'error';
        text: string;
    } | null>(null);
    const [geminiWebOpening, setGeminiWebOpening] = React.useState<Record<string, boolean>>({});

    const loadPrepare = React.useCallback(() => {
        if (!postId) return;
        setLoadingPrepare(true);
        setPrepareError(null);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-translate/prepare',
            method: 'POST',
            data: { post_id: postId, id: postId },
            loading: false,
            success: (res: PrepareData) => {
                setLoadingPrepare(false);
                if (!res?.success) {
                    setPrepareError(extractApiMessage(res));
                    setPrepareData(null);
                    return;
                }
                setPrepareData(res);
            },
            error: (err: unknown) => {
                setLoadingPrepare(false);
                setPrepareError(extractApiMessage(err));
            },
        });
    }, [postId]);

    React.useEffect(() => {
        if (open && postId) loadPrepare();
    }, [open, postId, loadPrepare]);

    React.useEffect(() => {
        if (!open || !postId) return;
        const onWindowFocus = () => {
            loadPrepare();
            onRefreshPost?.();
        };
        window.addEventListener('focus', onWindowFocus);
        return () => window.removeEventListener('focus', onWindowFocus);
    }, [open, postId, loadPrepare, onRefreshPost]);

    const handleOpenGeminiWeb = (targetLang: string) => {
        if (!postId || !targetLang || aiLoading !== null) return;
        const code = targetLang.trim().toLowerCase();
        if (!code || code === 'vi') return;

        setGeminiWebOpening((prev) => ({ ...prev, [code]: true }));
        setStatusAlert({
            severity: 'info',
            text: `Đang tạo prompt dịch sang ${code}…`,
        });

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-translate/get-gemini-prompt',
            method: 'POST',
            data: {
                post_id: postId,
                id: postId,
                target_lang: code,
                fresh_session: 1,
            },
            loading: false,
            success: (res: {
                success?: boolean;
                prompt?: string;
                target_lang?: string;
                batch_index?: number;
                batch_count?: number;
                batch_codes?: string[];
            }) => {
                setGeminiWebOpening((prev) => ({ ...prev, [code]: false }));
                if (!res?.success) {
                    setStatusAlert({ severity: 'error', text: extractApiMessage(res) });
                    return;
                }
                const promptText = String(res.prompt || '').trim();
                if (!promptText) {
                    setStatusAlert({ severity: 'error', text: 'Không tạo được prompt.' });
                    return;
                }
                const lang = String(res.target_lang || code);
                const batchCount = Number(res.batch_count ?? 1);
                const batchIndex = Number(res.batch_index ?? 0);

                void import('helpers/marketingGeminiWorkflow').then(({ buildGeminiWorkflowUrl }) => {
                    const url = buildGeminiWorkflowUrl({
                        postId,
                        action: 'content_translate',
                        targetLang: lang,
                        batchIndex,
                        batchCodes: res.batch_codes,
                        freshSession: true,
                        prompt: promptText,
                    });
                    window.open(url, '_blank', 'noopener,noreferrer');
                });

                let msg =
                    `Đã mở Gemini web — dịch ${lang.toUpperCase()} (text + caption). ` +
                    'Extension lưu batch và đóng tab; quay lại drawer để xem tiến độ.';
                if (batchCount > 1) {
                    msg += ` (Batch ${batchIndex + 1}/${batchCount}.)`;
                }
                setStatusAlert({ severity: 'info', text: msg });
            },
            error: (err: unknown) => {
                setGeminiWebOpening((prev) => ({ ...prev, [code]: false }));
                setStatusAlert({ severity: 'error', text: extractApiMessage(err) });
            },
        });
    };

    const runTranslate = (provider: 'gemini' | 'deepseek') => {
        if (!postId || !prepareData?.can_translate) return;
        setAiLoading(provider);
        setStatusAlert({
            severity: 'info',
            text: `Đang dịch sang ${prepareData.missing_langs?.length ?? 0} ngôn ngữ… (có thể mất vài phút)`,
        });
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-translate/run',
            method: 'POST',
            data: {
                post_id: postId,
                ai_provider: provider,
                target_langs: prepareData.missing_langs || [],
            },
            loading: false,
            success: (res: { success?: boolean; translated?: string[]; errors?: string[] }) => {
                setAiLoading(null);
                if (!res?.success) {
                    setStatusAlert({ severity: 'error', text: extractApiMessage(res) });
                    return;
                }
                const langs = (res.translated || []).join(', ');
                setStatusAlert({
                    severity: 'success',
                    text: langs ? `Đã dịch: ${langs}` : extractApiMessage(res),
                });
                loadPrepare();
                onRefreshPost?.();
            },
            error: (err: unknown) => {
                setAiLoading(null);
                setStatusAlert({ severity: 'error', text: extractApiMessage(err) });
            },
        });
    };

    const translateLanguages = React.useMemo(() => {
        const langs = prepareData?.languages ?? prepareData?.missing_languages ?? [];
        return langs.filter((lang) => String(lang.code || '').trim().toLowerCase() !== 'vi');
    }, [prepareData?.languages, prepareData?.missing_languages]);

    const actionFooter = (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={onClose}>Đóng</Button>
        </Box>
    );

    return (
        <>
            <DrawerCustom
                open={open}
                onClose={onClose}
                title="Dịch đa ngôn ngữ"
                width={720}
                action={actionFooter}
            >
                {loadingPrepare && !prepareData && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress />
                    </Box>
                )}
                {prepareError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {prepareError}
                    </Alert>
                )}
                {prepareData?.success && (
                    <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Dịch từ <strong>VI đã format markdown</strong> sang các ngôn ngữ app — một bước
                            gồm title, body text và caption ảnh. Mỗi batch Gemini = tab mới.
                        </Typography>

                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle2" fontWeight={600}>
                                Ngôn ngữ nguồn: {prepareData.source_lang}
                            </Typography>
                            {prepareData.source?.title && (
                                <Typography variant="body2" sx={{ mt: 0.5 }}>
                                    Title: {prepareData.source.title}
                                </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary">
                                {prepareData.source?.content_block_count ?? 0} block nội dung
                            </Typography>
                        </Box>

                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            Đã có bản dịch
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                            {(prepareData.filled_langs || [])
                                .filter((code) => code !== 'vi')
                                .map((code) => (
                                    <Chip key={code} size="small" label={code} color="success" variant="outlined" />
                                ))}
                            {(prepareData.filled_langs || []).filter((c) => c !== 'vi').length === 0 && (
                                <Typography variant="caption" color="text.secondary">
                                    Chưa có
                                </Typography>
                            )}
                        </Box>

                        <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                            Dịch theo ngôn ngữ
                        </Typography>
                        <List dense sx={{ mb: 2 }}>
                            {translateLanguages.map((lang) => {
                                const code = String(lang.code || '').trim().toLowerCase();
                                const status = prepareData.translate_status?.[code];
                                const needsTranslate = status?.needs_translate ?? true;

                                return (
                                    <ListItem key={lang.code} sx={{ pr: 2, flexDirection: 'column', alignItems: 'stretch' }}>
                                        <ListItemText
                                            primary={lang.name}
                                            secondary={
                                                <>
                                                    {code}
                                                    {status?.partial_items?.length ? (
                                                        <> · partial: {status.partial_items.join(', ')}</>
                                                    ) : null}
                                                </>
                                            }
                                        />
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                                            <LoadingButton
                                                size="small"
                                                variant={needsTranslate ? 'contained' : 'outlined'}
                                                color="info"
                                                disabled={!needsTranslate || aiLoading !== null}
                                                loading={!!geminiWebOpening[code]}
                                                onClick={() => handleOpenGeminiWeb(code)}
                                            >
                                                {needsTranslate ? `Dịch ${code.toUpperCase()} (Gemini)` : 'Đã dịch ✓'}
                                            </LoadingButton>
                                        </Box>
                                    </ListItem>
                                );
                            })}
                            {translateLanguages.length === 0 && (
                                <ListItem>
                                    <ListItemText primary="Không có ngôn ngữ đích (ngoài VI)" />
                                </ListItem>
                            )}
                        </List>

                        {aiLoading && <LinearProgress sx={{ mb: 1 }} />}
                        {statusAlert && (
                            <Alert
                                severity={statusAlert.severity}
                                onClose={() => setStatusAlert(null)}
                                sx={{ mb: 2 }}
                            >
                                {statusAlert.text}
                            </Alert>
                        )}

                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            <LoadingButton
                                variant="contained"
                                color="secondary"
                                disabled={!prepareData.can_translate || aiLoading !== null}
                                loading={aiLoading === 'gemini'}
                                onClick={() => setConfirmProvider('gemini')}
                            >
                                Dịch bằng Gemini API
                            </LoadingButton>
                            <LoadingButton
                                variant="outlined"
                                disabled={!prepareData.can_translate || aiLoading !== null}
                                loading={aiLoading === 'deepseek'}
                                onClick={() => setConfirmProvider('deepseek')}
                            >
                                Dịch bằng DeepSeek
                            </LoadingButton>
                            <Button size="small" onClick={() => loadPrepare()}>
                                Tải lại
                            </Button>
                        </Box>
                    </Box>
                )}
            </DrawerCustom>

            <Dialog open={confirmProvider !== null} onClose={() => setConfirmProvider(null)}>
                <DialogTitle>Xác nhận dịch API</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Dịch tự động qua {confirmProvider === 'gemini' ? 'Gemini' : 'DeepSeek'} API cho các ngôn ngữ
                        thiếu. Tiếp tục?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmProvider(null)}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            const p = confirmProvider;
                            setConfirmProvider(null);
                            if (p) runTranslate(p);
                        }}
                    >
                        Dịch
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
