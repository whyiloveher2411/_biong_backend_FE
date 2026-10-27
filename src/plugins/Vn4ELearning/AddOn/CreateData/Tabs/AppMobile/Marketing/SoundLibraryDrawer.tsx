import React from 'react';
import {Alert,Box,Button,Chip,MenuItem,Stack,TextField,Typography} from '@mui/material';
import DrawerCustom from 'components/molecules/DrawerCustom';
import {LibrarySound,listLibrarySounds,librarySoundUrl,uploadLibrarySound} from 'helpers/modelAudio';
export default function SoundLibraryDrawer({open,onClose,onSelect}:{open:boolean;onClose:()=>void;onSelect?:(sound:LibrarySound)=>void}){
 const [sounds,setSounds]=React.useState<LibrarySound[]>([]),[query,setQuery]=React.useState(''),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false);
 const [meta,setMeta]=React.useState({title:'',license:'',source:'',category:'foley'}),[file,setFile]=React.useState<File|null>(null);
 const load=async()=>{try{const r=await listLibrarySounds();if(!r.success)throw new Error(r.message);setSounds(r.sounds||[]);}catch(e){setError(e instanceof Error?e.message:'Không tải được thư viện.');}};
 React.useEffect(()=>{if(open)void load();},[open]);
 return <DrawerCustom open={open} onClose={onClose} title="Thư viện âm thanh" width={800} activeOnClose>
  <Stack spacing={2}>
   <Typography variant="body2">Dùng lại âm thanh cho model và hiệu ứng. File có thông tin nguồn, giấy phép; âm thanh gán vào model sẽ tự đi theo hành động.</Typography>
   {error&&<Alert severity="error">{error}</Alert>}
   <Box component="details" sx={{p:2,border:'1px solid',borderColor:'divider',borderRadius:2}}><summary>Thêm âm thanh mới</summary><Stack spacing={1.5} sx={{mt:2}}>
    <Button component="label" variant="outlined">{file?file.name:'Chọn file audio (tối đa 20MB / 120 giây)'}<input hidden type="file" accept=".wav,.mp3,.ogg,.m4a,.flac" onChange={e=>{const f=e.target.files?.[0];if(f){setFile(f);setMeta(m=>({...m,title:m.title||f.name}));}}}/></Button>
    <TextField size="small" label="Tên âm thanh" value={meta.title} onChange={e=>setMeta({...meta,title:e.target.value})}/>
    <TextField size="small" select label="Phân loại" value={meta.category} onChange={e=>setMeta({...meta,category:e.target.value})}>{[['foley','Hành động / đồ vật'],['emotion','Biểu cảm cartoon'],['ambience','Âm thanh nền']].map(([id,label])=><MenuItem key={id} value={id}>{label}</MenuItem>)}</TextField>
    <TextField size="small" label="Nguồn (URL hoặc tự thu)" value={meta.source} onChange={e=>setMeta({...meta,source:e.target.value})}/>
    <TextField size="small" label="Giấy phép / quyền sử dụng" placeholder="Ví dụ: CC0-1.0 hoặc bản thu của tôi" value={meta.license} onChange={e=>setMeta({...meta,license:e.target.value})}/>
    <Button variant="contained" disabled={busy||!file||!meta.title||!meta.license} onClick={async()=>{if(!file)return;setBusy(true);setError('');try{const r=await uploadLibrarySound(file,meta);if(!r.success)throw new Error(r.message);setFile(null);setMeta({title:'',license:'',source:'',category:'foley'});await load();}catch(e){setError(e instanceof Error?e.message:'Upload thất bại');}finally{setBusy(false);}}}>{busy?'Đang lưu…':'Thêm vào thư viện'}</Button>
   </Stack></Box>
   <TextField size="small" label="Tìm âm thanh" value={query} onChange={e=>setQuery(e.target.value)}/>
   <Typography variant="caption">{sounds.length} âm thanh</Typography>
   {sounds.filter(s=>(s.title+' '+s.category+' '+s.license).toLowerCase().includes(query.toLowerCase())).map(s=><Box key={s.id} sx={{p:1.5,border:'1px solid',borderColor:'divider',borderRadius:2}}>
    <Typography fontWeight={700}>{s.title}</Typography>{onSelect&&<Button size="small" variant="outlined" onClick={()=>onSelect(s)}>Thêm vào timeline</Button>}<Chip size="small" label={s.license}/><Typography variant="caption" sx={{ml:1}}>{s.duration_sec.toFixed(2)} giây · {s.category}</Typography>
    <Box component="audio" controls preload="none" src={librarySoundUrl(s.file)} sx={{display:'block',width:'100%',mt:1}}/>
    {s.source&&<Typography variant="caption" sx={{overflowWrap:'anywhere'}}>{s.source}</Typography>}
   </Box>)}
  </Stack>
 </DrawerCustom>;
}
