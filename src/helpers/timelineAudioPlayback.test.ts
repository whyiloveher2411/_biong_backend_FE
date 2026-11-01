import {TimelineAudioPlayback} from './timelineAudioPlayback';
import {TimelineAudioClip} from './timelineAudio';
const clip:TimelineAudioClip={id:'door',sound_id:'door',sound:{id:'door',file:'door.wav',title:'Mở cửa',duration_sec:.91896,category:'foley',license:'CC0',source:''},start_sec:22.39,duration_sec:.75,offset_sec:0,volume:2,loop:false,fade_in:0,fade_out:0};
const flush=async()=>{await Promise.resolve();await Promise.resolve();};
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
