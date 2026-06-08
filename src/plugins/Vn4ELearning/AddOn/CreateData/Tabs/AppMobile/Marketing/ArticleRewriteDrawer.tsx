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
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DrawerCustom from 'components/molecules/DrawerCustom';
import Markdown from 'components/atoms/Markdown';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import {
    marketingLangDisplayLabel,
    normalizeMarketingLangCode,
    type MarketingAppLanguage,
} from 'helpers/marketingNewsLanguageConfig';

const ARTICLE_REWRITE_OVERVIEW_STAGE = 'article_rewrite';

/** Gemini web (tài khoản Pro) — thay Google Search AI mode do giới hạn overview. */
const GEMINI_WEB_APP_URL = 'https://gemini.google.com/u/1/app?pageId=none';

function buildGeminiArticleRewriteUrl(
    postId: number,
    prompt: string,
    topic: string,
    outputLangCode: string,
): string {
    const accessToken = getAccessToken() ?? '';
    const apiUrl = convertToURL(
        getApiHost(),
        '/api/admin/plugin/vn4-e-learning/app-mobile/marketing/article-rewrite/update-from-overview',
    );
    const url = new URL(GEMINI_WEB_APP_URL);
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_post_id: String(postId),
        marketing_stage: ARTICLE_REWRITE_OVERVIEW_STAGE,
        access_token: accessToken,
        api_url: apiUrl,
        content_type: 'long_form',
        topic: topic || '',
        target_lang: normalizeMarketingLangCode(outputLangCode),
    });
    const promptTrimmed = prompt.trim();
    if (promptTrimmed) {
        hashParams.set('marketing_prompt', encodeURIComponent(promptTrimmed));
    }
    url.hash = hashParams.toString();
    return url.toString();
}

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
    draft_lang?: string;
    draft_markdown_by_lang?: Record<string, string>;
    preview_source_by_lang?: Record<string, string>;
    has_draft?: boolean;
    prompt_ready?: boolean;
    prompt?: string;
    reference_image_count?: number;
    language_codes?: string[];
    languages?: MarketingAppLanguage[];
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

