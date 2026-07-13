import React from 'react';
import ShortVideoAgentVideoWorkspace from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/ShortVideoAgentVideoWorkspace';
import type { ShortVideoAgentLeftTab } from 'helpers/shortVideoAgentVideoDrawerUrl';

type Props = {
    open: boolean;
    shortVideoId: number;
    onClose: () => void;
    onUploaded?: () => void;
    initialTab?: ShortVideoAgentLeftTab;
};

export default function ShortVideoAgentAudioDrawer({
    open,
    shortVideoId,
    onClose,
    onUploaded,
    initialTab = 'content',
}: Props) {
    return (
        <ShortVideoAgentVideoWorkspace
            open={open}
            shortVideoId={shortVideoId}
            onClose={onClose}
            onUploaded={onUploaded}
            initialTab={initialTab}
        />
    );
}
