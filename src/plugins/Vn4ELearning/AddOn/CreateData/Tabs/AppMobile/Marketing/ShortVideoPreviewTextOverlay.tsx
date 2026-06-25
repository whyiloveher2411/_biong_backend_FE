import React from 'react';
import type { PlayerRef } from '@remotion/player';
import { Box } from '@mui/material';
import type { ShortVideoRenderManifest, ShortVideoTextClip } from 'helpers/shortVideoRenderManifest';
import { clonePreviewManifestIntoTree } from 'helpers/shortVideoPreviewManifestClone';
import {
    buildPreviewManifestWithTextOverlay,
    resolveActiveTextClipsAtSec,
    resolveTextClipBoxMaxWidthPx,
    resolveTextClipDisplayContent,
    resolveTextClipFontWeightValue,
    resolveTextClipLetterSpacingPx,
    resolveTextClipLineHeight,
    resolveTextClipRenderZIndex,
    resolveTextClipSkewXDeg,
    scaleTextClipPx,
} from 'helpers/shortVideoTextClips';
import {
    buildBackgroundMotionTransform,
    resolveBackgroundMotionStyle,
    resolveSplitBackgroundRgbaAlpha,
    resolveSplitTextOpacity,
    shouldClipBackgroundToContent,
    shouldUseSplitBackgroundLayers,
} from 'helpers/shortVideoTextClipBackgroundEffect';
import {
    buildTextClipMotionTransform,
    resolveTextClipMotionStyle,
} from 'helpers/shortVideoTextClipMotionAnimation';
import {
    resolveTextClipEnterDurationSec,
    resolveTextClipExitDurationSec,
} from 'helpers/shortVideoTextClips';

type PlayerLayout = {
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
};

type Props = {
    manifest: ShortVideoRenderManifest;
    selectedTextClipId: string;
    playerRef: React.MutableRefObject<PlayerRef | null>;
    playerInstance: PlayerRef | null;
    onPositionChange: (clipId: string, positionX: number, positionY: number) => void;
    onClearSelection?: () => void;
    children: React.ReactNode;
};

function computePlayerLayout(
    containerWidth: number,
    containerHeight: number,
    compositionWidth: number,
    compositionHeight: number
): PlayerLayout | null {
    if (containerWidth <= 0 || containerHeight <= 0) {
        return null;
    }
    const scale = Math.min(containerWidth / compositionWidth, containerHeight / compositionHeight);
    const width = Math.max(1, Math.floor(compositionWidth * scale));
    const height = Math.max(1, Math.floor(compositionHeight * scale));
    const offsetX = Math.floor((containerWidth - width) / 2);
    const offsetY = Math.floor((containerHeight - height) / 2);
    return { offsetX, offsetY, width, height };
}

function hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '').trim();
    if (!/^[0-9a-f]{3,8}$/i.test(clean)) {
        return `rgba(255, 255, 255, ${alpha})`;
    }
    const expanded = clean.length === 3
        ? clean.split('').map((char) => char + char).join('')
        : clean.slice(0, 6);
    const r = Number.parseInt(expanded.slice(0, 2), 16);
    const g = Number.parseInt(expanded.slice(2, 4), 16);
    const b = Number.parseInt(expanded.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function usePreviewCurrentTimeSec(
    playerRef: React.MutableRefObject<PlayerRef | null>,
    playerInstance: PlayerRef | null,
    fps: number
): number {
    const [currentTimeSec, setCurrentTimeSec] = React.useState(0);

    React.useEffect(() => {
        const player = playerInstance;
        if (!player) {
            setCurrentTimeSec(0);
            return;
        }
        const syncTime = () => {
            const frame = playerRef.current?.getCurrentFrame() ?? 0;
            setCurrentTimeSec(frame / fps);
        };
        syncTime();
        player.addEventListener('timeupdate', syncTime);
        player.addEventListener('frameupdate', syncTime);
        player.addEventListener('seeked', syncTime);
        return () => {
            player.removeEventListener('timeupdate', syncTime);
            player.removeEventListener('frameupdate', syncTime);
            player.removeEventListener('seeked', syncTime);
        };
    }, [fps, playerInstance, playerRef]);

    return currentTimeSec;
}

type TextClipOverlayItemProps = {
    clip: ShortVideoTextClip;
    manifest: ShortVideoRenderManifest;
    playerLayout: PlayerLayout;
    compositionWidth: number;
    compositionHeight: number;
    currentTimeSec: number;
    isSelected: boolean;
    onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
};

function TextClipOverlayItem({
    clip,
    manifest,
    playerLayout,
    compositionWidth,
    compositionHeight,
    currentTimeSec,
    isSelected,
    onPointerDown,
    onPointerMove,
    onPointerUp,
}: TextClipOverlayItemProps) {
    const localSec = Math.max(0, currentTimeSec - clip.start_sec);
    const motionStyle = resolveTextClipMotionStyle(clip, localSec, {
        enterDurationSec: resolveTextClipEnterDurationSec(clip),
        exitDurationSec: resolveTextClipExitDurationSec(clip),
        clipDurationSec: clip.duration_sec,
    });
    const useSplitLayers = shouldUseSplitBackgroundLayers(
        clip.background_color,
        clip.background_effect
    );
    const bgMotionStyle = useSplitLayers && clip.background_effect
        ? resolveBackgroundMotionStyle(motionStyle, clip.background_effect)
        : motionStyle;
    const previewOpacity = useSplitLayers
        ? resolveSplitTextOpacity(clip.opacity ?? 100, motionStyle.opacityFactor)
        : ((clip.opacity ?? 100) / 100) * motionStyle.opacityFactor;
    const previewBackground = clip.background_color
        ? hexToRgba(
            clip.background_color,
            useSplitLayers && clip.background_effect
                ? resolveSplitBackgroundRgbaAlpha(
                    clip.background_opacity ?? 100,
                    bgMotionStyle.opacityFactor,
                    clip.background_effect
                )
                : ((clip.background_opacity ?? 100) / 100) * motionStyle.opacityFactor
        )
        : undefined;
    const scaledFontSize = scaleTextClipPx(clip.font_size ?? 48, compositionWidth, playerLayout.width);
    const scaledMaxWidth = scaleTextClipPx(
        resolveTextClipBoxMaxWidthPx(clip, compositionWidth),
        compositionWidth,
        playerLayout.width
    );
    const scaledPaddingX = scaleTextClipPx(clip.padding_x ?? 16, compositionWidth, playerLayout.width);
    const scaledPaddingY = scaleTextClipPx(clip.padding_y ?? 8, compositionHeight, playerLayout.height);
    const scaledBorderRadius = scaleTextClipPx(clip.border_radius ?? 0, compositionWidth, playerLayout.width);
    const letterSpacingPx = resolveTextClipLetterSpacingPx(clip);
    const scaledLetterSpacing = letterSpacingPx !== undefined
        ? scaleTextClipPx(letterSpacingPx, compositionWidth, playerLayout.width)
        : undefined;
    const zIndex = resolveTextClipRenderZIndex(manifest, clip);
    const skewDeg = resolveTextClipSkewXDeg(clip);
    const skewParts = skewDeg !== 0 ? [`skewX(${skewDeg}deg)`] : [];
    const motionTransform = buildTextClipMotionTransform(motionStyle, skewParts);
    const bgMotionTransform = useSplitLayers
        ? buildBackgroundMotionTransform(bgMotionStyle)
        : undefined;
    const clipOverflowHidden = useSplitLayers
        && shouldClipBackgroundToContent(clip.background_effect);

    const sharedTextSx = {
        color: clip.color ?? '#FFFFFF',
        fontSize: Math.max(10, scaledFontSize),
        fontWeight: resolveTextClipFontWeightValue(clip),
        textAlign: clip.text_align ?? 'center',
        lineHeight: resolveTextClipLineHeight(clip),
        letterSpacing: scaledLetterSpacing !== undefined
            ? `${scaledLetterSpacing}px`
            : undefined,
        textTransform: clip.text_transform ?? 'none',
        whiteSpace: 'pre-wrap' as const,
        wordBreak: 'normal' as const,
        overflowWrap: 'normal' as const,
        userSelect: 'none' as const,
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                left: `${clip.position_x ?? 50}%`,
                top: `${clip.position_y ?? 50}%`,
                transform: 'translate(-50%, -50%)',
                width: scaledMaxWidth,
                maxWidth: scaledMaxWidth,
                textAlign: clip.text_align ?? 'center',
                zIndex,
                pointerEvents: isSelected ? 'auto' : 'none',
            }}
        >
            {useSplitLayers ? (
                <Box
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    sx={{
                        position: 'relative',
                        display: 'inline-block',
                        boxSizing: 'border-box',
                        width: 'max-content',
                        maxWidth: '100%',
                        overflow: clipOverflowHidden ? 'hidden' : undefined,
                        borderRadius: `${scaledBorderRadius}px`,
                        cursor: isSelected ? 'grab' : 'default',
                        border: isSelected ? '1px dashed' : '1px solid transparent',
                        borderColor: isSelected ? 'warning.main' : 'transparent',
                        boxShadow: isSelected ? '0 0 0 1px rgba(0,0,0,0.35)' : 'none',
                        touchAction: isSelected ? 'none' : 'auto',
                    }}
                >
                    <Box
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: `${scaledBorderRadius}px`,
                            bgcolor: previewBackground,
                            transform: bgMotionTransform,
                            transformOrigin: 'center center',
                            pointerEvents: 'none',
                        }}
                    />
                    <Box
                        sx={{
                            position: 'relative',
                            display: 'inline-block',
                            boxSizing: 'border-box',
                            width: 'max-content',
                            maxWidth: '100%',
                            px: `${scaledPaddingX}px`,
                            py: `${scaledPaddingY}px`,
                            transform: motionTransform,
                            transformOrigin: 'center center',
                            opacity: previewOpacity,
                            ...sharedTextSx,
                        }}
                    >
                        {resolveTextClipDisplayContent(clip)}
                    </Box>
                </Box>
            ) : (
                <Box
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    sx={{
                        display: 'inline-block',
                        boxSizing: 'border-box',
                        width: 'max-content',
                        maxWidth: '100%',
                        transform: motionTransform,
                        transformOrigin: 'center center',
                        cursor: isSelected ? 'grab' : 'default',
                        opacity: previewOpacity,
                        px: `${scaledPaddingX}px`,
                        py: `${scaledPaddingY}px`,
                        borderRadius: `${scaledBorderRadius}px`,
                        bgcolor: previewBackground,
                        border: isSelected ? '1px dashed' : '1px solid transparent',
                        borderColor: isSelected ? 'warning.main' : 'transparent',
                        boxShadow: isSelected ? '0 0 0 1px rgba(0,0,0,0.35)' : 'none',
                        touchAction: isSelected ? 'none' : 'auto',
                        ...sharedTextSx,
                    }}
                >
                    {resolveTextClipDisplayContent(clip)}
                </Box>
            )}
        </Box>
    );
}

