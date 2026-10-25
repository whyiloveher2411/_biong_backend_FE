import {sceneAssetsManifest, SceneAssetRegistry} from './shortVideoSceneAssets';
jest.mock('hook/useApi', () => ({ajax: jest.fn()}));
test('manifest roundtrip retains the complete acting plan but never copies built HTML', () => {
    const registry: SceneAssetRegistry = {schema_version: 'threejs_scene_assets_v1', storyboard_version: 'causal_3d_v1',
        assets: {room: {id: 'room', kind: 'environment', name: 'Room', spec: 'Movable book', spec_hash: 'hash', html: 'preview only'}},
        beats: {beat_1: {id: 'beat_1', environment_id: 'room', character_ids: [], continuity: 'Carry the open page forward.',
            scene_id: 'discovery', story_function: 'reveal', start_state: 'Book shut', action: 'Book opens', end_state: 'Book open', new_information: 'A clue is revealed', camera: 'Close insert', transition: 'cut', title_card: true}},
    };
    const serialized = JSON.parse(sceneAssetsManifest(registry));
    expect(serialized.storyboard_version).toBe('causal_3d_v1');
    expect(serialized.beats[0]).toEqual(registry.beats?.beat_1);
    expect(serialized.assets[0]).not.toHaveProperty('html');
});
test('legacy manifest is serialized without inventing a story plan', () => {
    const serialized = JSON.parse(sceneAssetsManifest({beats: {beat_1: {id: 'beat_1', environment_id: '', character_ids: [], continuity: ''}}}));
    expect(serialized).not.toHaveProperty('storyboard_version');
    expect(serialized.beats[0]).not.toHaveProperty('action');
});
