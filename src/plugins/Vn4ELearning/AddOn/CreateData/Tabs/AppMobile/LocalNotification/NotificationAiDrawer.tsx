import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Divider,
    Grid,
    TextField,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { CreatePostTypeData } from 'components/pages/PostType/CreateData';
import NotificationAiLlmButtons, {
    NotificationMessageVariant,
    NotificationAiGeneratePayload,
} from './NotificationAiLlmButtons';
import NotificationStylePicker, {
    ContentStyleItem,
    StyleOptionsState,
} from './NotificationStylePicker';
import {
    DEFAULT_MESSAGE_COUNT,
    DEFAULT_STYLE_OPTIONS,
    FALLBACK_CONTENT_STYLES,
    styleOptionsToApiPayload,
} from './notificationContentStyles';
import {
    appendVariantsUnique,
    stripEmptyVariants,
    toRepeaterMessages,
} from './notificationMessageHelpers';

type LanguageItem = {
    code: string;
    name: string;
    flag_code?: string;
};

type PrepareData = {
    success?: boolean;
    context?: {
        notification_key?: string;
        description?: string;
        intent_lines?: string[];
        conditions_template?: string;
    };
    languages?: LanguageItem[];
    language_codes?: string[];
    messages?: NotificationMessageVariant[];
    prompt_preview?: string;
    content_styles?: ContentStyleItem[];
    default_style_ids?: string[];
    style_options?: StyleOptionsState & {
        style_ids?: string[];
        style_custom?: string;
        style_spice?: string;
    };
    limits?: { title_max?: number; body_max?: number };
    message?: { content?: string } | string;
};

function parseStyleOptionsFromApi(raw: PrepareData['style_options']): StyleOptionsState {
    if (!raw) return { ...DEFAULT_STYLE_OPTIONS };
    const ids = (raw as { style_ids?: string[] }).style_ids;
    const spice = (raw as { style_spice?: string }).style_spice;
    return {
        styleIds: ids?.length ? ids : DEFAULT_STYLE_OPTIONS.styleIds,
        styleCustom: (raw as { style_custom?: string }).style_custom ?? '',
        styleSpice:
            spice === 'mild' || spice === 'medium' || spice === 'bold' ? spice : 'medium',
    };
}

function styleOptionsEqual(a: StyleOptionsState, b: StyleOptionsState): boolean {
    return (
        a.styleSpice === b.styleSpice &&
        a.styleCustom === b.styleCustom &&
        a.styleIds.length === b.styleIds.length &&
        a.styleIds.every((id, i) => id === b.styleIds[i])
    );
}

function extractApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Tải dữ liệu thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message?.content) return r.message.content;
    return 'Tải dữ liệu thất bại';
}

function emptyVariant(codes: string[]): NotificationMessageVariant {
    const title: Record<string, string> = {};
    const body: Record<string, string> = {};
    codes.forEach((c) => {
        title[c] = '';
        body[c] = '';
    });
    return { title, body };
}

function normalizeDraftFromMessages(
    messages: NotificationMessageVariant[] | undefined,
    codes: string[]
): NotificationMessageVariant[] {
    if (!messages?.length) {
        return [emptyVariant(codes)];
    }
    return messages.map((m) => {
        const title = { ...emptyVariant(codes).title, ...(m.title || {}) };
        const body = { ...emptyVariant(codes).body, ...(m.body || {}) };
        return { title, body };
    });
}

type Props = {
    open: boolean;
    onClose: () => void;
    data: CreatePostTypeData;
    onApply: (messages: ANY[]) => void;
};

