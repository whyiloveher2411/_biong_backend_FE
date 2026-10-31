import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import WhiteboardRegionTimeline from './WhiteboardRegionTimeline';

test('video 67 beat 10 never publishes beat 11 time when an audio frame overshoots the boundary', async () => {
    let frame: FrameRequestCallback | undefined;
    const raf = jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1; });
    const cancel = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const play = jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) { this.dispatchEvent(new Event('pause')); });
    const changed = jest.fn();
    try {
        const { container } = render(<WhiteboardRegionTimeline regions={[]} beatDurationSec={1.51}
            beatStartSec={18.704} beatWords={[]} colorFor={() => '#fff'} onChangeRegion={() => {}}
            audioUrl="/video67.mp3" shortVideoId={67} beatId="beat_10" onPlayheadChange={changed} />);
        const audio = container.querySelector('audio')!;
        Object.defineProperty(audio, 'paused', { configurable: true, get: () => false });
        changed.mockClear();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Phát audio beat' })); });
        audio.currentTime = 20.25;
        act(() => { frame?.(1000); });
        const userUpdates = changed.mock.calls.filter(call => call[2] === 'user');
        expect(userUpdates.length).toBeGreaterThan(0);
        expect(userUpdates.every(([local]) => 18.704 + local < 20.214)).toBe(true);
        expect(userUpdates[userUpdates.length - 1][1]).toBe(false);
        expect(userUpdates[userUpdates.length - 1][0]).toBeCloseTo(1.46);
        // Playing again from a stopped/overshot media clock must restart this beat.
        changed.mockClear();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Phát audio beat' })); });
        expect(audio.currentTime).toBeCloseTo(18.704);
        expect(changed.mock.calls.filter(call => call[2] === 'user').every(([local]) => 18.704 + local < 20.214)).toBe(true);
    } finally { raf.mockRestore(); cancel.mockRestore(); play.mockRestore(); pause.mockRestore(); }
});
