import React from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    LinearProgress,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import useAjax from 'hook/useApi';
import type { StyleOptionsState } from './NotificationStylePicker';
import { styleOptionsToApiPayload } from './notificationContentStyles';

const PROVIDER_LABELS: Record<'gemini' | 'deepseek', string> = {
    gemini: 'Gemini',
    deepseek: 'DeepSeek',
};

export type NotificationMessageVariant = {
    title: Record<string, string>;
    body: Record<string, string>;
};

export type NotificationAiGeneratePayload = {
    success?: boolean;
    messages?: NotificationMessageVariant[];
    warnings?: string[];
    message?: { content?: string } | string;
};

type Props = {
    postId: number;
    promptReady: boolean;
    styleOptions: StyleOptionsState;
    messageCount: number;
    disabled?: boolean;
    onSuccess: (res: NotificationAiGeneratePayload) => void;
    onError?: (message: string) => void;
};

function extractApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Gọi AI thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message?.content) return r.message.content;
    return 'Gọi AI thất bại';
}

export default function NotificationAiLlmButtons({
    postId,
    promptReady,
    styleOptions,
    messageCount,
    disabled = false,
    onSuccess,
    onError,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [aiLoading, setAiLoading] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [confirmProvider, setConfirmProvider] = React.useState<'gemini' | 'deepseek' | null>(null);
    const [statusAlert, setStatusAlert] = React.useState<{
        severity: 'info' | 'success' | 'error' | 'warning';
        text: string;
    } | null>(null);

    const runProvider = (provider: 'gemini' | 'deepseek') => {
        if (!postId || !promptReady || aiLoading) return;

        setAiLoading(provider);
        const label = PROVIDER_LABELS[provider];
        setStatusAlert({
            severity: 'info',
            text: `Đang gọi ${label}…`,
        });

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/local-notification-ai/generate',
            method: 'POST',
            data: {
                post_id: postId,
                ai_provider: provider,
                ...styleOptionsToApiPayload(styleOptions, messageCount),
            },
            loading: false,
            success: (res: NotificationAiGeneratePayload) => {
                setAiLoading(null);
                if (!res?.success) {
                    const msg = extractApiMessage(res);
                    setStatusAlert({ severity: 'error', text: msg });
                    onError?.(msg);
                    return;
                }
                let successText = `Đã sinh nội dung bằng ${label}`;
                if (res.warnings?.length) {
                    successText += ` (${res.warnings.length} cảnh báo)`;
                }
                setStatusAlert({ severity: 'success', text: successText });
                onSuccess(res);
            },
            error: (err: unknown) => {
                setAiLoading(null);
                const msg = extractApiMessage(err);
                setStatusAlert({ severity: 'error', text: msg });
                onError?.(msg);
            },
        });
    };

    const handleConfirm = () => {
        if (!confirmProvider) return;
        const provider = confirmProvider;
        setConfirmProvider(null);
        runProvider(provider);
    };

    const busy = aiLoading !== null;
    const buttonsDisabled = disabled || !promptReady || busy;
    const confirmLabel = confirmProvider ? PROVIDER_LABELS[confirmProvider] : '';

    return (
        <Box sx={{ width: '100%' }}>
            {busy && <LinearProgress sx={{ mb: 1 }} />}
            {statusAlert && (
                <Alert severity={statusAlert.severity} onClose={() => setStatusAlert(null)} sx={{ mb: 1 }}>
                    {statusAlert.text}
                </Alert>
            )}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <LoadingButton
                    variant="contained"
                    color="secondary"
                    size="small"
                    disabled={buttonsDisabled}
                    loading={aiLoading === 'gemini'}
                    onClick={() => setConfirmProvider('gemini')}
                >
                    Dùng Gemini
                </LoadingButton>
                <LoadingButton
                    variant="outlined"
                    size="small"
                    disabled={buttonsDisabled}
                    loading={aiLoading === 'deepseek'}
                    onClick={() => setConfirmProvider('deepseek')}
                >
                    Dùng DeepSeek
                </LoadingButton>
            </Box>

            <Dialog
                open={confirmProvider !== null}
                onClose={() => !busy && setConfirmProvider(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Xác nhận gọi API {confirmLabel}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Bạn sắp gọi API <strong>{confirmLabel}</strong> để sinh nội dung notification.
                        Mỗi lần chạy đều <strong>tốn chi phí</strong> theo bảng giá nhà cung cấp.
                        Kết quả chỉ áp dụng vào form khi bạn bấm <strong>Áp dụng vào Message</strong>.
                        <br />
                        <br />
                        Bạn có chắc muốn tiếp tục?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmProvider(null)} disabled={busy}>
                        Hủy
                    </Button>
                    <LoadingButton variant="contained" color="primary" onClick={handleConfirm} loading={busy}>
                        Xác nhận, gọi API
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
