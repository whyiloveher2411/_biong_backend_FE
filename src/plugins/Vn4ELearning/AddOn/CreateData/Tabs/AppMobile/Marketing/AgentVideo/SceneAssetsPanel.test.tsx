import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {ajax} from 'hook/useApi';
import SceneAssetsPanel from './SceneAssetsPanel';
import {writePromptTextToClipboard} from 'helpers/marketingShortVideoAgentPrompt';
jest.mock('helpers/marketingShortVideoAgentPrompt',()=>({writePromptTextToClipboard:jest.fn()}));

jest.mock('../Model3dPreview',()=>()=>null);
jest.mock('../ShortVideoModel3dManageDrawer',()=>()=>null);
jest.mock('components/molecules/DrawerCustom',()=>({open,children,title}: ANY)=>open?<div role="dialog" aria-label={title}>{children}</div>:null);
jest.mock('hook/useApi', () => ({ajax: jest.fn()}));
const request = ajax as jest.Mock;
const registry = {
    schema_version: 'threejs_scene_assets_v1',
    assets: {
        wife: {id: 'wife', kind: 'character', name: 'Người vợ', spec: 'Áo xanh', spec_hash: 'wife-spec', has_html: true, ready: true},
        dinner: {id: 'dinner', kind: 'environment', name: 'Phòng ăn', spec: 'Bàn xanh, bốn món', spec_hash: 'set-spec', has_html: true, ready: true},
    },
    beats: {
        beat_1: {id: 'beat_1', environment_id: 'dinner', character_ids: [], continuity: 'Cận bàn', status: 'stale'},
        beat_2: {id: 'beat_2', environment_id: 'dinner', character_ids: ['wife'], continuity: 'Cùng bàn', status: 'missing'},
    },
};
beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue({ok: true, text: async () => 'window.__SV_THREE_VERSION="0.186.1";window.THREE={REVISION:"186"};'});
    request.mockReset();
    request.mockImplementation(({data}) => Promise.resolve(data.operation === 'preview'
        ? {success: true, asset: {...registry.assets[data.asset_id as 'wife' | 'dinner'], html: '<!doctype html><html><head><script src="http://localhost:8000/three.min.js?v=0.186.1"></script></head><body>AI layout<script id="sv-asset-module">window.SVAssetFactory=function(){/* canonical wife */};</script></body></html>'}}
        : {success: true, registry}));
});

test('shows one row per character/set and lazily loads sandboxed HTML preview', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={42}/>);
    await screen.findAllByText('Phòng ăn');
    expect(screen.getAllByRole('button', {name: 'DeepSeek'})).toHaveLength(2);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 42, operation: 'get'}}));
    expect(request.mock.calls.some(([call]) => call.data.operation === 'preview')).toBe(false);
    fireEvent.click(screen.getByRole('button',{name:'Xem preview Người vợ'}));
    const iframe = await screen.findByTitle('Preview Người vợ');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('canonical wife');
    expect(iframe.getAttribute('srcdoc')).toContain('data-sv-three-version="0.186.1"');
    expect(iframe.getAttribute('srcdoc')).not.toContain('http://localhost:8000');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 42, operation: 'preview', asset_id: 'wife'}}));
    view.unmount();
});

test('profile edit uses thumbnail corner and removed HTML utility controls stay absent',async()=>{
 const view=render(<SceneAssetsPanel shortVideoId={42}/>);await screen.findAllByText('Người vợ');
 expect(screen.queryByRole('button',{name:'Cập nhật HTML'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Kiểm tra / tự sửa'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Xem HTML'})).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:'Sửa hồ sơ Người vợ'}));
 expect(await screen.findByRole('dialog')).toBeTruthy();
 fireEvent.change(screen.getByLabelText('Tên hiển thị'),{target:{value:'Tên mới'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu hồ sơ'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({operation:'manifest',text:expect.stringContaining('Tên mới')})})));
 view.unmount();
});

test('a rejected manifest keeps the editor open and preserves the existing asset rows', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={42}/>);
    await screen.findAllByText('Phòng ăn');
    fireEvent.click(screen.getByRole('button', {name: 'Nhập / sửa danh sách JSON'}));
    fireEvent.change(screen.getByLabelText('JSON hồ sơ'), {target: {value: '{"bad":true}'}});
    request.mockImplementation(({data}) => Promise.resolve(data.operation === 'manifest'
        ? {success: false, message: 'Thiếu beat mapping'} : {success: true, registry}));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Lưu danh sách'}));
    await screen.findByText('Thiếu beat mapping');
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getAllByText('Phòng ăn').length).toBeGreaterThan(0);
    view.unmount();
});

