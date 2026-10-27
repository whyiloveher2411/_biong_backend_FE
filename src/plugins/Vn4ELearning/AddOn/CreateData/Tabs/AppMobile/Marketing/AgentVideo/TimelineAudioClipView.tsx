import React from 'react';
import {Box} from '@mui/material';
import type {TimelineAudioClip} from 'helpers/timelineAudio';
export default function TimelineAudioClipView({clip,selected,onSelect,onVolume}:{clip?:TimelineAudioClip;selected:boolean;onSelect:()=>void;onVolume:(volume:number)=>void}){
 const drag=React.useRef<{y:number;volume:number}|null>(null);
 if(!clip)return null;
 const percent=Math.round(clip.volume*100);
 return <Box title={`${clip.sound.title} · ${percent}% · ${clip.speed||1}×`} sx={{position:'absolute',inset:0,width:'100%',height:'100%',bgcolor:selected?'#287d91':'#226b78',color:'white',border:0,boxShadow:`inset 0 0 0 ${selected?2:1}px ${selected?'#fff':'#73d7e5'}`,borderRadius:1,px:0,textIndent:8,overflow:'hidden',fontSize:12,lineHeight:'26px',whiteSpace:'nowrap',textOverflow:'ellipsis',minWidth:0,boxSizing:'border-box'}}>
  {clip.sound.title}
  <Box sx={{position:'absolute',bottom:0,left:0,width:'100%',height:`${percent}%`,bgcolor:'rgba(185,245,255,.15)',pointerEvents:'none'}}/>
  <Box role="slider" aria-label={`Âm lượng ${clip.sound.title}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} tabIndex={0} title={`Âm lượng ${percent}% · Kéo lên/xuống`}
   onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}
   onPointerDown={e=>{if(e.button!==0)return;e.stopPropagation();e.preventDefault();onSelect();drag.current={y:e.clientY,volume:clip.volume};e.currentTarget.setPointerCapture(e.pointerId);}}
   onPointerMove={e=>{if(!drag.current)return;e.stopPropagation();onVolume(Math.max(0,Math.min(1,drag.current.volume+(drag.current.y-e.clientY)/32)));}}
   onPointerUp={e=>{e.stopPropagation();drag.current=null;e.currentTarget.releasePointerCapture(e.pointerId);}}
   onPointerCancel={()=>{drag.current=null;}}
   onKeyDown={e=>{if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();onSelect();onVolume(Math.max(0,Math.min(1,clip.volume+(e.key==='ArrowUp'?.05:-.05))));}}}
   sx={{position:'absolute',bottom:`clamp(0px, calc(${percent}% - 4px), calc(100% - 8px))`,left:0,width:'100%',height:8,cursor:'ns-resize',textIndent:0,touchAction:'none','&:hover,&:focus-visible':{bgcolor:'rgba(185,245,255,.3)',outline:'1px solid #b9f5ff'},'&::after':{content:'""',position:'absolute',bottom:3,left:0,width:'100%',height:2,bgcolor:'#ecfeff',borderRadius:1}}}/>
 </Box>;
}
