import React from 'react';
import {prepareTimelineAudioRange} from 'helpers/timelineAudioReadiness';
import { Box, Alert, Button } from '@mui/material';
import { useVoiceMedia, voicePreviewUrl } from 'helpers/timelineVoice';
import type { BeatMap, BeatImageEntry } from './agentVideoBeatMap';
import BeatHtmlMotionPreview from './BeatHtmlMotionPreview';
type Props = {
    videoId: number;
    beatMap: BeatMap | null;
    publicAudioStart?: number;
    publicAssets?: { runtimeUrl: string; catalog: Record<string, unknown> };
    beatHtml: Record<string, {
        html?: string;
    }>;
    beatImage: Record<string, BeatImageEntry>;
    audioUrl: string;
    beatAudio?: {
        items?: {
            order: number;
            status: string;
            url?: string;
        }[];
    } | null;
};
/** A separate whole-video clock: beat-local controls retain their stop-at-end behaviour. */
export default function ShortVideoAgentWholePreview({ videoId, beatMap, beatHtml, beatImage, audioUrl, beatAudio, publicAssets, publicAudioStart }: Props) {
    const initialTime = publicAssets ? beatMap?.sections[0]?.startSec ?? 0 : 0;
    const voiceOffset = (publicAudioStart ?? initialTime) - initialTime;
    const [time, setTime] = React.useState(initialTime), [visible, setVisible] = React.useState(Boolean(publicAssets)), [playing, setPlaying] = React.useState(false), [error, setError] = React.useState(''), [run, setRun] = React.useState(0), [buffering, setBuffering] = React.useState(false);
    const sections = beatMap?.sections || [];
    const found = sections.findIndex(b => time >= b.startSec && time < b.endSec);
    const index = found < 0 ? Math.max(0, sections.length - 1) : found;
    const duration = sections.length ? sections[sections.length - 1].endSec : 0;
    const audioRefs = React.useRef(new Map<string, HTMLAudioElement>());
    const ready = React.useRef(new Map<string, string>());
    const control = React.useRef({ time: initialTime, playing: false });
    const generation=React.useRef(0);
    const publicAudioReady = React.useRef(false);
    const current = React.useRef({ sections, duration, index, audioUrl, beatHtml, beatImage });
    current.current = { sections, duration, index, audioUrl, beatHtml, beatImage };
    const publish = React.useCallback((seconds: number, running: boolean, soundRunning = running) => {
        control.current.time = seconds;
        setTime(seconds);
        setPlaying(running);
        document.dispatchEvent(new CustomEvent('timeline-main-transport', { detail: { videoId, time: seconds, playing: running, source: 'whole' } }));
        document.dispatchEvent(new CustomEvent('timeline-audio-playhead', { detail: { videoId, time: seconds, playing: running, soundPlaying: soundRunning, origin: 'user', source: 'whole' } }));
    }, [videoId]);
    React.useEffect(() => { const retained = new Set(sections.slice(index, index + 3).map(b => b.id)); ready.current.forEach((_, id) => { if (!retained.has(id))
        ready.current.delete(id); }); }, [index, sections]);
    const pause = React.useCallback(() => { ++generation.current;control.current.playing = false; audioRefs.current.forEach(a => a.pause()); }, []);
    const playPublic = React.useCallback(() => {
        setError('');
        setBuffering(true);
        control.current.playing = true;
        setRun(n => n + 1);
        publish(initialTime, true, false);
    }, [initialTime, publish]);
    React.useEffect(() => {
        if (publicAssets) playPublic();
    }, [publicAssets, playPublic]);
    React.useEffect(() => {
        const command = (event: Event) => {
            const d = (event as CustomEvent).detail;
            if (d?.videoId !== videoId)
                return;
            pause();
            setRun(n => n + 1);
            setVisible(true);
            setError('');
            setBuffering(d.action === 'play');
            const next = d.action === 'play' && d.time >= current.current.duration ? 0 : d.time;
            control.current.playing = d.action === 'play';
            publish(next, control.current.playing, false);
        };
        const stop = (event: Event) => {
            const d = (event as CustomEvent).detail;
            if (d?.videoId !== videoId || d.source === 'whole')
                return;
            // Ignore automatic resets from the editor mounting the next beat.
            if (event.type === 'timeline-audio-playhead' && d.origin !== 'user')
                return;
            pause();
            setPlaying(false);
            if (Number.isFinite(d.time)) {
                control.current.time = d.time;
                setTime(d.time);
            }
            if (event.type === 'timeline-audio-playhead')
                setVisible(false);
        };
        document.addEventListener('timeline-whole-command', command);
        document.addEventListener('timeline-main-transport', stop);
        document.addEventListener('timeline-audio-playhead', stop);
        return () => { pause(); document.removeEventListener('timeline-whole-command', command); document.removeEventListener('timeline-main-transport', stop); document.removeEventListener('timeline-audio-playhead', stop); };
    }, [videoId, pause, publish]);
    React.useEffect(() => {
        if (!playing)
            return;
        const loadDeadline = performance.now() + 30000;
        let frame = 0, cancelled = false, last = performance.now(), started = '';
        const token=generation.current;
        const active=()=>!cancelled&&control.current.playing&&generation.current===token;
        const tick = async (now: number) => {
            if (!active())
                return;
            const t = control.current.time, data = current.current;
            const beat = data.sections.find(b => t >= b.startSec && t < b.endSec);
            if (!beat) {
                pause();
                publish(data.duration, false);
                return;
            }
            const audio = audioRefs.current.get(beat.id);
            const local = t - beat.startSec;
            if (audio?.error) {
                pause();
                setError('Không tải được audio của ' + beat.id);
                publish(t, false);
                return;
            }
            if (publicAssets && started === '' && now > loadDeadline) {
                pause();
                setError('Không tải được dữ liệu preview.');
                publish(t, false);
                return;
            }
            // Freeze the shared clock until the pre-mounted HTML and media are ready.
            if (ready.current.get(beat.id) !== (data.beatHtml[beat.id]?.html || data.beatImage[beat.id]?.image_url || 'empty') || (audio && audio.readyState < 2)) {
                last = now;
                setBuffering(true);
                publish(t, true, false);
                frame = requestAnimationFrame(tick);
                return;
            }
            setBuffering(false);
            if (started !== beat.id) {
                audioRefs.current.forEach(a => { if (a !== audio)
                    a.pause(); });
                setBuffering(true);
                publish(t,true,false);
                try {
                    await prepareTimelineAudioRange(videoId,t,beat.endSec);
                    if(!active())return;
                    if (publicAssets) publicAudioReady.current = true;
                    if(audio){audio.currentTime=data.audioUrl?t+voiceOffset:local;await audio.play();}
                } catch (e) {
                    if(active()){
                        pause();
                        setError(publicAssets && e instanceof DOMException && e.name === 'NotAllowedError'
                            ? 'Bấm Phát để xem preview có âm thanh.'
                            : 'Không phát được audio của '+beat.id+': '+(e instanceof Error?e.message:String(e)));
                        publish(t,false);
                    }
                    return;
                }
                if(!active())return;
                setBuffering(false);
                started = beat.id;
                last = performance.now();
                // Voice may advance while play() resolves. Publish the requested
                // start once so a callout at beat time zero retains its attack.
                publish(t,true);
                frame=requestAnimationFrame(tick);
                return;
            }
            const clockNow=performance.now();
            let next = t + Math.max(0,Math.min(.1, (clockNow - last) / 1000));
            last = clockNow;
            if (audio && !audio.ended && !audio.paused)
                next = data.audioUrl ? audio.currentTime - voiceOffset : beat.startSec + audio.currentTime;
            next = Math.min(beat.endSec, Math.max(t, next));
            if (next >= data.duration) {
                pause();
                publish(data.duration, false);
                return;
            }
            publish(next, true);
            frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
        return () => { cancelled = true; cancelAnimationFrame(frame); };
    }, [playing, run, pause, publish, videoId, publicAssets, voiceOffset]);
    return <Box sx={{ position: 'absolute', inset: 0, zIndex: visible ? 10 : -1, bgcolor: 'background.paper', visibility: visible ? 'visible' : 'hidden', pointerEvents: visible ? 'auto' : 'none', overflow: 'hidden' }} aria-label="Preview toàn video">
        {visible && playing && buffering ? <Alert severity="info" sx={{ position: 'absolute', top: 44, zIndex: 2 }}>Đang tải HTML và tài nguyên của beat…</Alert> : null}
        {error ? <Alert severity="error" sx={{ position: 'absolute', top: 44, zIndex: 2 }}>{error}</Alert> : null}
        {publicAssets && !playing ? <Button variant="contained" sx={{ position: 'absolute', bottom: 16, left: 16, zIndex: 2 }} onClick={() => {
            const beat = sections[0];
            const audio = audioRefs.current.get(beat.id);
            if (audio && audio.readyState >= 2 && publicAudioReady.current && ready.current.has(beat.id)) {
                audio.currentTime = initialTime + voiceOffset;
                // Start within the click gesture for browsers that enforce it.
                void audio.play().catch(() => undefined);
            }
            playPublic();
        }}>{time >= duration ? 'Phát lại' : 'Phát'}</Button> : null}
        {visible && !publicAssets ? <Button size="small" variant="contained" sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }} onClick={() => { pause(); publish(control.current.time, false); setVisible(false); }}>Trở về chỉnh beat</Button> : null}
        {sections.slice(index, index + 3).map((beat, offset) => {
            const order = index + offset + 1;
            const html = beatHtml[beat.id]?.html;
            const signature = html || beatImage[beat.id]?.image_url || 'empty';
            const url = audioUrl || (beatAudio?.items || []).find(a => a.order === order && a.status === 'ready')?.url || '';
            return <Box key={beat.id} sx={{ position: 'absolute', inset: 0, visibility: visible && offset === 0 ? 'visible' : 'hidden', pointerEvents: offset === 0 ? 'auto' : 'none' }}>
                {html ? <BeatHtmlMotionPreview publicAssets={publicAssets} html={html} timeSec={offset === 0 ? Math.max(0, time - beat.startSec) : 0} durationSec={beat.endSec - beat.startSec} beatId={beat.id} shortVideoId={videoId} playing={playing && !buffering && offset === 0} onReady={() => ready.current.set(beat.id, signature)}/> : <img src={beatImage[beat.id]?.image_url || ''} alt={beat.id} onLoad={() => ready.current.set(beat.id, signature)} style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>}
                {!html && !beatImage[beat.id]?.image_url ? <EmptyReady onReady={() => ready.current.set(beat.id, signature)}/> : null}
                {url ? <Voice key={url} url={url} videoId={videoId} publicPlayback={Boolean(publicAssets)} register={a => {
                    if (a) audioRefs.current.set(beat.id, a);
                    else audioRefs.current.delete(beat.id);
                }}/> : null}
            </Box>;
        })}
    </Box>;
}
function Voice({ url, videoId, publicPlayback, register }: {
    url: string;
    videoId: number;
    publicPlayback: boolean;
    register: (a: HTMLAudioElement | null) => void;
}) {
    const ref = React.useRef<HTMLAudioElement | null>(null);
    const mixRef = React.useRef<HTMLAudioElement | null>(null);
    useVoiceMedia(publicPlayback ? mixRef : ref, videoId);
    const registerRef = React.useRef(register);
    registerRef.current = register;
    React.useEffect(() => { const audio=ref.current;registerRef.current(audio); return () => { audio?.pause(); registerRef.current(null); }; }, []);
    return <audio ref={ref} src={publicPlayback ? url : voicePreviewUrl(url, videoId)} crossOrigin={publicPlayback ? undefined : "anonymous"} preload="auto"/>;
}
function EmptyReady({ onReady }: {
    onReady: () => void;
}) { React.useEffect(() => { onReady(); }, []); return null; }
