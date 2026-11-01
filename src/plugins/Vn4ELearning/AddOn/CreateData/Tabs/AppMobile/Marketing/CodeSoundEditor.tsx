import React from 'react';
import {Alert, Box, Button, Stack, TextField} from '@mui/material';
import {LibrarySound,librarySoundUrl,saveCodeSound} from 'helpers/modelAudio';
const DEFAULT_CODE=`function buildSound({Tone, destination, duration, random}) {
  const synth = new Tone.Synth({
    volume: -10,
    envelope: {attack: 0.004, decay: 0.07, sustain: 0, release: 0.05}
  }).connect(destination);
  synth.triggerAttackRelease('E6', Math.min(0.08, duration / 2), 0);
}`;
type Props={title:string;category:string;license:string;sound?:LibrarySound;onCreated:()=>void;onSelect?:(sound:LibrarySound)=>void};
export default function CodeSoundEditor({title,category,license,sound,onCreated,onSelect}:Props){
 const [code,setCode]=React.useState(DEFAULT_CODE),[duration,setDuration]=React.useState(.3),[seed,setSeed]=React.useState(1),[busy,setBusy]=React.useState(false),[error,setError]=React.useState(''),[result,setResult]=React.useState<LibrarySound|null>(null),[copied,setCopied]=React.useState(false);
 React.useEffect(()=>{if(sound){setCode(sound.code||DEFAULT_CODE);setDuration(sound.code_duration_sec||.3);setSeed(sound.code_seed??1);setResult(sound);}},[sound]);
 const copy=async()=>{try{await navigator.clipboard.writeText(`Create a high-quality sound effect: ${title||'short subtle cartoon pop'}. Category: ${category}. Duration: ${duration} seconds. Return ONLY a JavaScript function, without markdown: function buildSound({Tone, destination, duration, random}) { ... }. Tone.js 14.8.49 is supplied inside Tone.Offline at 44100Hz stereo. Connect audio nodes to destination. Schedule at time 0, using seconds, with all releases inside duration. Use random() for seeded variation. No imports, fetch, network, DOM, timers, microphone or global Transport. Do not call Tone.start() or Tone.Offline(). Oscillators/noise must stop. Keep headroom, no clipping. Build the graph synchronously or return a promise that resolves after graph construction. Make this sound from synthesis only, no external files.`);setCopied(true);setError('');}catch(e){setError('Không copy được prompt: '+String(e));}};
 const save=async(record:boolean)=>{setBusy(true);setError('');try{const response=await saveCodeSound({title,category,license,code,duration,seed},record);if(!response.success||!response.sound)throw new Error(response.message||'Không lưu được code âm thanh');setResult(response.sound);onCreated();}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setBusy(false);}};
 return <Stack spacing={1.5}>
  <Alert severity="info">Lưu code để tái sử dụng. “Thu âm code” tổng hợp thành WAV bằng Tone.js, không dùng microphone. File WAV có thể nghe thử và thêm vào timeline.</Alert>
  <Stack direction="row" spacing={1}><TextField size="small" label="Thời lượng (giây)" type="number" value={duration} inputProps={{min:.02,max:30,step:.05}} disabled={busy} onChange={e=>{setDuration(Number(e.target.value));setResult(null);}}/><TextField size="small" label="Seed" type="number" value={seed} inputProps={{min:0,max:2147483647,step:1}} disabled={busy} onChange={e=>{setSeed(Number(e.target.value));setResult(null);}}/><Button onClick={()=>void copy()} disabled={busy}>{copied?'Đã copy prompt':'Copy prompt tạo code'}</Button></Stack>
  <TextField label="Code âm thanh — function buildSound" multiline minRows={10} maxRows={22} value={code} disabled={busy} onChange={e=>{setCode(e.target.value);setResult(null);}} inputProps={{spellCheck:false}} sx={{'& textarea':{fontFamily:'monospace',fontSize:12}}}/>
  {error&&<Alert severity="error">{error}</Alert>}
  <Stack direction="row" spacing={1}><Button variant="outlined" disabled={busy||!title.trim()||!code.trim()} onClick={()=>void save(false)}>Lưu code</Button><Button variant="contained" disabled={busy||!title.trim()||!code.trim()} onClick={()=>void save(true)}>{busy?'Đang xử lý…':'Thu âm code và lưu WAV'}</Button>{onSelect&&result?.file&&<Button onClick={()=>onSelect(result)}>Thêm vào timeline</Button>}</Stack>
  {result&&<Alert severity="success">{result.file?'Đã lưu code và file âm thanh.':'Đã lưu code; bấm thu âm để tạo file.'}</Alert>}
  {result?.file&&<Box component="audio" controls src={librarySoundUrl(result.file)} sx={{width:'100%'}}/>}
 </Stack>;
}
