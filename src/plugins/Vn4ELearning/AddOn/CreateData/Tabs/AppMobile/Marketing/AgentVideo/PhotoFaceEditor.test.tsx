import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import PhotoFaceEditor,{defaultPhotoFace,readPhotoFace} from './PhotoFaceEditor';
const photo=()=>defaultPhotoFace({width:16,height:16,pixels:btoa('abc'.repeat(256))});
let context:Record<string,unknown>;
beforeEach(()=>{
 context={clearRect:jest.fn(),fillRect:jest.fn(),save:jest.fn(),restore:jest.fn(),beginPath:jest.fn(),ellipse:jest.fn(),clip:jest.fn(),translate:jest.fn(),rotate:jest.fn(),scale:jest.fn(),drawImage:jest.fn(),strokeRect:jest.fn(),moveTo:jest.fn(),lineTo:jest.fn(),stroke:jest.fn(),putImageData:jest.fn(),createImageData:(w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4)}),getImageData:(x:number,y:number,w:number,h:number)=>({data:new Uint8ClampedArray(w*h*4).fill(255)})};
 jest.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D);
});
afterEach(()=>jest.restoreAllMocks());
test('compact editor toggles eye shapes, offers independent edge gap and feather settings and provides icon tools',()=>{
 const change=jest.fn(),blink=jest.fn();
 render(<PhotoFaceEditor value={photo()} disabled={false} onChange={change} onBlink={blink}/>);
 expect((screen.getByLabelText('Ảnh gương mặt') as HTMLCanvasElement).width).toBe(384);
 expect(screen.getByRole('button',{name:'Mắt trái'}).getAttribute('aria-pressed')).toBe('false');
 fireEvent.click(screen.getByRole('button',{name:'Mắt trái'}));
 expect(screen.getByLabelText('Di chuyển mắt trái').tagName).toBe('path');
 expect(screen.queryByLabelText('Di chuyển mắt phải')).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Mắt trái'}));
 expect(screen.queryByLabelText('Di chuyển mắt trái')).toBeNull();
 expect(screen.getAllByRole('slider')).toHaveLength(2);
 fireEvent.change(screen.getByRole('slider',{name:'Khoảng hở sát tai'}),{target:{value:.15}});
 expect(change).toHaveBeenLastCalledWith(expect.objectContaining({sideMargin:.15}));
 fireEvent.click(screen.getByRole('button',{name:'Phóng to ảnh'}));
 expect(change).toHaveBeenLastCalledWith(expect.objectContaining({scale:1.1}));
 fireEvent.click(screen.getByRole('button',{name:'Xoay ảnh phải'}));
 expect(change).toHaveBeenLastCalledWith(expect.objectContaining({rotation:5}));
 expect(screen.queryByRole('button',{name:'Xem mắt nhắm'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Xem mắt mở'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Nhắm/mở mắt'}));expect(blink).toHaveBeenLastCalledWith('loop');
 expect(screen.getByRole('button',{name:'Nhắm/mở mắt'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('button',{name:'Nhắm/mở mắt'}));expect(blink).toHaveBeenLastCalledWith(undefined);
 fireEvent.click(screen.getByRole('button',{name:'Bỏ ảnh mặt'}));expect(change).toHaveBeenLastCalledWith(undefined);
});
test('disabled editor blocks calibration and removal',()=>{
 render(<PhotoFaceEditor value={photo()} disabled onChange={jest.fn()} onBlink={jest.fn()}/>);
 expect((screen.getByRole('button',{name:'Bỏ ảnh mặt'}) as HTMLButtonElement).disabled).toBe(true);
 expect((screen.getByRole('button',{name:'Phóng to ảnh'}) as HTMLButtonElement).disabled).toBe(true);
});
test('pointer gestures move the photo, resize one eye and rotate its shape',()=>{
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');
 Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 Object.defineProperty(SVGElement.prototype,'setPointerCapture',{configurable:true,value:jest.fn()});
 try {
  const change=jest.fn();
  render(<PhotoFaceEditor value={photo()} disabled={false} onChange={change} onBlink={jest.fn()}/>);
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});
  jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  fireEvent.pointerDown(svg,{button:0,clientX:20,clientY:20});fireEvent.pointerMove(svg,{clientX:58.4,clientY:20});fireEvent.pointerUp(svg);
  expect(change.mock.calls[change.mock.calls.length-1][0].x).toBeCloseTo(.1);
  fireEvent.click(screen.getByRole('button',{name:'Mắt trái'}));
  const corner=screen.getByLabelText('Đổi kích thước mắt trái 1,1');
  fireEvent.pointerDown(corner,{button:0,clientX:168.96,clientY:168.96});fireEvent.pointerMove(svg,{clientX:178.56,clientY:172.8});fireEvent.pointerUp(svg);
  expect(change.mock.calls[change.mock.calls.length-1][0].eyes.left.width).toBeCloseTo(.205);
  expect(change.mock.calls[change.mock.calls.length-1][0].eyes.left.height).toBeCloseTo(.09);
  expect(change.mock.calls[change.mock.calls.length-1][0].eyes.right).toEqual(photo().eyes.right);
  const handle=screen.getByLabelText('Xoay mắt trái'),cx=.35*384,cy=.4*384,r=.08*384/2+24;
  fireEvent.pointerDown(handle,{button:0,clientX:cx,clientY:cy-r});
  fireEvent.pointerMove(svg,{clientX:cx+r*Math.sin(Math.PI/6),clientY:cy-r*Math.cos(Math.PI/6)});fireEvent.pointerUp(svg);
  expect(Math.abs(change.mock.calls[change.mock.calls.length-1][0].eyes.left.angle-30)).toBeLessThan(1);
 } finally {
  if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');
  Reflect.deleteProperty(SVGElement.prototype,'setPointerCapture');
 }
});
test('rejects unsupported uploads and reports errors',async()=>{
 render(<PhotoFaceEditor disabled={false} onChange={jest.fn()} onBlink={jest.fn()}/>);
 fireEvent.change(screen.getByLabelText('Tải ảnh mặt'),{target:{files:[new File(['bad'],'bad.svg',{type:'image/svg+xml'})]}});
 await screen.findByText('Chọn ảnh JPG, PNG hoặc WebP.');
});
test('upload normalizes to embedded RGB and revokes its temporary URL',async()=>{
 URL.createObjectURL=jest.fn().mockReturnValue('blob:photo');URL.revokeObjectURL=jest.fn();
 const image={naturalWidth:800,naturalHeight:600,decode:jest.fn().mockResolvedValue(undefined),src:''};
 // Give Jest an explicit constructor property; Window's global intersection resolves to never.
 const imageGlobal: {Image: typeof Image}=window;
 jest.spyOn(imageGlobal,'Image').mockImplementation(()=>image as unknown as HTMLImageElement);
 const result=await readPhotoFace(new File(['photo'],'portrait.jpg',{type:'image/jpeg'}));
 expect(result.image.width).toBe(384);expect(result.image.height).toBe(288);
 expect(atob(result.image.pixels).length).toBe(384*288*3);
 expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:photo');
});

