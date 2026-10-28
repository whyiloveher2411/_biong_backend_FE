import {beatTimeToVideo,videoTimeToBeat,beatPlaybackUpdate} from './timelinePlaybackSync';
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
