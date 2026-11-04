import {waitForAudioMetadata} from './audioMetadata';
function media(){return Object.assign(new EventTarget(),{duration:NaN,error:null}) as unknown as HTMLAudioElement;}
afterEach(()=>jest.useRealTimers());
test('metadata already available resolves without waiting for another event',async()=>{
 const audio=media();Object.defineProperty(audio,'duration',{value:1});
 await expect(waitForAudioMetadata(audio)).resolves.toBeUndefined();
});
test('cached media errors fail immediately instead of waiting forever',async()=>{
 const audio=media();Object.defineProperty(audio,'error',{value:{code:3}});
 await expect(waitForAudioMetadata(audio)).rejects.toThrow('media error 3');
});
test('durationchange can finish an initially unknown duration',async()=>{
 const audio=media();const done=waitForAudioMetadata(audio);
 Object.defineProperty(audio,'duration',{value:2});audio.dispatchEvent(new Event('durationchange'));
 await expect(done).resolves.toBeUndefined();
});
test('missing metadata times out and removes listeners',async()=>{
 jest.useFakeTimers();const audio=media(),remove=jest.spyOn(audio,'removeEventListener');
 const result=expect(waitForAudioMetadata(audio,100)).rejects.toThrow('Quá thời gian');
 jest.advanceTimersByTime(100);await result;expect(remove).toHaveBeenCalledTimes(4);
});
test('disposing the preview cancels metadata waits and clears their timers',async()=>{
 jest.useFakeTimers();const audio=media(),controller=new AbortController();
 const result=expect(waitForAudioMetadata(audio,10000,controller.signal)).rejects.toThrow('huỷ');
 controller.abort();await result;expect(jest.getTimerCount()).toBe(0);
});
test('whole-video readiness waits for decoded data even when duration is known',async()=>{
 const {waitForAudioData}=await import('./audioMetadata');
 const audio=media();Object.defineProperty(audio,'duration',{value:1});Object.defineProperty(audio,'readyState',{configurable:true,value:1});
 let ready=false;const waiting=waitForAudioData(audio).then(()=>{ready=true;});await Promise.resolve();expect(ready).toBe(false);
 Object.defineProperty(audio,'readyState',{value:2});audio.dispatchEvent(new Event('loadeddata'));await waiting;expect(ready).toBe(true);
});
