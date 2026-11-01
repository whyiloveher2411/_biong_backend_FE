import React from 'react';
import {fireEvent,render,screen} from '@testing-library/react';
import SoundLibraryDrawer from './SoundLibraryDrawer';
jest.mock('components/molecules/DrawerCustom',()=>({children}:React.PropsWithChildren<{}>)=><div>{children}</div>);
jest.mock('./SoundLibraryAiGenerator',()=>()=>null);
jest.mock('./CodeSoundEditor',()=>()=> <div>Code editor ready</div>);
jest.mock('helpers/modelAudio',()=>({listLibrarySounds:async()=>({success:true,sounds:[{id:'code_draft',title:'Draft pop',file:'',duration_sec:0,category:'emotion',license:'Own code',source:'Tone.js offline',source_type:'code',code:'function buildSound() {}'}]}),librarySoundUrl:(f:string)=>'/audio/'+f}));
test('code source is accessible and drafts cannot be added before recording',async()=>{
 render(<SoundLibraryDrawer open onClose={()=>{}} onSelect={()=>{}}/>);
 await screen.findByText('Draft pop');
 expect(screen.getByText('Code chưa thu âm')).toBeTruthy();
 expect((screen.getByRole('button',{name:'Thêm vào timeline'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Âm thanh bằng code'}));
 expect(screen.getByText('Code editor ready')).toBeTruthy();
 fireEvent.click(screen.getByText('Sửa code / thu âm'));
 expect((screen.getByLabelText('Tên âm thanh') as HTMLInputElement).value).toBe('Draft pop');
});
