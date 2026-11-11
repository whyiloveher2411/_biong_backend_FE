import {FACE_OVAL,TARGET_LANDMARKS,estimateFeatureParameters,estimateHeadShape,faceCropBox,fitError,fitPhotoFace,mapLandmarksToCrop,photoPlacement,sculptAt} from './photoFaceLandmarks';
import type {FaceLandmark,HeadTargets} from './photoFaceLandmarks';
import {validPhotoFaceTargets} from './SceneAssetHtmlPreview';
import {defaultPhotoFace} from './PhotoFaceEditor';

const W=384,H=512,ry=.135,rx=.098;
// Head-local feature points like the designer's getPhotoFaceTargets() for the default head.
const points:HeadTargets['points']={
    eyeLeftOuter:[-.0587,.00675],eyeLeftInner:[-.0197,.00675],eyeLeftCenter:[-.0392,.00675],
    eyeRightInner:[.0197,.00675],eyeRightOuter:[.0587,.00675],eyeRightCenter:[.0392,.00675],
    browLeft:[-.0392,.0459],browRight:[.0392,.0459],noseTip:[0,-.022],alarLeft:[-.015,-.025],alarRight:[.015,-.025],
    mouthLeft:[-.0209,-.058],mouthRight:[.0209,-.058],mouthCenter:[0,-.058],lipTop:[0,-.0475],lipBottom:[0,-.07],chin:[0,-.1093],
};
const ys=Array.from({length:49},(_,k)=>{const v=.4-k*1.38/48;return v*ry*(v<0?.88:1);});
const vs=Array.from({length:49},(_,k)=>.4-k*1.38/48);
const round=(v:number)=>Math.sqrt(Math.max(0,1-v*v));
// Two very different lower faces: a wide round jaw and a narrow pointed (heart) jaw.
const profile=(jaw:number)=>vs.map(v=>round(v)*rx*(v<-.2?1-jaw*Math.pow((-v-.2)/.8,1.3):1));
function targets(head='mai_head_v1',scale={x:1,y:1},parameters:Record<string,number>={}):HeadTargets {
    const widths={round:profile(.05),heart:profile(.55),mai_head_v1:profile(.3)};
    return {version:2,points,frame:{rx,ry},layer:{width:.18,height:.24},scale,outline:ys.map((y,i)=>[y,widths[head as keyof typeof widths][i]] as [number,number]),
        profiles:{y:ys,widths,jaw:vs.map(v=>v<-.42?Math.pow((-v-.42)/.58,1.45):0)},noseDepth:.02,
        parameters:{headWidth:scale.x,headHeight:scale.y,jawWidth:1,eyeSize:1,eyeSpacing:1,eyeHeight:0,mouthWidth:1,mouthY:0,noseAlarWidth:1,browHeight:0,noseProjection:1,...parameters},head};
}
/** A photographed face whose features sit exactly on the given head (optionally moved/rotated in the photo). */
function photoOf(t:HeadTargets,{angle=0,scale=1700,shift={x:192,y:230},move={} as Record<string,[number,number]>}={}):FaceLandmark[] {
    const landmarks:FaceLandmark[]=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
    const toPhoto=(x:number,y:number)=>{const a=x*scale,b=-(y-.00675)*scale,c=Math.cos(angle),s=Math.sin(angle);return {x:(shift.x+c*a-s*b)/W,y:(shift.y+s*a+c*b)/H,z:0};};
    const put=(i:number,x:number,y:number)=>{landmarks[i]=toPhoto(x,y);};
    for(const [name,index] of Object.entries(TARGET_LANDMARKS)){
        if(Array.isArray(index)||!t.points[name])continue;
        const [x,y]=t.points[name],[dx,dy]=move[name]||[0,0];put(index,x+dx,y+dy);
    }
    const p=(name:string)=>t.points[name];
    put(159,p('eyeLeftCenter')[0],.0107);put(145,p('eyeLeftCenter')[0],.0027);put(386,p('eyeRightCenter')[0],.0107);put(374,p('eyeRightCenter')[0],.0027);
    put(168,0,.0);put(2,0,-.027);put(13,0,-.0575);put(14,0,-.0585);
    [70,63,105,66,107].forEach((i,k)=>put(i,-.0592+k*.01,.0479));[46,53,52,65,55].forEach((i,k)=>put(i,-.0592+k*.01,.0439));
    [300,293,334,296,336].forEach((i,k)=>put(i,.0592-k*.01,.0479));[276,283,282,295,285].forEach((i,k)=>put(i,.0592-k*.01,.0439));
    landmarks[205]={...toPhoto(-.03,-.03),z:.01};landmarks[425]={...toPhoto(.03,-.03),z:.01};landmarks[1]={...landmarks[1],z:-.02*scale/W+.01};
    // Oval on the head silhouette (scaled by the head proportions), from forehead round to the chin.
    // FACE_OVAL runs from the forehead down the image-right side to the chin (index 18) and back up.
    FACE_OVAL.forEach((i,k)=>{
        const s=k<=18?k/18:(36-k)/18,y=.05-s*(.05+.1093),side=k<=18?1:-1;
        const top=y>.00675?Math.sqrt(Math.max(0,1-((y-.00675)/(.05-.00675))**2)):1;
        put(i,side*along(t.outline,y)*top,y);
    });
    return landmarks;
}
function along(outline:[number,number][],y:number){for(let i=1;i<outline.length;i++)if(y>=outline[i][0]){const t=(outline[i-1][0]-y)/(outline[i-1][0]-outline[i][0]);return outline[i-1][1]+(outline[i][1]-outline[i-1][1])*t;}return outline[outline.length-1][1];}
const photo=()=>defaultPhotoFace({width:W,height:H,pixels:''});

