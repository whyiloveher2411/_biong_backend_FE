import {ajax} from 'hook/useApi';
import {getAdminApiPrefix} from 'helpers/apiHost';
import {convertToURL} from 'helpers/url';
import {getAccessToken} from 'store/user/user.reducers';
export type LibrarySound={id:string;file:string;title:string;duration_sec:number;category:string;license:string;source:string};
export type ModelAudioBinding={action:string;sound_ids:string[];sounds?:LibrarySound[];volume:number;phases:number[]};
export type ModelAudioConfig={enabled:boolean;bindings:ModelAudioBinding[]};
export const listLibrarySounds=()=>ajax({url:'plugin/vn4-e-learning/app-mobile/marketing/sound-library/list',method:'POST',loading:false,data:{}}) as Promise<{success:boolean;sounds:LibrarySound[];message?:string}>;
export function librarySoundUrl(file:string){return convertToURL(getAdminApiPrefix(),'plugin/vn4-e-learning/app-mobile/marketing/sound-effect/asset')+'?file='+encodeURIComponent(file)+'&access_token='+encodeURIComponent(getAccessToken()||'');}
export async function uploadLibrarySound(file:File,meta:{title:string;license:string;source:string;category:string}){
 const body=new FormData();body.append('file',file);Object.entries(meta).forEach(([k,v])=>body.append(k,v));
 const res=await fetch(convertToURL(getAdminApiPrefix(),'plugin/vn4-e-learning/app-mobile/marketing/sound-library/upload'),{method:'POST',headers:{Authorization:'Bearer '+(getAccessToken()||'')},body});return res.json() as Promise<{success:boolean;message?:string;sound?:LibrarySound}>;
}
export function resolveCharacterAudio<T extends {audio?:ModelAudioConfig}>(character:T):T {return {...character,audio:character.audio?{...character.audio,bindings:character.audio.bindings.map(b=>({...b,sounds:b.sounds?.map(s=>({...s,url:librarySoundUrl(s.file)}))}))}:undefined};}
