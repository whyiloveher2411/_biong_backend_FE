import {timelineAudioSample,TimelineAudioClip,timelineAudioMaxDuration,normalizeTimelineAudio,packTimelineAudio,timelineAudioOverlap,resolveTimelineAudioDrag,constrainTimelineAudio} from './timelineAudio';
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

test('mute suppresses preview and unmute retains volume and timing',()=>{
 const muted=normalizeTimelineAudio({...clip,muted:true});
 expect(muted.volume).toBe(.4);expect(muted.duration_sec).toBe(8);
 expect(timelineAudioSample(muted,6)).toBeNull();
 expect(timelineAudioSample({...muted,muted:false},6)).toEqual({offset:5,volume:.4});
});

test('missing volume defaults to 100 percent without overriding intentional zero',()=>{
 expect(normalizeTimelineAudio({...clip,volume:undefined as unknown as number}).volume).toBe(1);
 expect(normalizeTimelineAudio({...clip,volume:0}).volume).toBe(0);
});

test('beat-owned sounds cannot move or resize beyond their original beat',()=>{
 const c={...clip,sound:{...clip.sound,source_type:'code' as const},event_beat_id:'beat_2',start_sec:5,duration_sec:2,offset_sec:0},bounds={start:4,end:8};
 expect(resolveTimelineAudioDrag(c,100,'move',bounds)).toEqual({start:6,end:8});
 expect(resolveTimelineAudioDrag(c,-100,'move',bounds)).toEqual({start:4,end:6});
 expect(resolveTimelineAudioDrag(c,100,'right',bounds)).toEqual({start:5,end:8});
 expect(resolveTimelineAudioDrag(c,-100,'left',bounds)).toEqual({start:4,end:7});
 const constrained=constrainTimelineAudio({...c,start_sec:20},[{id:'beat_1',startSec:0,endSec:4},{id:'beat_2',startSec:4,endSec:8}]);
 expect(constrained.start_sec).toBe(6);expect(constrained.event_beat_id).toBe('beat_2');
});

test('legacy background clips can extend past their saved beat',()=>{
 const clipWithOldOwner={...clip,event_beat_id:'beat_1',start_sec:0,duration_sec:6,offset_sec:0,speed:1};
 expect(constrainTimelineAudio(clipWithOldOwner,[{id:'beat_1',startSec:0,endSec:2}]).duration_sec).toBe(6);
});
