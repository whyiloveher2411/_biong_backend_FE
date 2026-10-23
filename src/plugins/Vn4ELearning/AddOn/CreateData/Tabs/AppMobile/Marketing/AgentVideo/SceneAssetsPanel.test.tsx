import React from 'react';
import {act, fireEvent, render, screen, waitFor, within} from '@testing-library/react';
import {ajax} from 'hook/useApi';
import SceneAssetsPanel from './SceneAssetsPanel';

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
    request.mockReset();
    request.mockImplementation(({data}) => Promise.resolve(data.operation === 'preview'
        ? {success: true, asset: {...registry.assets[data.asset_id as 'wife' | 'dinner'], html: '<!doctype html><html><body>Asset preview</body></html>'}}
        : {success: true, registry}));
});

test('shows one row per character/set and lazily loads sandboxed HTML preview', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={42}/>);
    await screen.findAllByText('Phòng ăn');
    expect(screen.getAllByRole('button', {name: 'Mở DeepSeek'})).toHaveLength(2);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 42, operation: 'get'}}));
    expect(request.mock.calls.some(([call]) => call.data.operation === 'preview')).toBe(false);
    fireEvent.click(screen.getAllByRole('button', {name: 'Xem HTML'})[0]);
    const iframe = await screen.findByTitle('Preview Người vợ');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('srcdoc')).toContain('Asset preview');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 42, operation: 'preview', asset_id: 'wife'}}));
    view.unmount();
});

test('manual HTML save carries the spec revision that was opened, not the polled replacement', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={42}/>);
    await screen.findAllByText('Người vợ');
    fireEvent.click(screen.getAllByRole('button', {name: 'Cập nhật HTML'})[0]);
    const editor = await screen.findByLabelText('HTML hồ sơ');
    fireEvent.change(editor, {target: {value: '<!doctype html><html>new factory</html>'}});
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Lưu HTML'}));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {
        short_video_id: 42, operation: 'html', asset_id: 'wife', spec_hash: 'wife-spec', text: '<!doctype html><html>new factory</html>',
    }})));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
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
    fireEvent.click(screen.getByRole('button', {name: 'Tạo HTML còn thiếu · tất cả'}));
    await screen.findByText('Đang chờ queue');
    expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 66, operation: 'enqueue', kind: 'all'}}));
    const row = screen.getByTestId('scene-asset-wife');
    expect(within(row).getByRole('button', {name: 'Tạo bằng queue'}).hasAttribute('disabled')).toBe(true);
    expect(within(row).getByRole('button', {name: 'Xem HTML'}).hasAttribute('disabled')).toBe(false);
    view.unmount();
});

test('rebuild all requires an explicit dialog action and sends force flag', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    fireEvent.click(screen.getByRole('button', {name: 'Tạo lại tất cả HTML'}));
    expect(request.mock.calls.some(([call]) => call.data.operation === 'enqueue')).toBe(false);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', {name: 'Tạo lại tất cả'}));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 66, operation: 'enqueue', kind: 'all', force: true}})));
    view.unmount();
});

test('saved HTML can be audited/repaired without pasting it again', async () => {
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    fireEvent.click(within(screen.getByTestId('scene-asset-wife')).getByRole('button', {name: 'Kiểm tra / tự sửa'}));
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {short_video_id: 66, operation: 'repair', asset_id: 'wife'}})));
    view.unmount();
});

test('repair progress is distinct from generation and keeps old preview available', async () => {
    request.mockResolvedValue({success: true, registry: {...registry, assets: {...registry.assets,
        wife: {...registry.assets.wife, generation: {status: 'processing', phase: 'repairing', repair_attempt: 2}},
    }}});
    const view = render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findByText('Đang tự sửa (2/3)');
    const row=screen.getByTestId('scene-asset-wife');
    expect(within(row).getByRole('button', {name:'Xem HTML'}).hasAttribute('disabled')).toBe(false);
    expect(within(row).getByRole('button', {name:'Kiểm tra / tự sửa'}).hasAttribute('disabled')).toBe(true);
    view.unmount();
});

test('manual HTML save acknowledges a queued check rather than claiming immediate persistence', async () => {
    const view=render(<SceneAssetsPanel shortVideoId={66}/>);
    await screen.findAllByText('Phòng ăn');
    fireEvent.click(within(screen.getByTestId('scene-asset-wife')).getByRole('button',{name:'Cập nhật HTML'}));
    await screen.findByLabelText('HTML hồ sơ');
    request.mockResolvedValue({success:true, queued:1, registry, message:'Đã nhận HTML. Queue sẽ chạy preview và tự sửa.'});
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Lưu HTML'}));
    await screen.findByText('Đã nhận HTML. Queue sẽ chạy preview và tự sửa.');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
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
    const retry = within(row).getByRole('button', {name: 'Chạy lại queue'});
    expect(retry.hasAttribute('disabled')).toBe(false);
    fireEvent.click(retry);
    await waitFor(() => expect(request).toHaveBeenCalledWith(expect.objectContaining({data: {
        short_video_id: 66, operation: 'enqueue', asset_id: 'wife', force: true,
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


