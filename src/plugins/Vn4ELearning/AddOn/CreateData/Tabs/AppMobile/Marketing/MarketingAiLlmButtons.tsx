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
import { getAccessToken } from 'store/user/user.reducers';

export type MarketingAiLlmSuccessPayload = {
    pipeline?: Record<string, unknown>;
    post?: Record<string, unknown>;
    normalized?: { content_text?: string; success?: boolean };
    angles_pick_hint?: boolean;
    stage?: string;
};

type Props = {
    postId: number;
    stage: string;
    stageLabel?: string;
    contentType?: string;
    promptReady: boolean;
    platform?: string;
    distributionStage?: string;
    editorialSubstage?: string;
    editorialActiveVersion?: string;
    disabled?: boolean;
    onSuccess: (res: MarketingAiLlmSuccessPayload) => void;
    onError?: (message: string) => void;
    children?: React.ReactNode;
};

const PROVIDER_LABELS: Record<'gemini' | 'deepseek', string> = {
    gemini: 'Gemini',
    deepseek: 'DeepSeek',
};

function formatTimeVi(d: Date): string {
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function extractApiMessage(res: unknown): string {
    if (!res || typeof res !== 'object') return 'Gọi AI thất bại';
    const r = res as { message?: { content?: string } | string };
    if (typeof r.message === 'string') return r.message;
    if (r.message?.content) return r.message.content;
    return 'Gọi AI thất bại';
}

export default function MarketingAiLlmButtons({
    postId,
    stage,
    stageLabel = '',
    promptReady,
    platform = '',
    distributionStage = '',
    editorialSubstage = '',
    editorialActiveVersion = '',
    disabled = false,
    onSuccess,
    onError,
    children,
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
        if (!postId || !stage || !promptReady || aiLoading) return;

        setAiLoading(provider);
        const label = PROVIDER_LABELS[provider];
        setStatusAlert({
            severity: 'info',
            text: `Đang gọi ${label}… (bước Writer có thể mất 1–3 phút)`,
        });

        const data: Record<string, string | number> = {
            post_id: postId,
            stage,
            ai_provider: provider,
            access_token: getAccessToken() || '',
        };
        if (platform) data.platform = platform;
        if (distributionStage) data.distribution_stage = distributionStage;
        if (editorialSubstage) data.editorial_substage = editorialSubstage;
        if (editorialActiveVersion) data.editorial_active_version = editorialActiveVersion;

        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/run-stage-by-ai',
            method: 'POST',
            data,
            loading: false,
            success: (res: MarketingAiLlmSuccessPayload & { success?: boolean; message?: { content?: string } }) => {
                setAiLoading(null);
                if (!res?.success) {
                    const msg = extractApiMessage(res);
                    setStatusAlert({ severity: 'error', text: msg });
                    onError?.(msg);
                    return;
                }
                let successText = `Đã lưu bằng ${label} lúc ${formatTimeVi(new Date())}`;
                if (res.angles_pick_hint) {
                    successText += '. Vui lòng chọn một góc nhìn bên dưới.';
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
    const stepHint = stageLabel || stage;

    return (
        <Box sx={{ width: '100%' }}>
            {busy && <LinearProgress sx={{ mb: 1 }} />}
            {statusAlert && (
                <Alert severity={statusAlert.severity} onClose={() => setStatusAlert(null)} sx={{ mb: 1 }}>
                    {statusAlert.text}
                </Alert>
            )}
            <Box
                sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 1,
                    rowGap: 1,
                }}
            >
                {children && (
                    <Box
                        sx={{
                            display: 'flex',
                            gap: 1,
                            flexWrap: 'wrap',
                            flex: 1,
                            minWidth: 0,
                        }}
                    >
                        {children}
                    </Box>
                )}
                <Box
                    sx={{
                        display: 'flex',
                        gap: 1,
                        flexWrap: 'wrap',
                        flexShrink: 0,
                        ml: children ? { xs: 0, sm: 'auto' } : 0,
                        justifyContent: children ? { xs: 'flex-start', sm: 'flex-end' } : 'flex-start',
                    }}
                >
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
                        Bạn sắp gọi API <strong>{confirmLabel}</strong> cho bước{' '}
                        <strong>{stepHint}</strong>. Mỗi lần chạy đều <strong>tốn chi phí</strong> theo
                        bảng giá nhà cung cấp và sẽ <strong>tự động lưu</strong> kết quả vào pipeline.
                        <br />
                        <br />
                        Bạn có chắc muốn tiếp tục?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmProvider(null)} disabled={busy}>
                        Hủy
                    </Button>
                    <LoadingButton
                        variant="contained"
                        color="primary"
                        onClick={handleConfirm}
                        loading={busy}
                    >
                        Xác nhận, gọi API
                    </LoadingButton>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
