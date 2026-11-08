export function beatTimeToVideo(start:number,local:number){return Math.max(0,start+local);}
export function videoTimeToBeat(time:number,start:number,duration:number){return Math.max(0,Math.min(duration,time-start));}
export function beatPlaybackUpdate(detail:{videoId?:number;origin?:string;time?:number;playing?:boolean}|undefined,videoId:number,duration:number){
 if(detail?.videoId!==videoId||detail.origin!=='user'||!Number.isFinite(detail.time))return null;
 return {time:Math.max(0,Math.min(duration,Number(detail.time))),playing:!!detail.playing};
}

/** A beat preview must never publish the exclusive end (which selects the next beat). */
export function beatPreviewPlaybackUpdate(start:number,duration:number,local:number,playing:boolean){
 const length=Math.max(.1,duration),atEnd=local>=length;
 const seconds=atEnd?length-Math.min(.05,length/2):Math.max(0,Math.min(length,local));
 return {local:seconds,time:beatTimeToVideo(start,seconds),playing:playing&&!atEnd};
}
