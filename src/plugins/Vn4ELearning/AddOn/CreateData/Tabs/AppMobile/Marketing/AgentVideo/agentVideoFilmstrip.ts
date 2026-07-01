import { AGENT_VIDEO_TRACK_ROW_HEIGHT } from './agentVideoTimelineModel';
import {
    AGENT_VIDEO_FILMSTRIP_INTERVAL_SEC,
    AGENT_VIDEO_TIMELINE_SCALE,
    AGENT_VIDEO_TIMELINE_SCALE_WIDTH,
} from './agentVideoFilmstripConstants';

export {
    AGENT_VIDEO_FILMSTRIP_CAPTURE_VERSION,
    AGENT_VIDEO_FILMSTRIP_INTERVAL_SEC,
    AGENT_VIDEO_TIMELINE_SCALE,
    AGENT_VIDEO_TIMELINE_SCALE_WIDTH,
} from './agentVideoFilmstripConstants';

const FILMSTRIP_JPEG_QUALITY = 0.85;
const SEEK_TIMEOUT_MS = 12000;
const MAX_CAPTURE_DEVICE_PIXEL_RATIO = 2;

const blobUrlCache = new Map<string, Promise<string>>();

export function resolveFilmstripTileDisplayWidthPx(): number {
    return (AGENT_VIDEO_FILMSTRIP_INTERVAL_SEC * AGENT_VIDEO_TIMELINE_SCALE_WIDTH)
        / AGENT_VIDEO_TIMELINE_SCALE;
}

export function resolveFilmstripTileDisplayHeightPx(): number {
    return AGENT_VIDEO_TRACK_ROW_HEIGHT;
}

export function resolveFilmstripCaptureScale(): number {
    if (typeof window === 'undefined') {
        return 1;
    }
    return Math.min(window.devicePixelRatio || 1, MAX_CAPTURE_DEVICE_PIXEL_RATIO);
}

export function resolveFilmstripCaptureDimensions(): { width: number; height: number } {
    const scale = resolveFilmstripCaptureScale();
    return {
        width: Math.round(resolveFilmstripTileDisplayWidthPx() * scale),
        height: Math.round(resolveFilmstripTileDisplayHeightPx() * scale),
    };
}

export function resolveFilmstripFrameCount(durationSec: number): number {
    const duration = Math.max(0, durationSec);
    if (duration <= 0) {
        return 0;
    }
    return Math.max(1, Math.ceil(duration / AGENT_VIDEO_FILMSTRIP_INTERVAL_SEC));
}

export function resolveFilmstripTimestamps(durationSec: number): number[] {
    const duration = Math.max(0, durationSec);
    const frameCount = resolveFilmstripFrameCount(duration);
    if (frameCount <= 0) {
        return [];
    }

    const maxTime = Math.max(0, duration - 0.05);
    const timestamps: number[] = [];
    for (let index = 0; index < frameCount; index += 1) {
        const timeSec = Math.min(index * AGENT_VIDEO_FILMSTRIP_INTERVAL_SEC, maxTime);
        timestamps.push(timeSec);
    }
    return timestamps;
}

function resolveAbsoluteVideoUrl(videoUrl: string): string {
    try {
        return new URL(videoUrl, window.location.href).href;
    } catch {
        return videoUrl;
    }
}

function isCrossOriginUrl(url: string): boolean {
    try {
        return new URL(url).origin !== window.location.origin;
    } catch {
        return false;
    }
}

function isAdminAgentVideoStreamUrl(url: string): boolean {
    return url.includes('/short-video/stream-agent-video');
}

function shouldIncludeCredentials(url: string): boolean {
    return isAdminAgentVideoStreamUrl(url) || !isCrossOriginUrl(url);
}

function shouldUseDirectStreamVideoSource(url: string): boolean {
    return isAdminAgentVideoStreamUrl(url);
}

function normalizeVideoSrc(src: string): string {
    return resolveAbsoluteVideoUrl(String(src || '').trim());
}

