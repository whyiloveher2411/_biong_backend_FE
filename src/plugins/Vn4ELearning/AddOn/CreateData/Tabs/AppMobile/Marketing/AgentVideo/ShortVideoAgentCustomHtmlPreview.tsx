import React from 'react';
import { Box } from '@mui/material';
import { resolveActiveBeatSection, type BeatMap } from './agentVideoBeatMap';
import { createHtmlBeatMediaProxy, type HtmlBeatMediaProxy } from './agentVideoHtmlBeatMediaProxy';
import {
    computeContainScale,
    HF_STAGE_HEIGHT,
    HF_STAGE_WIDTH,
} from './agentVideoHtmlBeatPreviewScale';
import { seekCustomHtmlIframe } from './agentVideoCustomHtmlPreview';
import ShortVideoAgentAvatarPipOverlay from './ShortVideoAgentAvatarPipOverlay';
import type { AvatarPipAnchor } from './agentVideoApi';

type Props = {
    beatMap: BeatMap | null;
    beatHtml: Record<string, { html?: string; updated_at?: string }>;
    audioUrl: string;
    audioDurationSec: number | null;
    videoRef: React.Ref<HTMLVideoElement>;
    showAvatarPip?: boolean;
    avatarMasterUrl?: string;
    avatarAnchor?: AvatarPipAnchor | string;
    showKaraoke?: boolean;
};

const EMPTY_HTML = '<html><body style="margin:0;background:#111;color:#666;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif">Chưa có HTML beat</body></html>';

export default function ShortVideoAgentCustomHtmlPreview({
    beatMap,
    beatHtml,
    audioUrl,
    audioDurationSec,
    videoRef,
    showAvatarPip = false,
    avatarMasterUrl = '',
    avatarAnchor = 'bottom_right',
    showKaraoke = true,
}: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const beatMapRef = React.useRef(beatMap);
    const audioDurationSecRef = React.useRef(audioDurationSec);
    const [localTimeSec, setLocalTimeSec] = React.useState(0);
    const [containerWidth, setContainerWidth] = React.useState(0);
    const [containerHeight, setContainerHeight] = React.useState(0);

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
    const activeHtmlRevision = activeBeat
        ? `${activeBeat.id}:${beatHtml[activeBeat.id]?.updated_at || ''}:${activeHtml.length}`
        : 'empty';

    React.useImperativeHandle(videoRef, () => mediaProxyRef.current as HtmlBeatMediaProxy, []);

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }

        const updateSize = () => {
            setContainerWidth(container.clientWidth);
            setContainerHeight(container.clientHeight);
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        return () => {
            observer.disconnect();
        };
    }, []);

    const containScale = computeContainScale(
        containerWidth || 360,
        containerHeight > 0 ? containerHeight : undefined,
    );

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
        <Box
            ref={containerRef}
            sx={{
                width: '100%',
                height: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                boxShadow: 3,
                position: 'relative',
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                }}
            >
                <Box
                    sx={{
                        width: HF_STAGE_WIDTH * containScale,
                        height: HF_STAGE_HEIGHT * containScale,
                        position: 'relative',
                        flexShrink: 0,
                    }}
                >
                    <Box
                        sx={{
                            width: HF_STAGE_WIDTH,
                            height: HF_STAGE_HEIGHT,
                            transform: `scale(${containScale})`,
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                        }}
                    >
                        <Box
                            component="iframe"
                            key={activeHtmlRevision}
                            ref={iframeRef}
                            title="HTML beat preview"
                            sandbox="allow-scripts allow-same-origin"
                            srcDoc={activeHtml || EMPTY_HTML}
                            sx={{
                                width: HF_STAGE_WIDTH,
                                height: HF_STAGE_HEIGHT,
                                border: 0,
                                display: 'block',
                            }}
                        />
                        <ShortVideoAgentAvatarPipOverlay
                            show={Boolean(showAvatarPip)}
                            masterUrl={avatarMasterUrl}
                            anchor={avatarAnchor}
                            showKaraoke={showKaraoke}
                            stageMode
                        />
                    </Box>
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
    );
}
