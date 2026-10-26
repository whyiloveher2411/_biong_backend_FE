import React from 'react';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {sceneAssetsRequest} from 'helpers/shortVideoSceneAssets';
import SceneAssetBeatSummary from './SceneAssetBeatSummary';

jest.mock('./BeatVoiceSummary', () => () => null);
jest.mock('helpers/shortVideoSceneAssets', () => ({sceneAssetsRequest: jest.fn(), sceneAssetMessage: (res: {message?: string}) => res.message || 'Không thực hiện được thao tác.'}));
const request = sceneAssetsRequest as jest.Mock;
const registry = {
    assets: {dinner: {id: 'dinner', kind: 'environment', name: 'Phòng ăn', ready: true, has_html: true}},
    beats: {beat_1: {id: 'beat_1', environment_id: 'dinner', character_ids: [], continuity: 'Giữ nguyên bốn món.'}},
};
beforeEach(() => {
    request.mockReset();
    global.fetch = jest.fn().mockResolvedValue({ok: true, text: async () => 'window.__SV_THREE_VERSION="0.186.1";window.THREE={REVISION:"186"};'});
});
test('shows saved mapping beside prose and lazily loads only the requested preview', async () => {
    request.mockResolvedValueOnce({success: true, registry});
    render(<SceneAssetBeatSummary shortVideoId={66} beatId="beat_1"/>);
    await screen.findByText('Phòng ăn');
    expect(screen.getByText('Không có nhân vật trong beat này.')).toBeTruthy();
    expect(screen.getByText('Giữ nguyên bốn món.')).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
    request.mockResolvedValueOnce({success: true, asset: {...registry.assets.dinner, html: '<html><script src="http://localhost:8000/three.min.js?v=0.186.1"></script>saved asset</html>'}});
    fireEvent.click(screen.getByRole('button', {name: 'Xem asset'}));
    const iframe = await screen.findByTitle('Asset dinner');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('saved asset');
    expect(iframe.getAttribute('srcdoc')).toContain('data-sv-three-version="0.186.1"');
    expect(iframe.getAttribute('srcdoc')).not.toContain('http://localhost:8000');
    expect(request).toHaveBeenLastCalledWith(66, 'preview', {asset_id: 'dinner'});
});
test('does not show a previous beat mapping after switching beats during a request', async () => {
    let resolveOld: (value: unknown) => void = () => undefined;
    request.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
    request.mockResolvedValueOnce({success: true, registry: {assets: {}, beats: {}}});
    const view = render(<SceneAssetBeatSummary shortVideoId={66} beatId="beat_1"/>);
    view.rerender(<SceneAssetBeatSummary shortVideoId={66} beatId="beat_2"/>);
    await screen.findByText(/Chưa có mapping asset/);
    await act(async () => resolveOld({success: true, registry}));
    expect(screen.queryByText('Phòng ăn')).toBeNull();
});
test('reports a failed request instead of claiming no assets are needed', async () => {
    request.mockRejectedValueOnce(new Error('network'));
    render(<SceneAssetBeatSummary shortVideoId={66} beatId="beat_1"/>);
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Không tải được asset'));
    expect(screen.queryByText('Beat này không dùng asset chung.')).toBeNull();
});

test('toolbar stacks the environment before characters and opens the selected asset', async () => {
    const wife = {id: 'wife', kind: 'character', name: 'Người vợ', ready: true, has_html: true};
    const child = {id: 'child', kind: 'character', name: 'Người con', ready: true, has_html: false};
    request.mockResolvedValueOnce({success: true, registry: {
        assets: {wife, child, ...registry.assets},
        beats: {beat_1: {...registry.beats.beat_1, character_ids: ['wife', 'child']}},
    }});
    render(<SceneAssetBeatSummary shortVideoId={66} beatId="beat_1" variant="toolbar"/>);
    await screen.findByRole('button', {name: 'Mở bối cảnh: Phòng ăn'});
    expect(screen.getAllByRole('button').map(button => button.getAttribute('aria-label'))).toEqual([
        'Mở bối cảnh: Phòng ăn', 'Mở nhân vật: Người vợ', 'Mở nhân vật: Người con',
    ]);
    expect(screen.getByRole('button', {name: 'Mở nhân vật: Người con'}).hasAttribute('disabled')).toBe(true);
    request.mockResolvedValueOnce({success: true, asset: {...wife, html: '<html><script id="sv-asset-module">window.SVAssetFactory=function(){/* wife preview */};</script></html>'}});
    fireEvent.click(screen.getByRole('button', {name: 'Mở nhân vật: Người vợ'}));
    const iframe = await screen.findByTitle('Asset wife');
    expect(iframe.getAttribute('srcdoc')).toContain('wife preview');
    expect(request).toHaveBeenLastCalledWith(66, 'preview', {asset_id: 'wife'});
});

test('shows outdated frame handoff warning from the workflow', async () => {
    request.mockResolvedValueOnce({success: true, registry: {...registry, beats: {beat_1: {...registry.beats.beat_1, action: 'test', continuity_error: 'Beat trước đã thay đổi; hãy tạo lại beat_1 để khớp frame.'}}}});
    render(<SceneAssetBeatSummary shortVideoId={66} beatId="beat_1"/>);
    expect(await screen.findByText(/Beat trước đã thay đổi/)).toBeTruthy();
});
