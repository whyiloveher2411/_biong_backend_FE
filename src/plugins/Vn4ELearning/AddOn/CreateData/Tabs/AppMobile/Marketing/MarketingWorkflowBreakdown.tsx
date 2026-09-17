import React from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CloseIcon from '@mui/icons-material/Close';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import {
    copyWorkflowPromptToClipboard,
    MANUAL_BEAT_PROMPTS_SAVED_EVENT,
    splitWorkflowBeats,
    splitWorkflowOutputIntoParts,
    validateWorkflowBreakdownPart,
    type WorkflowBreakdownPartValidation,
    type WorkflowBreakdownPlan,
    type WorkflowPromptItem,
} from 'helpers/marketingWorkflowPrompts';
import { importManualBeatPromptFile } from './AgentVideo/agentVideoApi';

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
            result = await copyWorkflowPromptToClipboard(workflowKey, item.file, chunk.context);
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
    }, [plan, copyingIndex, workflowKey, item.file, showMessage]);

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

            <Stack spacing={0.75} sx={{ mt: 1 }}>
                {plan.chunks.map((chunk) => {
                    const isCopying = copyingIndex === chunk.index;
                    const isCopied = copiedIndex === chunk.index;
                    const isPasting = pastingIndex === chunk.index;
                    const isImporting = importingIndex === chunk.index;
                    const validation = validations[chunk.index];
                    const notice = notices[chunk.index];
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
