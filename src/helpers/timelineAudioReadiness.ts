type Prepare=(start:number,end:number)=>Promise<void>;
const providers=new Map<number,Set<Prepare>>();
/** Whole-video transport waits for the same SFX player that owns beat preview. */
export function registerTimelineAudioReadiness(videoId:number,prepare:Prepare){
 let entries=providers.get(videoId);if(!entries){entries=new Set();providers.set(videoId,entries);}entries.add(prepare);
 return ()=>{entries!.delete(prepare);if(!entries!.size&&providers.get(videoId)===entries)providers.delete(videoId);};
}
export async function prepareTimelineAudioRange(videoId:number,start:number,end:number){
 await Promise.all([...(providers.get(videoId)||[])].map(prepare=>prepare(start,end)));
}
