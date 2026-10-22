import React from 'react';
import {Stack, Typography} from '@mui/material';
import type {useAgentVideoContent} from './useAgentVideoContent';
import WhiteboardBeatHtmlChatControl from './WhiteboardBeatHtmlChatControl';
import WhiteboardBeatAudioControl from './WhiteboardBeatAudioControl';

type Props = {state: ReturnType<typeof useAgentVideoContent>; beatId: string};
export default function StoryV2BeatToolbar({state, beatId}: Props) {
    return <Stack data-testid="whatif-beat-toolbar" direction="row" alignItems="center" flexWrap="wrap" useFlexGap gap={1} sx={{p: 1, bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider', flexShrink: 0, position: 'relative'}}>
        <Typography variant="subtitle2">{beatId}</Typography>
        <WhiteboardBeatHtmlChatControl state={state} beatId={beatId} inline />
        <WhiteboardBeatAudioControl state={state} beatId={beatId} />
    </Stack>;
}
