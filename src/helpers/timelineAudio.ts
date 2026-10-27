import {ajax} from 'hook/useApi';
import type {LibrarySound} from './modelAudio';
export type TimelineAudioClip={id:string;sound_id:string;sound:LibrarySound;start_sec:number;duration_sec:number;offset_sec:number;volume:number;loop:boolean;speed?:number;lane?:number;fade_in:number;fade_out:number};
export type TimelineAudioResponse={success:boolean;clips:TimelineAudioClip[];revision:string;message?:string};
export function timelineAudioApi(id:number,clips?:TimelineAudioClip[],revision?:string){return ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/short-video/timeline-audio/'+(clips?'save':'get'),method:'POST',loading:false,data:{short_video_id:id,...(clips?{clips,revision}:{})}}) as Promise<TimelineAudioResponse>;}
export function timelineAudioMaxDuration(c:TimelineAudioClip){return Math.max(0,(c.sound.duration_sec-c.offset_sec)/(c.speed||1));}
export function normalizeTimelineAudio(c:TimelineAudioClip):TimelineAudioClip {
 const speed=Math.max(.25,Math.min(4,c.speed||1)),offset_sec=Math.max(0,Math.min(c.sound.duration_sec-.01,c.offset_sec));
 const next={...c,speed,offset_sec,loop:false};return {...next,duration_sec:Math.min(Math.max(.01,c.duration_sec),timelineAudioMaxDuration(next))};
}
export function timelineAudioSample(c:TimelineAudioClip,time:number){
 const elapsed=time-c.start_sec,sourceDuration=c.sound.duration_sec,raw=c.offset_sec+elapsed*(c.speed||1);
 if(elapsed<0||elapsed>=c.duration_sec||sourceDuration<=0||raw>=sourceDuration)return null;
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
