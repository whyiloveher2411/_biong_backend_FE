import React from 'react';
import {Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Slider, Stack, TextField, Typography} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {CharacterDesignCatalog, CharacterDesignConfig, SceneAsset, sceneAssetMessage, sceneAssetsRequest} from 'helpers/shortVideoSceneAssets';
import SceneAssetHtmlPreview from './SceneAssetHtmlPreview';

const accessoryAreas = [
    {id:'head',name:'Đầu, tóc & mặt'}, {id:'neck',name:'Cổ & vai'}, {id:'arms',name:'Tay & cổ tay'},
    {id:'torso',name:'Thân & thắt lưng'}, {id:'hand',name:'Vật cầm tay'},
];
const colorNames: Record<string,string> = {skin:'Màu da', hair:'Màu tóc', eyes:'Màu mắt', lips:'Màu môi', top:'Màu áo', bottom:'Màu quần', shoes:'Màu giày', accessory:'Màu phụ kiện',brows:'Màu chân mày',beard:'Màu râu',glasses:'Màu gọng kính'};
const naturalHair = ['#2B1B14','#171413','#3B2922','#5B3A29','#79513A','#A57149','#BF925E','#D9C4A2','#8D4C33','#75716F','#C4C0BD'];
const colorPalettes: Record<string,string[]> = {
    skin: ['#E0A97C','#F4D4B5','#EDC09C','#CF956F','#AD7351','#955D43','#754B35','#58382B','#38241E'],
    hair: [...naturalHair,'#5C3045','#884F78','#7968A8','#315B87'],
    brows: naturalHair,
    beard: naturalHair,
    eyes: ['#3A2418','#241B17','#62422B','#906837','#687348','#397B77','#315B87','#64A0BE','#77818E'],
    lips: ['#9B4248','#A5605B','#B86E68','#B85868','#C98A83','#9A5B51','#804840','#A12C3D','#C62828','#742D48'],
    glasses: ['#30374D','#171413','#5B3A29','#A57149','#C29C62','#B7BBC2','#F5F5F5','#315B87','#B85868','#C62828'],
    top: ['#1FA88A','#F5F5F5','#171413','#2B3A5C','#315B87','#9E9E9E','#AD1457','#C62828','#388E3C','#7968A8','#FFC12B'],
    bottom: ['#2B3A5C','#171413','#424242','#315B87','#597494','#947E64','#D9C4A2','#526245','#F5F5F5'],
    shoes: ['#EDDFC2','#F5F5F5','#171413','#754B35','#AD7351','#9E9E9E','#315B87','#C62828'],
    accessory: ['#E8A020','#171413','#F5F5F5','#B85868','#7968A8','#315B87','#1FA88A','#C62828'],
};
const extraColors = ['#F5F5F5','#9E9E9E','#424242','#9670CF','#982BFA','#5623A7','#4DD0E1','#00E5FF','#005C65',
    '#FFEB3B','#FFFF00','#FFC12B','#81C784','#00E600','#388E3C','#64B5F6','#00B8ED','#1976D2','#E57373',
    '#FF1744','#C62828','#F50087','#AD1457','#E0A97C','#F4D4B5','#AD7351','#754B35','#2B1B14','#000000',
    '#0A0A0A','#D9C4A2','#3A2418','#397B77','#9B4248','#1FA88A','#315B87','#2B3A5C','#EDDFC2','#E8A020','#B85868','#7968A8'];
const previewMenuProps = {PaperProps:{sx:{bgcolor:'#25283e',color:'#fff','& .MuiMenuItem-root':{color:'#fff'},'& .MuiMenuItem-root.Mui-selected':{bgcolor:'#504967'}}}};
const emotions = ['neutral','happy','sad','angry','surprised','worried','smug','thinking','crying','laughing'];
const poses = ['idle','walk','wave','reach','stand','sit','kneel','cover_ears','hold_paw','lift_with_helper','carry_cup','carry_bowl'];

