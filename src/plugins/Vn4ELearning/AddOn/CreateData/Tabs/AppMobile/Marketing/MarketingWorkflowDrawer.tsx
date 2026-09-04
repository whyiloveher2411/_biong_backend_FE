import React from 'react';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Stack,
    Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import useAjax from 'hook/useApi';
import {
    copyWorkflowPromptToClipboard,
    getWorkflowContrastTextColor,
    splitWorkflowStepTitle,
    type WorkflowDefinition,
} from 'helpers/marketingWorkflowPrompts';

type Props = {
    open: boolean;
    onClose: () => void;
    workflow: WorkflowDefinition | null;
};

export default function MarketingWorkflowDrawer({ open, onClose, workflow }: Props) {
    const api = useAjax();
    const [copyingStep, setCopyingStep] = React.useState('');
    const [copiedStep, setCopiedStep] = React.useState('');
    const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        if (!open) {
            setCopyingStep('');
            setCopiedStep('');
        }
    }, [open]);

    React.useEffect(() => {
        return () => {
            if (copiedTimerRef.current) {
                clearTimeout(copiedTimerRef.current);
            }
        };
    }, []);

    const handleCopy = React.useCallback(async (stepKey: string, file: string) => {
        if (!workflow || !file || copyingStep) {
            return;
        }
        setCopyingStep(stepKey);
        let result: { ok: boolean; message: string };
        try {
            result = await copyWorkflowPromptToClipboard(workflow.key, file);
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
    }, [workflow, copyingStep, api]);

    const accent = workflow?.background || '';
    const accentText = accent ? getWorkflowContrastTextColor(accent) : '#ffffff';

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
                                mb: 2,
                            }}
                        >
                            <Typography sx={{ fontWeight: 700, color: accentText, fontSize: 15 }}>
                                {workflow.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: accentText, opacity: 0.85, display: 'block', mt: 0.25 }}>
                                {workflow.steps.length} bước · Bấm "Copy prompt" ở mỗi bước để copy prompt vào clipboard
                            </Typography>
                        </Box>
                    )}

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
                                                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                                                            {item}
                                                        </Typography>
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
                                                <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                                                    {step.note}
                                                </Typography>
                                            </Box>
                                        )}

                                        {step.prompt && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={Boolean(copyingStep)}
                                                startIcon={
                                                    isCopying
                                                        ? <CircularProgress size={12} color="inherit" />
                                                        : isCopied
                                                            ? <CheckIcon fontSize="small" />
                                                            : <ContentCopyIcon fontSize="small" />
                                                }
                                                onClick={() => handleCopy(stepKey, step.prompt)}
                                                sx={{ textTransform: 'none', mt: 1 }}
                                            >
                                                {isCopied ? 'Đã copy' : 'Copy prompt'}
                                            </Button>
                                        )}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}
        </DrawerCustom>
    );
}
