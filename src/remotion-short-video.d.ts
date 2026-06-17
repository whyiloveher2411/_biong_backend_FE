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
