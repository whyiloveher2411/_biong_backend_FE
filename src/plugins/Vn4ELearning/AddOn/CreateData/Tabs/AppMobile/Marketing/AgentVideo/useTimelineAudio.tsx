import React from 'react';
import {Alert,Box,Button,Menu,MenuItem,Stack,TextField,Typography} from '@mui/material';
import type {TimelineRow} from '@xzdarcy/timeline-engine';
import DrawerCustom from 'components/molecules/DrawerCustom';
import SoundLibraryDrawer from '../SoundLibraryDrawer';
import {LibrarySound,librarySoundUrl} from 'helpers/modelAudio';
import {TimelineAudioClip,timelineAudioApi,timelineAudioSample,timelineAudioMaxDuration,normalizeTimelineAudio,packTimelineAudio,timelineAudioOverlap} from 'helpers/timelineAudio';

export default function useTimelineAudio(videoId:number,time:number,playing:boolean,total:number){
 const [clips,setClips]=React.useState<TimelineAudioClip[]>([]),[revision,setRevision]=React.useState(''),[dirty,setDirty]=React.useState(false),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[library,setLibrary]=React.useState(false),[selected,setSelected]=React.useState(''),[infoId,setInfoId]=React.useState(''),[uiEpoch,setUiEpoch]=React.useState(0),[menu,setMenu]=React.useState<{id:string;x:number;y:number}|null>(null);
 const audio=React.useRef(new Map<string,HTMLAudioElement>()),clipsRef=React.useRef(clips);clipsRef.current=clips;
 React.useEffect(()=>{let active=true;setClips([]);setSelected('');setInfoId('');setDirty(false);setRevision('');if(videoId>0)void timelineAudioApi(videoId).then(r=>{if(!active)return;if(!r.success)throw new Error(r.message);setClips(packTimelineAudio((r.clips||[]).map(normalizeTimelineAudio)));setRevision(r.revision);}).catch(e=>active&&setError(String(e.message)));return()=>{active=false;};},[videoId]);
 const stop=React.useCallback(()=>{audio.current.forEach(a=>a.pause());},[]);
 const sync=React.useCallback((t:number,on:boolean)=>{
  const active=new Set<string>();
  for(const c of clipsRef.current){const sample=timelineAudioSample(c,t);if(!on||!sample){audio.current.get(c.id)?.pause();continue;}active.add(c.id);
   let a=audio.current.get(c.id);if(!a){a=new Audio(librarySoundUrl(c.sound.file));a.preload='auto';audio.current.set(c.id,a);}a.loop=false;a.playbackRate=c.speed||1;a.volume=sample.volume;
   if(Number.isFinite(a.duration)&&Math.abs(a.currentTime-sample.offset)>.15)a.currentTime=sample.offset;
   if(a.paused)void a.play().catch(()=>setError('Không phát được âm thanh. Bấm Phát lại hoặc kiểm tra file trong thư viện.'));
  }
  audio.current.forEach((a,id)=>{if(!active.has(id))a.pause();});
 },[]);
 React.useEffect(()=>{sync(time,playing);},[time,playing,clips,sync]);
 React.useEffect(()=>{const handler=(e:Event)=>{const d=(e as CustomEvent).detail;if(d.videoId===videoId)sync(d.time,d.playing);};document.addEventListener('timeline-audio-playhead',handler);return()=>{document.removeEventListener('timeline-audio-playhead',handler);stop();audio.current.clear();};},[videoId,sync,stop]);
 const change=(next:TimelineAudioClip[])=>{setClips(packTimelineAudio(next.map(normalizeTimelineAudio)));setDirty(true);setError('');};
 const patch=(id:string,p:Partial<TimelineAudioClip>)=>change(clips.map(c=>c.id===id?{...c,...p,...(p.speed?{duration_sec:c.duration_sec*(c.speed||1)/p.speed}:{})}:c));
 const add=(s:LibrarySound)=>{const id='audio_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);change([...clips,{id,sound_id:s.id,sound:s,start_sec:Math.max(0,time),duration_sec:Math.max(.05,Math.min(s.duration_sec,total-time)),offset_sec:0,volume:.3,loop:false,speed:1,fade_in:0,fade_out:0}]);setSelected(id);setLibrary(false);};
 const save=async()=>{setBusy(true);setError('');try{const r=await timelineAudioApi(videoId,clips,revision);if(!r.success)throw new Error(r.message);setClips(packTimelineAudio(r.clips));setRevision(r.revision);setDirty(false);}catch(e){setError(e instanceof Error?e.message:'Không lưu được âm thanh.');}finally{setBusy(false);}};
 const laneCount=clips.length?Math.max(...clips.map(c=>c.lane||0))+2:0;
 const rows:TimelineRow[]=Array.from({length:laneCount},(_,lane)=>({id:'audio_lane_'+lane,classNames:['audio-lane-'+lane],actions:clips.filter(c=>(c.lane||0)===lane).map(c=>({id:c.id,start:c.start_sec,end:c.start_sec+c.duration_sec,effectId:'audio',minStart:0,maxEnd:Math.max(total,c.start_sec+c.duration_sec),selected:c.id===selected,movable:true,flexible:true}))}));
 const edit=clips.find(c=>c.id===infoId);
 const move=(id:string)=>patch(id,{start_sec:Math.max(0,time)});
 const remove=(id:string)=>{change(clips.filter(c=>c.id!==id));setSelected('');setInfoId('');};
 const controls=<><Button size="small" sx={{whiteSpace:'nowrap',flexShrink:0,fontSize:12,textTransform:'none'}} onClick={()=>setLibrary(true)}>Thêm âm thanh</Button>{selected&&<Typography variant="caption" sx={{whiteSpace:'nowrap',flexShrink:0}}>Âm lượng {Math.round((clips.find(c=>c.id===selected)?.volume||0)*100)}%</Typography>}{dirty&&<Button size="small" sx={{whiteSpace:'nowrap',flexShrink:0,fontSize:12,textTransform:'none'}} variant="contained" disabled={busy||!revision} onClick={()=>void save()}>{busy?'Đang lưu…':'Lưu âm thanh'}</Button>}{error&&<Typography color="error" variant="caption">{error}</Typography>}</>;
 const dialogs=<><SoundLibraryDrawer open={library} onClose={()=>setLibrary(false)} onSelect={add}/><Menu open={!!menu} onClose={()=>setMenu(null)} anchorReference="anchorPosition" anchorPosition={menu?{left:menu.x,top:menu.y}:undefined}><MenuItem onClick={()=>{if(menu)move(menu.id);setMenu(null);}}>Đưa đến đầu playhead</MenuItem><MenuItem onClick={()=>{if(menu)setInfoId(menu.id);setMenu(null);}}>Xem thông tin</MenuItem><MenuItem onClick={()=>{if(menu)remove(menu.id);setMenu(null);}} sx={{color:'error.main'}}>Xoá</MenuItem></Menu><DrawerCustom open={!!edit} onClose={()=>setInfoId('')} title="Âm thanh trên timeline" width={520} activeOnClose>{edit&&<Stack spacing={2}>
  <Typography fontWeight={700}>{edit.sound.title}</Typography><Alert severity="info">Dùng thời gian toàn video, có thể trải qua nhiều beat. Kéo clip để di chuyển, kéo hai đầu để đổi độ dài. Bấm Lưu âm thanh để áp dụng vào video xuất.</Alert>
  <Box component="audio" controls src={librarySoundUrl(edit.sound.file)} sx={{width:'100%'}}/>
  <Typography variant="caption" color="text.secondary">Giới hạn theo file và tốc độ: {timelineAudioMaxDuration(edit).toFixed(3)} giây.</Typography>
  {([['start_sec','Bắt đầu (giây)'],['duration_sec','Độ dài (giây)'],['offset_sec','Bắt đầu từ trong file (giây)'],['speed','Tốc độ phát (0.25–4×)'],['volume','Âm lượng (0–1)'],['fade_in','Fade in (giây)'],['fade_out','Fade out (giây)']] as const).map(([key,label])=><TextField key={key} size="small" type="number" label={label} value={edit[key]??1} inputProps={{min:0,step:.1,...(key==='volume'?{max:1}:key==='speed'?{min:.25,max:4}:key==='duration_sec'?{max:timelineAudioMaxDuration(edit)}:{})}} onChange={e=>patch(edit.id,{[key]:Number(e.target.value)})}/>)}
  {!dirty&&<Alert severity="success">Đã lưu vào video.</Alert>}{error&&<Alert severity="error">{error}</Alert>}<Stack direction="row" spacing={1}><Button disabled={busy||!revision} variant="contained" onClick={()=>void save()}>Lưu âm thanh</Button><Button color="error" onClick={()=>{remove(edit.id);}}>Xóa khỏi timeline</Button></Stack>
 </Stack>}</DrawerCustom></>;
 return {rows,clips,controls,dialogs,uiEpoch,selected,select:setSelected,patch,contextMenu:(id:string,x:number,y:number)=>{setSelected(id);setMenu({id,x,y});},canResize:(id:string,start:number,end:number)=>{const c=clips.find(c=>c.id===id);return !c||(end-start<=timelineAudioMaxDuration(c)+.00001&&end>start&&!clips.some(other=>other.id!==id&&other.lane===c.lane&&timelineAudioOverlap(other,{start_sec:start,duration_sec:end-start}))); },changeRows:(data:TimelineRow[],drop?:{id:string;lane:number})=>{
  const actions=data.flatMap(r=>r.actions);
  const next=clips.map(c=>{const a=actions.find(a=>a.id===c.id);return a?{...c,start_sec:Math.max(0,a.start),duration_sec:Math.max(.01,a.end-a.start),...(drop?.id===c.id?{lane:drop.lane}:{})}:c;});
  for(const c of next)if(next.some(other=>other.id!==c.id&&other.lane===c.lane&&timelineAudioOverlap(c,other))){setError('Dòng này đã có âm thanh trong khoảng đó. Chọn khoảng trống hoặc dòng khác.');setUiEpoch(v=>v+1);return false;}
  change(next);return true;
 }};
}
