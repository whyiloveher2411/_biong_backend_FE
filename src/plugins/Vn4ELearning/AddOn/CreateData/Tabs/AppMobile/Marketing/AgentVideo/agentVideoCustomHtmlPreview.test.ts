import {localizeImportHtmlAssetScripts} from './agentVideoCustomHtmlPreview';
jest.mock('helpers/marketingShortVideoModel3dApi',()=>({buildModel3dRuntimeAssetUrl:()=>'/api/model-3d/runtime?v=11',buildModel3dAssetConfigUrl:()=>'/api/model-3d/asset-config?video=67&beat=beat_1'}));
const three='<script src="/three.min.js?v=0.186.1"></script>';
test('injects missing library scaffold before scene execution in saved shared beats',()=>{
    const html=`<html><head><script>function factory(){return Assets.person('sv_character_daniel');}</script></head><body>${three}<script>Assets.start(['sv_character_daniel'],init);</script></body></html>`;
    const out=localizeImportHtmlAssetScripts(html,{shortVideoId:67,beatId:'beat_1'});
    expect(out).toContain(`${three}<script src="/api/model-3d/asset-config?video=67&beat=beat_1"></script><script src="/api/model-3d/runtime?v=11"></script>`);
    expect(out.indexOf('src="/api/model-3d/runtime')).toBeLessThan(out.indexOf("Assets.start("));
    expect(localizeImportHtmlAssetScripts(out,{shortVideoId:67,beatId:'beat_1'})).toBe(out);
});
test('reorders and deduplicates existing scaffold after Three.js',()=>{
    const html='<script src="assets/dist/assets-config.js"></script>'+three+'<script src="assets/assets-runtime.js"></script><script>Assets.start([],init);</script>';
    const out=localizeImportHtmlAssetScripts(html,{shortVideoId:67,beatId:'beat_1'});
    expect(out.match(/src="\/api\/model-3d\/runtime/g)).toHaveLength(1);
    expect(out.indexOf('/three.min.js')).toBeLessThan(out.indexOf('/api/model-3d/asset-config'));
});
test('procedural beats do not load the library',()=>{expect(localizeImportHtmlAssetScripts(three+'<script>init();</script>')).toBe(three+'<script>init();</script>');});
