import {TimelineAudioClip,timelineAudioSample} from './timelineAudio';

type Entry={clip:TimelineAudioClip;signature:string;media?:HTMLAudioElement;loading:boolean;startedPass:number;failurePass:number;failures:number;retryAt:number;playAttempt:number;naturalStartPass:number;pauseRequested:boolean;loadPromise?:Promise<HTMLAudioElement|undefined>};
/** Start once per transport pass. Only failed attempts may retry; ended/buffering cues stay latched. */
export class TimelineAudioPlayback {
 private entries=new Map<string,Entry>();
 private pass=0;
 private clock:{time:number;on:boolean;wall:number}|null=null;
 private disposed=false;
 constructor(private acquire:(clip:TimelineAudioClip,isCurrent:()=>boolean)=>Promise<HTMLAudioElement>,private apply:(clip:TimelineAudioClip,media:HTMLAudioElement,volume:number)=>void,private error:(error:unknown,clip?:TimelineAudioClip)=>void,private now:()=>number=()=>performance.now()/1000,private prepare?:(media:HTMLAudioElement,clip:TimelineAudioClip)=>Promise<void>){}
 sync(time:number,on:boolean,clips:TimelineAudioClip[],preloadIds:ReadonlySet<string>=new Set()){
  if(this.disposed)return;
  const wall=this.now(),previous=this.clock;
  const newPass=!previous||on!==previous.on||time<previous.time-.08||time-previous.time>Math.max(0,wall-previous.wall)+.35;
  if(newPass){
   ++this.pass;this.entries.forEach(entry=>this.pause(entry));
  }
  this.clock={time,on,wall};
  const ids=new Set(clips.map(clip=>clip.id));
  this.entries.forEach((entry,id)=>{if(!ids.has(id)){this.pause(entry);this.entries.delete(id);}});
  for(const clip of clips){
   const entry=this.entryFor(clip);
   if(!newPass&&on&&previous&&previous.time<clip.start_sec&&time>=clip.start_sec)entry.naturalStartPass=this.pass;
   if(entry.media?.error){
    const error=new Error('Audio media error '+entry.media.error.code);
    this.pause(entry);entry.media=undefined;entry.startedPass=-1;
    this.failed(entry,error,this.pass);
   }
   if(clip.muted)entry.startedPass=-1;
   const sample=on?timelineAudioSample(clip,time):null;
   if(!sample)this.pause(entry);
   if(entry.media){if(sample)this.play(entry);continue;}
   if(!sample&&!preloadIds.has(clip.id))continue;
   if(entry.loading||!this.canAttempt(entry))continue;
   void this.load(entry).catch(()=>{});
  }
 }
 private entryFor(clip:TimelineAudioClip){
  const signature=JSON.stringify([clip.sound.file,clip.start_sec,clip.duration_sec,clip.offset_sec,clip.speed||1]);
  let entry=this.entries.get(clip.id);
  if(entry&&entry.signature!==signature){this.pause(entry);this.entries.delete(clip.id);entry=undefined;}
  if(!entry){entry={clip,signature,loading:false,startedPass:-1,failurePass:-1,failures:0,retryAt:0,playAttempt:0,naturalStartPass:-1,pauseRequested:true};this.entries.set(clip.id,entry);}
  entry.clip=clip;return entry;
 }
 private load(entry:Entry):Promise<HTMLAudioElement|undefined>{
  if(entry.media)return Promise.resolve(entry.media);
  if(entry.loadPromise)return entry.loadPromise;
  entry.loading=true;const pass=this.pass,clip=entry.clip;
  entry.loadPromise=this.acquire(clip,()=>!this.disposed&&this.entries.get(clip.id)===entry).then(media=>{
   if(this.disposed||this.entries.get(clip.id)!==entry){
    if(![...this.entries.values()].some(current=>current.media===media))media.pause();return undefined;
   }
   entry.media=media;entry.loading=false;this.play(entry);return media;
  }).catch(error=>{
   if(!this.disposed&&this.entries.get(clip.id)===entry)this.failed(entry,error,pass);
   throw error;
  }).finally(()=>{entry.loading=false;entry.loadPromise=undefined;});
  return entry.loadPromise;
 }
 /** Preload without changing or pausing the transport clock. */
 async prepareClips(clips:TimelineAudioClip[]){
  if(this.disposed)throw new Error('Bộ phát âm thanh đã đóng.');
  await Promise.all(clips.filter(clip=>!clip.muted).map(async clip=>{
   const entry=this.entryFor(clip);
   if(entry.media?.error){this.pause(entry);entry.media=undefined;entry.startedPass=-1;}
   const media=await this.load(entry);
   if(!media)throw new Error('Âm thanh đã thay đổi trong lúc chuẩn bị.');
   if(this.prepare)await this.prepare(media,clip);
  }));
 }

