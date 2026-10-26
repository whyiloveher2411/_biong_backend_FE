import React from 'react';
import {render, screen} from '@testing-library/react';
import SceneAssetHtmlPreview from './SceneAssetHtmlPreview';
const originalFetch = global.fetch;
afterAll(() => { global.fetch = originalFetch; });
const html = '<html><script src="http://localhost:8000/three.min.js?v=0.186.1"></script><body>character</body></html>';

test('failed runtime download reports an error rather than an empty black iframe', async () => {
    global.fetch = jest.fn().mockResolvedValue({ok: false, status: 503});
    render(<SceneAssetHtmlPreview html={html} title="Character"/>);
    expect((await screen.findByRole('alert')).textContent).toContain('503');
    expect(screen.queryByTitle('Character')).toBeNull();
});

test('parent loads the pinned bundle and inlines it safely inside an opaque sandbox', async () => {
    const runtime = 'window.__SV_THREE_VERSION="0.186.1";window.THREE={REVISION:"186"};const marker="</script>";';
    global.fetch = jest.fn().mockResolvedValue({ok: true, text: async () => runtime});
    render(<SceneAssetHtmlPreview html={html} title="Character"/>);
    const frame = await screen.findByTitle('Character');
    expect(global.fetch).toHaveBeenCalledWith('/three.min.js?v=0.186.1');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
    expect(frame.getAttribute('srcdoc')).toContain('window.THREE={REVISION:"186"}');
    expect(frame.getAttribute('srcdoc')).toContain('<\\/script>');
    expect(frame.getAttribute('srcdoc')).not.toContain('src="http://localhost:8000');
});

test('asset HTML without a Three loader is preserved', async () => {
    global.fetch = jest.fn();
    render(<SceneAssetHtmlPreview html="<html>standalone</html>" title="Other asset"/>);
    expect((await screen.findByTitle('Other asset')).getAttribute('srcdoc')).toBe('<html>standalone</html>');
    expect(global.fetch).not.toHaveBeenCalled();
});

test('character inspector keeps canonical geometry and replaces arbitrary generated UI and scripts', async () => {
    const module = 'window.SVAssetFactory=function(){/* exact canonical geometry */};';
    const source = `<html><div>AI toolbar at bottom</div><script id="sv-asset-module">${module}</script><script>throw new Error("AI preview bug");</script></html>`;
    render(<SceneAssetHtmlPreview html={source} kind="character" title="Canonical character"/>);
    const frame = await screen.findByTitle('Canonical character');
    const document = frame.getAttribute('srcdoc') || '';
    expect(document).toContain(module);
    expect(document).not.toContain('AI toolbar at bottom');
    expect(document).not.toContain('AI preview bug');
    expect(document).toContain('id="emotion"');
    expect(document).toContain('id="pose"');
    expect(document).toContain('id="gait"');
    expect(document).toContain('id="reset"');
    expect(frame.getAttribute('sandbox')).toBe('allow-scripts');
});

test('missing character factory is reported instead of showing an uncontrolled preview', async () => {
    render(<SceneAssetHtmlPreview html="<html>Missing factory</html>" kind="character" title="Broken character"/>);
    expect((await screen.findByRole('alert')).textContent).toContain('thiếu sv-asset-module');
    expect(screen.queryByTitle('Broken character')).toBeNull();
});
