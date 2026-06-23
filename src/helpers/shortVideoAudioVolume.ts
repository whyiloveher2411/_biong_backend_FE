export const AUDIO_VOLUME_EPSILON = 0.001;

export function clampAudioVolume(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}

export function audioVolumePercent(volume: number): number {
    return Math.round(clampAudioVolume(volume) * 100);
}

export function audioVolumeFromPercent(percent: number): number {
    return clampAudioVolume(percent / 100);
}
