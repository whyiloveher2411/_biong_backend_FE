import { getClipRenderSpec, getClipStageDimensions, type ClipAspect } from './agentVideoClipAspect';

/** @deprecated dùng getClipStageDimensions('9:16') */
export const HF_STAGE_WIDTH = 1080;
/** @deprecated dùng getClipStageDimensions('9:16') */
export const HF_STAGE_HEIGHT = 1920;

export { getClipStageDimensions, getClipRenderSpec };
export type { ClipAspect, ClipRenderSpec } from './agentVideoClipAspect';

export function computeContainScale(
    containerWidth: number,
    containerHeight?: number,
    aspect: ClipAspect = '9:16',
): number {
    if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
        return 1;
    }
    const { width, height } = getClipStageDimensions(aspect);
    const widthScale = containerWidth / width;
    if (containerHeight != null && Number.isFinite(containerHeight) && containerHeight > 0) {
        const heightScale = containerHeight / height;
        return Math.min(widthScale, heightScale);
    }
    return widthScale;
}

export function computeScaledStageHeight(scale: number, aspect: ClipAspect = '9:16'): number {
    return getClipRenderSpec(aspect).height * scale;
}
