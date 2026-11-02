import type {BeatMapSection} from './agentVideoBeatMap';
import type {AgentVideoBeatAudioState} from './agentVideoApi';

export function timelineVoiceBeats(sections: BeatMapSection[], audio: AgentVideoBeatAudioState | null | undefined, fullAudioUrl = '') {
    return sections.map(beat => {
        const order = Number(beat.id.replace(/\D+/g, ''));
        const item = audio?.items?.find(entry => entry.order === order);
        return {
            id: `voice_${beat.id}`, beatId: beat.id, markId: item?.mark_id || `mark_${order}`,
            start: beat.startSec, end: beat.endSec,
            missing: !fullAudioUrl.trim() && !(item?.status === 'ready' && Boolean(item.url?.trim())),
        };
    });
}