test('head preset follows the photographed jaw: a pointed face picks the heart head, a full one the round head',()=>{
    expect(estimateHeadShape(photoOf(targets('heart')),W,H,targets()).selections?.head).toBe('heart');
    expect(estimateHeadShape(photoOf(targets('round')),W,H,targets()).selections?.head).toBe('round');
    const shape=estimateHeadShape(photoOf(targets('heart')),W,H,targets());
    for(const key of ['headWidth','headHeight','jawWidth'])expect(Number.isFinite(shape.parameters?.[key])).toBe(true);
});

test('photo is placed rigidly: uniform scale, rotation from the eye line, never warped',()=>{
    expect(fitPhotoFace(photo(),photoOf(targets(),{angle:.08}),targets()).rotation).toBeCloseTo(-.08*180/Math.PI,3);
    // Crops are levelled, so the shader's placement (rotation 0) is an exact similarity.
    const t=targets(),landmarks=photoOf(t);
    const fitted=fitPhotoFace(photo(),landmarks,t);
    expect(fitted.warp).toBeUndefined();expect(fitted.fitWarp).toBeUndefined();expect(fitted.mode).toBe('full_face');
    expect(fitted.rotation).toBeCloseTo(0,6);
    // The shader mapping of the placement reproduces the rigid photo→canvas transform.
    const {toCanvas}=photoPlacement(landmarks,W,H,t);
    for(const i of [33,263,1,61,152]){
        const l=landmarks[i],c=toCanvas(l),r=fitted.rotation*Math.PI/180,px=l.x-.5,py=l.y-.5;
        expect(.5+fitted.x+fitted.scale*(Math.cos(r)*px-Math.sin(r)*py)).toBeCloseTo(c.x,4);
        expect(.5+fitted.y+fitted.scale*(Math.sin(r)*px+Math.cos(r)*py)).toBeCloseTo(c.y,4);
    }
});

test('features move to the photo: parameters first, then the sculpt lands every feature exactly',()=>{
    const t=targets(),moved=photoOf(t,{move:{mouthLeft:[-.003,-.004],mouthRight:[.003,-.004],lipTop:[0,-.004],lipBottom:[0,-.004],noseTip:[.002,0]}});
    const features=estimateFeatureParameters(moved,W,H,t).parameters!;
    expect(features.mouthWidth).toBeGreaterThan(1.05);expect(features.mouthY).toBeLessThan(0);
    const fitted=fitPhotoFace(photo(),moved,t);
    for(const [key,error] of Object.entries(fitError(fitted,moved,t)))expect([key,error<6e-4]).toEqual([key,true]);
    // The hairline and the neck stay where they were.
    const forehead=sculptAt(fitted.sculpt,0,.08),neck=sculptAt(fitted.sculpt,0,-.145);
    expect(Math.hypot(forehead.x,forehead.y)).toBeLessThan(1e-3);expect(Math.hypot(neck.x,neck.y)).toBeLessThan(2e-3);
    expect(fitted.sculpt!.length).toBeLessThanOrEqual(64);
});

test('a narrower photographed jaw pulls the head silhouette in',()=>{
    const t=targets('round'),narrow=photoOf(targets('heart'));
    const fitted=fitPhotoFace(photo(),narrow,t);
    const jawY=-.085,edge=along(t.outline,jawY);
    expect(sculptAt(fitted.sculpt,edge,jawY).x).toBeLessThan(-.002);
    expect(sculptAt(fitted.sculpt,-edge,jawY).x).toBeGreaterThan(.002);
});

test('crop box frames the face in a 3:4 portrait and remaps landmarks',()=>{
    const face=photoOf(targets(),{angle:.2}),box=faceCropBox(face,W,H);
    expect(box.width/box.height).toBeCloseTo(.75,5);expect(box.angle).toBeCloseTo(.2,5);
    const mapped=mapLandmarksToCrop(face,box,W,H),eye=(i:number[])=>({x:(mapped[i[0]].x+mapped[i[1]].x)/2,y:(mapped[i[0]].y+mapped[i[1]].y)/2});
    // Level eye line at 46% of the crop height.
    expect(eye([33,133]).y).toBeCloseTo(.46,3);expect(eye([362,263]).y).toBeCloseTo(.46,3);
});

test('iframe targets are validated before use',()=>{
    const t=targets();
    expect(validPhotoFaceTargets(t)).toEqual(t);
    expect(validPhotoFaceTargets({...t,points:{a:[NaN,1]}})).toBeNull();
    expect(validPhotoFaceTargets({...t,version:1})).toBeNull();
    expect(validPhotoFaceTargets({...t,profiles:{...t.profiles,widths:{'bad id':t.profiles.y}}})).toBeNull();
    expect(validPhotoFaceTargets('x')).toBeNull();
});