export default function ShortVideoPreviewTextOverlay({
    manifest,
    selectedTextClipId,
    playerRef,
    playerInstance,
    onPositionChange,
    onClearSelection,
    children,
}: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [containerSize, setContainerSize] = React.useState({ width: 0, height: 0 });
    const currentTimeSec = usePreviewCurrentTimeSec(playerRef, playerInstance, manifest.fps || 30);
    const dragStateRef = React.useRef<{
        clipId: string;
        pointerId: number;
    } | null>(null);

    const compositionWidth = manifest.width || 1080;
    const compositionHeight = manifest.height || 1920;

    const playerLayout = React.useMemo(
        () => computePlayerLayout(
            containerSize.width,
            containerSize.height,
            compositionWidth,
            compositionHeight
        ),
        [containerSize.height, containerSize.width, compositionHeight, compositionWidth]
    );

    const previewManifest = React.useMemo(
        () => buildPreviewManifestWithTextOverlay(manifest, currentTimeSec, selectedTextClipId),
        [currentTimeSec, manifest, selectedTextClipId]
    );

    const overlayClips = React.useMemo(() => {
        if (!selectedTextClipId) {
            return [];
        }
        return resolveActiveTextClipsAtSec(manifest, currentTimeSec);
    }, [currentTimeSec, manifest, selectedTextClipId]);

    React.useEffect(() => {
        const node = containerRef.current;
        if (!node) {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (!entry) {
                return;
            }
            setContainerSize({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            });
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const handlePointerDown = React.useCallback((clipId: string) => (
        event: React.PointerEvent<HTMLDivElement>
    ) => {
        if (!playerLayout) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        dragStateRef.current = {
            clipId,
            pointerId: event.pointerId,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
    }, [playerLayout]);

    const handlePointerMove = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragStateRef.current;
        if (!drag || drag.pointerId !== event.pointerId || !playerLayout) {
            return;
        }
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (!containerRect) {
            return;
        }
        const localX = event.clientX - containerRect.left - playerLayout.offsetX;
        const localY = event.clientY - containerRect.top - playerLayout.offsetY;
        const positionX = Math.max(0, Math.min(100, (localX / playerLayout.width) * 100));
        const positionY = Math.max(0, Math.min(100, (localY / playerLayout.height) * 100));
        onPositionChange(drag.clipId, positionX, positionY);
    }, [onPositionChange, playerLayout]);

    const handlePointerUp = React.useCallback((event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragStateRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        dragStateRef.current = null;
        event.currentTarget.releasePointerCapture(event.pointerId);
    }, []);

    const handleOverlayBackgroundClick = React.useCallback((event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) {
            onClearSelection?.();
        }
    }, [onClearSelection]);

    const previewChild = clonePreviewManifestIntoTree(children, previewManifest);

    return (
        <Box
            ref={containerRef}
            sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 0,
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {previewChild}
            {overlayClips.length > 0 && playerLayout ? (
                <Box
                    onClick={handleOverlayBackgroundClick}
                    sx={{
                        position: 'absolute',
                        left: playerLayout.offsetX,
                        top: playerLayout.offsetY,
                        width: playerLayout.width,
                        height: playerLayout.height,
                        pointerEvents: 'none',
                    }}
                >
                    {overlayClips.map((clip) => {
                        const isSelected = clip.id === selectedTextClipId;
                        return (
                            <TextClipOverlayItem
                                key={clip.id}
                                clip={clip}
                                manifest={manifest}
                                playerLayout={playerLayout}
                                compositionWidth={compositionWidth}
                                compositionHeight={compositionHeight}
                                currentTimeSec={currentTimeSec}
                                isSelected={isSelected}
                                onPointerDown={isSelected ? handlePointerDown(clip.id) : undefined}
                                onPointerMove={isSelected ? handlePointerMove : undefined}
                                onPointerUp={isSelected ? handlePointerUp : undefined}
                            />
                        );
                    })}
                </Box>
            ) : null}
        </Box>
    );
}
