import {ajax} from 'hook/useApi';
import type {LibrarySound} from './modelAudio';
export type TimelineAudioClip={id:string;sound_id:string;sound:LibrarySound;start_sec:number;duration_sec:number;offset_sec:number;volume:number;muted?:boolean;loop:boolean;speed?:number;lane?:number;fade_in:number;fade_out:number;suggestion_key?:string;event_beat_id?:string;event_id?:string;event_hash?:string};
export type TimelineAudioSuggestion={id:string;beat_id:string;start_sec:number;end_sec:number;title:string;description:string;pixabay_query:string;category:'foley'|'emotion'|'ambience';volume:number;reason:string;loop:boolean;source?:string};
export type TimelineAudioPlanEntry={status:'queued'|'processing'|'completed'|'failed'|string;suggestions:TimelineAudioSuggestion[];error?:string;beat_start_sec?:number;duration_sec?:number;updated_at?:string};
export type TimelineAudioResponse={success:boolean;clips:TimelineAudioClip[];suggestions?:Record<string,TimelineAudioPlanEntry>;revision:string;message?:string};
export function timelineAudioApi(id:number,clips?:TimelineAudioClip[],revision?:string){return ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/short-video/timeline-audio/'+(clips?'save':'get'),method:'POST',loading:false,data:{short_video_id:id,...(clips?{clips,revision}:{})}}) as Promise<TimelineAudioResponse>;}
export function timelineAudioMaxDuration(c:TimelineAudioClip){return Math.max(0,(c.sound.duration_sec-c.offset_sec)/(c.speed||1));}
export function normalizeTimelineAudio(c:TimelineAudioClip):TimelineAudioClip {
 const speed=Math.max(.25,Math.min(4,c.speed||1)),offset_sec=Math.max(0,Math.min(c.sound.duration_sec-.01,c.offset_sec)),volume=Math.max(0,Math.min(2,Number.isFinite(c.volume)?c.volume:1));
 const next={...c,speed,offset_sec,volume,loop:false};return {...next,duration_sec:Math.min(Math.max(.01,c.duration_sec),timelineAudioMaxDuration(next))};
}
export function timelineAudioSample(c:TimelineAudioClip,time:number){
 const elapsed=time-c.start_sec,sourceDuration=c.sound.duration_sec,raw=c.offset_sec+elapsed*(c.speed||1);
 if(c.muted||elapsed<0||elapsed>=c.duration_sec||sourceDuration<=0||raw>=sourceDuration)return null;
 return {offset:raw,volume:c.volume*Math.max(0,Math.min(1,c.fade_in>0?elapsed/c.fade_in:1,c.fade_out>0?(c.duration_sec-elapsed)/c.fade_out:1))};
}

export function timelineAudioOverlap(a:{start_sec:number;duration_sec:number},b:{start_sec:number;duration_sec:number}){return a.start_sec<b.start_sec+b.duration_sec-.00001&&b.start_sec<a.start_sec+a.duration_sec-.00001;}
export function packTimelineAudio(clips:TimelineAudioClip[]):TimelineAudioClip[]{
 const assigned:TimelineAudioClip[]=[];
 for(const clip of [...clips].sort((a,b)=>a.start_sec-b.start_sec||a.id.localeCompare(b.id))){
  let lane=Number.isInteger(clip.lane)&&Number(clip.lane)>=0?Number(clip.lane):0;
  const busy=(n:number)=>assigned.some(c=>c.lane===n&&timelineAudioOverlap(c,clip));
  if(busy(lane)){lane=0;while(busy(lane))lane++;}
  assigned.push({...clip,lane});
 }
 const lanes=Array.from(new Set(assigned.map(c=>Number(c.lane)))).sort((a,b)=>a-b);
 return clips.map(c=>{const found=assigned.find(a=>a.id===c.id) as TimelineAudioClip;return {...found,lane:lanes.indexOf(Number(found.lane))};});
}

export function openVideoPixabayAudio(videoId:number,beatId:string,eventId:string){
 return ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/short-video/timeline-audio/pixabay-open',method:'POST',loading:false,data:{short_video_id:videoId,beat_id:beatId,event_id:eventId}}) as Promise<{success:boolean;message?:string;session_id?:string}>;
}

export type TimelineAudioBeat={id:string;startSec:number;endSec:number};
export function timelineAudioBeatBounds(clip:TimelineAudioClip,sections:ReadonlyArray<TimelineAudioBeat>){
 const owner=clip.event_beat_id||sections.find(s=>clip.suggestion_key?.startsWith(`suggestion_${s.id}_`))?.id;
 return sections.find(s=>s.id===owner)||(!owner?sections.find(s=>clip.start_sec>=s.startSec&&clip.start_sec<s.endSec):undefined);
}
export function constrainTimelineAudio(clip:TimelineAudioClip,sections:ReadonlyArray<TimelineAudioBeat>):TimelineAudioClip {
 const normalized=normalizeTimelineAudio(clip),beat=timelineAudioBeatBounds(clip,sections);if(!beat)return normalized;
 const duration=Math.min(normalized.duration_sec,Math.max(.001,beat.endSec-beat.startSec));
 const start=Math.max(beat.startSec,Math.min(beat.endSec-duration,normalized.start_sec));
 return {...normalized,event_beat_id:beat.id,start_sec:start,duration_sec:Math.min(duration,beat.endSec-start)};
}
export function resolveTimelineAudioDrag(clip:TimelineAudioClip,delta:number,mode:'move'|'left'|'right',bounds:{start:number;end:number}){
 const start=clip.start_sec,end=start+clip.duration_sec,maxDuration=timelineAudioMaxDuration(clip),minDuration=Math.min(.01,clip.duration_sec);
 if(mode==='move'){const length=Math.min(clip.duration_sec,bounds.end-bounds.start);const next=Math.max(bounds.start,Math.min(bounds.end-length,start+delta));return {start:next,end:next+length};}
 if(mode==='left')return {start:Math.max(bounds.start,end-maxDuration,Math.min(end-minDuration,start+delta)),end:Math.min(end,bounds.end)};
 return {start:Math.max(start,bounds.start),end:Math.max(start+minDuration,Math.min(bounds.end,start+maxDuration,end+delta))};
}
