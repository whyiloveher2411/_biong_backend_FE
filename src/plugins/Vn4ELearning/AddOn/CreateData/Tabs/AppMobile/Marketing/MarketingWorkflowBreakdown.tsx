import React from 'react';
import { Box, Button, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CloseIcon from '@mui/icons-material/Close';
import MergeTypeIcon from '@mui/icons-material/MergeType';
import {
    copyWorkflowPromptToClipboard,
    joinWorkflowBreakdownParts,
    splitWorkflowBeats,
    splitWorkflowOutputIntoParts,
    validateWorkflowBreakdownPart,
    type WorkflowBreakdownPartValidation,
    type WorkflowBreakdownPlan,
    type WorkflowPromptItem,
} from 'helpers/marketingWorkflowPrompts';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';

type Props = {
    workflowKey: string;
    item: WorkflowPromptItem;
    plan: WorkflowBreakdownPlan;
    /** Output đã lưu theo updateField — dùng để prefill lại từng phần khi mở lại. */
    savedValue: string;
    showMessage: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
    /** Mở dialog update output với "input tổng" đã nối sẵn (null khi thiếu updateField). */
    onRequestUpdate: ((total: string) => void) | null;
};

/**
 * scriptBreakdown > 0: KHÔNG hiển thị nội dung prompt (quá dài) — mỗi phần chỉ có
 * button Copy prompt + button Paste kết quả từ clipboard. Nội dung dán được validate
 * (đủ beat, đúng audio, đủ section, không trùng prompt) trước khi tự gộp thành input tổng.
 */
export default function MarketingWorkflowBreakdown({
    workflowKey,
    item,
    plan,
    savedValue,
    showMessage,
    onRequestUpdate,
}: Props) {
    const beatCountsKey = plan.beatCounts.join(',');
    const [parts, setParts] = React.useState<string[]>(
        () => splitWorkflowOutputIntoParts(savedValue, plan.beatCounts),
    );
    const [copyingIndex, setCopyingIndex] = React.useState(-1);
    const [copiedIndex, setCopiedIndex] = React.useState(-1);
    const [pastingIndex, setPastingIndex] = React.useState(-1);
    const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setParts(splitWorkflowOutputIntoParts(savedValue, plan.beatCounts));
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

    const filledCount = parts.filter((part) => String(part || '').trim().length > 0).length;
    const validCount = validations.filter((validation) => validation.ok).length;
    const allValid = validations.length === plan.chunks.length && validCount === plan.chunks.length;
    const total = allValid ? joinWorkflowBreakdownParts(parts) : '';

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

    const handlePasteChunk = React.useCallback(async (index: number) => {
        if (pastingIndex >= 0) {
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
        setParts((prev) => {
            const next = [...prev];
            next[index] = text;
            return next;
        });
        showMessage(`Đã dán nội dung phần ${index + 1} — đang kiểm tra`, 'success');
    }, [pastingIndex, showMessage]);

    const handleClearChunk = React.useCallback((index: number) => {
        setParts((prev) => {
            const next = [...prev];
            next[index] = '';
            return next;
        });
    }, []);

    const handleCopyTotal = React.useCallback(async () => {
        const copied = await writePromptTextToClipboard(total);
        showMessage(
            copied ? 'Đã copy input tổng' : 'Không copy được — hãy copy thủ công',
            copied ? 'success' : 'error',
        );
    }, [total, showMessage]);

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
                Copy prompt từng phần → chạy AI → dán kết quả bằng nút Paste. Đủ {plan.chunks.length} phần hợp lệ
                thì tự gộp thành input tổng.
            </Typography>

            <Stack spacing={0.75} sx={{ mt: 1 }}>
                {plan.chunks.map((chunk) => {
                    const isCopying = copyingIndex === chunk.index;
                    const isCopied = copiedIndex === chunk.index;
                    const isPasting = pastingIndex === chunk.index;
                    const validation = validations[chunk.index];
                    const hasContent = String(parts[chunk.index] || '').trim().length > 0;
                    const statusColor = !hasContent ? 'default' : validation.ok ? 'success' : 'error';
                    const statusLabel = !hasContent
                        ? 'Chưa có'
                        : validation.ok
                            ? `Hợp lệ · ${validation.beatCount} beat`
                            : `Lỗi · ${validation.errors.length}`;

                    return (
                        <Box
                            key={chunk.index}
                            sx={{
                                border: '1px solid',
                                borderColor: hasContent && !validation.ok ? 'error.light' : 'divider',
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
                                            disabled={copyingIndex >= 0 || !item.exists}
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
                                    disabled={pastingIndex >= 0}
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
                                {hasContent && (
                                    <Tooltip title="Xoá nội dung phần này">
                                        <Button
                                            size="small"
                                            color="inherit"
                                            onClick={() => handleClearChunk(chunk.index)}
                                            sx={{ minWidth: 0, px: 0.5 }}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </Button>
                                    </Tooltip>
                                )}
                            </Box>

                            {hasContent && validation.ok && validation.preview && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block', mt: 0.25, ml: 0.25, fontStyle: 'italic' }}
                                >
                                    Beat {chunk.beatStart}: “{validation.preview}{validation.preview.length >= 90 ? '…' : ''}”
                                </Typography>
                            )}

                            {hasContent && !validation.ok && (
                                <Box sx={{ mt: 0.5, ml: 0.25 }}>
                                    {validation.errors.slice(0, 3).map((error, errorIndex) => (
                                        <Typography
                                            key={errorIndex}
                                            variant="caption"
                                            color="error.main"
                                            sx={{ display: 'block', lineHeight: 1.4 }}
                                        >
                                            • {error}
                                        </Typography>
                                    ))}
                                    {validation.errors.length > 3 && (
                                        <Typography variant="caption" color="error.main" sx={{ display: 'block' }}>
                                            … và {validation.errors.length - 3} lỗi nữa
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    );
                })}
            </Stack>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                <Typography variant="caption" color={allValid ? 'success.main' : 'text.secondary'} sx={{ flex: 1, minWidth: 140 }}>
                    {allValid
                        ? `Đủ ${plan.chunks.length}/${plan.chunks.length} phần hợp lệ · input tổng ${plan.totalBeats} beat đã sẵn sàng`
                        : `Hợp lệ ${validCount}/${plan.chunks.length} phần (đã có ${filledCount})`}
                </Typography>
                <Button
                    size="small"
                    variant="text"
                    onClick={handleCopyTotal}
                    disabled={!total}
                    sx={{ textTransform: 'none' }}
                >
                    Copy input tổng
                </Button>
                {onRequestUpdate && (
                    <Tooltip
                        title={allValid ? '' : 'Cần đủ tất cả các phần hợp lệ trước khi gộp input tổng'}
                        placement="top"
                    >
                        <span>
                            <Button
                                size="small"
                                variant="contained"
                                startIcon={<MergeTypeIcon fontSize="small" />}
                                disabled={!allValid}
                                onClick={() => onRequestUpdate(total)}
                                sx={{ textTransform: 'none' }}
                            >
                                Gộp {plan.chunks.length} phần → cập nhật input tổng
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </Box>
        </Box>
    );
}
