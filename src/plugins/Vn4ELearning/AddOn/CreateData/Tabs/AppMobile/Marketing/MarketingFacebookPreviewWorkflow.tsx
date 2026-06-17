import React from 'react';
import {
    Alert,
    Box,
    Checkbox,
    Divider,
    FormControlLabel,
    Paper,
    TextField,
    Typography,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import useAjax from 'hook/useApi';
import { getAccessToken } from 'store/user/user.reducers';
import {
    MarketingCopyPromptButton,
    MarketingReloadPromptButton,
} from './MarketingPromptActionButtons';
import type { PlatformDistributionEntry } from './platformDistributionConstants';

const RESULT_MARKER_HINT = '###RESULT: START### … ###RESULT: END###';

type PipelineSlice = {
    platform_distribution?: Record<string, PlatformDistributionEntry>;
};

type Props = {
    postId: number;
    facebookPosted: boolean;
    facebookPostedAt: string;
    onFacebookPostedChange: (posted: boolean, postedAt: string) => void;
    onCopySaved: (pipeline: PipelineSlice) => void;
    onSaved?: () => void;
};

export default function MarketingFacebookPreviewWorkflow({
    postId,
    facebookPosted,
    facebookPostedAt,
    onFacebookPostedChange,
    onCopySaved,
    onSaved,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [stagePrompt, setStagePrompt] = React.useState('');
    const [promptLoading, setPromptLoading] = React.useState(false);
    const [overviewPaste, setOverviewPaste] = React.useState('');
    const [pasteSaving, setPasteSaving] = React.useState(false);
    const [pasteSuccess, setPasteSuccess] = React.useState('');
    const [pasteError, setPasteError] = React.useState('');
    const [postedSaving, setPostedSaving] = React.useState(false);
    const [postedError, setPostedError] = React.useState('');
    const promptFetchIdRef = React.useRef(0);

    const fetchStagePrompt = React.useCallback(() => {
        if (!postId) return;
        const fetchId = ++promptFetchIdRef.current;
        setPromptLoading(true);
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/get-overview-prompt',
            data: {
                post_id: postId,
                platform: 'facebook',
                distribution_stage: 'plat_copy',
                auto_workflow: 1,
            },
            loading: false,
            success: (res: { prompt?: string }) => {
                if (fetchId !== promptFetchIdRef.current) return;
                if (res?.prompt) setStagePrompt(res.prompt);
            },
            finally: () => {
                if (fetchId === promptFetchIdRef.current) setPromptLoading(false);
            },
        });
    }, [postId]);

    React.useEffect(() => {
        if (!postId) return;
        setStagePrompt('');
        setOverviewPaste('');
        setPasteSuccess('');
        setPasteError('');
        setPostedError('');
        fetchStagePrompt();
    }, [postId, fetchStagePrompt]);

    const submitPaste = () => {
        if (!overviewPaste.trim() || !postId) return;
        setPasteSaving(true);
        setPasteError('');
        setPasteSuccess('');
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/update-from-overview',
            method: 'POST',
            data: {
                post_id: postId,
                marketing_post_id: postId,
                platform: 'facebook',
                distribution_stage: 'plat_copy',
                stage: 'plat_copy',
                overview_text: overviewPaste,
                access_token: getAccessToken() || '',
            },
            loading: false,
            success: (res: {
                success?: boolean;
                pipeline?: PipelineSlice;
                message?: { content?: string } | string;
            }) => {
                setPasteSaving(false);
                if (!res?.success) {
                    const msg = typeof res?.message === 'string'
                        ? res.message
                        : res?.message?.content || 'Không lưu được kết quả AI';
                    setPasteError(msg);
                    return;
                }
                setOverviewPaste('');
                setPasteSuccess('Đã lưu copy Facebook vào CMS');
                if (res.pipeline) {
                    onCopySaved(res.pipeline);
                }
                onSaved?.();
            },
            error: (err: unknown) => {
                setPasteSaving(false);
                const r = err as { message?: { content?: string } };
                setPasteError(r?.message?.content || 'Không lưu được kết quả AI');
            },
        });
    };

    const handlePostedToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextPosted = event.target.checked;
        if (!postId) return;
        setPostedSaving(true);
        setPostedError('');
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/save-facebook-posted',
            method: 'POST',
            data: {
                post_id: postId,
                posted: nextPosted,
            },
            loading: false,
            success: (res: {
                success?: boolean;
                facebook_posted?: boolean;
                facebook_posted_at?: string;
                message?: { content?: string } | string;
            }) => {
                setPostedSaving(false);
                if (!res?.success) {
                    const msg = typeof res?.message === 'string'
                        ? res.message
                        : res?.message?.content || 'Không cập nhật được trạng thái';
                    setPostedError(msg);
                    return;
                }
                onFacebookPostedChange(
                    Boolean(res.facebook_posted),
                    String(res.facebook_posted_at || ''),
                );
                onSaved?.();
            },
            error: (err: unknown) => {
                setPostedSaving(false);
                const r = err as { message?: { content?: string } };
                setPostedError(r?.message?.content || 'Không cập nhật được trạng thái');
            },
        });
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                Workflow đăng Facebook
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Copy prompt → dán vào AI → dán kết quả vào CMS → đăng thủ công lên Facebook → đánh dấu đã đăng.
            </Typography>

            <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Bước 1 — Prompt AI
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                <MarketingCopyPromptButton
                    promptText={stagePrompt}
                    disabled={!stagePrompt.trim() || promptLoading}
                />
                <MarketingReloadPromptButton
                    variant="text"
                    size="small"
                    loading={promptLoading}
                    onReload={fetchStagePrompt}
                />
                {promptLoading && (
                    <Typography variant="caption" color="text.secondary">
                        Đang tải prompt…
                    </Typography>
                )}
                {!promptLoading && stagePrompt.trim() && (
                    <Typography variant="caption" color="text.secondary">
                        Bấm sao chép prompt rồi dán vào chat AI.
                    </Typography>
                )}
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Bước 2 — Dán kết quả AI
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                JSON giữa {RESULT_MARKER_HINT}
            </Typography>
            <TextField
                multiline
                minRows={6}
                fullWidth
                placeholder="Dán kết quả từ AI vào đây…"
                value={overviewPaste}
                onChange={(e) => setOverviewPaste(e.target.value)}
                sx={{ mb: 1 }}
            />
            <LoadingButton
                variant="contained"
                color="primary"
                loading={pasteSaving}
                disabled={!overviewPaste.trim()}
                onClick={submitPaste}
            >
                Lưu vào CMS
            </LoadingButton>
            {pasteSuccess && (
                <Alert severity="success" sx={{ mt: 1.5 }}>{pasteSuccess}</Alert>
            )}
            {pasteError && (
                <Alert severity="error" sx={{ mt: 1.5 }}>{pasteError}</Alert>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                Bước 3 — Đánh dấu đã đăng
            </Typography>
            <FormControlLabel
                control={(
                    <Checkbox
                        checked={facebookPosted}
                        disabled={postedSaving}
                        onChange={handlePostedToggle}
                    />
                )}
                label="Đã đăng lên Facebook"
            />
            {facebookPostedAt && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ ml: 4, mt: -0.5 }}>
                    {`Đánh dấu lúc: ${facebookPostedAt}`}
                </Typography>
            )}
            {postedError && (
                <Alert severity="error" sx={{ mt: 1 }}>{postedError}</Alert>
            )}
        </Paper>
    );
}
