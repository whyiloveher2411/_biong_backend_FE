import React from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import RecordVoiceOverOutlinedIcon from '@mui/icons-material/RecordVoiceOverOutlined';
import MovieFilterOutlinedIcon from '@mui/icons-material/MovieFilterOutlined';
import ShuffleOutlinedIcon from '@mui/icons-material/ShuffleOutlined';
import DrawerCustom from 'components/molecules/DrawerCustom';
import { ShortVideoCookieManageContent } from '../ShortVideoCookieManageDrawer';
import { WhiteboardRandomTransitionContent } from '../WhiteboardRandomTransitionContent';
import { QwenAccountsContent } from './QwenAccountsDrawer';
import { SaydiAccountsContent } from './SaydiAccountsDrawer';
import { BeatVideoPlatformsContent } from './BeatVideoPlatformsDrawer';

type Props = {
    open: boolean;
    onClose: () => void;
    initialTab?: string;
    /** Short video đang mở — cần cho recorder Canva (lấy ảnh beat test). */
    shortVideoId?: number;
};

type AccountTabContext = {
    active: boolean;
    shortVideoId: number;
};

type AccountTab = {
    key: string;
    label: string;
    icon: React.ReactElement;
    render: (ctx: AccountTabContext) => React.ReactNode;
};

/** TẠM THỜI ẨN tab "ChatGPT Cookie" (đặt true để hiện lại). */
const SHOW_CHATGPT_COOKIE_TAB = false;

const ACCOUNT_TABS: AccountTab[] = [
    {
        key: 'convert',
        label: 'Convert video',
        icon: <MovieFilterOutlinedIcon fontSize="small" />,
        render: ({ active }) => <BeatVideoPlatformsContent active={active} />,
    },
    {
        key: 'metaai',
        label: 'Meta.ai',
        icon: <CookieOutlinedIcon fontSize="small" />,
        render: ({ active }) => <ShortVideoCookieManageContent active={active} website="meta.ai" />,
    },
    {
        key: 'vibes',
        label: 'Vibes.ai',
        icon: <MovieFilterOutlinedIcon fontSize="small" />,
        render: ({ active }) => <ShortVideoCookieManageContent active={active} website="vibes.ai" />,
    },
    {
        key: 'canva',
        label: 'Canva',
        icon: <MovieFilterOutlinedIcon fontSize="small" />,
        render: ({ active, shortVideoId }) => (
            <ShortVideoCookieManageContent active={active} website="www.canva.com" shortVideoId={shortVideoId} />
        ),
    },
    {
        key: 'leonardo',
        label: 'Leonardo',
        icon: <MovieFilterOutlinedIcon fontSize="small" />,
        render: ({ active, shortVideoId }) => (
            <ShortVideoCookieManageContent active={active} website="app.leonardo.ai" shortVideoId={shortVideoId} />
        ),
    },
    {
        key: 'deepseek',
        label: 'DeepSeek',
        icon: <CookieOutlinedIcon fontSize="small" />,
        render: ({ active, shortVideoId }) => (
            <ShortVideoCookieManageContent active={active} website="chat.deepseek.com" shortVideoId={shortVideoId} />
        ),
    },
    {
        key: 'claude',
        label: 'Claude',
        icon: <CookieOutlinedIcon fontSize="small" />,
        render: ({ active, shortVideoId }) => (
            <ShortVideoCookieManageContent active={active} website="claude.ai" shortVideoId={shortVideoId} />
        ),
    },
    ...(SHOW_CHATGPT_COOKIE_TAB ? [{
        key: 'chatgpt',
        label: 'ChatGPT',
        icon: <CookieOutlinedIcon fontSize="small" />,
        render: ({ active, shortVideoId }: AccountTabContext) => (
            <ShortVideoCookieManageContent active={active} website="chatgpt.com" shortVideoId={shortVideoId} />
        ),
    }] : []),
    {
        key: 'qwen',
        label: 'Qwen',
        icon: <SmartToyOutlinedIcon fontSize="small" />,
        render: ({ active }) => <QwenAccountsContent active={active} />,
    },
    {
        key: 'saydi',
        label: 'Saydi',
        icon: <RecordVoiceOverOutlinedIcon fontSize="small" />,
        render: ({ active }) => <SaydiAccountsContent active={active} />,
    },
    {
        key: 'random_transition',
        label: 'Hiệu ứng ngẫu nhiên',
        icon: <ShuffleOutlinedIcon fontSize="small" />,
        render: ({ active }) => <WhiteboardRandomTransitionContent active={active} />,
    },
];

