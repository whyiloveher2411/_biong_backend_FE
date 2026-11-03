/** Metadata may arrive before listener installation, or fail without ever arriving. */
export function waitForAudioMetadata(media:HTMLAudioElement,timeoutMs=10000,signal?:AbortSignal):Promise<void>{
 if(signal?.aborted)return Promise.reject(new Error('Đã huỷ tải âm thanh.'));
 if(media.error)return Promise.reject(new Error('Không đọc được file âm thanh (media error '+media.error.code+').'));
 if(Number.isFinite(media.duration)&&media.duration>0)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>|undefined;
  const events=['loadedmetadata','durationchange','canplay'];
  const cleanup=()=>{events.forEach(event=>media.removeEventListener(event,check));media.removeEventListener('error',failed);if(timer!==undefined)clearTimeout(timer);signal?.removeEventListener('abort',aborted);};
  const aborted=()=>{cleanup();reject(new Error('Đã huỷ tải âm thanh.'));};
  const failed=()=>{cleanup();reject(new Error('Không đọc được file âm thanh (media error '+(media.error?.code||'unknown')+').'));};
  const check=()=>{if(media.error){failed();return;}if(Number.isFinite(media.duration)&&media.duration>0){cleanup();resolve();}};
  events.forEach(event=>media.addEventListener(event,check));media.addEventListener('error',failed);signal?.addEventListener('abort',aborted);
  timer=setTimeout(()=>{cleanup();reject(new Error('Quá thời gian tải metadata âm thanh.'));},timeoutMs);
  check();
 });
}
