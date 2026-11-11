import React from 'react';
import {Alert,Box,Button,IconButton as MuiIconButton,Slider,Stack,Tooltip,Typography} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RecordVoiceOverIcon from '@mui/icons-material/RecordVoiceOver';
import GestureIcon from '@mui/icons-material/Gesture';
import PolylineIcon from '@mui/icons-material/Polyline';
import DrawIcon from '@mui/icons-material/Create';
import CheckIcon from '@mui/icons-material/Check';
import UndoIcon from '@mui/icons-material/Undo';
import CloseIcon from '@mui/icons-material/Close';
import ColorizeIcon from '@mui/icons-material/Colorize';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import GridOnIcon from '@mui/icons-material/GridOn';
import {resizePhotoFaceRegion} from './photoFaceRegion';
import {validFaceContour,simplifyFaceStroke,MAX_FACE_CONTOUR_POINTS} from './photoFaceContour';
import type {PhotoFaceConfig,PhotoFaceEye,PhotoFaceMouth} from 'helpers/shortVideoSceneAssets';

export const defaultPhotoFace = (image:PhotoFaceConfig['image']):PhotoFaceConfig => ({
    image,x:0,y:0,scale:1,rotation:0,width:.18,height:.24,feather:.12,blinkInterval:3.8,blinkDuration:.24,
    eyes:{left:{x:.35,y:.4,width:.18,height:.08,angle:0},right:{x:.65,y:.4,width:.18,height:.08,angle:0}},
});

