import React from 'react';
import {render,screen,fireEvent,waitFor,act} from '@testing-library/react';
import useTimelineAudio from './useTimelineAudio';
import {timelineAudioApi,timelineAudioOverlap} from 'helpers/timelineAudio';
import type {TimelineAudioClip} from 'helpers/timelineAudio';
jest.mock('helpers/timelineAudio',()=>({...jest.requireActual('helpers/timelineAudio'),timelineAudioApi:jest.fn(),openVideoPixabayAudio:jest.fn()}));
jest.mock('helpers/modelAudio',()=>({librarySoundUrl:()=>'/sound.wav',loadLibrarySoundBlobUrl:jest.fn()}));
jest.mock('components/molecules/DrawerCustom',()=>({open,children}:{open:boolean;children:React.ReactNode})=>open?<div>{children}</div>:null);
const sound={video_id:67,id:'private',file:'video_67_sound.wav',title:'Âm thanh thử',duration_sec:12,category:'foley',license:'CC0',source:''};
const first:TimelineAudioClip={id:'a',sound_id:sound.id,sound,start_sec:2,duration_sec:2,offset_sec:0,volume:1,loop:false,speed:1,fade_in:0,fade_out:0,lane:0};
let editor:ReturnType<typeof useTimelineAudio>;
function Editor(){editor=useTimelineAudio(67,6,false,12,[{id:'beat_1',startSec:0,endSec:4},{id:'beat_2',startSec:4,endSec:8},{id:'beat_3',startSec:8,endSec:12}]);return <>{editor.dialogs}<button onClick={()=>editor.contextMenu('a',50,50)}>Menu A</button><button onClick={()=>editor.contextMenu('b',50,50)}>Menu B</button></>;}
const originalRevoke=URL.revokeObjectURL;
beforeAll(()=>{URL.revokeObjectURL=jest.fn();});
afterAll(()=>{URL.revokeObjectURL=originalRevoke;});
beforeEach(()=>{(timelineAudioApi as jest.Mock).mockResolvedValue({success:true,revision:'r1',clips:[first,{...first,id:'b',start_sec:5}]});});
async function load(){const view=render(<Editor/>);await waitFor(()=>expect(editor.clips).toHaveLength(2));return view;}
test('overlapping edits stay inside their original beat and pack into separate lanes',async()=>{
 (timelineAudioApi as jest.Mock).mockResolvedValue({success:true,revision:'r1',clips:[{...first,start_sec:1,duration_sec:1,event_beat_id:'beat_1'},{...first,id:'b',start_sec:2.5,duration_sec:.5,event_beat_id:'beat_1'}]});
 const view=await load();expect(editor.canResize('a',1,3)).toBe(true);expect(editor.canResize('a',1,5)).toBe(false);
 act(()=>{editor.commitEdit('a',1,3);});
 expect(editor.clips[0].duration_sec).toBe(2);expect(timelineAudioOverlap(editor.clips[0],editor.clips[1])).toBe(true);expect(editor.clips[0].lane).not.toBe(editor.clips[1].lane);
 act(()=>editor.commitEdit('b',1.5,2));expect(editor.clips[0].lane).not.toBe(editor.clips[1].lane);
 act(()=>editor.patch('a',{start_sec:8,duration_sec:2}));
 expect(editor.clips[0].event_beat_id).toBe('beat_1');expect(editor.clips[0].start_sec).toBe(2);expect(editor.clips[0].start_sec+editor.clips[0].duration_sec).toBe(4);
 view.unmount();
});
test('menu groups are separated, mute colors differ, and move goes to beat start rather than playhead',async()=>{
 const view=await load();fireEvent.click(screen.getByText('Menu B'));
 expect(screen.getAllByRole('menuitem').map(el=>el.textContent)).toEqual(['Thông tin','Đưa lên đầu beat','Tắt âm thanh','Xoá']);expect(screen.getAllByRole('separator')).toHaveLength(2);
 const mute=screen.getByRole('menuitem',{name:'Tắt âm thanh'});expect(getComputedStyle(mute).color).toBe('rgb(211, 47, 47)');fireEvent.click(mute);
 expect(editor.clips.find(c=>c.id==='b')?.muted).toBe(true);fireEvent.click(screen.getByText('Menu B'));
 const unmute=await screen.findByRole('menuitem',{name:'Bật âm thanh'});expect(getComputedStyle(unmute).color).toBe('rgb(46, 125, 50)');fireEvent.click(unmute);
 fireEvent.click(screen.getByText('Menu B'));fireEvent.click(await screen.findByRole('menuitem',{name:'Đưa lên đầu beat'}));expect(editor.clips.find(c=>c.id==='b')?.start_sec).toBe(4);view.unmount();
});
test('delete requires confirmation and cancel leaves the clip intact',async()=>{
 const view=await load();fireEvent.click(screen.getByText('Menu A'));fireEvent.click(screen.getByRole('menuitem',{name:'Xoá'}));
 await screen.findByRole('dialog',{name:'Xoá âm thanh?'});expect(editor.clips).toHaveLength(2);fireEvent.click(screen.getByRole('button',{name:'Huỷ'}));expect(editor.clips).toHaveLength(2);
 fireEvent.click(screen.getByText('Menu A'));fireEvent.click(await screen.findByRole('menuitem',{name:'Xoá'}));fireEvent.click(await screen.findByRole('button',{name:'Xoá âm thanh'}));
 expect(editor.clips.map(c=>c.id)).toEqual(['b']);view.unmount();
});
