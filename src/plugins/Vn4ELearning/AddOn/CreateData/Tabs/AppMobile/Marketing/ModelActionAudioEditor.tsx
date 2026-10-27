import React from 'react';
import {Alert,Box,Button,FormControlLabel,MenuItem,Stack,Switch,TextField} from '@mui/material';
import {CharacterConfig} from 'helpers/marketingShortVideoModel3dApi';
import {LibrarySound,listLibrarySounds,librarySoundUrl,ModelAudioBinding} from 'helpers/modelAudio';
import {CHARACTER_EMOTIONS} from 'helpers/characterEmotions';
import SoundLibraryDrawer from './SoundLibraryDrawer';
const actions=[['walk','Đi bộ'],['run','Chạy'],...Object.entries(CHARACTER_EMOTIONS).filter(([id])=>!['neutral','blink','deadpan'].includes(id)).map(([id,label])=>['emotion:'+id,label])];
export default function ModelActionAudioEditor({value,onChange,disabled}:{value:CharacterConfig;onChange:(v:CharacterConfig)=>void;disabled?:boolean}){
 const [sounds,setSounds]=React.useState<LibrarySound[]>([]),[open,setOpen]=React.useState(false),[error,setError]=React.useState('');
 const load=async()=>{try{const r=await listLibrarySounds();if(!r.success)throw new Error(r.message);setSounds(r.sounds||[]);}catch(e){setError(e instanceof Error?e.message:'Không tải được âm thanh.');}};
 React.useEffect(()=>{void load();},[]);
 const bindings=value.audio?.bindings||[];
 const change=(action:string,patch:Partial<ModelAudioBinding>)=>{const old=bindings.find(b=>b.action===action)||{action,sound_ids:[],volume:action.startsWith('emotion:')?.18:.3,phases:[.1,.6]};const next={...old,...patch};next.sounds=next.sound_ids.map(id=>sounds.find(s=>s.id===id)||old.sounds?.find(s=>s.id===id)).filter(Boolean) as LibrarySound[];onChange({...value,audio:{enabled:value.audio?.enabled!==false,bindings:[...bindings.filter(b=>b.action!==action),next]}});};
 return <Box component="details" sx={{p:1.5,border:'1px solid',borderColor:'divider',borderRadius:2}}><Box component="summary" sx={{fontWeight:700,cursor:'pointer'}}>Âm thanh theo hành động · {bindings.filter(b=>b.sound_ids.length).length} đã gán</Box>
 <Stack spacing={1.5} sx={{mt:2}}>
 <Alert severity="info">Gán một lần, các beat tự kế thừa. Đi/chạy phát tại mốc trong chu kỳ clip; biểu cảm phát khi bắt đầu cảm xúc. Sau khi chỉnh, lưu model hoặc lưu trang phục của vai.</Alert>
 {error&&<Alert severity="warning">{error}</Alert>}
 <FormControlLabel label="Tự phát âm thanh hành động" control={<Switch checked={value.audio?.enabled!==false} disabled={disabled} onChange={e=>onChange({...value,audio:{enabled:e.target.checked,bindings}})}/>}/>
 <Button size="small" onClick={()=>setOpen(true)}>Quản lý / thêm âm thanh</Button>
 {actions.map(([id,label])=>{const b=bindings.find(x=>x.action===id);return <Box key={id} sx={{p:1,border:'1px solid',borderColor:'divider',borderRadius:1}}>
  <TextField select fullWidth size="small" label={'Âm thanh · '+label} disabled={disabled} value={b?.sound_ids||[]} SelectProps={{multiple:true}} onChange={e=>change(id,{sound_ids:typeof e.target.value==='string'?e.target.value.split(','):e.target.value})}>
   {sounds.map(s=><MenuItem key={s.id} value={s.id}>{s.title}</MenuItem>)}
  </TextField>
  {!!b?.sound_ids.length&&<Stack spacing={1} sx={{mt:1}}>
   <TextField size="small" type="number" label={'Âm lượng · '+label} inputProps={{min:0,max:1,step:.05}} value={b.volume} onChange={e=>change(id,{volume:Number(e.target.value)})}/>
   {!id.startsWith('emotion:')&&<TextField size="small" label={'Mốc trong chu kỳ · '+label} helperText="Pha 0–1, cách bằng dấu phẩy. Ví dụ 0.1, 0.6 = hai lần chạm chân." defaultValue={b.phases.join(', ')} onBlur={e=>{const phases=e.target.value.split(',').map(Number);if(phases.length&&phases.every(p=>Number.isFinite(p)&&p>=0&&p<1))change(id,{phases});}}/>}
   <Box component="audio" controls preload="none" src={librarySoundUrl(b.sounds?.[0]?.file||sounds.find(s=>s.id===b.sound_ids[0])?.file||'')} sx={{width:'100%'}}/>
  </Stack>}
 </Box>;})}
 </Stack><SoundLibraryDrawer open={open} onClose={()=>{setOpen(false);void load();}}/>
 </Box>;
}
