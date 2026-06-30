import React from 'react';
import ShortVideoAgentVideoWorkspace from 'plugins/Vn4ELearning/AddOn/CreateData/Tabs/AppMobile/Marketing/AgentVideo/ShortVideoAgentVideoWorkspace';

type Props = {
    open: boolean;
    shortVideoId: number;
    onClose: () => void;
    onUploaded?: () => void;
};

export default function ShortVideoAgentAudioDrawer({
    open,
    shortVideoId,
    onClose,
    onUploaded,
}: Props) {
    return (
        <ShortVideoAgentVideoWorkspace
            open={open}
            shortVideoId={shortVideoId}
            onClose={onClose}
            onUploaded={onUploaded}
        />
    );
}