function isSameVideoSource(video: HTMLVideoElement, videoUrl: string): boolean {
    const target = normalizeVideoSrc(videoUrl);
    const current = normalizeVideoSrc(video.currentSrc || video.src);
    return current !== '' && current === target;
}

function waitForVideoEvent(
    video: HTMLVideoElement,
    eventName: 'loadedmetadata' | 'loadeddata' | 'seeked' | 'error',
    timeoutMs: number,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const timer = window.setTimeout(() => {
            cleanup();
            reject(new Error(`Video ${eventName} timeout`));
        }, timeoutMs);

        const onSuccess = () => {
            cleanup();
            resolve();
        };
        const onError = () => {
            cleanup();
            reject(new Error(`Video ${eventName} failed`));
        };

        const cleanup = () => {
            window.clearTimeout(timer);
            video.removeEventListener(eventName, onSuccess);
            video.removeEventListener('error', onError);
        };

        video.addEventListener(eventName, onSuccess, { once: true });
        video.addEventListener('error', onError, { once: true });
    });
}

async function seekVideo(
    video: HTMLVideoElement,
    timeSec: number,
    signal?: AbortSignal,
): Promise<void> {
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
    if (Math.abs(video.currentTime - timeSec) < 0.02 && video.readyState >= 2) {
        return;
    }
    try {
        video.currentTime = timeSec;
    } catch {
        throw new Error('Video seek failed');
    }
    await waitForVideoEvent(video, 'seeked', SEEK_TIMEOUT_MS);
    if (video.readyState < 2) {
        await waitForVideoEvent(video, 'loadeddata', SEEK_TIMEOUT_MS);
    }
    await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
    });
}

function resolveCoverCropRect(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
): { sx: number; sy: number; sw: number; sh: number } {
    const sourceAspect = sourceWidth / sourceHeight;
    const targetAspect = targetWidth / targetHeight;

    if (sourceAspect > targetAspect) {
        const sh = sourceHeight;
        const sw = sh * targetAspect;
        return {
            sx: (sourceWidth - sw) / 2,
            sy: 0,
            sw,
            sh,
        };
    }

    const sw = sourceWidth;
    const sh = sw / targetAspect;
    return {
        sx: 0,
        sy: (sourceHeight - sh) / 2,
        sw,
        sh,
    };
}

function captureVideoFrame(video: HTMLVideoElement): string {
    const { width, height } = resolveFilmstripCaptureDimensions();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Canvas context unavailable');
    }

    const crop = resolveCoverCropRect(
        video.videoWidth,
        video.videoHeight,
        width,
        height,
    );
    ctx.drawImage(
        video,
        crop.sx,
        crop.sy,
        crop.sw,
        crop.sh,
        0,
        0,
        width,
        height,
    );
    return canvas.toDataURL('image/jpeg', FILMSTRIP_JPEG_QUALITY);
}

export function canCaptureVideoFrame(video: HTMLVideoElement): boolean {
    if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return false;
    }
    try {
        captureVideoFrame(video);
        return true;
    } catch {
        return false;
    }
}

async function getBlobVideoUrl(videoUrl: string, signal?: AbortSignal): Promise<string> {
    const absoluteUrl = resolveAbsoluteVideoUrl(videoUrl);
    const cached = blobUrlCache.get(absoluteUrl);
    if (cached) {
        return cached;
    }

    const promise = (async () => {
        const response = await fetch(absoluteUrl, {
            mode: 'cors',
            credentials: shouldIncludeCredentials(absoluteUrl) ? 'include' : 'omit',
            signal,
        });
        if (!response.ok) {
            throw new Error(`Fetch video failed: ${response.status}`);
        }
        const blob = await response.blob();
        if (!blob.size) {
            throw new Error('Empty video blob');
        }
        return URL.createObjectURL(blob);
    })();

    blobUrlCache.set(absoluteUrl, promise);
    try {
        return await promise;
    } catch (error) {
        blobUrlCache.delete(absoluteUrl);
        throw error;
    }
}

