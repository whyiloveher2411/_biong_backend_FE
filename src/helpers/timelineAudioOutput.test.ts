import {TimelineAudioOutput} from './timelineAudioOutput';
import {createTestAudioContext} from 'testUtils/audioContext';
const media=()=>({volume:1,playbackRate:1}) as HTMLAudioElement;
test('replays use the same media-bound graph and always apply the requested 200%',()=>{
 const h=createTestAudioContext(),output=new TimelineAudioOutput(()=>h.context),a=media();
 for(let i=0;i<10;i++){output.apply(a,2);expect(a.volume).toBe(1);expect(h.gains[0].gain.value).toBe(2);}
 expect(h.raw.createMediaElementSource).toHaveBeenCalledTimes(1);expect(h.sources[0].connect).toHaveBeenCalledTimes(1);output.dispose();
});
test('different media elements never write gain into the wrong clip graph',()=>{
 const h=createTestAudioContext(),output=new TimelineAudioOutput(()=>h.context),old=media(),replacement=media();
 output.apply(old,2);output.apply(replacement,.2);output.apply(old,1.5);
 expect(h.gains[0].gain.value).toBe(1.5);expect(h.gains[1].gain.value).toBe(.2);
 output.release(old);output.apply(replacement,2);expect(h.gains[1].gain.value).toBe(2);output.dispose();
});
test('partial connection failure is retried without a second source or silent 100% fallback',()=>{
 const h=createTestAudioContext(),output=new TimelineAudioOutput(()=>h.context),a=media();
 const makeGain=h.raw.createGain.getMockImplementation()!;
 h.raw.createGain.mockImplementationOnce(()=>{const node=makeGain();node.connect.mockImplementationOnce(()=>{throw new Error('connect failed');});return node;});
 expect(()=>output.apply(a,2)).toThrow('connect failed');
 expect(h.gains[0].gain.value).toBe(0);
 output.apply(a,2);expect(h.gains[0].gain.value).toBe(2);expect(h.raw.createMediaElementSource).toHaveBeenCalledTimes(1);output.dispose();
});
test('missing Web Audio fails clearly instead of playing a quieter version',()=>{
 const output=new TimelineAudioOutput(()=>{throw new Error('No AudioContext');});
 expect(()=>output.apply(media(),2)).toThrow('No AudioContext');output.dispose();
});
test('device readiness must complete before audio playback can begin',async()=>{
 const h=createTestAudioContext();h.raw.state='suspended';let resume!:()=>void;
 h.raw.resume.mockImplementation(()=>new Promise<void>(resolve=>{resume=()=>{h.raw.state='running';h.raw.currentTime+=.04;resolve();};}));
 const output=new TimelineAudioOutput(()=>h.context);let ready=false;
 const done=output.ready().then(()=>{ready=true;});await Promise.resolve();expect(ready).toBe(false);
 resume();await done;expect(ready).toBe(true);output.dispose();
});
test('a running state with a frozen render clock does not count as a ready audio device',async()=>{
 jest.useFakeTimers();
 const h=createTestAudioContext();h.raw.currentTime=0;
 const output=new TimelineAudioOutput(()=>h.context);let ready=false;
 const waiting=output.ready().then(()=>{ready=true;});await Promise.resolve();expect(ready).toBe(false);
 h.raw.currentTime=.04;jest.advanceTimersByTime(4);await waiting;expect(ready).toBe(true);
 output.dispose();jest.useRealTimers();
});
