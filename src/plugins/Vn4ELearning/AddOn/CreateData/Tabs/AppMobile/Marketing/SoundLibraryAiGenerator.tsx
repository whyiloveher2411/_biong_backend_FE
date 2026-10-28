import React from 'react';
import {Alert,Box,Button,Chip,CircularProgress,FormControlLabel,Stack,Switch,TextField,Typography} from '@mui/material';
import {generateLibrarySound,getSoundGeneration,LibrarySound,librarySoundUrl,SoundGenerationJob} from 'helpers/modelAudio';
const KEY='sound-library-ai-pending';
function rememberedJob(){try{return localStorage.getItem(KEY)||'';}catch{return '';}}
function remember(id:string){try{if(id)localStorage.setItem(KEY,id);else localStorage.removeItem(KEY);}catch{ /* Storage may be disabled. */ }}
const presets=[
 {label:'Bước chân',prompt:'Clear footsteps walking on a wooden floor, steady pace, close-up recording, no music or speech.',duration:3,category:'foley',single_event:false},
 {label:'Mở cửa',prompt:'A single wooden door opens slowly with a short creak and handle click, isolated close-up sound, no music or speech.',duration:2,category:'foley',single_event:true},
 {label:'Đường phố',prompt:'Urban street ambience with passing cars and distant traffic, realistic outdoor recording, no music or speech.',duration:5,category:'ambience',single_event:false},
];
export default function SoundLibraryAiGenerator({active,title='',category='foley',license='AudioGen model: CC-BY-NC-4.0 (phi thương mại)',source='https://huggingface.co/facebook/audiogen-medium',initialPrompt='',onCreated,onSelect}:{active:boolean;title?:string;category?:string;license?:string;source?:string;initialPrompt?:string;onCreated?:()=>void;onSelect?:(sound:LibrarySound)=>void}){
 const [form,setForm]=React.useState({prompt:'',duration:3,seed:'',single_event:false});
 const [jobId,setJobId]=React.useState(rememberedJob),[job,setJob]=React.useState<SoundGenerationJob|null>(null),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[now,setNow]=React.useState(Date.now());
 const createdRef=React.useRef(onCreated);createdRef.current=onCreated;
 React.useEffect(()=>{if(active&&initialPrompt.trim())setForm(f=>f.prompt?f:{...f,prompt:initialPrompt.trim()});},[active,initialPrompt]);
 const pending=!!jobId||busy;
 React.useEffect(()=>{if(!active||!jobId)return undefined;let stopped=false;let timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{try{const r=await getSoundGeneration(jobId);if(stopped)return;if(!r.success||!r.job){remember('');setJobId('');throw new Error(r.message||'Không tìm thấy tác vụ.');}setJob(r.job);const options=r.job.options;setForm(f=>f.prompt?f:{...f,prompt:options.prompt,duration:options.duration,single_event:options.single_event});setError('');
   if(r.job.status==='complete'||r.job.status==='failed'){remember('');setJobId('');if(r.job.status==='complete'&&r.job.sound)createdRef.current?.();else setError(r.job.error||'Tạo âm thanh thất bại.');return;}
   timer=setTimeout(poll,2000);
  }catch(e){if(stopped)return;setError(e instanceof Error?e.message:'Chưa đọc được tiến độ.');timer=setTimeout(poll,4000);}};
  void poll();return()=>{stopped=true;clearTimeout(timer);};
 },[active,jobId]);
 React.useEffect(()=>{if(!pending||!active)return undefined;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[pending,active]);
 const start=async()=>{setBusy(true);setError('');setJob(null);try{const r=await generateLibrarySound({title,prompt:form.prompt,duration:Number(form.duration),category,seed:form.seed===''?undefined:Number(form.seed),single_event:form.single_event,license,source});if(!r.success||!r.job)throw new Error(r.message||'Không tạo được tác vụ.');remember(r.job.id);setJob(r.job);setJobId(r.job.id);}catch(e){setError(e instanceof Error?e.message:'Không khởi động được AI.');}finally{setBusy(false);}};
 const seconds=job?Math.max(0,Math.floor((now-new Date(job.started_at||job.created_at).getTime())/1000)):0;
 return <Box sx={{p:2,border:'1px solid',borderColor:'primary.main',borderRadius:2}}><Typography fontWeight={700} sx={{mb:1.5}}>Mô tả file cần tạo {pending?'· Đang xử lý':''}</Typography><Stack spacing={1.5}>
  <Alert severity="info">AudioGen local · model CC-BY-NC-4.0. Dùng thử phi thương mại theo cấu hình đã chọn.</Alert>
  <Stack direction="row" spacing={1} flexWrap="wrap">{presets.map(p=><Chip key={p.label} label={p.label} disabled={pending} onClick={()=>setForm(f=>({...f,prompt:p.prompt,duration:p.duration,single_event:p.single_event}))}/>)}</Stack>
  <TextField label="Mô tả âm thanh" size="small" multiline minRows={3} disabled={pending} value={form.prompt} onChange={e=>setForm({...form,prompt:e.target.value})} placeholder="Ví dụ: Footsteps walking on a wooden floor, close-up, no music" helperText="Mô tả nguồn phát, không gian và nhịp điệu. Tiếng Anh thường cho kết quả rõ hơn." inputProps={{maxLength:2000}}/>
  <TextField label="Thời lượng (giây)" size="small" type="number" disabled={pending} value={form.duration} onChange={e=>setForm({...form,duration:Number(e.target.value)})} inputProps={{min:.5,max:30,step:.5}} sx={{maxWidth:240}}/>
  <FormControlLabel label="Một sự kiện đơn lẻ (ví dụ một lần mở cửa)" control={<Switch disabled={pending} checked={form.single_event} onChange={e=>setForm({...form,single_event:e.target.checked})}/>}/>
  <Box component="details"><summary>Tuỳ chọn tạo lại</summary><TextField size="small" label="Seed (tuỳ chọn)" type="number" disabled={pending} value={form.seed} onChange={e=>setForm({...form,seed:e.target.value})} helperText="Cùng mô tả và seed để tạo lại cùng cấu hình." inputProps={{min:0,max:2147483647,step:1}} sx={{mt:1}}/></Box>
  <Button variant="contained" disabled={pending||!form.prompt.trim()||form.duration<.5||form.duration>30} onClick={()=>void start()} startIcon={pending?<CircularProgress size={16} color="inherit"/>:undefined}>{pending?'Đang tạo âm thanh…':'Tạo âm thanh ngay'}</Button>
  {pending&&<Alert severity="info">{job?.status==='running'?'AI đang tạo âm thanh':'Đang chờ đến lượt'}{seconds>0?` · ${seconds} giây`:''}. Có thể đóng cửa sổ, tác vụ vẫn tiếp tục. AudioGen chạy local có thể mất vài phút.</Alert>}
  {error&&<Alert severity="error">{error}</Alert>}
  {job?.status==='complete'&&job.sound&&<Box sx={{p:1.5,bgcolor:'action.hover',borderRadius:1}}><Typography fontWeight={700}>Đã lưu: {job.sound.title}</Typography><Typography variant="caption">{job.sound.duration_sec.toFixed(2)} giây · Seed {job.sound.generation?.seed}</Typography><Box component="audio" controls preload="metadata" src={librarySoundUrl(job.sound.file)} sx={{display:'block',width:'100%',mt:1}}/>{onSelect&&<Button onClick={()=>job.sound&&onSelect(job.sound)}>Thêm âm thanh này vào timeline</Button>}</Box>}
 </Stack></Box>;
}
