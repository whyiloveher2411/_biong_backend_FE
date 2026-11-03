type Graph={source:MediaElementAudioSourceNode;gain:GainNode;connected:boolean};
/** Keep one gain graph per actual media element, never silently cap 200% to 100%. */
export class TimelineAudioOutput {
 private context:AudioContext|null=null;
 private graphs=new WeakMap<HTMLAudioElement,Graph>();
 private active=new Set<HTMLAudioElement>();
 private disposed=false;
 private warming:Promise<void>|null=null;
 constructor(private createContext:()=>AudioContext=()=>{
  const Ctx=window.AudioContext||(window as Window&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Ctx)throw new Error('Trình duyệt không hỗ trợ bộ khuếch đại âm thanh.');
  return new Ctx();
 }){}
 private getContext(){
  if(this.disposed)throw new Error('Bộ phát âm thanh đã đóng.');
  this.context??=this.createContext();
  if(this.context.state==='closed')throw new Error('AudioContext đã đóng; cần tải lại bộ phát.');
  return this.context;
 }
 attach(media:HTMLAudioElement){
  const context=this.getContext();let graph=this.graphs.get(media);
  if(!graph){
   const gain=context.createGain();gain.gain.value=0;
   graph={source:context.createMediaElementSource(media),gain,connected:false};
   // Retain the source even if connecting fails: a media element can have only one source.
   this.graphs.set(media,graph);
  }
  if(!graph.connected){
   try{graph.source.connect(graph.gain);graph.gain.connect(context.destination);graph.connected=true;this.active.add(media);}
   catch(error){graph.source.disconnect();graph.gain.disconnect();throw error;}
  }
  media.volume=1;
  // Warm an already permitted device during preloading, before a short cue is due.
  if(context.state==='running'&&context.currentTime<.03)void this.ready().catch(()=>{});
  return graph;
 }
 apply(media:HTMLAudioElement,volume:number,speed=1){
  const graph=this.attach(media);
  if(!Number.isFinite(volume)||volume<0||volume>2)throw new Error('Âm lượng clip cần nằm trong 0–200%.');
  media.playbackRate=speed;media.volume=1;graph.gain.gain.value=volume;
 }
 async ready(){
  const context=this.getContext();
  if(this.warming)return this.warming;
  if(context.state==='running'&&context.currentTime>=.03)return;
  const target=context.state==='running'?.03:context.currentTime+.03;
  this.warming=(async()=>{
   if(context.state!=='running')await context.resume();
   if(context.state!=='running')throw new Error('Trình duyệt chưa cho phép phát âm thanh.');
   // Chrome can report "running" while its first render clock is still frozen.
   // Starting a media cue then loses its leading transient on some replays.
   const deadline=performance.now()+2000;
   while(context.currentTime<target){
    this.getContext(); // Re-check live device/disposal state after each timer tick.
    if(performance.now()>deadline)throw new Error('Thiết bị âm thanh chưa sẵn sàng.');
    await new Promise<void>(resolve=>setTimeout(resolve,4));
   }
  })().finally(()=>{this.warming=null;});
  return this.warming;
 }
 release(media:HTMLAudioElement){
  const graph=this.graphs.get(media);
  if(graph){graph.source.disconnect();graph.gain.disconnect();graph.connected=false;}
  this.active.delete(media);
 }
 dispose(){
  this.active.forEach(media=>this.release(media));this.active.clear();this.disposed=true;
  const context=this.context;this.context=null;
  if(context&&context.state!=='closed')void context.close().catch(()=>{});
 }
}
