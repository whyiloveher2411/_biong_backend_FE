import React from 'react';
import { Box } from '@mui/material';
import type { ShortVideoAgentLeftTab } from 'helpers/shortVideoAgentVideoDrawerUrl';
import { InspectorPanelTabs } from '../ShortVideoInspectorFields';
import ShortVideoAgentContentPanel from './ShortVideoAgentContentPanel';
import ShortVideoAgentScriptPanel from './ShortVideoAgentScriptPanel';
import ShortVideoAgentChatbotHtmlPanel from './ShortVideoAgentChatbotHtmlPanel';
import ShortVideoAgentThumbnailPanel from './ShortVideoAgentThumbnailPanel';
import ShortVideoAgentFacebookSocialCopyPanel from './ShortVideoAgentFacebookSocialCopyPanel';
import ShortVideoAgentYoutubePanel from './ShortVideoAgentYoutubePanel';
import ShortVideoAgentPublishedLinksPanel from './ShortVideoAgentPublishedLinksPanel';
import ShortVideoAgentPostRecordSection from './ShortVideoAgentPostRecordSection';
import ShortVideoAgentInsightsPanel from './ShortVideoAgentInsightsPanel';
import MarketingFacebookPreviewPanel from '../MarketingFacebookPreviewPanel';
import { isAgentVideo2sMode } from './agentVideoVisualMode';
import type { useAgentVideoContent } from './useAgentVideoContent';

type LeftTabKey = 'content' | 'script' | 'render' | 'thumbnail' | 'facebook' | 'youtube' | 'published' | 'insights';

const LEFT_TABS: { key: LeftTabKey; label: string }[] = [
    { key: 'content', label: 'Content' },
    { key: 'script', label: 'Script & TTS' },
    { key: 'render', label: 'Render' },
    { key: 'thumbnail', label: 'Thumbnail' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'youtube', label: 'YouTube' },
    { key: 'published', label: 'Đã đăng' },
    { key: 'insights', label: 'Số liệu' },
];

/** Video 2s chỉ dùng Script & TTS + các tab đăng video (Thumbnail, Facebook, YouTube, Đã đăng, Số liệu) — ẩn Content và Render. */
const VIDEO_2S_TAB_KEYS: LeftTabKey[] = ['script', 'thumbnail', 'facebook', 'youtube', 'published', 'insights'];

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    initialTab?: ShortVideoAgentLeftTab;
    onSaved?: () => void;
};

function resolveInitialTabKey(initialTab?: ShortVideoAgentLeftTab): LeftTabKey {
    if (initialTab === 'script') {
        return 'script';
    }
    if (initialTab === 'facebook') {
        return 'facebook';
    }
    if (initialTab === 'youtube') {
        return 'youtube';
    }
    if (initialTab === 'published') {
        return 'published';
    }
    if (initialTab === 'insights') {
        return 'insights';
    }
    if (initialTab === 'resources' || initialTab === 'chatbot' || initialTab === 'render') {
        return 'render';
    }
    return 'content';
}

export default function ShortVideoAgentLeftPanel({
    state,
    initialTab = 'content',
    onSaved,
}: Props) {
    const isVideo2s = isAgentVideo2sMode(state.agentVisualMode);
    const visibleTabs = React.useMemo(
        () => (isVideo2s ? LEFT_TABS.filter((tab) => VIDEO_2S_TAB_KEYS.includes(tab.key)) : LEFT_TABS),
        [isVideo2s],
    );
    const [activeKey, setActiveKey] = React.useState<LeftTabKey>(() => resolveInitialTabKey(initialTab));

    React.useEffect(() => {
        setActiveKey(resolveInitialTabKey(initialTab));
    }, [initialTab, state.shortVideoId]);

    // Mode đổi (vd. sang video 2s) → tab đang chọn có thể bị ẩn → về tab hiển thị đầu tiên.
    React.useEffect(() => {
        if (!visibleTabs.some((tab) => tab.key === activeKey)) {
            setActiveKey(visibleTabs[0]?.key ?? 'content');
        }
    }, [visibleTabs, activeKey]);

    React.useEffect(() => {
        if (state.beatEditorFocusRequest?.nonce && visibleTabs.some((tab) => tab.key === 'render')) {
            setActiveKey('render');
        }
    }, [state.beatEditorFocusRequest?.nonce, visibleTabs]);

    const activeIndex = Math.max(0, visibleTabs.findIndex((tab) => tab.key === activeKey));

    const facebookEnabled = activeKey === 'facebook' && state.marketingPostId > 0;

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
            }}
        >
            <InspectorPanelTabs
                value={activeIndex}
                onChange={(index) => {
                    const next = visibleTabs[index]?.key;
                    if (next) {
                        setActiveKey(next);
                    }
                }}
                tabs={visibleTabs.map((tab) => ({ label: tab.label }))}
            />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {activeKey === 'content' ? (
                    <ShortVideoAgentContentPanel state={state} />
                ) : null}
                {activeKey === 'script' ? (
                    <ShortVideoAgentScriptPanel state={state} />
                ) : null}
                {activeKey === 'render' ? (
                    <ShortVideoAgentChatbotHtmlPanel state={state} active={activeKey === 'render'} />
                ) : null}
                {activeKey === 'thumbnail' ? (
                    <ShortVideoAgentThumbnailPanel state={state} showHtmlCover={!isVideo2s} />
                ) : null}
                {activeKey === 'facebook' ? (
                    <Box sx={{ height: '100%', overflow: 'auto' }}>
                        <Box sx={{ px: 2, pt: 2 }}>
                            <ShortVideoAgentPostRecordSection
                                socialPublish={state.socialPublish}
                                platforms={['facebook']}
                            />
                        </Box>
                        {isVideo2s ? null : state.marketingPostId > 0 ? (
                            <MarketingFacebookPreviewPanel
                                postId={state.marketingPostId}
                                fallbackThumbnail={state.thumbnail}
                                enabled={facebookEnabled}
                                onSaved={onSaved}
                                compact
                            />
                        ) : (
                            <ShortVideoAgentFacebookSocialCopyPanel state={state} />
                        )}
                    </Box>
                ) : null}
                {activeKey === 'youtube' ? (
                    <ShortVideoAgentYoutubePanel state={state} />
                ) : null}
                {activeKey === 'published' ? (
                    <ShortVideoAgentPublishedLinksPanel state={state} />
                ) : null}
                {activeKey === 'insights' ? (
                    <ShortVideoAgentInsightsPanel state={state} />
                ) : null}
            </Box>
        </Box>
    );
}