export async function readPhotoFace(file:File):Promise<PhotoFaceConfig> {
    if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('Chọn ảnh JPG, PNG hoặc WebP.');
    if(file.size>15*1024*1024)throw new Error('Ảnh tối đa 15 MB.');
    const url=URL.createObjectURL(file);
    try {
        const image=new Image();image.src=url;
        try{await image.decode();}catch{throw new Error('Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP hợp lệ.');}
        if(image.naturalWidth<16||image.naturalHeight<16)throw new Error('Ảnh quá nhỏ.');
        const ratio=Math.min(1,384/Math.max(image.naturalWidth,image.naturalHeight));
        const canvas=document.createElement('canvas');
        canvas.width=Math.max(16,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(16,Math.round(image.naturalHeight*ratio));
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Không đọc được ảnh trên trình duyệt này.');
        ctx.fillStyle='#E0A97C';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
        const rgba=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        const chunks:string[]=[];
        for(let start=0;start<rgba.length;start+=4096*4){
            let chunk='';for(let i=start;i<Math.min(start+4096*4,rgba.length);i+=4)chunk+=String.fromCharCode(rgba[i],rgba[i+1],rgba[i+2]);chunks.push(chunk);
        }
        return defaultPhotoFace({width:canvas.width,height:canvas.height,pixels:btoa(chunks.join(''))});
    } finally {URL.revokeObjectURL(url);}
}

const IconButton=({title,disabled,...props}:React.ComponentProps<typeof MuiIconButton>)=><Tooltip title={title||props['aria-label']||''} arrow><span style={{display:'inline-flex'}}><MuiIconButton {...props} title={title} disabled={disabled}/></span></Tooltip>;
export const defaultPhotoMouth=():PhotoFaceMouth=>({x:.5,y:.74,width:.3,height:.08,angle:0,lineLeft:0,lineCenter:0,lineRight:0,teeth:true});
type Side = 'left'|'right'|'mouth'|'nose'|'browLeft'|'browRight';
const extraRegions = {nose:{label:'Mũi',x:.5,y:.57,width:.16,height:.20,angle:0},browLeft:{label:'Chân mày trái',x:.35,y:.29,width:.22,height:.06,angle:0},browRight:{label:'Chân mày phải',x:.65,y:.29,width:.22,height:.06,angle:0}};
const setRegion=(photo:PhotoFaceConfig,side:Side,next:PhotoFaceEye):PhotoFaceConfig=>side==='left'||side==='right'?{...photo,eyes:{...photo.eyes,[side]:next}}:{...photo,[side]:next};
const region = (photo:PhotoFaceConfig,side:Side)=>side==='left'||side==='right'?photo.eyes[side]:photo[side];
type Point = {x:number;y:number};
type Gesture = {kind:'photo'|'move'|'resize'|'rotate'|'line'|'sculpt';side:Side;line:'lineLeft'|'lineCenter'|'lineRight';corner:Point;start:Point;initial:PhotoFaceConfig};
const colorPickerCursor=`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M15 3l6 6-3 3-2-2-9 9-4 1 1-4 9-9-2-2z' fill='white' stroke='%23151a28' stroke-width='2'/%3E%3C/svg%3E") 3 21, crosshair`;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const turn=(p:Point,angle:number):Point=>({x:Math.cos(angle)*p.x-Math.sin(angle)*p.y,y:Math.sin(angle)*p.x+Math.cos(angle)*p.y});
const imagePoint=(point:Point,photo:PhotoFaceConfig):Point=>{
    const p=turn({x:(point.x-.5-photo.x)/photo.scale,y:(point.y-.5-photo.y)/photo.scale},-photo.rotation*Math.PI/180);
    return {x:p.x+.5,y:p.y+.5};
};
export type PhotoFaceEditorHandle = {upload:(file:File)=>void};
type Props = {value?:PhotoFaceConfig;disabled:boolean;onChange:(next:PhotoFaceConfig|undefined)=>void;onBlink:(value:number|'loop'|undefined)=>void;onBusyChange?:(busy:boolean)=>void;onOpenChange?:(open:boolean)=>void;onSpeaking?:(speaking:boolean)=>void;outline?:number[][];skinColor?:string;onSkinColor?:(color:string)=>void;onContourDraftChange?:(drawing:boolean)=>void};
const PhotoFaceEditor=React.forwardRef<PhotoFaceEditorHandle,Props>(function PhotoFaceEditor({value,disabled,onChange,onBlink,onBusyChange,onOpenChange,onSpeaking,outline=[],skinColor='#E0A97C',onSkinColor,onContourDraftChange},ref) {
    const [error,setError]=React.useState(''),[loading,setLoading]=React.useState(false),[open,setOpen]=React.useState(true);
    const [visibleEyes,setVisibleEyes]=React.useState({left:false,right:false});
    const [visibleExtras,setVisibleExtras]=React.useState({nose:false,browLeft:false,browRight:false});
    const [showMouth,setShowMouth]=React.useState(false),[speaking,setSpeaking]=React.useState(false);
    const [warpMode,setWarpMode]=React.useState(false),[pickingColor,setPickingColor]=React.useState(false);
    const [selectedRegion,setSelectedRegion]=React.useState<Side|null>(null);
    const [contourTarget,setContourTarget]=React.useState<Side|null>(null);
    const [contourMode,setContourMode]=React.useState<'points'|'freehand'|null>(null);
    const [contourDraft,setContourDraft]=React.useState<Point[]|null>(null);
    const stroke=React.useRef<Point[]|null>(null),vertexDrag=React.useRef<{index:number;start:Point;initial:PhotoFaceConfig}|null>(null);
    const showLayer=warpMode||!!contourMode&&!contourTarget;
    const hasContourDraft=contourDraft!==null;
    React.useEffect(()=>{onContourDraftChange?.(hasContourDraft);},[hasContourDraft,onContourDraftChange]);
    const [brush,setBrush]=React.useState<Point|null>(null);
    const [blink,setBlink]=React.useState<number|'loop'|undefined>();
    const canvas=React.useRef<HTMLCanvasElement>(null),input=React.useRef<HTMLInputElement>(null),drag=React.useRef<Gesture|null>(null);
    const hasPhoto=!!value;
    const uploadVersion=React.useRef(0),latest=React.useRef({value,disabled,loading});
    latest.current={value,disabled,loading};
    React.useEffect(()=>()=>{uploadVersion.current++;},[]);
    React.useEffect(()=>{onOpenChange?.(hasPhoto&&open);},[hasPhoto,open,onOpenChange]);
    const upload=React.useCallback(async(file:File)=>{
        if(latest.current.disabled||latest.current.loading||latest.current.value)return;
        const version=++uploadVersion.current;latest.current.loading=true;setLoading(true);onBusyChange?.(true);setError('');
        try{
            const next=await readPhotoFace(file);
            if(version===uploadVersion.current){onChange(next);setOpen(true);setVisibleEyes({left:false,right:false});setBlink(undefined);onBlink(undefined);}
        }catch(e){if(version===uploadVersion.current)setError(e instanceof Error?e.message:'Không đọc được ảnh.');}
        finally{if(version===uploadVersion.current){latest.current.loading=false;setLoading(false);onBusyChange?.(false);}}
    },[onChange,onBlink,onBusyChange]);
    React.useImperativeHandle(ref,()=>({upload:file=>{void upload(file);}}),[upload]);
    React.useEffect(()=>{
        const paste=(event:ClipboardEvent)=>{
            if(latest.current.value||latest.current.disabled||latest.current.loading)return;
            const file=Array.from(event.clipboardData?.items||[]).find(item=>item.kind==='file'&&item.type.startsWith('image/'))?.getAsFile()
                ||Array.from(event.clipboardData?.files||[]).find(file=>file.type.startsWith('image/'));
            if(file){event.preventDefault();void upload(file);}
        };
        document.addEventListener('paste',paste);
        return ()=>document.removeEventListener('paste',paste);
    },[upload]);
    const source=React.useMemo(()=>{
        if(!value)return null;
        const result=document.createElement('canvas');result.width=value.image.width;result.height=value.image.height;
        const ctx=result.getContext('2d');if(!ctx)return null;
        const data=ctx.createImageData(result.width,result.height),bytes=atob(value.image.pixels);
        for(let i=0,j=0;i<bytes.length;i+=3,j+=4){data.data[j]=bytes.charCodeAt(i);data.data[j+1]=bytes.charCodeAt(i+1);data.data[j+2]=bytes.charCodeAt(i+2);data.data[j+3]=255;}
        ctx.putImageData(data,0,0);return result;
    },[value?.image]);
    const warpedSource=React.useMemo(()=>{
        if(!source||!value?.warp)return source;
        const width=source.width,height=source.height,ctx=source.getContext('2d');if(!ctx)return source;
        const pixels=ctx.getImageData(0,0,width,height).data,result=document.createElement('canvas');result.width=width;result.height=height;
        const dest=result.getContext('2d');if(!dest)return source;
        const data=dest.createImageData(width,height),grid=value.warp;
        for(let y=0;y<height;y++)for(let x=0;x<width;x++){
            const u=(x+.5)/width,v=(y+.5)/height,gx=u*6,gy=v*6,ix=Math.min(5,Math.floor(gx)),iy=Math.min(5,Math.floor(gy)),fx=gx-ix,fy=gy-iy;
            const a=grid[iy*7+ix],b=grid[iy*7+ix+1],c=grid[iy*7+ix+7],d=grid[iy*7+ix+8];
            const dx=(a.x*(1-fx)+b.x*fx)*(1-fy)+(c.x*(1-fx)+d.x*fx)*fy,dy=(a.y*(1-fx)+b.y*fx)*(1-fy)+(c.y*(1-fx)+d.y*fx)*fy;
            const px=clamp((u+dx)*width-.5,0,width-1),py=clamp((v+dy)*height-.5,0,height-1),x0=Math.floor(px),y0=Math.floor(py),tx=px-x0,ty=py-y0;
            for(let channel=0;channel<3;channel++){
                const at=(xx:number,yy:number)=>pixels[(yy*width+xx)*4+channel];
                data.data[(y*width+x)*4+channel]=(at(x0,y0)*(1-tx)+at(Math.min(width-1,x0+1),y0)*tx)*(1-ty)+(at(x0,Math.min(height-1,y0+1))*(1-tx)+at(Math.min(width-1,x0+1),Math.min(height-1,y0+1))*tx)*ty;
            }
            data.data[(y*width+x)*4+3]=255;
        }
        dest.putImageData(data,0,0);return result;
    },[source,value?.warp]);
    React.useEffect(()=>{
        const ctx=canvas.current?.getContext('2d');if(!ctx||!value||!warpedSource)return;
        ctx.clearRect(0,0,384,384);ctx.fillStyle='#30374d';ctx.fillRect(0,0,384,384);
        ctx.save();
        if(showLayer){ctx.translate(384*(1-1/1.3)/2,384*(1-1/1.3)/2);ctx.scale(1/1.3,1/1.3);}
        ctx.translate(384*(.5+value.x),384*(.5+value.y));ctx.rotate(value.rotation*Math.PI/180);ctx.scale(value.scale,value.scale);ctx.translate(-192,-192);
        ctx.drawImage(warpedSource,0,0,384,384);ctx.restore();
    },[warpedSource,value,open,showLayer]);
    const update=(next:Partial<PhotoFaceConfig>)=>{if(value)onChange({...value,...next});};
    const point=(event:React.PointerEvent<SVGSVGElement>):Point=>{
        const rect=event.currentTarget.getBoundingClientRect(),view=showLayer?1.3:1;return {x:(event.clientX-rect.left)/rect.width*view-(view-1)/2,y:(event.clientY-rect.top)/rect.height*view-(view-1)/2};
    };
    const contourPoint=(event:React.PointerEvent<SVGSVGElement>):Point=>{
        if(!value)return {x:0,y:0};
        const p=imagePoint(point(event),value);return {x:clamp(p.x,0,1),y:clamp(p.y,0,1)};
    };
    const savedContour=value?(contourTarget?region(value,contourTarget)?.contour:value.contour):undefined;
    const applyContour=(photo:PhotoFaceConfig,points:Point[]|undefined)=>{
        if(!contourTarget)return {...photo,contour:points};
        const r=region(photo,contourTarget);if(!r)return photo;
        if(!points)return setRegion(photo,contourTarget,{...r,contour:undefined});
        const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
        return setRegion(photo,contourTarget,{...r,x:clamp((minX+maxX)/2,.05,.95),y:clamp((minY+maxY)/2,.05,.95),width:clamp(maxX-minX,.06,contourTarget==='mouth'?.6:.35),height:clamp(maxY-minY,.02,contourTarget==='mouth'?.25:.2),angle:0,contour:points});
    };
    const selectRegion=(side:Side)=>{setSelectedRegion(side);cancelContour();setContourMode(value&&region(value,side)?.contour?'points':null);setContourTarget(side);};
    const finishContour=(points:Point[],freehand=false)=>{
        if(!value)return;
        const polygon=freehand?simplifyFaceStroke(points,contourTarget?.0004:.002):points;
        if(!validFaceContour(polygon,contourTarget?.0000002:.0002)){setError(contourTarget?'Vùng chi tiết cần ít nhất 3 đỉnh và không tự cắt nhau. Hãy vẽ một vòng quanh chi tiết.':'Viền mặt cần ít nhất 3 đỉnh, có diện tích và không tự cắt nhau.');setContourDraft(polygon);return;}
        onChange(applyContour(value,polygon));setContourDraft(null);setError('');
    };
    const beginContour=(mode:'points'|'freehand')=>{
        setContourMode(mode);setContourDraft([]);setWarpMode(false);setPickingColor(false);setBrush(null);setError('');
    };
    const cancelContour=()=>{stroke.current=null;vertexDrag.current=null;setContourDraft(null);setError('');};
    const pointerUp=()=>{
        if(stroke.current){const points=stroke.current;stroke.current=null;finishContour(points,true);}
        vertexDrag.current=null;drag.current=null;
    };
    const cancelPointer=()=>{
        if(stroke.current){stroke.current=null;setContourDraft(null);}
        vertexDrag.current=null;drag.current=null;
    };
    const pointerDown=(event:React.PointerEvent<SVGSVGElement>)=>{
        if(disabled||!value||event.button!==0)return;
        const selected=(event.target as Element).closest<SVGElement>('[data-region-select]');
        if(selected&&contourDraft===null){
            const side=selected.dataset.regionSelect as Side;selectRegion(side);
            if(side==='left'||side==='right')setVisibleEyes(current=>({...current,[side]:true}));
            else if(side==='mouth')setShowMouth(true);else setVisibleExtras(current=>({...current,[side]:true}));
            event.preventDefault();return;
        }
        if(contourMode){
            const p=contourPoint(event),target=(event.target as Element).closest<SVGElement>('[data-contour-vertex]');
            if(contourDraft!==null){
                if(contourMode==='freehand'){
                    stroke.current=[p];setContourDraft([p]);event.currentTarget.setPointerCapture(event.pointerId);
                }else{
                    const first=contourDraft[0],rect=event.currentTarget.getBoundingClientRect();
                    const nearFirst=first&&Math.hypot(p.x-first.x,p.y-first.y)*value.scale*rect.width/(showLayer?1.3:1)<=(contourTarget?6:10);
                    if(target?.dataset.contourVertex==='0'||nearFirst&&contourDraft.length>=3){if(contourDraft.length>=3)finishContour(contourDraft);else setError('Cần ít nhất 3 đỉnh trước khi đóng vùng.');}
                    else if(contourDraft.length>=MAX_FACE_CONTOUR_POINTS)setError('Tối đa 64 đỉnh. Bấm điểm đầu hoặc nút Đóng vùng để hoàn tất.');
                    else setContourDraft([...contourDraft,p]);
                }
            }else if(target&&savedContour){
                vertexDrag.current={index:Number(target.dataset.contourVertex),start:p,initial:value};event.currentTarget.setPointerCapture(event.pointerId);
            }
            event.preventDefault();return;
        }
        if(pickingColor){
            const picked=imagePoint(point(event),value),ctx=warpedSource?.getContext('2d');
            if(ctx&&warpedSource&&picked.x>=0&&picked.x<=1&&picked.y>=0&&picked.y<=1){
                const rgb=ctx.getImageData(Math.min(warpedSource.width-1,Math.floor(picked.x*warpedSource.width)),Math.min(warpedSource.height-1,Math.floor(picked.y*warpedSource.height)),1,1).data;
                onSkinColor?.('#'+Array.from(rgb.slice(0,3)).map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase());setPickingColor(false);
            }
            event.preventDefault();return;
        }
        const handle=(event.target as Element).closest<SVGElement>('[data-eye]');
        drag.current={kind:(handle?.dataset.action as Gesture['kind'])||(warpMode?'sculpt':'photo'),side:(handle?.dataset.eye as Side)||'left',line:(handle?.dataset.line as Gesture['line'])||'lineCenter',corner:{x:Number(handle?.dataset.cx??1),y:Number(handle?.dataset.cy??1)},start:point(event),initial:value};
        event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();
    };
    const pointerMove=(event:React.PointerEvent<SVGSVGElement>)=>{
        if(disabled)return;
        if(stroke.current){
            const p=contourPoint(event),points=stroke.current,last=points[points.length-1];
            if(Math.hypot(p.x-last.x,p.y-last.y)>.003){
                points.push(p);
                if(points.length>1024)stroke.current=points.filter((_,i)=>i===0||i%2===1);
                setContourDraft([...(stroke.current||points)]);
            }
            return;
        }
        if(vertexDrag.current){
            const gesture=vertexDrag.current,p=contourPoint(event),initial=contourTarget?region(gesture.initial,contourTarget)?.contour:gesture.initial.contour;
            if(!initial)return;
            const next=initial.map((v,i)=>i===gesture.index?{x:clamp(v.x+p.x-gesture.start.x,0,1),y:clamp(v.y+p.y-gesture.start.y,0,1)}:v);
            if(validFaceContour(next,contourTarget?.0000002:.0002)){onChange(applyContour(gesture.initial,next));setError('');}
            else setError('Không thể kéo đỉnh làm viền mặt tự cắt nhau.');
            return;
        }
        const current=point(event);if(warpMode)setBrush(current);
        const gesture=drag.current;if(!gesture||disabled)return;
        const photo=gesture.initial;
        if(gesture.kind==='sculpt'){
            const start=imagePoint(gesture.start,photo),next=imagePoint(current,photo),dx=clamp(next.x-start.x,-.12,.12),dy=clamp(next.y-start.y,-.12,.12);
            const radius=.1/photo.scale;
            const weights=Array.from({length:49},(_,i)=>Math.exp(-Math.pow(Math.hypot((i%7)/6-start.x,Math.floor(i/7)/6-start.y)/radius,2)));
            const peak=Math.max(...weights,1e-12);
            const warp=weights.map((raw,i)=>{
                const weight=raw/peak<.005?0:raw/peak,initial=photo.warp?.[i]||{x:0,y:0};
                return {x:clamp(initial.x-clamp(dx,-.06,.06)*weight,-.35,.35),y:clamp(initial.y-clamp(dy,-.06,.06)*weight,-.35,.35)};
            });
            onChange({...photo,warp});return;
        }
        if(gesture.kind==='photo'){
            onChange({...photo,x:clamp(photo.x+current.x-gesture.start.x,-.75,.75),y:clamp(photo.y+current.y-gesture.start.y,-.75,.75)});return;
        }
        const start=imagePoint(gesture.start,photo),next=imagePoint(current,photo),eye=region(photo,gesture.side);
        if(!eye)return;
        const delta=turn({x:next.x-start.x,y:next.y-start.y},-eye.angle*Math.PI/180);
        let updated={...eye};
        if(gesture.kind==='move')updated={...eye,x:clamp(eye.x+next.x-start.x,.05,.95),y:clamp(eye.y+next.y-start.y,.05,.95)};
        if(gesture.kind==='resize')updated=resizePhotoFaceRegion(eye,delta,gesture.corner,gesture.side==='mouth');
        if(gesture.kind==='rotate'){
            const angle=(Math.atan2(next.y-eye.y,next.x-eye.x)-Math.atan2(start.y-eye.y,start.x-eye.x))*180/Math.PI;
            updated.angle=clamp(eye.angle+((angle+540)%360-180),-45,45);
        }
        if(eye.contour)updated.contour=eye.contour.map(p=>{
            const q=turn({x:p.x-eye.x,y:p.y-eye.y},-eye.angle*Math.PI/180);
            const t=turn({x:q.x*updated.width/eye.width,y:q.y*updated.height/eye.height},updated.angle*Math.PI/180);
            return {x:clamp(updated.x+t.x,0,1),y:clamp(updated.y+t.y,0,1)};
        });
        if(gesture.side==='mouth'){
            const mouth=updated as PhotoFaceMouth;
            if(gesture.kind==='line')mouth[gesture.line]=clamp((eye as PhotoFaceMouth)[gesture.line]+delta.y/eye.height,-.45,.45);
            onChange({...photo,mouth});
        }else if(gesture.side==='left'||gesture.side==='right')onChange({...photo,eyes:{...photo.eyes,[gesture.side]:updated}});
        else onChange({...photo,[gesture.side]:updated});
    };
    const previewBlink=(next:number|'loop'|undefined)=>{setBlink(next);onBlink(next);};
    return <>
        <Button size="small" aria-label="Cập nhật gương mặt" title="Tải ảnh hoặc mở công cụ chỉnh gương mặt" variant="contained" startIcon={<AddPhotoAlternateIcon/>} aria-expanded={!!value&&open} disabled={disabled||loading}
            onClick={()=>value?setOpen(current=>!current):input.current?.click()}
            sx={{position:'absolute',top:14,right:16,zIndex:4,textTransform:'none',whiteSpace:'nowrap'}}>{loading?'Đang tải…':'Cập nhật gương mặt'}</Button>
        <input ref={input} hidden type="file" accept="image/jpeg,image/png,image/webp" aria-label="Tải ảnh mặt" disabled={disabled||loading||!!value} onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void upload(file);}}/>
        {error&&<Alert severity="error" onClose={()=>setError('')} sx={{position:'absolute',right:16,top:56,zIndex:5,maxWidth:300}}>{error}</Alert>}
        {value&&open&&<Box role="region" aria-label="Chỉnh gương mặt" sx={{position:'absolute',right:16,top:58,bottom:60,width:{xs:'46%',sm:320,md:360},boxSizing:'border-box',zIndex:3,bgcolor:'rgba(31,35,53,.97)',border:'1px solid #505670',borderRadius:2,boxShadow:'0 8px 28px #0006',p:1,display:'flex',flexDirection:'column',gap:.5,overflowY:'auto','& .MuiIconButton-root':{color:'#e0e5f7'},'& .MuiButton-root':{textTransform:'none'}}}>
            <Stack direction="row" gap={.5} flexShrink={0}>
                {(['full_face','features'] as const).map(mode=><Button key={mode} aria-label={mode==='features'?'Ghép từng chi tiết':'Ghép toàn mặt'} aria-pressed={(value.mode||'full_face')===mode} size="small" title={mode==='features'?'Chỉ ghép mắt, mũi, miệng và chân mày lên đầu 3D':'Ghép toàn bộ ảnh gương mặt'} disabled={disabled} variant={(value.mode||'full_face')===mode?'contained':'text'} onClick={()=>onChange({...value,mode})}>{mode==='features'?'Ghép từng chi tiết':'Ghép toàn mặt'}</Button>)}
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexShrink={0}>
                <Stack direction="row" gap={.5} flexWrap="wrap">
                    {(['left','right'] as const).map(side=><Button key={side} aria-label={side==='left'?'Mắt trái':'Mắt phải'} title={side==='left'?'Hiện/ẩn khung mắt trái':'Hiện/ẩn khung mắt phải'} size="small" disabled={disabled} aria-pressed={selectedRegion===side&&visibleEyes[side]} onClick={()=>{selectRegion(side);setVisibleEyes(current=>({...current,[side]:selectedRegion===side?!current[side]:true}));}} sx={{minWidth:0,px:{xs:.5,sm:1},whiteSpace:'nowrap',color:visibleEyes[side]?'#9ff5e6':'#adb5ce',bgcolor:visibleEyes[side]?'#254b50':'transparent',fontSize:{xs:10,sm:11}}}>{side==='left'?'Mắt trái':'Mắt phải'}</Button>)}
                    <Button size="small" aria-label="Miệng" title="Hiện/ẩn khung và đường giữa miệng" aria-pressed={selectedRegion==='mouth'&&showMouth} disabled={disabled} onClick={()=>{selectRegion('mouth');if(!value.mouth)onChange({...value,mouth:defaultPhotoMouth()});setShowMouth(current=>selectedRegion==='mouth'?!current:true);}} sx={{minWidth:0,px:.5,color:showMouth?'#ffaac6':'#adb5ce',bgcolor:showMouth?'#553444':'transparent',fontSize:{xs:10,sm:11},whiteSpace:'nowrap'}}>Miệng</Button>
                    {(Object.keys(extraRegions) as (keyof typeof extraRegions)[]).map(key=><Button key={key} aria-label={extraRegions[key].label} size="small" title={`Hiện/ẩn khung ${extraRegions[key].label.toLowerCase()}`} aria-pressed={selectedRegion===key&&visibleExtras[key]} disabled={disabled} onClick={()=>{selectRegion(key);if(!value[key]){const {...bounds}=extraRegions[key];onChange({...value,[key]:bounds});}setVisibleExtras(current=>({...current,[key]:selectedRegion===key?!current[key]:true}));}} sx={{minWidth:0,px:.5,fontSize:11,color:visibleExtras[key]?'#b6b7ff':'#adb5ce'}}>{extraRegions[key].label}</Button>)}
                </Stack>
                <IconButton size="small" aria-label="Bỏ ảnh mặt" title="Bỏ ảnh mặt" disabled={disabled} onClick={()=>{onChange(undefined);previewBlink(undefined);setSpeaking(false);onSpeaking?.(false);setShowMouth(false);cancelContour();setContourMode(null);setOpen(false);}}><DeleteOutlineIcon fontSize="small"/></IconButton>
            </Stack>
            <Box sx={{position:'relative',width:'100%',maxWidth:290,alignSelf:'center',flexShrink:0,aspectRatio:'1',bgcolor:'#30374d',borderRadius:1,overflow:'hidden'}}>
                <canvas ref={canvas} width={384} height={384} aria-label="Ảnh gương mặt" style={{display:'block',width:'100%',height:'100%'}}/>
                <svg viewBox={showLayer?"-57.6 -57.6 499.2 499.2":"0 0 384 384"} role="img" aria-label="Kéo ảnh hoặc kéo, xoay khung mắt" style={{position:'absolute',inset:0,width:'100%',height:'100%',touchAction:'none',cursor:disabled?'default':pickingColor?colorPickerCursor:warpMode||contourMode?'crosshair':'move'}} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelPointer} onLostPointerCapture={cancelPointer} onPointerLeave={()=>setBrush(null)}>
                    <g transform={`translate(${384*(.5+value.x)} ${384*(.5+value.y)}) rotate(${value.rotation}) scale(${value.scale}) translate(-192 -192)`}>
                        {!warpMode&&(Object.keys({left:1,right:1,nose:1,browLeft:1,browRight:1,mouth:1}) as Side[]).filter(side=>side!==selectedRegion).map(side=>{
                            const r=region(value,side);if(!r)return null;
                            const attributes={'data-region-select':side,fill:'none',stroke:'#d4d9ed88',strokeWidth:1/value.scale,style:{cursor:'pointer',pointerEvents:contourDraft!==null?'none':'stroke'} as React.CSSProperties};
                            return r.contour?<path key={side} {...attributes} d={`M ${r.contour.map(p=>`${p.x*384} ${p.y*384}`).join(' L ')} Z`}/>:<ellipse key={side} {...attributes} cx={r.x*384} cy={r.y*384} rx={r.width*192} ry={r.height*192} transform={`rotate(${r.angle} ${r.x*384} ${r.y*384})`}/>;
                        })}
                        {(['left','right'] as const).filter(side=>selectedRegion===side&&visibleEyes[side]&&!warpMode&&!contourMode).map(side=>{
                            const eye=value.eyes[side],w=eye.width*384,h=eye.height*384,r=7/value.scale,color=side==='left'?'#7af5df':'#ffd98a';
                            return <g key={side} transform={`translate(${eye.x*384} ${eye.y*384}) rotate(${eye.angle})`}>
                                <path data-eye={side} data-action="move" aria-label={`Di chuyển mắt ${side==='left'?'trái':'phải'}`} d={`M ${-w/2} 0 Q 0 ${-h} ${w/2} 0 Q 0 ${h} ${-w/2} 0 Z`} fill={`${color}22`} stroke={color} strokeWidth={1.5/value.scale}/>
                                {[-1,1].flatMap(cx=>[-1,1].map(cy=><circle key={`${cx},${cy}`} data-eye={side} data-action="resize" data-cx={cx} data-cy={cy} aria-label={`Đổi kích thước mắt ${side==='left'?'trái':'phải'} ${cx},${cy}`} cx={cx*w/2} cy={cy*h/2} r={r} fill="#20283d" stroke={color} strokeWidth={1.5/value.scale} style={{cursor:cx===cy?'nwse-resize':'nesw-resize'}}/>))}
                                {[-1,1].map(cx=><circle key={`edge-${cx}`} data-eye={side} data-action="resize" data-cx={cx} data-cy={0} aria-label={`Kéo mép mắt ${side==='left'?'trái':'phải'} ${cx}`} cx={cx*w/2} cy={0} r={r} fill={color} stroke="#20283d" style={{cursor:'ew-resize'}}><title>Kéo rộng/hẹp, giữ cố định mép đối diện</title></circle>)}
                                <line x1={0} y1={-h/2} x2={0} y2={-h/2-24/value.scale} stroke={color} strokeWidth={1/value.scale} pointerEvents="none"/>
                                <circle data-eye={side} data-action="rotate" aria-label={`Xoay mắt ${side==='left'?'trái':'phải'}`} cx={0} cy={-h/2-24/value.scale} r={r+1/value.scale} fill={color} stroke="#20283d" style={{cursor:'grab'}}/>
                            </g>;
                        })}
                        {(Object.keys(extraRegions) as (keyof typeof extraRegions)[]).filter(key=>selectedRegion===key&&visibleExtras[key]&&value[key]&&!warpMode&&!contourMode).map(key=>{
                            const e=value[key];
                            if(!e)return null;
                            const w=e.width*384,h=e.height*384,r=7/value.scale,label=extraRegions[key].label;
                            return <g key={key} transform={`translate(${e.x*384} ${e.y*384}) rotate(${e.angle})`}>
                                <ellipse data-eye={key} data-action="move" aria-label={`Di chuyển ${label}`} rx={w/2} ry={h/2} fill="#aaaaff22" stroke="#b6b7ff"/>
                                {[-1,1].flatMap(cx=>[-1,1].map(cy=><circle key={`${cx},${cy}`} data-eye={key} data-action="resize" data-cx={cx} data-cy={cy} cx={cx*w/2} cy={cy*h/2} r={r} fill="#20283d" stroke="#b6b7ff"><title>{`Đổi kích thước ${label}, giữ mép đối diện`}</title></circle>))}
                                <line x1={0} y1={-h/2} x2={0} y2={-h/2-24/value.scale} stroke="#b6b7ff" pointerEvents="none"/>
                                <circle data-eye={key} data-action="rotate" cx={0} cy={-h/2-24/value.scale} r={r} fill="#b6b7ff"><title>{`Xoay ${label}`}</title></circle>
                            </g>;
                        })}
                        {selectedRegion==='mouth'&&showMouth&&!warpMode&&!contourMode&&value.mouth&&(()=>{
                            const m=value.mouth,w=m.width*384,h=m.height*384,r=7/value.scale;
                            const points=[['lineLeft',-w/2,m.lineLeft*h],['lineCenter',0,m.lineCenter*h],['lineRight',w/2,m.lineRight*h]] as const;
                            return <g transform={`translate(${m.x*384} ${m.y*384}) rotate(${m.angle})`}>
                                <path data-eye="mouth" data-action="move" aria-label="Di chuyển miệng" d={`M ${-w/2} 0 Q 0 ${-h} ${w/2} 0 Q 0 ${h} ${-w/2} 0 Z`} fill="#ffaac622" stroke="#ffaac6" strokeWidth={1.5/value.scale}/>
                                {[-1,1].flatMap(cx=>[-1,1].map(cy=><circle key={`${cx},${cy}`} data-eye="mouth" data-action="resize" data-cx={cx} data-cy={cy} aria-label={`Đổi kích thước miệng ${cx},${cy}`} cx={cx*w/2} cy={cy*h/2} r={r} fill="#20283d" stroke="#ffaac6" style={{cursor:cx===cy?'nwse-resize':'nesw-resize'}}/>))}
                                {[-1,1].map(cx=><g key={`mouth-edge-${cx}`}>
                                    <line x1={cx*w/2} y1={0} x2={cx*(w/2+15/value.scale)} y2={0} stroke="#ffaac6" pointerEvents="none"/>
                                    <circle data-eye="mouth" data-action="resize" data-cx={cx} data-cy={0} aria-label={`Kéo mép miệng ${cx}`} cx={cx*(w/2+15/value.scale)} cy={0} r={r} fill="#ffaac6" stroke="#20283d" style={{cursor:'ew-resize'}}><title>Kéo rộng/hẹp, giữ cố định mép đối diện</title></circle>
                                </g>)}
                                <path d={`M ${-w/2} ${m.lineLeft*h} Q 0 ${(2*m.lineCenter-(m.lineLeft+m.lineRight)/2)*h} ${w/2} ${m.lineRight*h}`} fill="none" stroke="#fff0a0" strokeWidth={2/value.scale} pointerEvents="none"/>
                                {points.map(([key,x,y])=><circle key={key} data-eye="mouth" data-action="line" data-line={key} aria-label={`Đường giữa miệng ${key}`} cx={x} cy={y} r={r} fill="#fff0a0" stroke="#20283d" style={{cursor:'ns-resize'}}/>)}
                                <line x1={0} y1={-h/2} x2={0} y2={-h/2-24/value.scale} stroke="#ffaac6" pointerEvents="none"/>
                                <circle data-eye="mouth" data-action="rotate" aria-label="Xoay miệng" cx={0} cy={-h/2-24/value.scale} r={r+1/value.scale} fill="#ffaac6" style={{cursor:'grab'}}/>
                            </g>;
                        })()}
                        {contourMode&&(()=>{
                            const points=contourDraft??savedContour??[];
                            return <g>
                                {points.length>1&&<path aria-label="Đường bao vẽ tay" d={`M ${points.map(p=>`${p.x*384} ${p.y*384}`).join(' L ')}${contourDraft===null?' Z':''}`} fill={contourDraft===null?'#69e5ff18':'none'} stroke="#69e5ff" strokeWidth={1.5/value.scale} pointerEvents="none"/>}
                                {(contourMode==='points'||contourDraft===null)&&points.map((p,i)=><circle key={i} data-contour-vertex={i} aria-label={`${contourTarget?'Đỉnh chi tiết':'Đỉnh viền mặt'} ${i+1}`} cx={p.x*384} cy={p.y*384} r={7/value.scale} fill={i===0?'#93ffb3':'#69e5ff'} stroke="#162331" strokeWidth={1.5/value.scale} style={{cursor:contourDraft!==null&&i===0?'pointer':'move'}}/>)}
                            </g>;
                        })()}
                    </g>
                    {showLayer&&!contourMode&&outline.length>2&&<path aria-label="Lớp viền gương mặt" d={`M -58 -58 H 442 V 442 H -58 Z M ${outline.map(p=>`${p[0]*384} ${p[1]*384}`).join(' L ')} Z`} fill="#08132280" fillRule="evenodd" stroke="#d5ffe9" strokeWidth={1.5} strokeDasharray="5 3" pointerEvents="none"/>}
                    {warpMode&&brush&&<circle cx={brush.x*384} cy={brush.y*384} r={.1*384} fill="none" stroke="#adf5ff" strokeDasharray="4 3" pointerEvents="none"/>}
                </svg>
            </Box>
            <Stack direction="row" gap={.25} alignItems="center" flexWrap="wrap" flexShrink={0}>
                <IconButton size="small" aria-label="Thu nhỏ ảnh" title="Thu nhỏ ảnh" disabled={disabled||value.scale<=.4} onClick={()=>update({scale:clamp(value.scale/1.1,.4,3)})}><ZoomOutIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Phóng to ảnh" title="Phóng to ảnh" disabled={disabled||value.scale>=3} onClick={()=>update({scale:clamp(value.scale*1.1,.4,3)})}><ZoomInIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Kéo méo gương mặt" title="Kéo méo gương mặt" aria-pressed={warpMode} disabled={disabled} onClick={()=>{cancelContour();setContourMode(null);setWarpMode(!warpMode);setPickingColor(false);setBrush(null);}} sx={{bgcolor:warpMode?'#31555f':'transparent'}}><GestureIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Vẽ viền mặt" title="Vẽ vùng ảnh ghép lên mặt 3D; giữ nguyên cấu trúc đầu đã chọn" aria-pressed={!!contourMode&&!contourTarget} disabled={disabled} onClick={()=>{setContourTarget(null);setSelectedRegion(null);if(contourMode&&!contourTarget){cancelContour();setContourMode(null);}else{setContourMode('points');setContourDraft(value.contour?null:[]);setWarpMode(false);setPickingColor(false);setBrush(null);}}} sx={{bgcolor:contourMode&&!contourTarget?'#31555f':'transparent'}}><PolylineIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Đặt lại kéo méo" title="Đặt lại kéo méo" disabled={disabled||!value.warp} onClick={()=>update({warp:undefined})}><RestartAltIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Xoay ảnh trái" title="Xoay ảnh trái" disabled={disabled} onClick={()=>update({rotation:((value.rotation-5+540)%360)-180})}><RotateLeftIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Xoay ảnh phải" title="Xoay ảnh phải" disabled={disabled} onClick={()=>update({rotation:((value.rotation+5+540)%360)-180})}><RotateRightIcon fontSize="small"/></IconButton>
                <Button size="small" startIcon={<ColorizeIcon fontSize="small" sx={{color:skinColor}}/>} aria-label="Lấy màu da từ ảnh" title="Chọn một điểm trên ảnh để lấy mã màu da" aria-pressed={pickingColor} disabled={disabled} onClick={()=>{cancelContour();setContourMode(null);setPickingColor(!pickingColor);setWarpMode(false);setBrush(null);}} sx={{minWidth:0,px:.75,color:'#e0e5f7',bgcolor:pickingColor?'#414d6b':'transparent',fontSize:11}}>{skinColor.toUpperCase()}</Button>
            </Stack>
            {selectedRegion&&<Stack direction="row" gap={.5} flexWrap="wrap" flexShrink={0}>
                <Typography variant="caption" sx={{width:'100%',color:'#bdefff'}}>{selectedRegion==='left'?'Mắt trái':selectedRegion==='right'?'Mắt phải':selectedRegion==='mouth'?'Miệng':extraRegions[selectedRegion].label}</Typography>
                {(['points','freehand','fixed'] as const).map(mode=><Button key={mode} size="small" aria-pressed={mode==='fixed'?!region(value,selectedRegion)?.contour&&!contourMode:contourMode===mode&&contourTarget===selectedRegion} aria-label={mode==='points'?'Chi tiết: Nối điểm':mode==='freehand'?'Chi tiết: Vẽ liên tục':'Chi tiết: Hình cố định'} title={mode==='fixed'?'Dùng khung cố định và bỏ đường bao tự vẽ':'Vẽ vùng cho chi tiết đang chọn; có thể kéo chỉnh từng đỉnh sau khi đóng vùng'} disabled={disabled} onClick={()=>{setContourTarget(selectedRegion);if(mode==='fixed'){cancelContour();setContourMode(null);const r=region(value,selectedRegion);if(r)onChange(setRegion(value,selectedRegion,{...r,contour:undefined}));}else{setContourMode(mode);setContourDraft([]);setWarpMode(false);setPickingColor(false);}}}>{mode==='points'?'Nối điểm':mode==='freehand'?'Vẽ liên tục':'Hình cố định'}</Button>)}
            </Stack>}
            {selectedRegion&&value.mode==='features'&&region(value,selectedRegion)&&<Box sx={{px:1,flexShrink:0}}>
                <Typography id="photo-detail-size" variant="caption">Kích thước trên gương mặt</Typography>
                <Slider size="small" aria-labelledby="photo-detail-size" disabled={disabled} min={.1} max={4} step={.05} value={region(value,selectedRegion)?.placementScale??1} valueLabelDisplay="auto" valueLabelFormat={n=>`${Math.round(n*100)}%`} onChange={(_,n)=>{const r=region(value,selectedRegion);if(r)onChange(setRegion(value,selectedRegion,{...r,placementScale:n as number}));}}/>
            </Box>}
            {contourMode&&<Stack direction="row" gap={.5} flexWrap="wrap" alignItems="center" flexShrink={0}>
                {!contourTarget&&<><Button size="small" aria-label="Vẽ nối điểm" title="Click lần lượt các điểm, rồi click điểm đầu để đóng vùng" aria-pressed={contourMode==='points'} disabled={disabled} onClick={()=>beginContour('points')} startIcon={<PolylineIcon fontSize="small"/>} sx={{minWidth:0,color:'#bdefff',fontSize:11}}>Nối điểm</Button>
                <Button size="small" aria-label="Vẽ tự do" title="Giữ chuột vẽ đường bao; thả chuột để nối kín vùng" aria-pressed={contourMode==='freehand'} disabled={disabled} onClick={()=>beginContour('freehand')} startIcon={<DrawIcon fontSize="small"/>} sx={{minWidth:0,color:'#bdefff',fontSize:11}}>Vẽ tay</Button></>}
                <IconButton size="small" aria-label="Lùi một điểm" title="Bỏ điểm vừa vẽ" disabled={disabled||!contourDraft?.length} onClick={()=>setContourDraft(points=>points?.slice(0,-1)??null)}><UndoIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label={contourTarget?'Đóng vùng chi tiết':'Đóng vùng viền mặt'} title="Nối kín và áp dụng đường bao" disabled={disabled||!contourDraft||contourDraft.length<3} onClick={()=>{if(contourDraft)finishContour(contourDraft,contourMode==='freehand');}}><CheckIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Hủy vẽ viền" title="Hủy đường đang vẽ, giữ đường bao đã lưu" disabled={disabled||contourDraft===null} onClick={cancelContour}><CloseIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label={contourTarget?'Khôi phục hình chi tiết cố định':'Khôi phục viền mặc định'} title="Bỏ đường bao tự vẽ và dùng lại vùng ghép mặc định" disabled={disabled||!savedContour} onClick={()=>{cancelContour();onChange(applyContour(value,undefined));setContourMode(null);}}><RestartAltIcon fontSize="small"/></IconButton>
            </Stack>}
            <Box sx={{px:1,flexShrink:0}}><Typography id="photo-side-margin" variant="caption">Khoảng hở sát tai</Typography><Slider size="small" aria-labelledby="photo-side-margin" disabled={disabled||!!value.contour} min={0} max={.35} step={.005} value={value.sideMargin??.04} valueLabelDisplay="auto" onChange={(_,n)=>update({sideMargin:n as number})} sx={{display:'block',py:.5}}/></Box>
            <Box sx={{px:1,flexShrink:0}}><Typography id="photo-feather" variant="caption">Độ mềm mép ghép</Typography><Slider size="small" aria-labelledby="photo-feather" disabled={disabled} min={.02} max={1} step={.01} value={value.feather} valueLabelDisplay="auto" onChange={(_,n)=>update({feather:n as number})} sx={{display:'block',py:.5}}/></Box>
            <Stack direction="row" justifyContent="center" flexShrink={0}>
                <IconButton size="small" aria-label="Hiện răng" title="Hiện răng" aria-pressed={value.mouth?.teeth??false} disabled={disabled||!value.mouth} onClick={()=>{if(value.mouth)update({mouth:{...value.mouth,teeth:!value.mouth.teeth}});}} sx={{bgcolor:value.mouth?.teeth?'#553444':'transparent'}}><GridOnIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Nói thử" title="Nói thử" aria-pressed={speaking} disabled={disabled||!value.mouth} onClick={()=>{setSpeaking(!speaking);onSpeaking?.(!speaking);}} sx={{bgcolor:speaking?'#553444':'transparent'}}><RecordVoiceOverIcon fontSize="small"/></IconButton>
                <IconButton size="small" aria-label="Nhắm/mở mắt" title={blink==='loop'?'Dừng xem thử nhắm/mở mắt':'Phát animation nhắm/mở mắt lặp lại'} aria-pressed={blink==='loop'} disabled={disabled} onClick={()=>previewBlink(blink==='loop'?undefined:'loop')} sx={{bgcolor:blink==='loop'?'#414d6b':'transparent'}}><VisibilityIcon fontSize="small"/></IconButton>
            </Stack>
        </Box>}
    </>;
});
export default PhotoFaceEditor;
