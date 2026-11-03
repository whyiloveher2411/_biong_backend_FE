/** Minimal Web Audio graph for component tests; each test gets a fresh context. */
export function createTestAudioContext(){
 const gains:any[]=[],sources:any[]=[];
 const context={state:'running',currentTime:1,destination:{},
  createGain:jest.fn(()=>{const node={gain:{value:1},connect:jest.fn(),disconnect:jest.fn()};gains.push(node);return node;}),
  createMediaElementSource:jest.fn(()=>{const node={connect:jest.fn(),disconnect:jest.fn()};sources.push(node);return node;}),
  resume:jest.fn(async()=>{context.state='running';context.currentTime+=.04;}),close:jest.fn(async()=>{context.state='closed';}),
 };
 return {context:context as unknown as AudioContext,raw:context,gains,sources};
}
export function installTestAudioContext(){
 const original=window.AudioContext,created:Array<ReturnType<typeof createTestAudioContext>>=[];
 window.AudioContext=jest.fn(()=>{const value=createTestAudioContext();created.push(value);return value.context;}) as unknown as typeof AudioContext;
 return {created,restore:()=>{window.AudioContext=original;}};
}
