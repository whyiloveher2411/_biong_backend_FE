export function beatTimeToVideo(start:number,local:number){return Math.max(0,start+local);}
export function videoTimeToBeat(time:number,start:number,duration:number){return Math.max(0,Math.min(duration,time-start));}
export function beatPlaybackUpdate(detail:{videoId?:number;origin?:string;time?:number;playing?:boolean}|undefined,videoId:number,duration:number){
 if(detail?.videoId!==videoId||detail.origin!=='user'||!Number.isFinite(detail.time))return null;
 return {time:Math.max(0,Math.min(duration,Number(detail.time))),playing:!!detail.playing};
}
