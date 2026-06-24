declare module '@spacedev/remotion-short-video/compositionTimeline' {
    import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';

    export function getProjectTimelineDurationSec(
        manifest: ShortVideoRenderManifest
    ): number;

    export function isProjectTimeInRange(
        startSec: number,
        durationSec: number,
        timeSec: number
    ): boolean;

    export function sceneTimelineDurationSec(
        scene: ShortVideoRenderManifest['scenes'][number]
    ): number;

    /** @deprecated Timeline NLE: identity mapping — giữ để tương thích import cũ. */
    export function manifestSecToCompositionSec(
        manifest: ShortVideoRenderManifest,
        manifestSec: number
    ): number;

    /** @deprecated Timeline NLE: identity mapping — giữ để tương thích import cũ. */
    export function compositionSecToManifestSec(
        manifest: ShortVideoRenderManifest,
        compositionSec: number
    ): number;

    export function getCompositionDurationSec(
        manifest: ShortVideoRenderManifest
    ): number;

    export function getSceneCompositionRange(
        manifest: ShortVideoRenderManifest,
        sceneId: string
    ): { startSec: number; endSec: number } | null;

    export function calcCompositionDurationInFrames(
        manifest: ShortVideoRenderManifest
    ): number;
}

declare module '@spacedev/remotion-short-video/ShortVideoComposition' {
    import type { ComponentType } from 'react';
    import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';

    export const ShortVideoComposition: ComponentType<{
        manifest: ShortVideoRenderManifest;
    }>;

    export function calcCompositionDurationInFrames(
        manifest: ShortVideoRenderManifest
    ): number;

    export function getProjectTimelineDurationSec(
        manifest: ShortVideoRenderManifest
    ): number;

    export function sceneTimelineDurationSec(
        scene: ShortVideoRenderManifest['scenes'][number]
    ): number;
}

declare module '@spacedev/remotion-short-video/types' {
    export type {
        ShortVideoRenderManifest as RenderManifest,
        ShortVideoManifestScene,
        ShortVideoManifestWord,
        ShortVideoManifestSceneLayout,
    } from 'helpers/shortVideoRenderManifestTypes';
}

declare module '@spacedev/remotion-short-video/visualBackgroundGradient' {
    import type {
        ShortVideoVisualBackgroundGradient,
        ShortVideoVisualGradientDirection,
        ShortVideoVisualGradientStop,
    } from 'helpers/shortVideoRenderManifestTypes';
    import type { ShortVideoVisualClip, ShortVideoManifestSceneLayout } from 'helpers/shortVideoRenderManifestTypes';

    type VisualLayoutSource = Pick<
        ShortVideoVisualClip,
        'visual_background_mode' | 'visual_background_color' | 'visual_background_gradient'
    >;

    export const VISUAL_GRADIENT_DIRECTION_OPTIONS: Array<{
        value: ShortVideoVisualGradientDirection;
        label: string;
    }>;

    export const DEFAULT_VISUAL_BACKGROUND_GRADIENT: ShortVideoVisualBackgroundGradient;

    export function buildLinearGradientCss(
        gradient: ShortVideoVisualBackgroundGradient
    ): string;

    export function createDefaultVisualBackgroundGradient(): ShortVideoVisualBackgroundGradient;

    export function createGradientFromSolidColor(
        color: string,
        direction?: ShortVideoVisualGradientDirection
    ): ShortVideoVisualBackgroundGradient;

    export function getGradientStopEdgeLabel(
        direction: ShortVideoVisualGradientDirection,
        index: number,
        total: number
    ): string;

    export function getGradientStopMarkerCoords(
        direction: ShortVideoVisualGradientDirection,
        position: number
    ): { leftPercent: number; topPercent: number };

    export function isColorBackgroundGradient(
        source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
    ): boolean;

    export function normalizeTwoStopPositions(
        gradient: ShortVideoVisualBackgroundGradient
    ): ShortVideoVisualBackgroundGradient;

    export function normalizeVisualBackgroundGradient(
        raw: Partial<ShortVideoVisualBackgroundGradient> | undefined
    ): ShortVideoVisualBackgroundGradient;

    export function resolveActiveColorGradient(
        source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
    ): ShortVideoVisualBackgroundGradient | null;

    export function resolveGradientPreviewAxis(
        direction: ShortVideoVisualGradientDirection
    ): 'vertical' | 'horizontal' | 'diagonal';

    export function resolveGradientStopPositionFromPointer(
        direction: ShortVideoVisualGradientDirection,
        rect: DOMRect,
        clientX: number,
        clientY: number
    ): number;

    export function resolveVisualBackgroundGradient(
        source: VisualLayoutSource | ShortVideoManifestSceneLayout | undefined
    ): ShortVideoVisualBackgroundGradient;

    export function sortGradientStops(
        stops: ShortVideoVisualGradientStop[]
    ): ShortVideoVisualGradientStop[];

    export function stopColorToRgba(stop: ShortVideoVisualGradientStop): string;
}

/** Subpath mới trong remotion-short-video/src — tránh lỗi TS khi thêm module Remotion. */
declare module '@spacedev/remotion-short-video/*';
