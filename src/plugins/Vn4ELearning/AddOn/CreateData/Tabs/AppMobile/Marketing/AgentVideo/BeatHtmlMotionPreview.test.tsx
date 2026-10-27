import React from 'react';
import {render,fireEvent} from '@testing-library/react';
import BeatHtmlMotionPreview, {detectAuthoredSize} from './BeatHtmlMotionPreview';
import {localizeImportHtmlExternalScripts} from './agentVideoCustomHtmlPreview';

test('all preview paths use the exact pinned renderer used by export', () => {
    for (const url of [
        'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
        'https://unpkg.com/three@0.147.0/build/three.js',
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r147/three.min.js',
        'https://example.com/three.min.js?version=147',
    ]) {
        const html = `<script src="${url}"></script>`;
        expect(localizeImportHtmlExternalScripts(html)).toBe('<script src="/three.min.js?v=0.186.1"></script>');
    }
});

test('unversioned imports use the same r186 runtime', () => {
    expect(localizeImportHtmlExternalScripts('<script src="https://example.com/three.min.js"></script>'))
        .toBe('<script src="/three.min.js?v=0.186.1"></script>');
});

test('fixed renderer dimensions fit a small preview rather than crop its canvas', () => {
    expect(detectAuthoredSize('renderer.setSize(1920,1080);')).toEqual({w:1920,h:1080});
    expect(detectAuthoredSize('renderer.setSize(window.innerWidth, window.innerHeight);')).toBeNull();
    expect(detectAuthoredSize('<html data-width="1080" data-height="1920">renderer.setSize(1920,1080)'))
        .toEqual({w:1080,h:1920});
});

test('loading an iframe while playing restores model audio and pause disables it', () => {
    const previous=global.ResizeObserver;
    global.ResizeObserver=class {observe(){ /* Test observer. */ } unobserve(){ /* Test observer. */ } disconnect(){ /* Test observer. */ }} as unknown as typeof ResizeObserver;
    const props={html:'<html data-duration="5"><body>Scene</body></html>',timeSec:1,durationSec:5,beatId:'beat_1'};
    const view=render(<BeatHtmlMotionPreview {...props} playing/>);
    const iframe=view.getByTitle('HTML motion beat') as HTMLIFrameElement;
    const dispatch=jest.spyOn(iframe.contentWindow as Window,'dispatchEvent');
    dispatch.mockClear();fireEvent.load(iframe);
    expect(dispatch.mock.calls.some(([event])=>event.type==='hf-model-audio-playback'&&(event as CustomEvent).detail.playing===true)).toBe(true);
    dispatch.mockClear();view.rerender(<BeatHtmlMotionPreview {...props} playing={false}/>);
    expect(dispatch.mock.calls.some(([event])=>event.type==='hf-model-audio-playback'&&(event as CustomEvent).detail.playing===false)).toBe(true);
    view.unmount();global.ResizeObserver=previous;
});
