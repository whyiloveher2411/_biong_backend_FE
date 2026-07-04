export const HF_STAGE_WIDTH = 1080;
export const HF_STAGE_HEIGHT = 1920;

export function computeContainScale(containerWidth: number, containerHeight?: number): number {
    if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
        return 1;
    }
    const widthScale = containerWidth / HF_STAGE_WIDTH;
    if (containerHeight != null && Number.isFinite(containerHeight) && containerHeight > 0) {
        const heightScale = containerHeight / HF_STAGE_HEIGHT;
        return Math.min(widthScale, heightScale);
    }
    return widthScale;
}

export function computeScaledStageHeight(scale: number): number {
    return HF_STAGE_HEIGHT * scale;
}
