import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import CodeSoundEditor from './CodeSoundEditor';
import {saveCodeSound} from 'helpers/modelAudio';
jest.mock('helpers/modelAudio',()=>({saveCodeSound:jest.fn(),librarySoundUrl:(file:string)=>'/audio/'+file}));
test('saving a draft never records audio; record persists a reusable file',async()=>{
 const created=jest.fn(),select=jest.fn();
 (saveCodeSound as jest.Mock).mockResolvedValueOnce({success:true,sound:{id:'code_1',file:'',duration_sec:0}}).mockResolvedValueOnce({success:true,sound:{id:'code_1',file:'lib_fixture.wav',duration_sec:.3}});
 render(<CodeSoundEditor title="Keyword pop" category="emotion" license="Own code" onCreated={created} onSelect={select}/>);
 fireEvent.click(screen.getByText('Lưu code'));
 await screen.findByText('Đã lưu code; bấm thu âm để tạo file.');
 expect(saveCodeSound).toHaveBeenNthCalledWith(1,expect.objectContaining({title:'Keyword pop',duration:.3,code:expect.stringContaining('function buildSound')}),false);
 expect(screen.queryByText('Thêm vào timeline')).toBeNull();
 fireEvent.click(screen.getByText('Thu âm code và lưu WAV'));
 await screen.findByText('Đã lưu code và file âm thanh.');
 expect(saveCodeSound).toHaveBeenNthCalledWith(2,expect.anything(),true);
 fireEvent.click(screen.getByText('Thêm vào timeline'));
 expect(select).toHaveBeenCalledWith(expect.objectContaining({file:'lib_fixture.wav'}));
 fireEvent.change(screen.getByLabelText('Code âm thanh — function buildSound'),{target:{value:'function buildSound() {}'}});
 expect(screen.queryByText('Thêm vào timeline')).toBeNull();
});
test('copy prompt contains the exact offline contract and requested duration',async()=>{
 const writeText=jest.fn().mockResolvedValue(undefined);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
 render(<CodeSoundEditor title="Soft bell" category="foley" license="Own code" onCreated={()=>{}}/>);
 fireEvent.click(screen.getByText('Copy prompt tạo code'));
 await waitFor(()=>expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Soft bell')));
 expect(writeText).toHaveBeenCalledWith(expect.stringContaining('function buildSound({Tone, destination, duration, random})'));
});
