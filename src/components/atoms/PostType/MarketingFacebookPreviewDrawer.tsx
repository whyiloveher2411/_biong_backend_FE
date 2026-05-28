import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
} from '@mui/material';
import useAjax from 'hook/useApi';
import DrawerCustom from 'components/molecules/DrawerCustom';
import PlatformDistributionPreview from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/PlatformDistributionPreview';
import type { PlatformDistributionEntry } from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/platformDistributionConstants';

function parseFacebookCopyField(raw: unknown): Record<string, unknown> {
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

type PrepareResponse = {
    success?: boolean;
    post?: Record<string, unknown>;
    pipeline?: {
        platform_distribution?: Record<string, PlatformDistributionEntry>;
    };
    message?: { content?: string } | string;
};

type Props = {
    open: boolean;
    postId: number;
    onClose: () => void;
    fallbackThumbnail?: unknown;
};

export default function MarketingFacebookPreviewDrawer({
    open,
    postId,
    onClose,
    fallbackThumbnail,
}: Props) {
    const api = useAjax();
    const apiAjaxRef = React.useRef(api.ajax);
    apiAjaxRef.current = api.ajax;

    const [loading, setLoading] = React.useState(false);
    const [error, setError] = React.useState('');
    const [post, setPost] = React.useState<Record<string, unknown>>({});
    const [entry, setEntry] = React.useState<PlatformDistributionEntry>({});

    React.useEffect(() => {
        if (!open || !postId) {
            return;
        }
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
                const fbPipeline = (dist.facebook || {}) as PlatformDistributionEntry;
                const fromField = parseFacebookCopyField(postData.marketing_facebook_copy_json);
                const fb: PlatformDistributionEntry = {
                    ...fbPipeline,
                    copy: {
                        ...(fbPipeline.copy || {}),
                        ...fromField,
                    },
                };
                setPost({
                    ...postData,
                    // API prepare không trả thumbnail; ưu tiên thumbnail từ row list (ngoài post pipeline).
                    thumbnail: postData.thumbnail ?? fallbackThumbnail ?? '',
                });
                setEntry(fb);
            },
            error: (err: unknown) => {
                setLoading(false);
                const r = err as { message?: { content?: string } };
                setError(r?.message?.content || 'Không tải được dữ liệu bài');
            },
        });
    }, [open, postId, fallbackThumbnail]);

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Xem trước Facebook"
            width={760}
            restDialogContent={{
                sx: { p: 2 },
            }}
        >
            <Box sx={{ minHeight: '100%', py: 1 }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                        <CircularProgress size={32} />
                    </Box>
                )}
                {!loading && error && (
                    <Alert severity="error">{error}</Alert>
                )}
                {!loading && !error && (
                    <PlatformDistributionPreview
                        platform="facebook"
                        entry={entry}
                        post={post}
                        readOnly
                    />
                )}
            </Box>
        </DrawerCustom>
    );
}
