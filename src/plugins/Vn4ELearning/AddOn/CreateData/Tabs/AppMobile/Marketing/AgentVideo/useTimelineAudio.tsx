import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import React from 'react';
import {TimelineAudioPlayback} from 'helpers/timelineAudioPlayback';
import {waitForAudioMetadata,waitForAudioData} from 'helpers/audioMetadata';
import {TimelineAudioOutput} from 'helpers/timelineAudioOutput';
import {registerTimelineAudioReadiness} from 'helpers/timelineAudioReadiness';
import {Alert,Box,Button,Dialog,DialogActions,DialogContent,DialogContentText,DialogTitle,Divider,ListItemIcon,ListItemText,Menu,MenuItem,Stack,TextField,Typography} from '@mui/material';
import type {TimelineRow} from '@xzdarcy/timeline-engine';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {LibrarySound,librarySoundUrl,loadLibrarySoundBlobUrl} from 'helpers/modelAudio';
import {constrainTimelineAudio,timelineAudioBeatBounds,openVideoPixabayAudio,TimelineAudioClip,TimelineAudioPlanEntry,timelineAudioApi,timelineAudioMaxDuration,packTimelineAudio} from 'helpers/timelineAudio';

export type PublicTimelineAudioClip = TimelineAudioClip & {
 sound: TimelineAudioClip['sound'] & { preview_url: string };
};

