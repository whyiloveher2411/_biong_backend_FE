declare module '@spacedev/remotion-short-video/compositionTimeline' {
    import type { ShortVideoRenderManifest } from 'helpers/shortVideoRenderManifest';

    export function manifestSecToCompositionSec(
        manifest: ShortVideoRenderManifest,
        manifestSec: number
    ): number;

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
}

declare module '@spacedev/remotion-short-video/types' {
    export type {
        ShortVideoRenderManifest as RenderManifest,
        ShortVideoManifestScene,
        ShortVideoManifestWord,
        ShortVideoManifestSceneLayout,
    } from 'helpers/shortVideoRenderManifestTypes';
}
