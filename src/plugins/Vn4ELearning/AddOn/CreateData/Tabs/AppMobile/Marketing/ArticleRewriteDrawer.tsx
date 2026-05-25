import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Grid,
    LinearProgress,
    TextField,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Markdown from 'components/atoms/Markdown';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { getAccessToken } from 'store/user/user.reducers';

type PrepareData = {
    success?: boolean;
    long_form_required?: boolean;
    long_form_error?: { content?: string } | string;
    limits?: {
        reference_min_chars?: number;
        reference_max_chars?: number;
        reference_char_count?: number;
    };
    post?: {
        reference_article_url?: string;
        reference_article_raw?: string;
        article_rewrite_draft_markdown?: string;
        title?: string;
        tone_of_voice?: string;
        language?: string;
    };
    draft_markdown?: string;
    has_draft?: boolean;
    prompt_ready?: boolean;
    reference_image_count?: number;
    message?: { content?: string } | string;
};

type RewriteSuccessPayload = {
    success?: boolean;
    preview_markdown?: string;
    reference_truncated?: boolean;
    post?: PrepareData['post'];
    message?: { content?: string } | string;
};

function extractApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Yêu cầu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message?.content) return r.message.content;
    return 'Yêu cầu thất bại';
}

function longFormErrorText(data: PrepareData | null): string | null {
    if (!data?.long_form_required) return null;
    const err = data.long_form_error;
    if (typeof err === 'string') return err;
    if (err && typeof err === 'object' && err.content) return err.content;
    return 'Chỉ hỗ trợ bài long_form. Đặt Content Type = long_form trong tab Config.';
}

type Props = {
    open: boolean;
    onClose: () => void;
    data: CreatePostTypeData;
    onRefreshPost?: () => void;
};

