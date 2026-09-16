import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LoadingButton from 'components/atoms/LoadingButton';
import {
    copyYoutubePromptToClipboard,
    enqueueYoutubeThumbnailImages,
    fetchYoutubeThumbnailStatus,
    generateYoutubeThumbnailImage,
    parseShortVideoPromptMessage,
    refineYoutubeThumbnailImage,
    type YoutubePromptKind,
    type YoutubeThumbnailConceptPrompt,
} from 'helpers/marketingShortVideoAgentPrompt';
import { parseYoutubeTitleResponse, isYoutubeTitleResponse } from 'helpers/shortVideoYoutubeTitleResponse';
import { parseYoutubeThumbnailResponse, isYoutubeThumbnailResponse } from 'helpers/shortVideoYoutubeThumbnailResponse';
import { fetchShortVideoAgentImageStyle } from 'helpers/marketingShortVideoImageStyleApi';
import { openMetaAiChatUrlWithCookie } from 'helpers/marketingImportHtmlWorkflow';
import {
    fetchWorkflowOutputs,
    saveWorkflowOutput,
    type WorkflowOutputsMap,
} from 'helpers/marketingWorkflowPrompts';
import { WorkflowSection } from './workflowPanelSection';
import ShortVideoAgentYoutubeTitleList from './ShortVideoAgentYoutubeTitleList';
import ShortVideoAgentYoutubeThumbnailList from './ShortVideoAgentYoutubeThumbnailList';
import ShortVideoAgentYoutubeThumbnailResourcePicker, {
    parseThumbnailResourceIds,
} from './ShortVideoAgentYoutubeThumbnailResourcePicker';
import type { useAgentVideoContent } from './useAgentVideoContent';

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
};

/** Khoá workflow lưu output title/thumbnail vào field workflow_outputs của short video. */
const YOUTUBE_WORKFLOW_KEY = 'youtube';

type YoutubeSubTab = 'title' | 'thumbnail';

type PromptSpec = {
    kind: YoutubePromptKind;
    title: string;
    description: string;
    copyLabel: string;
    pasteLabel: string;
    resultLabel: string;
    placeholder: string;
    saveLabel: string;
};

const PROMPT_SPECS: Record<YoutubeSubTab, PromptSpec> = {
    title: {
        kind: 'title',
        title: 'Prompt tạo tiêu đề',
        description: 'Copy prompt → gửi chatbot → dán toàn bộ phản hồi vào ô bên dưới để lưu và phân tích.',
        copyLabel: 'Copy prompt tiêu đề',
        pasteLabel: 'Dán & lưu tiêu đề từ clipboard',
        resultLabel: 'Phản hồi tiêu đề từ chatbot',
        placeholder: 'Dán phản hồi tiêu đề từ chatbot…',
        saveLabel: 'Lưu & phân tích tiêu đề',
    },
    thumbnail: {
        kind: 'thumbnail',
        title: 'Prompt tạo ảnh thu nhỏ',
        description: 'Copy prompt → gửi chatbot → dán ý tưởng/prompt ảnh thu nhỏ nhận được vào ô bên dưới để lưu.',
        copyLabel: 'Copy prompt ảnh thu nhỏ',
        pasteLabel: 'Dán & lưu ảnh thu nhỏ từ clipboard',
        resultLabel: 'Phản hồi ảnh thu nhỏ từ chatbot',
        placeholder: 'Dán phản hồi ảnh thu nhỏ từ chatbot…',
        saveLabel: 'Lưu ảnh thu nhỏ',
    },
};

/**
 * Ô nhập phản hồi chatbot — response rất dài nên mặc định thu gọn khi đã có nội
 * dung (tránh phải scroll xa mới thấy danh sách title/thumbnail bên dưới).
 */
function CollapsibleResponseField({
    label,
    value,
    placeholder,
    helperText,
    onChange,
}: {
    label: string;
    value: string;
    placeholder: string;
    helperText: string;
    onChange: (next: string) => void;
}) {
    const hasContent = Boolean(value.trim());
    const [expanded, setExpanded] = React.useState(false);

    return (
        <Accordion
            disableGutters
            variant="outlined"
            expanded={expanded}
            onChange={(_event, next) => setExpanded(next)}
            sx={{ '&:before': { display: 'none' }, borderRadius: 1, overflow: 'hidden' }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon fontSize="small" />}
                sx={{ minHeight: 40, '& .MuiAccordionSummary-content': { my: 1 } }}
            >
                <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    {label}
                    {hasContent ? ` · ${value.length.toLocaleString('vi-VN')} ký tự` : ' · trống'}
                </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
                <TextField
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    multiline
                    minRows={6}
                    fullWidth
                    placeholder={placeholder}
                    helperText={helperText}
                />
            </AccordionDetails>
        </Accordion>
    );
}

