import {validFaceContour,simplifyFaceStroke} from './photoFaceContour';
const square=[{x:.2,y:.2},{x:.8,y:.2},{x:.8,y:.8},{x:.2,y:.8}];
test('accepts either winding and concave regions but rejects crossings, duplicate vertices and zero area',()=>{
 expect(validFaceContour(square)).toBe(true);expect(validFaceContour([...square].reverse())).toBe(true);
 expect(validFaceContour([{x:.1,y:.1},{x:.9,y:.1},{x:.5,y:.5},{x:.9,y:.9},{x:.1,y:.9}])).toBe(true);
 expect(validFaceContour([square[0],square[2],square[1],square[3]])).toBe(false);
 expect(validFaceContour([...square,square[0]])).toBe(false);
 expect(validFaceContour([{x:.1,y:.1},{x:.2,y:.2},{x:.3,y:.3}])).toBe(false);
 expect(validFaceContour([{x:NaN,y:0},...square])).toBe(false);
 expect(validFaceContour([{x:-.01,y:.2},...square])).toBe(false);
});
test('reduces a long closed freehand stroke to editable vertices without losing its face silhouette',()=>{
 const stroke=Array.from({length:501},(_,i)=>({x:.5+.32*Math.cos(i/500*Math.PI*2),y:.5+.4*Math.sin(i/500*Math.PI*2)}));
 const points=simplifyFaceStroke(stroke);
 expect(points.length).toBeLessThanOrEqual(64);expect(points.length).toBeGreaterThan(12);expect(validFaceContour(points)).toBe(true);
 expect(Math.max(...points.map(p=>p.x))).toBeCloseTo(.82,2);expect(Math.min(...points.map(p=>p.y))).toBeCloseTo(.1,2);
});

test('detail polygons accept small features without relaxing the whole-head minimum',()=>{
 const nose=[{x:.49,y:.5},{x:.495,y:.5},{x:.495,y:.505},{x:.49,y:.505}];
 expect(validFaceContour(nose)).toBe(false);expect(validFaceContour(nose,.0000002)).toBe(true);
 expect(validFaceContour(simplifyFaceStroke([...nose,nose[0]],.0004),.0000002)).toBe(true);
});
