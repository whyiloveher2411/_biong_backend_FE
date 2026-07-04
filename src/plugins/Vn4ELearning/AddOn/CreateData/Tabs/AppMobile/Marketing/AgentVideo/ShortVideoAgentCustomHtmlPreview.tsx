import React from 'react';
import { Box } from '@mui/material';
import { resolveActiveBeatSection, type BeatMap } from './agentVideoBeatMap';
import { createHtmlBeatMediaProxy, type HtmlBeatMediaProxy } from './agentVideoHtmlBeatMediaProxy';
import {
    computeContainScale,
    computeScaledStageHeight,
    HF_STAGE_HEIGHT,
    HF_STAGE_WIDTH,
} from './agentVideoHtmlBeatPreviewScale';
import { seekCustomHtmlIframe } from './agentVideoCustomHtmlPreview';

type Props = {
    beatMap: BeatMap | null;
    beatHtml: Record<string, { html?: string }>;
    audioUrl: string;
    audioDurationSec: number | null;
    videoRef: React.Ref<HTMLVideoElement>;
};

const EMPTY_HTML = '<html><body style="margin:0;background:#111;color:#666;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">Chưa có HTML beat</body></html>';

export default function ShortVideoAgentCustomHtmlPreview({
    beatMap,
    beatHtml,
    audioUrl,
    audioDurationSec,
    videoRef,
}: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const beatMapRef = React.useRef(beatMap);
    const audioDurationSecRef = React.useRef(audioDurationSec);
    const [activeBeatId, setActiveBeatId] = React.useState('');
    const [localTimeSec, setLocalTimeSec] = React.useState(0);
    const [containerWidth, setContainerWidth] = React.useState(0);

    beatMapRef.current = beatMap;
    audioDurationSecRef.current = audioDurationSec;

    const mediaProxyRef = React.useRef<HtmlBeatMediaProxy | null>(null);
    if (!mediaProxyRef.current) {
        mediaProxyRef.current = createHtmlBeatMediaProxy({
            getAudio: () => audioRef.current,
            getIframe: () => iframeRef.current,
            getBeatMap: () => beatMapRef.current,
            getFallbackDuration: () => audioDurationSecRef.current ?? 0,
        });
    }

    const activeBeat = React.useMemo(
        () => resolveActiveBeatSection(beatMap, localTimeSec),
        [beatMap, localTimeSec],
    );

    const activeHtml = activeBeat ? (beatHtml[activeBeat.id]?.html || '') : '';
    const containScale = computeContainScale(containerWidth || 360);
    const scaledStageHeight = computeScaledStageHeight(containScale);

    React.useImperativeHandle(videoRef, () => mediaProxyRef.current as HtmlBeatMediaProxy, []);

    React.useEffect(() => {
        if (activeBeat?.id) {
            setActiveBeatId(activeBeat.id);
        }
    }, [activeBeat?.id]);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const updateWidth = () => {
            setContainerWidth(container.clientWidth);
        };

        updateWidth();
        const observer = new ResizeObserver(updateWidth);
        observer.observe(container);
        return () => {
            observer.disconnect();
        };
    }, []);

    React.useEffect(() => {
        const audio = audioRef.current;
        const proxy = mediaProxyRef.current;
        if (!audio || !proxy) {
            return undefined;
        }

        proxy.bindAudio(audio);

        const syncSeek = () => {
            const globalT = audio.currentTime;
            setLocalTimeSec(globalT);
            const beat = resolveActiveBeatSection(beatMapRef.current, globalT);
            const localT = beat ? Math.max(0, globalT - beat.startSec) : globalT;
            seekCustomHtmlIframe(iframeRef.current, localT);
        };

        audio.addEventListener('timeupdate', syncSeek);
        audio.addEventListener('play', syncSeek);
        audio.addEventListener('seeked', syncSeek);

        return () => {
            audio.removeEventListener('timeupdate', syncSeek);
            audio.removeEventListener('play', syncSeek);
            audio.removeEventListener('seeked', syncSeek);
            proxy.unbindAudio();
        };
    }, [audioUrl]);

    React.useEffect(() => {
        const beat = resolveActiveBeatSection(beatMap, localTimeSec);
        const localT = beat ? Math.max(0, localTimeSec - beat.startSec) : 0;
        seekCustomHtmlIframe(iframeRef.current, localT);
    }, [activeHtml, beatMap, localTimeSec]);

    return (
        <Box sx={{ width: '100%', maxWidth: 360 }}>
            {activeBeatId ? (
                <Box sx={{ mb: 1, textAlign: 'center' }}>
                    Preview:
                    {' '}
                    {activeBeatId}
                    {activeBeat ? ` (${activeBeat.startSec.toFixed(1)}–${activeBeat.endSec.toFixed(1)}s)` : ''}
                </Box>
            ) : null}
            <Box
                ref={containerRef}
                sx={{
                    width: '100%',
                    aspectRatio: '9 / 16',
                    bgcolor: 'common.black',
                    borderRadius: 2,
                    overflow: 'hidden',
                    boxShadow: 3,
                    position: 'relative',
                }}
            >
                <Box
                    sx={{
                        width: '100%',
                        height: scaledStageHeight > 0 ? scaledStageHeight : '100%',
                        overflow: 'hidden',
                        position: 'relative',
                    }}
                >
                    <Box
                        sx={{
                            width: HF_STAGE_WIDTH,
                            height: HF_STAGE_HEIGHT,
                            transform: `scale(${containScale})`,
                            transformOrigin: 'top left',
                        }}
                    >
                        <Box
                            component="iframe"
                            ref={iframeRef}
                            title="HTML beat preview"
                            sandbox="allow-scripts allow-same-origin"
                            srcDoc={activeHtml || EMPTY_HTML}
                            sx={{
                                width: HF_STAGE_WIDTH,
                                height: HF_STAGE_HEIGHT,
                                border: 0,
                                display: 'block',
                                bgcolor: 'common.black',
                            }}
                        />
                    </Box>
                </Box>
                <Box
                    component="audio"
                    ref={audioRef}
                    src={audioUrl}
                    preload="auto"
                    sx={{ display: 'none' }}
                />
            </Box>
        </Box>
    );
}