export default function useTimelineAudio(videoId:number,time:number,playing:boolean,total:number,beatSections:ReadonlyArray<{id:string;startSec:number;endSec:number}>=[],publicClips?:PublicTimelineAudioClip[]){
 const [clips,setClips]=React.useState<TimelineAudioClip[]>(()=>publicClips?.map(c=>constrainTimelineAudio(c,beatSections))||[]),[suggestions,setSuggestions]=React.useState<Record<string,TimelineAudioPlanEntry>>({}),[revision,setRevision]=React.useState(''),[dirty,setDirty]=React.useState(false),[error,setError]=React.useState(''),[playbackError,setPlaybackError]=React.useState(''),[busy,setBusy]=React.useState(false),[library,setLibrary]=React.useState(false),[selected,setSelected]=React.useState(''),[infoId,setInfoId]=React.useState(''),[uiEpoch]=React.useState(0),[pendingDeleteId,setPendingDeleteId]=React.useState(''),[menu,setMenu]=React.useState<{id:string;x:number;y:number}|null>(null);
 const audioLoaded=React.useRef(false),audioLoad=React.useRef<Promise<void>>(Promise.resolve());
 const audio=React.useRef(new Map<string,HTMLAudioElement>()),metadataLoads=React.useRef(new Map<string,AbortController>()),blobUrls=React.useRef(new Map<string,string>()),audioFiles=React.useRef(new Map<string,string>()),clipsRef=React.useRef(clips),dirtyRef=React.useRef(false),busyRef=React.useRef(false),editingRef=React.useRef(false);clipsRef.current=clips;dirtyRef.current=dirty;
 React.useEffect(()=>{if(publicClips){audioLoaded.current=true;return;}let active=true;audioLoaded.current=false;dirtyRef.current=false;setClips([]);setSuggestions({});setSelected('');setInfoId('');setMenu(null);setPendingDeleteId('');setDirty(false);setRevision('');const load=()=>{if(videoId<=0)return;audioLoad.current=timelineAudioApi(videoId).then(r=>{if(!active)return;if(!r.success)throw new Error(r.message);audioLoaded.current=true;if(!dirtyRef.current&&!editingRef.current){setClips(packTimelineAudio((r.clips||[]).map(c=>constrainTimelineAudio(c,beatSections))));setRevision(r.revision);}setSuggestions(r.suggestions||{});}).catch(e=>{if(active)setError(String(e.message));});};load();const timer=window.setInterval(load,6000);const refresh=(event:Event)=>{const d=(event as CustomEvent).detail;if(d?.videoId===videoId)load();};document.addEventListener('timeline-audio-suggestions-updated',refresh);return()=>{active=false;window.clearInterval(timer);document.removeEventListener('timeline-audio-suggestions-updated',refresh);};},[videoId,publicClips]);
 const output=React.useMemo(()=>new TimelineAudioOutput(),[videoId]);
 const unlockAudioContext=React.useCallback(()=>{void output.ready().catch(audioContextError=>{console.warn('Timeline audio context is unavailable',audioContextError);});},[output]);
 React.useEffect(()=>{document.addEventListener('pointerdown',unlockAudioContext,true);document.addEventListener('keydown',unlockAudioContext,true);return()=>{document.removeEventListener('pointerdown',unlockAudioContext,true);document.removeEventListener('keydown',unlockAudioContext,true);};},[unlockAudioContext]);
 React.useEffect(()=>{if(publicClips?.length)unlockAudioContext();},[publicClips,unlockAudioContext]);
 const createAudio=React.useCallback((id:string,url:string)=>{
  const a=new Audio(url);a.preload='auto';
  try{output.attach(a);}catch(error){a.pause();output.release(a);throw error;}
  audio.current.set(id,a);metadataLoads.current.set(id,new AbortController());return a;
 },[output]);
 const applyAudioSample=React.useCallback((clip:TimelineAudioClip,a:HTMLAudioElement,volume:number)=>{output.apply(a,volume,clip.speed||1);},[output]);
 const playback=React.useMemo(()=>new TimelineAudioPlayback(async (clip,isCurrent)=>{
  if(audioFiles.current.get(clip.id)!==clip.sound.file||audio.current.get(clip.id)?.error){
   metadataLoads.current.get(clip.id)?.abort();metadataLoads.current.delete(clip.id);
   const old=audio.current.get(clip.id);if(old){old.pause();output.release(old);}audio.current.delete(clip.id);
   const oldUrl=blobUrls.current.get(clip.id);if(oldUrl)URL.revokeObjectURL(oldUrl);blobUrls.current.delete(clip.id);
  }
  let a=audio.current.get(clip.id);
  if(!a){
   let url=blobUrls.current.get(clip.id);
   if(!url){if(publicClips){
     const source=publicClips.find(item=>item.id===clip.id)?.sound.preview_url;
     if(!source)throw new Error('Thiếu URL âm thanh preview.');
     const response=await fetch(source,{credentials:'omit'});
     if(!response.ok)throw new Error('Không tải được âm thanh preview.');
     url=URL.createObjectURL(await response.blob());
    }else{
     url=await loadLibrarySoundBlobUrl(clip.sound.file);
    }if(!isCurrent()){URL.revokeObjectURL(url);throw new Error('Playback disposed');}blobUrls.current.set(clip.id,url);}
   audioFiles.current.set(clip.id,clip.sound.file);a=createAudio(clip.id,url);
  }
  try{await waitForAudioMetadata(a,10000,metadataLoads.current.get(clip.id)?.signal);}catch(error){
   // Discard only this failed element. A replay must not reuse poisoned metadata.
   a.pause();
   if(audio.current.get(clip.id)===a){
    metadataLoads.current.get(clip.id)?.abort();metadataLoads.current.delete(clip.id);
    audio.current.delete(clip.id);audioFiles.current.delete(clip.id);
    output.release(a);
    const url=blobUrls.current.get(clip.id);if(url)URL.revokeObjectURL(url);blobUrls.current.delete(clip.id);
   }
   throw error;
  }
  return a;
 },applyAudioSample,(error,clip)=>{console.warn('Timeline sound playback failed',clip?.id,clip?.sound.file,error);setPlaybackError('Không phát được '+(clip?.sound.title||clip?.id||'âm thanh')+': '+(error instanceof Error?error.message:String(error)));},undefined,async(media,clip)=>{await waitForAudioData(media,10000,metadataLoads.current.get(clip.id)?.signal);if(!publicClips)await output.ready();}),[videoId,createAudio,applyAudioSample,output,publicClips]);
 React.useEffect(()=>registerTimelineAudioReadiness(videoId,async(start,end)=>{
  if(!audioLoaded.current)await audioLoad.current;
  if(!audioLoaded.current)throw new Error('Chưa tải được danh sách âm thanh của video.');
  const needed=clipsRef.current.filter(clip=>!clip.muted&&clip.start_sec<end&&clip.start_sec+clip.duration_sec>start);
  await playback.prepareClips(needed);
 }),[videoId,playback]);
 React.useEffect(()=>{
  const index=beatSections.findIndex(beat=>beat.endSec>time);
  const upcoming=index<0?[]:beatSections.slice(index,index+3);
  const preload=new Set(clips.filter(clip=>!clip.muted&&((clip.start_sec<time+8&&clip.start_sec+clip.duration_sec>time)||upcoming.some(beat=>clip.start_sec<beat.endSec&&clip.start_sec+clip.duration_sec>beat.startSec))).map(clip=>clip.id));
  playback.sync(time,playing,clips,preload);
 },[time,playing,clips,playback,beatSections]);
 React.useEffect(()=>()=>{playback.dispose();metadataLoads.current.forEach(controller=>controller.abort());metadataLoads.current.clear();audio.current.forEach(a=>a.pause());audio.current.clear();audioFiles.current.clear();blobUrls.current.forEach(url=>URL.revokeObjectURL(url));blobUrls.current.clear();output.dispose();},[playback,output]);
 const change=(next:TimelineAudioClip[])=>{dirtyRef.current=true;setClips(packTimelineAudio(next.map(c=>constrainTimelineAudio(c,beatSections))));setDirty(true);setError('');};
 const patch=(id:string,p:Partial<TimelineAudioClip>)=>change(clips.map(c=>{if(c.id!==id)return c;const beat=timelineAudioBeatBounds(c,beatSections);return {...c,...p,...(beat?{event_beat_id:beat.id}:{}),...(p.speed?{duration_sec:c.duration_sec*(c.speed||1)/p.speed}:{})};}));
 const add=(s:LibrarySound)=>{const start=Math.max(0,time),duration=Math.max(.05,Math.min(s.duration_sec,total-start));const id='audio_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);change([...clips,{id,sound_id:s.id,sound:s,start_sec:start,duration_sec:duration,offset_sec:0,volume:1,loop:false,speed:1,fade_in:0,fade_out:0}]);setSelected(id);setLibrary(false);};
 const save=async()=>{if(busyRef.current||editingRef.current||!dirtyRef.current||!revision)return;busyRef.current=true;setBusy(true);setError('');const submitted=clips;try{const r=await timelineAudioApi(videoId,submitted,revision);if(!r.success)throw new Error(r.message);setRevision(r.revision);if(clipsRef.current===submitted&&!editingRef.current){setClips(packTimelineAudio(r.clips));dirtyRef.current=false;setDirty(false);}}catch(e){setError(e instanceof Error?e.message:'Không lưu được âm thanh.');}finally{busyRef.current=false;setBusy(false);}};
 React.useEffect(()=>{if(!dirty||busy||error||!revision)return;const timer=window.setTimeout(()=>void save(),700);return()=>window.clearTimeout(timer);},[busy,clips,dirty,error,revision]);
 const laneCount=clips.length?Math.max(...clips.map(c=>c.lane||0))+2:0;
 const rows=React.useMemo<TimelineRow[]>(()=>Array.from({length:laneCount},(_,lane)=>({id:'audio_lane_'+lane,classNames:['audio-lane-'+lane],actions:clips.filter(c=>(c.lane||0)===lane).map(c=>({id:c.id,start:c.start_sec,end:c.start_sec+c.duration_sec,effectId:'audio',minStart:timelineAudioBeatBounds(c,beatSections)?.startSec??0,maxEnd:timelineAudioBeatBounds(c,beatSections)?.endSec??Math.max(total,c.start_sec+c.duration_sec),selected:c.id===selected,movable:false,flexible:false}))})),[clips,laneCount,selected,total,beatSections]);
 const edit=clips.find(c=>c.id===infoId);
 const planningCount=Object.values(suggestions).filter(plan=>plan.status==='queued'||plan.status==='processing').length;
 const failedPlanCount=Object.values(suggestions).filter(plan=>plan.status==='failed').length;
 const move=(id:string)=>{const clip=clips.find(c=>c.id===id);if(!clip)return;const beat=beatSections.find(s=>clip.start_sec>=s.startSec&&clip.start_sec<s.endSec)||beatSections.find(s=>s.id===clip.event_beat_id);patch(id,{start_sec:Math.max(0,beat?.startSec??0)});};
 const deleteClip=clips.find(c=>c.id===pendingDeleteId);
 const remove=(id:string)=>{change(clips.filter(c=>c.id!==id));setSelected('');setInfoId('');};
 const controls=publicClips?null:<><Button size="small" sx={{whiteSpace:'nowrap',flexShrink:0,fontSize:12,textTransform:'none'}} onClick={()=>setLibrary(true)}>Âm thanh của video</Button>{planningCount>0&&<Typography variant="caption" color="info.light" sx={{whiteSpace:'nowrap',flexShrink:0}}>Đang đồng bộ {planningCount} sự kiện âm thanh…</Typography>}{failedPlanCount>0&&<Typography variant="caption" color="error" sx={{whiteSpace:'nowrap',flexShrink:0}}>{failedPlanCount} beat có lỗi âm thanh</Typography>}{selected&&<Typography variant="caption" sx={{whiteSpace:'nowrap',flexShrink:0}}>Âm lượng {Math.round((clips.find(c=>c.id===selected)?.volume||0)*100)}%</Typography>}{dirty&&<Typography variant="caption" color={error?'error':'text.secondary'} sx={{whiteSpace:'nowrap',flexShrink:0}}>{error|| (busy?'Đang tự lưu…':'Đang chờ tự lưu…')}</Typography>}{playbackError&&<Typography variant="caption" color="error" sx={{whiteSpace:'nowrap',flexShrink:0}}>{playbackError}</Typography>}{error&&<Button size="small" sx={{whiteSpace:'nowrap',flexShrink:0,fontSize:12,textTransform:'none'}} onClick={()=>setError('')}>Thử lưu lại</Button>}{playbackError&&<Button size="small" sx={{whiteSpace:'nowrap',flexShrink:0,fontSize:12,textTransform:'none'}} onClick={()=>{setPlaybackError('');playback.retryFailed();}}>Thử phát lại</Button>}</>;
 const dialogs=publicClips?null:<><DrawerCustom open={library} onClose={()=>setLibrary(false)} title="Âm thanh riêng của video" width={520}><Stack spacing={1}>{Array.from(new Map(clips.filter(c=>c.sound.video_id===videoId).map(c=>[c.sound.id,c.sound])).values()).map(sound=><Button key={sound.id} onClick={()=>add(sound)}>{sound.title}</Button>)}{!clips.some(c=>c.sound.video_id===videoId)&&<Typography>Chưa có âm thanh riêng. Lưu HTML beat để tạo âm thanh code; bấm sự kiện tự nhiên trên timeline để chọn tại Pixabay.</Typography>}</Stack></DrawerCustom><Menu open={!!menu} onClose={()=>setMenu(null)} anchorReference="anchorPosition" anchorPosition={menu?{left:menu.x,top:menu.y}:undefined} PaperProps={{sx:{minWidth:230}}} MenuListProps={{dense:true,sx:{py:.5}}}>
  <MenuItem onClick={()=>{if(menu)setInfoId(menu.id);setMenu(null);}}><ListItemIcon><InfoOutlinedIcon fontSize="small"/></ListItemIcon><ListItemText>Thông tin</ListItemText></MenuItem>
  <Divider sx={{my:.5}}/>
  <MenuItem onClick={()=>{if(menu)move(menu.id);setMenu(null);}}><ListItemIcon><FirstPageIcon fontSize="small"/></ListItemIcon><ListItemText>Đưa lên đầu beat</ListItemText></MenuItem>
  <MenuItem sx={{color:clips.find(c=>c.id===menu?.id)?.muted?'success.main':'error.main'}} onClick={()=>{if(menu){const clip=clips.find(c=>c.id===menu.id);if(clip)patch(clip.id,{muted:!clip.muted});}setMenu(null);}}><ListItemIcon sx={{color:'inherit'}}>{clips.find(c=>c.id===menu?.id)?.muted?<VolumeUpIcon fontSize="small"/>:<VolumeOffIcon fontSize="small"/>}</ListItemIcon><ListItemText>{clips.find(c=>c.id===menu?.id)?.muted?'Bật âm thanh':'Tắt âm thanh'}</ListItemText></MenuItem>
  <Divider sx={{my:.5}}/>
  <MenuItem sx={{color:'error.main'}} onClick={()=>{if(menu)setPendingDeleteId(menu.id);setMenu(null);}}><ListItemIcon sx={{color:'inherit'}}><DeleteOutlineIcon fontSize="small"/></ListItemIcon><ListItemText>Xoá</ListItemText></MenuItem>
 </Menu><Dialog open={!!deleteClip} onClose={()=>setPendingDeleteId('')} aria-labelledby="timeline-delete-audio-title"><DialogTitle id="timeline-delete-audio-title">Xoá âm thanh?</DialogTitle><DialogContent><DialogContentText>Bạn muốn xoá “{deleteClip?.sound.title}” khỏi timeline?</DialogContentText></DialogContent><DialogActions><Button autoFocus onClick={()=>setPendingDeleteId('')}>Huỷ</Button><Button color="error" variant="contained" onClick={()=>{if(deleteClip)remove(deleteClip.id);setPendingDeleteId('');}}>Xoá âm thanh</Button></DialogActions></Dialog><DrawerCustom open={!!edit} onClose={()=>setInfoId('')} title="Âm thanh trên timeline" width={520} activeOnClose>{edit&&<Stack spacing={2}>
  <Typography fontWeight={700}>{edit.sound.title}</Typography><Button color={edit.muted?'success':'error'} onClick={()=>patch(edit.id,{muted:!edit.muted})}>{edit.muted?'Bật âm thanh':'Tắt âm thanh'}</Button>{edit.muted&&<Alert severity="warning">Đã tắt âm trong preview và video xuất. Clip và âm lượng vẫn được giữ lại.</Alert>}<Alert severity="info">Âm thanh gắn với beat chỉ được di chuyển và đổi độ dài trong beat đó. Kéo clip để di chuyển, kéo hai đầu để đổi độ dài. Mọi thay đổi sẽ tự lưu sau khi bạn dừng chỉnh sửa.</Alert>
  <Box component="audio" controls src={librarySoundUrl(edit.sound.file)} sx={{width:'100%'}}/>
  <Typography variant="caption" color="text.secondary">Giới hạn theo file và tốc độ: {timelineAudioMaxDuration(edit).toFixed(3)} giây.</Typography>
  {([['start_sec','Bắt đầu (giây)'],['duration_sec','Độ dài (giây)'],['offset_sec','Bắt đầu từ trong file (giây)'],['speed','Tốc độ phát (0.25–4×)'],['volume','Âm lượng (0–2; 1 = 100%, 2 = 200%)'],['fade_in','Fade in (giây)'],['fade_out','Fade out (giây)']] as const).map(([key,label])=><TextField key={key} size="small" type="number" label={label} value={edit[key]??1} inputProps={{min:0,step:.1,...(key==='volume'?{max:2}:key==='speed'?{min:.25,max:4}:key==='duration_sec'?{max:timelineAudioMaxDuration(edit)}:{})}} onChange={e=>patch(edit.id,{[key]:Number(e.target.value)})}/>)}
  {!dirty&&<Alert severity="success">Đã lưu vào video.</Alert>}{dirty&&!error&&<Alert severity="info">{busy?'Đang tự lưu thay đổi…':'Thay đổi sẽ tự lưu sau khi bạn dừng chỉnh sửa.'}</Alert>}{error&&<Alert severity="error">{error}</Alert>}{playbackError&&<Alert severity="error">{playbackError}</Alert>}<Stack direction="row" spacing={1}><Button color="error" onClick={()=>setPendingDeleteId(edit.id)}>Xóa khỏi timeline</Button></Stack>
 </Stack>}</DrawerCustom></>;
 const openSuggestion=async(markerId:string)=>{for(const [beatId,entry] of Object.entries(suggestions)){const item=(entry.suggestions||[]).find(s=>`suggestion_${beatId}_${s.id}`===markerId);if(item){try{setError('');const result=await openVideoPixabayAudio(videoId,beatId,item.id);if(!result.success)throw new Error(result.message||'Không mở được Pixabay');}catch(error){setError(error instanceof Error?error.message:String(error));}return;}}};
 return {playbackError,setEditing:(active:boolean)=>{editingRef.current=active;},commitEdit:(id:string,start:number,end:number,lane?:number)=>patch(id,{start_sec:start,duration_sec:end-start,...(lane!==undefined?{lane}:{})}),rows,clips,suggestions,controls,dialogs,uiEpoch,selected,select:setSelected,openSuggestion,patch,contextMenu:(id:string,x:number,y:number)=>{setSelected(id);setMenu({id,x,y});},canResize:(id:string,start:number,end:number)=>{const c=clips.find(c=>c.id===id);if(!c)return false;const beat=timelineAudioBeatBounds(c,beatSections);return end-start<=timelineAudioMaxDuration(c)+.00001&&start>=(beat?.startSec??0)-.00001&&end<=(beat?.endSec??total)+.00001&&end>start;},changeRows:(data:TimelineRow[],drop?:{id:string;lane:number})=>{
  const actions=data.flatMap(r=>r.actions);
  const next=clips.map(c=>{const a=actions.find(a=>a.id===c.id);const beat=timelineAudioBeatBounds(c,beatSections);return a?{...c,...(beat?{event_beat_id:beat.id}:{}),start_sec:Math.max(0,a.start),duration_sec:Math.max(.01,a.end-a.start),...(drop?.id===c.id?{lane:drop.lane}:{})}:c;});
  change(next);return true;
 }};
}
