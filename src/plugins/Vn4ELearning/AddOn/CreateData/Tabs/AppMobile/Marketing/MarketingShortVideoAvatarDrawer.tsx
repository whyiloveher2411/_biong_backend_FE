import React from 'react';
import { Box } from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import ShowData from 'components/pages/PostType/ShowData';

type Props = {
    open: boolean;
    onClose: () => void;
};

export default function MarketingShortVideoAvatarDrawer({ open, onClose }: Props) {
    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Quản lý avatar"
            width={1200}
            activeOnClose
            restDialogContent={{
                sx: {
                    backgroundColor: 'body.background',
                },
            }}
        >
            <Box>
                <ShowData
                    type="short_video_avatar"
                    action="list"
                    enableNewInline
                />
            </Box>
        </DrawerCustom>
    );
}
