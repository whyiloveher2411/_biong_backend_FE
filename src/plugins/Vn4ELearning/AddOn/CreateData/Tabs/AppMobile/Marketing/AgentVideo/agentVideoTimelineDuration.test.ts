import {resolveAgentVideoDurationSec} from './agentVideoTimelineModel';
const beats = Array.from({length:16}, (_, i) => ({startSec:i*20,endSec:(i+1)*20,durationSec:20}));
test('timeline reaches all 16 beats even when old media only covers 10', () => {
 const input = {mediaDurationSec:200,audioDurationSec:200,beatSections:beats};
 expect(resolveAgentVideoDurationSec(input)).toBe(320);
});
test('timeline uses beat bounds with partial audio and no rendered video', () => {
 const input = {mediaDurationSec:null,audioDurationSec:20,beatSections:beats};
 expect(resolveAgentVideoDurationSec(input)).toBe(320);
});
test('legacy media duration precedence remains unchanged', () => {
 expect(resolveAgentVideoDurationSec({mediaDurationSec:12,audioDurationSec:30})).toBe(12);
 expect(resolveAgentVideoDurationSec({mediaDurationSec:null})).toBe(1);
});
