import React from 'react';
import {act,render} from '@testing-library/react';
import useTimelineAudio from './useTimelineAudio';
import {timelineAudioApi} from 'helpers/timelineAudio';
import {loadLibrarySoundBlobUrl} from 'helpers/modelAudio';
jest.mock('../SoundLibraryDrawer',()=>()=>null);
jest.mock('components/molecules/DrawerCustom',()=>()=>null);
jest.mock('helpers/modelAudio',()=>({librarySoundUrl:()=>'/door.wav',loadLibrarySoundBlobUrl:jest.fn()}));
jest.mock('helpers/timelineAudio',()=>({...jest.requireActual('helpers/timelineAudio'),timelineAudioApi:jest.fn()}));
const clip={id:'door',sound_id:'door',sound:{id:'door',file:'door.wav',title:'Mở cửa',duration_sec:.91896,category:'foley',license:'CC0',source:''},start_sec:22.39,duration_sec:.75,offset_sec:0,volume:2,loop:false,fade_in:0,fade_out:0};
function Player({time,playing}:{time:number;playing:boolean}){useTimelineAudio(67,time,playing,100);return null;}

test('beat-start sound has one transport authority and plays once across duplicate event/render updates',async()=>{
 const media={paused:true,duration:.91896,currentTime:0,playbackRate:1,volume:1,preload:'',play:jest.fn(),pause:jest.fn()};
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
