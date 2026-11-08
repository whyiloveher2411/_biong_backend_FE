import React from 'react';
import {BgmVolumePatch,saveTimelineBgmVolume,TimelineAudioClip} from 'helpers/timelineAudio';

const songKey=(clip:TimelineAudioClip)=>JSON.stringify([clip.segment_index,clip.segment_id,clip.sound.file]);
/** Preview immediately; serialize debounced writes and retain newer edits during a save. */
export default function useTimelineBgmVolume(videoId:number,clips:TimelineAudioClip[]){
 const [pending,setPending]=React.useState<Record<string,BgmVolumePatch>>({});
 const [busy,setBusy]=React.useState(false),[error,setError]=React.useState('');
 const generation=React.useRef(0);
 React.useEffect(()=>{generation.current++;setPending({});setBusy(false);setError('');return()=>{generation.current++;};},[videoId]);
 React.useEffect(()=>{
  if(busy||error||!Object.keys(pending).length)return;
  const timer=window.setTimeout(async()=>{
   const submitted=pending,version=generation.current;setBusy(true);
   try{
    const result=await saveTimelineBgmVolume(videoId,Object.values(submitted));
    if(version!==generation.current)return;
    if(!result.success)throw new Error(result.message||'Không lưu được âm lượng BGM.');
    // Refresh the authoritative BGM list before removing optimistic overrides.
    document.dispatchEvent(new CustomEvent('timeline-bgm-volume-saved',{detail:{videoId,clips:result.bgm_clips}}));
    setPending(current=>Object.fromEntries(Object.entries(current).filter(([key,value])=>value!==submitted[key])));
   }catch(reason){if(version===generation.current)setError(reason instanceof Error?reason.message:String(reason));}
   finally{if(version===generation.current)setBusy(false);}
  },700);
  return()=>window.clearTimeout(timer);
 },[videoId,pending,busy,error]);
 const patch=(clip:TimelineAudioClip,volume:number)=>{
  if(clip.segment_index===undefined||!Number.isFinite(volume))return;
  setError('');const next={segment_index:clip.segment_index,segment_id:clip.segment_id||'',download_url:clip.sound.file,volume:Math.round(Math.max(.05,Math.min(1.5,volume))*100)/100};
  setPending(current=>({...current,[songKey(clip)]:next}));
 };
 return {clips:React.useMemo(()=>clips.map(clip=>({...clip,volume:pending[songKey(clip)]?.volume??clip.volume})),[clips,pending]),patch,error,busy,dirty:Object.keys(pending).length>0,retry:()=>setError('')};
}
