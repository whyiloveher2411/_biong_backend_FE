import type { BeatMap } from './agentVideoBeatMap';
import { resolveActiveBeatSection } from './agentVideoBeatMap';
import { seekCustomHtmlIframe } from './agentVideoCustomHtmlPreview';

const MEDIA_EVENT_TYPES = [
    'loadedmetadata',
    'durationchange',
    'timeupdate',
    'play',
    'pause',
    'ended',
    'seeked',
] as const;

type MediaEventType = typeof MEDIA_EVENT_TYPES[number];

type ProxyOptions = {
    getAudio: () => HTMLAudioElement | null;
    getIframe: () => HTMLIFrameElement | null;
    getBeatMap: () => BeatMap | null;
    getFallbackDuration: () => number;
};

export type HtmlBeatMediaProxy = HTMLVideoElement & {
    bindAudio: (audio: HTMLAudioElement) => void;
    unbindAudio: () => void;
};

function asListener(listener: EventListenerOrEventListenerObject): EventListener | null {
    if (typeof listener === 'function') {
        return listener;
    }
    if (listener && typeof listener.handleEvent === 'function') {
        return (event: Event) => listener.handleEvent(event);
    }
    return null;
}

export function createHtmlBeatMediaProxy(options: ProxyOptions): HtmlBeatMediaProxy {
    const listenerMap = new Map<string, Set<EventListener>>();
    let boundAudio: HTMLAudioElement | null = null;
    const bridgeHandlers = new Map<MediaEventType, (event: Event) => void>();

    const dispatch = (type: string, event?: Event) => {
        const handlers = listenerMap.get(type);
        if (!handlers || handlers.size === 0) {
            return;
        }
        const payload = event ?? new Event(type);
        handlers.forEach((handler) => {
            handler.call(proxy, payload);
        });
    };

    const unbindAudio = () => {
        if (!boundAudio) {
            return;
        }
        MEDIA_EVENT_TYPES.forEach((type) => {
            const handler = bridgeHandlers.get(type);
            if (handler) {
                boundAudio?.removeEventListener(type, handler);
            }
        });
        boundAudio = null;
    };

    const bindAudio = (audio: HTMLAudioElement) => {
        if (boundAudio === audio) {
            return;
        }
        unbindAudio();
        boundAudio = audio;
        MEDIA_EVENT_TYPES.forEach((type) => {
            const handler = (event: Event) => dispatch(type, event);
            bridgeHandlers.set(type, handler);
            audio.addEventListener(type, handler);
        });
        dispatch('loadedmetadata');
        dispatch('durationchange');
    };

    const proxy = {
        get currentTime() {
            return options.getAudio()?.currentTime ?? 0;
        },
        set currentTime(value: number) {
            const audio = options.getAudio();
            if (audio) {
                audio.currentTime = value;
            }
            const beatMap = options.getBeatMap();
            const beat = resolveActiveBeatSection(beatMap, value);
            const localT = beat ? Math.max(0, value - beat.startSec) : value;
            seekCustomHtmlIframe(options.getIframe(), localT);
        },
        get duration() {
            const audioDur = options.getAudio()?.duration;
            if (Number.isFinite(audioDur) && (audioDur ?? 0) > 0) {
                return audioDur as number;
            }
            return options.getFallbackDuration();
        },
        get paused() {
            return options.getAudio()?.paused ?? true;
        },
        play() {
            return options.getAudio()?.play() ?? Promise.resolve();
        },
        pause() {
            options.getAudio()?.pause();
        },
        addEventListener(
            type: string,
            listener: EventListenerOrEventListenerObject,
            _options?: boolean | AddEventListenerOptions,
        ) {
            const handler = asListener(listener);
            if (!handler) {
                return;
            }
            if (!listenerMap.has(type)) {
                listenerMap.set(type, new Set());
            }
            listenerMap.get(type)?.add(handler);
            const audio = options.getAudio();
            if (audio) {
                bindAudio(audio);
            }
        },
        removeEventListener(
            type: string,
            listener: EventListenerOrEventListenerObject,
            _options?: boolean | EventListenerOptions,
        ) {
            const handler = asListener(listener);
            if (!handler) {
                return;
            }
            listenerMap.get(type)?.delete(handler);
        },
        bindAudio,
        unbindAudio,
    } as HtmlBeatMediaProxy;

    return proxy;
}
