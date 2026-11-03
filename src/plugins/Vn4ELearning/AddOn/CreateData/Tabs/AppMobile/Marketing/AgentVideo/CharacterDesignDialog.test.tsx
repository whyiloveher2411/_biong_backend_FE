import React from 'react';
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {sceneAssetsRequest} from 'helpers/shortVideoSceneAssets';
import CharacterDesignDialog from './CharacterDesignDialog';
jest.mock('helpers/shortVideoSceneAssets',()=>({sceneAssetsRequest:jest.fn(),sceneAssetMessage:(r: {message:string})=>r.message}));
jest.mock('./SceneAssetHtmlPreview',()=>({html,previewMessage}: {html:string;previewMessage:Record<string,unknown>})=><div data-testid="design-preview" data-html={html}>{JSON.stringify(previewMessage)}</div>);
const config={template:'mai_v1',selections:{head:'mai_head_v1',hair:'mai_hair_v1'},colors:{skin:'#E0A97C',hair:'#2B1B14'}};
const designer={config,catalog:[{id:'head',name:'Đầu & da',colors:['skin'],items:[{id:'mai_head_v1',name:'Đầu Mai',badge:'Default'}]},{id:'hair',name:'Tóc',colors:['hair'],items:[{id:'mai_hair_v1',name:'Tóc Mai',badge:'Default'}]}],template_html:'<html><head></head><body>__SV_DESIGN_CONFIG__</body></html>',expected_module_hash:'latest-module',expected_spec_hash:'latest-spec',replacing:true};
const asset={id:'wife',kind:'character' as const,name:'Mai',spec:'woman',spec_hash:'old-spec'};
beforeEach(()=>{(sceneAssetsRequest as jest.Mock).mockReset();(sceneAssetsRequest as jest.Mock).mockResolvedValue({success:true,designer});});
test('selects default parts and edits colors live without replacing the preview document; saves canonical hashes',async()=>{
 const onSave=jest.fn().mockResolvedValue(true),onClose=jest.fn();
 render(<CharacterDesignDialog shortVideoId={42} asset={asset} busy={false} onSave={onSave} onClose={onClose}/>);
 await screen.findByRole('tab',{name:'Tóc'});
 const html=screen.getByTestId('design-preview').getAttribute('data-html');
 fireEvent.click(screen.getByRole('tab',{name:'Tóc'}));
 expect(screen.getByRole('button',{name:/Tóc Mai/}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.change(screen.getByLabelText('Màu tóc'),{target:{value:'#ff0000'}});
 expect(screen.getByTestId('design-preview').textContent).toContain('#ff0000');
 expect(screen.getByTestId('design-preview').getAttribute('data-html')).toBe(html);
 fireEvent.click(screen.getByRole('button',{name:'Lưu nhân vật'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith({asset_id:'wife',expected_module_hash:'latest-module',expected_spec_hash:'latest-spec',design:expect.objectContaining({colors:expect.objectContaining({hair:'#ff0000'})})}));
 expect(onClose).toHaveBeenCalledTimes(1);
});
test('failed save preserves the draft; cancel never saves',async()=>{
 const onSave=jest.fn().mockResolvedValue(false),onClose=jest.fn();
 render(<CharacterDesignDialog shortVideoId={42} asset={asset} busy={false} onSave={onSave} onClose={onClose}/>);
 await screen.findByText('Đầu Mai');fireEvent.change(screen.getByLabelText('Màu da'),{target:{value:'#ff0000'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu nhân vật'}));
 await screen.findByText(/Chưa lưu được/);expect(onClose).not.toHaveBeenCalled();
 expect((screen.getByLabelText('Màu da') as HTMLInputElement).value).toBe('#ff0000');
 fireEvent.click(screen.getByRole('button',{name:'Hủy'}));expect(onClose).toHaveBeenCalledTimes(1);expect(onSave).toHaveBeenCalledTimes(1);
});
test('catalog failure can be retried without closing',async()=>{
 (sceneAssetsRequest as jest.Mock).mockResolvedValueOnce({success:false,message:'Mất kết nối'});
 render(<CharacterDesignDialog shortVideoId={42} asset={asset} busy={false} onSave={jest.fn()} onClose={jest.fn()}/>);
 await screen.findByText('Mất kết nối');fireEvent.click(screen.getByRole('button',{name:'Thử lại'}));await screen.findByText('Đầu Mai');
});

test('facial options select a named part with no sliders and save its recipe',async()=>{
 const onSave=jest.fn().mockResolvedValue(true);
 (sceneAssetsRequest as jest.Mock).mockResolvedValue({success:true,designer:{...designer,config:{...config,parameters:{headWidth:1}},catalog:[{...designer.catalog[0],items:[...designer.catalog[0].items,{id:'round',name:'Mặt tròn',badge:'HTML',parameters:{headWidth:1.15,headHeight:.9,jawWidth:1.15}}]}]}});
 render(<CharacterDesignDialog shortVideoId={42} asset={asset} busy={false} onSave={onSave} onClose={jest.fn()}/>);
 await screen.findByRole('button',{name:'Mặt tròn'});
 expect(screen.queryByRole('slider')).toBeNull();
 const initialHtml=screen.getByTestId('design-preview').getAttribute('data-html');
 fireEvent.click(screen.getByRole('button',{name:'Mặt tròn'}));
 expect(screen.getByRole('button',{name:'Mặt tròn'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByTestId('design-preview').getAttribute('data-html')).toBe(initialHtml);
 expect(screen.getByTestId('design-preview').textContent).toContain('headWidth\":1.15');
 fireEvent.click(screen.getByRole('button',{name:'Lưu nhân vật'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith(expect.objectContaining({design:expect.objectContaining({selections:expect.objectContaining({head:'round'}),parameters:{headWidth:1.15,headHeight:.9,jawWidth:1.15}})})));
});
