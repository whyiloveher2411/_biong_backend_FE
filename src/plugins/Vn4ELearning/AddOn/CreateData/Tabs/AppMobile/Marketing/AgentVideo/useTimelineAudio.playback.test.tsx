import {installTestAudioContext} from 'testUtils/audioContext';
import React from 'react';
import {act,render} from '@testing-library/react';
import useTimelineAudio from './useTimelineAudio';
import {timelineAudioApi} from 'helpers/timelineAudio';
import {prepareTimelineAudioRange} from 'helpers/timelineAudioReadiness';
import {loadLibrarySoundBlobUrl} from 'helpers/modelAudio';
jest.mock('../SoundLibraryDrawer',()=>()=>null);
jest.mock('components/molecules/DrawerCustom',()=>()=>null);
jest.mock('helpers/modelAudio',()=>({librarySoundUrl:()=>'/door.wav',loadLibrarySoundBlobUrl:jest.fn()}));
jest.mock('helpers/timelineAudio',()=>({...jest.requireActual('helpers/timelineAudio'),timelineAudioApi:jest.fn()}));
const clip={id:'door',sound_id:'door',sound:{id:'door',file:'door.wav',title:'Mở cửa',duration_sec:.91896,category:'foley',license:'CC0',source:''},start_sec:22.39,duration_sec:.75,offset_sec:0,volume:2,loop:false,fade_in:0,fade_out:0};
function Player({time,playing}:{time:number;playing:boolean}){useTimelineAudio(67,time,playing,100);return null;}

test('beat-start sound has one transport authority and plays once across duplicate event/render updates',async()=>{
 const media={paused:true,readyState:4,duration:.91896,currentTime:0,playbackRate:1,volume:1,preload:'',play:jest.fn(),pause:jest.fn()};
 media.play.mockImplementation(()=>{media.paused=false;return Promise.resolve();});
 media.pause.mockImplementation(()=>{media.paused=true;});
 const AudioOriginal=window.Audio;
 window.Audio=jest.fn(()=>media) as unknown as typeof Audio;
 const warn=jest.spyOn(console,'warn').mockImplementation(()=>{});
 (timelineAudioApi as jest.Mock).mockResolvedValue({success:true,clips:[clip],revision:'r1'});
 (loadLibrarySoundBlobUrl as jest.Mock).mockResolvedValue('blob:door');
 const revoke=URL.revokeObjectURL;URL.revokeObjectURL=jest.fn();
 let view:ReturnType<typeof render>|undefined;
 try{
  await act(async()=>{view=render(<Player time={0} playing={false}/>);});
  // Native beat event arrives before the parent commits its matching props.
  await act(async()=>{document.dispatchEvent(new CustomEvent('timeline-audio-playhead',{detail:{videoId:67,time:22.39,playing:true,soundPlaying:true,origin:'user'}}));});
  expect(media.play).not.toHaveBeenCalled();
  await act(async()=>{view!.rerender(<Player time={22.39} playing/>);});
  expect(media.play).toHaveBeenCalledTimes(1);
  media.currentTime=.04;
  await act(async()=>{
   document.dispatchEvent(new CustomEvent('timeline-audio-playhead',{detail:{videoId:67,time:22.43,playing:true,soundPlaying:true,origin:'user'}}));
   view!.rerender(<Player time={22.43} playing/>);
  });
  expect(media.play).toHaveBeenCalledTimes(1);
  expect(media.currentTime).toBe(.04);
  await act(async()=>{view!.rerender(<Player time={23.15} playing={false}/>);});
  // An intentional replay is still allowed to start the same clip again.
  await act(async()=>{view!.rerender(<Player time={22.39} playing/>);});
  expect(media.play).toHaveBeenCalledTimes(2);
  expect(media.currentTime).toBe(0);
 }finally{view?.unmount();window.Audio=AudioOriginal;warn.mockRestore();URL.revokeObjectURL=revoke;}
});
test('a failed item is reloaded on replay while another item keeps playing, with time-based preloading',async()=>{
 const healthy={...clip,id:'healthy',sound_id:'healthy',sound:{...clip.sound,id:'healthy',file:'healthy.wav',title:'Healthy'}};
 class Media extends EventTarget {
  paused=true;readyState=4;duration=.91896;currentTime=0;playbackRate=1;volume=1;preload='';error:{code:number}|null=null;
  play=jest.fn(async()=>{this.paused=false;});pause=jest.fn(()=>{this.paused=true;});
 }
 const created:{url:string;media:Media}[]=[];let failedOnce=false;
 const AudioOriginal=window.Audio;
 window.Audio=jest.fn((url:string)=>{
  const media=new Media();
  if(url==='blob:door.wav'&&!failedOnce){failedOnce=true;media.error={code:3};media.duration=NaN;}
  created.push({url,media});return media;
 }) as unknown as typeof Audio;
 const warn=jest.spyOn(console,'warn').mockImplementation(()=>{}),revoke=URL.revokeObjectURL;URL.revokeObjectURL=jest.fn();
 (timelineAudioApi as jest.Mock).mockResolvedValue({success:true,clips:[clip,healthy],revision:'r2'});
 (loadLibrarySoundBlobUrl as jest.Mock).mockImplementation(async file=>'blob:'+file);
 let view:ReturnType<typeof render>|undefined;
 try{
  // No beat map: the upcoming 8-second window must still preload both items.
  await act(async()=>{view=render(<Player time={20} playing={false}/>);});
  expect(created).toHaveLength(2);expect(created.every(x=>x.media.play.mock.calls.length===0)).toBe(true);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:door.wav');
  await act(async()=>{view!.rerender(<Player time={22.39} playing/>);});
  expect(created.filter(x=>x.url==='blob:door.wav')).toHaveLength(2);
  expect(created.find(x=>x.url==='blob:healthy.wav')!.media.play).toHaveBeenCalledTimes(1);
  expect(created.filter(x=>x.url==='blob:door.wav')[1].media.play).toHaveBeenCalledTimes(1);
 }finally{view?.unmount();window.Audio=AudioOriginal;warn.mockRestore();URL.revokeObjectURL=revoke;}
});

