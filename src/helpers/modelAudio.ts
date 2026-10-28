import {ajax} from 'hook/useApi';
import {getAdminApiPrefix} from 'helpers/apiHost';
import {convertToURL} from 'helpers/url';
import {getAccessToken} from 'store/user/user.reducers';
export type LibrarySound={id:string;file:string;title:string;duration_sec:number;category:string;license:string;source:string;generation?:{provider:string;model:string;prompt:string;requested_duration_sec:number;seed:number;single_event:boolean;created_at:string}};
export type ModelAudioBinding={action:string;sound_ids:string[];sounds?:LibrarySound[];volume:number;phases:number[]};
export type ModelAudioConfig={enabled:boolean;bindings:ModelAudioBinding[]};
export const listLibrarySounds=()=>ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/sound-library/list',method:'POST',loading:false,data:{}}) as Promise<{success:boolean;sounds:LibrarySound[];message?:string}>;
export function librarySoundUrl(file:string){return convertToURL(getAdminApiPrefix(),'plugin/vn4-e-learning/app-mobile/marketing/sound-effect/asset')+'?file='+encodeURIComponent(file)+'&access_token='+encodeURIComponent(getAccessToken()||'');}
export async function loadLibrarySoundBlobUrl(file:string){
 const directUrl=librarySoundUrl(file),apiUrl=new URL(directUrl),token=getAccessToken();
 const urls=process.env.NODE_ENV==='development'?[`${apiUrl.pathname}${apiUrl.search}`,directUrl]:[directUrl];
 let lastError:unknown;
 for(const url of urls){
  try{
   const response=await fetch(url,{headers:token?{Authorization:'Bearer '+token}:undefined});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const blob=await response.blob();
   if(!blob.type.startsWith('audio/')){const body=await blob.text();throw new Error(`Tải asset không trả về audio (HTTP ${response.status}, ${response.headers.get('content-type')||'không rõ'}): ${body.slice(0,180)}`);}
   return URL.createObjectURL(blob);
  }catch(error){lastError=error;}
 }
 throw lastError instanceof Error?lastError:new Error('Không tải được file âm thanh.');
}
export async function uploadLibrarySound(file:File,meta:{title:string;license:string;source:string;category:string}){
 const body=new FormData();body.append('file',file);Object.entries(meta).forEach(([k,v])=>body.append(k,v));
 const res=await fetch(convertToURL(getAdminApiPrefix(),'plugin/vn4-e-learning/app-mobile/marketing/sound-library/upload'),{method:'POST',headers:{Authorization:'Bearer '+(getAccessToken()||'')},body});return res.json() as Promise<{success:boolean;message?:string;sound?:LibrarySound}>;
}
export function resolveCharacterAudio<T extends {audio?:ModelAudioConfig}>(character:T):T {return {...character,audio:character.audio?{...character.audio,bindings:character.audio.bindings.map(b=>({...b,sounds:b.sounds?.map(s=>({...s,url:librarySoundUrl(s.file)}))}))}:undefined};}

export type SoundGenerationJob={id:string;status:'queued'|'running'|'complete'|'failed';created_at:string;started_at?:string;error?:string;sound?:LibrarySound;options:GenerateLibrarySoundInput};
export type GenerateLibrarySoundInput={title:string;prompt:string;duration:number;category:string;seed?:number;single_event:boolean;license?:string;source?:string};
export const generateLibrarySound=(data:GenerateLibrarySoundInput)=>ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/sound-library/generate',method:'POST',loading:false,data}) as Promise<{success:boolean;job?:SoundGenerationJob;message?:string}>;
export const getSoundGeneration=(job_id:string)=>ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/sound-library/generation',method:'POST',loading:false,data:{job_id}}) as Promise<{success:boolean;job?:SoundGenerationJob;message?:string}>;
export const translateSoundSearchQuery=(text:string)=>ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/sound-library/translate-search',method:'POST',loading:false,data:{text}}) as Promise<{success:boolean;source_text:string;translated_text:string;message?:string}>;
