import {beatTimeToVideo,videoTimeToBeat,beatPlaybackUpdate,beatPreviewPlaybackUpdate} from './timelinePlaybackSync';
test('beat-local audio time maps to the same point on the global video timeline',()=>{
 expect(beatTimeToVideo(12.5,1.25)).toBe(13.75);expect(videoTimeToBeat(13.75,12.5,4)).toBe(1.25);
 expect(videoTimeToBeat(10,12.5,4)).toBe(0);expect(videoTimeToBeat(20,12.5,4)).toBe(4);
});
test('only real beat controls take playback ownership; auto echoes and other videos are ignored',()=>{
 expect(beatPlaybackUpdate({videoId:67,origin:'auto',time:2,playing:false},67,100)).toBeNull();
 expect(beatPlaybackUpdate({videoId:68,origin:'user',time:2,playing:true},67,100)).toBeNull();
 expect(beatPlaybackUpdate({videoId:67,origin:'user',time:NaN,playing:true},67,100)).toBeNull();
 expect(beatPlaybackUpdate({videoId:67,origin:'user',time:13.75,playing:true},67,100)).toEqual({time:13.75,playing:true});
 expect(beatPlaybackUpdate({videoId:67,origin:'user',time:13.75,playing:false},67,100)).toEqual({time:13.75,playing:false});
});

test('beat 1 preview cannot switch into beat 2 even with an overshot or longer audio clock',()=>{
 expect(beatPreviewPlaybackUpdate(0,5.6,5.7,true)).toEqual({local:5.55,time:5.55,playing:false});
 expect(beatPreviewPlaybackUpdate(0,5.6,2,true)).toEqual({local:2,time:2,playing:true});
 expect(beatPreviewPlaybackUpdate(0,5.6,5.59,true).playing).toBe(true);
 const stopped=beatPreviewPlaybackUpdate(5.6,6.36,6.36,false);
 expect(stopped.time).toBeLessThan(11.96);expect(stopped.playing).toBe(false);
});