/** A self-contained snapshot, shared by preview and the server-side canonical factory. */
export function characterDesignPreview(template: string, config: CharacterDesignConfig, view: string, pose: string, emotion: string): string {
    const json = JSON.stringify(config).replace(/</g, '\\u003c');
    const controls = JSON.stringify({view,pose,emotion}).replace(/</g, '\\u003c');
    return template.replace('__SV_DESIGN_CONFIG__', () => json)
        .replace('</head>', '<style>#ui{display:none}</style></head>')
        .replace('</body>', `<script>window.dispatchEvent(new MessageEvent('message',{source:parent,data:Object.assign({type:'sv-design-preview'},${controls})}));</script></body>`);
}

// Keep drag state here so the preview and option lists only update after release.
function PartAdjustmentSlider({value,disabled,onCommit,labelId,label,min,max,step,defaultValue,left,right,angle=false}:{value:number;disabled:boolean;onCommit:(value:number)=>void;labelId:string;label:string;min:number;max:number;step:number;defaultValue:number;left:string;right:string;angle?:boolean}) {
    const [draft,setDraft]=React.useState(value);
    React.useEffect(()=>setDraft(value),[value]);
    const display=angle?`${Math.round(draft)}°`:draft.toFixed(step<.01?3:2);
    return <Box sx={{color:'#fff'}}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Typography id={labelId} variant="body2" sx={{color:'#fff'}}>{label}</Typography>
            <Button size="small" aria-label={`Reset ${label}`} disabled={disabled} onClick={()=>{setDraft(defaultValue);onCommit(defaultValue);}} sx={{color:'#fff',minWidth:0,p:0,textTransform:'none',flexShrink:0}}>Reset</Button>
        </Stack>
        <Slider aria-labelledby={labelId} min={min} max={max} step={step} value={draft} disabled={disabled}
            marks={[{value:defaultValue,label:'Mặc định'}]}
            valueLabelDisplay="on" valueLabelFormat={()=><span aria-label={`Giá trị ${label}`}>{display}</span>}
            onChange={(_,next)=>setDraft(next as number)}
            onChangeCommitted={(_,next)=>onCommit(next as number)} sx={{color:'#b9adff',mb:6,'& .MuiSlider-valueLabel':{top:28,bgcolor:'#25283e',color:'#fff',fontVariantNumeric:'tabular-nums',py:.25,px:.75,'&.MuiSlider-valueLabelOpen':{transform:'none'},'&::before':{display:'none'}},'& .MuiSlider-mark':{width:4,height:12,borderRadius:1,bgcolor:'#fff',opacity:1},'& .MuiSlider-markLabel':{top:60,color:'#fff',fontSize:11}}}/>
        <Stack direction="row" justifyContent="space-between"><Typography variant="caption" sx={{color:'#fff'}}>{left}</Typography><Typography variant="caption" sx={{color:'#fff'}}>{right}</Typography></Stack>
    </Box>;
}

