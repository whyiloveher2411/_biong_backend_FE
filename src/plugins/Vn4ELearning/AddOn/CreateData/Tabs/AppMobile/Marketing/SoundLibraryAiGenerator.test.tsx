import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import SoundLibraryAiGenerator from './SoundLibraryAiGenerator';
import {generateLibrarySound,getSoundGeneration} from 'helpers/modelAudio';
jest.mock('helpers/modelAudio',()=>({generateLibrarySound:jest.fn(),getSoundGeneration:jest.fn(),librarySoundUrl:(file:string)=>'/audio/'+file}));
const id='1234567890abcdef1234567890abcdef';
const options={title:'Mở cửa',prompt:'A wooden door opens',duration:2,category:'foley',single_event:true};
const sound={id:'generated',title:'Mở cửa AI',file:'generated.wav',duration_sec:2,category:'foley',source:'https://huggingface.co/facebook/audiogen-medium',license:'CC-BY-NC-4.0',generation:{seed:123}};
beforeEach(()=>{localStorage.clear();jest.clearAllMocks();});
test('preset starts local generation and completed audio is ready without file upload',async()=>{
 (generateLibrarySound as jest.Mock).mockResolvedValue({success:true,job:{id,status:'queued',created_at:new Date().toISOString(),options}});
 (getSoundGeneration as jest.Mock).mockResolvedValue({success:true,job:{id,status:'complete',created_at:new Date().toISOString(),options,sound}});
 const created=jest.fn();const view=render(<SoundLibraryAiGenerator active onCreated={created}/>);
 fireEvent.click(screen.getByText('Tạo âm thanh bằng AI'));fireEvent.click(screen.getByRole('button',{name:'Mở cửa'}));fireEvent.click(screen.getByRole('button',{name:'Tạo âm thanh ngay'}));
 expect(await screen.findByText('Đã lưu: Mở cửa AI')).toBeInTheDocument();
 expect(generateLibrarySound).toHaveBeenCalledWith(expect.objectContaining({duration:2,category:'foley',single_event:true,prompt:expect.stringContaining('wooden door')}));
 expect(created).toHaveBeenCalledTimes(1);expect(localStorage.getItem('sound-library-ai-pending')).toBeNull();view.unmount();
});
test('reopening resumes the saved job and restores the description instead of creating another',async()=>{
 localStorage.setItem('sound-library-ai-pending',id);
 (getSoundGeneration as jest.Mock).mockResolvedValue({success:true,job:{id,status:'running',created_at:new Date().toISOString(),options}});
 const view=render(<SoundLibraryAiGenerator active onCreated={jest.fn()}/>);fireEvent.click(screen.getByText(/Tạo âm thanh bằng AI/));
 await waitFor(()=>expect(screen.getByLabelText('Mô tả âm thanh')).toHaveValue(options.prompt));
 expect(generateLibrarySound).not.toHaveBeenCalled();expect(screen.getByRole('button',{name:'Đang tạo âm thanh…'})).toBeDisabled();view.unmount();
});
