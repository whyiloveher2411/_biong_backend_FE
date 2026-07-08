import React from 'react';
import {
    Alert,
    Box,
    Checkbox,
    Divider,
    FormControlLabel,
    Paper,
    Typography,
} from '@mui/material';
import { Button } from '@mui/material';
import useAjax from 'hook/useApi';
import { getAccessToken } from 'store/user/user.reducers';
import { getApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import type { PlatformDistributionEntry } from './platformDistributionConstants';

type PipelineSlice = {
    platform_distribution?: Record<string, PlatformDistributionEntry>;
};

type Props = {
    postId: number;
    facebookPosted: boolean;
    facebookPostedAt: string;
    onFacebookPostedChange: (posted: boolean, postedAt: string) => void;
    onCopySaved: (pipeline: PipelineSlice) => void;
    onRefreshPost?: () => void;
    onSaved?: () => void;
};

function buildGeminiFacebookDistributionUrl(
    postId: number,
    promptText: string,
): string {
    const accessToken = getAccessToken() ?? '';
    const apiUrl = convertToURL(
        getApiHost(),
        '/api/admin/plugin/vn4-e-learning/app-mobile/marketing/content-ai/update-from-overview',
    );
    const url = new URL('https://gemini.google.com/app');
    url.searchParams.set('hl', 'vi');
    const nonce = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const hashParams = new URLSearchParams({
        copy_marketing_ai: '1',
        marketing_post_id: String(postId),
        marketing_stage: 'dist:facebook:plat_copy',
        access_token: accessToken,
        api_url: apiUrl,
        content_type: 'long_form',
        marketing_fill_only: '1',
        marketing_auto_submit: '1',
        platform: 'facebook',
        distribution_stage: 'plat_copy',
        marketing_workflow_cache_key: `fb_${postId}_${nonce}`,
        open_nonce: nonce,
    });
    if (promptText.trim()) {
        hashParams.set('marketing_prompt', encodeURIComponent(promptText));
    }
    url.hash = hashParams.toString();
    return url.toString();
}

export default function MarketingFacebookPreviewWorkflow({
    postId,
    facebookPosted,
    facebookPostedAt,
    onFacebookPostedChange,
    onRefreshPost,
    onSaved,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [stagePrompt, setStagePrompt] = React.useState('');
    const [promptLoading, setPromptLoading] = React.useState(false);
    const [postedSaving, setPostedSaving] = React.useState(false);
    const [postedError, setPostedError] = React.useState('');
    const [refreshingPost, setRefreshingPost] = React.useState(false);
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
        setPostedError('');
        fetchStagePrompt();
    }, [postId, fetchStagePrompt]);

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
                Mở Gemini tự động → AI sinh nội dung → lưu ngược vào CMS từ tab Gemini → đăng thủ công lên Facebook → đánh dấu đã đăng.
            </Typography>

            <Typography variant="overline" color="text.secondary" display="block" sx={{ mb: 1 }}>
                Bước 1 — Prompt AI
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                <Button
                    variant="contained"
                    disabled={!stagePrompt.trim() || promptLoading || !postId}
                    onClick={() => window.open(
                        buildGeminiFacebookDistributionUrl(postId, stagePrompt),
                        '_blank',
                        'noopener,noreferrer',
                    )}
                >
                    Mở Gemini tự động
                </Button>
                <Button
                    variant="outlined"
                    disabled={refreshingPost}
                    onClick={() => {
                        setRefreshingPost(true);
                        try {
                            onRefreshPost?.();
                            onSaved?.();
                        } finally {
                            setTimeout(() => setRefreshingPost(false), 500);
                        }
                    }}
                >
                    {refreshingPost ? 'Đang refresh post…' : 'Refresh post'}
                </Button>
                {promptLoading && (
                    <Typography variant="caption" color="text.secondary">
                        Đang tải prompt…
                    </Typography>
                )}
                {!promptLoading && stagePrompt.trim() && (
                    <Typography variant="caption" color="text.secondary">
                        Gemini sẽ tự điền prompt và tự bấm gửi. Sau khi AI trả kết quả, copy rồi bấm Lưu vào CMS trên panel nổi của tab Gemini.
                    </Typography>
                )}
            </Box>

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
