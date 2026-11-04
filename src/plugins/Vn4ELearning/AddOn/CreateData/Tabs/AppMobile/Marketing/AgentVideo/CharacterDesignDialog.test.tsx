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
 expect(JSON.parse(screen.getByTestId('design-preview').textContent||'{}').design.parameters.headWidth).toBe(1.15);
 fireEvent.click(screen.getByRole('button',{name:'Lưu nhân vật'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith(expect.objectContaining({design:expect.objectContaining({selections:expect.objectContaining({head:'round'}),parameters:{headWidth:1.15,headHeight:.9,jawWidth:1.15}})})));
});

test('horizontal touchpad gestures stay inside colors and options, including either boundary',async()=>{
 render(<CharacterDesignDialog shortVideoId={42} asset={asset} busy={false} onSave={jest.fn()} onClose={jest.fn()}/>);
 await screen.findByText('Đầu Mai');
 for(const target of [screen.getByRole('group',{name:'Bảng Màu da'}),screen.getByRole('tabpanel')]) {
  for(const deltaX of [-100,100]) {
   const event=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX});
   target.dispatchEvent(event);
   expect(event.defaultPrevented).toBe(true);
  }
  const vertical=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaY:80});
  target.dispatchEvent(vertical);expect(vertical.defaultPrevented).toBe(false);
  const zoom=new WheelEvent('wheel',{bubbles:true,cancelable:true,deltaX:40,ctrlKey:true});
  target.dispatchEvent(zoom);expect(zoom.defaultPrevented).toBe(false);
 }
});

