import type {PhotoFaceConfig,PhotoFaceEye,PhotoFaceMouth} from 'helpers/shortVideoSceneAssets';
import {validFaceContour} from './photoFaceContour';

/** One MediaPipe landmark, normalised to the photo (x right, y down) plus relative depth. */
export type FaceLandmark = {x:number;y:number;z:number};
export type Point = {x:number;y:number};

// MediaPipe Face Mesh indices. "Left" is the image left (the subject's right side),
// matching the editor's left/right eye guides and the model's -X side.
export const FACE_INDEX = {
    eyeLeftOuter:33,eyeLeftInner:133,eyeLeftUpper:159,eyeLeftLower:145,
    eyeRightInner:362,eyeRightOuter:263,eyeRightUpper:386,eyeRightLower:374,
    noseTip:1,noseBridge:168,subnasale:2,alarLeft:129,alarRight:358,
    mouthLeft:61,mouthRight:291,lipTop:0,lipBottom:17,lipInnerTop:13,lipInnerBottom:14,
    chin:152,faceLeft:234,faceRight:454,jawLeft:58,jawRight:288,cheekLeft:50,cheekRight:280,
};
const BROW_LEFT = [70,63,105,66,107,46,53,52,65,55];
const BROW_RIGHT = [300,293,334,296,336,276,283,282,295,285];
export const FACE_OVAL = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
/** Model target name → photo landmark (index, or the mean of several indices). */
export const TARGET_LANDMARKS:Record<string,number|number[]> = {
    eyeLeftOuter:FACE_INDEX.eyeLeftOuter,eyeLeftInner:FACE_INDEX.eyeLeftInner,eyeLeftCenter:[33,133],
    eyeRightInner:FACE_INDEX.eyeRightInner,eyeRightOuter:FACE_INDEX.eyeRightOuter,eyeRightCenter:[362,263],
    browLeft:[105,52],browRight:[334,282],noseTip:FACE_INDEX.noseTip,alarLeft:FACE_INDEX.alarLeft,alarRight:FACE_INDEX.alarRight,
    mouthLeft:FACE_INDEX.mouthLeft,mouthRight:FACE_INDEX.mouthRight,mouthCenter:[13,14],lipTop:FACE_INDEX.lipTop,lipBottom:FACE_INDEX.lipBottom,
    chin:FACE_INDEX.chin,faceLeft:FACE_INDEX.faceLeft,faceRight:FACE_INDEX.faceRight,jawLeft:FACE_INDEX.jawLeft,jawRight:FACE_INDEX.jawRight,
};

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const turn=(p:Point,angle:number):Point=>({x:Math.cos(angle)*p.x-Math.sin(angle)*p.y,y:Math.sin(angle)*p.x+Math.cos(angle)*p.y});
const mean=(points:Point[]):Point=>({x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length});
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const landmarkPoint=(landmarks:FaceLandmark[],key:number|number[]):Point=>Array.isArray(key)?mean(key.map(i=>landmarks[i])):landmarks[key];

/* ---------------- MediaPipe (self-hosted, lazy, browser only) ---------------- */
type Landmarker = {detect:(image:HTMLCanvasElement)=>{faceLandmarks?:FaceLandmark[][]}};
let landmarker:Promise<Landmarker>|null = null;
const mediapipeBase = () => `${String(process.env.PUBLIC_URL||'').replace(/\/$/,'')}/short-video/mediapipe`;
function loadLandmarker():Promise<Landmarker> {
    if(!landmarker){
        const base=mediapipeBase();
        // Native import keeps the 140 KB bundle and 9 MB wasm out of the app bundle.
        const load=new Function('url','return import(url)') as (url:string)=>Promise<any>;
        landmarker=load(`${base}/vision_bundle.mjs`).then(async vision=>{
            const files=await vision.FilesetResolver.forVisionTasks(`${base}/wasm`);
            return vision.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:`${base}/face_landmarker.task`,delegate:'CPU'},runningMode:'IMAGE',numFaces:1});
        });
        landmarker.catch(()=>{landmarker=null;});
    }
    return landmarker;
}
/** Returns the 478 landmarks of the most prominent face, or null when no face is found. */
export async function detectFaceLandmarks(image:HTMLCanvasElement):Promise<FaceLandmark[]|null> {
    const detector=await loadLandmarker();
    const face=detector.detect(image).faceLandmarks?.[0];
    return face&&face.length>=468?face.map(p=>({x:p.x,y:p.y,z:p.z})):null;
}

