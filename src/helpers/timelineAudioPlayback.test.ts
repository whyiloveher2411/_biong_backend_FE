import {TimelineAudioPlayback} from './timelineAudioPlayback';
import {TimelineAudioClip} from './timelineAudio';
const clip:TimelineAudioClip={id:'door',sound_id:'door',sound:{id:'door',file:'door.wav',title:'Mở cửa',duration_sec:.91896,category:'foley',license:'CC0',source:''},start_sec:22.39,duration_sec:.75,offset_sec:0,volume:2,loop:false,fade_in:0,fade_out:0};
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function setup(){
 let wall=0,position=0;
 const seeks:number[]=[];
 const media={paused:true,duration:.91896,play:jest.fn(),pause:jest.fn(),get currentTime(){return position;},set currentTime(value:number){seeks.push(value);position=value;}};
 // Simulate buffering: paused remains true even while play() is unresolved.
 let played:()=>void=()=>{};
 media.play.mockImplementation(()=>new Promise<void>(resolve=>{played=resolve;}));
 const acquire=jest.fn(async()=>media as unknown as HTMLAudioElement),apply=jest.fn(),error=jest.fn();
 const player=new TimelineAudioPlayback(acquire,apply,error,()=>wall);
 const sync=(time:number,on=true)=>{wall+=1/60;player.sync(time,on,[clip]);};
 return {player,media,seeks,sync,acquire,apply,error,played:()=>played()};
}
test('three consecutive replays each start the door once despite slow/paused media and frozen clock',async()=>{
 const h=setup();
 for(let pass=0;pass<3;pass++){
  h.sync(22.39,false);h.sync(22.39);await flush();
  for(let frame=0;frame<35;frame++){
   // Frozen media clock would have triggered repeated .15s drift seeks before.
   h.sync(22.39+frame/60);await flush();
  }
  expect(h.media.play).toHaveBeenCalledTimes(pass+1);
  expect(h.seeks).toHaveLength(pass+1);
  h.played();await flush();h.sync(23.16,false);
 }
 expect(h.error).not.toHaveBeenCalled();h.player.dispose();
});
test('slow loading starts at the latest offset, and a removed cue never plays late',async()=>{
 let resolve!:(media:HTMLAudioElement)=>void;
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const player=new TimelineAudioPlayback(()=>new Promise(r=>{resolve=r;}),()=>{},()=>{},()=>0);
 player.sync(22.39,true,[clip]);player.sync(22.6,true,[clip]);
 resolve(media);await flush();
 expect(media.currentTime).toBeCloseTo(.21);expect(media.play).toHaveBeenCalledTimes(1);
 player.dispose();
 const removed=new TimelineAudioPlayback(()=>new Promise(r=>{resolve=r;}),()=>{},()=>{},()=>0);
 removed.sync(22.39,true,[clip]);removed.sync(22.4,true,[]);resolve(media);await flush();
 expect(media.play).toHaveBeenCalledTimes(1);removed.dispose();
});
test('ended source stays latched; intentional seek and mute/unmute are respected',async()=>{
 const h=setup();h.sync(22.39);await flush();h.media.paused=true;
 h.sync(22.6);h.sync(22.7);expect(h.media.play).toHaveBeenCalledTimes(1);
 h.sync(22.4);expect(h.media.play).toHaveBeenCalledTimes(2);
 h.player.sync(22.41,true,[{...clip,muted:true}]);h.player.sync(22.42,true,[clip]);
 expect(h.media.play).toHaveBeenCalledTimes(3);h.player.dispose();
});
test('loads upcoming sounds while paused without playing them, then reuses media at cue time',async()=>{
 const h=setup();h.player.sync(0,false,[clip],new Set([clip.id]));await flush();
 expect(h.acquire).toHaveBeenCalledTimes(1);expect(h.media.play).not.toHaveBeenCalled();
 h.player.sync(22.39,true,[clip],new Set([clip.id]));await flush();
 expect(h.acquire).toHaveBeenCalledTimes(1);expect(h.media.play).toHaveBeenCalledTimes(1);h.player.dispose();
});
test('a rejected play retries at the current offset, while a successful cue remains latched',async()=>{
 let wall=0;
 const media={currentTime:0,play:jest.fn().mockRejectedValueOnce(new DOMException('interrupted','AbortError')).mockResolvedValue(undefined),pause:jest.fn()} as unknown as HTMLAudioElement;
 const error=jest.fn();const player=new TimelineAudioPlayback(async()=>media,()=>{},error,()=>wall);
 player.sync(22.39,true,[clip]);await flush();
 wall=.01;player.sync(22.40,true,[clip]);expect(media.play).toHaveBeenCalledTimes(1);
 wall=.25;player.sync(22.64,true,[clip]);await flush();
 expect(media.play).toHaveBeenCalledTimes(2);expect(media.currentTime).toBeCloseTo(.25);
 wall=.3;player.sync(22.69,true,[clip]);expect(media.play).toHaveBeenCalledTimes(2);
 expect(error).toHaveBeenCalledWith(expect.any(DOMException),clip);player.dispose();
});
test('a transient preload failure retries before cue time rather than poisoning the whole pass',async()=>{
 let wall=0;
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const acquire=jest.fn().mockRejectedValueOnce(new Error('temporary fetch failure')).mockResolvedValue(media);
 const player=new TimelineAudioPlayback(acquire,()=>{},()=>{},()=>wall);
 player.sync(22,false,[clip],new Set([clip.id]));await flush();
 wall=.2;player.sync(22,false,[clip],new Set([clip.id]));await flush();
 expect(acquire).toHaveBeenCalledTimes(2);expect(media.play).not.toHaveBeenCalled();
 wall=.6;player.sync(22.39,true,[clip]);await flush();expect(media.play).toHaveBeenCalledTimes(1);player.dispose();
});
test('retries are bounded and never play an expired cue late',async()=>{
 let wall=0;
 const media={currentTime:0,play:jest.fn().mockRejectedValue(new Error('blocked')),pause:jest.fn()} as unknown as HTMLAudioElement;
 const player=new TimelineAudioPlayback(async()=>media,()=>{},()=>{},()=>wall);
 player.sync(22.39,true,[clip]);await flush();
 for(let i=1;i<=6;i++){wall=i*.12;player.sync(22.39+wall,true,[clip]);await flush();}
 expect(media.play).toHaveBeenCalledTimes(3);
 wall=.8;player.sync(23.19,true,[clip]);expect(media.play).toHaveBeenCalledTimes(3);player.dispose();
});
test('a synchronous seek failure affects only that item and does not stop following items',async()=>{
 const bad={set currentTime(t:number){throw new Error('metadata not ready');},play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const good={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const other={...clip,id:'other'};const errors=jest.fn();
 const player=new TimelineAudioPlayback(async c=>c.id===clip.id?bad:good,()=>{},errors,()=>0);
 player.sync(22.39,true,[clip,other]);await flush();
 expect(good.play).toHaveBeenCalledTimes(1);expect(errors).toHaveBeenCalledWith(expect.any(Error),clip);player.dispose();
});
test('an obsolete acquisition cannot pause media already playing for a newer clip entry',async()=>{
 const resolvers:Array<(media:HTMLAudioElement)=>void>=[];
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const player=new TimelineAudioPlayback(()=>new Promise(resolve=>resolvers.push(resolve)),()=>{},()=>{},()=>0);
 player.sync(22.39,true,[clip]);player.sync(22.4,true,[{...clip,offset_sec:.1}]);
 resolvers[1](media);await flush();expect(media.play).toHaveBeenCalledTimes(1);
 const pauses=(media.pause as jest.Mock).mock.calls.length;
 resolvers[0](media);await flush();expect(media.pause).toHaveBeenCalledTimes(pauses);player.dispose();
});
test('a media decoding failure discards that element and acquires a fresh one',async()=>{
 let wall=0;
 const bad={currentTime:0,error:null as unknown,play:jest.fn(async()=>{}),pause:jest.fn()};
 const good={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()};
 const acquire=jest.fn().mockResolvedValueOnce(bad).mockResolvedValue(good);
 const player=new TimelineAudioPlayback(acquire,()=>{},()=>{},()=>wall);
 player.sync(22.39,true,[clip]);await flush();bad.error={code:3};
 wall=.05;player.sync(22.44,true,[clip]);wall=.25;player.sync(22.64,true,[clip]);await flush();
 expect(acquire).toHaveBeenCalledTimes(2);expect(good.play).toHaveBeenCalledTimes(1);player.dispose();
});
test('explicit retry unlocks a failed item without restarting an item that already played',async()=>{
 let wall=0;const failed={currentTime:0,play:jest.fn().mockRejectedValue(new Error('blocked')),pause:jest.fn()};
 const good={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()};
 const player=new TimelineAudioPlayback(async c=>(c.id===clip.id?failed:good) as unknown as HTMLAudioElement,()=>{},()=>{},()=>wall);
 player.sync(22.39,true,[clip,{...clip,id:'good'}]);await flush();
 wall=.1;player.sync(22.49,true,[clip,{...clip,id:'good'}]);await flush();
 wall=.2;player.sync(22.59,true,[clip,{...clip,id:'good'}]);await flush();
 expect(failed.play).toHaveBeenCalledTimes(3);
 failed.play.mockResolvedValue(undefined);player.retryFailed();await flush();
 expect(failed.play).toHaveBeenCalledTimes(4);expect(good.play).toHaveBeenCalledTimes(1);player.dispose();
});
test('waiting for the audio device uses the latest offset and volume when it becomes ready',async()=>{
 let resume!:()=>void,wall=0;
 const ready=new Promise<void>(resolve=>{resume=resolve;});
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const apply=jest.fn(),faded={...clip,fade_in:1};
 const player=new TimelineAudioPlayback(async()=>media,apply,()=>{},()=>wall,()=>ready);
 player.sync(22.39,true,[faded]);await flush();expect(media.play).not.toHaveBeenCalled();
 wall=.2;player.sync(22.59,true,[faded]);resume();await flush();
 expect(media.currentTime).toBeCloseTo(.2);expect(apply.mock.calls.at(-1)?.[2]).toBeCloseTo(.4);
 expect(media.play).toHaveBeenCalledTimes(1);player.dispose();
});
test('a cue that expires while the audio device is locked never plays late',async()=>{
 let resume!:()=>void;
 const ready=new Promise<void>(resolve=>{resume=resolve;}),media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 let wall=0;const player=new TimelineAudioPlayback(async()=>media,()=>{},()=>{},()=>wall,()=>ready);
 player.sync(22.39,true,[clip]);await flush();wall=1;player.sync(23.39,true,[clip]);resume();await flush();
 expect(media.play).not.toHaveBeenCalled();player.dispose();
});
test('normal frame jitter never trims the attack from a short effect on repeated passes',async()=>{
 let wall=0;
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const cue={...clip,duration_sec:.25};
 const player=new TimelineAudioPlayback(async()=>media,()=>{},()=>{},()=>wall);
 const offsets:number[]=[];
 for(const delay of [.005,.016,.033,.05]){
  wall+=1;player.sync(clip.start_sec-.2,false,[cue],new Set([cue.id]));await flush();
  wall+=.01;player.sync(clip.start_sec-.2,true,[cue]);
  wall+=.2+delay;player.sync(clip.start_sec+delay,true,[cue]);await flush();offsets.push(media.currentTime);
 }
 expect(offsets).toEqual([0,0,0,0]);expect(media.play).toHaveBeenCalledTimes(4);player.dispose();
});
test('an explicit seek into a short effect retains its requested source offset',async()=>{
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const player=new TimelineAudioPlayback(async()=>media,()=>{},()=>{},()=>0);
 player.sync(clip.start_sec+.033,true,[{...clip,duration_sec:.25}]);await flush();
 expect(media.currentTime).toBeCloseTo(.033);player.dispose();
});
test('after a long stall natural cue crossing does not replay an obsolete attack',async()=>{
 let wall=0;
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const player=new TimelineAudioPlayback(async()=>media,()=>{},()=>{},()=>wall);
 player.sync(clip.start_sec-.1,true,[clip],new Set([clip.id]));await flush();
 wall=.25;player.sync(clip.start_sec+.15,true,[clip]);await flush();
 expect(media.currentTime).toBeCloseTo(.15);player.dispose();
});
test('end-of-cue cancels a pending play without showing an audio failure or retrying it',async()=>{
 let reject!:(error:unknown)=>void,wall=0;
 const media={currentTime:0,paused:true,play:jest.fn(()=>new Promise<void>((_,r)=>{reject=r;})),pause:jest.fn(()=>{reject?.(new DOMException('The play() request was interrupted by a call to pause().','AbortError'));})} as unknown as HTMLAudioElement;
 const error=jest.fn(),cue={...clip,duration_sec:.1};
 const player=new TimelineAudioPlayback(async()=>media,()=>{},error,()=>wall);
 player.sync(clip.start_sec,true,[cue]);await flush();expect(media.play).toHaveBeenCalledTimes(1);
 wall=.11;player.sync(clip.start_sec+.11,true,[cue]);await flush();
 wall=.12;player.sync(clip.start_sec+.12,true,[cue]);await flush();
 expect(error).not.toHaveBeenCalled();expect(media.play).toHaveBeenCalledTimes(1);expect(media.pause).toHaveBeenCalledTimes(1);player.dispose();
});
test('mute invalidates a pending play; immediate unmute starts a fresh attempt without stale errors',async()=>{
 const rejections:Array<(error:unknown)=>void>=[];
 const media={currentTime:0,paused:true,play:jest.fn(()=>new Promise<void>((_,r)=>rejections.push(r))),pause:jest.fn()} as unknown as HTMLAudioElement;
 const error=jest.fn();let wall=0;const player=new TimelineAudioPlayback(async()=>media,()=>{},error,()=>wall);
 player.sync(clip.start_sec,true,[clip]);await flush();
 wall=.01;player.sync(clip.start_sec+.01,true,[{...clip,muted:true}]);
 wall=.02;player.sync(clip.start_sec+.02,true,[clip]);await flush();expect(media.play).toHaveBeenCalledTimes(2);
 rejections[0](new DOMException('interrupted by pause','AbortError'));await flush();expect(error).not.toHaveBeenCalled();
 player.dispose();
});
test('cancelling during device preparation prevents the obsolete play call itself',async()=>{
 let ready!:()=>void;const prepared=new Promise<void>(resolve=>{ready=resolve;});
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const error=jest.fn();let wall=0;const player=new TimelineAudioPlayback(async()=>media,()=>{},error,()=>wall,()=>prepared);
 player.sync(clip.start_sec,true,[clip]);await flush();
 wall=.01;player.sync(clip.start_sec+.01,true,[{...clip,muted:true}]);ready();await flush();
 expect(media.play).not.toHaveBeenCalled();expect(error).not.toHaveBeenCalled();player.dispose();
});
test('whole-video readiness shares a pending preload without starting or changing transport',async()=>{
 let resolve!:(media:HTMLAudioElement)=>void;
 const media={currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()} as unknown as HTMLAudioElement;
 const acquire=jest.fn(()=>new Promise<HTMLAudioElement>(r=>{resolve=r;}));
 const player=new TimelineAudioPlayback(acquire,()=>{},()=>{},()=>0);
 player.sync(22,false,[clip],new Set([clip.id]));
 let ready=false;const pending=player.prepareClips([clip]).then(()=>{ready=true;});await flush();
 expect(ready).toBe(false);expect(acquire).toHaveBeenCalledTimes(1);
 resolve(media);await pending;expect(media.play).not.toHaveBeenCalled();
 player.sync(22.39,true,[clip]);await flush();expect(media.play).toHaveBeenCalledTimes(1);expect(acquire).toHaveBeenCalledTimes(1);player.dispose();
});
