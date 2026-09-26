import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import MovieFilterOutlinedIcon from '@mui/icons-material/MovieFilterOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { ShortVideoCookieManageContent } from '../ShortVideoCookieManageDrawer';
import { QwenAccountsContent } from './QwenAccountsDrawer';
import { SaydiAccountsContent } from './SaydiAccountsDrawer';
import { BeatVideoPlatformsContent } from './BeatVideoPlatformsDrawer';

type Props = {
    open: boolean;
    onClose: () => void;
    initialTab?: string;
};

type AccountTab = {
    key: string;
    label: string;
    icon: React.ReactElement;
    render: (active: boolean) => React.ReactNode;
};

const ACCOUNT_TABS: AccountTab[] = [
    {
        key: 'convert',
        label: 'Convert video',
        icon: <MovieFilterOutlinedIcon fontSize="small" />,
        render: (active) => <BeatVideoPlatformsContent active={active} />,
    },
    {
        key: 'metaai',
        label: 'Meta.ai Cookie',
        icon: <CookieOutlinedIcon fontSize="small" />,
        render: (active) => <ShortVideoCookieManageContent active={active} website="meta.ai" />,
    },
    {
        key: 'vibes',
        label: 'Vibes.ai Cookie',
        icon: <MovieFilterOutlinedIcon fontSize="small" />,
        render: (active) => <ShortVideoCookieManageContent active={active} website="vibes.ai" />,
    },
    {
        key: 'qwen',
        label: 'Qwen',
        icon: <SmartToyOutlinedIcon fontSize="small" />,
        render: (active) => <QwenAccountsContent active={active} />,
    },
    {
        key: 'saydi',
        label: 'Saydi',
        icon: <RecordVoiceOverOutlinedIcon fontSize="small" />,
        render: (active) => <SaydiAccountsContent active={active} />,
    },
];

/**
 * Drawer CÀI ĐẶT CHUNG dùng chung nhiều nền tảng — mỗi nền tảng 1 tab
 * (Convert video, Cookie, Qwen, Saydi, …). Thêm nền tảng mới = thêm 1 entry vào ACCOUNT_TABS.
 */
export default function AccountsManageDrawer({ open, onClose, initialTab }: Props) {
    const [tabKey, setTabKey] = React.useState(initialTab || ACCOUNT_TABS[0].key);

    React.useEffect(() => {
        if (open && initialTab) {
            setTabKey(initialTab);
        }
    }, [open, initialTab]);

    const activeIndex = Math.max(0, ACCOUNT_TABS.findIndex((tab) => tab.key === tabKey));

    return (
        <DrawerCustom
            open={open}
            onClose={onClose}
            title="Cài đặt chung"
            width={900}
            activeOnClose
            restDialogContent={{
                sx: {
                    p: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0, px: 2 }}>
                    <Tabs
                        value={activeIndex}
                        onChange={(_event, value: number) => setTabKey(ACCOUNT_TABS[value]?.key || ACCOUNT_TABS[0].key)}
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                    >
                        {ACCOUNT_TABS.map((tab) => (
                            <Tab
                                key={tab.key}
                                icon={tab.icon}
                                iconPosition="start"
                                label={tab.label}
                                sx={{ minHeight: 52, textTransform: 'none', fontWeight: 600 }}
                            />
                        ))}
                    </Tabs>
                </Box>
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflow: 'auto',
                        px: 3,
                        pt: 2.5,
                        pb: 3,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    className="custom_scroll"
                >
                    {ACCOUNT_TABS[activeIndex]?.render(open)}
                </Box>
            </Box>
        </DrawerCustom>
    );
}
