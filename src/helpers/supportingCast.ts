import { ajax } from 'hook/useApi';
import type {CharacterDesignCatalog, CharacterDesignConfig} from './shortVideoSceneAssets';
import {GUARD, STAGE, page} from './visualLibraryStage';

/** Một nhân vật phụ của thư viện: gọi trong beat bằng mã (SVExtras.create('phu_…', THREE, {})). */
export type SupportingCharacter = {
    code: string; name: string; group: string; group_name: string; note: string; gender: 'male' | 'female'; scale: number;
    design: CharacterDesignConfig; design_revision: string; compiled: boolean; revision: string;
    status: 'active' | 'archived'; source: 'seed' | 'agent' | 'cms'; updated_at?: string;
};
export type SupportingCastGroup = {id: string; name: string; hint: string; count: number};
export type SupportingCastResponse = {
    success?: boolean; message?: string | {content?: string};
    characters?: SupportingCharacter[]; groups?: SupportingCastGroup[]; character?: SupportingCharacter | null;
    designer?: CharacterDesignCatalog & {expected_revision?: string};
};

export function supportingCastRequest(operation: string, data: Record<string, unknown> = {}): Promise<SupportingCastResponse> {
    return ajax({url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/supporting-cast', method: 'POST', loading: false,
        data: {operation, ...data}}) as Promise<SupportingCastResponse>;
}
export function supportingCastMessage(res: SupportingCastResponse): string {
    return typeof res.message === 'string' ? res.message : res.message?.content || 'Không thực hiện được thao tác.';
}
export const SOURCE_LABEL: Record<SupportingCharacter['source'], string> = {seed: 'Bộ khởi tạo', agent: 'Agent thêm', cms: 'Thêm trong CMS'};

/** Mã nhóm gợi ý từ tên tiếng Việt ("Thợ may" → "tho_may"). */
export function supportingCastGroupId(name: string): string {
    const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);
    return /^[a-z]/.test(base) ? base : base ? `nhom_${base}`.slice(0, 41) : '';
}

/**
 * Factory chung của Character Designer lấy từ template (`<script id="sv-asset-module">`): nhận thiết kế qua
 * kit.characterDesign nên một bản dựng được mọi nhân vật phụ (beat dùng bản đã biên dịch riêng, cùng hình).
 */
export function designerFactorySource(templateHtml: string): string {
    const m = templateHtml.match(/<script id="sv-asset-module">([\s\S]*?)<\/script>/);
    if (!m) throw new Error('Template Character Designer thiếu sv-asset-module.');
    return m[1].replace('__SV_DESIGN_CONFIG__', '{"template":"mai_v1","selections":{},"colors":{},"parameters":{}}');
}

const BUILD = `
function svBuildExtra(T, design, scale, head) {
  var a = window.SVAssetFactory(T, {characterDesign: design});
  if (head === 'stick-head' && T.SVStickHead && T.SVStickHead.canApply(a)) T.SVStickHead.apply(a);
  if (scale && scale !== 1) a.root.scale.multiplyScalar(scale);
  return a;
}
function svDispose(o) { o.traverse(function (x) { if (x.geometry) x.geometry.dispose(); if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(function (q) { if (q.map) q.map.dispose(); q.dispose(); }); }); }`;

/** Worker ẩn: nhận {type:'sv-thumb-request', id, design, scale, head}, trả ảnh toàn thân 3/4. */
export function supportingCastWorkerDocument(runtime: string, factory: string): string {
    return page([GUARD, runtime, factory, STAGE, BUILD, `
(function () {
  var S = svStage(168, 220, false), T = S.T; S.R.domElement.style.visibility = 'hidden';
  window.addEventListener('message', function (e) {
    var m = e.data; if (e.source !== parent || !m || m.type !== 'sv-thumb-request' || !m.design) return;
    var url = '';
    try {
      var a = svBuildExtra(T, m.design, m.scale, m.head); a.update(1.2, {emotion: 'neutral', emotionTime: 1});
      a.root.rotation.y = 0.4; S.scene.add(a.root); S.view(a.root);
      // Full body filling the card (STAGE frames the ground disc too): own framing, rendered directly.
      var b = new T.Box3().setFromObject(a.root), c = b.getCenter(new T.Vector3()), h = b.max.y - b.min.y, cam = S.camera;
      var d = (h * 0.56) / Math.tan(T.MathUtils.degToRad(cam.fov / 2));
      cam.position.set(c.x + d * 0.08, c.y + h * 0.04, c.z + d); cam.lookAt(c.x, c.y, c.z); cam.near = d / 50; cam.far = d * 10; cam.updateProjectionMatrix();
      S.R.render(S.scene, cam);
      url = S.R.domElement.toDataURL('image/jpeg', 0.84); S.scene.remove(a.root); svDispose(a.root);
    } catch (err) { url = ''; }
    parent.postMessage({type: 'sv-library-thumbs', kind: 'cast', id: m.id, url: url}, '*');
  });
  parent.postMessage({type: 'sv-thumb-ready', kind: 'cast'}, '*');
})();`], '#E9EDF2');
}

/** Xem trước sống: kéo để xoay; hành động đứng / đi bộ / nói, cảm xúc, kiểu đầu (thiết kế hoặc Đầu tròn). */
export function supportingCastPreviewDocument(runtime: string, factory: string, c: Pick<SupportingCharacter, 'design' | 'scale'>,
    opts: {head: string; action: string; emotion: string}): string {
    return page([GUARD, runtime, factory, STAGE, BUILD, `
(function () {
  var S = svStage(window.innerWidth || 852, window.innerHeight || 420, true), T = S.T, o = ${JSON.stringify(opts)};
  var a = svBuildExtra(T, ${JSON.stringify(c.design).replace(/</g, '\\u003c')}, ${Number(c.scale) || 1}, o.head);
  a.update(0, {emotion: 'neutral'}); S.scene.add(a.root); S.view(a.root);
  var start = performance.now(), last = start;
  (function frame(now) {
    var t = (now - start) / 1000;
    a.update(t, {action: o.action === 'walk' ? 'walk' : null, actionTime: t, emotion: o.emotion, emotionTime: Math.min(t, 2), speaking: o.action === 'talk', speechTime: t});
    S.render((now - last) / 1000); last = now; requestAnimationFrame(frame);
  })(start);
})();`], '#E9EDF2');
}
