import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import LandscapeOutlinedIcon from '@mui/icons-material/LandscapeOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import { writePromptTextToClipboard } from 'helpers/marketingShortVideoAgentPrompt';
import {
    importManualBeatPromptFile,
} from './AgentVideo/agentVideoApi';
import {
    copyWorkflowPromptToClipboard,
    fetchWorkflowOutputs,
    getWorkflowContrastTextColor,
    MANUAL_BEAT_PROMPTS_SAVED_EVENT,
    saveWorkflowOutput,
    splitWorkflowStepTitle,
    WORKFLOW_AUDIO_SCRIPT_KEY,
    type WorkflowDefinition,
    type WorkflowOutputsMap,
    type WorkflowPromptContext,
} from 'helpers/marketingWorkflowPrompts';
import {
    parseWorkflowAssetRegister,
    resolveWorkflowResourceKind,
} from 'helpers/marketingWorkflowResourceImport';
import {
    importShortVideoResources,
    parseShortVideoResourceApiMessage,
} from 'helpers/marketingShortVideoResourceApi';

type Props = {
    open: boolean;
    onClose: () => void;
    workflow: WorkflowDefinition | null;
    /** Giá trị thay các key [key] trong prompt khi copy. VD: { topic: title } */
    promptContext?: WorkflowPromptContext;
    /** ID short video hiện tại — load/lưu workflow outputs (key/value theo updateField). */
    shortVideoId?: number;
    /** Audio script hiện tại của post — nút download ở đầu drawer. */
    audioScript?: string;
};

type UpdateDialogState = {
    itemKey: string;
    label: string;
    fieldKey: string;
    /** Loại nút update asset nhanh (buttonUpdate trong index.md): characterUpdate | spaceUpdate. */
    buttonUpdate: string;
};