test('pasting an image uploads without opening the file picker; text paste remains untouched',async()=>{
 URL.createObjectURL=jest.fn().mockReturnValue('blob:paste');URL.revokeObjectURL=jest.fn();
 const imageGlobal:{Image:typeof Image}=window;
 jest.spyOn(imageGlobal,'Image').mockImplementation(()=>({naturalWidth:240,naturalHeight:320,decode:jest.fn().mockResolvedValue(undefined),src:''}) as unknown as HTMLImageElement);
 const change=jest.fn(),onOpenChange=jest.fn();
 render(<PhotoFaceEditor disabled={false} onChange={change} onBlink={jest.fn()} onOpenChange={onOpenChange}/>);
 const text=new Event('paste',{bubbles:true,cancelable:true});Object.defineProperty(text,'clipboardData',{value:{items:[],files:[]}});
 document.dispatchEvent(text);expect(text.defaultPrevented).toBe(false);
 const file=new File(['clipboard'],'clipboard.png',{type:'image/png'}),paste=new Event('paste',{bubbles:true,cancelable:true});
 Object.defineProperty(paste,'clipboardData',{value:{items:[{kind:'file',type:'image/png',getAsFile:()=>file}]}});
 fireEvent(document,paste);
 await waitFor(()=>expect(change).toHaveBeenCalledWith(expect.objectContaining({image:expect.objectContaining({width:240,height:320})})));
 expect(paste.defaultPrevented).toBe(true);
});