/* ---------------- Crop: portrait 3:4 around the face, matching the photo layer aspect ---------------- */
export const CROP_WIDTH = 384, CROP_HEIGHT = 512;
/**
 * Crop in source pixels, rotated so the eye line is level (the shader's rotation works in normalised
 * 3:4 coordinates, which would shear the face): eye line at 46% height, chin ~88%, nose bridge centred.
 */
export type FaceCrop = {cx:number;cy:number;width:number;height:number;angle:number};
export function faceCropBox(landmarks:FaceLandmark[],width:number,height:number):FaceCrop {
    const px=(i:number|number[])=>{const p=landmarkPoint(landmarks,i);return {x:p.x*width,y:p.y*height};};
    const eyeL=px([33,133]),eyeR=px([362,263]),mid=mean([eyeL,eyeR]),angle=Math.atan2(eyeR.y-eyeL.y,eyeR.x-eyeL.x);
    const up=(p:Point)=>turn({x:p.x-mid.x,y:p.y-mid.y},-angle);
    const h=Math.max(8,up(px(FACE_INDEX.chin)).y)/.42,w=h*CROP_WIDTH/CROP_HEIGHT;
    const centre=turn({x:up(px(FACE_INDEX.noseBridge)).x,y:h*.04},angle);
    return {cx:mid.x+centre.x,cy:mid.y+centre.y,width:w,height:h,angle};
}
/** Draws the crop (CROP_WIDTH×CROP_HEIGHT) from a source canvas. */
export function drawFaceCrop(ctx:CanvasRenderingContext2D,source:CanvasImageSource,box:FaceCrop) {
    ctx.save();ctx.translate(CROP_WIDTH/2,CROP_HEIGHT/2);ctx.scale(CROP_WIDTH/box.width,CROP_HEIGHT/box.height);ctx.rotate(-box.angle);ctx.translate(-box.cx,-box.cy);
    ctx.drawImage(source,0,0);ctx.restore();
}
export function mapLandmarksToCrop(landmarks:FaceLandmark[],box:FaceCrop,width:number,height:number):FaceLandmark[] {
    return landmarks.map(p=>{const q=turn({x:p.x*width-box.cx,y:p.y*height-box.cy},-box.angle);return {x:q.x/box.width+.5,y:q.y/box.height+.5,z:p.z*width/box.width};});
}

/* ---------------- Geometry follows the photo ----------------
 * The photo is only placed rigidly (move, rotate, uniform scale): it is never warped. The sculpt then
 * follows it in three steps, each confirmed by a fresh report from the designer preview:
 *   1. head shape: closest head preset (heart, oval, …), head width/height and jaw width;
 *   2. features: eye spacing/height/size, mouth width/height, nose width, brow height;
 *   3. sculpt: a smooth displacement of the head surface that lands every remaining feature and the
 *      cheek/jaw/chin silhouette exactly on the photographed face.
 */
export type HeadTargets = {
    version:2;points:Record<string,[number,number]>;frame:{rx:number;ry:number};layer:{width:number;height:number};
    scale:{x:number;y:number};outline:[number,number][];profiles:{y:number[];widths:Record<string,number[]>;jaw:number[]};
    parameters:Record<string,number>;head:string;noseDepth?:number;
};
export type PhotoFaceTargets = HeadTargets;
export type SculptPoint = NonNullable<PhotoFaceConfig['sculpt']>[number];
export type DesignChange = {selections?:Record<string,string>;parameters?:Record<string,number>};

