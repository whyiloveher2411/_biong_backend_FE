import React from 'react';
import { Box } from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import MarketingFacebookPreviewPanel from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/MarketingFacebookPreviewPanel';

type Props = {
    open: boolean;
    postId: number;
    onClose: () => void;
    fallbackThumbnail?: unknown;
    onSaved?: () => void;
};

export default function MarketingFacebookPreviewDrawer({
    open,
    postId,
    onClose,
    fallbackThumbnail,
    onSaved,
}: Props) {
    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Xem trước Facebook"
            width={760}
            restDialogContent={{
                sx: { p: 0 },
            }}
        >
            <Box sx={{ minHeight: '100%', py: 1 }}>
                <MarketingFacebookPreviewPanel
                    postId={postId}
                    fallbackThumbnail={fallbackThumbnail}
                    enabled={open && postId > 0}
                    onSaved={onSaved}
                />
            </Box>
        </DrawerCustom>
    );
}
