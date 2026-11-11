import type {PhotoFaceEye} from 'helpers/shortVideoSceneAssets';
type Point={x:number;y:number};
/** Resize from the dragged edge/corner while keeping the opposite one stationary. */
export function resizePhotoFaceRegion<T extends PhotoFaceEye>(region:T,delta:Point,handle:Point,mouth=false):T {
    const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
    const width=handle.x?clamp(region.width+delta.x*handle.x,mouth?.06:.04,mouth?.6:.35):region.width;
    const height=handle.y?clamp(region.height+delta.y*handle.y,.02,mouth?.25:.2):region.height;
    const dx=(width-region.width)*handle.x/2,dy=(height-region.height)*handle.y/2,angle=region.angle*Math.PI/180;
    const x=region.x+Math.cos(angle)*dx-Math.sin(angle)*dy,y=region.y+Math.sin(angle)*dx+Math.cos(angle)*dy;
    // Clamping only the center would move the pinned corner. Reject out-of-bounds
    // proposals instead, so limits cannot introduce an anchor drift.
    return x<.05||x>.95||y<.05||y>.95?region:{...region,x,y,width,height};
}