type Range = {min:number;max:number};
export const PARAMETER_RANGES:Record<string,Range> = {
    headWidth:{min:.85,max:1.15},headHeight:{min:.9,max:1.1},jawWidth:{min:.8,max:1.2},
    eyeSize:{min:.8,max:2},eyeSpacing:{min:.4,max:1.15},eyeHeight:{min:-.06,max:.06},noseAlarWidth:{min:.5,max:1.75},
    mouthWidth:{min:.75,max:1.25},mouthY:{min:-.06,max:.06},browHeight:{min:-.09,max:.09},noseProjection:{min:.4,max:1.8},
};
const limit=(key:string,value:number)=>{const r=PARAMETER_RANGES[key];return Math.round(clamp(value,r.min,r.max)*1000)/1000;};
/** Linear interpolation in a table sorted by descending y. */
function along(ys:number[],values:number[],y:number):number {
    if(y>=ys[0])return values[0];
    for(let i=1;i<ys.length;i++)if(y>=ys[i]){const t=(ys[i-1]-y)/(ys[i-1]-ys[i]);return values[i-1]+(values[i]-values[i-1])*t;}
    return values[values.length-1];
}
const modelEyeY=(t:HeadTargets)=>.05*t.frame.ry, modelChinY=(t:HeadTargets)=>-.92*t.frame.ry*.88;
const silhouette=(t:HeadTargets,y:number)=>along(t.outline.map(p=>p[0]),t.outline.map(p=>p[1]),y);

/** The photographed face in upright pixel coordinates: eye line horizontal through the origin, y down. */
export function photoFrame(landmarks:FaceLandmark[],width:number,height:number) {
    const px=(i:number|number[])=>{const p=landmarkPoint(landmarks,i);return {x:p.x*width,y:p.y*height};};
    const eyeL=px([33,133]),eyeR=px([362,263]),mid=mean([eyeL,eyeR]),theta=Math.atan2(eyeR.y-eyeL.y,eyeR.x-eyeL.x);
    const up=(p:Point)=>turn({x:p.x-mid.x,y:p.y-mid.y},-theta);
    const oval=FACE_OVAL.map(i=>up(px(i)));
    const chin=up(px(FACE_INDEX.chin)).y;
    /** Left/right edge of the face oval at an upright height. */
    const edges=(y:number)=>{
        const xs:number[]=[];
        oval.forEach((a,i)=>{const b=oval[(i+1)%oval.length];if((a.y-y)*(b.y-y)<=0&&a.y!==b.y)xs.push(a.x+(b.x-a.x)*(y-a.y)/(b.y-a.y));});
        return xs.length>=2?{left:Math.min(...xs),right:Math.max(...xs)}:null;
    };
    const eyeEdges=edges(0)||{left:-dist(eyeL,eyeR),right:dist(eyeL,eyeR)};
    return {px,up,theta,mid,oval,chin,edges,halfWidth:(eyeEdges.right-eyeEdges.left)/2,centre:(eyeEdges.right+eyeEdges.left)/2};
}

/** Step 1: closest head preset by the lower-face outline, then jaw width and the head's aspect. */
export function estimateHeadShape(landmarks:FaceLandmark[],width:number,height:number,targets:HeadTargets):DesignChange {
    const f=photoFrame(landmarks,width,height),eyeY=modelEyeY(targets),chinY=modelChinY(targets),span=eyeY-chinY;
    const samples=[.2,.35,.5,.65,.8,.9].map(t=>{const e=f.edges(t*f.chin);return e?{t,ratio:(e.right-e.left)/2/f.halfWidth}:null;}).filter((s):s is {t:number;ratio:number}=>!!s);
    const {y:ys,widths,jaw}=targets.profiles;
    const ratio=(id:string,t:number)=>along(ys,widths[id],eyeY-t*span)/along(ys,widths[id],eyeY);
    let head=targets.head,best=Infinity;
    for(const id of Object.keys(widths)){
        const error=samples.reduce((s,p)=>s+(ratio(id,p.t)-p.ratio)**2,0);
        if(error<best-1e-9){best=error;head=id;}
    }
    // Jaw width only widens/narrows the jaw band (jawK), least squares on the lower samples.
    let num=0,den=0;
    for(const p of samples.filter(p=>p.t>=.5)){const a=.65*along(ys,jaw,eyeY-p.t*span)*ratio(head,p.t);num+=a*(p.ratio-ratio(head,p.t));den+=a*a;}
    const jawWidth=limit('jawWidth',1+(den>1e-9?num/den:0));
    // Head aspect: photographed eye→chin span relative to face width, against the preset.
    const aspect=(f.chin/f.halfWidth)/(span/along(ys,widths[head],eyeY));
    const headHeight=limit('headHeight',Math.sqrt(aspect)),headWidth=limit('headWidth',headHeight/aspect);
    return {selections:{head},parameters:{headWidth,headHeight,jawWidth}};
}

