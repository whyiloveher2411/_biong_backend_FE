export type ContourPoint={x:number;y:number};
export const MAX_FACE_CONTOUR_POINTS=64;
const cross=(a:ContourPoint,b:ContourPoint,c:ContourPoint)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const onSegment=(a:ContourPoint,b:ContourPoint,p:ContourPoint)=>Math.abs(cross(a,b,p))<1e-8&&p.x>=Math.min(a.x,b.x)-1e-8&&p.x<=Math.max(a.x,b.x)+1e-8&&p.y>=Math.min(a.y,b.y)-1e-8&&p.y<=Math.max(a.y,b.y)+1e-8;
export function validFaceContour(points:ContourPoint[],minimumArea=.0002):boolean {
    const n=points.length;if(n<3||n>MAX_FACE_CONTOUR_POINTS||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1))return false;
    let area=0;
    for(let i=0;i<n;i++){
        const a=points[i],b=points[(i+1)%n];if(Math.hypot(a.x-b.x,a.y-b.y)<1e-5)return false;
        area+=a.x*b.y-b.x*a.y;
        for(let j=i+1;j<n;j++){
            if(j===i+1||(i===0&&j===n-1))continue;
            const c=points[j],d=points[(j+1)%n],abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
            if((abC*abD<0&&cdA*cdB<0)||onSegment(a,b,c)||onSegment(a,b,d)||onSegment(c,d,a)||onSegment(c,d,b))return false;
        }
    }
    return Math.abs(area)>minimumArea;
}
function reduceLine(points:ContourPoint[],epsilon:number):ContourPoint[]{
    if(points.length<=2)return points;
    const a=points[0],b=points[points.length-1],dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
    let maximum=0,index=0;
    for(let i=1;i<points.length-1;i++){
        const p=points[i],t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
        const distance=Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
        if(distance>maximum){maximum=distance;index=i;}
    }
    return maximum>epsilon?[...reduceLine(points.slice(0,index+1),epsilon).slice(0,-1),...reduceLine(points.slice(index),epsilon)]:[a,b];
}
export function simplifyFaceStroke(stroke:ContourPoint[],tolerance=.002):ContourPoint[]{
    const points=stroke.filter((p,i)=>i===0||Math.hypot(p.x-stroke[i-1].x,p.y-stroke[i-1].y)>Math.min(.001,tolerance/2));
    if(points.length>2&&Math.hypot(points[0].x-points[points.length-1].x,points[0].y-points[points.length-1].y)<tolerance*6)points.pop();
    let epsilon=.002,result=points;
    while(result.length>MAX_FACE_CONTOUR_POINTS){result=reduceLine(points,epsilon);epsilon*=1.5;}
    // Apply a small reduction even to short strokes to keep handles readable.
    if(points.length<=MAX_FACE_CONTOUR_POINTS)result=reduceLine(points,tolerance);
    return result;
}