/**
 * Drawer CÀI ĐẶT CHUNG dùng chung nhiều nền tảng — mỗi nền tảng 1 tab
 * (Convert video, Cookie, Qwen, Saydi, …). Thêm nền tảng mới = thêm 1 entry vào ACCOUNT_TABS.
 */
export default function AccountsManageDrawer({ open, onClose, initialTab, shortVideoId = 0 }: Props) {
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
            width={1280}
            PaperProps={{ sx: { width: 'min(1280px, 100vw)', maxWidth: '100vw' } }}
            activeOnClose
            restDialogContent={{
                sx: {
                    p: 0,
                    overflow: 'hidden',
                },
            }}
        >
            <Box sx={{ display: 'flex', height: '100%', minHeight: 0, minWidth: 0 }}>
                <Box
                    component="nav"
                    aria-label="Danh mục cài đặt chung"
                    sx={{
                        width: { xs: 152, sm: 224, md: 240 },
                        flexShrink: 0,
                        minHeight: 0,
                        borderRight: 1,
                        borderColor: 'divider',
                        bgcolor: 'action.hover',
                        display: 'flex',
                        flexDirection: 'column',
                        py: 1,
                    }}
                >
                    <Tabs
                        value={activeIndex}
                        onChange={(_event, value: number) => setTabKey(ACCOUNT_TABS[value]?.key || ACCOUNT_TABS[0].key)}
                        orientation="vertical"
                        aria-label="Cài đặt chung"
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                            minHeight: 0,
                            '& .MuiTabs-indicator': { left: 0, right: 'auto', width: 4 },
                        }}
                    >
                        {ACCOUNT_TABS.map((tab) => (
                            <Tab
                                key={tab.key}
                                id={`settings-tab-${tab.key}`}
                                aria-controls={`settings-panel-${tab.key}`}
                                icon={tab.icon}
                                iconPosition="start"
                                label={tab.label}
                                sx={{
                                    minHeight: 56,
                                    minWidth: 0,
                                    maxWidth: 'none',
                                    justifyContent: 'flex-start',
                                    textAlign: 'left',
                                    textTransform: 'none',
                                    fontWeight: 500,
                                    px: { xs: 1.5, sm: 2.5 },
                                    py: 1.5,
                                    borderTop: '1px solid transparent',
                                    borderBottom: '1px solid transparent',
                                    '& .MuiTab-iconWrapper': { mr: 1.5, flexShrink: 0 },
                                    '&:hover': { bgcolor: 'action.selected' },
                                    '&.Mui-selected': {
                                        bgcolor: 'background.paper',
                                        color: 'primary.main',
                                        fontWeight: 700,
                                        borderTopColor: 'divider',
                                        borderBottomColor: 'divider',
                                    },
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>
                <Box
                    role="tabpanel"
                    id={`settings-panel-${ACCOUNT_TABS[activeIndex].key}`}
                    aria-labelledby={`settings-tab-${ACCOUNT_TABS[activeIndex].key}`}
                    sx={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 0,
                        overflow: 'auto',
                        px: { xs: 2, md: 3 },
                        pt: 2.5,
                        pb: 3,
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                    className="custom_scroll"
                >
                    {ACCOUNT_TABS[activeIndex]?.render({ active: open, shortVideoId })}
                </Box>
            </Box>
        </DrawerCustom>
    );
}