/** Rigid photo placement (independent of the feature parameters, so steps 2 and 3 agree). */
export function photoPlacement(landmarks:FaceLandmark[],width:number,height:number,targets:HeadTargets) {
    const f=photoFrame(landmarks,width,height),eyeY=modelEyeY(targets),chinY=modelChinY(targets);
    const hw=targets.scale.x,hh=targets.scale.y;
    // World metres per photo pixel: the face's width × eye→chin area matches the head's.
    const k=Math.sqrt(((eyeY-chinY)*hh)*(silhouette(targets,eyeY)*hw)/(f.chin*f.halfWidth));
    const midY=(eyeY+chinY)/2*hh;
    const toWorld=(p:Point)=>{const u=f.up(p);return {x:(u.x-f.centre)*k,y:midY-(u.y-f.chin/2)*k};};
    const toLocal=(p:Point)=>{const w=toWorld(p);return {x:w.x/hw,y:w.y/hh};};
    const W=targets.layer.width,H=targets.layer.height;
    const toCanvas=(n:Point)=>{const w=toWorld({x:n.x*width,y:n.y*height});return {x:.5+w.x/W,y:.5-(w.y-.005)/H};};
    // Shader form: canvas = .5 + offset + scale·turn(source − .5, rotation). Exact for the 3:4 crop.
    const centre=toCanvas({x:.5,y:.5});
    const scale=k*(width/W+height/H)/2,rotation=-f.theta*180/Math.PI;
    return {frame:f,toLocal,toCanvas,metresPerPixel:k,placement:{x:centre.x-.5,y:centre.y-.5,scale,rotation}};
}

/** Step 2: move the sculpted features to the photographed ones (within each parameter's range). */
export function estimateFeatureParameters(landmarks:FaceLandmark[],width:number,height:number,targets:HeadTargets):DesignChange {
    const {toLocal,metresPerPixel}=photoPlacement(landmarks,width,height,targets),p=targets.parameters,ry=targets.frame.ry;
    // MediaPipe depth uses the x scale (crop width); the nose tip stands out from the cheeks beside it.
    const cheekZ=(landmarks[205].z+landmarks[425].z)/2,photoDepth=(cheekZ-landmarks[FACE_INDEX.noseTip].z)*width*metresPerPixel;
    const noseProjection:Record<string,number>=targets.noseDepth&&photoDepth>0?{noseProjection:limit('noseProjection',(p.noseProjection??1)*photoDepth/targets.noseDepth)}:{};
    const photo=(key:string)=>toLocal({x:landmarkPoint(landmarks,TARGET_LANDMARKS[key]).x*width,y:landmarkPoint(landmarks,TARGET_LANDMARKS[key]).y*height});
    const model=(key:string)=>({x:targets.points[key][0],y:targets.points[key][1]});
    const span=(f:(k:string)=>Point,a:string,b:string)=>Math.abs(f(b).x-f(a).x);
    const midY=(f:(k:string)=>Point,a:string,b:string)=>(f(a).y+f(b).y)/2;
    const eyeWidth=(f:(k:string)=>Point)=>span(f,'eyeLeftOuter','eyeLeftInner')+span(f,'eyeRightInner','eyeRightOuter');
    return {parameters:{
        eyeSpacing:limit('eyeSpacing',(p.eyeSpacing??1)*span(photo,'eyeLeftCenter','eyeRightCenter')/span(model,'eyeLeftCenter','eyeRightCenter')),
        eyeSize:limit('eyeSize',(p.eyeSize??1)*eyeWidth(photo)/eyeWidth(model)),
        eyeHeight:limit('eyeHeight',(p.eyeHeight??0)+(midY(photo,'eyeLeftCenter','eyeRightCenter')-midY(model,'eyeLeftCenter','eyeRightCenter'))/ry),
        mouthWidth:limit('mouthWidth',(p.mouthWidth??1)*span(photo,'mouthLeft','mouthRight')/span(model,'mouthLeft','mouthRight')),
        mouthY:limit('mouthY',(p.mouthY??0)+(midY(photo,'mouthLeft','mouthRight')-midY(model,'mouthLeft','mouthRight'))/ry),
        noseAlarWidth:limit('noseAlarWidth',(p.noseAlarWidth??1)*span(photo,'alarLeft','alarRight')/span(model,'alarLeft','alarRight')),
        browHeight:limit('browHeight',(p.browHeight??0)+(midY(photo,'browLeft','browRight')-midY(model,'browLeft','browRight'))/ry),
        ...noseProjection,
    }};
}

