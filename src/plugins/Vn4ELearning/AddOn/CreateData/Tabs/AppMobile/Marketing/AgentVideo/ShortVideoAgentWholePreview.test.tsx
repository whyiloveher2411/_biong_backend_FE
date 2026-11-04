import React from 'react';
import {registerTimelineAudioReadiness} from 'helpers/timelineAudioReadiness';
import { act, render, screen, fireEvent } from '@testing-library/react';
import WholePreview from './ShortVideoAgentWholePreview';
import type { BeatMap } from './agentVideoBeatMap';
jest.mock('helpers/timelineVoice', () => ({ useVoiceMedia: () => { }, voicePreviewUrl: (url: string) => url }));
jest.mock('./BeatHtmlMotionPreview', () => ({ __esModule: true, default: ({ beatId, onReady, timeSec }: {
        beatId: string;
        onReady: () => void;
        timeSec: number;
    }) => <button data-testid={beatId} onClick={onReady}>{timeSec}</button> }));
const sections = [0, 1, 2, 3].map(i => ({ id: `beat_${i + 1}`, startSec: i, endSec: i + 1 }));
const props = { videoId: 67, beatMap: { sections, totalVideoSec: 4 } as BeatMap, beatHtml: Object.fromEntries(sections.map(b => [b.id, { html: '<html>' + b.id + '</html>' }])), beatImage: {}, audioUrl: '', beatAudio: { items: sections.map((b, i) => ({ order: i + 1, status: 'ready', url: `/${b.id}.mp3` })) } };
let frames: Map<number, FrameRequestCallback>, nextId: number, now: number;
const step = async () => { now += 100; const batch = [...frames.values()]; frames.clear(); await act(async () => { for (const cb of batch)
    await cb(now); }); };
const command = (action: string, time: number) => act(() => { document.dispatchEvent(new CustomEvent('timeline-whole-command', { detail: { videoId: 67, action, time } })); });
beforeEach(() => {
    frames = new Map();
    nextId = 0;
    now = 0;
    jest.spyOn(performance, 'now').mockImplementation(() => now);
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { frames.set(++nextId, cb); return nextId; });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
    jest.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(4);
    jest.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) { Object.defineProperty(this, 'paused', { configurable: true, value: false }); return Promise.resolve(); });
    jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) { Object.defineProperty(this, 'paused', { configurable: true, value: true }); });
});
afterEach(() => jest.restoreAllMocks());
test('pre-mounts current HTML/audio and next two beats, then continues to next beat without reloading it', async () => {
    const view = render(<WholePreview {...props}/>);
    expect(screen.getByTestId('beat_3')).toBeInTheDocument();
    expect(screen.queryByTestId('beat_4')).toBeNull();
    expect(view.container.querySelectorAll('audio[preload="auto"]')).toHaveLength(3);
    const next = screen.getByTestId('beat_2');
    for (const b of sections.slice(0, 3))
        fireEvent.click(screen.getByTestId(b.id));
    command('play', 0);
    await step();
    const first = view.container.querySelector('audio')!;
    first.currentTime = 1;
    await step();
    await step();
    expect(screen.getByTestId('beat_2')).toBe(next);
    expect(screen.getByTestId('beat_4')).toBeInTheDocument();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
    command('pause', 1);
    const count = (HTMLMediaElement.prototype.play as jest.Mock).mock.calls.length;
    await step();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(count);
});
test('freezes the clock until HTML assets are ready and cancels pending playback on pause', async () => {
    render(<WholePreview {...props}/>);
    const updates: unknown[] = [];
    const receive = (e: Event) => updates.push((e as CustomEvent).detail);
    document.addEventListener('timeline-audio-playhead', receive);
    command('play', 0);
    await step();
    await step();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    command('pause', 0);
    fireEvent.click(screen.getByTestId('beat_1'));
    await step();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    command('play', 0);
    await step();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    document.removeEventListener('timeline-audio-playhead', receive);
});
test('a timeline seek updates whole preview and subsequent play resumes from that time', async () => {
    render(<WholePreview {...props}/>);
    command('play', 0);
    fireEvent.click(screen.getByTestId('beat_1'));
    await step();
    act(() => { document.dispatchEvent(new CustomEvent('timeline-main-transport', { detail: { videoId: 67, time: 2.5, playing: false } })); });
    expect(screen.getByTestId('beat_3')).toHaveTextContent('0.5');
    fireEvent.click(screen.getByTestId('beat_3'));
    command('play', 2.5);
    await step();
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
});

test('beats without HTML or narration still advance and unmount cleanly',async()=>{
    const view=render(<WholePreview {...props} beatHtml={{}} beatAudio={{items:[]}}/>);
    command('play',0);
    for(let i=0;i<45;i++)await step();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    view.unmount();
});

const startTick=()=>{now+=100;const batch=[...frames.values()];frames.clear();act(()=>{for(const cb of batch)void cb(now);});};
const settle=async()=>{await act(async()=>{for(let i=0;i<10;i++)await Promise.resolve();});};
test('whole video freezes voice and its clock until timeline SFX are ready; pause cancels the wait',async()=>{
 let resolve!:()=>void;const prepare=jest.fn(()=>new Promise<void>(r=>{resolve=r;}));
 const unregister=registerTimelineAudioReadiness(67,prepare);
 const view=render(<WholePreview {...props}/>);
 try{
  fireEvent.click(screen.getByTestId('beat_1'));command('play',0);startTick();await settle();
  expect(prepare).toHaveBeenCalledWith(0,1);expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  expect(screen.getByTestId('beat_1')).toHaveTextContent('0');
  command('pause',0);resolve();await settle();expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  prepare.mockResolvedValue(undefined);command('play',0);await step();expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
 }finally{view.unmount();unregister();}
});
test('a rejected voice play from the previous run cannot stop the new whole-video run',async()=>{
 let reject!:(error:unknown)=>void;
 (HTMLMediaElement.prototype.play as jest.Mock).mockImplementationOnce(function(this:HTMLMediaElement){Object.defineProperty(this,'paused',{configurable:true,value:false});return new Promise<void>((_,r)=>{reject=r;});});
 const view=render(<WholePreview {...props}/>);
 try{
  fireEvent.click(screen.getByTestId('beat_1'));command('play',0);startTick();await settle();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
  command('pause',0);command('play',0);await step();
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  reject(new DOMException('The play() request was interrupted by a call to pause().','AbortError'));await settle();
  expect(screen.queryByText(/Không phát được audio/)).toBeNull();
  expect(view.container.querySelector('audio')!.paused).toBe(false);
 }finally{view.unmount();}
});

test('whole-video start publishes the requested cue time before catching up to the voice clock',async()=>{
 (HTMLMediaElement.prototype.play as jest.Mock).mockImplementationOnce(function(this:HTMLMediaElement){this.currentTime+=.033;Object.defineProperty(this,'paused',{configurable:true,value:false});return Promise.resolve();});
 const updates:any[]=[];const receive=(e:Event)=>updates.push((e as CustomEvent).detail);
 document.addEventListener('timeline-audio-playhead',receive);const view=render(<WholePreview {...props}/>);
 try{
  fireEvent.click(screen.getByTestId('beat_1'));command('play',0);await step();
  expect(updates.filter(x=>x.soundPlaying).map(x=>x.time)).toEqual([0]);
  await step();expect(updates.filter(x=>x.soundPlaying).at(-1).time).toBeCloseTo(.033);
 }finally{view.unmount();document.removeEventListener('timeline-audio-playhead',receive);}
});