let audioContextTest:ReturnType<typeof installTestAudioContext>;
beforeEach(()=>{audioContextTest=installTestAudioContext();});
afterEach(()=>audioContextTest.restore());

test('whole-video Play waits for the initial clip list and decoded SFX instead of racing ahead',async()=>{
 let resolveList!:(response:unknown)=>void;
 (timelineAudioApi as jest.Mock).mockReturnValue(new Promise(resolve=>{resolveList=resolve;}));
 (loadLibrarySoundBlobUrl as jest.Mock).mockResolvedValue('blob:door');
 const original=window.Audio,revoke=URL.revokeObjectURL;
 const media={readyState:4,duration:.91896,currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()};
 window.Audio=jest.fn(()=>media) as unknown as typeof Audio;URL.revokeObjectURL=jest.fn();
 const view=render(<Player time={22} playing={false}/>);
 try{
  let ready=false;const waiting=prepareTimelineAudioRange(67,22,23).then(()=>{ready=true;});
  await act(async()=>{await Promise.resolve();});expect(ready).toBe(false);
  await act(async()=>{resolveList({success:true,clips:[clip],revision:'loaded'});await waiting;});
  expect(ready).toBe(true);expect(media.play).not.toHaveBeenCalled();expect(loadLibrarySoundBlobUrl).toHaveBeenCalledTimes(1);
  await act(async()=>{view.rerender(<Player time={22.39} playing/>);});expect(media.play).toHaveBeenCalledTimes(1);
 }finally{view.unmount();window.Audio=original;URL.revokeObjectURL=revoke;}
});