test('character and environment sections have distinct controls and row identities', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    const cast = screen.getByRole('region', {name: 'Hồ sơ nhân vật'});
    const sets = screen.getByRole('region', {name: 'Hồ sơ bối cảnh'});
    expect(within(cast).getByRole('button', {name: 'Tạo nhân vật còn thiếu'})).toBeTruthy();
    expect(within(sets).getByRole('button', {name: 'Tạo bối cảnh còn thiếu'})).toBeTruthy();
    expect(within(cast).getByTestId('scene-asset-wife')).toBeTruthy();
    expect(within(sets).getByTestId('scene-asset-dinner')).toBeTruthy();
    view.unmount();
});

test('enqueue all defaults to missing builds and displays persisted queue status', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    request.mockImplementation(({data}) => Promise.resolve(data.operation === 'enqueue' ? {
        success: true, queued: 1, message: 'Đã đưa 1 hồ sơ vào hàng đợi DeepSeek.',
        registry: {...registry, assets: {...registry.assets, wife: {...registry.assets.wife,
            generation: {status: 'queued', job_id: 123}}}},
    } : {success: true, registry}));
    fireEvent.click(screen.getByRole('button', {name: 'Tạo HTML còn thiếu'}));
    await screen.findByText('Đang chờ queue');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 66, operation: 'enqueue', provider:'deepseek', kind: 'all'}}));
    const row = screen.getByTestId('scene-asset-wife');
    expect(within(row).getByRole('button', {name: 'Tạo'}).hasAttribute('disabled')).toBe(true);
    expect(within(row).getByRole('button', {name: 'Xem preview Người vợ'}).hasAttribute('disabled')).toBe(false);
    view.unmount();
});

test('rebuild all requires an explicit dialog action and sends force flag', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    fireEvent.click(screen.getByRole('button', {name: 'Tạo lại tất cả'}));
    expect(request.mock.calls.some(([call]) => call.data.operation === 'enqueue')).toBe(false);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Tạo lại tất cả'}));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 66, operation: 'enqueue', provider:'deepseek', kind: 'all', force: true}})));
    view.unmount();
});

test('Claude opens the character with the exact asset id',async()=>{
 const view=render(<SceneAssetsPanel shortVideoId={66}/>);await screen.findAllByText('Phòng ăn');
 fireEvent.click(within(screen.getByTestId('scene-asset-wife')).getByRole('button',{name:'Claude'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:66,operation:'open',asset_id:'wife',provider:'claude'}})));
 view.unmount();
});

test('repair progress is distinct from generation and keeps old preview available', async () => {
    request.mockResolvedValue({success: true, registry: {...registry, assets: {...registry.assets,
        wife: {...registry.assets.wife, generation: {status: 'processing', phase: 'repairing', repair_attempt: 2}},
    }}});
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findByText('Đang tự sửa (2/3)');
    const row=screen.getByTestId('scene-asset-wife');
    expect(within(row).getByRole('button', {name:'Xem preview Người vợ'}).hasAttribute('disabled')).toBe(false);
    expect(within(row).getByRole('button', {name:'DeepSeek'}).hasAttribute('disabled')).toBe(true);
    view.unmount();
});

test('Claude selector applies to missing, group and individual queue actions',async()=>{
 request.mockResolvedValue({success:true,registry:{...registry,assets:{wife:{...registry.assets.wife,ready:false},dinner:{...registry.assets.dinner,ready:false}}}});
 const view=render(<SceneAssetsPanel shortVideoId={66}/>);await screen.findAllByText('Phòng ăn');
 fireEvent.mouseDown(screen.getByLabelText('Tạo HTML bằng'));fireEvent.click(screen.getByRole('option',{name:'Claude'}));
 fireEvent.click(screen.getByRole('button',{name:'Tạo HTML còn thiếu'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:66,operation:'enqueue',kind:'all',provider:'claude'}})));
 await waitFor(()=>expect(screen.getByRole('button',{name:'Tạo nhân vật còn thiếu'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:'Tạo nhân vật còn thiếu'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:66,operation:'enqueue',kind:'character',provider:'claude'}})));
 const queue=within(screen.getByTestId('scene-asset-wife')).getByRole('button',{name:'Tạo'});
 await waitFor(()=>expect(queue).toBeEnabled());fireEvent.click(queue);
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:66,operation:'enqueue',asset_id:'wife',force:true,provider:'claude'}})));

 view.unmount();
});

