import React from 'react';
import useAjax from 'hook/useApi';
import type { PlatformDistributionEntry } from './platformDistributionConstants';

export function parseFacebookCopyField(raw: unknown): Record<string, unknown> {
    if (raw === null || raw === undefined) return {};
    if (typeof raw === 'object' && !Array.isArray(raw)) {
        return raw as Record<string, unknown>;
    }
    if (typeof raw === 'string') {
        const t = raw.trim();
        if (!t || t === '{}' || t === '[]') return {};
        try {
            const dec = JSON.parse(t);
            return dec && typeof dec === 'object' && !Array.isArray(dec)
                ? (dec as Record<string, unknown>)
                : {};
        } catch {
            return {};
        }
    }
    return {};
}

export function mergeFacebookEntry(
    pipelineDist: Record<string, PlatformDistributionEntry> | undefined,
    copyFromField: Record<string, unknown>,
): PlatformDistributionEntry {
    const fbPipeline = (pipelineDist?.facebook || {}) as PlatformDistributionEntry;
    return {
        ...fbPipeline,
        copy: {
            ...(fbPipeline.copy || {}),
            ...copyFromField,
        },
    };
}

type PrepareResponse = {
    success?: boolean;
    post?: Record<string, unknown>;
    pipeline?: {
        platform_distribution?: Record<string, PlatformDistributionEntry>;
    };
    message?: { content?: string } | string;
};

type UseMarketingFacebookPreviewDataArgs = {
    postId: number;
    fallbackThumbnail?: unknown;
    enabled: boolean;
};

export function useMarketingFacebookPreviewData({
    postId,
    fallbackThumbnail,
    enabled,
}: UseMarketingFacebookPreviewDataArgs) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [post, setPost] = React.useState<Record<string, unknown>>({});
    const [entry, setEntry] = React.useState<PlatformDistributionEntry>({});
    const [facebookPosted, setFacebookPosted] = React.useState(false);
    const [facebookPostedAt, setFacebookPostedAt] = React.useState('');

    const loadPrepare = React.useCallback(() => {
        if (!postId) return;
        setLoading(true);
        setError('');
        apiAjaxRef.current({
            url: 'plugin/vn4-e-learning/app-mobile/marketing/content-ai/prepare',
            method: 'POST',
            data: { post_id: postId, id: postId },
            loading: false,
            success: (res: PrepareResponse) => {
                setLoading(false);
                if (!res?.success) {
                    const msg =
                        typeof res?.message === 'string'
                            ? res.message
                            : res?.message?.content || 'Không tải được dữ liệu bài';
                    setError(msg);
                    return;
                }
                const postData = (res.post || {}) as Record<string, unknown>;
                const pipeline = res.pipeline || {};
                const dist = pipeline.platform_distribution || {};
                const fromField = parseFacebookCopyField(postData.marketing_facebook_copy_json);
                setPost({
                    ...postData,
                    thumbnail: postData.thumbnail ?? fallbackThumbnail ?? '',
                });
                setEntry(mergeFacebookEntry(dist, fromField));
                setFacebookPosted(Boolean(postData.facebook_posted));
                setFacebookPostedAt(String(postData.facebook_posted_at || ''));
            },
            error: (err: unknown) => {
                setLoading(false);
                const r = err as { message?: { content?: string } };
                setError(r?.message?.content || 'Không tải được dữ liệu bài');
            },
        });
    }, [postId, fallbackThumbnail]);

    React.useEffect(() => {
        if (!enabled || !postId) {
            return;
        }
        loadPrepare();
    }, [enabled, postId, loadPrepare]);

    const handleCopySaved = React.useCallback((pipeline: {
        platform_distribution?: Record<string, PlatformDistributionEntry>;
    }) => {
        const dist = pipeline.platform_distribution || {};
        const fbPipeline = (dist.facebook || {}) as PlatformDistributionEntry;
        const copy = fbPipeline.copy || {};
        setEntry((prev) => mergeFacebookEntry(dist, copy as Record<string, unknown>));
        setPost((prev) => ({
            ...prev,
            marketing_facebook_copy_json: copy,
        }));
    }, []);

    const handleFacebookPostedChange = React.useCallback((posted: boolean, postedAt: string) => {
        setFacebookPosted(posted);
        setFacebookPostedAt(postedAt);
    }, []);

    return {
        loading,
        error,
        post,
        entry,
        facebookPosted,
        facebookPostedAt,
        handleCopySaved,
        handleFacebookPostedChange,
        reload: loadPrepare,
    };
}
