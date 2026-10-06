import React from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import {
    copyWorkflowPromptToClipboard,
    fetchWorkflowPromptText,
    MANUAL_BEAT_PROMPTS_SAVED_EVENT,
    splitWorkflowBeats,
    splitWorkflowOutputIntoParts,
    validateWorkflowBreakdownPart,
    type WorkflowBreakdownChunk,
    type WorkflowBreakdownPartValidation,
    type WorkflowBreakdownPlan,
    type WorkflowPromptContext,
    type WorkflowPromptItem,
} from 'helpers/marketingWorkflowPrompts';
import {
    fetchDeepseekStep2Status,
    startDeepseekStep2Chunk,
    type DeepseekStep2ChunkStatus,
} from 'helpers/marketingDeepseekVideoImage';
import { importManualBeatPromptFile } from './AgentVideo/agentVideoApi';

function readApiMessage(source: unknown, fallback: string): string {
    const record = source && typeof source === 'object' ? (source as Record<string, unknown>) : null;
    const message = record ? record.message : undefined;
    if (typeof message === 'string' && message.trim()) {
        return message;
    }
    if (message && typeof message === 'object' && typeof (message as { content?: unknown }).content === 'string') {
        const content = String((message as { content?: string }).content || '').trim();
        if (content) {
            return content;
        }
    }
    return fallback;
}

type PartNotice = {
    ok: boolean;
    errors: string[];
};

type Props = {
    workflowKey: string;
    item: WorkflowPromptItem;
    plan: WorkflowBreakdownPlan;
    /** Output đã lưu theo updateField — dùng để prefill lại từng phần khi mở lại. */
    savedValue: string;
    /** ID short video — để cập nhật prompt vào đúng beat (imagePromptBeatUpdate). */
    shortVideoId?: number;
    showMessage: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    /**
     * Lấy context tươi cho 1 phần trước khi copy/gửi DeepSeek — drawer tải lại
     * workflow outputs (character sheet / audio gốc có thể vừa lưu từ overlay
     * DeepSeek) rồi cắt theo dải beat của phần. Không có thì dùng chunk.context.
     */
    getFreshContext?: (chunk: WorkflowBreakdownChunk, totalBeats: number) => Promise<WorkflowPromptContext>;
};

/**
 * scriptBreakdown > 0: KHÔNG hiển thị nội dung prompt (quá dài) — mỗi phần chỉ có
 * button Copy prompt + button Paste kết quả từ clipboard. Nội dung dán được validate
 * (đủ beat, đúng audio, đủ section, không trùng prompt) rồi cập nhật THẲNG vào các
 * beat tương ứng của clip (partial import, không cần gộp input tổng).
 */
