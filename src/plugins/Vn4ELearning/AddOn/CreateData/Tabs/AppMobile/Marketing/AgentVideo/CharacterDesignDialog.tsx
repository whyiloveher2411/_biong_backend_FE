import React from 'react';
import {Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {CharacterDesignCatalog, CharacterDesignConfig, SceneAsset, sceneAssetMessage, sceneAssetsRequest} from 'helpers/shortVideoSceneAssets';
import SceneAssetHtmlPreview from './SceneAssetHtmlPreview';

const colorNames: Record<string,string> = {skin:'Màu da', hair:'Màu tóc', eyes:'Màu mắt', lips:'Màu môi', top:'Màu áo', bottom:'Màu quần', shoes:'Màu giày', accessory:'Màu dây buộc tóc'};
const palette = ['#F5F5F5','#9E9E9E','#424242','#9670CF','#982BFA','#5623A7','#4DD0E1','#00E5FF','#005C65','#FFEB3B','#FFFF00','#FFC12B','#81C784','#00E600','#388E3C','#64B5F6','#00B8ED','#1976D2','#E57373','#FF1744','#C62828','#F50087','#AD1457','#E0A97C','#F4D4B5','#AD7351','#754B35','#2B1B14','#D9C4A2','#3A2418','#397B77','#9B4248','#1FA88A','#315B87','#2B3A5C','#EDDFC2','#E8A020','#B85868','#7968A8'];
const emotions = ['neutral','happy','sad','angry','surprised','worried','smug','thinking','crying','laughing'];
const poses = ['idle','stand','sit','kneel','cover_ears','hold_paw','lift_with_helper','carry_cup','carry_bowl'];

/** A self-contained snapshot, shared by preview and the server-side canonical factory. */
export function characterDesignPreview(template: string, config: CharacterDesignConfig, view: string, pose: string, emotion: string): string {
    const json = JSON.stringify(config).replace(/</g, '\\u003c');
    const controls = JSON.stringify({view,pose,emotion}).replace(/</g, '\\u003c');
    return template.replace('__SV_DESIGN_CONFIG__', () => json)
        .replace('</head>', '<style>#ui{display:none}</style></head>')
        .replace('</body>', `<script>window.dispatchEvent(new MessageEvent('message',{source:parent,data:Object.assign({type:'sv-design-preview'},${controls})}));</script></body>`);
}

type Props = {shortVideoId:number; asset:SceneAsset; busy:boolean; onClose:()=>void; onSave:(data:Record<string,unknown>)=>Promise<boolean>};
export default function CharacterDesignDialog({shortVideoId,asset,busy,onClose,onSave}: Props) {
    const [catalog,setCatalog]=React.useState<CharacterDesignCatalog|null>(null);
    const [config,setConfig]=React.useState<CharacterDesignConfig|null>(null);
    const [slot,setSlot]=React.useState('head');
    const [error,setError]=React.useState('');
    const [saving,setSaving]=React.useState(false);
    const [attempt,setAttempt]=React.useState(0);
    const [view,setView]=React.useState('reset');
    const [focusNonce,setFocusNonce]=React.useState(0);
    const [pose,setPose]=React.useState('idle');
    const [emotion,setEmotion]=React.useState('neutral');
    React.useEffect(()=>{
        let active=true;
        setError(''); setCatalog(null); setConfig(null);
        void sceneAssetsRequest(shortVideoId,'design_catalog',{asset_id:asset.id}).then(res=>{
            if(!active)return;
            if(!res.success||!res.designer)throw new Error(sceneAssetMessage(res));
            setCatalog(res.designer);setConfig(res.designer.config);
        }).catch(e=>{if(active)setError(e instanceof Error?e.message:'Không tải được bộ thiết kế.');});
        return ()=>{active=false;};
    },[shortVideoId,asset.id,attempt]);
    const html=React.useMemo(()=>catalog?characterDesignPreview(catalog.template_html,catalog.config,'reset','idle','neutral'):'',[catalog]);
    const previewMessage=React.useMemo(()=>({type:'sv-design-preview',colors:config?.colors,view,pose,emotion,focusNonce}),[config,view,pose,emotion,focusNonce]);
    const current=catalog?.catalog.find(c=>c.id===slot);
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
    return <Dialog open fullWidth maxWidth="xl" onClose={()=>{if(!disabled)onClose();}} aria-labelledby="character-design-title" PaperProps={{sx:{borderRadius:3,overflow:'hidden',bgcolor:'#25283e',color:'#f4f3fb',maxHeight:'96vh',m:{xs:1,sm:2},width:{xs:'calc(100% - 16px)',sm:'calc(100% - 32px)'}}}}>
        <DialogTitle id="character-design-title" sx={{display:'flex',alignItems:'center',flexWrap:'wrap',gap:1,fontSize:{xs:16,sm:20},py:1.25}}>
            Thiết kế nhân vật <Typography component="span" sx={{color:'#b9bdd4'}}>· {asset.name}</Typography>
            <Stack direction="row" gap={1} sx={{ml:'auto'}}>
                <Button size="small" startIcon={<RestartAltIcon/>} disabled={!catalog||disabled} onClick={()=>{if(catalog)setConfig(catalog.config);}}>Đặt lại</Button>
                <Button size="small" disabled={disabled} onClick={onClose}>Hủy</Button>
                <Button size="small" variant="contained" disabled={!config||disabled} onClick={()=>void save()}>{saving?'Đang lưu…':'Lưu nhân vật'}</Button>
            </Stack>
        </DialogTitle>
        <DialogContent sx={{p:0,'&:first-of-type':{pt:0}}}>
            {error&&<Alert severity="error" action={!catalog?<Button onClick={()=>setAttempt(n=>n+1)}>Thử lại</Button>:undefined}>{error}</Alert>}
            {!catalog||!config?<Box sx={{height:'60vh',display:'grid',placeItems:'center'}}><CircularProgress aria-label="Đang tải bộ thiết kế"/></Box>:<Box>
                <Box sx={{position:'relative',bgcolor:'#151a28',minWidth:0,'& iframe':{height:{xs:'32vh !important',md:'43vh !important'},minHeight:220}}}>
                    <Stack direction="row" gap={1} sx={{position:'absolute',top:14,left:16,right:{xs:16,sm:'auto'},zIndex:1,bgcolor:'rgba(24,27,44,.92)',p:1.25,borderRadius:2,color:'#f4f3fb','& .MuiInputBase-root':{color:'inherit',fontSize:13},'& .MuiInputLabel-root':{color:'#c2c5d8'},'& .MuiOutlinedInput-notchedOutline':{borderColor:'#626980'},'& .MuiSvgIcon-root':{color:'#c2c5d8'}}}>
                        <FormControl size="small" sx={{minWidth:0,width:{xs:'50%',sm:155}}}><InputLabel>Tư thế xem thử</InputLabel><Select label="Tư thế xem thử" value={pose} onChange={e=>setPose(e.target.value)}>{poses.map(p=><MenuItem key={p} value={p}>{p}</MenuItem>)}</Select></FormControl>
                        <TextField select size="small" sx={{minWidth:0,width:{xs:'50%',sm:155}}} label="Biểu cảm xem thử" value={emotion} onChange={e=>setEmotion(e.target.value)}>{emotions.map(e=><MenuItem key={e} value={e}>{e}</MenuItem>)}</TextField>
                    </Stack>
                    <SceneAssetHtmlPreview html={html} previewMessage={previewMessage} title={`Thiết kế ${asset.name}`} height="43vh"/>
                    <Stack direction="row" gap={.5} sx={{position:'absolute',bottom:12,right:16,left:{xs:16,sm:'auto'},overflowX:'auto',justifyContent:{xs:'center',sm:'flex-end'}}}>
                        {[['reset','Toàn thân'],['front','Trước'],['side','Nghiêng'],['back','Sau'],['face','Cận mặt']].map(([id,label])=><Button key={id} size="small" aria-pressed={view===id} sx={{flexShrink:0,minWidth:0,px:1.25,color:'white',textTransform:'none',borderRadius:2,bgcolor:view===id?'#6f64d9':'rgba(34,37,58,.85)','&:hover':{bgcolor:'#6258b4'}}} onClick={()=>setView(id)}>{label}</Button>)}
                    </Stack>
                </Box>
                <Box sx={{px:{xs:2,sm:4},pt:2,pb:1.5,background:'linear-gradient(120deg,#434e6b,#50435e)'}}>
                    {current?.colors.map(key=><Stack key={key} direction="row" alignItems="center" spacing={1} sx={{mb:1}}>
                        <Typography variant="caption" sx={{minWidth:70,color:'#e1e3ef'}}>{colorNames[key]||key}</Typography>
                        <Box role="group" aria-label={`Bảng ${colorNames[key]||key}`} sx={{display:'flex',gap:1,overflowX:'auto',p:.5,flex:1,scrollbarWidth:'thin'}}>
                            {Array.from(new Set([catalog.config.colors[key].toUpperCase(),...palette,config.colors[key].toUpperCase()])).map(color=><Box component="button" key={color} title={color} aria-label={`${colorNames[key]} ${color}`} aria-pressed={config.colors[key].toUpperCase()===color} disabled={disabled} onClick={()=>setConfig({...config,colors:{...config.colors,[key]:color}})} sx={{width:{xs:38,sm:44},height:{xs:38,sm:44},flexShrink:0,p:.75,borderRadius:2,border:'2px solid',borderColor:config.colors[key].toUpperCase()===color?'#fff':'transparent',bgcolor:'rgba(20,23,43,.4)',cursor:'pointer','&:hover':{bgcolor:'rgba(20,23,43,.7)'},'&:focus-visible':{outline:'2px solid #c3b6ff',outlineOffset:2}}}><Box component="span" sx={{display:'block',width:'100%',height:'100%',borderRadius:1,bgcolor:color}}/></Box>)}
                        </Box>
                        <Box component="label" title="Chọn màu khác" sx={{display:'flex',alignItems:'center',width:36,height:36,flexShrink:0,border:'1px solid #85859b',borderRadius:1.5,overflow:'hidden'}}><input type="color" aria-label={colorNames[key]||key} value={config.colors[key]} disabled={disabled} onChange={e=>setConfig({...config,colors:{...config.colors,[key]:e.target.value}})} style={{width:42,height:42,border:0,padding:0,background:'transparent',cursor:'pointer'}}/></Box>
                    </Stack>)}
                    <Box sx={{bgcolor:'rgba(20,23,43,.3)',borderRadius:2,px:{xs:1.5,sm:2.5},pt:.5,pb:2}}>
                        <Box role="tablist" aria-label="Bộ phận nhân vật" sx={{display:'flex',gap:{xs:2,sm:3.5},overflowX:'auto',mb:2,scrollbarWidth:'thin'}}>
                            {catalog.catalog.map(category=><Button role="tab" id={`design-tab-${category.id}`} aria-controls="design-assets-panel" aria-selected={slot===category.id} key={category.id} onClick={()=>{setSlot(category.id);setView('part:'+category.id);setFocusNonce(n=>n+1);}} sx={{flexShrink:0,minWidth:0,px:0,py:1.5,color:slot===category.id?'white':'#d2d4e5',borderRadius:0,borderBottom:'2px solid',borderColor:slot===category.id?'white':'transparent',fontSize:{xs:14,sm:16},fontWeight:600,textTransform:'none'}}>{category.name}</Button>)}
                        </Box>
                        <Box role="tabpanel" id="design-assets-panel" aria-labelledby={`design-tab-${slot}`} sx={{display:'flex',gap:1.5,overflowX:'auto',pb:1}}>
                            {current?.items.map(item=><Button key={item.id} disabled={disabled} aria-label={item.name} aria-pressed={config.selections[slot]===item.id} onClick={()=>setConfig({...config,selections:{...config.selections,[slot]:item.id}})} sx={{position:'relative',flexShrink:0,width:{xs:100,sm:116},minWidth:0,p:.5,textTransform:'none',display:'flex',flexDirection:'column',gap:.5,border:'2px solid',borderColor:config.selections[slot]===item.id?'white':'#202238',borderRadius:2.5,color:'white',bgcolor:config.selections[slot]===item.id?'rgba(232,230,255,.2)':'rgba(17,20,37,.4)','&:hover':{bgcolor:'rgba(232,230,255,.15)'}}}>
                                {item.thumbnail?<Box component="img" src={`${process.env.PUBLIC_URL||''}/images/character-design/${item.thumbnail}`} alt="" sx={{width:'100%',aspectRatio:'1',objectFit:'contain',borderRadius:1.5,bgcolor:'#151a28'}}/>:<Box sx={{height:70,display:'grid',placeItems:'center'}}><CheckCircleIcon/></Box>}
                                {config.selections[slot]===item.id&&<CheckCircleIcon sx={{position:'absolute',top:8,right:8,fontSize:18,color:'white',filter:'drop-shadow(0 1px 3px #000)'}}/>}
                                <Typography variant="caption" sx={{fontSize:11,lineHeight:1.3,pb:.5}}>{item.name}</Typography>
                            </Button>)}
                        </Box>

                    </Box>
                </Box>
            </Box>}
            {catalog?.replacing&&<Alert severity="info" sx={{borderRadius:0}}>Lưu sẽ thay ngoại hình hiện tại của vai này bằng nhân vật default đã phối. Các beat dùng vai này cần dựng lại để cập nhật.</Alert>}
        </DialogContent>

    </Dialog>;
}
