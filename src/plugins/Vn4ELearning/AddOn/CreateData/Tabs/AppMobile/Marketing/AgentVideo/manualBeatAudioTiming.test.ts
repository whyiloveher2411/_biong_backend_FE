import {applyManualBeatAudioTiming,buildBeatMapFromManualMarks,normalizeManualBeatMarks} from './agentVideoManualBeats';
import type {AgentVideoBeatAudioItem} from './agentVideoApi';
const marks=()=>normalizeManualBeatMarks([
 {id:'mark_1',order:1,startTokenIndex:0,endTokenIndex:1,content:'First beat',startSec:.031,endSec:1.992},
 {id:'mark_2',order:2,startTokenIndex:2,endTokenIndex:3,content:'Second beat',startSec:2.012,endSec:3.932},
 {id:'mark_3',order:3,startTokenIndex:4,endTokenIndex:5,content:'Third beat',startSec:11.96,endSec:14.48},
]);
const audio=(duration=5.6):AgentVideoBeatAudioItem[]=>[
 {mark_id:'mark_1',order:1,status:'ready',source:'tts',url:'one.mp3',duration_sec:duration},
 {mark_id:'mark_2',order:2,status:'ready',source:'tts',url:'two.mp3',duration_sec:6.36},
 {mark_id:'mark_3',order:3,status:'ready',source:'tts',url:'three.mp3',duration_sec:2.52},
];
test('video 122 preview and timeline derive the same beat-2 range from audio despite stale marks',()=>{
 const map=buildBeatMapFromManualMarks(marks(),63.5,audio())!;
 expect(map.sections[1].startSec).toBe(5.6);expect(map.sections[1].endSec).toBe(11.96);expect(map.sections[1].durationSec).toBe(6.36);
 expect(map.totalVideoSec).toBe(14.48);expect(map.sections[2].endSec).toBe(14.48);
});
test('replacement audio shifts all later windows without using old merged duration',()=>{
 const resolved=applyManualBeatAudioTiming(marks(),audio(7));
 expect(resolved[1].startSec).toBe(7);expect(resolved[1].endSec).toBe(13.36);expect(resolved[1].durationSec).toBe(6.36);
});
test('partially ready audio uses real durations for ready beats and estimates only for pending ones',()=>{
 const items=audio();items[1]={...items[1],status:'pending',duration_sec:0};
 const resolved=applyManualBeatAudioTiming(marks(),items);
 expect(resolved[0].durationSec).toBe(5.6);expect(resolved[1].startSec).toBe(5.6);expect(resolved[1].durationSec).toBe(1.92);
 expect(resolved[2].durationSec).toBe(2.52);expect(resolved[2].startSec).toBe(7.52);
});
test('before audio exists existing provisional timeline behaviour is preserved',()=>{
 expect(applyManualBeatAudioTiming(marks(),[])).toEqual(marks());
 expect(buildBeatMapFromManualMarks(marks(),63.5)).toEqual(buildBeatMapFromManualMarks(marks(),63.5,[]));
});
