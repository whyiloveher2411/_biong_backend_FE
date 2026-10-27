import React from 'react';import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import ModelActionAudioEditor from './ModelActionAudioEditor';import {listLibrarySounds} from 'helpers/modelAudio';
jest.mock('components/molecules/DrawerCustom',()=>({open,children}:ANY)=>open?<div>{children}</div>:null);
jest.mock('helpers/modelAudio',()=>({listLibrarySounds:jest.fn(),librarySoundUrl:(file:string)=>'/audio/'+file,uploadLibrarySound:jest.fn()}));
const sound={id:'snd_step',title:'Bước chân mẫu',file:'step.ogg',duration_sec:.2,license:'CC0-1.0',source:'https://kenney.nl/assets/rpg-audio',category:'foley'};
beforeEach(()=>{(listLibrarySounds as jest.Mock).mockResolvedValue({success:true,sounds:[sound]});});
test('assigns one library sound to walking with phase defaults and immutable snapshot',async()=>{
 const change=jest.fn(),value={enabled:true};render(<ModelActionAudioEditor value={value} onChange={change}/>);
 fireEvent.click(screen.getByText(/Âm thanh theo hành động/));await waitFor(()=>expect(listLibrarySounds).toHaveBeenCalled());
 fireEvent.mouseDown(screen.getByLabelText('Âm thanh · Đi bộ'));fireEvent.click(await screen.findByRole('option',{name:'Bước chân mẫu'}));
 expect(change).toHaveBeenCalledWith(expect.objectContaining({audio:{enabled:true,bindings:[expect.objectContaining({action:'walk',sound_ids:['snd_step'],sounds:[sound],phases:[.1,.6]})]}}));expect(value).toEqual({enabled:true});
});
test('muting a model keeps its existing mappings for later reuse',()=>{
 const change=jest.fn(),audio={enabled:true,bindings:[{action:'walk',sound_ids:['snd_step'],sounds:[sound],phases:[.44,.98],volume:.3}]};
 render(<ModelActionAudioEditor value={{enabled:true,audio}} onChange={change}/>);fireEvent.click(screen.getByText(/Âm thanh theo hành động/));
 fireEvent.click(screen.getByLabelText('Tự phát âm thanh hành động'));expect(change.mock.calls[0][0].audio).toEqual({...audio,enabled:false});
});
