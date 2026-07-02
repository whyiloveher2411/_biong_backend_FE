import React from 'react';
import {
    Alert,
    Box,
    CircularProgress,
} from '@mui/material';
import PlatformDistributionPreview from './PlatformDistributionPreview';
import MarketingFacebookPreviewWorkflow from './MarketingFacebookPreviewWorkflow';
import { useMarketingFacebookPreviewData } from './useMarketingFacebookPreviewData';

type Props = {
    postId: number;
    fallbackThumbnail?: unknown;
    enabled: boolean;
    onSaved?: () => void;
    compact?: boolean;
};

export default function MarketingFacebookPreviewPanel({
    postId,
    fallbackThumbnail,
    enabled,
    onSaved,
    compact = false,
}: Props) {
    const {
        loading,
        error,
        post,
        entry,
        facebookPosted,
        facebookPostedAt,
        handleCopySaved,
        handleFacebookPostedChange,
    } = useMarketingFacebookPreviewData({
        postId,
        fallbackThumbnail,
        enabled,
    });

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                <CircularProgress size={32} />
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box
            sx={{
                height: '100%',
                overflow: 'auto',
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 2.5,
            }}
        >
            {!compact && (
                <Alert severity="info">
                    Xem trước nội dung đăng Facebook. Dùng workflow bên dưới để sinh copy bằng AI,
                    sau đó sao chép và đăng thủ công lên nền tảng.
                </Alert>
            )}
            <MarketingFacebookPreviewWorkflow
                postId={postId}
                facebookPosted={facebookPosted}
                facebookPostedAt={facebookPostedAt}
                onFacebookPostedChange={handleFacebookPostedChange}
                onCopySaved={handleCopySaved}
                onSaved={onSaved}
            />
            <PlatformDistributionPreview
                platform="facebook"
                entry={entry}
                post={post}
                readOnly
                hideInfoAlert
            />
        </Box>
    );
}
