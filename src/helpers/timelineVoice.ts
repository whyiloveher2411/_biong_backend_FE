import React from 'react';
import {getAdminApiPrefix} from 'helpers/apiHost';
import {convertToURL} from 'helpers/url';
import {getAccessToken} from 'store/user/user.reducers';
export type VoiceMix={volume:number;muted:boolean};
const DEFAULT:VoiceMix={volume:1,muted:false};
const mixes=new Map<number,VoiceMix>();
const EVENT='timeline-voice-mix';
export function readVoiceMix(videoId:number):VoiceMix {
 if(!mixes.has(videoId)){try{const value=JSON.parse(localStorage.getItem('timeline-voice:'+videoId)||'null');mixes.set(videoId,value?{volume:Number.isFinite(value.volume)?Math.max(0,Math.min(2,value.volume)):1,muted:value.muted===true}:DEFAULT);}catch{mixes.set(videoId,DEFAULT);}}
 return mixes.get(videoId)!;
}
export function writeVoiceMix(videoId:number,patch:Partial<VoiceMix>){const next={...readVoiceMix(videoId),...patch};next.volume=Number.isFinite(next.volume)?Math.max(0,Math.min(2,next.volume)):1;mixes.set(videoId,next);try{localStorage.setItem('timeline-voice:'+videoId,JSON.stringify(next));}catch{}document.dispatchEvent(new CustomEvent(EVENT,{detail:{videoId}}));}
export function useVoiceMix(videoId:number){const [mix,setMix]=React.useState(()=>readVoiceMix(videoId));React.useEffect(()=>{setMix(readVoiceMix(videoId));const update=(e:Event)=>{if((e as CustomEvent).detail.videoId===videoId)setMix(readVoiceMix(videoId));};document.addEventListener(EVENT,update);return()=>document.removeEventListener(EVENT,update);},[videoId]);return {...mix,setVolume:(volume:number)=>writeVoiceMix(videoId,{volume}),toggle:()=>writeVoiceMix(videoId,{muted:!readVoiceMix(videoId).muted})};}
export function voicePreviewUrl(url:string,videoId:number){if(!url||!videoId||!/^https?:/i.test(url))return url;return convertToURL(getAdminApiPrefix(),'plugin/vn4-e-learning/app-mobile/marketing/short-video/timeline-audio/voice-asset')+'?short_video_id='+videoId+'&source='+encodeURIComponent(url)+'&access_token='+encodeURIComponent(getAccessToken()||'');}
type Graph={source:MediaElementAudioSourceNode;gain:GainNode;connected:boolean};
const graphs=new WeakMap<HTMLMediaElement,Graph>();let context:AudioContext|undefined;
export function applyVoiceMix(media:HTMLMediaElement,mix:VoiceMix){
 media.muted=mix.muted;let graph=graphs.get(media);
 if(!graph&&mix.volume>1){const Ctx=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;if(Ctx){context??=new Ctx();const source=context.createMediaElementSource(media),gain=context.createGain();graph={source,gain,connected:false};graphs.set(media,graph);}}
 if(graph){if(!graph.connected){graph.source.connect(graph.gain);graph.gain.connect(context!.destination);graph.connected=true;}media.volume=1;graph.gain.gain.value=mix.volume;if(!media.paused&&context?.state==='suspended')void context.resume().catch(()=>{});}else media.volume=Math.min(1,mix.volume);
}
export function useVoiceMedia(ref:React.RefObject<HTMLMediaElement>,videoId:number){const mix=useVoiceMix(videoId);React.useEffect(()=>{const media=ref.current;if(!media)return;const apply=()=>applyVoiceMix(media,readVoiceMix(videoId));apply();media.addEventListener('play',apply);const unlock=()=>{if(context?.state==='suspended')void context.resume().catch(()=>{});};document.addEventListener('pointerdown',unlock,true);return()=>{media.removeEventListener('play',apply);document.removeEventListener('pointerdown',unlock,true);};},[ref,videoId,mix.volume,mix.muted]);React.useEffect(()=>{const media=ref.current;return()=>{if(media){const graph=graphs.get(media);if(graph){graph.source.disconnect();graph.gain.disconnect();graph.connected=false;}}};},[ref]);}