export default function ShortVideoAgentYoutubePanel({ state }: Props) {
    const shortVideoId = Number(state.shortVideoId || 0);
    const hasScript = Boolean(String(state.audioScript || '').trim());

    const [subTab, setSubTab] = React.useState<YoutubeSubTab>('title');
    const [outputs, setOutputs] = React.useState<WorkflowOutputsMap>({});
    const [values, setValues] = React.useState<Record<YoutubePromptKind, string>>({
        title: '',
        thumbnail: '',
    });
    const [copyingKind, setCopyingKind] = React.useState<YoutubePromptKind | ''>('');
    const [copiedKind, setCopiedKind] = React.useState<YoutubePromptKind | ''>('');
    const [pastingKind, setPastingKind] = React.useState<YoutubePromptKind | ''>('');
    const [savingKind, setSavingKind] = React.useState<YoutubePromptKind | ''>('');
    const [generatingRank, setGeneratingRank] = React.useState<string>('');
    const [savingSelectedTitle, setSavingSelectedTitle] = React.useState(false);
    const [hasStyleReference, setHasStyleReference] = React.useState(false);
    const [pendingRanks, setPendingRanks] = React.useState<Set<string>>(() => new Set());
    const [enqueueingAll, setEnqueueingAll] = React.useState(false);
    const [renderAllDialogOpen, setRenderAllDialogOpen] = React.useState(false);
    const [jobImageUrls, setJobImageUrls] = React.useState<Record<string, string>>({});
    // rank → url chatbot đã tạo ảnh + feedback đang chờ update (từ status polling).
    const [statusChatUrls, setStatusChatUrls] = React.useState<Record<string, string>>({});
    const [statusChatCookieIds, setStatusChatCookieIds] = React.useState<Record<string, number>>({});
    const [statusFeedbackNotes, setStatusFeedbackNotes] = React.useState<Record<string, string>>({});
    const [savingFeedbackRank, setSavingFeedbackRank] = React.useState<string>('');
    const loadedRef = React.useRef<number>(-1);
    const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (!shortVideoId) {
            loadedRef.current = -1;
            setOutputs({});
            setValues({ title: '', thumbnail: '' });
            setHasStyleReference(false);
            setPendingRanks(new Set());
            setJobImageUrls({});
            setStatusChatUrls({});
            setStatusChatCookieIds({});
            setStatusFeedbackNotes({});
            return;
        }
        if (loadedRef.current === shortVideoId) {
            return;
        }
        loadedRef.current = shortVideoId;
        setPendingRanks(new Set());
        setJobImageUrls({});
        setStatusChatUrls({});
        setStatusChatCookieIds({});
        setStatusFeedbackNotes({});
        fetchWorkflowOutputs(shortVideoId).then((map) => {
            setOutputs(map || {});
            const saved = map?.[YOUTUBE_WORKFLOW_KEY] || {};
            setValues({
                title: saved.title || '',
                thumbnail: saved.thumbnail || '',
            });
        });
        // Nạp job thumbnail đang chạy (nếu mở lại tab khi có job pending).
        fetchYoutubeThumbnailStatus(shortVideoId)
            .then((res) => {
                const active = Array.isArray(res?.active) ? res.active : [];
                setPendingRanks(new Set(active.map((item) => String(item.rank))));
                if (res?.image_urls && typeof res.image_urls === 'object') {
                    setJobImageUrls(res.image_urls);
                }
                if (res?.chat_urls && typeof res.chat_urls === 'object') {
                    setStatusChatUrls(res.chat_urls);
                }
                if (res?.chat_cookie_ids && typeof res.chat_cookie_ids === 'object') {
                    setStatusChatCookieIds(res.chat_cookie_ids);
                }
                setStatusFeedbackNotes(
                    res?.feedback_notes && typeof res.feedback_notes === 'object'
                        ? res.feedback_notes
                        : {},
                );
            })
            .catch(() => setPendingRanks(new Set()));
        fetchShortVideoAgentImageStyle(shortVideoId)
            .then((style) => setHasStyleReference(Boolean(String(style?.prompt || '').trim())))
            .catch(() => setHasStyleReference(false));
    }, [shortVideoId]);

    React.useEffect(() => {
        return () => {
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
        };
    }, []);

    /**
     * Poll trạng thái job thumbnail khi có job đang chạy (hoặc khi mới enqueue).
     * Job không còn trong queue → tự tắt loading; ảnh mới → cập nhật grid.
     */
    React.useEffect(() => {
        if (!shortVideoId || pendingRanks.size === 0) {
            return;
        }

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;

        const poll = async () => {
            try {
                const res = await fetchYoutubeThumbnailStatus(shortVideoId);
                if (cancelled) {
                    return;
                }
                const active = Array.isArray(res?.active) ? res.active : [];
                setPendingRanks(new Set(active.filter((item) => item.status !== 'completed').map((item) => String(item.rank))));
                if (res?.image_urls && typeof res.image_urls === 'object') {
                    setJobImageUrls((prev) => ({ ...prev, ...res.image_urls }));
                }
                if (res?.chat_urls && typeof res.chat_urls === 'object') {
                    setStatusChatUrls((prev) => ({ ...prev, ...res.chat_urls }));
                }
                if (res?.chat_cookie_ids && typeof res.chat_cookie_ids === 'object') {
                    setStatusChatCookieIds((prev) => ({ ...prev, ...res.chat_cookie_ids }));
                }
                // Feedback được BE xóa khi update xong → thay toàn bộ (không merge) để badge tắt.
                setStatusFeedbackNotes(
                    res?.feedback_notes && typeof res.feedback_notes === 'object'
                        ? res.feedback_notes
                        : {},
                );
            } catch {
                // Lỗi tạm thời — giữ nguyên, thử lại vòng sau.
            }
            if (!cancelled) {
                timer = setTimeout(() => { void poll(); }, 4000);
            }
        };

        void poll();

        return () => {
            cancelled = true;
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [shortVideoId, pendingRanks.size]);

    const parsedTitle = React.useMemo(
        () => parseYoutubeTitleResponse(values.title),
        [values.title],
    );

    const parsedThumbnail = React.useMemo(
        () => parseYoutubeThumbnailResponse(values.thumbnail),
        [values.thumbnail],
    );

    const savedValues = outputs[YOUTUBE_WORKFLOW_KEY] || {};
    const selectedTitle = String(savedValues.selected_title || '');

    // Resource user chọn để đính kèm khi render thumbnail (thứ tự chọn giữ nguyên).
    const thumbnailResourceIds = React.useMemo(
        () => parseThumbnailResourceIds(savedValues.thumbnail_resource_ids),
        [savedValues.thumbnail_resource_ids],
    );

    const thumbnailImageUrls = React.useMemo(() => {
        const map: Record<string, string> = {};
        Object.entries(outputs[YOUTUBE_WORKFLOW_KEY] || {}).forEach(([key, value]) => {
            const match = key.match(/^thumbnail_image_(\d+)$/);
            if (match && value) {
                map[match[1]] = value;
            }
        });
        return { ...map, ...jobImageUrls };
    }, [outputs, jobImageUrls]);

    // Url chatbot đã tạo ảnh theo rank (từ workflow outputs + status polling).
    const thumbnailChatUrls = React.useMemo(() => {
        const map: Record<string, string> = {};
        Object.entries(outputs[YOUTUBE_WORKFLOW_KEY] || {}).forEach(([key, value]) => {
            const match = key.match(/^thumbnail_chat_url_(\d+)$/);
            if (match && value) {
                map[match[1]] = value;
            }
        });
        return { ...map, ...statusChatUrls };
    }, [outputs, statusChatUrls]);

    // Cookie_id account Meta.ai đã tạo chat theo rank (để set lại cookie khi mở).
    const thumbnailChatCookieIds = React.useMemo(() => {
        const map: Record<string, number> = {};
        Object.entries(outputs[YOUTUBE_WORKFLOW_KEY] || {}).forEach(([key, value]) => {
            const match = key.match(/^thumbnail_cookie_id_(\d+)$/);
            const id = Number(value);
            if (match && Number.isFinite(id) && id > 0) {
                map[match[1]] = id;
            }
        });
        return { ...map, ...statusChatCookieIds };
    }, [outputs, statusChatCookieIds]);

    // Feedback đang chờ update theo rank (BE xóa khi render xong).
    const thumbnailFeedbackNotes = React.useMemo<Record<string, string>>(
        () => statusFeedbackNotes,
        [statusFeedbackNotes],
    );
    const isDirty = (kind: YoutubePromptKind) => (values[kind] || '') !== (savedValues[kind] || '');

    const handleCopy = React.useCallback(async (kind: YoutubePromptKind) => {
        if (!shortVideoId || copyingKind) {
            return;
        }
        setCopyingKind(kind);
        let result: { ok: boolean; message: string };
        try {
            result = await copyYoutubePromptToClipboard(shortVideoId, kind);
        } catch {
            result = { ok: false, message: 'Không copy được prompt' };
        }
        setCopyingKind('');
        if (result.ok) {
            setCopiedKind(kind);
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
            copiedTimerRef.current = setTimeout(() => setCopiedKind(''), 2000);
        }
        state.showMessage(result.message, result.ok ? 'success' : 'error');
    }, [shortVideoId, copyingKind, state]);

    const handleSave = React.useCallback(async (kind: YoutubePromptKind, overrideValue?: string) => {
        if (savingKind) {
            return;
        }
        if (!shortVideoId) {
            state.showMessage('Thiếu short video — không lưu được kết quả', 'warning');
            return;
        }
        const value = overrideValue !== undefined ? overrideValue : (values[kind] || '');
        setSavingKind(kind);
        const res = await saveWorkflowOutput(shortVideoId, YOUTUBE_WORKFLOW_KEY, kind, value);
        setSavingKind('');
        if (!res.ok) {
            state.showMessage(res.message || 'Không lưu được kết quả', 'error');
            return;
        }
        if (res.outputs) {
            setOutputs(res.outputs);
        } else {
            setOutputs((prev) => ({
                ...prev,
                [YOUTUBE_WORKFLOW_KEY]: {
                    ...(prev[YOUTUBE_WORKFLOW_KEY] || {}),
                    [kind]: value,
                },
            }));
        }
        state.showMessage(kind === 'title' ? 'Đã lưu & phân tích tiêu đề' : 'Đã lưu ảnh thu nhỏ', 'success');
    }, [savingKind, shortVideoId, values, state]);

    /**
     * Đọc nội dung dài từ clipboard rồi lưu luôn — không cần mở ô phản hồi
     * (phản hồi chatbot rất dài, mở ra phải scroll xa mới thấy kết quả phân tích).
     */
    const handlePasteAndSave = React.useCallback(async (kind: YoutubePromptKind) => {
        if (pastingKind || savingKind) {
            return;
        }
        if (!shortVideoId) {
            state.showMessage('Thiếu short video — không lưu được kết quả', 'warning');
            return;
        }
        if (!navigator.clipboard?.readText) {
            state.showMessage('Trình duyệt không hỗ trợ đọc clipboard', 'error');
            return;
        }

        setPastingKind(kind);
        let text = '';
        try {
            text = (await navigator.clipboard.readText()) || '';
        } catch {
            setPastingKind('');
            state.showMessage('Không đọc được clipboard — hãy cấp quyền hoặc dán thủ công', 'error');
            return;
        }
        setPastingKind('');

        if (!text.trim()) {
            state.showMessage('Clipboard đang trống — không có nội dung để lưu', 'warning');
            return;
        }

        // Chặn lưu khi clipboard không đúng cấu trúc phản hồi (tránh user copy nhầm).
        const isValid = kind === 'title'
            ? isYoutubeTitleResponse(text)
            : isYoutubeThumbnailResponse(text);
        if (!isValid) {
            state.showMessage(
                kind === 'title'
                    ? 'Clipboard không đúng cấu trúc phản hồi tiêu đề (cần JSON/markdown có danh sách tiêu đề) — kiểm tra lại đã copy đúng kết quả chatbot chưa.'
                    : 'Clipboard không đúng cấu trúc phản hồi ảnh thu nhỏ (cần JSON/markdown có danh sách concept) — kiểm tra lại đã copy đúng kết quả chatbot chưa.',
                'warning',
            );
            return;
        }

        setValues((prev) => ({ ...prev, [kind]: text }));
        await handleSave(kind, text);
    }, [pastingKind, savingKind, shortVideoId, handleSave, state]);

    const handleSelectTitle = React.useCallback(async (title: string) => {
        if (savingSelectedTitle) {
            return;
        }
        if (!shortVideoId) {
            state.showMessage('Thiếu short video — không lưu được tiêu đề đã chọn', 'warning');
            return;
        }
        const next = title === selectedTitle ? '' : title;
        setSavingSelectedTitle(true);
        const res = await saveWorkflowOutput(
            shortVideoId,
            YOUTUBE_WORKFLOW_KEY,
            'selected_title',
            next,
        );
        setSavingSelectedTitle(false);
        if (!res.ok) {
            state.showMessage(res.message || 'Không lưu được tiêu đề đã chọn', 'error');
            return;
        }
        if (res.outputs) {
            setOutputs(res.outputs);
        } else {
            setOutputs((prev) => ({
                ...prev,
                [YOUTUBE_WORKFLOW_KEY]: {
                    ...(prev[YOUTUBE_WORKFLOW_KEY] || {}),
                    selected_title: next,
                },
            }));
        }
    }, [savingSelectedTitle, shortVideoId, selectedTitle, state]);

    /** Lưu danh sách resource đã chọn cho thumbnail (JSON array, giữ thứ tự). */
    const handleThumbnailResourcesChange = React.useCallback(async (ids: number[]) => {
        if (!shortVideoId) {
            state.showMessage('Thiếu short video — không lưu được resource', 'warning');
            return;
        }
        const value = JSON.stringify(ids);
        const res = await saveWorkflowOutput(
            shortVideoId,
            YOUTUBE_WORKFLOW_KEY,
            'thumbnail_resource_ids',
            value,
        );
        if (!res.ok) {
            state.showMessage(res.message || 'Không lưu được resource đã chọn', 'error');
            return;
        }
        if (res.outputs) {
            setOutputs(res.outputs);
        } else {
            setOutputs((prev) => ({
                ...prev,
                [YOUTUBE_WORKFLOW_KEY]: {
                    ...(prev[YOUTUBE_WORKFLOW_KEY] || {}),
                    thumbnail_resource_ids: value,
                },
            }));
        }
    }, [shortVideoId, state]);

    const handleGenerateThumbnailImage = React.useCallback(async (rank: number, prompt: string) => {
        if (generatingRank) {
            return;
        }
        if (!shortVideoId) {
            state.showMessage('Thiếu short video — không tạo được ảnh', 'warning');
            return;
        }
        if (!String(prompt || '').trim()) {
            state.showMessage('Concept chưa có prompt ảnh', 'warning');
            return;
        }

        const rankKey = String(rank);
        setGeneratingRank(rankKey);
        try {
            const res = await generateYoutubeThumbnailImage(shortVideoId, prompt, { rank, label: `rank_${rank}` });
            const url = String(res?.url || res?.image_url || '').trim();
            if (!res?.success || !url) {
                state.showMessage(
                    parseShortVideoPromptMessage(res?.message) || 'Tạo ảnh thumbnail thất bại',
                    'error',
                );
                return;
            }

            // BE đã lưu workflow_outputs; cập nhật local để hiển thị ngay.
            setOutputs((prev) => ({
                ...prev,
                [YOUTUBE_WORKFLOW_KEY]: {
                    ...(prev[YOUTUBE_WORKFLOW_KEY] || {}),
                    [`thumbnail_image_${rank}`]: url,
                },
            }));
            setJobImageUrls((prev) => ({ ...prev, [rankKey]: url }));
            state.showMessage(
                res?.safe_version_used
                    ? `Đã tạo ảnh thumbnail #${rank} bằng phiên bản an toàn (Meta.ai đã chặn prompt gốc)`
                    : `Đã tạo ảnh thumbnail #${rank}`,
                res?.safe_version_used ? 'warning' : 'success',
            );
        } catch (error) {
            state.showMessage(
                error instanceof Error ? error.message : 'Tạo ảnh thumbnail thất bại',
                'error',
            );
        } finally {
            setGeneratingRank('');
        }
    }, [generatingRank, shortVideoId, state]);

    /**
     * Render tất cả concept: enqueue 1 job/concept. Icon loading hiện trên ô ảnh
     * cho tới khi job xong (hoặc job bị xóa → polling tự tắt).
     * regenerate = true → huỷ job đang chạy và render lại mọi concept.
     */
    const handleRenderAllThumbnails = React.useCallback(async (regenerate: boolean) => {
        if (enqueueingAll) {
            return;
        }
        if (!shortVideoId) {
            state.showMessage('Thiếu short video — không render được ảnh', 'warning');
            return;
        }

        const concepts: YoutubeThumbnailConceptPrompt[] = parsedThumbnail.concepts
            .filter((concept) => String(concept.imagePrompt || '').trim() !== '')
            .map((concept) => ({
                rank: concept.rank,
                prompt: concept.imagePrompt,
                label: `rank_${concept.rank}`,
            }));

        if (concepts.length === 0) {
            state.showMessage('Không có concept nào có prompt ảnh', 'warning');
            return;
        }

        setEnqueueingAll(true);
        try {
            const res = await enqueueYoutubeThumbnailImages(shortVideoId, concepts, regenerate);
            if (!res?.success) {
                state.showMessage(
                    parseShortVideoPromptMessage(res?.message) || 'Không đưa được thumbnail vào hàng đợi',
                    'error',
                );
                return;
            }
            const queued = Array.isArray(res.queued) ? res.queued : [];
            if (queued.length > 0) {
                // Render lại: bỏ ảnh cũ đang hiển thị để thấy loading cho toàn bộ.
                if (regenerate) {
                    setJobImageUrls({});
                }
                setPendingRanks((prev) => {
                    const next = new Set(prev);
                    queued.forEach((item) => next.add(String(item.rank)));
                    return next;
                });
            }
            state.showMessage(
                parseShortVideoPromptMessage(res?.message)
                    || (regenerate
                        ? `Đã render lại ${queued.length} thumbnail`
                        : `Đã đưa ${queued.length} thumbnail vào hàng đợi`),
                queued.length > 0 ? 'success' : 'warning',
            );
        } catch (error) {
            state.showMessage(
                error instanceof Error ? error.message : 'Không đưa được thumbnail vào hàng đợi',
                'error',
            );
        } finally {
            setEnqueueingAll(false);
        }
    }, [enqueueingAll, shortVideoId, parsedThumbnail, state]);

    const handleOpenThumbnailChat = React.useCallback(async (rank: number) => {
        const rankKey = String(rank);
        const chatUrl = String(thumbnailChatUrls[rankKey] || '').trim();
        if (chatUrl === '') {
            state.showMessage('Concept này chưa có url chatbot', 'warning');
            return;
        }
        let host = '';
        try {
            host = new URL(chatUrl).hostname || '';
        } catch {
            host = '';
        }
        // Chat Meta.ai cần extension set lại cookie account tạo chat trước khi mở
        // (window.open không set được cookie pool → chat không mở).
        if (!/(^|\.)meta\.ai$/i.test(host)) {
            window.open(chatUrl, '_blank', 'noopener,noreferrer');
            return;
        }
        try {
            await openMetaAiChatUrlWithCookie({
                chatUrl,
                shortVideoId,
                rank,
                cookieId: Number(thumbnailChatCookieIds[rankKey] || 0),
            });
        } catch (error) {
            state.showMessage(
                error instanceof Error ? error.message : 'Không mở được chat Meta.ai',
                'error',
            );
        }
    }, [thumbnailChatUrls, thumbnailChatCookieIds, shortVideoId, state]);

    /**
     * Gửi feedback cho 1 concept: FE hiển thị ngay trạng thái chờ + gọi API tạo job;
     * worker mở lại chat Meta.ai cũ để render ảnh mới, polling tự cập nhật ảnh.
     */
    const handleSubmitThumbnailFeedback = React.useCallback(async (rank: number, feedback: string) => {
        const note = String(feedback || '').trim();
        if (!shortVideoId) {
            state.showMessage('Thiếu short video — không gửi được feedback', 'warning');
            return false;
        }
        if (note === '') {
            state.showMessage('Nhập nội dung feedback trước khi gửi', 'warning');
            return false;
        }
        if (savingFeedbackRank) {
            return false;
        }
        const rankKey = String(rank);
        setSavingFeedbackRank(rankKey);
        setStatusFeedbackNotes((prev) => ({ ...prev, [rankKey]: note }));
        setPendingRanks((prev) => {
            const next = new Set(prev);
            next.add(rankKey);
            return next;
        });
        try {
            const res = await refineYoutubeThumbnailImage(shortVideoId, rank, note);
            if (!res?.success) {
                setStatusFeedbackNotes((prev) => {
                    const next = { ...prev };
                    delete next[rankKey];
                    return next;
                });
                setPendingRanks((prev) => {
                    const next = new Set(prev);
                    next.delete(rankKey);
                    return next;
                });
                state.showMessage(
                    parseShortVideoPromptMessage(res?.message) || 'Không gửi được feedback',
                    'error',
                );
                return false;
            }
            state.showMessage(
                parseShortVideoPromptMessage(res?.message)
                    || `Đã gửi feedback cho thumbnail #${rank} — đang render lại`,
                'success',
            );
            return true;
        } catch (error) {
            setStatusFeedbackNotes((prev) => {
                const next = { ...prev };
                delete next[rankKey];
                return next;
            });
            state.showMessage(
                error instanceof Error ? error.message : 'Không gửi được feedback',
                'error',
            );
            return false;
        } finally {
            setSavingFeedbackRank('');
        }
    }, [shortVideoId, savingFeedbackRank, state]);

    const spec = PROMPT_SPECS[subTab];
    const copying = copyingKind === spec.kind;
    const copied = copiedKind === spec.kind;
    const pasting = pastingKind === spec.kind;
    const saving = savingKind === spec.kind;
    const pasteDisabled = !shortVideoId || Boolean(pastingKind) || Boolean(savingKind);
    const copyDisabled = !shortVideoId || !hasScript || Boolean(copyingKind);
    const copyDisabledReason = !hasScript
        ? 'Cần audio script trước'
        : (subTab === 'thumbnail' && !selectedTitle
            ? 'Chưa chọn tiêu đề — [TITLE] sẽ không được thay'
            : '');
    const hasParsedTitle = subTab === 'title' && (
        parsedTitle.items.length > 0
        || parsedTitle.audienceInsight.length > 0
        || parsedTitle.winner !== null
        || parsedTitle.packaging !== null
        || Boolean(parsedTitle.description)
        || Boolean(parsedTitle.firstComment)
        || parsedTitle.hashtags.length > 0
        || parsedTitle.tags.length > 0
        || parsedTitle.seo.title !== null
        || parsedTitle.seo.description !== null
    );
    const hasParsedThumbnail = subTab === 'thumbnail' && (
        parsedThumbnail.concepts.length > 0
        || parsedThumbnail.videoAnalysis.length > 0
        || parsedThumbnail.strategyTriggers.length > 0
        || parsedThumbnail.winner !== null
        || parsedThumbnail.packagingAdvice.length > 0
    );

    return (
        <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
            <Stack spacing={2}>
                <Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        YouTube
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Copy prompt generate title/thumbnail, gửi lên chatbot, rồi dán kết quả để lưu và phân tích.
                    </Typography>
                </Box>

                <ToggleButtonGroup
                    exclusive
                    fullWidth
                    size="small"
                    value={subTab}
                    onChange={(_event, next: YoutubeSubTab | null) => {
                        if (next) {
                            setSubTab(next);
                        }
                    }}
                    sx={{ '& .MuiToggleButton-root': { textTransform: 'none', py: 0.5 } }}
                >
                    <ToggleButton value="title">Tiêu đề</ToggleButton>
                    <ToggleButton value="thumbnail">Ảnh thu nhỏ</ToggleButton>
                </ToggleButtonGroup>

                {!shortVideoId ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                        Chưa gắn short video — chưa copy/lưu được prompt.
                    </Alert>
                ) : null}

                {shortVideoId && !hasScript ? (
                    <Alert severity="warning" sx={{ py: 0.5 }}>
                        Chưa có audio script — [VIDEO_CONTENT] trong prompt sẽ không được thay. Hãy sinh/lưu script trước.
                    </Alert>
                ) : null}

                {subTab === 'thumbnail' && shortVideoId && !selectedTitle ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                        Chưa chọn tiêu đề — [TITLE] trong prompt sẽ không được thay. Chọn 1 tiêu đề ở tab Tiêu đề.
                    </Alert>
                ) : null}

                {subTab === 'thumbnail' && shortVideoId && !hasStyleReference ? (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                        Video chưa chọn phong cách hình ảnh — [STYLE_REFERENCE] trong prompt sẽ không được thay.
                        Chọn phong cách trong phần cài đặt hình ảnh của video.
                    </Alert>
                ) : null}

                <WorkflowSection
                    title={spec.title}
                    tone="prompt"
                    description={spec.description}
                >
                    <Stack spacing={1.5}>
                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            alignItems="center"
                        >
                            <Tooltip title={copyDisabledReason} placement="top">
                                <span>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        disabled={copyDisabled}
                                        startIcon={
                                            copying
                                                ? <CircularProgress size={12} color="inherit" />
                                                : copied
                                                    ? <CheckIcon fontSize="small" />
                                                    : <ContentCopyIcon fontSize="small" />
                                        }
                                        onClick={() => { void handleCopy(spec.kind); }}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {copied ? 'Đã copy' : spec.copyLabel}
                                    </Button>
                                </span>
                            </Tooltip>

                            <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                disabled={pasteDisabled}
                                startIcon={
                                    pasting
                                        ? <CircularProgress size={12} color="inherit" />
                                        : <ContentPasteIcon fontSize="small" />
                                }
                                onClick={() => { void handlePasteAndSave(spec.kind); }}
                                sx={{ textTransform: 'none' }}
                            >
                                {spec.pasteLabel}
                            </Button>
                        </Stack>

                        <CollapsibleResponseField
                            key={spec.kind}
                            label={spec.resultLabel}
                            value={values[spec.kind]}
                            placeholder={spec.placeholder}
                            helperText={
                                spec.kind === 'title'
                                    ? 'Khi lưu, phản hồi sẽ được phân tích thành danh sách tiêu đề ngay bên dưới.'
                                    : 'Khi lưu, phản hồi sẽ được phân tích thành danh sách concept ảnh thu nhỏ ngay bên dưới.'
                            }
                            onChange={(next) => {
                                setValues((prev) => ({ ...prev, [spec.kind]: next }));
                            }}
                        />

                        <LoadingButton
                            size="small"
                            variant="contained"
                            loading={saving}
                            disabled={savingKind !== '' || !shortVideoId || !isDirty(spec.kind)}
                            onClick={() => { void handleSave(spec.kind); }}
                            sx={{ alignSelf: 'flex-start' }}
                        >
                            {spec.saveLabel}
                        </LoadingButton>

                        {spec.kind === 'thumbnail' ? (
                            <ShortVideoAgentYoutubeThumbnailResourcePicker
                                shortVideoId={shortVideoId}
                                selectedIds={thumbnailResourceIds}
                                onChange={(ids) => { void handleThumbnailResourcesChange(ids); }}
                                disabled={savingKind !== ''}
                            />
                        ) : null}
                    </Stack>
                </WorkflowSection>

                {hasParsedTitle ? (
                    <WorkflowSection
                        collapsible
                        defaultExpanded
                        title={`Kết quả phân tích (${parsedTitle.items.length} tiêu đề)`}
                        tone="neutral"
                        description="Danh sách tiêu đề theo phản hồi chatbot — bấm Người thắng / Gợi ý đóng gói để xem chi tiết."
                    >
                        <ShortVideoAgentYoutubeTitleList
                            parsed={parsedTitle}
                            selectedTitle={selectedTitle}
                            onSelectTitle={(title) => { void handleSelectTitle(title); }}
                        />
                    </WorkflowSection>
                ) : null}

                {hasParsedThumbnail ? (
                    <WorkflowSection
                        collapsible
                        defaultExpanded
                        title={`Kết quả phân tích (${parsedThumbnail.concepts.length} concept)`}
                        tone="neutral"
                        description="Danh sách ảnh thu nhỏ — bấm icon để xem chi tiết, hoặc Render tất cả để tạo mọi ảnh còn thiếu."
                        headerAction={
                            <LoadingButton
                                size="small"
                                variant="contained"
                                loading={enqueueingAll}
                                disabled={enqueueingAll || !shortVideoId}
                                onClick={() => setRenderAllDialogOpen(true)}
                                sx={{ textTransform: 'none' }}
                            >
                                Render tất cả
                            </LoadingButton>
                        }
                    >
                        <ShortVideoAgentYoutubeThumbnailList
                            parsed={parsedThumbnail}
                            shortVideoId={shortVideoId}
                            imageUrls={thumbnailImageUrls}
                            chatUrls={thumbnailChatUrls}
                            feedbackNotes={thumbnailFeedbackNotes}
                            generatingRank={generatingRank}
                            pendingRanks={pendingRanks}
                            savingFeedbackRank={savingFeedbackRank}
                            onOpenChat={handleOpenThumbnailChat}
                            onSubmitFeedback={handleSubmitThumbnailFeedback}
                            onGenerateImage={(rank, prompt) => {
                                void handleGenerateThumbnailImage(rank, prompt);
                            }}
                        />
                    </WorkflowSection>
                ) : null}
            </Stack>

            <Dialog
                open={renderAllDialogOpen}
                onClose={() => {
                    if (!enqueueingAll) {
                        setRenderAllDialogOpen(false);
                    }
                }}
                fullWidth
                maxWidth="xs"
            >
                <DialogTitle sx={{ fontSize: 16 }}>Render thumbnail</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ fontSize: 13 }}>
                        Chọn cách render cho {parsedThumbnail.concepts.length} concept:
                        <br />• <strong>Render ảnh thiếu</strong>: chỉ tạo ảnh chưa có, giữ ảnh đang có.
                        <br />• <strong>Render lại tất cả</strong>: huỷ job đang chạy và tạo lại toàn bộ ảnh.
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                    <Button
                        size="small"
                        onClick={() => setRenderAllDialogOpen(false)}
                        disabled={enqueueingAll}
                        sx={{ textTransform: 'none' }}
                    >
                        Huỷ
                    </Button>
                    <Button
                        size="small"
                        variant="outlined"
                        disabled={enqueueingAll}
                        onClick={() => {
                            setRenderAllDialogOpen(false);
                            void handleRenderAllThumbnails(false);
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        Render ảnh thiếu
                    </Button>
                    <LoadingButton
                        size="small"
                        variant="contained"
                        color="warning"
                        loading={enqueueingAll}
                        onClick={() => {
                            setRenderAllDialogOpen(false);
                            void handleRenderAllThumbnails(true);
                        }}
                        sx={{ textTransform: 'none' }}
                    >
                        Render lại tất cả
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