export default function MarketingWorkflowBreakdown({
    workflowKey,
    item,
    plan,
    savedValue,
    shortVideoId,
    showMessage,
    getFreshContext,
}: Props) {
    const beatCountsKey = plan.beatCounts.join(',');
    const [parts, setParts] = React.useState<string[]>(
        () => splitWorkflowOutputIntoParts(savedValue, plan.beatCounts),
    );
    const [notices, setNotices] = React.useState<Record<number, PartNotice>>({});
    const [copyingIndex, setCopyingIndex] = React.useState(-1);
    const [copiedIndex, setCopiedIndex] = React.useState(-1);
    const [pastingIndex, setPastingIndex] = React.useState(-1);
    const [importingIndex, setImportingIndex] = React.useState(-1);
    const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const [deepseekStatus, setDeepseekStatus] = React.useState<Record<number, DeepseekStep2ChunkStatus>>({});
    const [deepseekStarting, setDeepseekStarting] = React.useState(-1);
    const [deepseekAllRunning, setDeepseekAllRunning] = React.useState(false);
    // Giữ showMessage trong ref để effect poll không phụ thuộc hàm (tránh restart liên tục).
    const showMessageRef = React.useRef(showMessage);
    showMessageRef.current = showMessage;
    // Chống race: chỉ áp dụng phản hồi của request MỚI NHẤT, bỏ qua phản hồi cũ về muộn.
    const statusSeqRef = React.useRef(0);

    React.useEffect(() => {
        setParts(splitWorkflowOutputIntoParts(savedValue, plan.beatCounts));
        setNotices({});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [savedValue, beatCountsKey]);

    React.useEffect(() => () => {
        if (copiedTimerRef.current) {
            clearTimeout(copiedTimerRef.current);
        }
    }, []);

    const validations = React.useMemo<WorkflowBreakdownPartValidation[]>(
        () => plan.chunks.map((chunk, index) => (
            validateWorkflowBreakdownPart(parts[index] || '', splitWorkflowBeats(chunk.audioScript))
        )),
        [plan, parts],
    );

    const validCount = validations.filter((validation) => validation.ok).length;
    const updatedCount = plan.chunks.filter((chunk) => notices[chunk.index]?.ok).length;

    const handleCopyChunk = React.useCallback(async (index: number) => {
        const chunk = plan.chunks[index];
        if (!chunk || copyingIndex >= 0) {
            return;
        }
        setCopyingIndex(index);
        let result: { ok: boolean; message: string };
        try {
            const context = getFreshContext
                ? await getFreshContext(chunk, plan.totalBeats)
                : chunk.context;
            result = await copyWorkflowPromptToClipboard(workflowKey, item.file, context);
        } catch {
            result = { ok: false, message: 'Không copy được prompt' };
        }
        setCopyingIndex(-1);
        if (result.ok) {
            setCopiedIndex(index);
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
            copiedTimerRef.current = setTimeout(() => setCopiedIndex(-1), 2000);
        }
        showMessage(result.message, result.ok ? 'success' : 'error');
    }, [plan, copyingIndex, workflowKey, item.file, showMessage, getFreshContext]);

    /** Cập nhật prompt của 1 phần thẳng vào các beat tương ứng (partial import). */
    const runImport = React.useCallback(async (index: number, text: string) => {
        const chunk = plan.chunks[index];
        if (!chunk || !String(text || '').trim()) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            showMessage('Thiếu short_video_id — không cập nhật được prompt cho beat', 'warning');
            return;
        }
        setImportingIndex(index);
        try {
            const result = await importManualBeatPromptFile(sid, text, {
                partial: true,
                startOrder: chunk.beatStart,
            });
            if (result?.success === false) {
                const errors = Array.isArray(result?.errors) ? result.errors : [];
                setNotices((prev) => ({
                    ...prev,
                    [index]: { ok: false, errors: errors.length > 0 ? errors : ['Không cập nhật được prompt cho beat'] },
                }));
                showMessage(`Phần ${index + 1} có lỗi — chưa cập nhật beat nào`, 'error');
                return;
            }
            const updatedOrders = Array.isArray(result?.updated_orders) ? result.updated_orders : [];
            setNotices((prev) => ({ ...prev, [index]: { ok: true, errors: [] } }));
            showMessage(
                `Đã cập nhật image prompt cho ${updatedOrders.length || chunk.beatCount} beat (phần ${index + 1})`,
                'success',
            );
            document.dispatchEvent(new CustomEvent(MANUAL_BEAT_PROMPTS_SAVED_EVENT, {
                detail: { shortVideoId: sid },
            }));
            if (result?.beat_division_completed) {
                showMessage('Đã đủ prompt — chia beat hoàn tất, chạy tiếp pipeline', 'success');
            }
        } catch (err) {
            setNotices((prev) => ({
                ...prev,
                [index]: {
                    ok: false,
                    errors: [err instanceof Error ? err.message : 'Không cập nhật được prompt cho beat'],
                },
            }));
            showMessage('Không cập nhật được prompt cho beat', 'error');
        } finally {
            setImportingIndex(-1);
        }
    }, [plan, shortVideoId, showMessage]);

    const handlePasteChunk = React.useCallback(async (index: number) => {
        if (pastingIndex >= 0 || importingIndex >= 0) {
            return;
        }
        const chunk = plan.chunks[index];
        if (!chunk) {
            return;
        }
        setPastingIndex(index);
        let text = '';
        try {
            text = await navigator.clipboard.readText();
        } catch {
            text = '';
        }
        setPastingIndex(-1);
        if (!text.trim()) {
            showMessage('Clipboard trống hoặc trình duyệt chặn đọc clipboard — hãy cho phép quyền rồi thử lại', 'warning');
            return;
        }

        setNotices((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
        setParts((prev) => {
            const next = [...prev];
            next[index] = text;
            return next;
        });

        const validation = validateWorkflowBreakdownPart(text, splitWorkflowBeats(chunk.audioScript));
        if (!validation.ok) {
            showMessage(`Phần ${index + 1} chưa hợp lệ — xem lỗi bên dưới, chưa cập nhật beat`, 'error');
            return;
        }
        await runImport(index, text);
    }, [pastingIndex, importingIndex, plan, showMessage, runImport]);

    const handleClearChunk = React.useCallback((index: number) => {
        setParts((prev) => {
            const next = [...prev];
            next[index] = '';
            return next;
        });
        setNotices((prev) => {
            const next = { ...prev };
            delete next[index];
            return next;
        });
    }, []);

    const applyDeepseekStatus = React.useCallback((chunks: DeepseekStep2ChunkStatus[] | undefined) => {
        const map: Record<number, DeepseekStep2ChunkStatus> = {};
        (chunks || []).forEach((chunk) => {
            map[chunk.index] = chunk;
        });
        setDeepseekStatus(map);
    }, []);

    // Số phần kỳ vọng của LẦN CHẠY hiện tại (chạy tất cả = số phần; chạy 1 phần = 1).
    // Chỉ cần đủ số này mới coi là "xong" → tránh dừng poll sớm lúc còn enqueue tuần tự.
    // Khi mở lại tab giữa lúc chạy (không bấm nút) thì = 0 → xong khi mọi phần đã ghi
    // trạng thái đều kết thúc.
    const runExpectedRef = React.useRef(0);
    // Đánh dấu instance này đã từng thấy phần đang chạy → chỉ báo "xong" 1 lần, không
    // spam thông báo mỗi lần mở lại tab khi mọi phần đã done từ trước.
    const hadActiveRef = React.useRef(false);

    // Poll trạng thái DeepSeek bước 2. Poll theo TRẠNG THÁI BACKEND (còn phần
    // queued/processing) chứ không chỉ theo cờ deepseekAllRunning — nhờ vậy khi mở lại
    // tab/đổi short video giữa lúc chạy, UI vẫn tự cập nhật realtime tới khi mọi phần xong.
    React.useEffect(() => {
        const sid = Number(shortVideoId || 0);
        if (!sid || plan.chunks.length <= 0) {
            return;
        }

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | null = null;
        const mySeq = statusSeqRef.current + 1;
        statusSeqRef.current = mySeq;

        const poll = async () => {
            if (cancelled) {
                return;
            }
            let st = null;
            try {
                st = await fetchDeepseekStep2Status(sid);
            } catch {
                st = null;
            }
            // Bỏ qua phản hồi nếu effect đã bị hủy HOẶC đã có request mới hơn (chống race).
            if (cancelled || statusSeqRef.current !== mySeq) {
                return;
            }

            if (!st?.success) {
                timer = setTimeout(() => { void poll(); }, 5000);
                return;
            }

            applyDeepseekStatus(st.chunks);
            const total = Number(st.total || 0);
            const terminal = Number(st.done || 0) + Number(st.error || 0);
            const active = Number(st.active || 0);
            const expected = deepseekAllRunning ? Math.max(1, runExpectedRef.current) : 0;
            const allSettled = total >= expected && terminal >= total;
            if (active > 0) {
                hadActiveRef.current = true;
            }

            // Còn 3 nguồn cần tiếp tục poll:
            //  - backend còn phần queued/processing (active > 0), hoặc
            //  - vừa bấm chạy (local) mà chưa enqueue đủ số phần, hoặc
            //  - còn phần đã ghi trạng thái nhưng chưa kết thúc.
            if (active > 0 || (deepseekAllRunning && !allSettled) || (total > 0 && terminal < total)) {
                timer = setTimeout(() => { void poll(); }, 5000);
                return;
            }

            // Báo "xong" khi lần poll này bắt được phần đang chạy, hoặc khi chính tab này
            // vừa bấm chạy (job có thể đã xong trước lần poll đầu).
            const shouldNotify = hadActiveRef.current || deepseekAllRunning;
            setDeepseekAllRunning(false);
            setDeepseekStarting(-1);

            if (shouldNotify) {
                hadActiveRef.current = false;
                if (Number(st.done || 0) > 0) {
                    document.dispatchEvent(new CustomEvent(MANUAL_BEAT_PROMPTS_SAVED_EVENT, {
                        detail: { shortVideoId: sid },
                    }));
                }
                showMessageRef.current(
                    `DeepSeek bước 2: ${st.done || 0} phần xong${Number(st.error || 0) > 0 ? `, ${st.error} phần lỗi` : ''}`,
                    Number(st.error || 0) > 0 ? 'warning' : 'success',
                );
            }
        };

        // Vừa enqueue → chờ 2.5s cho job kịp ghi 'queued'; còn lại (mở lại tab) poll ngay.
        timer = setTimeout(() => { void poll(); }, deepseekAllRunning ? 2500 : 0);

        return () => {
            cancelled = true;
            if (timer) {
                clearTimeout(timer);
            }
        };
    }, [deepseekAllRunning, shortVideoId, plan.chunks.length, applyDeepseekStatus]);

    const enqueueChunk = React.useCallback(async (index: number): Promise<boolean> => {
        const chunk = plan.chunks[index];
        const sid = Number(shortVideoId || 0);
        if (!chunk || !sid || !item.file) {
            return false;
        }
        const context = getFreshContext
            ? await getFreshContext(chunk, plan.totalBeats)
            : chunk.context;
        const prompt = await fetchWorkflowPromptText(workflowKey, item.file, context);
        if (!prompt.ok) {
            showMessage(prompt.message || 'Không tải được prompt cho phần này', 'error');
            return false;
        }
        const res = await startDeepseekStep2Chunk({
            shortVideoId: sid,
            index,
            startOrder: chunk.beatStart,
            beatCount: chunk.beatCount,
            prompt: prompt.text,
        });
        if (!res?.success) {
            showMessage(readApiMessage(res, 'Không đưa được phần này vào hàng đợi DeepSeek'), 'error');
            return false;
        }
        return true;
    }, [plan, shortVideoId, item.file, workflowKey, showMessage, getFreshContext]);

    const runChunkDeepseek = React.useCallback(async (index: number) => {
        if (deepseekStarting >= 0 || deepseekAllRunning) {
            return;
        }
        setDeepseekStarting(index);
        try {
            const ok = await enqueueChunk(index);
            if (ok) {
                showMessage(`Đã chạy DeepSeek cho phần ${index + 1} — chờ trong giây lát…`, 'success');
                // Bật cờ để effect poll tự chạy; effect tự tắt khi phần này xong.
                runExpectedRef.current = 1;
                setDeepseekAllRunning(true);
            }
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không chạy được DeepSeek', 'error');
        } finally {
            setDeepseekStarting(-1);
        }
    }, [deepseekStarting, deepseekAllRunning, enqueueChunk, showMessage]);

    const runAllDeepseek = React.useCallback(async () => {
        if (deepseekAllRunning || deepseekStarting >= 0) {
            return;
        }
        if (!item.file) {
            showMessage('Prompt này không có file', 'error');
            return;
        }
        runExpectedRef.current = plan.chunks.length;
        setDeepseekAllRunning(true);
        let queued = 0;
        try {
            for (const chunk of plan.chunks) {
                // eslint-disable-next-line no-await-in-loop
                const ok = await enqueueChunk(chunk.index);
                if (ok) {
                    queued += 1;
                }
            }
        } catch (err) {
            showMessage(err instanceof Error ? err.message : 'Không chạy được DeepSeek', 'error');
        }
        if (queued > 0) {
            showMessage(`Đã đưa ${queued}/${plan.chunks.length} phần vào hàng đợi DeepSeek (mỗi phần 1 luồng chat)`, 'success');
            // Enqueue thiếu phần (một số phần lỗi) → tắt cờ "đang chạy" để poll chỉ theo
            // trạng thái backend còn lại, tránh poll mãi vì không bao giờ đủ số phần kỳ vọng.
            if (queued < plan.chunks.length) {
                setDeepseekAllRunning(false);
            }
        } else {
            setDeepseekAllRunning(false);
        }
    }, [deepseekAllRunning, deepseekStarting, item.file, plan, enqueueChunk, showMessage]);

    const busy = copyingIndex >= 0 || pastingIndex >= 0 || importingIndex >= 0;

    return (
        <Box
            sx={{
                width: '100%',
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                p: 1.25,
                bgcolor: 'action.hover',
            }}
        >
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                Chia {plan.chunks.length} phần · tối đa {plan.size} beat/lần · tổng {plan.totalBeats} beat
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                Copy prompt từng phần → chạy AI → dán kết quả bằng nút Paste. Phần hợp lệ sẽ được cập nhật
                thẳng vào các beat của clip.
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    disabled={busy || deepseekAllRunning || !item.exists}
                    startIcon={
                        deepseekAllRunning
                            ? <CircularProgress size={12} color="inherit" />
                            : <SmartToyOutlinedIcon fontSize="small" />
                    }
                    onClick={() => { void runAllDeepseek(); }}
                    sx={{ textTransform: 'none' }}
                >
                    {deepseekAllRunning ? 'DeepSeek đang chạy…' : 'Chạy DeepSeek tất cả phần'}
                </Button>
                <Typography variant="caption" color="text.secondary">
                    Mỗi phần 1 luồng chat riêng; lỗi sẽ tự gửi lại chatbot để sửa.
                </Typography>
            </Stack>

            <Stack spacing={0.75} sx={{ mt: 1 }}>
                {plan.chunks.map((chunk) => {
                    const isCopying = copyingIndex === chunk.index;
                    const isCopied = copiedIndex === chunk.index;
                    const isPasting = pastingIndex === chunk.index;
                    const isImporting = importingIndex === chunk.index;
                    const validation = validations[chunk.index];
                    const notice = notices[chunk.index];
                    const ds = deepseekStatus[chunk.index];
                    const dsActive = ds?.status === 'queued' || ds?.status === 'processing';
                    const hasContent = String(parts[chunk.index] || '').trim().length > 0;
                    const hasError = hasContent && (!validation.ok || (notice !== undefined && !notice.ok));
                    const displayErrors = [
                        ...(hasContent && !validation.ok ? validation.errors : []),
                        ...(notice !== undefined && !notice.ok ? notice.errors : []),
                    ];

                    const statusColor = !hasContent ? 'default' : hasError ? 'error' : 'success';
                    const statusLabel = !hasContent
                        ? 'Chưa có'
                        : hasError
                            ? `Lỗi · ${displayErrors.length}`
                            : notice?.ok
                                ? `Đã cập nhật beat ${chunk.beatStart}–${chunk.beatEnd}`
                                : `Hợp lệ · ${validation.beatCount} beat`;

                    return (
                        <Box
                            key={chunk.index}
                            sx={{
                                border: '1px solid',
                                borderColor: hasError ? 'error.light' : 'divider',
                                borderRadius: 1.5,
                                px: 1,
                                py: 0.75,
                                bgcolor: 'background.paper',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                                <Typography variant="caption" sx={{ fontWeight: 600, flex: 1, minWidth: 150 }}>
                                    Phần {chunk.index + 1}/{chunk.total} · beat {chunk.beatStart}–{chunk.beatEnd} ({chunk.beatCount} beat)
                                </Typography>
                                <Chip
                                    size="small"
                                    color={statusColor}
                                    variant={hasContent ? 'filled' : 'outlined'}
                                    label={statusLabel}
                                    sx={{ height: 20, fontSize: 11 }}
                                />
                                {ds && (
                                    <Tooltip title={ds.message || ''} placement="top">
                                        <Chip
                                            size="small"
                                            variant="outlined"
                                            color={
                                                ds.status === 'done' ? 'success'
                                                    : ds.status === 'error' ? 'error'
                                                        : ds.status === 'processing' ? 'info'
                                                            : 'default'
                                            }
                                            label={`DeepSeek: ${ds.status || '...'}`}
                                            sx={{ height: 20, fontSize: 11 }}
                                        />
                                    </Tooltip>
                                )}
                                {ds?.chat_url ? (
                                    <Button
                                        size="small"
                                        color="inherit"
                                        href={ds.chat_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        sx={{ textTransform: 'none', minWidth: 0, px: 0.5, fontSize: 11 }}
                                    >
                                        Chat
                                    </Button>
                                ) : null}
                                {(() => {
                                    const copyButton = (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            disabled={Boolean(copyingIndex >= 0) || !item.exists}
                                            startIcon={
                                                isCopying
                                                    ? <CircularProgress size={12} color="inherit" />
                                                    : isCopied
                                                        ? <CheckIcon fontSize="small" />
                                                        : <ContentCopyIcon fontSize="small" />
                                            }
                                            onClick={() => handleCopyChunk(chunk.index)}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            {isCopied ? 'Đã copy' : 'Copy prompt'}
                                        </Button>
                                    );
                                    if (item.exists) {
                                        return copyButton;
                                    }
                                    return (
                                        <Tooltip
                                            title={item.file ? `File prompt chưa tồn tại: ${item.file}` : 'Prompt này không có file'}
                                            placement="top"
                                        >
                                            <span>{copyButton}</span>
                                        </Tooltip>
                                    );
                                })()}
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    disabled={busy || deepseekAllRunning || dsActive || !item.exists}
                                    startIcon={
                                        deepseekStarting === chunk.index
                                            ? <CircularProgress size={12} color="inherit" />
                                            : <SmartToyOutlinedIcon fontSize="small" />
                                    }
                                    onClick={() => { void runChunkDeepseek(chunk.index); }}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Mở DeepSeek
                                </Button>
                                <Button
                                    size="small"
                                    variant={hasContent ? 'outlined' : 'contained'}
                                    disabled={busy}
                                    startIcon={
                                        isPasting
                                            ? <CircularProgress size={12} color="inherit" />
                                            : <ContentPasteIcon fontSize="small" />
                                    }
                                    onClick={() => handlePasteChunk(chunk.index)}
                                    sx={{ textTransform: 'none' }}
                                >
                                    Paste
                                </Button>
                                {hasContent && validation.ok && (
                                    <Tooltip title={`Cập nhật lại prompt vào beat ${chunk.beatStart}–${chunk.beatEnd}`}>
                                        <Button
                                            size="small"
                                            color="success"
                                            variant="outlined"
                                            disabled={busy}
                                            startIcon={
                                                isImporting
                                                    ? <CircularProgress size={12} color="inherit" />
                                                    : <CloudUploadOutlinedIcon fontSize="small" />
                                            }
                                            onClick={() => runImport(chunk.index, parts[chunk.index] || '')}
                                            sx={{ textTransform: 'none' }}
                                        >
                                            Cập nhật beat
                                        </Button>
                                    </Tooltip>
                                )}
                                {hasContent && (
                                    <Tooltip title="Xoá nội dung phần này">
                                        <Button
                                            size="small"
                                            color="inherit"
                                            disabled={busy}
                                            onClick={() => handleClearChunk(chunk.index)}
                                            sx={{ minWidth: 0, px: 0.5 }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </Button>
                                    </Tooltip>
                                )}
                            </Box>

                            {ds?.status === 'error' && ds.message ? (
                                <Box sx={{ mt: 0.5, ml: 0.25 }}>
                                    <Typography variant="caption" color="error.main" sx={{ display: 'block', lineHeight: 1.4 }}>
                                        • {ds.message}
                                    </Typography>
                                </Box>
                            ) : null}

                            {hasContent && !hasError && validation.preview && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 0.25, ml: 0.25, fontStyle: 'italic' }}
                                >
                                    Beat {chunk.beatStart}: “{validation.preview}{validation.preview.length >= 90 ? '…' : ''}”
                                </Typography>
                            )}

                            {hasError && (
                                <Box sx={{ mt: 0.5, ml: 0.25 }}>
                                    {displayErrors.slice(0, 3).map((error, errorIndex) => (
                                        <Typography
                                            key={errorIndex}
                                            variant="caption"
                                            color="error.main"
                                            sx={{ display: 'block', lineHeight: 1.4 }}
                                        >
                                            • {error}
                                        </Typography>
                                    ))}
                                    {displayErrors.length > 3 && (
                                        <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                            … và {displayErrors.length - 3} lỗi nữa
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Stack>

            <Typography variant="caption" color={updatedCount === plan.chunks.length ? 'success.main' : 'text.secondary'} sx={{ display: 'block', mt: 1 }}>
                Đã cập nhật {updatedCount}/{plan.chunks.length} phần vào beat · hợp lệ {validCount}/{plan.chunks.length}
            </Typography>
        </Box>
    );
}
