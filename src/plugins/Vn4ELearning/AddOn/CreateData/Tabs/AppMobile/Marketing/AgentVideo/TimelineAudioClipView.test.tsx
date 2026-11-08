import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react';
import TimelineAudioClipView from './TimelineAudioClipView';
import type {TimelineAudioClip} from 'helpers/timelineAudio';
const clip:TimelineAudioClip={id:'door',sound_id:'door',sound:{id:'door',file:'door.wav',title:'Mở cửa',duration_sec:1,category:'foley',license:'CC0',source:''},start_sec:0,duration_sec:1,offset_sec:0,volume:.4,loop:false,fade_in:0,fade_out:0};
test('muted clip has a visible status and preserves the volume control',()=>{
 const {rerender}=render(<TimelineAudioClipView clip={{...clip,muted:true}} selected={false} onSelect={()=>{}} onVolume={()=>{}}/>);
 expect(screen.getByText('Tắt âm · Mở cửa')).toBeTruthy();
 expect(screen.getByRole('slider').getAttribute('aria-valuenow')).toBe('40');
 expect(screen.getByTitle('Đã tắt âm · Mở cửa · 40% · 1×')).toBeTruthy();
 rerender(<TimelineAudioClipView clip={clip} selected={false} onSelect={()=>{}} onVolume={()=>{}}/>);
 expect(screen.queryByText('Tắt âm · Mở cửa')).toBeNull();
 expect(screen.getByText('Mở cửa')).toBeTruthy();
});

test('BGM slider uses its own limits and keyboard edits without opening the drawer',()=>{
 const volume=jest.fn(),select=jest.fn();
 render(<TimelineAudioClipView clip={{...clip,volume:1.5}} selected={false} onSelect={select} onVolume={volume} minVolume={.05} maxVolume={1.5}/>);
 const slider=screen.getByRole('slider');expect(slider.getAttribute('aria-valuemax')).toBe('150');expect(slider.getAttribute('aria-valuemin')).toBe('5');
 fireEvent.keyDown(slider,{key:'ArrowUp'});expect(volume).toHaveBeenLastCalledWith(1.5);
 fireEvent.keyDown(slider,{key:'ArrowDown'});expect(volume).toHaveBeenLastCalledWith(1.45);expect(select).toHaveBeenCalledTimes(2);
});
