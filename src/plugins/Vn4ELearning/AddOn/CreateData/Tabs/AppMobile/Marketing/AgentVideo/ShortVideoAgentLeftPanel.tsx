import React from 'react';
import { Alert, Box } from '@mui/material';
import type { ShortVideoAgentLeftTab } from 'helpers/shortVideoAgentVideoDrawerUrl';
import { InspectorPanelTabs } from '../ShortVideoInspectorFields';
import ShortVideoAgentContentPanel from './ShortVideoAgentContentPanel';
import ShortVideoAgentScriptPanel from './ShortVideoAgentScriptPanel';
import ShortVideoAgentChatbotHtmlPanel from './ShortVideoAgentChatbotHtmlPanel';
import MarketingFacebookPreviewPanel from '../MarketingFacebookPreviewPanel';
import type { useAgentVideoContent } from './useAgentVideoContent';

const TAB = {
    content: 0,
    script: 1,
    render: 2,
    facebook: 3,
} as const;

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    initialTab?: ShortVideoAgentLeftTab;
    onSaved?: () => void;
};

function resolveInitialTabIndex(initialTab?: ShortVideoAgentLeftTab): number {
    if (initialTab === 'content') {
        return TAB.content;
    }
    if (initialTab === 'facebook') {
        return TAB.facebook;
    }
    if (initialTab === 'resources' || initialTab === 'chatbot' || initialTab === 'render') {
        return TAB.render;
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
            setActiveTab(TAB.render);
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
                    { label: 'Content' },
                    { label: 'Script & TTS' },
                    { label: 'Render' },
                    { label: 'Facebook' },
                ]}
            />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {activeTab === TAB.content ? (
                    <ShortVideoAgentContentPanel state={state} />
                ) : null}
                {activeTab === TAB.script ? (
                    <ShortVideoAgentScriptPanel state={state} />
                ) : null}
                {activeTab === TAB.render ? (
                    <ShortVideoAgentChatbotHtmlPanel state={state} active={activeTab === TAB.render} />
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