 private pause(entry:Entry){
  // Invalidate the pending prepare/play BEFORE pause() rejects its Promise.
  // End-of-cue and mute cancellation are expected, not a playback failure.
  if(!entry.pauseRequested||entry.media?.paused===false){
   ++entry.playAttempt;entry.pauseRequested=true;entry.media?.pause();
  }
 }
 private canAttempt(entry:Entry){
  if(entry.failurePass!==this.pass){entry.failurePass=this.pass;entry.failures=0;entry.retryAt=0;}
  return entry.failures<3&&this.now()>=entry.retryAt;
 }
 private failed(entry:Entry,error:unknown,pass:number,delay=.15){
  if(this.disposed||this.pass!==pass||this.entries.get(entry.clip.id)!==entry)return;
  this.canAttempt(entry);entry.failures++;entry.retryAt=this.now()+delay*entry.failures;
  this.error(error,entry.clip);
 }
 private play(entry:Entry){
  const media=entry.media,clock=this.clock;
  const sample=clock?.on?timelineAudioSample(entry.clip,clock.time):null;
  if(!media||!sample){this.pause(entry);return;}
  if(!this.canAttempt(entry))return;
  const pass=this.pass;
  try{
   this.apply(entry.clip,media,sample.volume);
   if(entry.startedPass===pass)return;
   entry.startedPass=pass;entry.pauseRequested=false;
   const attempt=++entry.playAttempt;
   const failed=(error:unknown)=>{
    if(this.disposed||this.pass!==pass||this.entries.get(entry.clip.id)!==entry||entry.playAttempt!==attempt)return;
    entry.startedPass=-1;
    if(media.error){this.pause(entry);entry.media=undefined;}
    this.failed(entry,error,pass,.04);
   };
   const begin=()=>{
    if(this.disposed||this.pass!==pass||this.entries.get(entry.clip.id)!==entry||entry.playAttempt!==attempt)return;
    // Unlocking the audio device can take time. Do not use an old offset or fade level.
    const latest=this.clock?.on?timelineAudioSample(entry.clip,this.clock.time):null;
    if(!latest)return;
    // A normal frame can cross a cue 10–50 ms late. Seeking that far into a
    // percussive effect deletes its attack and makes identical replays sound quieter.
    // Preserve the attack for a natural crossing; deliberate transport seeks keep
    // their exact source offset. Do not replay an old attack after a long stall.
    const fromAttack=entry.naturalStartPass===pass&&this.clock!.time-entry.clip.start_sec<=.1;
    const start=fromAttack?timelineAudioSample(entry.clip,entry.clip.start_sec):latest;
    if(!start)return;
    this.apply(entry.clip,media,start.volume);media.currentTime=start.offset;
    return media.play();
   };
   try{void (this.prepare?this.prepare(media,entry.clip).then(begin):Promise.resolve(begin())).catch(failed);}catch(error){failed(error);}
  }catch(error){this.failed(entry,error,pass);}
 }
 retryFailed(){
  if(this.disposed||!this.clock)return;
  const failed=new Set<string>();
  this.entries.forEach(entry=>{if(entry.failures>0){entry.failurePass=-1;failed.add(entry.clip.id);}});
  if(failed.size)this.sync(this.clock.time,this.clock.on,[...this.entries.values()].map(entry=>entry.clip),failed);
 }
 dispose(){this.disposed=true;this.entries.forEach(entry=>this.pause(entry));this.entries.clear();}
}