test('shows an explicit loading state and blocks edits until the registry arrives', async () => {
    let resolveRequest: (value: unknown) => void = () => undefined;
    request.mockImplementation(() => new Promise(resolve => { resolveRequest = resolve; }));
    const view = render(<SceneAssetsPanel shortVideoId={77}/>);
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Đang tải danh sách nhân vật và bối cảnh');
    expect(screen.getByRole('button', {name: 'Nhập / sửa danh sách JSON'}).hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText('Chưa có nhân vật.')).toBeNull();
    await act(async () => {
        resolveRequest({success: true, registry});
    });
    await screen.findAllByText('Phòng ăn');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('button', {name: 'Nhập / sửa danh sách JSON'}).hasAttribute('disabled')).toBe(false);
    view.unmount();
});

test('beat mapping is collapsed on load and mounts only when expanded', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    expect(screen.queryByText('beat_1')).toBeNull();
    fireEvent.click(screen.getByRole('button', {name: 'Gán hồ sơ cho từng beat (2)'}));
    expect((await screen.findAllByText(/^beat_\d+$/)).length).toBe(2);
    expect(screen.getByText('Cần dựng lại')).toBeTruthy();
    expect(screen.getByText('Chưa có HTML beat')).toBeTruthy();
    view.unmount();
});

test('cancelled queue jobs show why they stopped and can be re-queued', async () => {
    const cancelled = {
        ...registry,
        assets: {
            ...registry.assets,
            wife: {
                ...registry.assets.wife,
                generation: {status: 'cancelled' as const, job_id: 123, error: 'Job queue đã bị xoá khỏi hàng đợi. Bấm "Chạy lại queue" để tạo job mới.'},
            },
        },
    };
    request.mockResolvedValue({success: true, registry: cancelled});
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    const row = screen.getByTestId('scene-asset-wife');
    expect(within(row).getByText('Job queue đã dừng')).toBeTruthy();
    expect(within(row).getByText('Job queue đã bị xoá khỏi hàng đợi. Bấm "Chạy lại queue" để tạo job mới.')).toBeTruthy();
    const retry = within(row).getByRole('button', {name: 'Tạo'});
    expect(retry.hasAttribute('disabled')).toBe(false);
    fireEvent.click(retry);
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {
        short_video_id: 66, operation: 'enqueue', provider:'deepseek', asset_id: 'wife', force: true,
    }})));
    view.unmount();
});

test('large beat mapping mounts in batches instead of blocking on every beat', async () => {
    const manyBeats: Record<string, unknown> = {};
    for (let i = 1; i <= 45; i += 1) {
        manyBeats['beat_' + i] = {id: 'beat_' + i, environment_id: 'dinner', character_ids: ['wife'], continuity: '', status: 'missing'};
    }
    request.mockResolvedValue({success: true, registry: {...registry, beats: manyBeats}});
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    fireEvent.click(screen.getByRole('button', {name: 'Gán hồ sơ cho từng beat (45)'}));
    expect(screen.getAllByText(/^beat_\d+$/).length).toBe(20);
    await waitFor(() => expect(screen.getAllByText(/^beat_\d+$/).length).toBe(45), {timeout: 3000});
    view.unmount();
});



test('adds a library character before a prompt manifest exists',async()=>{
    request.mockImplementation(({url,data})=>Promise.resolve(url.endsWith('/model-3d/list') ? {success:true,models:[{id:4,title:'Aster · Urban Explorer',slug:'aster-urban-explorer',kind:'person',character:{enabled:true}}]} : {success:true,registry:{assets:{},beats:{}}}));
    const view=render(<SceneAssetsPanel shortVideoId={42}/>);
    const add=await screen.findByRole('button',{name:'Thêm nhân vật thư viện'});
    await waitFor(()=>expect(add.hasAttribute('disabled')).toBe(false));fireEvent.click(add);
    fireEvent.click(await screen.findByText('aster-urban-explorer'));
    await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:42,operation:'add_model',model_id:4}})));
    view.unmount();
});

