import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import TimelineVoiceClipView from './TimelineVoiceClipView';
import {useVoiceMix,useVoiceMedia,voicePreviewUrl} from 'helpers/timelineVoice';
jest.mock('helpers/apiHost',()=>({getAdminApiPrefix:()=>'/api/admin'}));
jest.mock('helpers/url',()=>({convertToURL:(prefix:string,path:string)=>prefix+'/'+path}));
jest.mock('store/user/user.reducers',()=>({getAccessToken:()=> 'test-token'}));
const gain={gain:{value:1},connect:jest.fn(),disconnect:jest.fn()};
const source={connect:jest.fn(),disconnect:jest.fn()};
const createSource=jest.fn(()=>source);
function Mixer({videoId=67001}:{videoId?:number}){const mix=useVoiceMix(videoId),ref=React.useRef<HTMLAudioElement>(null),other=React.useRef<HTMLAudioElement>(null);useVoiceMedia(ref,videoId);useVoiceMedia(other,videoId);return <><div style={{height:40,position:'relative'}}><TimelineVoiceClipView mix={mix} duration={10} onVolume={mix.setVolume} onToggle={mix.toggle}/></div><audio data-testid="voice" ref={ref}/><audio data-testid="other-voice" ref={other}/><audio data-testid="sfx"/></>;}
test('Voice mute and 200 percent gain affect narration players only without pausing or moving playhead',async()=>{
 createSource.mockImplementation(()=>source);
 const original=window.AudioContext;
 window.AudioContext=jest.fn(()=>({createMediaElementSource:createSource,createGain:()=>gain,destination:{},state:'running',resume:jest.fn().mockResolvedValue(undefined)})) as unknown as typeof AudioContext;
 const view=render(<Mixer/>);
 try{
  const voice=screen.getByTestId('voice') as HTMLAudioElement,other=screen.getByTestId('other-voice') as HTMLAudioElement,sfx=screen.getByTestId('sfx') as HTMLAudioElement;
  voice.currentTime=1.2;sfx.volume=.4;const pause=jest.spyOn(voice,'pause');
  expect(voice.volume).toBe(1);fireEvent.click(screen.getByLabelText('Tắt Voice'));
  expect(voice.muted).toBe(true);expect(other.muted).toBe(true);expect(sfx.muted).toBe(false);expect(sfx.volume).toBe(.4);expect(voice.currentTime).toBe(1.2);expect(pause).not.toHaveBeenCalled();
  fireEvent.click(screen.getByLabelText('Bật Voice'));
  const slider=screen.getByRole('slider',{name:'Âm lượng Voice'});for(let i=0;i<25;i++)fireEvent.keyDown(slider,{key:'ArrowUp'});
  expect(slider).toHaveAttribute('aria-valuenow','200');expect(gain.gain.value).toBe(2);expect(voice.volume).toBe(1);expect(createSource).toHaveBeenCalledWith(voice);expect(sfx.volume).toBe(.4);
  view.rerender(<Mixer videoId={67002}/>);await waitFor(()=>expect(screen.getByRole('slider',{name:'Âm lượng Voice'})).toHaveAttribute('aria-valuenow','100'));
 }finally{view.unmount();window.AudioContext=original;}
});
test('narration proxy is scoped to video and preserves the exact versioned source URL',()=>{
 const url=voicePreviewUrl('https://files.example/narration.mp3?v=2',67);
 expect(url).toContain('short_video_id=67');expect(url).toContain('source='+encodeURIComponent('https://files.example/narration.mp3?v=2'));
 expect(voicePreviewUrl('blob:local-audio',67)).toBe('blob:local-audio');
});

test.each([false,true])('missing voice stays red when muted=%s and generates audio without seeking',muted=>{
 const generate=jest.fn(),seek=jest.fn(),toggle=jest.fn();
 const view=render(<div onClick={seek}><TimelineVoiceClipView mix={{muted,volume:1}} duration={3} missing beatId="beat_2" onGenerate={generate} onVolume={()=>{}} onToggle={toggle}/></div>);
 expect(screen.getByLabelText('Voice beat_2: chưa có audio')).toHaveStyle('background-color: #b32632');
 fireEvent.click(screen.getByRole('button',{name:'Tạo audio beat_2'}));expect(generate).toHaveBeenCalledTimes(1);expect(seek).not.toHaveBeenCalled();
 view.rerender(<TimelineVoiceClipView mix={{muted,volume:1}} duration={3} missing beatId="beat_2" generating generationBusy onGenerate={generate} onVolume={()=>{}} onToggle={toggle}/>);
 expect(screen.getByRole('button',{name:'Tạo audio beat_2'})).toBeDisabled();expect(screen.getByText('Đang tạo…')).toBeInTheDocument();
 view.rerender(<TimelineVoiceClipView mix={{muted,volume:1}} duration={3} beatId="beat_2" onGenerate={generate} onVolume={()=>{}} onToggle={toggle}/>);
 expect(screen.queryByRole('button',{name:'Tạo audio beat_2'})).toBeNull();
});