test('mouth calibration creates a seam, drags its midpoint, and saves teeth and speaking controls',()=>{
 const value=photo();
 const change=jest.fn(),speak=jest.fn();
 const view=render(<PhotoFaceEditor value={value} disabled={false} onChange={change} onBlink={jest.fn()} onSpeaking={speak}/>);
 fireEvent.click(screen.getByRole('button',{name:'Miệng'}));
 const withMouth=change.mock.calls[change.mock.calls.length-1][0];
 expect(withMouth.mouth).toEqual(expect.objectContaining({teeth:true,lineCenter:0}));
 view.rerender(<PhotoFaceEditor value={withMouth} disabled={false} onChange={change} onBlink={jest.fn()} onSpeaking={speak}/>);
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 Object.defineProperty(SVGElement.prototype,'setPointerCapture',{configurable:true,value:jest.fn()});
 try{
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});
  jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  const center=screen.getByLabelText('Đường giữa miệng lineCenter');
  fireEvent.pointerDown(center,{button:0,clientX:192,clientY:284});fireEvent.pointerMove(svg,{clientX:192,clientY:290});fireEvent.pointerUp(svg);
  const edited=change.mock.calls[change.mock.calls.length-1][0];
  expect(edited.mouth.lineCenter).toBeCloseTo(6/384/.08);
  expect(edited.mouth.lineLeft).toBe(0);expect(edited.mouth.lineRight).toBe(0);
  fireEvent.click(screen.getByRole('button',{name:'Hiện răng'}));expect(change).toHaveBeenLastCalledWith(expect.objectContaining({mouth:expect.objectContaining({teeth:false})}));
  fireEvent.click(screen.getByRole('button',{name:'Nói thử'}));expect(speak).toHaveBeenLastCalledWith(true);
 }finally{if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');Reflect.deleteProperty(SVGElement.prototype,'setPointerCapture');}
});