/* Gaussian RBF shared with the template (exp(-d²/0.0009), σ = 3 cm in head-local metres). */
export const SCULPT_SIGMA2 = .0009;
export const MAX_SCULPT_POINTS = 64;
const sculptKernel=(ax:number,ay:number,bx:number,by:number)=>Math.exp(-((ax-bx)**2+(ay-by)**2)/SCULPT_SIGMA2);
export function sculptAt(sculpt:SculptPoint[]|undefined,x:number,y:number):Point {
    const r={x:0,y:0};for(const p of sculpt||[]){const k=sculptKernel(x,y,p.x,p.y);r.x+=p.dx*k;r.y+=p.dy*k;}return r;
}
function solve(matrix:number[][],rhs:number[]):number[] {
    const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
    for(let c=0;c<n;c++){
        let pivot=c;for(let r=c+1;r<n;r++)if(Math.abs(a[r][c])>Math.abs(a[pivot][c]))pivot=r;
        [a[c],a[pivot]]=[a[pivot],a[c]];
        const d=a[c][c]||1e-12;
        for(let r=0;r<n;r++){if(r===c)continue;const f=a[r][c]/d;if(f)for(let k=c;k<=n;k++)a[r][k]-=f*a[c][k];}
    }
    return a.map((row,i)=>row[n]/(row[i]||1e-12));
}
const SCULPT_FEATURES=['eyeLeftOuter','eyeLeftInner','eyeRightInner','eyeRightOuter','browLeft','browRight','noseTip','alarLeft','alarRight','mouthLeft','mouthRight','lipTop','lipBottom','chin'];
type Constraint = {x:number;y:number;dx:number;dy:number;w:number};
/** Step 3 constraints: feature residuals, cheek/jaw silhouette, and fixed forehead/ears/neck. */
export function sculptConstraints(landmarks:FaceLandmark[],width:number,height:number,targets:HeadTargets):Constraint[] {
    const {toLocal,frame:f}=photoPlacement(landmarks,width,height,targets);
    const eyeY=modelEyeY(targets),chinY=modelChinY(targets),result:Constraint[]=[];
    for(const key of SCULPT_FEATURES){
        const l=landmarkPoint(landmarks,TARGET_LANDMARKS[key]),p=toLocal({x:l.x*width,y:l.y*height}),[x,y]=targets.points[key];
        result.push({x,y,dx:p.x-x,dy:p.y-y,w:key==='chin'?1.5:1});
    }
    // Silhouette between cheekbone and chin: the head outline moves sideways onto the face oval.
    // The cranium/temples stay put (a real face oval is far narrower there; pulling it in detaches hair).
    const ovalLocal=FACE_OVAL.map(i=>{const l=landmarks[i];return {local:toLocal({x:l.x*width,y:l.y*height}),upright:f.up({x:l.x*width,y:l.y*height}).y};});
    for(const {local,upright} of ovalLocal){
        const t=upright/f.chin;if(t<.18||t>.9)continue;
        const side=Math.sign(local.x)||1,edge=side*silhouette(targets,local.y);
        result.push({x:edge,y:local.y,dx:local.x-edge,dy:0,w:.7});
    }
    // Fixed: forehead (hairline), temples/ears and neck keep hair, ears and collar attached.
    const browY=Math.max(targets.points.browLeft[1],targets.points.browRight[1]);
    for(const x of [-.07,-.035,0,.035,.07])result.push({x,y:browY+.03,dx:0,dy:0,w:2});
    for(const y of [eyeY+.012,eyeY+.045])for(const side of [-1,1])result.push({x:side*silhouette(targets,y),y,dx:0,dy:0,w:2});
    for(const x of [-.03,0,.03])result.push({x,y:chinY-.035,dx:0,dy:0,w:1});
    return result;
}
export function solveSculpt(constraints:Constraint[]):SculptPoint[] {
    const items=constraints.slice(0,MAX_SCULPT_POINTS);
    const matrix=items.map((a,i)=>items.map((b,j)=>sculptKernel(a.x,a.y,b.x,b.y)+(i===j?.003/a.w:0)));
    const wx=solve(matrix,items.map(c=>c.dx)),wy=solve(matrix,items.map(c=>c.dy));
    return items.map((c,i)=>({x:round(c.x),y:round(c.y),dx:round(clamp(wx[i],-.05,.05)),dy:round(clamp(wy[i],-.05,.05))}));
}

