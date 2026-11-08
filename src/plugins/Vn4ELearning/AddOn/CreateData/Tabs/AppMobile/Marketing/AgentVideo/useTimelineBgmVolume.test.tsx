import React from 'react';
import {act,render} from '@testing-library/react';
import useTimelineBgmVolume from './useTimelineBgmVolume';
import {saveTimelineBgmVolume,TimelineAudioClip} from 'helpers/timelineAudio';
jest.mock('helpers/timelineAudio',()=>({saveTimelineBgmVolume:jest.fn()}));
const clip:TimelineAudioClip={id:'bgm_slot_0',segment_index:0,segment_id:'smile',sound_id:'bgm',sound:{id:'bgm',file:'https://example.com/smile.mp3',title:'Smile',duration_sec:90,category:'bgm',license:'',source:'mixkit'},start_sec:0,duration_sec:60,offset_sec:0,volume:.12,loop:false,fade_in:0,fade_out:0};
let state:ReturnType<typeof useTimelineBgmVolume>;
function Player(){state=useTimelineBgmVolume(122,[clip,{...clip,id:'bgm_slot_1',start_sec:60}]);return null;}
beforeEach(()=>{jest.useFakeTimers();jest.clearAllMocks();});
afterEach(()=>jest.useRealTimers());
test('BGM volume previews all loop slots immediately and debounces canonical song writes',async()=>{
 (saveTimelineBgmVolume as jest.Mock).mockResolvedValue({success:true,bgm_clips:[{...clip,volume:.35}]});
 const view=render(<Player/>);
 try{
  act(()=>{state.patch(clip,.2);});act(()=>{state.patch(clip,.35);});
  expect(state.clips.map(c=>c.volume)).toEqual([.35,.35]);expect(saveTimelineBgmVolume).not.toHaveBeenCalled();
  await act(async()=>{jest.advanceTimersByTime(700);});
  expect(saveTimelineBgmVolume).toHaveBeenCalledTimes(1);
  expect(saveTimelineBgmVolume).toHaveBeenCalledWith(122,[{segment_index:0,segment_id:'smile',download_url:clip.sound.file,volume:.35}]);
  expect(state.dirty).toBe(false);
 }finally{view.unmount();}
});
test('newer drag edits survive an in-flight save and save serially',async()=>{
 let finish!:(value:unknown)=>void;
 (saveTimelineBgmVolume as jest.Mock).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;})).mockResolvedValue({success:true,bgm_clips:[{...clip,volume:.4}]});
 const view=render(<Player/>);
 try{
  act(()=>{state.patch(clip,.2);});await act(async()=>{jest.advanceTimersByTime(700);});
  act(()=>{state.patch(clip,.4);});
  await act(async()=>{finish({success:true,bgm_clips:[{...clip,volume:.2}]});});
  expect(state.clips[0].volume).toBe(.4);expect(state.dirty).toBe(true);
  await act(async()=>{jest.advanceTimersByTime(700);});
  expect(saveTimelineBgmVolume).toHaveBeenCalledTimes(2);expect(state.dirty).toBe(false);
 }finally{view.unmount();}
});
test('save failure stays visible and retains optimistic volume for retry',async()=>{
 (saveTimelineBgmVolume as jest.Mock).mockResolvedValueOnce({success:false,message:'BGM đã thay đổi'}).mockResolvedValue({success:true,bgm_clips:[clip]});
 const view=render(<Player/>);
 try{
  act(()=>{state.patch(clip,2);});expect(state.clips[0].volume).toBe(1.5);
  await act(async()=>{jest.advanceTimersByTime(700);});expect(state.error).toBe('BGM đã thay đổi');expect(state.dirty).toBe(true);
  act(()=>{state.retry();});await act(async()=>{jest.advanceTimersByTime(700);});expect(state.dirty).toBe(false);
 }finally{view.unmount();}
});