export default function MarketingWorkflowDrawer({
    open,
    onClose,
    workflow,
    promptContext,
    shortVideoId,
    audioScript,
}: Props) {
    const api = useAjax();
    const [copyingStep, setCopyingStep] = React.useState('');
    const [copiedStep, setCopiedStep] = React.useState('');
    const [outputs, setOutputs] = React.useState<WorkflowOutputsMap>({});
    const [updatingItem, setUpdatingItem] = React.useState<UpdateDialogState | null>(null);
    const [updateValue, setUpdateValue] = React.useState('');
    const [savingUpdate, setSavingUpdate] = React.useState(false);
    const [importingAsset, setImportingAsset] = React.useState(false);
    const [importingBeatPrompts, setImportingBeatPrompts] = React.useState(false);
    const [beatPromptErrors, setBeatPromptErrors] = React.useState<string[]>([]);

    /** buttonUpdate = imagePromptBeatUpdate → update image prompt cho các beat. */
    const isBeatPromptUpdate = Boolean(
        updatingItem
        && String(updatingItem.buttonUpdate || '').trim().toLowerCase() === 'imagepromptbeatupdate',
    );
    const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const outputsLoadedRef = React.useRef<number>(-1);

    React.useEffect(() => {
        if (!open) {
            setCopyingStep('');
            setCopiedStep('');
            setUpdatingItem(null);
            setUpdateValue('');
            setSavingUpdate(false);
            setImportingAsset(false);
            setOutputs({});
            outputsLoadedRef.current = -1;
            return;
        }

        const sid = Number(shortVideoId || 0);
        if (!sid || outputsLoadedRef.current === sid) {
            return;
        }
        outputsLoadedRef.current = sid;
        fetchWorkflowOutputs(sid).then((map) => setOutputs(map || {}));
    }, [open, shortVideoId]);

    React.useEffect(() => {
        return () => {
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
        };
    }, []);

    const workflowOutputs = (workflow && outputs[workflow.key]) || {};

    /** Context thay key khi copy prompt = outputs đã lưu + promptContext (topic...) + audio script hiện tại. */
    const mergedPromptContext = React.useMemo<WorkflowPromptContext>(() => {
        const audioScriptText = String(audioScript || '');
        return {
            ...workflowOutputs,
            ...(promptContext || {}),
            ...(audioScriptText.trim()
                ? { [WORKFLOW_AUDIO_SCRIPT_KEY]: audioScriptText }
                : {}),
        };
    }, [workflowOutputs, promptContext, audioScript]);

    const handleCopy = React.useCallback(async (stepKey: string, file: string) => {
        if (!workflow || !file || copyingStep) {
            return;
        }
        setCopyingStep(stepKey);
        let result: { ok: boolean; message: string };
        try {
            result = await copyWorkflowPromptToClipboard(workflow.key, file, mergedPromptContext);
        } catch {
            result = { ok: false, message: 'Không copy được prompt' };
        }
        setCopyingStep('');
        if (result.ok) {
            setCopiedStep(stepKey);
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
            copiedTimerRef.current = setTimeout(() => setCopiedStep(''), 2000);
        }
        api.showMessage(result.message, result.ok ? 'success' : 'error');
    }, [workflow, copyingStep, mergedPromptContext, api]);

    const handleDownloadAudioScript = React.useCallback(() => {
        const text = String(audioScript || '');
        if (!text.trim()) {
            api.showMessage('Chưa có audio script để tải — hãy sinh/lưu script trước', 'warning');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `short-video-${shortVideoId || 'draft'}-audio-script.txt`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        api.showMessage('Đã tải audio script', 'success');
    }, [audioScript, shortVideoId, api]);

    const openUpdateDialog = React.useCallback((itemKey: string, label: string, fieldKey: string, buttonUpdate = '') => {
        setUpdateValue('');
        setBeatPromptErrors([]);
        setUpdatingItem({ itemKey, label, fieldKey, buttonUpdate });
    }, []);

    const handleCopyOldValue = React.useCallback(async () => {
        if (!updatingItem) {
            return;
        }
        const text = workflowOutputs[updatingItem.fieldKey] || '';
        if (!text.trim()) {
            return;
        }
        const copied = await writePromptTextToClipboard(text);
        api.showMessage(
            copied ? 'Đã copy giá trị cũ' : 'Không copy được — hãy copy thủ công',
            copied ? 'success' : 'error',
        );
    }, [updatingItem, workflowOutputs, api]);

    const handleSaveUpdate = React.useCallback(async () => {
        if (!workflow || !updatingItem || savingUpdate) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không lưu được output', 'warning');
            return;
        }
        setSavingUpdate(true);
        const result = await saveWorkflowOutput(sid, workflow.key, updatingItem.fieldKey, updateValue);
        setSavingUpdate(false);
        if (!result.ok) {
            api.showMessage(result.message || 'Không lưu được output', 'error');
            return;
        }
        if (result.outputs) {
            setOutputs(result.outputs);
        } else {
            setOutputs((prev) => ({
                ...prev,
                [workflow.key]: {
                    ...(prev[workflow.key] || {}),
                    [updatingItem.fieldKey]: updateValue,
                },
            }));
        }
        setUpdatingItem(null);
        api.showMessage(`Đã lưu output [${updatingItem.fieldKey}] — copy prompt sẽ tự thay key`, 'success');
    }, [workflow, updatingItem, savingUpdate, shortVideoId, updateValue, api]);

    /**
     * Import nhanh asset từ dữ liệu output register (CHARACTER/SPACE ASSET REGISTER)
     * vào resource của short video — upsert theo mã định danh, không xóa resource cũ.
     * Ưu tiên parse "Giá trị mới" (textarea), trống thì fallback giá trị đã lưu.
     */
    const handleImportAsset = React.useCallback(async () => {
        if (!updatingItem || importingAsset) {
            return;
        }
        const kind = resolveWorkflowResourceKind(updatingItem.buttonUpdate);
        if (!kind) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không import được resource', 'warning');
            return;
        }

        const savedValue = workflowOutputs[updatingItem.fieldKey] || '';
        const source = updateValue.trim() ? updateValue : savedValue;
        if (!source.trim()) {
            api.showMessage('Chưa có dữ liệu register để import resource', 'warning');
            return;
        }

        const parsed = parseWorkflowAssetRegister(kind, source);
        if (parsed.length === 0) {
            api.showMessage(
                'Không tìm thấy asset nào — dữ liệu cần đúng cấu trúc CHARACTER/SPACE ASSET REGISTER',
                'warning',
            );
            return;
        }

        setImportingAsset(true);
        let result: { success?: boolean; created?: number; updated?: number } | null = null;
        try {
            result = await importShortVideoResources(sid, parsed);
        } catch {
            result = null;
        }
        setImportingAsset(false);

        if (!result?.success) {
            api.showMessage('Import resource thất bại', 'error');
            return;
        }

        const createdCount = Number(result.created || 0);
        const updatedCount = Number(result.updated || 0);
        api.showMessage(
            `Đã import ${createdCount + updatedCount} resource (${createdCount} mới, ${updatedCount} cập nhật) — không xóa resource cũ`,
            'success',
        );
    }, [updatingItem, importingAsset, shortVideoId, updateValue, workflowOutputs, api]);

    /**
     * buttonUpdate: imagePromptBeatUpdate — parse output "BEAT IMAGE PROMPTS"
     * (BEAT BN + SCRIPT SENTENCE / IMAGE PROMPT / NEGATIVE PROMPT…) và import
     * vào đúng vị trí beat của clip (all-or-nothing, validate phía BE).
     * Ưu tiên "Giá trị mới" (textarea), trống thì fallback giá trị đã lưu.
     */
    const handleImportBeatPrompts = React.useCallback(async () => {
        if (!updatingItem || !isBeatPromptUpdate || importingBeatPrompts) {
            return;
        }
        const sid = Number(shortVideoId || 0);
        if (!sid) {
            api.showMessage('Thiếu short_video_id — không update được image prompt', 'warning');
            return;
        }
        const savedValue = workflowOutputs[updatingItem.fieldKey] || '';
        const source = updateValue.trim() ? updateValue : savedValue;
        if (!source.trim()) {
            api.showMessage('Chưa có dữ liệu prompt để update', 'warning');
            return;
        }

        setImportingBeatPrompts(true);
        setBeatPromptErrors([]);
        try {
            const result = await importManualBeatPromptFile(sid, source);
            if (result?.success === false) {
                const errors = Array.isArray(result?.errors) ? result.errors : [];
                if (errors.length) {
                    setBeatPromptErrors(errors);
                    api.showMessage(
                        `Dữ liệu có ${errors.length} lỗi — CHƯA update beat nào (xem chi tiết bên dưới)`,
                        'error',
                    );
                } else {
                    api.showMessage(
                        parseShortVideoResourceApiMessage(result, 'Không update được image prompt'),
                        'error',
                    );
                }
                return;
            }
            const updatedCount = Array.isArray(result?.updated_orders) ? result.updated_orders.length : 0;
            api.showMessage(`Đã update image prompt cho ${updatedCount} beat đúng vị trí`, 'success');
            // Workspace Agent Video reload manual beat marks — "Mở Meta.ai" đọc prompt mới nhất.
            document.dispatchEvent(new CustomEvent(MANUAL_BEAT_PROMPTS_SAVED_EVENT, {
                detail: { shortVideoId: sid },
            }));
            setUpdatingItem(null);
        } catch (err) {
            api.showMessage(err instanceof Error ? err.message : 'Không update được image prompt', 'error');
        } finally {
            setImportingBeatPrompts(false);
        }
    }, [updatingItem, isBeatPromptUpdate, importingBeatPrompts, shortVideoId, updateValue, workflowOutputs, api]);

    const accent = workflow?.background || '';
    const accentText = accent ? getWorkflowContrastTextColor(accent) : '#ffffff';
    const oldValue = updatingItem ? (workflowOutputs[updatingItem.fieldKey] || '') : '';

    return (
        <DrawerCustom
            activeOnClose
            open={open}
            onClose={onClose}
            width={560}
            title={workflow ? `Workflow: ${workflow.title}` : 'Workflow'}
        >
            {!workflow ? null : (
                <Box sx={{ pb: 2 }}>
                    {accent && (
                        <Box
                            sx={{
                                px: 1.5,
                                py: 1.25,
                                mt: 1.5,
                                borderRadius: 2,
                                bgcolor: accent,
                                color: accentText,
                                mb: 1.5,
                            }}
                        >
                            <Typography sx={{ fontWeight: 700, color: accentText, fontSize: 15 }}>
                                {workflow.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: accentText, opacity: 0.85, display: 'block', mt: 0.25 }}>
                                {workflow.steps.length} bước · Copy prompt tự thay [topic], [audio-script] và các key output đã lưu
                            </Typography>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<DownloadOutlinedIcon fontSize="small" />}
                            onClick={handleDownloadAudioScript}
                            sx={{ textTransform: 'none' }}
                        >
                            Download audio script
                        </Button>
                    </Box>

                    {workflow.steps.length === 0 && (
                        <Alert severity="info">Workflow chưa có bước nào — thêm bước vào index.md của thư mục workflow.</Alert>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                        {workflow.steps.map((step, index) => {
                            const { number, label } = splitWorkflowStepTitle(step.title, index + 1);
                            const stepKey = String(index);
                            const isCopying = copyingStep === stepKey;
                            const isCopied = copiedStep === stepKey;

                            return (
                                <Box
                                    key={stepKey}
                                    sx={{
                                        display: 'flex',
                                        gap: 1.25,
                                        p: 1.5,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 2,
                                        bgcolor: 'background.paper',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 28,
                                            height: 28,
                                            flexShrink: 0,
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            bgcolor: accent || 'primary.main',
                                            color: accentText,
                                            fontWeight: 700,
                                            fontSize: 13,
                                        }}
                                    >
                                        {number}
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
                                            {label || step.title}
                                        </Typography>

                                        {step.description.length > 0 && (
                                            <Box component="ul" sx={{ m: 0, mt: 0.75, p: 0, listStyle: 'none' }}>
                                                {step.description.map((item, itemIndex) => (
                                                    <Box
                                                        component="li"
                                                        key={itemIndex}
                                                        sx={{ display: 'flex', gap: 0.75, mb: 0.5, alignItems: 'flex-start' }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 5,
                                                                height: 5,
                                                                flexShrink: 0,
                                                                borderRadius: '50%',
                                                                bgcolor: 'text.disabled',
                                                                mt: '7px',
                                                            }}
                                                        />
                                                        <Typography
                                                            variant="body2"
                                                            component="div"
                                                            color="text.secondary"
                                                            sx={{
                                                                lineHeight: 1.5,
                                                                '& a': { color: 'link' },
                                                                '& b, & strong': { fontWeight: 600 },
                                                                '& code': {
                                                                    px: 0.5,
                                                                    borderRadius: 0.5,
                                                                    bgcolor: 'action.hover',
                                                                    fontFamily: 'monospace',
                                                                    fontSize: '0.9em',
                                                                },
                                                                '& img': { maxWidth: '100%' },
                                                            }}
                                                            dangerouslySetInnerHTML={{ __html: item }}
                                                        />
                                                    </Box>
                                                ))}
                                            </Box>
                                        )}

                                        {step.result && (
                                            <Stack
                                                direction="row"
                                                spacing={0.5}
                                                alignItems="center"
                                                sx={{ mt: 0.75 }}
                                            >
                                                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 500 }}>
                                                    Kết quả: {step.result}
                                                </Typography>
                                            </Stack>
                                        )}

                                        

                                        {(step.prompts.length > 0 || step.prompt) && (
                                            <Box
                                                sx={{
                                                    mt: 1.25,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'flex-start',
                                                    gap: 0.75,
                                                }}
                                            >
                                                {step.prompts.map((promptItem, promptIndex) => {
                                                    const itemKey = `${stepKey}:p${promptIndex}`;
                                                    const itemCopying = copyingStep === itemKey;
                                                    const itemCopied = copiedStep === itemKey;

                                                    const button = (
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            disabled={Boolean(copyingStep) || !promptItem.exists}
                                                            startIcon={
                                                                itemCopying
                                                                    ? <CircularProgress size={12} color="inherit" />
                                                                    : itemCopied
                                                                        ? <CheckIcon fontSize="small" />
                                                                        : <ContentCopyIcon fontSize="small" />
                                                            }
                                                            onClick={() => handleCopy(itemKey, promptItem.file)}
                                                            sx={{ textTransform: 'none' }}
                                                        >
                                                            {itemCopied ? 'Đã copy' : promptItem.label}
                                                        </Button>
                                                    );

                                                    const hasSavedOutput = Boolean(
                                                        (workflowOutputs[promptItem.updateField] || '').trim(),
                                                    );
                                                    const updateButton = promptItem.updateField ? (
                                                        <Tooltip
                                                            title={
                                                                hasSavedOutput
                                                                    ? `Đã có output [${promptItem.updateField}] — bấm để xem/cập nhật`
                                                                    : `Cập nhật output [${promptItem.updateField}] — lưu vào short video, tự thay key khi copy prompt`
                                                            }
                                                            placement="top"
                                                        >
                                                            <IconButton
                                                                size="small"
                                                                color={hasSavedOutput ? 'success' : 'default'}
                                                                onClick={() => openUpdateDialog(itemKey, promptItem.label, promptItem.updateField, promptItem.buttonUpdate)}
                                                            >
                                                                <CloudUploadOutlinedIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    ) : null;

                                                    const row = promptItem.exists
                                                        ? button
                                                        : (
                                                            <Tooltip
                                                                title={promptItem.file ? `File prompt chưa tồn tại: ${promptItem.file}` : 'Prompt này không có file'}
                                                                placement="top"
                                                            >
                                                                <span>{button}</span>
                                                            </Tooltip>
                                                        );

                                                    return (
                                                        <Box key={itemKey} sx={{ minWidth: 0 }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                                                {row}
                                                                {updateButton}
                                                            </Box>
                                                            {promptItem.note && (
                                                                <Typography
                                                                    variant="caption"
                                                                    component="div"
                                                                    color="text.secondary"
                                                                    sx={{
                                                                        mt: 0.25,
                                                                        ml: 0.25,
                                                                        lineHeight: 1.4,
                                                                        '& a': { color: 'link' },
                                                                        '& b, & strong': { fontWeight: 600 },
                                                                        '& code': {
                                                                            px: 0.5,
                                                                            borderRadius: 0.5,
                                                                            bgcolor: 'action.hover',
                                                                            fontFamily: 'monospace',
                                                                            fontSize: '0.9em',
                                                                        },
                                                                    }}
                                                                    dangerouslySetInnerHTML={{ __html: promptItem.note }}
                                                                />
                                                            )}
                                                        </Box>
                                                    );
                                                })}

                                                {step.prompt && (
                                                    (() => {
                                                        const button = (
                                                            <Button
                                                                size="small"
                                                                variant="outlined"
                                                                disabled={Boolean(copyingStep) || !step.promptExists}
                                                                startIcon={
                                                                    isCopying
                                                                        ? <CircularProgress size={12} color="inherit" />
                                                                        : isCopied
                                                                            ? <CheckIcon fontSize="small" />
                                                                            : <ContentCopyIcon fontSize="small" />
                                                                }
                                                                onClick={() => handleCopy(stepKey, step.prompt)}
                                                                sx={{ textTransform: 'none' }}
                                                            >
                                                                {isCopied ? 'Đã copy' : 'Copy prompt'}
                                                            </Button>
                                                        );

                                                        if (step.promptExists) {
                                                            return button;
                                                        }

                                                        return (
                                                            <Tooltip title={`File prompt chưa tồn tại: ${step.prompt}`} placement="top">
                                                                <span>{button}</span>
                                                            </Tooltip>
                                                        );
                                                    })()
                                                )}
                                            </Box>
                                        )}


{step.note && (
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    gap: 0.75,
                                                    alignItems: 'flex-start',
                                                    mt: 1,
                                                    px: 1,
                                                    py: 0.75,
                                                    borderRadius: 1,
                                                    bgcolor: 'rgba(255, 152, 0, 0.1)',
                                                }}
                                            >
                                                <TipsAndUpdatesOutlinedIcon sx={{ fontSize: 15, color: 'warning.dark', mt: '2px' }} />
                                                <Typography
                                                    variant="body2"
                                                    component="div"
                                                    sx={{
                                                        color: 'text.secondary',
                                                        lineHeight: 1.5,
                                                        '& a': { color: 'link' },
                                                        '& b, & strong': { fontWeight: 600 },
                                                        '& code': {
                                                            px: 0.5,
                                                            borderRadius: 0.5,
                                                            bgcolor: 'action.hover',
                                                            fontFamily: 'monospace',
                                                            fontSize: '0.9em',
                                                        },
                                                        '& img': { maxWidth: '100%' },
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: step.note }}
                                                />
                                            </Box>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}

            <Dialog
                open={Boolean(updatingItem)}
                onClose={() => {
                    if (!savingUpdate) {
                        setUpdatingItem(null);
                    }
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle sx={{ fontSize: 16 }}>
                    {updatingItem ? `Cập nhật output: ${updatingItem.label}` : 'Cập nhật output'}
                </DialogTitle>
                <DialogContent>
                    {updatingItem && (
                        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                Giá trị lưu theo key <code>[{updatingItem.fieldKey}]</code> vào short video — copy prompt sau đó tự thay key này bằng giá trị đã lưu.
                            </Typography>

                            {Boolean(oldValue.trim()) && (
                                <Box
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                        bgcolor: 'action.hover',
                                        position: 'relative',
                                    }}
                                >
                                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                        Giá trị đã lưu
                                    </Typography>
                                    <IconButton size="small" onClick={handleCopyOldValue} sx={{ position: 'absolute', top: 4, right: 4 }}>
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                    <Box
                                        component="pre"
                                        sx={{
                                            m: 0,
                                            mt: 0.5,
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            fontSize: 12,
                                            lineHeight: 1.5,
                                            maxHeight: 180,
                                            overflowY: 'auto',
                                        }}
                                    >
                                        {oldValue}
                                    </Box>
                                </Box>
                            )}

                            <TextField
                                label="Giá trị mới (paste từ chat AI)"
                                size="small"
                                multiline
                                minRows={5}
                                fullWidth
                                value={updateValue}
                                onChange={(event) => setUpdateValue(event.target.value)}
                            />

                            {updatingItem && resolveWorkflowResourceKind(updatingItem.buttonUpdate)
                                && Boolean((updateValue.trim() || oldValue).trim()) ? (
                                <Box
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        startIcon={
                                            importingAsset ? (
                                                <CircularProgress size={12} color="inherit" />
                                            ) : resolveWorkflowResourceKind(updatingItem.buttonUpdate) === 'character' ? (
                                                <PersonAddAltOutlinedIcon fontSize="small" />
                                            ) : (
                                                <LandscapeOutlinedIcon fontSize="small" />
                                            )
                                        }
                                        onClick={handleImportAsset}
                                        disabled={importingAsset || savingUpdate}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        {resolveWorkflowResourceKind(updatingItem.buttonUpdate) === 'character'
                                            ? 'Update resource nhân vật'
                                            : 'Update resource không gian'}
                                    </Button>
                                     <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 180 }}>
                                        Import nhanh asset từ dữ liệu trên vào resource của short video
                                        (trùng mã định danh → cập nhật, không xóa resource cũ).
                                    </Typography>
                                </Box>
                            ) : null}

                            {isBeatPromptUpdate && Boolean((updateValue.trim() || oldValue).trim()) ? (
                                <Box
                                    sx={{
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        borderRadius: 1,
                                        p: 1,
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="warning"
                                        startIcon={
                                            importingBeatPrompts
                                                ? <CircularProgress size={12} color="inherit" />
                                                : <ImageOutlinedIcon fontSize="small" />
                                        }
                                        onClick={handleImportBeatPrompts}
                                        disabled={importingBeatPrompts || savingUpdate}
                                        sx={{ textTransform: 'none' }}
                                    >
                                        Update image prompt cho beat
                                    </Button>
                                    <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 180 }}>
                                        Import prompt vào đúng vị trí beat của clip (beat N trong file → beat N của clip,
                                        all-or-nothing — có lỗi thì không beat nào được update).
                                    </Typography>
                                    {beatPromptErrors.length > 0 && (
                                        <Box
                                            sx={{
                                                width: '100%',
                                                maxHeight: 180,
                                                overflowY: 'auto',
                                                borderRadius: 1,
                                                border: '1px solid',
                                                borderColor: 'error.light',
                                                bgcolor: 'error.lighter',
                                                p: 1,
                                            }}
                                        >
                                            {beatPromptErrors.map((errorItem, errorIndex) => (
                                                <Typography
                                                    key={errorIndex}
                                                    variant="caption"
                                                    color="error.dark"
                                                    sx={{ display: 'block', lineHeight: 1.5 }}
                                                >
                                                    • {errorItem}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            ) : null}
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button size="small" onClick={() => setUpdatingItem(null)} disabled={savingUpdate} sx={{ textTransform: 'none' }}>
                        Hủy
                    </Button>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={handleSaveUpdate}
                        disabled={savingUpdate}
                        startIcon={savingUpdate ? <CircularProgress size={12} color="inherit" /> : undefined}
                        sx={{ textTransform: 'none' }}
                    >
                        Lưu output
                    </Button>
                </DialogActions>
            </Dialog>
        </DrawerCustom>
    );
}