type Props = {shortVideoId:number; asset:SceneAsset; busy:boolean; onClose:()=>void; onSave:(data:Record<string,unknown>)=>Promise<boolean>};
export default function CharacterDesignDialog({shortVideoId,asset,busy,onClose,onSave}: Props) {
    const [catalog,setCatalog]=React.useState<CharacterDesignCatalog|null>(null);
    const scrollRoot=React.useRef<HTMLDivElement>(null);
    React.useEffect(()=>{
        const root=scrollRoot.current;
        if(!root)return;
        // Native non-passive listener is required: React wheel handlers can be passive.
        const wheel=(event:WheelEvent)=>{
            if(event.ctrlKey)return;
            const target=event.target instanceof Element?event.target.closest<HTMLElement>('[data-horizontal-options]'):null;
            if(!target||!root.contains(target))return;
            const dx=event.shiftKey&&event.deltaX===0?event.deltaY:event.deltaX;
            if(!dx||(!event.shiftKey&&Math.abs(dx)<Math.abs(event.deltaY)))return;
            event.preventDefault();
            const scale=event.deltaMode===1?16:event.deltaMode===2?target.clientWidth:1;
            target.scrollLeft+=dx*scale;
        };
        root.addEventListener('wheel',wheel,{passive:false});
        return ()=>root.removeEventListener('wheel',wheel);
    },[catalog]);
    const [config,setConfig]=React.useState<CharacterDesignConfig|null>(null);
    const [slot,setSlot]=React.useState('skin');
    const [accessorySlot,setAccessorySlot]=React.useState('hat');
    const [error,setError]=React.useState('');
    const [saving,setSaving]=React.useState(false);
    const [attempt,setAttempt]=React.useState(0);
    const [view,setView]=React.useState('reset');
    const [focusNonce,setFocusNonce]=React.useState(0);
    const [pose,setPose]=React.useState('idle');
    const [showRig,setShowRig]=React.useState(false);
    const [emotion,setEmotion]=React.useState('neutral');
    React.useEffect(()=>{
        let active=true;
        setError(''); setCatalog(null); setConfig(null);
        void sceneAssetsRequest(shortVideoId,'design_catalog',{asset_id:asset.id}).then(res=>{
            if(!active)return;
            if(!res.success||!res.designer)throw new Error(sceneAssetMessage(res));
            setCatalog(res.designer);setConfig(res.designer.config);setSlot(res.designer.catalog.find(category=>category.id!=='gender')?.id||'skin');
        }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được bộ thiết kế.');});
        return ()=>{active=false;};
    },[shortVideoId,asset.id,attempt]);
    // The iframe document never changes when choosing parts. Its existing scene receives the design.
    const html=React.useMemo(()=>catalog?characterDesignPreview(catalog.template_html,catalog.config,'reset','idle','neutral'):'',[catalog]);
    const previewMessage=React.useMemo(()=>({type:'sv-design-preview',design:config,colors:config?.colors,view,pose,emotion,showRig,focusNonce}),[config,view,pose,emotion,showRig,focusNonce]);
    const accessorySlots=catalog?.catalog.filter(category=>category.accessoryArea)||[];
    const activeAccessory=accessorySlots.find(category=>category.id===accessorySlot)||accessorySlots[0];
    const editingSlot=slot==='accessory'&&activeAccessory?activeAccessory.id:slot;
    const current=catalog?.catalog.find(c=>c.id===editingSlot);
    const selectAccessory=(id:string)=>{
        setAccessorySlot(id);
        setView('part:'+id);
        setFocusNonce(n=>n+1);
    };
    const gender=config?.selections.gender||'female';
    const currentItems=current?.items.filter(item=>!item.genders||item.genders.includes(gender))||[];
    const chooseGender=(itemId:string)=>{
        if(!config||!catalog||itemId===gender)return;
        const defs=catalog.genders?.[itemId]?.defaults||{};
        setConfig({...config,selections:{...config.selections,...defs,gender:itemId}});
    };
    const chooseItem=(itemId:string)=>{
        if(!config||!catalog)return;
        const item=current?.items.find(i=>i.id===itemId);
        setConfig({...config,selections:{...config.selections,[editingSlot]:itemId},...(item?.parameters?{parameters:{...config.parameters,...item.parameters}}:{})});
        if(slot==='accessory'&&activeAccessory) setFocusNonce(n=>n+1);
    };
    const disabled=busy||saving;
    const save=async()=>{
        if(!config||!catalog||disabled)return;
        setSaving(true); setError('');
        try {
            if(await onSave({asset_id:asset.id,expected_module_hash:catalog.expected_module_hash,expected_spec_hash:catalog.expected_spec_hash,design:config}))onClose();
            else setError('Chưa lưu được thiết kế. Kiểm tra thông báo ở danh sách hoặc mở lại nếu nhân vật đã thay đổi.');
        } catch {setError('Không kết nối được CMS. Thiết kế đang chỉnh vẫn được giữ.');}
        finally {setSaving(false);}
    };
    return <Dialog open fullWidth maxWidth="xl" onClose={()=>{if(!disabled)onClose();}} aria-labelledby="character-design-title" PaperProps={{sx:{borderRadius:3,overflow:'hidden',bgcolor:'#25283e',color:'#fff',maxHeight:'96vh','& .MuiTypography-root':{color:'#fff'},'& .MuiInputLabel-root':{color:'#fff'},'& .MuiButton-root':{color:'#fff'},'& .MuiButton-root.Mui-disabled':{color:'rgba(255,255,255,.45)'},m:{xs:1,sm:2},width:{xs:'calc(100% - 16px)',sm:'calc(100% - 32px)'}}}}>
        <DialogTitle id="character-design-title" sx={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:1,fontSize:{xs:16,sm:20},py:1.25}}>
            Thiết kế nhân vật <Typography component="span" sx={{color:'#fff'}}>· {asset.name}</Typography>
            <Stack direction="row" gap={1} sx={{ml:'auto'}}>
                <Button size="small" startIcon={<RestartAltIcon/>} disabled={!catalog||disabled} onClick={()=>{if(catalog)setConfig(catalog.config);}}>Đặt lại</Button>
                <Button size="small" disabled={disabled} onClick={onClose}>Hủy</Button>
                <Button size="small" variant="contained" disabled={!config||disabled} onClick={()=>void save()}>{saving?'Đang lưu…':'Lưu nhân vật'}</Button>
            </Stack>
        </DialogTitle>
        <DialogContent ref={scrollRoot} sx={{p:0,'&:first-of-type':{pt:0}}}>
            {error&&<Alert severity="error" action={!catalog?<Button onClick={()=>setAttempt(n=>n+1)}>Thử lại</Button>:undefined}>{error}</Alert>}
            {!catalog||!config?<Box sx={{height:'60vh',display:'grid',placeItems:'center'}}><CircularProgress aria-label="Đang tải bộ thiết kế"/></Box>:<Box>
                <Box sx={{position:'relative',bgcolor:'#151a28',minWidth:0,'& iframe':{height:{xs:'32vh !important',md:'43vh !important'},minHeight:220}}}>
                    <Stack direction="row" gap={1} sx={{position:'absolute',top:14,left:16,right:{xs:16,sm:'auto'},zIndex:1,bgcolor:'rgba(24,27,44,.92)',p:1.25,borderRadius:2,color:'#fff','& .MuiInputBase-root':{color:'#fff',fontSize:13},'& .MuiSelect-select':{color:'#fff'},'& .MuiInputLabel-root':{color:'#fff'},'& .MuiOutlinedInput-notchedOutline':{borderColor:'#626980'},'& .MuiSvgIcon-root':{color:'#fff'}}}>
                        <FormControl size="small" sx={{minWidth:0,width:{xs:'50%',sm:155}}}><InputLabel>Động tác lặp (IK)</InputLabel><Select MenuProps={previewMenuProps} label="Động tác lặp (IK)" value={pose} onChange={e=>setPose(e.target.value)}>{poses.map(p=><MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl>
                        <TextField select SelectProps={{MenuProps:previewMenuProps}} size="small" sx={{minWidth:0,width:{xs:'50%',sm:155}}} label="Biểu cảm xem thử" value={emotion} onChange={e=>setEmotion(e.target.value)}>{emotions.map(e=><MenuItem key={e} value={e}>{e}</MenuItem>)}</TextField>
                    </Stack>
                    <SceneAssetHtmlPreview html={html} previewMessage={previewMessage} title={`Thiết kế ${asset.name}`} height="43vh"/>
                    <Stack direction={{xs:'column',sm:'row'}} gap={1} sx={{position:'absolute',bottom:12,left:16,right:16,alignItems:{xs:'stretch',sm:'center'},justifyContent:'space-between'}}>
                        <Stack direction="row" role="group" aria-label="Giới tính" gap={.5} sx={{alignSelf:'flex-start',bgcolor:'rgba(34,37,58,.92)',borderRadius:2,p:.5}}>
                            {(catalog.catalog.find(category=>category.id==='gender')?.items||[]).map(item=><Button key={item.id} size="small" disabled={disabled} aria-pressed={gender===item.id} onClick={()=>chooseGender(item.id)} sx={{minWidth:54,color:'white',borderRadius:1.5,bgcolor:gender===item.id?'#6f64d9':'transparent','&:hover':{bgcolor:'#6258b4'}}}>{item.name}</Button>)}
                        </Stack>
                        <Stack data-horizontal-options direction="row" gap={.5} sx={{minWidth:0,overflowX:'auto',overscrollBehaviorX:'contain',justifyContent:{xs:'flex-start',sm:'flex-end'}}}>
                        <Button size="small" aria-pressed={showRig} onClick={()=>setShowRig(value=>!value)} sx={{flexShrink:0,color:'white',bgcolor:showRig?'#318458':'rgba(34,37,58,.85)'}}>Hiện khớp & đường nối</Button>
                        {[['reset','Toàn thân'],['front','Trước'],['side','Nghiêng'],['back','Sau'],['face','Cận mặt']].map(([id,label])=><Button key={id} size="small" aria-pressed={view===id} sx={{flexShrink:0,minWidth:0,px:1.25,color:'white',textTransform:'none',borderRadius:2,bgcolor:view===id?'#6f64d9':'rgba(34,37,58,.85)','&:hover':{bgcolor:'#6258b4'}}} onClick={()=>setView(id)}>{label}</Button>)}
                        </Stack>
                    </Stack>
                </Box>
                <Box sx={{px:{xs:2,sm:4},pt:2,pb:1.5,background:'linear-gradient(120deg,#434e6b,#50435e)'}}>
                    {current?.colors.map(key=><Stack key={key} direction="row" alignItems="center" spacing={1} sx={{mb:1}}>
                        <Typography variant="caption" sx={{minWidth:70,color:'#fff'}}>{colorNames[key]||key}</Typography>
                        <Box data-horizontal-options role="group" aria-label={`Bảng ${colorNames[key]||key}`} sx={{display:'flex',gap:1,overflowX:'auto',overscrollBehaviorX:'contain',p:.5,flex:1,scrollbarWidth:'thin'}}>
                            {Array.from(new Set([catalog.config.colors[key].toUpperCase(),...(colorPalettes[key]||[]),config.colors[key].toUpperCase(),...extraColors])).map(color=><Box component="button" key={color} title={color} aria-label={`${colorNames[key]} ${color}`} aria-pressed={config.colors[key].toUpperCase()===color} disabled={disabled} onClick={()=>setConfig({...config,colors:{...config.colors,[key]:color}})} sx={{width:{xs:38,sm:44},height:{xs:38,sm:44},flexShrink:0,p:.75,borderRadius:2,border:'2px solid',borderColor:config.colors[key].toUpperCase()===color?'#fff':'transparent',bgcolor:'rgba(20,23,43,.4)',cursor:'pointer','&:hover':{bgcolor:'rgba(20,23,43,.7)'},'&:focus-visible':{outline:'2px solid #c3b6ff',outlineOffset:2}}}><Box component="span" sx={{display:'block',width:'100%',height:'100%',borderRadius:1,bgcolor:color}}/></Box>)}
                        </Box>
                        <Box component="label" title="Chọn màu khác" sx={{display:'flex',alignItems:'center',width:36,height:36,flexShrink:0,border:'1px solid #85859b',borderRadius:1.5,overflow:'hidden'}}><input type="color" aria-label={colorNames[key]||key} value={config.colors[key]} disabled={disabled} onChange={e=>setConfig({...config,colors:{...config.colors,[key]:e.target.value}})} style={{width:42,height:42,border:0,padding:0,background:'transparent',cursor:'pointer'}}/></Box>
                    </Stack>)}
                    <Box sx={{bgcolor:'rgba(20,23,43,.3)',borderRadius:2,px:{xs:1.5,sm:2.5},pt:.5,pb:2}}>
                        <Box data-horizontal-options role="tablist" aria-label="Bộ phận nhân vật" sx={{display:'flex',gap:{xs:2,sm:3.5},overflowX:'auto',overscrollBehaviorX:'contain',mb:2,scrollbarWidth:'thin'}}>
                            {catalog.catalog.filter(category=>category.id!=='gender'&&(!category.accessoryArea||category.id==='accessory')).map(category=><Button role="tab" id={`design-tab-${category.id}`} aria-controls="design-assets-panel" aria-selected={slot===category.id} key={category.id} onClick={()=>{setSlot(category.id);setView('part:'+(category.id==='accessory'&&activeAccessory?activeAccessory.id:category.id));setFocusNonce(n=>n+1);}} sx={{flexShrink:0,minWidth:0,px:0,py:1.5,color:'#fff',borderRadius:0,borderBottom:'2px solid',borderColor:slot===category.id?'white':'transparent',fontSize:{xs:14,sm:16},fontWeight:600,textTransform:'none'}}>{category.name}</Button>)}
                        </Box>
                        {slot==='accessory'&&activeAccessory&&<Stack spacing={1} sx={{mb:2}}>
                            <Box data-horizontal-options role="group" aria-label="Khu vực phụ kiện" sx={{display:'flex',gap:1,overflowX:'auto'}}>
                                {accessoryAreas.map(area=><Button key={area.id} size="small" aria-pressed={activeAccessory.accessoryArea===area.id} onClick={()=>{
                                    const first=accessorySlots.find(category=>area.id==='head'?category.id==='hat':category.accessoryArea===area.id);
                                    if(first) selectAccessory(first.id);
                                }} sx={{color:'#fff',flexShrink:0,textTransform:'none',bgcolor:activeAccessory.accessoryArea===area.id?'#6258b4':'transparent'}}>{area.name}</Button>)}
                            </Box>
                            <Box data-horizontal-options role="group" aria-label="Loại phụ kiện" sx={{display:'flex',gap:1,overflowX:'auto'}}>
                                {accessorySlots.filter(category=>category.accessoryArea===activeAccessory.accessoryArea).map(category=><Button key={category.id} size="small" aria-pressed={editingSlot===category.id} onClick={()=>selectAccessory(category.id)} sx={{color:'#fff',flexShrink:0,textTransform:'none',bgcolor:editingSlot===category.id?'#6258b4':'transparent'}}>{category.accessoryName}</Button>)}
                            </Box>
                        </Stack>}
                        {(slot==='brows'||slot==='eyes'||slot==='nose')&&<Stack direction={{xs:'column',md:'row'}} gap={3} sx={{px:1,mb:2,flexWrap:slot==='nose'?'wrap':'nowrap'}}>
                            {(slot==='nose'?[
                                {key:'noseBridgeLength',label:'Độ dài sống mũi',id:'nose-bridge-length-label',min:.4,max:1.75,step:.01,value:1,left:'Ngắn',right:'Dài'},
                                {key:'noseAlarWidth',label:'Độ rộng cánh mũi',id:'nose-alar-width-label',min:.5,max:1.75,step:.01,value:1,left:'Hẹp',right:'Rộng'},
                                {key:'noseTipVolume',label:'Độ đầy và tròn của đầu mũi',id:'nose-tip-volume-label',min:.45,max:1.85,step:.01,value:1,left:'Thon',right:'Tròn đầy'},
                                {key:'nostrilTilt',label:'Độ nghiêng lỗ mũi',id:'nostril-tilt-label',min:-2,max:2,step:.01,value:0,left:'Khuất',right:'Lộ rõ'},
                            ]:slot==='eyes'?[
                                {key:'eyeSize',label:'Độ lớn của mắt',id:'eye-size-label',min:.8,max:2,step:.01,value:1,left:'Nhỏ',right:'Lớn'},
                                {key:'eyeSpacing',label:'Khoảng cách hai mắt',id:'eye-spacing-label',min:.4,max:1.15,step:.01,value:1,left:'Gần nhau',right:'Xa nhau'},
                            ]:[
                                {key:'browHeight',label:'Khoảng cách chân mày – mắt',id:'brow-distance-label',min:-.09,max:.09,step:.001,value:0,left:'Gần mắt',right:'Xa mắt'},
                                {key:'browSpacing',label:'Khoảng cách hai chân mày',id:'brow-spacing-label',min:-.36,max:.18,step:.001,value:0,left:'Gần nhau',right:'Xa nhau'},
                                {key:'browThickness',label:'Độ dày chân mày',id:'brow-thickness-label',min:.7,max:1.6,step:.01,value:1,left:'Mỏng',right:'Dày'},
                                {key:'browLength',label:'Độ dài chân mày',id:'brow-length-label',min:.7,max:2,step:.01,value:1,left:'Ngắn',right:'Dài'},
                                {key:'browAngle',label:'Góc chân mày',id:'brow-angle-label',min:-180,max:180,step:1,value:0,left:'−180°',right:'+180°'},
                            ]).map(control=><Box key={control.key} sx={{flex:1,minWidth:{xs:0,md:slot==='nose'?145:0}}}>
                                <PartAdjustmentSlider label={control.label} defaultValue={control.value} left={control.left} right={control.right} angle={control.key==='browAngle'} labelId={control.id} min={control.min} max={control.max} step={control.step} value={(config.parameters?.[control.key]??control.value)*(control.key==='browAngle'?180/Math.PI:1)} disabled={disabled} onCommit={value=>setConfig(current=>current?{...current,parameters:{...current.parameters,[control.key]:value*(control.key==='browAngle'?Math.PI/180:1)}}:current)}/>
                            </Box>)}
                        </Stack>}
                        <Box data-horizontal-options role="tabpanel" id="design-assets-panel" aria-labelledby={`design-tab-${slot}`} sx={{display:'flex',gap:1.5,overflowX:'auto',overscrollBehaviorX:'contain',pb:1}}>
                            {current?.id!=='skin'&&currentItems.map(item=><Button key={item.id} disabled={disabled} aria-label={item.name} aria-pressed={config.selections[editingSlot]===item.id} onClick={()=>chooseItem(item.id)} sx={{position:'relative',flexShrink:0,width:{xs:100,sm:116},minWidth:0,p:.5,textTransform:'none',display:'flex',flexDirection:'column',gap:.5,border:'2px solid',borderColor:config.selections[editingSlot]===item.id?'white':'#202238',borderRadius:2.5,color:'white',bgcolor:config.selections[editingSlot]===item.id?'rgba(232,230,255,.2)':'rgba(17,20,37,.4)','&:hover':{bgcolor:'rgba(232,230,255,.15)'}}}>
                                {item.thumbnail?<Box component="img" src={`${process.env.PUBLIC_URL||''}/images/character-design/${item.thumbnail}`} alt="" sx={{width:'100%',aspectRatio:'1',objectFit:'contain',borderRadius:1.5,bgcolor:'#151a28'}}/>:<Box sx={{height:70,display:'grid',placeItems:'center'}}><CheckCircleIcon/></Box>}
                                {config.selections[editingSlot]===item.id&&<CheckCircleIcon sx={{position:'absolute',top:8,right:8,fontSize:18,color:'white',filter:'drop-shadow(0 1px 3px #000)'}}/>}
                                <Typography variant="caption" sx={{fontSize:11,lineHeight:1.3,pb:.5,color:'#fff'}}>{item.name}</Typography>
                            </Button>)}
                        </Box>

                    </Box>
                </Box>
            </Box>}
            {catalog?.replacing&&<Alert severity="info" sx={{borderRadius:0}}>Lưu sẽ thay ngoại hình hiện tại của vai này bằng nhân vật default đã phối. Các beat dùng vai này cần dựng lại để cập nhật.</Alert>}
        </DialogContent>

    </Dialog>;
}
