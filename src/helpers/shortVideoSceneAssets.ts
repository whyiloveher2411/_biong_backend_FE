import type {ShortVideoModel3d} from './marketingShortVideoModel3dApi';
import { ajax } from 'hook/useApi';

export type SceneAsset = {
    id: string; kind: 'character' | 'environment'; name: string; spec: string;
    spec_hash: string; has_html?: boolean; html?: string; ready?: boolean; module_hash?: string;
    model_snapshot?: ShortVideoModel3d;
    has_html_backup?: boolean; html_backup_ready?: boolean;
    chat_url?: string;
    generation?: {status: 'queued' | 'processing' | 'completed' | 'failed' | 'superseded' | 'cancelled'; job_id?: number; error?: string; continue_clicks?: number; phase?: string; repair_attempt?: number; preview_checked?: boolean};
};
export type SceneAssetBeat = {
    id: string; environment_id: string; additional_environment_ids?: string[]; character_ids: string[]; continuity: string;
    status?: 'missing' | 'stale' | 'ready'; duration_sec?: number;
    continuity_from?: string; continuity_error?: string; transition?: 'continue' | 'cut'; title_card?: boolean;
    scene_id?: string; story_function?: string; start_state?: string; action?: string; end_state?: string; new_information?: string; camera?: string;
};
export type SceneAssetRegistry = {
    schema_version?: string; storyboard_version?: 'causal_3d_v1'; revision?: string; assets?: Record<string, SceneAsset>; beats?: Record<string, SceneAssetBeat>;
};
export type SceneAssetResponse = {
    success?: boolean; queued?: number; asset?: SceneAsset; registry?: SceneAssetRegistry; message?: string | {content?: string};
};
export function sceneAssetsRequest(shortVideoId: number, operation: string, data: Record<string, unknown> = {}): Promise<SceneAssetResponse> {
    return ajax({url: 'plugin/vn4-e-learning/app-mobile/marketing/short-video/scene-assets', method: 'POST', loading: false,
        data: {short_video_id: shortVideoId, operation, ...data}}) as Promise<SceneAssetResponse>;
}
export function sceneAssetsManifest(registry: SceneAssetRegistry): string {
    return JSON.stringify({schema_version: 'threejs_scene_assets_v1',
        ...(registry.storyboard_version ? {storyboard_version: registry.storyboard_version} : {}),
        assets: Object.values(registry.assets || {}).map(({id, kind, name, spec}) => ({id, kind, name, spec})),
        beats: Object.values(registry.beats || {}).map(({id, environment_id, additional_environment_ids, character_ids, continuity, scene_id, story_function, start_state, action, end_state, new_information, camera, transition, title_card}) => ({id, environment_id, additional_environment_ids, character_ids, continuity, scene_id, story_function, start_state, action, end_state, new_information, camera, transition, title_card})),
    }, null, 2);
}
export function sceneAssetMessage(res: SceneAssetResponse): string {
    return typeof res.message === 'string' ? res.message : res.message?.content || 'Không thực hiện được thao tác.';
}