test('gender controls remain in the preview while brow distance commits on release and persists across styles',async()=>{
 const onSave=jest.fn().mockResolvedValue(true);
 (sceneAssetsRequest as jest.Mock).mockResolvedValue({success:true,designer:{...designer,
  config:{...config,selections:{...config.selections,gender:'female',brows:'female_flat'},parameters:{browHeight:0}},
  genders:{female:{label:'Nữ',defaults:{brows:'female_flat'}},male:{label:'Nam',defaults:{brows:'male_wide'}}},
  catalog:[{id:'gender',name:'Giới tính',colors:[],items:[{id:'female',name:'Nữ',badge:'Default'},{id:'male',name:'Nam',badge:'HTML'}]},...designer.catalog,
   {id:'brows',name:'Chân mày',colors:[],items:[{id:'female_flat',name:'Mày ngang nữ',badge:'Default',genders:['female']},{id:'female_arch',name:'Mày cong nữ',badge:'HTML',genders:['female']},{id:'male_wide',name:'Mày rồng nam',badge:'HTML',genders:['male']}]}]}});
 render(<CharacterDesignDialog shortVideoId={42} asset={asset} busy={false} onSave={onSave} onClose={jest.fn()}/>);
 await screen.findByRole('button',{name:'Nam'});
 expect(screen.queryByRole('tab',{name:'Giới tính'})).toBeNull();
 expect(screen.getByRole('tab',{name:'Đầu & da'}).getAttribute('aria-selected')).toBe('true');
 fireEvent.click(screen.getByRole('tab',{name:'Chân mày'}));
 const html=screen.getByTestId('design-preview').getAttribute('data-html');
 expect(screen.getAllByText('Mặc định')).toHaveLength(5);
 expect(screen.getAllByRole('button',{name:/^Reset /})).toHaveLength(5);
 expect(screen.getByLabelText('Giá trị Góc chân mày').textContent).toBe('0°');
 const slider=screen.getByRole('slider',{name:'Khoảng cách chân mày – mắt'});
 const track=slider.closest('.MuiSlider-root') as HTMLElement;
 jest.spyOn(track,'getBoundingClientRect').mockReturnValue({left:0,right:120,top:0,bottom:20,width:120,height:20,x:0,y:0,toJSON:()=>({})});
 const previewBeforeDrag=screen.getByTestId('design-preview').textContent;
 fireEvent.mouseDown(track,{button:0,clientX:60,clientY:10});
 fireEvent.mouseMove(document,{buttons:1,clientX:75,clientY:10});
 fireEvent.mouseMove(document,{buttons:1,clientX:90,clientY:10});
 expect(slider.getAttribute('aria-valuenow')).toBe('0.045');
 expect(screen.getByLabelText('Giá trị Khoảng cách chân mày – mắt').textContent).toBe('0.045');
 expect(screen.getByTestId('design-preview').textContent).toBe(previewBeforeDrag);
 fireEvent.mouseUp(document,{button:0,clientX:90,clientY:10});
 expect(screen.getByTestId('design-preview').textContent).toContain('"browHeight":0.045');
 for(const [name,x,expected] of [['Độ dày chân mày',80,1.3],['Độ dài chân mày',120,2],['Khoảng cách hai chân mày',0,-.36],['Góc chân mày',120,180]] as const) {
  const input=screen.getByRole('slider',{name});
  const root=input.closest('.MuiSlider-root') as HTMLElement;
  jest.spyOn(root,'getBoundingClientRect').mockReturnValue({left:0,right:120,top:0,bottom:20,width:120,height:20,x:0,y:0,toJSON:()=>({})});
  const before=screen.getByTestId('design-preview').textContent;
  fireEvent.mouseDown(root,{button:0,clientX:x,clientY:10});
  expect(screen.getByTestId('design-preview').textContent).toBe(before);
  expect(Number(input.getAttribute('aria-valuenow'))).toBe(expected);
  fireEvent.mouseUp(document,{button:0,clientX:x,clientY:10});
 }
 fireEvent.click(screen.getByRole('button',{name:'Mày cong nữ'}));
 expect(screen.getByTestId('design-preview').textContent).toContain('"browHeight":0.045');
 fireEvent.click(screen.getByRole('button',{name:'Nam'}));
 expect(screen.queryByRole('button',{name:'Mày cong nữ'})).toBeNull();
 expect(screen.getByRole('button',{name:'Mày rồng nam'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.getByRole('tab',{name:'Chân mày'}).getAttribute('aria-selected')).toBe('true');
 expect(screen.getByTestId('design-preview').getAttribute('data-html')).toBe(html);
 expect(JSON.parse(screen.getByTestId('design-preview').textContent||'{}').design.parameters.browAngle).toBe(Math.PI);
 fireEvent.click(screen.getByRole('button',{name:'Reset Góc chân mày'}));
 expect(screen.getByLabelText('Giá trị Góc chân mày').textContent).toBe('0°');
 expect(JSON.parse(screen.getByTestId('design-preview').textContent||'{}').design.parameters.browLength).toBe(2);
 fireEvent.click(screen.getByRole('button',{name:'Lưu nhân vật'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith(expect.objectContaining({design:expect.objectContaining({parameters:{browHeight:.045,browThickness:1.3,browLength:2,browSpacing:-.36,browAngle:0},selections:expect.objectContaining({gender:'male',brows:'male_wide'})})})));
});

test('eye controls commit on release, reset independently and save with the selected eye profile',async()=>{
 const onSave=jest.fn().mockResolvedValue(true);
 (sceneAssetsRequest as jest.Mock).mockResolvedValue({success:true,designer:{...designer,config:{...config,parameters:{eyeSize:1,eyeSpacing:1}},catalog:[...designer.catalog,{id:'eyes',name:'Mắt',colors:[],items:[{id:'large',name:'Mắt lớn',badge:'HTML',parameters:{eyeSize:1.15,eyeSpacing:1.08}}]}]}});
 render(<CharacterDesignDialog shortVideoId={42} asset={asset} busy={false} onSave={onSave} onClose={jest.fn()}/>);
 fireEvent.click(await screen.findByRole('tab',{name:'Mắt'}));
 fireEvent.click(screen.getByRole('button',{name:'Mắt lớn'}));
 const html=screen.getByTestId('design-preview').getAttribute('data-html');
 expect(screen.getAllByText('Mặc định')).toHaveLength(2);
 for(const [name,x,expected] of [['Độ lớn của mắt',120,'2.00'],['Khoảng cách hai mắt',0,'0.40']] as const){
  const input=screen.getByRole('slider',{name});
  const track=input.closest('.MuiSlider-root') as HTMLElement;
  jest.spyOn(track,'getBoundingClientRect').mockReturnValue({left:0,right:120,top:0,bottom:20,width:120,height:20,x:0,y:0,toJSON:()=>({})});
  const before=screen.getByTestId('design-preview').textContent;
  fireEvent.mouseDown(track,{button:0,clientX:x,clientY:10});
  expect(screen.getByLabelText(`Giá trị ${name}`).textContent).toBe(expected);
  expect(screen.getByTestId('design-preview').textContent).toBe(before);
  fireEvent.mouseUp(document,{button:0,clientX:x,clientY:10});
 }
 fireEvent.click(screen.getByRole('button',{name:'Reset Độ lớn của mắt'}));
 expect(screen.getByLabelText('Giá trị Độ lớn của mắt').textContent).toBe('1.00');
 expect(screen.getByLabelText('Giá trị Khoảng cách hai mắt').textContent).toBe('0.40');
 expect(screen.getByTestId('design-preview').getAttribute('data-html')).toBe(html);
 fireEvent.click(screen.getByRole('button',{name:'Lưu nhân vật'}));
 await waitFor(()=>expect(onSave).toHaveBeenCalledWith(expect.objectContaining({design:expect.objectContaining({parameters:{eyeSize:1,eyeSpacing:.4},selections:expect.objectContaining({eyes:'large'})})})));
});