async function loadFilmstripVideo(
    videoUrl: string,
    signal?: AbortSignal,
): Promise<HTMLVideoElement> {
    const absoluteUrl = resolveAbsoluteVideoUrl(videoUrl);
    let objectUrl: string | null = null;

    if (shouldUseDirectStreamVideoSource(absoluteUrl)) {
        objectUrl = null;
    } else if (!isCrossOriginUrl(absoluteUrl)) {
        try {
            objectUrl = await getBlobVideoUrl(absoluteUrl, signal);
        } catch {
            objectUrl = null;
        }
    }

    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    if (!objectUrl && isCrossOriginUrl(absoluteUrl)) {
        video.crossOrigin = 'anonymous';
    }

    video.src = objectUrl ?? absoluteUrl;

    if (signal?.aborted) {
        video.src = '';
        throw new DOMException('Aborted', 'AbortError');
    }

    await waitForVideoEvent(video, 'loadedmetadata', SEEK_TIMEOUT_MS);
    if (video.readyState < 2) {
        await waitForVideoEvent(video, 'loadeddata', SEEK_TIMEOUT_MS);
    }

    return video;
}

type CaptureOptions = {
    signal?: AbortSignal;
    onThumbnail?: (thumbnails: string[]) => void;
    previewVideo?: HTMLVideoElement | null;
};

async function captureFilmstripFromVideo(
    video: HTMLVideoElement,
    durationSec: number,
    options?: CaptureOptions,
): Promise<string[]> {
    const duration = Math.max(0, durationSec);
    const timestamps = resolveFilmstripTimestamps(duration);
    if (timestamps.length === 0) {
        return [];
    }

    if (!canCaptureVideoFrame(video)) {
        return [];
    }

    const resolvedDuration = Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : duration;

    video.pause();
    const thumbnails: string[] = [];

    for (const timestamp of timestamps) {
        if (options?.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        try {
            const clampedTime = Math.min(timestamp, Math.max(0, resolvedDuration - 0.05));
            await seekVideo(video, clampedTime, options?.signal);
            thumbnails.push(captureVideoFrame(video));
            options?.onThumbnail?.(thumbnails);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
            }
            // skip failed frame, continue with next timestamp
        }
    }

    return thumbnails;
}

async function waitForPreviewVideo(
    previewVideo: HTMLVideoElement | null | undefined,
    videoUrl: string,
    signal?: AbortSignal,
): Promise<HTMLVideoElement | null> {
    if (!previewVideo) {
        return null;
    }
    if (!isSameVideoSource(previewVideo, videoUrl)) {
        return null;
    }
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
    if (previewVideo.readyState >= 1) {
        return previewVideo;
    }

    await waitForVideoEvent(previewVideo, 'loadedmetadata', SEEK_TIMEOUT_MS);
    return previewVideo;
}

export async function generateAgentVideoFilmstrip(
    videoUrl: string,
    durationSec: number,
    options?: CaptureOptions,
): Promise<string[]> {
    const url = String(videoUrl || '').trim();
    const duration = Math.max(0, durationSec);
    if (!url || duration <= 0) {
        return [];
    }

    const preview = await waitForPreviewVideo(options?.previewVideo, url, options?.signal);
    if (
        preview
        && canCaptureVideoFrame(preview)
        && !shouldUseDirectStreamVideoSource(url)
    ) {
        const savedTime = preview.currentTime;
        const wasPaused = preview.paused;
        try {
            return await captureFilmstripFromVideo(preview, duration, options);
        } finally {
            try {
                preview.currentTime = savedTime;
            } catch {
                // ignore restore seek errors
            }
            if (!wasPaused) {
                void preview.play().catch(() => undefined);
            }
        }
    }

    let video: HTMLVideoElement | null = null;
    let ownsVideo = false;
    try {
        video = await loadFilmstripVideo(url, options?.signal);
        ownsVideo = true;
        return await captureFilmstripFromVideo(video, duration, options);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw error;
        }
        return [];
    } finally {
        if (ownsVideo && video) {
            video.src = '';
            video.load();
        }
    }
}