test('edits clothing per role without changing the shared model',async()=>{
    request.mockImplementation(()=>Promise.resolve({success:true,registry:{...registry,assets:{...registry.assets,wife:{...registry.assets.wife,module_hash:'role-v1',model_snapshot:{id:4,model_url:'https://example.com/aster.glb',character:{enabled:true,surface_mode:'skinned_v2'}}}}}}));
    const view=render(<SceneAssetsPanel shortVideoId={42}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Trang phục'}));
    expect(screen.queryByText('Tạo thêm bộ phận bằng DeepSeek')).toBeNull();
    fireEvent.mouseDown(screen.getByLabelText('Bộ phối trang phục'));fireEvent.click(screen.getByRole('option',{name:'Sport · Xanh / cam'}));
    fireEvent.click(screen.getByRole('button',{name:'Lưu trang phục cho vai này'}));
    await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({operation:'character_config',asset_id:'wife',expected_module_hash:'role-v1',character:expect.objectContaining({shirt:'#315b87',outfit:'sport'})})})));
    view.unmount();
});
test('provides an explicit return-to-HTML action for a library role',async()=>{
    request.mockImplementation(()=>Promise.resolve({success:true,registry:{...registry,assets:{...registry.assets,wife:{...registry.assets.wife,module_hash:'role-v1',has_html_backup:true,model_snapshot:{id:4,character:{enabled:true}}}}}}));
    const changed=jest.fn();document.addEventListener('vn4-model3d-beat-asset-changed',changed);
    const view=render(<SceneAssetsPanel shortVideoId={42}/>);
    fireEvent.click(await screen.findByRole('button',{name:'Dùng HTML'}));
    expect(screen.getByText(/Bản HTML trước khi chọn thư viện sẽ được khôi phục/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'Chuyển sang HTML'}));
    await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:42,operation:'unbind_model',asset_id:'wife',expected_module_hash:'role-v1'}})));
    await waitFor(()=>expect(changed).toHaveBeenCalledWith(expect.objectContaining({detail:{shortVideoId:42,beatId:''}})));
    document.removeEventListener('vn4-model3d-beat-asset-changed',changed);
    view.unmount();
});

test('Claude regenerate-all confirms selected provider before enqueue',async()=>{
 const view=render(<SceneAssetsPanel shortVideoId={66}/>);await screen.findAllByText('Phòng ăn');
 fireEvent.mouseDown(screen.getByLabelText('Tạo HTML bằng'));fireEvent.click(screen.getByRole('option',{name:'Claude'}));
 fireEvent.click(screen.getByRole('button',{name:'Tạo lại tất cả'}));
 expect(request.mock.calls.some(([call])=>call.data.operation==='enqueue')).toBe(false);
 fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Tạo lại tất cả'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:66,operation:'enqueue',kind:'all',force:true,provider:'claude'}})));
 view.unmount();
});

test('linked asset names reopen chat while unlinked names remain plain text',async()=>{
 request.mockResolvedValue({success:true,registry:{...registry,assets:{...registry.assets,wife:{...registry.assets.wife,chat_url:'https://claude.ai/chat/old-chat'}}}});
 const view=render(<SceneAssetsPanel shortVideoId={66}/>);await screen.findAllByText('Phòng ăn');
 const wife=within(screen.getByTestId('scene-asset-wife')),set=within(screen.getByTestId('scene-asset-dinner'));
 expect(wife.queryByRole('button',{name:'Mở lại chat'})).toBeNull();
 expect(set.queryByRole('button',{name:'Phòng ăn'})).toBeNull();
 fireEvent.click(set.getByText('Phòng ăn'));
 expect(request.mock.calls.some(([call])=>call.data.operation==='open')).toBe(false);
 fireEvent.click(wife.getByRole('button',{name:'Người vợ'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:66,operation:'open',asset_id:'wife',mode:'reopen',provider:'claude'}})));
 view.unmount();
});