const ellipseRegion=(center:Point,a:Point,b:Point,widthScale:number,height:number,limits:{w:[number,number];h:[number,number]}):PhotoFaceEye=>{
    const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    return {x:clamp(center.x,.05,.95),y:clamp(center.y,.05,.95),width:clamp(dist(a,b)*widthScale,...limits.w),height:clamp(height,...limits.h),angle:clamp(angle,-45,45)};
};
const round=(n:number)=>Math.round(n*1e5)/1e5;
const roundRegion=<T extends Record<string,unknown>>(r:T):T=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='number'?round(v):v])) as T;

/** Animated regions (eyes, mouth seam, nose, brows) and the face mask, straight from the landmarks. */
export function photoRegions(photo:PhotoFaceConfig,landmarks:FaceLandmark[]):Pick<PhotoFaceConfig,'eyes'|'mouth'|'nose'|'browLeft'|'browRight'|'contour'> {
    const at=(i:number|number[])=>landmarkPoint(landmarks,i);
    const eye=(outer:number,inner:number,upper:number,lower:number,previous:PhotoFaceEye,left:boolean):PhotoFaceEye=>{
        const a=at(left?outer:inner),b=at(left?inner:outer);
        return roundRegion({...ellipseRegion(mean([a,b]),a,b,1.22,Math.max(dist(at(upper),at(lower))*2.1,.03),{w:[.04,.35],h:[.02,.2]}),...(previous.placementScale?{placementScale:previous.placementScale}:{})});
    };
    const mouthA=at(FACE_INDEX.mouthLeft),mouthB=at(FACE_INDEX.mouthRight);
    const mouthBase=ellipseRegion(mean([mouthA,mouthB]),mouthA,mouthB,1.08,Math.max(dist(at(FACE_INDEX.lipTop),at(FACE_INDEX.lipBottom))*1.05,.03),{w:[.06,.6],h:[.02,.25]});
    const seam=(p:Point)=>clamp(turn({x:p.x-mouthBase.x,y:p.y-mouthBase.y},-mouthBase.angle*Math.PI/180).y/mouthBase.height,-.45,.45);
    const mouth:PhotoFaceMouth=roundRegion({...mouthBase,lineLeft:seam(mouthA),lineCenter:seam(at([FACE_INDEX.lipInnerTop,FACE_INDEX.lipInnerBottom])),lineRight:seam(mouthB),teeth:photo.mouth?.teeth??true});
    const brow=(indices:number[]):PhotoFaceEye=>{
        const points=indices.map(i=>at(i)),outer=points[0],inner=points[4],left=outer.x<inner.x,ys=points.map(p=>p.y);
        return roundRegion(ellipseRegion(mean(points),left?outer:inner,left?inner:outer,1.15,Math.max((Math.max(...ys)-Math.min(...ys))*1.8,.03),{w:[.04,.35],h:[.02,.2]}));
    };
    const alar=dist(at(FACE_INDEX.alarLeft),at(FACE_INDEX.alarRight)),bridge=at(FACE_INDEX.noseBridge),base=at(FACE_INDEX.subnasale);
    const nose:PhotoFaceEye=roundRegion({x:clamp((bridge.x+base.x)/2,.05,.95),y:clamp((bridge.y+base.y)/2,.05,.95),width:clamp(alar*1.45,.04,.35),height:clamp(dist(bridge,base)*1.15,.02,.2),angle:clamp(Math.atan2(base.x-bridge.x,base.y-bridge.y)*-180/Math.PI,-45,45)});
    // Face oval (1% inside, so the feather never picks up hair or background); faces cut by the photo
    // border clamp onto the edge, repeated vertices are dropped and an invalid polygon skips the mask.
    const oval=FACE_OVAL.map(i=>at(i)),centre=mean(oval);
    const contour=oval.map(p=>({x:round(clamp(centre.x+(p.x-centre.x)*.99,0,1)),y:round(clamp(centre.y+(p.y-centre.y)*.99,0,1))}))
        .filter((p,i,all)=>dist(p,all[(i+all.length-1)%all.length])>1e-3);
    return {
        eyes:{left:eye(FACE_INDEX.eyeLeftOuter,FACE_INDEX.eyeLeftInner,FACE_INDEX.eyeLeftUpper,FACE_INDEX.eyeLeftLower,photo.eyes.left,true),
            right:eye(FACE_INDEX.eyeRightOuter,FACE_INDEX.eyeRightInner,FACE_INDEX.eyeRightUpper,FACE_INDEX.eyeRightLower,photo.eyes.right,false)},
        mouth,nose,browLeft:brow(BROW_LEFT),browRight:brow(BROW_RIGHT),
        contour:contour.length>=3&&validFaceContour(contour,.0002)?contour:undefined,
    };
}

