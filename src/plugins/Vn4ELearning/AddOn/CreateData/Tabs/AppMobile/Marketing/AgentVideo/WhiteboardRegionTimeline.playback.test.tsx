import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WhiteboardRegionTimeline from './WhiteboardRegionTimeline';
import {TimelineAudioPlayback} from 'helpers/timelineAudioPlayback';
import type {TimelineAudioClip} from 'helpers/timelineAudio';

test('video 67 beat 10 never publishes beat 11 time when an audio frame overshoots the boundary', async () => {
    let frame: FrameRequestCallback | undefined;
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const play = jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) { this.dispatchEvent(new Event('pause')); });
    const changed = jest.fn();
    try {
        const { container } = render(<WhiteboardRegionTimeline regions={[]} beatDurationSec={1.51}
            beatStartSec={18.704} beatWords={[]} colorFor={() => '#fff'} onChangeRegion={() => {}}
            audioUrl="/video67.mp3" shortVideoId={67} beatId="beat_10" onPlayheadChange={changed} />);
        const audio = container.querySelector('audio')!;
        Object.defineProperty(audio, 'paused', { configurable: true, get: () => false });
        changed.mockClear();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Phát audio beat' })); });
        audio.currentTime = 20.25;
        act(() => { frame?.(1000); });
        const userUpdates = changed.mock.calls.filter(call => call[2] === 'user');
        expect(userUpdates.length).toBeGreaterThan(0);
        expect(userUpdates.every(([local]) => 18.704 + local < 20.214)).toBe(true);
        expect(userUpdates[userUpdates.length - 1][1]).toBe(false);
        expect(userUpdates[userUpdates.length - 1][0]).toBeCloseTo(1.46);
        // Playing again from a stopped/overshot media clock must restart this beat.
        changed.mockClear();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Phát audio beat' })); });
        expect(audio.currentTime).toBeCloseTo(18.704);
        expect(changed.mock.calls.filter(call => call[2] === 'user').every(([local]) => 18.704 + local < 20.214)).toBe(true);
    } finally { raf.mockRestore(); cancel.mockRestore(); play.mockRestore(); pause.mockRestore(); }
});

function beatPlayer(changed:jest.Mock){return <WhiteboardRegionTimeline regions={[]} beatDurationSec={5.6} beatStartSec={0} beatWords={[]} colorFor={()=>'#fff'} onChangeRegion={()=>{}} audioUrl="/beat1.mp3" shortVideoId={122} beatId="beat_1" onPlayheadChange={changed}/>;}

test('native timeupdate stops beat 1 before beat 2 even when animation frames are delayed',async()=>{
 const raf=jest.spyOn(window,'requestAnimationFrame').mockReturnValue(1),cancel=jest.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 let paused=true;
 const play=jest.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(async()=>{paused=false;});
 const pause=jest.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{paused=true;});
 const changed=jest.fn(),view=render(beatPlayer(changed));
 const audio=view.container.querySelector('audio')!;Object.defineProperty(audio,'paused',{configurable:true,get:()=>paused});
 try{
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Phát audio beat'}));});
  changed.mockClear();audio.currentTime=5.59;
  act(()=>{fireEvent.timeUpdate(audio);});expect(paused).toBe(false);
  audio.currentTime=5.7;
  act(()=>{fireEvent.timeUpdate(audio);});
  expect(paused).toBe(true);expect(changed).toHaveBeenLastCalledWith(5.55,false,'user');
  expect(changed.mock.calls.every(([local])=>local<5.6)).toBe(true);
 }finally{view.unmount();raf.mockRestore();cancel.mockRestore();play.mockRestore();pause.mockRestore();}
});

test('closing a playing beat pauses its voice and publishes the stop required by BGM',async()=>{
 const raf=jest.spyOn(window,'requestAnimationFrame').mockReturnValue(1),cancel=jest.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 let paused=true;
 const play=jest.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(async()=>{paused=false;});
 const pause=jest.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{paused=true;});
 const changed=jest.fn(),view=render(beatPlayer(changed));const audio=view.container.querySelector('audio')!;
 Object.defineProperty(audio,'paused',{configurable:true,get:()=>paused});
 try{
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Phát audio beat'}));});audio.currentTime=2;
  changed.mockClear();view.unmount();
  expect(paused).toBe(true);expect(changed).toHaveBeenLastCalledWith(2,false,'user');
 }finally{raf.mockRestore();cancel.mockRestore();play.mockRestore();pause.mockRestore();}
});

test('pause cancels a pending play promise so it cannot restart beat preview or BGM',async()=>{
 const raf=jest.spyOn(window,'requestAnimationFrame').mockReturnValue(1),cancel=jest.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 let finish!:()=>void;
 const play=jest.spyOn(HTMLMediaElement.prototype,'play').mockReturnValue(new Promise<void>(resolve=>{finish=resolve;}));
 const pause=jest.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
 const changed=jest.fn(),view=render(beatPlayer(changed));
 try{
  fireEvent.click(screen.getByRole('button',{name:'Phát audio beat'}));
  fireEvent.click(screen.getByRole('button',{name:'Dừng'}));
  changed.mockClear();raf.mockClear();await act(async()=>{finish();});
  expect(changed.mock.calls.some(([,playing])=>playing)).toBe(false);expect(raf).not.toHaveBeenCalled();
 }finally{view.unmount();raf.mockRestore();cancel.mockRestore();play.mockRestore();pause.mockRestore();}
});

test('finishing beat 1 stops an actual BGM playback bus immediately',async()=>{
 const raf=jest.spyOn(window,'requestAnimationFrame').mockReturnValue(1),cancel=jest.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});
 let paused=true;
 const play=jest.spyOn(HTMLMediaElement.prototype,'play').mockImplementation(async()=>{paused=false;});
 const pause=jest.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{paused=true;});
 const music={paused:true,currentTime:0,play:jest.fn(async()=>{music.paused=false;}),pause:jest.fn(()=>{music.paused=true;})};
 const bgm:TimelineAudioClip={id:'bgm',sound_id:'bgm',sound:{id:'bgm',file:'music.mp3',title:'BGM',duration_sec:96,category:'bgm',license:'',source:''},start_sec:0,duration_sec:63.5,offset_sec:0,volume:.12,loop:false,fade_in:0,fade_out:0};
 const bus=new TimelineAudioPlayback(async()=>music as unknown as HTMLAudioElement,()=>{},()=>{});
 const changed=jest.fn((local:number,playing:boolean,origin:string)=>{if(origin==='user')bus.sync(local,playing,[bgm]);});
 const view=render(beatPlayer(changed)),audio=view.container.querySelector('audio')!;
 Object.defineProperty(audio,'paused',{configurable:true,get:()=>paused});
 try{
  await act(async()=>{fireEvent.click(screen.getByRole('button',{name:'Phát audio beat'}));});
  expect(music.play).toHaveBeenCalledTimes(1);expect(music.paused).toBe(false);
  audio.currentTime=5.6;act(()=>{fireEvent.ended(audio);});
  expect(music.paused).toBe(true);expect(changed).toHaveBeenLastCalledWith(5.55,false,'user');
  await act(async()=>{await Promise.resolve();});expect(music.play).toHaveBeenCalledTimes(1);
 }finally{view.unmount();bus.dispose();raf.mockRestore();cancel.mockRestore();play.mockRestore();pause.mockRestore();}
});
