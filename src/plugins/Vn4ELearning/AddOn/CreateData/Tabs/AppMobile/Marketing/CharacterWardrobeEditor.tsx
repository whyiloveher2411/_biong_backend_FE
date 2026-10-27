import React from 'react';
import {CHARACTER_EMOTIONS} from 'helpers/characterEmotions';
import {Alert, Box, Button, Chip, CircularProgress, FormControlLabel, Slider, MenuItem, Stack, Switch, TextField, Typography} from '@mui/material';
import {CharacterConfig, CharacterGeneration, CharacterPart, characterRequest, parseShortVideoModel3dApiMessage} from 'helpers/marketingShortVideoModel3dApi';

const OPTIONS: Record<string, {label: string; values: Array<[string,string]>}> = {
    top:{label:'Áo',values:[['shirt','Áo cartoon'],['jacket','Áo khoác'],['vest','Áo phản quang']]}, bottom:{label:'Thân dưới',values:[['trousers','Quần dài'],['shorts','Quần short']]},
    hair:{label:'Tóc',values:[['short','Tóc ngắn'],['bob','Tóc bob'],['spiky','Tóc nhọn']]},
    arms:{label:'Tay',values:[['sleeves','Tay áo ngắn'],['bare','Tay trần'],['robot','Tay robot']]},
    legs:{label:'Chân',values:[['trousers','Chân mặc quần'],['bare','Chân trần'],['robot','Chân robot']]},
    hands:{label:'Bàn tay',values:[['round','Bàn tay tròn'],['robot','Bàn tay robot']]},
    shoes:{label:'Giày',values:[['sneakers','Giày sáng màu'],['boots','Giày nâu']]}, face:{label:'Mắt, mũi, miệng',values:[['cartoon','Khuôn mặt cartoon']]},
};
const DEFAULT_SELECTION: Record<string,string> = {top:'shirt',bottom:'trousers',hair:'short',arms:'sleeves',legs:'trousers',hands:'round',shoes:'sneakers',face:'cartoon'};
type Props = {value: CharacterConfig; onChange: (value: CharacterConfig) => void; modelId: number; library: CharacterPart[]; initialGeneration?: CharacterGeneration; disabled?: boolean; allowGeneration?: boolean};
export default function CharacterWardrobeEditor({value,onChange,modelId,library,initialGeneration,disabled,allowGeneration=true}: Props) {
    const [slot,setSlot] = React.useState('hair');
    const [request,setRequest] = React.useState('');
    const [generation,setGeneration] = React.useState<CharacterGeneration>(initialGeneration || {});
    const [busy,setBusy] = React.useState(false), [error,setError] = React.useState(''), [notice,setNotice] = React.useState('');
    const valueRef = React.useRef(value); valueRef.current=value;
    const changeRef = React.useRef(onChange); changeRef.current=onChange;
    const [freshParts,setFreshParts] = React.useState<CharacterPart[]>([]);
    React.useEffect(() => { setGeneration(initialGeneration || {}); setFreshParts([]); setError(''); setNotice(''); },[modelId,initialGeneration]);
    const active = generation.status === 'queued' || generation.status === 'processing';
    React.useEffect(() => {
        if (!active || !modelId) return;
        let cancelled=false;
        const timer = window.setInterval(async () => {
            try {
                const res = await characterRequest('get',{model_id:modelId});
                if (cancelled) return;
                if (res.success === false || !res.model) throw new Error(parseShortVideoModel3dApiMessage(res));
                const next = res.model.character_generation || {}; setGeneration(next);
                if (next.status === 'completed') {
                    const recipes=res.model.character?.library || []; setFreshParts(recipes);
                    const current=valueRef.current, merged=new Map((current.library || []).map(p=>[p.id,p]));
                    recipes.forEach(p=>merged.set(p.id,p)); changeRef.current({...current,library:Array.from(merged.values())});
                    setNotice('Asset đã được kiểm tra cấu trúc và lưu. Chọn trong danh sách bộ phận để xem thử trước khi dùng.');
                }
            } catch (e) { if (!cancelled) setError(e instanceof Error?e.message:'Không đọc được tiến độ.'); }
        },5000);
        return () => {cancelled=true; window.clearInterval(timer);};
    },[active,modelId]);
    const recipes = Array.from(new Map([...library,...freshParts,...(value.library || [])].map(p=>[p.id,p])).values());
    const select = (key: string,id: string) => {
        const part=recipes.find(p=>p.id===id), own=new Map((value.library || []).map(p=>[p.id,p]));
        if (part) own.set(part.id,part);
        onChange({...value,selections:{...DEFAULT_SELECTION,...value.selections,[key]:id},library:Array.from(own.values())});
    };
    const generate = async () => {
        setBusy(true); setError(''); setNotice('');
        try { const res=await characterRequest('generate',{model_id:modelId,slot,request});
            if (res.success===false) throw new Error(parseShortVideoModel3dApiMessage(res));
            setGeneration({status:'queued'});
        } catch(e) {setError(e instanceof Error?e.message:'Không tạo được yêu cầu.');} finally {setBusy(false);}
    };
    return <Stack spacing={2} sx={{border:'1px solid',borderColor:'divider',borderRadius:2,p:2}}>
        <Box><Typography variant="subtitle1" fontWeight={700}>Tủ đồ nhân vật</Typography>
            <Typography variant="body2" color="text.secondary">Thay ngoại hình, giữ bộ khung và chuyển động. Cấu hình đã lưu được dùng cho các beat gán nhân vật này.</Typography></Box>
        {allowGeneration && <FormControlLabel control={<Switch checked={!!value.enabled} disabled={disabled} onChange={e=>onChange({...value,enabled:e.target.checked})}/>} label="Dùng ngoại hình cartoon"/>}
        {value.enabled && <>
            {value.surface_mode==='skinned_v2' && <TextField select size="small" label="Bộ phối trang phục" value={value.outfit || 'explorer'} disabled={disabled} onChange={e=>{
                const outfit=e.target.value as CharacterConfig['outfit'];
                const palettes={explorer:{shirt:'#e9dfc9',trousers:'#203849',accent:'#227f80',shoeColor:'#e9dfc9',trimColor:'#ba8951'},sport:{shirt:'#315b87',trousers:'#182532',accent:'#f49b38',shoeColor:'#f3f2ec',trimColor:'#d5e1e9'},minimal:{shirt:'#424752',trousers:'#25262b',accent:'#a9b6ae',shoeColor:'#e8e5df',trimColor:'#72787d'}};
                onChange({...value,outfit,...palettes[outfit || 'explorer']});
            }}>
                <MenuItem value="explorer">Urban Explorer · Kem / xanh ngọc</MenuItem><MenuItem value="sport">Sport · Xanh / cam</MenuItem><MenuItem value="minimal">City Minimal · Xám / đen, bớt chi tiết</MenuItem>
            </TextField>}
            <TextField select size="small" label="Biểu cảm mặc định" value={value.expression || 'neutral'} disabled={disabled} onChange={e=>onChange({...value,expression:e.target.value as CharacterConfig['expression']})}>
                {Object.entries(CHARACTER_EMOTIONS).map(([id,label])=><MenuItem key={id} value={id}>{label}</MenuItem>)}
            </TextField>
            <FormControlLabel label="Ký hiệu cảm xúc cartoon" control={<Switch checked={value.emotionEffects!==false} disabled={disabled} onChange={e=>onChange({...value,emotionEffects:e.target.checked})}/>}/>
            <Box><Typography variant="body2">Cường độ cảm xúc · {Math.round((value.emotionIntensity ?? 1)*100)}%</Typography><Slider aria-label="Cường độ cảm xúc" min={0} max={1} step={.05} disabled={disabled} value={value.emotionIntensity ?? 1} onChange={(_,v)=>onChange({...value,emotionIntensity:v as number})}/></Box>
            <Typography variant="caption" color="text.secondary">Đủ 10 cảm xúc của workflow. Ký hiệu đi theo đầu: gân giận, mồ hôi, ?!, tia vui, HA! và nước mắt. Bình thường hoặc cường độ 0 sẽ ẩn hiệu ứng.</Typography>
            <Box sx={{display:'grid',gridTemplateColumns:{xs:'1fr',sm:'1fr 1fr'},gap:1.5}}>
                {Object.entries(OPTIONS).filter(([key])=>value.surface_mode!=='skinned_v2' || ['hair','face'].includes(key)).map(([key,option])=><TextField key={key} select size="small" label={option.label} disabled={disabled} value={value.selections?.[key] || DEFAULT_SELECTION[key]} onChange={e=>select(key,e.target.value)}>
                    {option.values.map(([id,label])=><MenuItem key={id} value={id}>{label}</MenuItem>)}
                    <MenuItem value="none">Ẩn bộ phận</MenuItem>
                    {recipes.filter(p=>p.slot===key).map(p=><MenuItem key={p.id} value={p.id}>{p.name} · Thư viện</MenuItem>)}
                </TextField>)}
            </Box>
            <Stack direction="row" useFlexGap flexWrap="wrap" gap={1.5}>
                {([['skin','Da','#e8b18d'],['shirt','Áo','#367de0'],['trousers','Quần','#263b58'],['hairColor','Tóc','#302723']] as const).map(([key,label,fallback])=><TextField key={key} size="small" type="color" label={label} value={value[key] || fallback} onChange={e=>onChange({...value,[key]:e.target.value})} disabled={disabled} sx={{width:95}} InputLabelProps={{shrink:true}}/>)}
            </Stack>
            <Alert severity="info">{value.surface_mode==='skinned_v2' ? 'Áo, tay áo và quần dùng bề mặt liền, uốn theo xương. Các bộ phối thay màu và chi tiết trên cùng kiểu dáng Aster. Bạn vẫn có thể đổi tóc, khuôn mặt và màu riêng; kiểu áo/quần mới cần asset skinned tương thích.' : 'Bộ mẫu cũ dùng các khối gắn theo khớp. Chọn Aster · Urban Explorer để dùng trang phục liền có skin weights.'}</Alert>
            {allowGeneration && <><Typography variant="subtitle2">Tạo thêm bộ phận bằng DeepSeek</Typography>
            {!modelId && <Alert severity="info">Lưu nhân vật trước để tạo và lưu thêm asset vào thư viện.</Alert>}
            <TextField select size="small" label="Bộ phận cần tạo" value={slot} onChange={e=>setSlot(e.target.value)} disabled={busy || active || disabled}>
                {Object.entries(OPTIONS).filter(([key])=>value.surface_mode!=='skinned_v2' || ['hair','face'].includes(key)).map(([key,o])=><MenuItem key={key} value={key}>{o.label}</MenuItem>)}
            </TextField>
            <TextField label="Mô tả thiết kế" multiline minRows={2} value={request} onChange={e=>setRequest(e.target.value)} inputProps={{maxLength:5000}} placeholder="Ví dụ: tóc bob màu tím, mái lệch, phong cách cartoon" disabled={busy || active || disabled}/>
            <Stack direction="row" spacing={1} alignItems="center"><Button variant="outlined" onClick={generate} disabled={!modelId || !request.trim() || active || busy || disabled}>{busy?<CircularProgress size={18}/>: 'Tạo asset bằng DeepSeek'}</Button>
                {active && <Chip label={generation.status==='queued'?'Đang chờ worker':'DeepSeek đang thiết kế'} color="info" size="small"/>}</Stack>
            {generation.status==='failed' && <Alert severity="error">{generation.error || 'Tạo asset thất bại. Bạn có thể gửi lại yêu cầu.'}</Alert>}
            {notice && <Alert severity="success">{notice}</Alert>}
            {error && <Alert severity="error">{error}</Alert>}</>}
        </>}
    </Stack>;
}
