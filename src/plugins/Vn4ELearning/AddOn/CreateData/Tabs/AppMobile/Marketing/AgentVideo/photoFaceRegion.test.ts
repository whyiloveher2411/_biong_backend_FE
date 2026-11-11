import {resizePhotoFaceRegion} from './photoFaceRegion';
const point=(r:{x:number;y:number;width:number;height:number;angle:number},x:number,y:number)=>{
 const a=r.angle*Math.PI/180,dx=x*r.width/2,dy=y*r.height/2;
 return {x:r.x+Math.cos(a)*dx-Math.sin(a)*dy,y:r.y+Math.sin(a)*dx+Math.cos(a)*dy};
};
test('every corner and side resize pins the opposite anchor, including rotated selections and dimension limits',()=>{
 for(const mouth of [false,true])for(const angle of [-40,0,35])for(const handle of [{x:1,y:1},{x:-1,y:1},{x:1,y:-1},{x:-1,y:-1},{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}]){
  const region={x:.5,y:.5,width:.2,height:.08,angle},anchor=point(region,-handle.x,-handle.y);
  for(const delta of [{x:.03,y:.02},{x:-.02,y:-.01},{x:5,y:5}]){
   const resized=resizePhotoFaceRegion(region,delta,handle,mouth),fixed=point(resized,-handle.x,-handle.y);
   expect(fixed.x).toBeCloseTo(anchor.x,10);expect(fixed.y).toBeCloseTo(anchor.y,10);
  }
 }
});
test('dragging the right eye edge changes its width while its left endpoint and height stay fixed',()=>{
 const r={x:.4,y:.4,width:.18,height:.08,angle:25},fixed=point(r,-1,0);
 const resized=resizePhotoFaceRegion(r,{x:.05,y:.06},{x:1,y:0});
 expect(resized.width).toBeCloseTo(.23);expect(resized.height).toBe(r.height);
 expect(point(resized,-1,0).x).toBeCloseTo(fixed.x,10);expect(point(resized,-1,0).y).toBeCloseTo(fixed.y,10);
});