export default function NotificationAiDrawer({ open, onClose, data, onApply }: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const postId = Number(data.post?.id || 0);
    const prepareFetchIdRef = React.useRef(0);

    const [loadingPrepare, setLoadingPrepare] = React.useState(false);
    const [prepareError, setPrepareError] = React.useState<string | null>(null);
    const [prepareData, setPrepareData] = React.useState<PrepareData | null>(null);
    const [draftVariants, setDraftVariants] = React.useState<NotificationMessageVariant[]>([]);
    const [warnings, setWarnings] = React.useState<string[]>([]);
    const [copyOk, setCopyOk] = React.useState(false);
    const [contentStyles, setContentStyles] = React.useState<ContentStyleItem[]>(FALLBACK_CONTENT_STYLES);
    const [styleOptions, setStyleOptions] = React.useState<StyleOptionsState>(DEFAULT_STYLE_OPTIONS);
    const [promptPreview, setPromptPreview] = React.useState('');
    const [refreshingPrompt, setRefreshingPrompt] = React.useState(false);
    const [copyingPrompt, setCopyingPrompt] = React.useState(false);
    const [manualPaste, setManualPaste] = React.useState('');
    const [parsingPaste, setParsingPaste] = React.useState(false);
    const [pasteError, setPasteError] = React.useState<string | null>(null);
    const [messageCount, setMessageCount] = React.useState(DEFAULT_MESSAGE_COUNT);
    const initialVariantCountRef = React.useRef(0);

    const styleOptionsRef = React.useRef(styleOptions);
    styleOptionsRef.current = styleOptions;
    const messageCountRef = React.useRef(messageCount);
    messageCountRef.current = messageCount;
    const prepareDataRef = React.useRef(prepareData);
    prepareDataRef.current = prepareData;

    const languageCodes = prepareData?.language_codes || prepareData?.languages?.map((l) => l.code) || [];
    const titleMax = prepareData?.limits?.title_max ?? 50;
    const bodyMax = prepareData?.limits?.body_max ?? 120;

    const loadPrepare = React.useCallback(
        (options?: { styleOnly?: boolean; styleOverride?: StyleOptionsState }) => {
            if (!postId) return;

            const fetchId = ++prepareFetchIdRef.current;
            const styles = options?.styleOverride ?? styleOptionsRef.current;
            const styleOnly = Boolean(options?.styleOnly);

            const hasCachedData = Boolean(prepareDataRef.current?.success);
            if (styleOnly || (hasCachedData && !options?.styleOverride)) {
                setRefreshingPrompt(true);
            } else if (!hasCachedData) {
                setLoadingPrepare(true);
                setPrepareError(null);
            } else {
                setRefreshingPrompt(true);
            }

            apiAjaxRef.current({
                url: 'plugin/vn4-e-learning/app-mobile/local-notification-ai/prepare',
                method: 'POST',
                data: {
                    post_id: postId,
                    id: postId,
                    ...styleOptionsToApiPayload(styles, messageCountRef.current),
                },
                loading: false,
                success: (res: PrepareData) => {
                    if (fetchId !== prepareFetchIdRef.current) return;
                    setRefreshingPrompt(false);
                    setLoadingPrepare(false);
                    if (!res?.success) {
                        if (!styleOnly) {
                            setPrepareError(extractApiMessage(res));
                            setPrepareData(null);
                        }
                        return;
                    }
                    if (!styleOnly) {
                        setPrepareData(res);
                        if (typeof (res as { message_count?: number }).message_count === 'number') {
                            setMessageCount((res as { message_count: number }).message_count);
                        }
                        const codes = res.language_codes || res.languages?.map((l) => l.code) || [];
                        const loaded = normalizeDraftFromMessages(res.messages, codes);
                        setDraftVariants(loaded);
                        initialVariantCountRef.current = stripEmptyVariants(loaded, codes).length;
                        setWarnings([]);
                        if (res.content_styles?.length) {
                            setContentStyles(res.content_styles);
                        }
                        const parsed = parseStyleOptionsFromApi(res.style_options);
                        setStyleOptions((prev) =>
                            styleOptionsEqual(prev, parsed) ? prev : parsed
                        );
                    }
                    if (res.prompt_preview) {
                        setPromptPreview(res.prompt_preview);
                    }
                },
                error: (err: unknown) => {
                    if (fetchId !== prepareFetchIdRef.current) return;
                    setRefreshingPrompt(false);
                    setLoadingPrepare(false);
                    if (!styleOnly) {
                        setPrepareError(extractApiMessage(err));
                    }
                },
            });
        },
        [postId]
    );

    const loadPrepareRef = React.useRef(loadPrepare);
    loadPrepareRef.current = loadPrepare;

    React.useEffect(() => {
        if (!open) {
            setCopyOk(false);
            return;
        }
        if (postId) {
            loadPrepareRef.current();
        }
    }, [open, postId]);

    const appendToDraft = (incoming: NotificationMessageVariant[], apiWarnings?: string[]) => {
        const codes = languageCodes;
        if (!incoming.length) return;
        setDraftVariants((prev) => appendVariantsUnique(prev, incoming, codes));
        if (apiWarnings?.length) {
            setWarnings((w) => [...w, ...apiWarnings]);
        }
    };

    const handleGenerateSuccess = (res: NotificationAiGeneratePayload) => {
        const codes = languageCodes;
        if (res.messages?.length) {
            appendToDraft(normalizeDraftFromMessages(res.messages, codes), res.warnings);
        } else if (res.warnings?.length) {
            setWarnings(res.warnings);
        }
    };

    const handleParseManualPaste = () => {
        if (!postId || !manualPaste.trim()) return;
        setParsingPaste(true);
        setPasteError(null);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/local-notification-ai/parse-paste',
            method: 'POST',
            data: { post_id: postId, raw_response: manualPaste.trim() },
            loading: false,
            success: (res: NotificationAiGeneratePayload & { success?: boolean; message?: { content?: string } }) => {
                setParsingPaste(false);
                if (!res?.success) {
                    setPasteError(extractApiMessage(res));
                    return;
                }
                const codes = languageCodes;
                if (res.messages?.length) {
                    appendToDraft(normalizeDraftFromMessages(res.messages, codes), res.warnings);
                    setManualPaste('');
                }
            },
            error: (err: unknown) => {
                setParsingPaste(false);
                setPasteError(extractApiMessage(err));
            },
        });
    };

    const updateField = (
        variantIndex: number,
        langCode: string,
        field: 'title' | 'body',
        value: string
    ) => {
        setDraftVariants((prev) => {
            const next = [...prev];
            const item = { ...next[variantIndex] };
            item[field] = { ...item[field], [langCode]: value };
            next[variantIndex] = item;
            return next;
        });
    };

    const syncPromptPreview = React.useCallback(
        (styles: StyleOptionsState): Promise<string | null> => {
            if (!postId) return Promise.resolve(null);

            const fetchId = ++prepareFetchIdRef.current;
            setRefreshingPrompt(true);

            return new Promise((resolve) => {
                apiAjaxRef.current({
                    url: 'plugin/vn4-e-learning/app-mobile/local-notification-ai/prepare',
                    method: 'POST',
                    data: {
                        post_id: postId,
                        id: postId,
                        ...styleOptionsToApiPayload(styles, messageCountRef.current),
                    },
                    loading: false,
                    success: (res: PrepareData) => {
                        if (fetchId !== prepareFetchIdRef.current) return;
                        setRefreshingPrompt(false);
                        if (res?.success && res.prompt_preview) {
                            setPromptPreview(res.prompt_preview);
                            resolve(res.prompt_preview);
                            return;
                        }
                        resolve(null);
                    },
                    error: () => {
                        if (fetchId !== prepareFetchIdRef.current) return;
                        setRefreshingPrompt(false);
                        resolve(null);
                    },
                });
            });
        },
        [postId]
    );

    const handleRefreshPrompt = () => {
        syncPromptPreview(styleOptionsRef.current);
    };

    const handleCopyPrompt = async () => {
        setCopyingPrompt(true);
        setCopyOk(false);
        const text =
            (await syncPromptPreview(styleOptionsRef.current))
            || promptPreview
            || prepareData?.prompt_preview
            || '';
        setCopyingPrompt(false);
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopyOk(true);
            setTimeout(() => setCopyOk(false), 2000);
        } catch {
            /* ignore */
        }
    };

    const handleApply = () => {
        const codes = languageCodes;
        const cleaned = stripEmptyVariants(draftVariants, codes);
        onApply(toRepeaterMessages(cleaned));
        onClose();
    };

    const handleMessageCountChange = (raw: string) => {
        const n = parseInt(raw, 10);
        if (Number.isNaN(n)) {
            setMessageCount(DEFAULT_MESSAGE_COUNT);
            return;
        }
        setMessageCount(Math.min(20, Math.max(1, n)));
    };

    const newVariantCount = Math.max(
        0,
        stripEmptyVariants(draftVariants, languageCodes).length - initialVariantCountRef.current
    );

    const promptReady = Boolean(prepareData?.success && languageCodes.length > 0);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Sinh nội dung notification (AI)"
            width={1100}
            action={
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button onClick={onClose}>Đóng</Button>
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        disabled={!promptReady || draftVariants.length === 0}
                        onClick={handleApply}
                    >
                        Áp dụng vào Message
                    </LoadingButton>
                </Box>
            }
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
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Ngữ cảnh
                        </Typography>
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: 'action.hover',
                                borderRadius: 1,
                                fontSize: 14,
                            }}
                        >
                            <Typography variant="body2">
                                <strong>Key:</strong> {prepareData.context?.notification_key || '—'}
                            </Typography>
                            {prepareData.context?.description && (
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Mô tả:</strong> {prepareData.context.description}
                                </Typography>
                            )}
                            <Divider sx={{ my: 1.5 }} />
                            {(prepareData.context?.intent_lines || []).map((line, i) => (
                                <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                                    • {line}
                                </Typography>
                            ))}
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <LoadingButton
                                size="small"
                                variant="outlined"
                                loading={copyingPrompt}
                                onClick={handleCopyPrompt}
                            >
                                {copyOk ? 'Đã copy prompt' : 'Copy prompt (theo phong cách đã chọn)'}
                            </LoadingButton>
                            <Button size="small" sx={{ ml: 1 }} onClick={() => loadPrepare()}>
                                Tải lại
                            </Button>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <NotificationStylePicker
                            styles={contentStyles}
                            value={styleOptions}
                            onChange={setStyleOptions}
                            disabled={loadingPrepare}
                        />

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            <Button
                                size="small"
                                variant="text"
                                disabled={refreshingPrompt}
                                onClick={handleRefreshPrompt}
                            >
                                {refreshingPrompt ? 'Đang cập nhật prompt…' : 'Cập nhật xem prompt'}
                            </Button>
                        </Box>

                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                            Nội dung preview
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Title ≤ {titleMax} ký tự, Body ≤ {bodyMax} ký tự mỗi ngôn ngữ. Chọn phong cách rồi bấm
                            Gemini/DeepSeek. Copy prompt luôn lấy đúng phong cách đang chọn.
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 1 }}>
                            <TextField
                                type="number"
                                size="small"
                                label="Số message / lần generate"
                                value={messageCount}
                                onChange={(e) => handleMessageCountChange(e.target.value)}
                                inputProps={{ min: 1, max: 20, step: 1 }}
                                sx={{ width: 200 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                                Mặc định 5, tối đa 20 variant khác nhau mỗi lần gọi AI.
                            </Typography>
                        </Box>

                        <NotificationAiLlmButtons
                            postId={postId}
                            promptReady={promptReady}
                            styleOptions={styleOptions}
                            messageCount={messageCount}
                            onSuccess={handleGenerateSuccess}
                        />

                        <Box
                            sx={{
                                mt: 2,
                                p: 2,
                                border: '1px dashed',
                                borderColor: 'divider',
                                borderRadius: 1,
                                bgcolor: 'background.default',
                            }}
                        >
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                Dán kết quả AI thủ công
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Copy prompt → sinh trên Gemini/ChatGPT → dán JSON (có hoặc không có marker
                                ###RESULT) → thêm vào danh sách bên dưới, không xóa tin cũ.
                            </Typography>
                            <TextField
                                fullWidth
                                multiline
                                minRows={4}
                                size="small"
                                placeholder='{"messages":[{"title":{"vi":"...","en":"..."},"body":{...}}]}'
                                value={manualPaste}
                                onChange={(e) => setManualPaste(e.target.value)}
                                disabled={parsingPaste}
                            />
                            {pasteError && (
                                <Alert severity="error" sx={{ mt: 1 }}>
                                    {pasteError}
                                </Alert>
                            )}
                            <LoadingButton
                                size="small"
                                variant="contained"
                                sx={{ mt: 1 }}
                                loading={parsingPaste}
                                disabled={!manualPaste.trim()}
                                onClick={handleParseManualPaste}
                            >
                                Phân tích & thêm vào danh sách
                            </LoadingButton>
                        </Box>

                        {newVariantCount > 0 && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                +{newVariantCount} message mới (tổng{' '}
                                {stripEmptyVariants(draftVariants, languageCodes).length} variant). Tin cũ vẫn
                                giữ khi áp dụng.
                            </Alert>
                        )}

                        {warnings.length > 0 && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                {warnings.map((w, i) => (
                                    <div key={i}>{w}</div>
                                ))}
                            </Alert>
                        )}

                        {draftVariants.map((variant, vIdx) => (
                            <Box
                                key={vIdx}
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                }}
                            >
                                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                                    Variant {vIdx + 1}
                                </Typography>
                                {(prepareData.languages || []).map((lang) => (
                                    <Box key={lang.code} sx={{ mb: 2 }}>
                                        <Typography variant="caption" color="primary" fontWeight={600}>
                                            {lang.name} ({lang.code})
                                        </Typography>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Title"
                                            margin="dense"
                                            value={variant.title[lang.code] || ''}
                                            onChange={(e) =>
                                                updateField(vIdx, lang.code, 'title', e.target.value)
                                            }
                                            inputProps={{ maxLength: titleMax + 10 }}
                                        />
                                        <TextField
                                            fullWidth
                                            size="small"
                                            label="Body"
                                            margin="dense"
                                            multiline
                                            minRows={2}
                                            value={variant.body[lang.code] || ''}
                                            onChange={(e) =>
                                                updateField(vIdx, lang.code, 'body', e.target.value)
                                            }
                                            inputProps={{ maxLength: bodyMax + 20 }}
                                        />
                                    </Box>
                                ))}
                            </Box>
                        ))}
                    </Grid>
                </Grid>
            )}
        </DrawerCustom>
    );
}
