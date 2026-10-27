import {timelineAudioSample,TimelineAudioClip,timelineAudioMaxDuration,normalizeTimelineAudio,packTimelineAudio,timelineAudioOverlap} from './timelineAudio';
const clip:TimelineAudioClip={id:'rain',sound_id:'rain',sound:{id:'rain',file:'rain.ogg',title:'Rain',duration_sec:12,category:'ambience',license:'CC0',source:''},start_sec:2,duration_sec:8,offset_sec:1,volume:.4,loop:true,fade_in:2,fade_out:2};
test('global playback remains continuous across beat boundaries and respects fades',()=>{
 expect(timelineAudioSample(clip,1)).toBeNull();
 expect(timelineAudioSample(clip,3)).toEqual({offset:2,volume:.2});
 expect(timelineAudioSample(clip,6)).toEqual({offset:5,volume:.4});
 expect(timelineAudioSample(clip,9)).toEqual({offset:8,volume:.2});
 expect(timelineAudioSample(clip,10)).toBeNull();
});
test('nonloop and mute respect the original source',()=>{
 expect(timelineAudioSample({...clip,sound:{...clip.sound,duration_sec:3},loop:false},4)).toBeNull();
 expect(timelineAudioSample({...clip,volume:0},3)?.volume).toBe(0);
});

test('speed caps duration and consumes source at the same rate',()=>{
 const fast=normalizeTimelineAudio({...clip,sound:{...clip.sound,duration_sec:3},speed:2,duration_sec:20});
 expect(fast.loop).toBe(false);expect(fast.duration_sec).toBe(1);expect(timelineAudioMaxDuration(fast)).toBe(1);
 expect(timelineAudioSample(fast,2.5)?.offset).toBe(2);expect(timelineAudioSample(fast,3)).toBeNull();
 const slow=normalizeTimelineAudio({...clip,sound:{...clip.sound,duration_sec:3},speed:.5,duration_sec:20});expect(slow.duration_sec).toBe(4);
});

test('100 sequential sources share one lane; overlaps need separate lanes',()=>{
 const many=Array.from({length:100},(_,i)=>({...clip,id:'c'+i,start_sec:i*2,duration_sec:1,lane:undefined}));
 expect(new Set(packTimelineAudio(many).map(c=>c.lane)).size).toBe(1);
 const overlap=packTimelineAudio([{...clip,id:'a',start_sec:0,duration_sec:2},{...clip,id:'b',start_sec:1,duration_sec:2},{...clip,id:'c',start_sec:3,duration_sec:1}]);
 expect(overlap.map(c=>c.lane)).toEqual([0,1,0]);
});
test('explicit lane assignments survive packing and touching endpoints do not conflict',()=>{
 const rows=packTimelineAudio([{...clip,id:'a',start_sec:0,duration_sec:2,lane:0},{...clip,id:'b',start_sec:2,duration_sec:2,lane:1}]);
 expect(rows.map(c=>c.lane)).toEqual([0,1]);
 expect(timelineAudioOverlap(rows[0],rows[1])).toBe(false);
 expect(packTimelineAudio(rows.map(c=>({...c,lane:0}))).map(c=>c.lane)).toEqual([0,0]);
});
