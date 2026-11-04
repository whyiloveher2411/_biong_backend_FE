import {installTestAudioContext} from 'testUtils/audioContext';
import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import useTimelineAudio from './useTimelineAudio';
import {timelineAudioApi,openVideoPixabayAudio} from 'helpers/timelineAudio';
import {loadLibrarySoundBlobUrl,LibrarySound} from 'helpers/modelAudio';
const sound:LibrarySound={video_id:67,id:'gasp',file:'video_67_gasp.wav',title:'Gasp',duration_sec:2,category:'foley',license:'CC0',source:''};
jest.mock('helpers/timelineAudio',()=>({...jest.requireActual('helpers/timelineAudio'),timelineAudioApi:jest.fn(),openVideoPixabayAudio:jest.fn()}));
jest.mock('helpers/modelAudio',()=>({librarySoundUrl:()=>'/gasp.wav',loadLibrarySoundBlobUrl:jest.fn()}));
jest.mock('components/molecules/DrawerCustom',()=>({open,children}:{open:boolean;children:React.ReactNode})=>open?<div>{children}</div>:null);
const AudioOriginal=window.Audio,revokeOriginal=URL.revokeObjectURL;
beforeEach(()=>{
 window.Audio=jest.fn(()=>({duration:2,readyState:4,currentTime:0,play:jest.fn(async()=>{}),pause:jest.fn()})) as unknown as typeof Audio;
 URL.revokeObjectURL=jest.fn();
 (loadLibrarySoundBlobUrl as jest.Mock).mockResolvedValue('blob:gasp');
});
afterEach(()=>{window.Audio=AudioOriginal;URL.revokeObjectURL=revokeOriginal;});
function Editor(){const audio=useTimelineAudio(67,0,false,10);return <>{audio.controls}{audio.dialogs}<button onClick={()=>void audio.openSuggestion('suggestion_beat_1_gasp')}>Open slot</button><output data-testid="clips">{JSON.stringify(audio.clips)}</output></>;}
test('natural event opens Pixabay for exactly one video/beat/event rather than a shared catalog',async()=>{
 (timelineAudioApi as jest.Mock).mockResolvedValue({success:true,clips:[],revision:'r1',suggestions:{beat_1:{status:'completed',beat_start_sec:0,duration_sec:2,suggestions:[{id:'gasp',beat_id:'beat_1',start_sec:0,end_sec:1,title:'Gasp',pixabay_query:'human gasp',source:'embedded_event',volume:0}]}}});
 (openVideoPixabayAudio as jest.Mock).mockResolvedValue({success:true});
 const view=render(<Editor/>);await waitFor(()=>expect(timelineAudioApi).toHaveBeenCalled());
 fireEvent.click(screen.getByText('Open slot'));
 await waitFor(()=>expect(openVideoPixabayAudio).toHaveBeenCalledWith(67,'beat_1','gasp'));
 expect(JSON.parse(screen.getByTestId('clips').textContent||'[]')).toHaveLength(0);view.unmount();
});
test('manual reuse is restricted to video-owned sounds and new clips start at 100 percent',async()=>{
 (timelineAudioApi as jest.Mock).mockResolvedValue({success:true,revision:'r2',clips:[{id:'existing',sound_id:sound.id,sound,start_sec:0,duration_sec:1,offset_sec:0,volume:0,loop:false,speed:1,fade_in:0,fade_out:0}]});
 const view=render(<Editor/>);await waitFor(()=>expect(JSON.parse(screen.getByTestId('clips').textContent||'[]')).toHaveLength(1));
 fireEvent.click(screen.getByText('Âm thanh của video'));fireEvent.click(await screen.findByText('Gasp'));
 const clips=JSON.parse(screen.getByTestId('clips').textContent||'[]');expect(clips).toHaveLength(2);expect(clips[1].volume).toBe(1);expect(clips[1].sound.video_id).toBe(67);view.unmount();
});

let audioContextTest:ReturnType<typeof installTestAudioContext>;
beforeEach(()=>{audioContextTest=installTestAudioContext();});
afterEach(()=>audioContextTest.restore());