test.each(['deepseek','claude'] as const)('copy prompt uses selected %s for character and environment without starting jobs',async(provider)=>{
 (writePromptTextToClipboard as jest.Mock).mockResolvedValue(true);
 request.mockImplementation(({data})=>Promise.resolve(data.operation==='prompt'?{success:true,prompt:`Complete prompt for ${data.asset_id} with video style`}:{success:true,registry}));
 const view=render(<SceneAssetsPanel shortVideoId={67}/>);await screen.findAllByText('Phòng ăn');
 if(provider==='claude'){fireEvent.mouseDown(screen.getByLabelText('Tạo HTML bằng'));fireEvent.click(screen.getByRole('option',{name:'Claude'}));}
 for (const id of ['wife','dinner']) {
   const button=within(screen.getByTestId('scene-asset-'+id)).getByRole('button',{name:'Copy prompt'});
   await waitFor(()=>expect(button).toBeEnabled());fireEvent.click(button);
   await waitFor(()=>expect(writePromptTextToClipboard).toHaveBeenCalledWith(`Complete prompt for ${id} with video style`));
   expect(request).toHaveBeenCalledWith(expect.objectContaining({data:{short_video_id:67,operation:'prompt',asset_id:id,provider}}));
 }
 expect(request.mock.calls.some(([call])=>['open','enqueue'].includes(call.data.operation))).toBe(false);
 view.unmount();
});

test('provider selection survives reopening and stays independent for each video',async()=>{
 let view=render(<SceneAssetsPanel shortVideoId={67}/>);await screen.findAllByText('Phòng ăn');
 fireEvent.mouseDown(screen.getByLabelText('Tạo HTML bằng'));fireEvent.click(screen.getByRole('option',{name:'Claude'}));
 expect(localStorage.getItem('scene-assets-provider:67')).toBe('claude');
 view.unmount();
 view=render(<SceneAssetsPanel shortVideoId={67}/>);await screen.findAllByText('Phòng ăn');
 expect(screen.getByLabelText('Tạo HTML bằng')).toHaveTextContent('Claude');
 view.rerender(<SceneAssetsPanel shortVideoId={68}/>);await screen.findAllByText('Phòng ăn');
 expect(screen.getByLabelText('Tạo HTML bằng')).toHaveTextContent('DeepSeek');
 view.rerender(<SceneAssetsPanel shortVideoId={67}/>);await screen.findAllByText('Phòng ăn');
 expect(screen.getByLabelText('Tạo HTML bằng')).toHaveTextContent('Claude');
 view.unmount();
});

const validHtml = (inside: string) => `<!doctype html><html><head><script src="http://localhost:8000/three.min.js?v=0.186.1"></script></head><body><script id="sv-asset-module">window.SVAssetFactory = function(THREE, kit) { /* ${inside} */ return {root:null}; };</script></body></html>`;

test('profile dialog loads the saved HTML and saves an edit without touching the spec',async()=>{
 const view=render(<SceneAssetsPanel shortVideoId={42}/>);
 await screen.findAllByText('Người vợ');
 fireEvent.click(screen.getByRole('button',{name:'Sửa hồ sơ Người vợ'}));
 const field=await screen.findByLabelText('HTML hồ sơ');
 await waitFor(()=>expect((field as HTMLTextAreaElement).value).toContain('canonical wife'));
 fireEvent.change(field,{target:{value:validHtml('hand edited')}});
 await waitFor(()=>expect(screen.getByText(/Có thay đổi chưa lưu/)).toBeTruthy());
 fireEvent.click(screen.getByRole('button',{name:'Lưu hồ sơ'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({
   short_video_id:42,operation:'html',asset_id:'wife',spec_hash:'wife-spec',text:validHtml('hand edited'),
 })})));
 expect(request.mock.calls.some(([call])=>call.data.operation==='manifest')).toBe(false);
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 view.unmount();
});