test('local face drag stores a bounded warp grid and toggles the real head outline',()=>{
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 Object.defineProperty(SVGElement.prototype,'setPointerCapture',{configurable:true,value:jest.fn()});
 try{
  const change=jest.fn(),value=photo();
  const view=render(<PhotoFaceEditor value={value} outline={[[.1,.2],[.9,.2],[.5,.95]]} disabled={false} onChange={change} onBlink={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Kéo méo gương mặt'}));expect(screen.getByLabelText('Lớp viền gương mặt')).toBeTruthy();
  expect(screen.queryByRole('button',{name:'Hiện lớp viền mặt'})).toBeNull();
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});
  jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  fireEvent.pointerDown(svg,{button:0,clientX:192,clientY:192});fireEvent.pointerMove(svg,{clientX:211,clientY:192});fireEvent.pointerUp(svg);
  const fitted=change.mock.calls[change.mock.calls.length-1][0];
  expect(fitted.warp).toHaveLength(49);expect(fitted.warp[24].x).toBeLessThan(0);expect(fitted.warp[0]).toEqual({x:0,y:0});
  expect(fitted.x).toBe(value.x);expect(fitted.eyes).toEqual(value.eyes);
  view.rerender(<PhotoFaceEditor value={fitted} disabled={false} onChange={change} onBlink={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Đặt lại kéo méo'}));expect(change).toHaveBeenLastCalledWith(expect.objectContaining({warp:undefined}));
 }finally{if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');Reflect.deleteProperty(SVGElement.prototype,'setPointerCapture');}
});

test('skin eyedropper samples the photo pixel and exits without dragging the face',()=>{
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 try{
  context.getImageData=jest.fn().mockReturnValue({data:new Uint8ClampedArray([18,52,86,255])});
  const color=jest.fn(),change=jest.fn();render(<PhotoFaceEditor value={photo()} disabled={false} skinColor="#E0A97C" onSkinColor={color} onChange={change} onBlink={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Lấy màu da từ ảnh'}));
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});
  jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  fireEvent.pointerDown(svg,{button:0,clientX:192,clientY:192});
  expect(color).toHaveBeenCalledWith('#123456');expect(change).not.toHaveBeenCalled();
  expect(screen.getByRole('button',{name:'Lấy màu da từ ảnh'}).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('slider',{name:'Độ mềm mép ghép'}).getAttribute('max')).toBe('1');
 }finally{if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');}
});

test('click-to-close contour supports dragging one vertex without replacing the other points',()=>{
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 Object.defineProperty(SVGElement.prototype,'setPointerCapture',{configurable:true,value:jest.fn()});
 try{
  const changes=jest.fn(),draft=jest.fn();
  const Editor=()=>{const [value,setValue]=React.useState(photo());return <PhotoFaceEditor value={value} disabled={false} onChange={next=>{changes(next);if(next)setValue(next);}} onBlink={jest.fn()} onContourDraftChange={draft}/>;}
  render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Vẽ viền mặt'}));
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});
  jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  const click=(x:number,y:number)=>fireEvent.pointerDown(svg,{button:0,clientX:(x+.15)/1.3*384,clientY:(y+.15)/1.3*384});
  click(.2,.2);click(.8,.2);click(.5,.8);
  expect(changes).not.toHaveBeenCalled();expect(draft).toHaveBeenLastCalledWith(true);
  fireEvent.pointerDown(screen.getByLabelText('Đỉnh viền mặt 1'),{button:0,clientX:(.2+.15)/1.3*384,clientY:(.2+.15)/1.3*384});
  const saved=changes.mock.calls[changes.mock.calls.length-1][0];expect(saved.contour).toHaveLength(3);expect(draft).toHaveBeenLastCalledWith(false);
  fireEvent.pointerDown(screen.getByLabelText('Đỉnh viền mặt 2'),{button:0,clientX:(.8+.15)/1.3*384,clientY:(.2+.15)/1.3*384});
  fireEvent.pointerMove(svg,{clientX:(.75+.15)/1.3*384,clientY:(.25+.15)/1.3*384});fireEvent.pointerUp(svg);
  const edited=changes.mock.calls[changes.mock.calls.length-1][0];expect(edited.contour[1].x).toBeCloseTo(.75,2);expect(edited.contour[0]).toEqual(saved.contour[0]);expect(edited.contour[2]).toEqual(saved.contour[2]);
 }finally{if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');Reflect.deleteProperty(SVGElement.prototype,'setPointerCapture');}
});
test('holding and drawing a freehand contour closes on release; cancelling a new draft preserves the existing mask',()=>{
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 Object.defineProperty(SVGElement.prototype,'setPointerCapture',{configurable:true,value:jest.fn()});
 try{
  const changes=jest.fn();const Editor=()=>{const [value,setValue]=React.useState(photo());return <PhotoFaceEditor value={value} disabled={false} onChange={next=>{changes(next);if(next)setValue(next);}} onBlink={jest.fn()}/>;}
  render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:'Vẽ viền mặt'}));fireEvent.click(screen.getByRole('button',{name:'Vẽ tự do'}));
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});
  jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  const coords=(x:number,y:number)=>({button:0,clientX:(x+.15)/1.3*384,clientY:(y+.15)/1.3*384});
  fireEvent.pointerDown(svg,coords(.2,.2));for(const [x,y] of [[.8,.2],[.8,.8],[.2,.8],[.2,.2]])fireEvent.pointerMove(svg,coords(x,y));fireEvent.pointerUp(svg);
  expect(changes.mock.calls[changes.mock.calls.length-1][0].contour).toHaveLength(4);
  const count=changes.mock.calls.length;fireEvent.click(screen.getByRole('button',{name:'Vẽ nối điểm'}));fireEvent.pointerDown(svg,coords(.3,.3));fireEvent.click(screen.getByRole('button',{name:'Hủy vẽ viền'}));expect(changes).toHaveBeenCalledTimes(count);
  fireEvent.click(screen.getByRole('button',{name:'Khôi phục viền mặc định'}));expect(changes.mock.calls[changes.mock.calls.length-1][0].contour).toBeUndefined();
 }finally{if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');Reflect.deleteProperty(SVGElement.prototype,'setPointerCapture');}
});

