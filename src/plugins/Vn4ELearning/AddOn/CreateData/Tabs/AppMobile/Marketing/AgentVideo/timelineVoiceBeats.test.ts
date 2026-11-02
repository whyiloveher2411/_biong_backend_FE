import {timelineVoiceBeats} from './timelineVoiceBeats';
import type {BeatMapSection} from './agentVideoBeatMap';
import type {AgentVideoBeatAudioState} from './agentVideoApi';
const sections=[{id:'beat_1',startSec:0,endSec:2},{id:'beat_2',startSec:2,endSec:5},{id:'beat_3',startSec:5,endSec:8}] as BeatMapSection[];
test('voice status follows real audio per beat, not array order or mute; full narration covers every beat',()=>{
 const audio={items:[{order:2,mark_id:'saved_mark_2',status:'ready',url:'/two.mp3'},{order:1,mark_id:'mark_1',status:'ready',url:''}]} as AgentVideoBeatAudioState;
 const clips=timelineVoiceBeats(sections,audio);
 expect(clips.map(c=>c.missing)).toEqual([true,false,true]);
 expect(clips[1]).toMatchObject({start:2,end:5,beatId:'beat_2',markId:'saved_mark_2'});
 expect(clips[2].markId).toBe('mark_3');
 expect(timelineVoiceBeats(sections,audio,'/full.mp3').map(c=>c.missing)).toEqual([false,false,false]);
 expect(timelineVoiceBeats(sections,null).every(c=>c.missing)).toBe(true);
});