/** Final step: rigid placement + sculpt + regions. The photo pixels are never displaced. */
export function fitPhotoFace(photo:PhotoFaceConfig,landmarks:FaceLandmark[],targets:HeadTargets):PhotoFaceConfig {
    const {width,height}=photo.image,{placement}=photoPlacement(landmarks,width,height,targets);
    const sculpt=solveSculpt(sculptConstraints(landmarks,width,height,targets));
    return {
        ...photo,mode:'full_face',x:round(placement.x),y:round(placement.y),scale:round(placement.scale),rotation:round(placement.rotation),
        warp:undefined,fitWarp:undefined,sculpt,...photoRegions(photo,landmarks),
    };
}

/** Distance (head-local metres) between each photographed feature and the sculpted one. */
export function fitError(photo:PhotoFaceConfig,landmarks:FaceLandmark[],targets:HeadTargets):Record<string,number> {
    const {width,height}=photo.image,{toLocal}=photoPlacement(landmarks,width,height,targets),result:Record<string,number>={};
    for(const key of SCULPT_FEATURES){
        const l=landmarkPoint(landmarks,TARGET_LANDMARKS[key]),p=toLocal({x:l.x*width,y:l.y*height}),[x,y]=targets.points[key],o=sculptAt(photo.sculpt,x,y);
        result[key]=Math.hypot(x+o.x-p.x,y+o.y-p.y);
    }
    return result;
}

/** Offset of the legacy manual grid and of earlier texture-fit designs (still rendered by the shader). */
const bilinear=(uv:Point)=>{
    const gx=clamp(uv.x,0,1)*6,gy=clamp(uv.y,0,1)*6,ix=Math.min(5,Math.floor(gx)),iy=Math.min(5,Math.floor(gy)),fx=gx-ix,fy=gy-iy,i=iy*7+ix;
    return [[i,(1-fx)*(1-fy)],[i+1,fx*(1-fy)],[i+7,(1-fx)*fy],[i+8,fx*fy]] as [number,number][];
};
export function photoOffset(photo:Pick<PhotoFaceConfig,'warp'|'fitWarp'>,uv:Point):Point {
    const result={x:0,y:0};
    if(photo.warp)for(const [i,w] of bilinear(uv)){result.x+=photo.warp[i].x*w;result.y+=photo.warp[i].y*w;}
    for(const p of photo.fitWarp||[]){const k=Math.exp(-((uv.x-p.x)**2+(uv.y-p.y)**2)/.0064);result.x+=p.wx*k;result.y+=p.wy*k;}
    return result;
}

export function sampleSkinColor(pixels:Uint8ClampedArray,width:number,height:number,landmarks:FaceLandmark[]):string {
    let r=0,g=0,b=0,count=0;
    for(const index of [FACE_INDEX.cheekLeft,FACE_INDEX.cheekRight]){
        const p=landmarks[index],cx=Math.round(p.x*width),cy=Math.round(p.y*height),radius=Math.max(2,Math.round(width*.015));
        for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++){
            if(x<0||y<0||x>=width||y>=height)continue;const i=(y*width+x)*4;r+=pixels[i];g+=pixels[i+1];b+=pixels[i+2];count++;
        }
    }
    if(!count)return '';
    return '#'+[r,g,b].map(v=>Math.round(v/count).toString(16).padStart(2,'0')).join('').toUpperCase();
}
