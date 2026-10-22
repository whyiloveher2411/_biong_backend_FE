import React from 'react';
import {Alert, Box, Button, CircularProgress, Stack, Typography} from '@mui/material';
import type {PlayerRef} from '@remotion/player';
import type {ShortVideoRenderManifest} from 'helpers/shortVideoRenderManifest';
import {ShortVideoRemotionPreview, ShortVideoRemotionTimelineBar} from '../ShortVideoRemotionPlayer';
import {storyV2Request} from './agentVideoApi';

type Props = {shortVideoId: number; beatId?: string; defaultWhole?: boolean; revision?: string; audioOnly?: boolean; onTime?: (seconds: number, playing: boolean) => void};
type SpeechLine = NonNullable<ShortVideoRenderManifest['speech_clips']>[number] & {text?: string; speaker_name?: string; beat_id?: string};
type PreviewManifest = ShortVideoRenderManifest & {pending_utterances?: string[]};
const clock = (time: number) => `${Math.floor(time / 60)}:${(time % 60).toFixed(1).padStart(4, '0')}`;
export default function StoryV2Preview({shortVideoId, beatId, defaultWhole = false, revision = '', audioOnly = false, onTime}: Props) {
    const [whole, setWhole] = React.useState(defaultWhole || !beatId);
    const [manifest, setManifest] = React.useState<PreviewManifest | null>(null);
    const [error, setError] = React.useState(''); const [loading, setLoading] = React.useState(false);
    const [refresh, setRefresh] = React.useState(0);
    const [activeLineId, setActiveLineId] = React.useState('');
    const activeLineRef = React.useRef('');
    const playerRef = React.useRef<PlayerRef | null>(null);
    const [player, setPlayer] = React.useState<PlayerRef | null>(null);
    const instanceId = React.useRef(`whatif-player-${Math.random().toString(36).slice(2)}`);
    const timeRef = React.useRef(onTime); timeRef.current = onTime;
    React.useEffect(() => {setWhole(defaultWhole || !beatId);}, [shortVideoId, defaultWhole, Boolean(beatId)]);
    React.useEffect(() => {
        const update = (event: Event) => {if ((event as CustomEvent).detail?.shortVideoId === shortVideoId) setRefresh((n) => n + 1);};
        window.addEventListener('whatif-audio-updated', update);
        return () => window.removeEventListener('whatif-audio-updated', update);
    }, [shortVideoId]);
    React.useEffect(() => {
        let cancelled = false; setLoading(true); setError(''); setManifest(null); setActiveLineId(''); activeLineRef.current = '';
        void storyV2Request(shortVideoId, 'preview', undefined, undefined, whole ? undefined : beatId).then((res) => {
            if (cancelled) return;
            if (!res.success || !res.manifest) throw new Error(typeof res.message === 'string' ? res.message : 'Chưa tải được preview What-if');
            setManifest(res.manifest);
        }).catch((e) => {if (!cancelled) setError(e instanceof Error ? e.message : String(e));})
            .finally(() => {if (!cancelled) setLoading(false);});
        return () => {cancelled = true;};
    }, [shortVideoId, beatId, whole, revision, refresh]);
    React.useEffect(() => {
        if (!player || !manifest) return;
        const sync = () => {
            const time = player.getCurrentFrame() / manifest.fps;
            timeRef.current?.(time, player.isPlaying());
            const id = manifest.speech_clips?.find((line) => time >= line.start_sec && time < line.start_sec + line.duration_sec)?.id ?? '';
            if (id !== activeLineRef.current) {activeLineRef.current = id; setActiveLineId(id);}
        };
        sync();
        const play = () => {window.dispatchEvent(new CustomEvent('whatif-preview-play', {detail: instanceId.current})); sync();};
        const otherPlay = (event: Event) => {if ((event as CustomEvent).detail !== instanceId.current) player.pause();};
        window.addEventListener('whatif-preview-play', otherPlay);
        player.addEventListener('frameupdate', sync); player.addEventListener('play', play); player.addEventListener('pause', sync);
        return () => {window.removeEventListener('whatif-preview-play', otherPlay); player.removeEventListener('frameupdate', sync); player.removeEventListener('play', play); player.removeEventListener('pause', sync);};
    }, [player, manifest]);
    const playback = React.useMemo(() => {
        if (!manifest || !audioOnly) return manifest;
        return {...manifest, html_clips: [], visual_clips: [], text_clips: [], scenes: manifest.scenes.map((scene) => ({...scene, suppress_legacy_text: true, visual: {type: 'none' as const, ref: '', motion: 'none'}}))};
    }, [manifest, audioOnly]);
    return <Stack spacing={1} sx={{p: 1, minHeight: 0, minWidth: 0, flexShrink: 0}}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2">{whole ? 'Preview toàn video · một timeline' : `Preview ${beatId} · lời dẫn + thoại + SFX`}</Typography>
            {beatId && !audioOnly ? <Button size="small" onClick={() => setWhole((v) => !v)}>{whole ? 'Chỉ nghe / xem beat này' : 'Nghe / xem toàn video'}</Button> : null}
            <Button size="small" disabled={loading} onClick={() => setRefresh((n) => n + 1)}>Làm mới audio</Button>
        </Stack>
        {loading ? <CircularProgress size={20} /> : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {manifest ? <Typography variant="caption">{manifest.speech_clips?.filter((clip) => clip.audio_url).length ?? 0}/{manifest.speech_clips?.length ?? 0} câu đọc sẵn sàng · {manifest.sound_clips?.length ?? 0} đoạn nhạc/SFX · một nút phát cho toàn bộ timeline</Typography> : null}
        {manifest?.pending_utterances?.length ? <Alert severity="warning">Còn {manifest.pending_utterances.length} câu chưa có audio mới nhất. Phần đã sẵn sàng vẫn nghe được; timing còn là bản nháp.</Alert> : null}
        {manifest?.warnings?.length && !audioOnly ? <Typography variant="caption">Một số HTML chưa có hoặc cần cập nhật theo timing mới; preview vẫn phát audio. Khi xuất MP4 phải có đủ HTML mới nhất.</Typography> : null}
        {playback ? <>
            <Box sx={audioOnly ? {height: 1, width: 1, overflow: 'hidden', position: 'absolute', opacity: 0, pointerEvents: 'none'} : {height: 420, minHeight: 200, maxHeight: '60vh', flexShrink: 0, display: 'flex'}} aria-hidden={audioOnly || undefined}>
                <ShortVideoRemotionPreview key={`${shortVideoId}-${whole ? 'whole' : beatId}-${refresh}`} manifest={playback} playerRef={playerRef} onPlayerReady={setPlayer} />
            </Box>
            <ShortVideoRemotionTimelineBar manifest={playback} playerRef={playerRef} playerInstance={player} />
            <Typography variant="subtitle2">Lời dẫn và thoại · ai nói gì</Typography>
            {!manifest?.speech_clips?.length ? <Typography variant="body2">Beat này không có lời đọc; chỉ có hình, chữ hoặc SFX.</Typography> : <Box role="list" aria-label="Danh sách lời dẫn và thoại" sx={{maxHeight: 280, overflowY: 'auto', border: 1, borderColor: 'divider', borderRadius: 1}}>
                {(manifest.speech_clips as SpeechLine[]).map((line) => <Box role="listitem" key={line.id} aria-current={activeLineId === line.id ? 'true' : undefined} sx={{p: 1.25, borderBottom: 1, borderColor: 'divider', borderLeft: 3, borderLeftColor: activeLineId === line.id ? 'primary.main' : 'transparent', bgcolor: activeLineId === line.id ? 'action.selected' : 'background.paper'}}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                        <Typography variant="subtitle2">{line.kind === 'narration' ? `Người dẫn · ${line.speaker_name || line.speaker_id}` : (line.speaker_name || line.speaker_id)}</Typography>
                        <Typography variant="caption">{line.kind === 'narration' ? 'Lời dẫn' : 'Thoại nhân vật'} · {line.beat_id || beatId || ''} · {clock(line.start_sec)}–{clock(line.start_sec + line.duration_sec)}</Typography>
                        {line.audio_url ? <Button size="small" disabled={!player} onClick={() => {player?.seekTo(Math.floor(line.start_sec * playback.fps)); player?.play();}}>Nghe từ câu này</Button> : <Typography variant="caption" color="warning.main">Chưa có audio</Typography>}
                    </Stack>
                    <Typography variant="body2" sx={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{line.text || 'Chưa có nội dung câu trong dữ liệu preview.'}</Typography>
                </Box>)}
            </Box>}

        </> : null}
    </Stack>;
}