function normalizeDraftMarkdownByLang(
    raw: Record<string, string> | undefined | null,
): Record<string, string> {
    if (!raw || typeof raw !== 'object') {
        return {};
    }
    const out: Record<string, string> = {};
    Object.entries(raw).forEach(([code, value]) => {
        const lang = normalizeMarketingLangCode(code);
        const md = String(value ?? '').trim();
        if (lang && md) {
            out[lang] = md;
        }
    });
    return out;
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
    const draftByLangRef = React.useRef<Record<string, string>>({});
    const outputLangCodeRef = React.useRef('');

    const [savingReference, setSavingReference] = React.useState(false);
    const [saveReferenceOk, setSaveReferenceOk] = React.useState<string | null>(null);
    const [aiLoading, setAiLoading] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [overviewOpening, setOverviewOpening] = React.useState(false);
    const [confirmProvider, setConfirmProvider] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [aiStatus, setAiStatus] = React.useState<{ severity: 'info' | 'success' | 'error'; text: string } | null>(null);
    const [applying, setApplying] = React.useState(false);
    const [applyOk, setApplyOk] = React.useState<string | null>(null);
    const [outputLangCode, setOutputLangCode] = React.useState('');

    const appLanguages = React.useMemo(() => {
        const langs = prepareData?.languages ?? [];
        if (langs.length > 0) {
            return langs.filter((lang) => normalizeMarketingLangCode(lang.code) !== '');
        }
        return (prepareData?.language_codes ?? []).map((code) => ({
            code,
            name: code.toUpperCase(),
        }));
    }, [prepareData?.languages, prepareData?.language_codes]);

    const minChars = prepareData?.limits?.reference_min_chars ?? 200;
    const maxChars = prepareData?.limits?.reference_max_chars ?? 16000;
    const refLen = referenceRaw.trim().length;
    const longFormBlock = longFormErrorText(prepareData);
    const promptReady = Boolean(prepareData?.prompt_ready) && refLen >= minChars && !longFormBlock;
    const referenceImageCount = prepareData?.reference_image_count ?? 0;

    const persistDraftForLang = React.useCallback((langCode: string, markdown: string) => {
        const lang = normalizeMarketingLangCode(langCode);
        if (!lang) return;
        draftByLangRef.current = { ...draftByLangRef.current, [lang]: markdown };
    }, []);

    const applyDraftMarkdownByLang = React.useCallback(
        (byLang: Record<string, string>, preferredLang: string) => {
            const normalized = normalizeDraftMarkdownByLang(byLang);
            draftByLangRef.current = normalized;
            const lang = normalizeMarketingLangCode(preferredLang);
            const activeLang =
                lang && normalized[lang] !== undefined
                    ? lang
                    : Object.keys(normalized)[0] ?? lang;
            if (activeLang) {
                setDraftMarkdown(normalized[activeLang] ?? '');
            } else {
                setDraftMarkdown('');
            }
        },
        [],
    );

    const fetchPreviewMarkdownForLang = React.useCallback(
        (targetLang: string, localSnapshot: Record<string, string>) => {
            const normalizedTarget = normalizeMarketingLangCode(targetLang);
            if (!postId || !normalizedTarget) return;

            apiAjaxRef.current({
                url: 'plugin/vn4-e-learning/app-mobile/marketing/article-rewrite/prepare',
                method: 'POST',
                data: { post_id: postId, id: postId },
                loading: false,
                success: (res: PrepareData) => {
                    if (!res?.success) return;
                    const serverByLang = normalizeDraftMarkdownByLang(res.draft_markdown_by_lang);
                    const nextMap = { ...localSnapshot, ...serverByLang };
                    draftByLangRef.current = nextMap;
                    if (normalizeMarketingLangCode(outputLangCodeRef.current) !== normalizedTarget) {
                        return;
                    }
                    setDraftMarkdown(nextMap[normalizedTarget] ?? '');
                    if (res.preview_source_by_lang) {
                        setPrepareData((prev) =>
                            prev
                                ? {
                                      ...prev,
                                      preview_source_by_lang: {
                                          ...prev.preview_source_by_lang,
                                          ...res.preview_source_by_lang,
                                      },
                                  }
                                : prev,
                        );
                    }
                },
            });
        },
        [postId],
    );

    const handleOutputLangChange = React.useCallback(
        (nextLang: string | null) => {
            if (!nextLang) return;
            const normalized = normalizeMarketingLangCode(nextLang);
            if (!normalized || normalized === outputLangCodeRef.current) return;

            const previousLang = outputLangCodeRef.current;
            const localSnapshot = { ...draftByLangRef.current };
            if (previousLang) {
                localSnapshot[normalizeMarketingLangCode(previousLang)] = draftMarkdown;
                draftByLangRef.current = localSnapshot;
            }

            outputLangCodeRef.current = normalized;
            setOutputLangCode(normalized);
            setDraftMarkdown(localSnapshot[normalized] ?? '');
            fetchPreviewMarkdownForLang(normalized, localSnapshot);
        },
        [draftMarkdown, fetchPreviewMarkdownForLang],
    );

    React.useEffect(() => {
        outputLangCodeRef.current = normalizeMarketingLangCode(outputLangCode);
    }, [outputLangCode]);

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
                const codes = (res.language_codes ?? res.languages?.map((l) => l.code) ?? [])
                    .map((c) => normalizeMarketingLangCode(c))
                    .filter(Boolean);
                const preferredLang = (() => {
                    const current = normalizeMarketingLangCode(outputLangCodeRef.current);
                    if (current && codes.includes(current)) {
                        return current;
                    }
                    const draftLang = normalizeMarketingLangCode(res.draft_lang ?? '');
                    if (draftLang && codes.includes(draftLang)) {
                        return draftLang;
                    }
                    return codes[0] ?? '';
                })();
                if (preferredLang) {
                    outputLangCodeRef.current = preferredLang;
                    setOutputLangCode(preferredLang);
                }
                const p = res.post || {};
                setReferenceUrl(String(p.reference_article_url || ''));
                setReferenceRaw(String(p.reference_article_raw || ''));
                const byLang = normalizeDraftMarkdownByLang(res.draft_markdown_by_lang);
                const legacyDraft = String(res.draft_markdown || p.article_rewrite_draft_markdown || '').trim();
                if (legacyDraft !== '' && Object.keys(byLang).length === 0) {
                    const fallbackLang =
                        normalizeMarketingLangCode(res.draft_lang ?? '') || preferredLang || 'vi';
                    byLang[fallbackLang] = legacyDraft;
                }
                applyDraftMarkdownByLang(byLang, preferredLang);
            },
            error: (err: unknown) => {
                if (fetchId !== prepareFetchIdRef.current) return;
                setLoadingPrepare(false);
                setPrepareError(extractApiMessage(err));
            },
        });
    }, [postId, applyDraftMarkdownByLang]);

    React.useEffect(() => {
        if (!open) return;
        if (postId) loadPrepare();
    }, [open, postId, loadPrepare]);

    React.useEffect(() => {
        if (!open || !postId) return;
        const onWindowFocus = () => {
            loadPrepare();
        };
        window.addEventListener('focus', onWindowFocus);
        return () => window.removeEventListener('focus', onWindowFocus);
    }, [open, postId, loadPrepare]);

    const handleOpenGeminiWeb = () => {
        if (!postId || !promptReady || !outputLangCode || overviewOpening || aiLoading !== null) return;
        setOverviewOpening(true);
        setAiStatus({ severity: 'info', text: 'Đang tạo prompt cho Gemini web…' });
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/article-rewrite/get-overview-prompt',
            method: 'POST',
            data: {
                post_id: postId,
                reference_article_raw: referenceRaw.trim(),
                output_lang_code: outputLangCode,
            },
            loading: false,
            success: (res: { success?: boolean; prompt?: string; reference_truncated?: boolean }) => {
                setOverviewOpening(false);
                if (!res?.success) {
                    setAiStatus({ severity: 'error', text: extractApiMessage(res) });
                    return;
                }
                const promptText = String(res.prompt || prepareData?.prompt || '').trim();
                if (!promptText) {
                    setAiStatus({ severity: 'error', text: 'Không tạo được prompt. Hãy lưu bài gốc trước.' });
                    return;
                }
                const topic = String(
                    prepareData?.post?.title || (data.post as { title?: string })?.title || '',
                );
                window.open(
                    buildGeminiArticleRewriteUrl(postId, promptText, topic, outputLangCode),
                    '_blank',
                    'noopener,noreferrer',
                );
                let msg =
                    'Đã mở Gemini web. Extension sẽ dán prompt, gửi (Pro), lưu bản nháp và đóng tab — quay lại drawer để xem kết quả.';
                if (res.reference_truncated) {
                    msg += ' (Bài gốc đã cắt bớt trong prompt do quá dài.)';
                }
                setAiStatus({ severity: 'info', text: msg });
            },
            error: (err: unknown) => {
                setOverviewOpening(false);
                setAiStatus({ severity: 'error', text: extractApiMessage(err) });
            },
        });
    };

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
                output_lang_code: outputLangCode,
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
                if (outputLangCodeRef.current) {
                    persistDraftForLang(outputLangCodeRef.current, md);
                }
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
            data: { post_id: postId, markdown: md, output_lang_code: outputLangCode },
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
                                Dán nội dung bài viết tìm trên mạng, lưu bài gốc, rồi viết lại bằng Gemini web (Pro),
                                API Gemini/DeepSeek (giữ ý gốc, đổi cách diễn đạt).
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
                            {appLanguages.length > 0 && (
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                        Ngôn ngữ đầu ra (từ app mobile)
                                    </Typography>
                                    <ToggleButtonGroup
                                        exclusive
                                        size="small"
                                        value={outputLangCode}
                                        onChange={(_e, val: string | null) => {
                                            handleOutputLangChange(val);
                                        }}
                                    >
                                        {appLanguages.map((lang) => {
                                            const code = normalizeMarketingLangCode(lang.code);
                                            return (
                                                <ToggleButton key={code} value={code}>
                                                    {marketingLangDisplayLabel(lang)}
                                                </ToggleButton>
                                            );
                                        })}
                                    </ToggleButtonGroup>
                                </Box>
                            )}
                            {(aiLoading || overviewOpening) && <LinearProgress sx={{ mb: 1 }} />}
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
                                    color="primary"
                                    size="small"
                                    disabled={!promptReady || aiLoading !== null || overviewOpening}
                                    loading={overviewOpening}
                                    onClick={handleOpenGeminiWeb}
                                >
                                    Dùng Gemini web
                                </LoadingButton>
                                <LoadingButton
                                    variant="contained"
                                    color="secondary"
                                    size="small"
                                    disabled={!promptReady || aiLoading !== null || overviewOpening}
                                    loading={aiLoading === 'gemini'}
                                    onClick={() => setConfirmProvider('gemini')}
                                >
                                    Dùng Gemini
                                </LoadingButton>
                                <LoadingButton
                                    variant="outlined"
                                    size="small"
                                    disabled={!promptReady || aiLoading !== null || overviewOpening}
                                    loading={aiLoading === 'deepseek'}
                                    onClick={() => setConfirmProvider('deepseek')}
                                >
                                    Dùng DeepSeek
                                </LoadingButton>
                            </Box>
                        </Grid>

                        <Grid item xs={12}>
                            <Alert severity="info" sx={{ mb: 0 }}>
                                Chọn ngôn ngữ app trước khi mở Gemini — mỗi ngôn ngữ viết lại độc lập từ bài tham
                                chiếu, rồi format MD và audio riêng. Sau khi chỉnh sửa, bấm{' '}
                                <strong>Áp dụng vào content_text</strong> để ghi vào key{' '}
                                <strong>{outputLangCode || '…'}</strong>.
                            </Alert>
                        </Grid>

                        <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Chỉnh sửa bản nháp (markdown)
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={12}
                                value={draftMarkdown}
                                onChange={(e) => {
                                    const next = e.target.value;
                                    setDraftMarkdown(next);
                                    if (outputLangCode) {
                                        persistDraftForLang(outputLangCode, next);
                                    }
                                }}
                                placeholder="Kết quả AI hiển thị ở đây sau khi viết lại…"
                            />
                        </Grid>
                        <Grid item xs={12} md={6} sx={{ minWidth: 0 }}>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Preview
                                {outputLangCode ? (
                                    <Typography
                                        component="span"
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: 1, fontWeight: 400 }}
                                    >
                                        ({outputLangCode.toUpperCase()}
                                        {prepareData?.preview_source_by_lang?.[
                                            normalizeMarketingLangCode(outputLangCode)
                                        ] === 'formatted_blocks'
                                            ? ' · Format MD'
                                            : ''}
                                        )
                                    </Typography>
                                ) : null}
                            </Typography>
                            <Box
                                sx={{
                                    p: 2,
                                    border: 1,
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                    bgcolor: 'background.paper',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    overflowX: 'auto',
                                    wordBreak: 'break-word',
                                    '& img': {
                                        maxWidth: '100%',
                                        width: 'auto',
                                        height: 'auto',
                                        display: 'block',
                                        objectFit: 'contain',
                                    },
                                    '& p img, & a img': {
                                        maxWidth: '100%',
                                    },
                                }}
                            >
                                {draftMarkdown.trim() ? (
                                    <Markdown key={`rewrite-preview-${outputLangCode}`}>
                                        {draftMarkdown}
                                    </Markdown>
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
