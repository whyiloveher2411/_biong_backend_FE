import React from 'react';
import {Box} from '@mui/material';
import {resolveTimelineAudioDrag,timelineAudioMaxDuration,type TimelineAudioClip} from 'helpers/timelineAudio';

type Mode='move'|'left'|'right';
type Props={clip:TimelineAudioClip;pixelsPerSecond:number;bounds:{start:number;end:number};getScrollLeft:()=>number;scrollTo:(left:number)=>void;getViewport:()=>DOMRect|undefined;onCommit:(start:number,end:number,y:number)=>void;onEditing:(active:boolean)=>void;children:React.ReactNode};
type Gesture={pointerId:number;pointerStart:number;x:number;y:number;scroll:number;mode:Mode;start:number;end:number};

/** Follow absolute pointer coordinates and actual scroll, not accumulated library deltas. */
export default function TimelineAudioEditableClip({clip,pixelsPerSecond,bounds,getScrollLeft,scrollTo,getViewport,onCommit,onEditing,children}:Props){
 const root=React.useRef<HTMLDivElement>(null);
 const drag=React.useRef<Gesture|null>(null);
 const frame=React.useRef<number|null>(null);
 const [editing,setEditing]=React.useState(false);
 const listeners=React.useRef<(()=>void)|null>(null);
 const update=()=>{
  const d=drag.current;if(!d)return;
  const delta=(d.x-d.pointerStart+getScrollLeft()-d.scroll)/pixelsPerSecond;
  const next=resolveTimelineAudioDrag(clip,delta,d.mode,bounds);
  d.start=next.start;d.end=next.end;
  const element=root.current;if(element){element.style.left=((next.start-clip.start_sec)*pixelsPerSecond)+'px';element.style.width=((next.end-next.start)*pixelsPerSecond)+'px';}
 };
 const stopFrame=()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);frame.current=null;};
 const atLimit=(d:Gesture,speed:number)=>{
  const epsilon=.00001,maxDuration=timelineAudioMaxDuration(clip),minDuration=Math.min(.01,clip.duration_sec);
  if(d.mode==='move')return speed>0?d.end>=bounds.end-epsilon:d.start<=bounds.start+epsilon;
  if(d.mode==='right')return speed>0
   ?d.end>=Math.min(bounds.end,clip.start_sec+maxDuration)-epsilon
   :d.end<=clip.start_sec+minDuration+epsilon;
  return speed<0
   ?d.start<=Math.max(bounds.start,clip.start_sec+clip.duration_sec-maxDuration)+epsilon
   :d.start>=clip.start_sec+clip.duration_sec-minDuration-epsilon;
 };
 const tick=()=>{
  const d=drag.current;if(!d)return;
  const rect=getViewport();
  if(rect){
   const speed=d.x>rect.right-32?Math.min(12,(d.x-rect.right+32)/3)
    :d.x<rect.left+32?-Math.min(12,(rect.left+32-d.x)/3):0;
   if(speed&&!atLimit(d,speed))scrollTo(Math.max(0,getScrollLeft()+speed));
  }
  update();frame.current=requestAnimationFrame(tick);
 };
 const finish=(event?:PointerEvent,cancel=false)=>{
  const d=drag.current;if(!d)return;
  if(event&&event.pointerId!==d.pointerId)return;
  if(event&&Number.isFinite(event.clientX)){d.x=event.clientX;d.y=event.clientY;}
  update();stopFrame();drag.current=null;
  listeners.current?.();listeners.current=null;
  const element=root.current;
  if(element?.hasPointerCapture?.(d.pointerId))element.releasePointerCapture?.(d.pointerId);
  if(element){element.style.left='0px';element.style.width='100%';}
  setEditing(false);onEditing(false);
  if(!cancel)onCommit(d.start,d.end,d.y);
 };
 const begin=(e:React.PointerEvent,mode:Mode)=>{
  if(e.button!==0||drag.current)return;
  e.preventDefault();e.stopPropagation();
  drag.current={pointerId:e.pointerId,pointerStart:e.clientX,x:e.clientX,y:e.clientY,scroll:getScrollLeft(),mode,start:clip.start_sec,end:clip.start_sec+clip.duration_sec};
  // Native window listeners keep receiving fast moves outside the small resize handle,
  // even when a timeline re-render causes the browser to lose pointer capture.
  const move=(event:PointerEvent)=>{
   const d=drag.current;if(!d||event.pointerId!==d.pointerId)return;
   if((event.buttons&1)===0){finish();return;}
   event.preventDefault();event.stopPropagation();d.x=event.clientX;d.y=event.clientY;update();
  };
  const up=(event:PointerEvent)=>{if(event.pointerId===drag.current?.pointerId){event.stopPropagation();finish(event);}};
  const cancel=(event:PointerEvent)=>finish(event,true);
  const blur=()=>finish(undefined,true);
  window.addEventListener('pointermove',move,{capture:true,passive:false});
  window.addEventListener('pointerup',up,true);
  window.addEventListener('pointercancel',cancel,true);
  window.addEventListener('blur',blur);
  listeners.current=()=>{window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',blur);};
  try{root.current?.setPointerCapture(e.pointerId);}catch{/* Window listeners remain active when capture is unavailable. */}
  setEditing(true);onEditing(true);stopFrame();frame.current=requestAnimationFrame(tick);
 };
 React.useEffect(()=>()=>{
  stopFrame();listeners.current?.();listeners.current=null;
  if(drag.current){drag.current=null;onEditing(false);}
 },[]);
 return <Box ref={root} data-audio-clip-id={clip.id} data-audio-editing={editing}
  onPointerDown={e=>begin(e,'move')}
  sx={{position:'absolute',left:0,top:0,width:'100%',height:'100%',overflow:'visible',touchAction:'none',cursor:editing?'grabbing':'grab',zIndex:editing?20:undefined}}>
  {children}
  {(['left','right'] as const).map(side=><Box key={side} data-audio-resize={side} onPointerDown={e=>begin(e,side)}
   sx={{position:'absolute',[side]:-3,top:3,bottom:3,width:6,zIndex:4,bgcolor:'rgba(115,215,229,.3)',cursor:'ew-resize',borderRadius:.5,'&:hover':{bgcolor:'#73d7e5'},'&::after':{content:'""',position:'absolute',left:2,top:2,bottom:2,width:2,bgcolor:'#ecfeff'}}}/>)}
 </Box>;
}
