import {TimelineAudioClip,timelineAudioSample} from './timelineAudio';

type Entry={clip:TimelineAudioClip;signature:string;media?:HTMLAudioElement;loading:boolean;startedPass:number};
/** Start once per transport pass. Buffering/ended media must never retrigger a cue. */
export class TimelineAudioPlayback {
 private entries=new Map<string,Entry>();
 private pass=0;
 private clock:{time:number;on:boolean;wall:number}|null=null;
 private disposed=false;
 constructor(private acquire:(clip:TimelineAudioClip,isCurrent:()=>boolean)=>Promise<HTMLAudioElement>,private apply:(clip:TimelineAudioClip,media:HTMLAudioElement,volume:number)=>void,private error:(error:unknown)=>void,private now:()=>number=()=>performance.now()/1000){}
 sync(time:number,on:boolean,clips:TimelineAudioClip[],preloadIds:ReadonlySet<string>=new Set()){
  if(this.disposed)return;
  const wall=this.now(),previous=this.clock;
  // A transport seek/replay starts a new pass. Ordinary clock jitter does not.
  if(!previous||on!==previous.on||time<previous.time-.08||time-previous.time>Math.max(0,wall-previous.wall)+.35){
   ++this.pass;this.entries.forEach(entry=>entry.media?.pause());
  }
  this.clock={time,on,wall};
  const ids=new Set(clips.map(clip=>clip.id));
  this.entries.forEach((entry,id)=>{if(!ids.has(id)){entry.media?.pause();this.entries.delete(id);}});
  for(const clip of clips){
   const signature=JSON.stringify([clip.sound.file,clip.start_sec,clip.duration_sec,clip.offset_sec,clip.speed||1]);
   let entry=this.entries.get(clip.id);
   if(entry&&entry.signature!==signature){entry.media?.pause();this.entries.delete(clip.id);entry=undefined;}
   if(!entry){entry={clip,signature,loading:false,startedPass:-1};this.entries.set(clip.id,entry);}
   entry.clip=clip;
   if(clip.muted){entry.startedPass=-1;}
   const sample=on?timelineAudioSample(clip,time):null;
   if(!sample)entry.media?.pause();
   if(entry.media){if(sample)this.play(entry);continue;}
   if(!sample&&!preloadIds.has(clip.id))continue;
   if(entry.loading||entry.startedPass===this.pass)continue;
   entry.loading=true;
   const pending=entry;
   void this.acquire(clip,()=>!this.disposed&&this.entries.get(clip.id)===pending).then(media=>{
    if(this.disposed||this.entries.get(clip.id)!==pending){media.pause();return;}
    pending.media=media;pending.loading=false;this.play(pending);
   }).catch(error=>{if(!this.disposed&&this.entries.get(clip.id)===pending){pending.loading=false;pending.startedPass=this.pass;this.error(error);}});
  }
 }
 private play(entry:Entry){
  const media=entry.media,clock=this.clock;
  const sample=clock?.on?timelineAudioSample(entry.clip,clock.time):null;
  if(!media||!sample){media?.pause();return;}
  this.apply(entry.clip,media,sample.volume);
  if(entry.startedPass===this.pass)return;
  // Set the latch before play(): its promise may take many frames to resolve.
  entry.startedPass=this.pass;
  const pass=this.pass;
  media.currentTime=sample.offset;
  void media.play().catch(error=>{if(!this.disposed&&this.pass===pass&&this.entries.get(entry.clip.id)===entry)this.error(error);});
 }
 dispose(){this.disposed=true;this.entries.forEach(entry=>entry.media?.pause());this.entries.clear();}
}
