import React from 'react';
import {act,fireEvent,render,screen,waitFor} from '@testing-library/react';
import {SceneAsset,sceneAssetsRequest} from 'helpers/shortVideoSceneAssets';
import SceneAssetPreviewDialog from './SceneAssetPreviewDialog';
jest.mock('helpers/shortVideoSceneAssets',()=>({sceneAssetsRequest:jest.fn(),sceneAssetMessage:(r:{message?:string})=>r.message||'Thao tác thất bại'}));
jest.mock('./SceneAssetHtmlPreview',()=>({__esModule:true,default:({html}:{html:string})=><div>Rendered: {html}</div>}));
const request=sceneAssetsRequest as jest.Mock;
const child:SceneAsset={id:'child',kind:'character',name:'Người con',spec:'Áo đỏ',spec_hash:'abc',has_html:false};
afterEach(()=>jest.restoreAllMocks());
beforeEach(()=>request.mockReset());
test('missing HTML still opens the dialog and can enqueue, then shows the completed preview',async()=>{
 let poll:()=>void=()=>undefined;
 const timer=setInterval(()=>undefined,60000);
 jest.spyOn(window,'setInterval').mockImplementation(handler=>{if(typeof handler==='function')poll=()=>handler();return timer;});
 request.mockResolvedValueOnce({success:true,asset:{...child,html:''}});
 const update=jest.fn();render(<SceneAssetPreviewDialog shortVideoId={67} asset={child} onClose={jest.fn()} onRegistryChange={update}/>);
 expect(await screen.findByText(/Chưa có HTML nhân vật/)).toBeTruthy();
 request.mockResolvedValueOnce({success:true,registry:{assets:{child:{...child,generation:{status:'queued',job_id:53}}}}});
 fireEvent.click(screen.getByRole('button',{name:'Tạo HTML bằng queue'}));
 await screen.findByText(/Đang chờ queue tạo HTML.*Job 53/);
 expect(request).toHaveBeenCalledWith(67,'enqueue',{asset_id:'child',force:true});
 expect(screen.getByRole('button',{name:'Tạo HTML bằng queue'}).hasAttribute('disabled')).toBe(true);
 request.mockResolvedValueOnce({success:true,registry:{assets:{child:{...child,has_html:true,generation:{status:'completed',job_id:53}}}}})
     .mockResolvedValueOnce({success:true,asset:{...child,html:'NEW HTML'}});
 await act(async()=>poll());
 expect(await screen.findByText('Rendered: NEW HTML')).toBeTruthy();
 expect(update).toHaveBeenCalledTimes(2);
});
test('queue failure remains visible and retry is available',async()=>{
 request.mockResolvedValueOnce({success:true,asset:child});render(<SceneAssetPreviewDialog shortVideoId={67} asset={child} onClose={jest.fn()}/>);
 await screen.findByText(/Chưa có HTML nhân vật/);
 request.mockResolvedValueOnce({success:false,message:'Queue tạm dừng'});
 fireEvent.click(screen.getByRole('button',{name:'Tạo HTML bằng queue'}));
 expect(await screen.findByText('Queue tạm dừng')).toBeTruthy();
 expect(screen.getByRole('button',{name:'Tạo HTML bằng queue'}).hasAttribute('disabled')).toBe(false);
});
test('closing a missing-asset popup ignores its late preview response',async()=>{
 let resolve:(r:unknown)=>void=()=>undefined;request.mockImplementationOnce(()=>new Promise(r=>{resolve=r;}));
 const view=render(<SceneAssetPreviewDialog shortVideoId={67} asset={child} onClose={jest.fn()}/>);
 view.rerender(<SceneAssetPreviewDialog shortVideoId={67} asset={null} onClose={jest.fn()}/>);
 await act(async()=>resolve({success:true,asset:{...child,html:'LATE HTML'}}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());
 expect(screen.queryByText('Rendered: LATE HTML')).toBeNull();
});
