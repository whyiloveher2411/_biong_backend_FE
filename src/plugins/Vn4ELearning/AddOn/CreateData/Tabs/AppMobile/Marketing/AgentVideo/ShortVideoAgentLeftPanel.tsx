import React from 'react';
import { Alert, Box } from '@mui/material';
import type { ShortVideoAgentLeftTab } from 'helpers/shortVideoAgentVideoDrawerUrl';
import { InspectorPanelTabs } from '../ShortVideoInspectorFields';
import ShortVideoAgentScriptPanel from './ShortVideoAgentScriptPanel';
import ShortVideoAgentChatbotHtmlPanel from './ShortVideoAgentChatbotHtmlPanel';
import ShortVideoAgentResourcesPanel from './ShortVideoAgentResourcesPanel';
import MarketingFacebookPreviewPanel from '../MarketingFacebookPreviewPanel';
import type { useAgentVideoContent } from './useAgentVideoContent';

const TAB = {
    script: 0,
    chatbot: 1,
    resources: 2,
    facebook: 3,
} as const;

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    initialTab?: ShortVideoAgentLeftTab;
    onSaved?: () => void;
};

function resolveInitialTabIndex(initialTab?: ShortVideoAgentLeftTab): number {
    if (initialTab === 'facebook') {
        return TAB.facebook;
    }
    if (initialTab === 'resources') {
        return TAB.resources;
    }
    if (initialTab === 'chatbot') {
        return TAB.chatbot;
    }
    return TAB.script;
}

export default function ShortVideoAgentLeftPanel({
    state,
    initialTab = 'script',
    onSaved,
}: Props) {
    const [activeTab, setActiveTab] = React.useState<number>(() => resolveInitialTabIndex(initialTab));

    React.useEffect(() => {
        setActiveTab(resolveInitialTabIndex(initialTab));
    }, [initialTab, state.shortVideoId]);

    React.useEffect(() => {
        if (state.beatEditorFocusRequest?.nonce) {
            setActiveTab(TAB.chatbot);
        }
    }, [state.beatEditorFocusRequest?.nonce]);

    const facebookEnabled = activeTab === TAB.facebook && state.marketingPostId > 0;

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
                value={activeTab}
                onChange={setActiveTab}
                tabs={[
                    { label: 'Script & TTS' },
                    { label: 'HTML chatbot' },
                    { label: 'Tài nguyên' },
                    { label: 'Facebook' },
                ]}
            />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {activeTab === TAB.script ? (
                    <ShortVideoAgentScriptPanel state={state} />
                ) : null}
                {activeTab === TAB.chatbot ? (
                    <ShortVideoAgentChatbotHtmlPanel state={state} active={activeTab === TAB.chatbot} />
                ) : null}
                {activeTab === TAB.resources ? (
                    <ShortVideoAgentResourcesPanel state={state} />
                ) : null}
                {activeTab === TAB.facebook ? (
                    state.marketingPostId > 0 ? (
                        <MarketingFacebookPreviewPanel
                            postId={state.marketingPostId}
                            fallbackThumbnail={state.thumbnail}
                            enabled={facebookEnabled}
                            onSaved={onSaved}
                            compact
                        />
                    ) : (
                        <Box sx={{ p: 2 }}>
                            <Alert severity="info">
                                Chưa liên kết marketing post — thêm trong Relationship để xem preview Facebook.
                            </Alert>
                        </Box>
                    )
                ) : null}
            </Box>
        </Box>
    );
}
