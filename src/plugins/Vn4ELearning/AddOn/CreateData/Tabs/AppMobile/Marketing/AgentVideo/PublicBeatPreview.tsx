import React from 'react';
import { Alert, Box } from '@mui/material';
import { getEnvApiHost } from 'helpers/apiHost';
import { convertToURL } from 'helpers/url';
import ShortVideoAgentWholePreview from './ShortVideoAgentWholePreview';
import useTimelineAudio, { PublicTimelineAudioClip } from './useTimelineAudio';
import type { BeatMap } from './agentVideoBeatMap';

type Preview = {
    id: string;
    duration: number;
    html: string;
    image: string;
    audio: string;
    audioStart: number;
    start: number;
    timeline: PublicTimelineAudioClip[];
    catalog: Record<string, unknown>;
};

const endpoint = 'api/public/short-video-preview';

export default function PublicBeatPreview() {
    const params = new URLSearchParams(window.location.search);
    const video = params.get('video') || '';
    const beat = params.get('beat') || '';
    const apiUrl = convertToURL(getEnvApiHost(), endpoint);
    const [preview, setPreview] = React.useState<Preview | null>(null);
    const [message, setMessage] = React.useState('Đang tải preview…');

    React.useEffect(() => {
        if (!/^[1-9]\d*$/.test(video) || !/^[1-9]\d*$/.test(beat)) {
            setMessage('Chưa có dữ liệu preview.');
            return;
        }
        const controller = new AbortController();
        const query = new URLSearchParams({ video, beat });
        fetch(`${apiUrl}?${query}`, { credentials: 'omit', signal: controller.signal })
            .then(async response => {
                if (response.status === 404) {
                    setMessage('Chưa có dữ liệu preview.');
                    return;
                }
                if (!response.ok) throw new Error(String(response.status));
                setPreview(await response.json());
            })
            .catch(() => {
                if (!controller.signal.aborted) setMessage('Không tải được preview.');
            });
        return () => controller.abort();
    }, [apiUrl, video, beat]);

    if (!preview) {
        return <Alert severity="info">{message}</Alert>;
    }

    return <PublicPlayer videoId={Number(video)} beat={beat} preview={preview} apiUrl={apiUrl} />;
}

function PublicPlayer({ videoId, beat, preview, apiUrl }: {
    videoId: number;
    beat: string;
    preview: Preview;
    apiUrl: string;
}) {
    const beatMap = React.useMemo<BeatMap>(() => ({
        schema_version: 2,
        totalVideoSec: preview.start + preview.duration,
        sections: [{
            id: preview.id,
            beat_id: preview.id,
            startSec: preview.start,
            endSec: preview.start + preview.duration,
            durationSec: preview.duration,
            phrase_anchor: '',
            visual_description: '',
            background: '',
        }],
    }), [preview]);
    const publicAssets = React.useMemo(() => ({
        runtimeUrl: `${apiUrl}/runtime.js`,
        catalog: preview.catalog,
    }), [apiUrl, preview]);

    return (
        <Box component="main" aria-label={`Preview video ${videoId}, beat ${beat}`}
            sx={{ position: 'fixed', inset: 0, bgcolor: 'black' }}>
            <PublicTimelineAudio videoId={videoId} beatMap={beatMap} clips={preview.timeline} />
            <ShortVideoAgentWholePreview
                videoId={videoId}
                beatMap={beatMap}
                beatHtml={preview.html ? { [preview.id]: { html: preview.html } } : {}}
                beatImage={preview.image ? { [preview.id]: { image_url: preview.image } } : {}}
                audioUrl={preview.audio}
                publicAudioStart={preview.audioStart}
                publicAssets={publicAssets}
            />
        </Box>
    );
}

function PublicTimelineAudio({ videoId, beatMap, clips }: {
    videoId: number;
    beatMap: BeatMap;
    clips: PublicTimelineAudioClip[];
}) {
    const [transport, setTransport] = React.useState({ time: beatMap.sections[0].startSec, playing: false });
    React.useEffect(() => {
        const receive = (event: Event) => {
            const detail = (event as CustomEvent).detail;
            if (detail?.videoId === videoId && detail.source === 'whole') {
                setTransport({ time: detail.time, playing: detail.soundPlaying });
            }
        };
        document.addEventListener('timeline-audio-playhead', receive);
        return () => document.removeEventListener('timeline-audio-playhead', receive);
    }, [videoId]);
    const { playbackError } = useTimelineAudio(
        videoId, transport.time, transport.playing, beatMap.totalVideoSec, beatMap.sections, clips,
    );

    return playbackError
        ? <Alert severity="error" sx={{ position: 'absolute', top: 0, zIndex: 11 }}>{playbackError}</Alert>
        : null;
}
