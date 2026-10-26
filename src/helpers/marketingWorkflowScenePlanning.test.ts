import {ajax} from 'hook/useApi';
import {writePromptTextToClipboard} from 'helpers/marketingShortVideoAgentPrompt';
import {sceneAssetsRequest,SceneAssetRegistry} from './shortVideoSceneAssets';
import {fetchWorkflowPromptText,copyWorkflowPromptToClipboard} from './marketingWorkflowPrompts';
jest.mock('hook/useApi',()=>({ajax:jest.fn()}));
jest.mock('helpers/marketingShortVideoAgentPrompt',()=>({writePromptTextToClipboard:jest.fn()}));
jest.mock('./shortVideoSceneAssets',()=>({...jest.requireActual<typeof import('./shortVideoSceneAssets')>('./shortVideoSceneAssets'),sceneAssetsRequest:jest.fn()}));
const request=sceneAssetsRequest as jest.Mock;
const context={'SHORT-VIDEO-ID':'67'};
const registry:SceneAssetRegistry={schema_version:'threejs_scene_assets_v1',assets:{
    tomas:{id:'tomas',kind:'character',name:'Tomas',spec:'Blue shirt, grip_R',spec_hash:'new-spec',ready:false,has_html:false},
    street:{id:'street',kind:'environment',name:'Market Street',spec:'Market with doorway anchor',spec_hash:'new-set',ready:false,has_html:true,html:'OLD HTML MUST NOT ENTER PLANNING'},
},beats:{beat_1:{id:'beat_1',environment_id:'street',character_ids:['tomas'],continuity:'Same shop',action:'Tomas opens the door'}}};
beforeEach(()=>{jest.clearAllMocks();(ajax as jest.Mock).mockResolvedValue({success:true,content:'Design actions for [SHORT-VIDEO-ID]'});(writePromptTextToClipboard as jest.Mock).mockResolvedValue(true);});
test('action design allows missing and stale HTML, includes only saved specs and mappings',async()=>{
 request.mockResolvedValue({success:true,registry});
 const result=await fetchWorkflowPromptText('video-html','create-beat-visual.md',context);
 expect(result.ok).toBe(true);expect(result.text).toContain('PLANNING STAGE:');expect(result.text).toContain('Blue shirt, grip_R');expect(result.text).toContain('Tomas opens the door');expect(result.text).not.toContain('OLD HTML MUST NOT ENTER PLANNING');expect(request).toHaveBeenCalledWith(67,'get');
});
test('copy action-design prompt works before factories are built',async()=>{
 request.mockResolvedValue({success:true,registry});
 expect((await copyWorkflowPromptToClipboard('video-html','create-beat-visual.md',context)).ok).toBe(true);
 expect(writePromptTextToClipboard).toHaveBeenCalledWith(expect.stringContaining('"tomas"'));
});
test('planning still requires the saved profile/mapping manifest',async()=>{
 request.mockResolvedValue({success:true,registry:{}});
 await expect(fetchWorkflowPromptText('video-html','create-beat-visual.md',context)).rejects.toThrow('Hoàn thành danh sách nhân vật/bối cảnh');
 expect(writePromptTextToClipboard).not.toHaveBeenCalled();
});
test('creating the profile itself does not require a previous manifest or HTML',async()=>{
 const result=await fetchWorkflowPromptText('video-html','define-character.md',context);
 expect(result.ok).toBe(true);expect(request).not.toHaveBeenCalled();
});