test('changing spec and HTML writes the manifest first and sends the new spec hash with the HTML',async()=>{
 const previewAsset={...registry.assets.wife,html:validHtml('loaded')};
 request.mockImplementation(({data})=>{
  if(data.operation==='preview')return Promise.resolve({success:true,asset:previewAsset});
  if(data.operation==='manifest')return Promise.resolve({success:true,registry:{...registry,revision:'rev-2',assets:{...registry.assets,wife:{...registry.assets.wife,spec:'Đầm đỏ',spec_hash:'wife-spec-2'}}}});
  return Promise.resolve({success:true,registry});
 });
 const view=render(<SceneAssetsPanel shortVideoId={42}/>);
 await screen.findAllByText('Người vợ');
 fireEvent.click(screen.getByRole('button',{name:'Sửa hồ sơ Người vợ'}));
 const field=await screen.findByLabelText('HTML hồ sơ');
 await waitFor(()=>expect((field as HTMLTextAreaElement).value).toContain('loaded'));
 fireEvent.change(screen.getByLabelText('Đặc tả cố định'),{target:{value:'Đầm đỏ'}});
 fireEvent.change(field,{target:{value:validHtml('edited')}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu hồ sơ'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({operation:'html',asset_id:'wife',spec_hash:'wife-spec-2',text:validHtml('edited')})})));
 const operations=request.mock.calls.map(([call])=>call.data.operation);
 const manifestAt=operations.indexOf('manifest'),htmlAt=operations.lastIndexOf('html');
 expect(manifestAt).toBeGreaterThanOrEqual(0);
 expect(htmlAt).toBeGreaterThan(manifestAt);
 view.unmount();
});

test('structurally invalid HTML is blocked before it reaches the API',async()=>{
 const view=render(<SceneAssetsPanel shortVideoId={42}/>);
 await screen.findAllByText('Người vợ');
 fireEvent.click(screen.getByRole('button',{name:'Sửa hồ sơ Người vợ'}));
 const field=await screen.findByLabelText('HTML hồ sơ');
 await waitFor(()=>expect((field as HTMLTextAreaElement).value).toContain('canonical wife'));
 fireEvent.change(field,{target:{value:'<html><body>thiếu module</body></html>'}});
 expect(await screen.findByText('HTML cần bắt đầu bằng <!doctype html>.')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Lưu hồ sơ'}).hasAttribute('disabled')).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Lưu hồ sơ'}));
 expect(request.mock.calls.some(([call])=>['manifest','html'].includes(call.data.operation))).toBe(false);
 view.unmount();
});

test('library characters explain that HTML comes from the shared model',async()=>{
 request.mockResolvedValue({success:true,registry:{...registry,assets:{...registry.assets,wife:{...registry.assets.wife,module_hash:'role-v1',model_snapshot:{id:4,character:{enabled:true}}}}}});
 const view=render(<SceneAssetsPanel shortVideoId={42}/>);
 await screen.findAllByText('Người vợ');
 fireEvent.click(screen.getByRole('button',{name:'Sửa hồ sơ Người vợ'}));
 expect(await screen.findByText(/Nhân vật thư viện dùng HTML sinh tự động từ GLB/)).toBeTruthy();
 expect(screen.queryByLabelText('HTML hồ sơ')).toBeNull();
 expect(request.mock.calls.some(([call])=>call.data.operation==='preview')).toBe(false);
 view.unmount();
});

test('design button belongs only to characters and saves the selected HTML default for that role', async()=>{
 const config={template:'mai_v1',selections:{head:'mai_head_v1'},colors:{skin:'#E0A97C'}};
 request.mockImplementation(({data})=>Promise.resolve(data.operation==='design_catalog'?{success:true,designer:{config,catalog:[{id:'head',name:'Đầu & da',colors:['skin'],items:[{id:'mai_head_v1',name:'Đầu Mai',badge:'Default'}]}],template_html:'<!doctype html><html><head></head><body>__SV_DESIGN_CONFIG__</body></html>',expected_module_hash:'fresh-module',expected_spec_hash:'wife-spec',replacing:true}}:{success:true,registry}));
 const view=render(<SceneAssetsPanel shortVideoId={42}/>);
 await screen.findAllByText('Người vợ');
 expect(within(screen.getByTestId('scene-asset-dinner')).queryByRole('button',{name:'Thiết kế'})).toBeNull();
 fireEvent.click(within(screen.getByTestId('scene-asset-wife')).getByRole('button',{name:'Thiết kế'}));
 await screen.findByText('Đầu Mai');fireEvent.change(screen.getByLabelText('Màu da'),{target:{value:'#AD7351'}});
 fireEvent.click(screen.getByRole('button',{name:'Lưu nhân vật'}));
 await waitFor(()=>expect(request).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({short_video_id:42,operation:'character_design',asset_id:'wife',expected_module_hash:'fresh-module',expected_spec_hash:'wife-spec',design:expect.objectContaining({colors:{skin:'#ad7351'}})})})));
 await waitFor(()=>expect(screen.queryByRole('dialog',{name:/Thiết kế nhân vật/})).toBeNull());view.unmount();
});
