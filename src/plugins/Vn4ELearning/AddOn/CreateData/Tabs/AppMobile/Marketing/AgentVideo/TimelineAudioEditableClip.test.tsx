import React from 'react';
import {render,fireEvent} from '@testing-library/react';
import TimelineAudioEditableClip from './TimelineAudioEditableClip';
import type {TimelineAudioClip} from 'helpers/timelineAudio';
jest.mock('hook/useApi',()=>({ajax:jest.fn()}));
const clip:TimelineAudioClip={id:'fast',sound_id:'sound',sound:{id:'sound',file:'test.wav',title:'Test',duration_sec:20,category:'foley',license:'CC0',source:''},start_sec:2,duration_sec:1,offset_sec:0,volume:1,loop:false,speed:1,fade_in:0,fade_out:0,event_beat_id:'beat_1'};
const originalPointer=window.PointerEvent;
beforeAll(()=>{class TestPointerEvent extends MouseEvent {pointerId:number;constructor(type:string,init:PointerEventInit={}){super(type,init);this.pointerId=init.pointerId??1;}}Object.defineProperty(window,'PointerEvent',{configurable:true,value:TestPointerEvent});});
afterAll(()=>{Object.defineProperty(window,'PointerEvent',{configurable:true,value:originalPointer});});
beforeEach(()=>{jest.spyOn(window,'requestAnimationFrame').mockReturnValue(1);jest.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
function setup(){const commit=jest.fn(),editing=jest.fn();const view=render(<TimelineAudioEditableClip clip={clip} pixelsPerSecond={50} bounds={{start:0,end:10}} getScrollLeft={()=>0} scrollTo={()=>{}} getViewport={()=>undefined} onCommit={commit} onEditing={editing}><div>Sound</div></TimelineAudioEditableClip>);const root=view.container.querySelector('[data-audio-clip-id]') as HTMLElement;const handle=root.querySelector('[data-audio-resize=right]') as HTMLElement;return {...view,root,handle,commit,editing};}
test('a fast pointer jump outside the handle updates immediately and pointerup ends the gesture',()=>{
 const view=setup();fireEvent.pointerDown(view.handle,{pointerId:1,button:0,buttons:1,clientX:150,clientY:10});
 fireEvent.pointerMove(window,{pointerId:1,buttons:1,clientX:350,clientY:90});
 expect(view.root.style.width).toBe('250px');expect(view.editing).toHaveBeenLastCalledWith(true);
 fireEvent.pointerUp(window,{pointerId:1,button:0,buttons:0,clientX:350,clientY:90});
 expect(view.commit).toHaveBeenCalledWith(2,7,90);expect(view.commit).toHaveBeenCalledTimes(1);expect(view.editing).toHaveBeenLastCalledWith(false);
 fireEvent.pointerMove(window,{pointerId:1,buttons:0,clientX:400,clientY:10});
 expect(view.root.style.width).toBe('100%');expect(view.commit).toHaveBeenCalledTimes(1);view.unmount();
});
test('a missing pointerup is recovered without using hover coordinates to resize again',()=>{
 const view=setup();fireEvent.pointerDown(view.handle,{pointerId:1,button:0,buttons:1,clientX:150,clientY:10});
 fireEvent.pointerMove(window,{pointerId:1,buttons:1,clientX:200,clientY:10});
 fireEvent.pointerMove(window,{pointerId:1,buttons:0,clientX:500,clientY:20});
 expect(view.commit).toHaveBeenCalledWith(2,4,10);expect(view.root.dataset.audioEditing).toBe('false');
 fireEvent.pointerMove(view.handle,{pointerId:1,buttons:0,clientX:550,clientY:10});expect(view.commit).toHaveBeenCalledTimes(1);view.unmount();
});
test('window blur cancels resize and hover cannot restart it',()=>{
 const view=setup();fireEvent.pointerDown(view.handle,{pointerId:1,button:0,buttons:1,clientX:150,clientY:10});fireEvent.pointerMove(window,{pointerId:1,buttons:1,clientX:300,clientY:10});
 fireEvent.blur(window);expect(view.commit).not.toHaveBeenCalled();expect(view.editing).toHaveBeenLastCalledWith(false);
 fireEvent.pointerMove(view.handle,{pointerId:1,buttons:1,clientX:450,clientY:10});expect(view.root.style.width).toBe('100%');expect(view.commit).not.toHaveBeenCalled();view.unmount();
});