test('eye and mouth side handles keep the opposite endpoint fixed even when the pointer moves vertically',()=>{
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 Object.defineProperty(SVGElement.prototype,'setPointerCapture',{configurable:true,value:jest.fn()});
 try{
  const change=jest.fn(),value={...photo(),mouth:{x:.5,y:.74,width:.3,height:.08,angle:0,lineLeft:0,lineCenter:0,lineRight:0,teeth:true}};
  render(<PhotoFaceEditor value={value} disabled={false} onChange={change} onBlink={jest.fn()}/>);
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  fireEvent.click(screen.getByRole('button',{name:'Mắt trái'}));
  fireEvent.pointerDown(screen.getByLabelText('Kéo mép mắt trái 1'),{button:0,clientX:170,clientY:154});fireEvent.pointerMove(svg,{clientX:189,clientY:169});fireEvent.pointerUp(svg);
  const eye=change.mock.calls[change.mock.calls.length-1][0].eyes.left;
  expect(eye.x-eye.width/2).toBeCloseTo(value.eyes.left.x-value.eyes.left.width/2,8);expect(eye.y).toBe(value.eyes.left.y);expect(eye.height).toBe(value.eyes.left.height);
  fireEvent.click(screen.getByRole('button',{name:'Miệng'}));
  fireEvent.pointerDown(screen.getByLabelText('Kéo mép miệng 1'),{button:0,clientX:260,clientY:284});fireEvent.pointerMove(svg,{clientX:279,clientY:300});fireEvent.pointerUp(svg);
  const mouth=change.mock.calls[change.mock.calls.length-1][0].mouth;
  expect(mouth.x-mouth.width/2).toBeCloseTo(value.mouth.x-value.mouth.width/2,8);expect(mouth.y).toBe(value.mouth.y);expect(mouth.height).toBe(value.mouth.height);
 }finally{if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');Reflect.deleteProperty(SVGElement.prototype,'setPointerCapture');}
});

 test('individual detail mode and new region buttons preserve the photograph',()=>{
  const change=jest.fn(),value=photo();
  render(<PhotoFaceEditor value={value} disabled={false} onChange={change} onBlink={jest.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Ghép từng chi tiết'}));
  expect(change.mock.calls[0][0]).toEqual({...value,mode:'features'});
  for(const [label,key] of [['Mũi','nose'],['Chân mày trái','browLeft'],['Chân mày phải','browRight']]){
   fireEvent.click(screen.getByRole('button',{name:label}));
   const next=change.mock.calls[change.mock.calls.length-1][0];
   expect(next[key]).toMatchObject({angle:0});expect(next.image).toBe(value.image);
  }
 });

test.each([['Mắt trái','left'],['Mắt phải','right'],['Miệng','mouth'],['Mũi','nose'],['Chân mày trái','browLeft'],['Chân mày phải','browRight']])('draws an independent polygon for %s and restores its fixed shape',(label,key)=>{
 const original=Object.getOwnPropertyDescriptor(window,'PointerEvent');Object.defineProperty(window,'PointerEvent',{configurable:true,value:MouseEvent});
 Object.defineProperty(SVGElement.prototype,'setPointerCapture',{configurable:true,value:jest.fn()});
 const changed=jest.fn();
 function Editor(){const [value,setValue]=React.useState(photo());return <PhotoFaceEditor value={value} disabled={false} onChange={next=>{if(next){setValue(next);changed(next);}}} onBlink={jest.fn()}/>;}
 try{
  render(<Editor/>);fireEvent.click(screen.getByRole('button',{name:label}));fireEvent.click(screen.getByRole('button',{name:'Chi tiết: Nối điểm'}));
  const svg=screen.getByRole('img',{name:'Kéo ảnh hoặc kéo, xoay khung mắt'});jest.spyOn(svg,'getBoundingClientRect').mockReturnValue({x:0,y:0,left:0,top:0,right:384,bottom:384,width:384,height:384,toJSON:()=>({})});
  for(const [x,y] of [[.4,.3],[.6,.3],[.5,.5],[.4,.3]])fireEvent.pointerDown(svg,{button:0,clientX:x*384,clientY:y*384});
  const last=()=>changed.mock.calls[changed.mock.calls.length-1][0];
  const detail=()=>key==='left'||key==='right'?last().eyes[key]:last()[key];
  expect(detail().contour).toHaveLength(3);expect(last().contour).toBeUndefined();
  expect(screen.getByRole('button',{name:'Vẽ viền mặt'}).getAttribute('aria-pressed')).toBe('false');
  expect(screen.queryByLabelText('Đỉnh viền mặt 1')).toBeNull();
  expect(svg.querySelectorAll('[data-region-select]').length).toBeGreaterThan(0);
  expect(svg.querySelector('[data-eye]')).toBeNull();
  const vertex=screen.getByLabelText('Đỉnh chi tiết 1');
  fireEvent.pointerDown(vertex,{button:0,clientX:.4*384,clientY:.3*384});
  fireEvent.pointerMove(svg,{clientX:.39*384,clientY:.3*384});fireEvent.pointerUp(svg);
  expect(detail().contour[0].x).toBeCloseTo(.39);
  fireEvent.click(screen.getByRole('button',{name:'Chi tiết: Hình cố định'}));expect(detail().contour).toBeUndefined();
  fireEvent.click(screen.getByRole('button',{name:'Chi tiết: Vẽ liên tục'}));
  fireEvent.pointerDown(svg,{button:0,clientX:.4*384,clientY:.3*384});
  for(const [x,y] of [[.6,.3],[.6,.5],[.4,.5],[.4,.3]])fireEvent.pointerMove(svg,{clientX:x*384,clientY:y*384});
  fireEvent.pointerUp(svg);expect(detail().contour.length).toBeGreaterThanOrEqual(3);expect(last().contour).toBeUndefined();

 }finally{if(original)Object.defineProperty(window,'PointerEvent',original);else Reflect.deleteProperty(window,'PointerEvent');Reflect.deleteProperty(SVGElement.prototype,'setPointerCapture');}
});

test('detail placement size changes independently of the source crop',()=>{
 const value={...photo(),mode:'features' as const},change=jest.fn();
 render(<PhotoFaceEditor value={value} disabled={false} onChange={change} onBlink={jest.fn()}/>);
 fireEvent.click(screen.getByRole('button',{name:'Mắt trái'}));
 fireEvent.change(screen.getByRole('slider',{name:'Kích thước trên gương mặt'}),{target:{value:'1.5'}});
 const next=change.mock.calls[change.mock.calls.length-1][0];
 expect(next.eyes.left).toEqual({...value.eyes.left,placementScale:1.5});
 expect(next.eyes.right).toEqual(value.eyes.right);expect(next.image).toBe(value.image);
});
