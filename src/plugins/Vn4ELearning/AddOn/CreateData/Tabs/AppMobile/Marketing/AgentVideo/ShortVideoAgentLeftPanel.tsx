import React from 'react';
import { Alert, Box } from '@mui/material';
import type { ShortVideoAgentLeftTab } from 'helpers/shortVideoAgentVideoDrawerUrl';
import { InspectorPanelTabs } from '../ShortVideoInspectorFields';
import ShortVideoAgentScriptPanel from './ShortVideoAgentScriptPanel';
import MarketingFacebookPreviewPanel from '../MarketingFacebookPreviewPanel';
import type { useAgentVideoContent } from './useAgentVideoContent';

const TAB = {
    script: 0,
    facebook: 1,
} as const;

type AgentVideoState = ReturnType<typeof useAgentVideoContent>;

type Props = {
    state: AgentVideoState;
    initialTab?: ShortVideoAgentLeftTab;
    onSaved?: () => void;
};

function resolveInitialTabIndex(initialTab?: ShortVideoAgentLeftTab): number {
    return initialTab === 'facebook' ? TAB.facebook : TAB.script;
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
                    { label: 'Facebook' },
                ]}
            />
            <Box sx={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                {activeTab === TAB.script ? (
                    <ShortVideoAgentScriptPanel state={state} />
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