export default function ArticleRewriteDrawer({ open, onClose, data, onRefreshPost }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const postId = Number(data.post?.id || 0);
    const prepareFetchIdRef = React.useRef(0);

    const [loadingPrepare, setLoadingPrepare] = React.useState(false);
    const [prepareError, setPrepareError] = React.useState<string | null>(null);
    const [prepareData, setPrepareData] = React.useState<PrepareData | null>(null);

    const [referenceUrl, setReferenceUrl] = React.useState('');
    const [referenceRaw, setReferenceRaw] = React.useState('');
    const [draftMarkdown, setDraftMarkdown] = React.useState('');

    const [savingReference, setSavingReference] = React.useState(false);
    const [saveReferenceOk, setSaveReferenceOk] = React.useState<string | null>(null);
    const [aiLoading, setAiLoading] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [confirmProvider, setConfirmProvider] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [aiStatus, setAiStatus] = React.useState<{ severity: 'info' | 'success' | 'error'; text: string } | null>(null);
    const [applying, setApplying] = React.useState(false);
    const [applyOk, setApplyOk] = React.useState<string | null>(null);

    const minChars = prepareData?.limits?.reference_min_chars ?? 200;
    const maxChars = prepareData?.limits?.reference_max_chars ?? 16000;
    const refLen = referenceRaw.trim().length;
    const longFormBlock = longFormErrorText(prepareData);
    const promptReady = Boolean(prepareData?.prompt_ready) && refLen >= minChars && !longFormBlock;
    const referenceImageCount = prepareData?.reference_image_count ?? 0;

    const loadPrepare = React.useCallback(() => {
        if (!postId) return;
        const fetchId = ++prepareFetchIdRef.current;
        setLoadingPrepare(true);
        setPrepareError(null);

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/article-rewrite/prepare',
            method: 'POST',
            data: { post_id: postId, id: postId },
            loading: false,
            success: (res: PrepareData) => {
                if (fetchId !== prepareFetchIdRef.current) return;
                setLoadingPrepare(false);
                if (!res?.success) {
                    setPrepareError(extractApiMessage(res));
                    setPrepareData(null);
                    return;
                }
                setPrepareData(res);
                const p = res.post || {};
                setReferenceUrl(String(p.reference_article_url || ''));
                setReferenceRaw(String(p.reference_article_raw || ''));
                const draft = String(res.draft_markdown || p.article_rewrite_draft_markdown || '');
                setDraftMarkdown(draft);
            },
            error: (err: unknown) => {
                if (fetchId !== prepareFetchIdRef.current) return;
                setLoadingPrepare(false);
                setPrepareError(extractApiMessage(err));
            },
        });
    }, [postId]);

    React.useEffect(() => {
        if (!open) return;
        if (postId) loadPrepare();
    }, [open, postId, loadPrepare]);

    const handleSaveReference = () => {
        if (!postId || savingReference) return;
        const raw = referenceRaw.trim();
        if (raw.length < minChars) {
            setSaveReferenceOk(null);
            setAiStatus({
                severity: 'error',
                text: `Bài gốc cần tối thiểu ${minChars} ký tự (hiện ${raw.length}).`,
            });
            return;
        }
        setSavingReference(true);
        setSaveReferenceOk(null);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/article-rewrite/save-reference',
            method: 'POST',
            data: {
                post_id: postId,
                reference_article_raw: raw,
                reference_article_url: referenceUrl.trim(),
            },
            loading: false,
            success: (res: { success?: boolean; message?: { content?: string } }) => {
                setSavingReference(false);
                if (!res?.success) {
                    setAiStatus({ severity: 'error', text: extractApiMessage(res) });
                    return;
                }
                setSaveReferenceOk('Đã lưu bài gốc vào post.');
                setAiStatus(null);
                const imgCount = Number((res as { reference_image_count?: number }).reference_image_count ?? 0);
                if (imgCount > 0) {
                    setPrepareData((prev) => (prev ? { ...prev, reference_image_count: imgCount } : prev));
                }
                loadPrepare();
            },
            error: (err: unknown) => {
                setSavingReference(false);
                setAiStatus({ severity: 'error', text: extractApiMessage(err) });
            },
        });
    };

    const runRewrite = (provider: 'gemini' | 'deepseek') => {
        if (!postId || !promptReady || aiLoading) return;
        setAiLoading(provider);
        setAiStatus({
            severity: 'info',
            text: `Đang gọi ${provider === 'gemini' ? 'Gemini' : 'DeepSeek'}… (có thể mất 1–3 phút)`,
        });
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/article-rewrite/rewrite',
            method: 'POST',
            data: {
                post_id: postId,
                ai_provider: provider,
                reference_article_raw: referenceRaw.trim(),
                reference_article_url: referenceUrl.trim(),
                access_token: getAccessToken() || '',
            },
            loading: false,
            success: (res: RewriteSuccessPayload) => {
                setAiLoading(null);
                if (!res?.success) {
                    setAiStatus({ severity: 'error', text: extractApiMessage(res) });
                    return;
                }
                const md = String(res.preview_markdown || '');
                setDraftMarkdown(md);
                let msg = 'Đã viết lại bài. Xem preview và chỉnh sửa trước khi áp dụng.';
                if (res.reference_truncated) {
                    msg += ' (Bài gốc đã được cắt bớt trong prompt do quá dài.)';
                }
                setAiStatus({ severity: 'success', text: msg });
            },
            error: (err: unknown) => {
                setAiLoading(null);
                setAiStatus({ severity: 'error', text: extractApiMessage(err) });
            },
        });
    };

    const handleApply = () => {
        const md = draftMarkdown.trim();
        if (!postId || !md || applying) return;
        setApplying(true);
        setApplyOk(null);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/article-rewrite/apply',
            method: 'POST',
            data: { post_id: postId, markdown: md },
            loading: false,
            success: (res: { success?: boolean; message?: { content?: string } }) => {
                setApplying(false);
                if (!res?.success) {
                    setAiStatus({ severity: 'error', text: extractApiMessage(res) });
                    return;
                }
                setApplyOk(extractApiMessage(res) || 'Đã áp dụng vào content_text.');
                onRefreshPost?.();
            },
            error: (err: unknown) => {
                setApplying(false);
                setAiStatus({ severity: 'error', text: extractApiMessage(err) });
            },
        });
    };

    const applyFooter = (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
            <Button onClick={onClose}>Đóng</Button>
            <LoadingButton
                variant="contained"
                color="primary"
                disabled={!draftMarkdown.trim() || Boolean(longFormBlock) || applying}
                loading={applying}
                onClick={handleApply}
            >
                Áp dụng vào content_text
            </LoadingButton>
        </Box>
    );

    return (
        <>
            <DrawerCustom
                open={open}
                onClose={onClose}
                title="Viết lại bài tham chiếu"
                width={960}
                action={applyFooter}
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

                {longFormBlock && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        {longFormBlock}
                    </Alert>
                )}

                {prepareData?.success && (
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Dán nội dung bài viết tìm trên mạng, lưu bài gốc, rồi dùng AI viết lại (giữ ý, đổi
                                cách diễn đạt). Không dùng chung pipeline Google Overview.
                            </Typography>
                            {referenceImageCount > 0 && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Phát hiện {referenceImageCount} ảnh trong bài gốc — sẽ giữ lại khi viết lại và áp
                                    dụng vào content_text.
                                </Alert>
                            )}
                            <TextField
                                fullWidth
                                size="small"
                                label="URL bài gốc (tùy chọn)"
                                value={referenceUrl}
                                onChange={(e) => setReferenceUrl(e.target.value)}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                multiline
                                minRows={8}
                                maxRows={20}
                                label="Nội dung bài gốc (paste)"
                                value={referenceRaw}
                                onChange={(e) => setReferenceRaw(e.target.value)}
                                helperText={`${refLen} / tối thiểu ${minChars} ký tự — tối đa khuyến nghị ${maxChars} cho prompt`}
                            />
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                <LoadingButton
                                    variant="outlined"
                                    size="small"
                                    loading={savingReference}
                                    onClick={handleSaveReference}
                                >
                                    Lưu bài gốc
                                </LoadingButton>
                                <Button size="small" onClick={() => loadPrepare()}>
                                    Tải lại
                                </Button>
                            </Box>
                            {saveReferenceOk && (
                                <Alert severity="success" sx={{ mt: 1 }} onClose={() => setSaveReferenceOk(null)}>
                                    {saveReferenceOk}
                                </Alert>
                            )}
                        </Grid>

                        <Grid item xs={12}>
                            <Divider />
                            <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 2, mb: 1 }}>
                                Viết lại bằng AI
                            </Typography>
                            {aiLoading && <LinearProgress sx={{ mb: 1 }} />}
                            {aiStatus && (
                                <Alert
                                    severity={aiStatus.severity}
                                    onClose={() => setAiStatus(null)}
                                    sx={{ mb: 1 }}
                                >
                                    {aiStatus.text}
                                </Alert>
                            )}
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <LoadingButton
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    disabled={!promptReady || aiLoading !== null}
                                    loading={aiLoading === 'gemini'}
                                    onClick={() => setConfirmProvider('gemini')}
                                >
                                    Dùng Gemini
                                </LoadingButton>
                                <LoadingButton
                                    variant="outlined"
                                    size="small"
                                    disabled={!promptReady || aiLoading !== null}
                                    loading={aiLoading === 'deepseek'}
                                    onClick={() => setConfirmProvider('deepseek')}
                                >
                                    Dùng DeepSeek
                                </LoadingButton>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 0 }}>
                                Sau khi chỉnh sửa xong, bấm{' '}
                                <strong>Áp dụng vào content_text</strong> (cuối drawer) để lưu vào tab Content Text
                                của post.
                            </Alert>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Chỉnh sửa bản nháp (markdown)
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={12}
                                value={draftMarkdown}
                                onChange={(e) => setDraftMarkdown(e.target.value)}
                                placeholder="Kết quả AI hiển thị ở đây sau khi viết lại…"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Preview
                            </Typography>
                            <Box
                                sx={{
                                    p: 2,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    bgcolor: 'background.paper',
                                }}
                            >
                                {draftMarkdown.trim() ? (
                                    <Markdown>{draftMarkdown}</Markdown>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        Chưa có bản nháp.
                                    </Typography>
                                )}
                            </Box>
                        </Grid>

                        {applyOk && (
                            <Grid item xs={12}>
                                <Alert severity="success" onClose={() => setApplyOk(null)}>
                                    {applyOk} — mở tab <strong>Content Text</strong> để kiểm tra.
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                )}
            </DrawerCustom>

            <Dialog open={confirmProvider !== null} onClose={() => setConfirmProvider(null)}>
                <DialogTitle>Xác nhận gọi AI</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Gọi {confirmProvider === 'gemini' ? 'Gemini' : 'DeepSeek'} để viết lại toàn bộ bài tham
                        chiếu? Thao tác có thể mất vài phút.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmProvider(null)}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={() => {
                            const p = confirmProvider;
                            setConfirmProvider(null);
                            if (p) runRewrite(p);
                        }}
                    >
                        Tiếp tục
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
