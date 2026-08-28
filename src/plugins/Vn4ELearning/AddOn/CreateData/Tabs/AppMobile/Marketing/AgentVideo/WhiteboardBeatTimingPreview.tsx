import React from 'react';
import { Box, Typography } from '@mui/material';
import type { BeatImageOverlay, BeatRegion, BeatTimelineEffect } from './agentVideoApi';
import { resolveZoomTransformAt, zoomTransformToCss } from './beatTimelineEffects/resolveZoomTransform';
import {
    resolveAttentionFxAt,
    resolveAttentionWindow,
    resolveOverlayEndSec,
    resolveOverlayStartSec,
} from './regionAttentionTiming';
import {
    beatPlayheadToVideoSec,
    resolveRegionEndSec,
    resolveRegionStartSec,
} from './regionTimelineTiming';

type Word = { index: number; text: string; start: number };

type Props = {
    imageUrl: string;
    /** Khi có: nền = custom bg; chỉ vùng cắt hiện từ ảnh beat; lỗ chưa lộ không phủ BOARD_COLOR. */
    customBackgroundUrl?: string;
    /** Dán toàn bộ ảnh beat lên custom bg — vùng chưa lộ được che lại bằng custom bg. */
    beatImageOverBackground?: boolean;
    regions: BeatRegion[];
    imageOverlays?: BeatImageOverlay[];
    playheadSec: number;
    durationSec: number;
    sceneBudgetSec?: number;
    beatStartSec: number;
    beatWords: Word[];
    timelineEffects?: BeatTimelineEffect[];
};

const BOARD_COLOR = '#efe6d4';

type MaskRect = { left: number; top: number; w: number; h: number };

/**
 * Lớp che vùng chưa lộ: bảng trắng (mặc định) hoặc chính custom bg khi ảnh beat
 * được dán full lên background. `rect` (ratio canvas) giới hạn phần bị che.
 */
function RegionMaskFill({
    clip,
    rect,
    opacity,
    backgroundUrl,
}: {
    clip: string;
    rect?: MaskRect;
    opacity?: number;
    backgroundUrl?: string;
}) {
    const src = String(backgroundUrl || '').trim();
    const area: MaskRect = rect || { left: 0, top: 0, w: 1, h: 1 };
    const fill = src !== '' ? (
        <Box
            component="img"
            src={src}
            alt=""
            draggable={false}
            sx={{
                position: 'absolute',
                left: `${(-area.left / area.w) * 100}%`,
                top: `${(-area.top / area.h) * 100}%`,
                width: `${(1 / area.w) * 100}%`,
                height: `${(1 / area.h) * 100}%`,
                objectFit: 'fill',
                display: 'block',
            }}
        />
    ) : (
        <Box sx={{ position: 'absolute', inset: 0, bgcolor: BOARD_COLOR }} />
    );
    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                clipPath: clip,
                WebkitClipPath: clip,
                opacity,
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    left: `${area.left * 100}%`,
                    top: `${area.top * 100}%`,
                    width: `${area.w * 100}%`,
                    height: `${area.h * 100}%`,
                    overflow: 'hidden',
                }}
            >
                {fill}
            </Box>
        </Box>
    );
}

function regionProgress(
    region: BeatRegion,
    playheadSec: number,
    beatWords: Word[],
    beatStartSec: number,
    duration: number,
    hasChildren: boolean,
): number {
    if (region.parent_leftover_instant && hasChildren) {
        const start = resolveRegionStartSec(region, beatWords, beatStartSec, duration);
        // start_sec>0: vẫn chờ mốc rồi mới hiện (khớp engine) — không ép progress=1 từ đầu beat.
        if (!(Number.isFinite(start) && start > 1e-6)) {
            return 1;
        }
    }
    const start = resolveRegionStartSec(region, beatWords, beatStartSec, duration);
    const end = Math.max(start + 0.05, resolveRegionEndSec(region, beatWords, beatStartSec, duration));
    if (playheadSec <= start) {
        return 0;
    }
    if (playheadSec >= end) {
        return 1;
    }
    return (playheadSec - start) / (end - start);
}

function polygonClip(points: [number, number][]): string {
    return `polygon(${points.map((point) => `${(point[0] * 100).toFixed(3)}% ${(point[1] * 100).toFixed(3)}%`).join(', ')})`;
}

function polygonCentroid(points: [number, number][]): { x: number; y: number } {
    const bbox = polygonBBox(points);
    return { x: bbox.minX + bbox.w / 2, y: bbox.minY + bbox.h / 2 };
}

function polygonSvgPoints(points: [number, number][]): string {
    return points.map((point) => `${(point[0] * 100).toFixed(3)},${(point[1] * 100).toFixed(3)}`).join(' ');
}

function AttentionLocalFx({
    clip,
    fx,
    imageUrl,
    originX,
    originY,
    bboxW,
    bboxH,
}: {
    clip: string;
    fx: ReturnType<typeof resolveAttentionFxAt>;
    imageUrl: string;
    originX: number;
    originY: number;
    bboxW: number;
    bboxH: number;
}) {
    if (!fx.enabled || fx.type === 'none' || fx.type === 'breathe' || fx.type === 'spotlight' || fx.type === 'god_rays') {
        return null;
    }
    const env = fx.envelope;
    const strength = fx.intensity * env;
    const shift = (0.35 + fx.intensity * 0.9) * env;
    if (fx.type === 'glitch') {
        return (
            <>
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        clipPath: clip,
                        transform: `translate(${shift}%, 0)`,
                        mixBlendMode: 'screen',
                        opacity: (0.55 + fx.intensity * 0.25) * env,
                        pointerEvents: 'none',
                    }}
                >
                    <Box
                        component="img"
                        src={imageUrl}
                        alt=""
                        draggable={false}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'fill',
                            filter: 'url(#att-glitch-red)',
                        }}
                    />
                </Box>
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        clipPath: clip,
                        transform: `translate(${-shift}%, 0)`,
                        mixBlendMode: 'screen',
                        opacity: (0.55 + fx.intensity * 0.25) * env,
                        pointerEvents: 'none',
                    }}
                >
                    <Box
                        component="img"
                        src={imageUrl}
                        alt=""
                        draggable={false}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'fill',
                            filter: 'hue-rotate(200deg) saturate(2)',
                        }}
                    />
                </Box>
            </>
        );
    }
    if (fx.type === 'ripple') {
        const maxSide = Math.max(bboxW, bboxH);
        const grow = 0.22 + fx.cyclePhase * 0.90;
        const sizePct = maxSide * 1.12 * grow * 100;
        return (
            <Box
                sx={{
                    position: 'absolute',
                    left: `${originX}%`,
                    top: `${originY}%`,
                    width: `${sizePct}%`,
                    aspectRatio: '1',
                    height: 'auto',
                    transform: 'translate(-50%, -50%)',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.55)',
                    boxShadow: `0 0 ${8 + strength * 18}px rgba(255,255,255,0.35)`,
                    opacity: Math.max(0, (0.85 - fx.cyclePhase * 0.75) * env),
                    pointerEvents: 'none',
                }}
            />
        );
    }
    if (fx.type === 'light_sweep') {
        return (
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: clip,
                    overflow: 'hidden',
                    pointerEvents: 'none',
                }}
            >
                <Box
                    sx={{
                        position: 'absolute',
                        top: '-10%',
                        bottom: '-10%',
                        left: `${fx.cyclePhase * 120 - 20}%`,
                        width: '18%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.0), rgba(255,255,255,0.55), rgba(255,255,255,0.0), transparent)',
                        mixBlendMode: 'screen',
                        opacity: (0.5 + fx.intensity * 0.35) * env,
                    }}
                />
            </Box>
        );
    }
    return null;
}

function AttentionSaberSvg({
    points,
    fx,
}: {
    points: [number, number][];
    fx: ReturnType<typeof resolveAttentionFxAt>;
}) {
    if (!fx.enabled || fx.type !== 'saber' || points.length < 3) {
        return null;
    }
    const dash = 14;
    const gap = 86;
    const offset = (1 - fx.cyclePhase) * (dash + gap) * 3;
    const env = fx.envelope;
    return (
        <Box
            component="svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        >
            <polyline
                points={polygonSvgPoints(points)}
                fill="none"
                stroke={`rgba(80,220,255,${(0.35 + fx.intensity * 0.55) * env})`}
                strokeWidth={1.2}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={offset}
                style={{ filter: `drop-shadow(0 0 ${4 + fx.intensity * 8}px rgba(80,220,255,${0.9 * env}))` }}
            />
            <polyline
                points={polygonSvgPoints(points)}
                fill="none"
                stroke={`rgba(255,255,255,${(0.25 + fx.intensity * 0.4) * env})`}
                strokeWidth={0.55}
                strokeLinecap="round"
                strokeDasharray={`${dash * 0.4} ${gap + dash * 0.6}`}
                strokeDashoffset={offset + dash}
            />
        </Box>
    );
}

function polygonBBox(points: [number, number][]): { minX: number; minY: number; w: number; h: number } {
    const xs = points.map((point) => point[0]);
    const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    return {
        minX,
        minY,
        w: Math.max(0.001, Math.max(...xs) - minX),
        h: Math.max(0.001, Math.max(...ys) - minY),
    };
}

/**
 * Mô phỏng kết quả whiteboard theo playhead — khi CHƯA có video beat.
 * Nền = ảnh gốc (instant base); chỉ che bảng trắng TRONG vùng chưa lộ.
 * Có customBackgroundUrl → nền custom; lỗ chưa lộ để lộ custom bg (không phủ BOARD_COLOR).
 */
export default function WhiteboardBeatTimingPreview({
    imageUrl,
    customBackgroundUrl,
    beatImageOverBackground = false,
    regions,
    imageOverlays = [],
    playheadSec,
    durationSec,
    sceneBudgetSec,
    beatStartSec,
    beatWords,
    timelineEffects = [],
}: Props) {
    const duration = Math.max(0.1, durationSec);
    const budget = Math.max(0.1, sceneBudgetSec ?? duration);
    const customBg = String(customBackgroundUrl || '').trim();
    const useCustomBg = customBg !== '';
    // Ảnh beat dán full lên custom bg: vùng chưa lộ che lại bằng chính custom bg
    // (thay cho lớp BOARD_COLOR của chế độ bảng trắng).
    const overBg = useCustomBg && beatImageOverBackground;
    const timelineZoomCss = zoomTransformToCss(resolveZoomTransformAt(playheadSec, timelineEffects, durationSec));
    const ordered = React.useMemo(() => {
        const out: BeatRegion[] = [];
        const visited = new Set<string>();
        const visit = (region: BeatRegion) => {
            if (visited.has(region.id)) {
                return;
            }
            visited.add(region.id);
            out.push(region);
            regions.filter((child) => child.parent_id === region.id).forEach(visit);
        };
        regions.filter((region) => !region.parent_id).forEach(visit);
        regions.forEach(visit);
        return out;
    }, [regions]);

    const regionStates = ordered.map((region) => {
        const hasChildren = regions.some((item) => item.parent_id === region.id);
        const progress = regionProgress(
            region,
            playheadSec,
            beatWords,
            beatStartSec,
            duration,
            hasChildren,
        );
        const attention = resolveAttentionWindow(region, beatWords, beatStartSec, duration, budget);
        const fx = progress >= 0.995 && attention.enabled
            ? resolveAttentionFxAt(
                playheadSec,
                attention.start,
                attention.end,
                attention.type,
                attention.cycleSec,
                attention.scaleMax,
                attention.intensity,
            )
            : resolveAttentionFxAt(0, 0, 0, 'none', 1.2, 1.2, 0.75);
        const breatheScale = fx.type === 'breathe' ? fx.scale : 1;
        return { region, hasChildren, progress, attention, fx, breatheScale };
    });

    const dimFocusRegions = regionStates.filter(({ progress, fx, region }) => (
        progress >= 0.995
        && fx.enabled
        && (fx.type === 'spotlight' || fx.type === 'god_rays')
        && Array.isArray(region.points)
        && region.points.length >= 3
        && region.action !== 'erase'
    ));
    const maxDimOpacity = dimFocusRegions.reduce(
        (acc, item) => Math.max(acc, (0.58 + item.fx.intensity * 0.36) * item.fx.envelope),
        0,
    );

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                overflow: 'hidden',
            }}
        >
            <Box
                sx={{
                    position: 'absolute',
                    inset: 0,
                    transform: timelineZoomCss !== 'none' ? timelineZoomCss : undefined,
                    transformOrigin: 'center center',
                }}
            >
                {/* Nền: custom bg HOẶC ảnh beat đầy đủ (instant base). */}
                <Box
                    component="img"
                    src={useCustomBg ? customBg : imageUrl}
                    alt=""
                    draggable={false}
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill',
                        display: 'block',
                        pointerEvents: 'none',
                    }}
                />

                {/* Ảnh beat dán full lên custom bg (PNG nền trong suốt). */}
                {overBg ? (
                    <Box
                        component="img"
                        src={imageUrl}
                        alt=""
                        draggable={false}
                        sx={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'fill',
                            display: 'block',
                            pointerEvents: 'none',
                        }}
                    />
                ) : null}

                {/* Che vùng chưa lộ / đang animate — không phủ toàn canvas.
                    Custom bg thuần: bỏ phủ để lộ nền custom.
                    Dán ảnh beat lên bg: che bằng chính custom bg. */}
                {!useCustomBg || overBg ? regionStates.map(({ region, progress }) => {
                    if (!Array.isArray(region.points) || region.points.length < 3) {
                        return null;
                    }
                    const maskBg = overBg ? customBg : undefined;
                    if (region.action === 'erase') {
                        if (progress <= 0.01) {
                            return null;
                        }
                        return (
                            <RegionMaskFill
                                key={`${region.id}-erase-mask`}
                                clip={polygonClip(region.points)}
                                opacity={progress}
                                backgroundUrl={maskBg}
                            />
                        );
                    }
                    if (progress >= 0.995) {
                        return null;
                    }
                    const bbox = polygonBBox(region.points);
                    const isPlace = region.action === 'place';
                    // Place: không phủ lớp trắng chồng reveal (gây "filter trắng" lúc fade-in).
                    // Chỉ che bảng khi chưa bắt đầu lộ; khi đang đưa vào dùng opacity ở lớp reveal.
                    if (isPlace) {
                        if (progress > 0.01) {
                            return null;
                        }
                        return (
                            <RegionMaskFill
                                key={`${region.id}-place-mask`}
                                clip={polygonClip(region.points)}
                                backgroundUrl={maskBg}
                            />
                        );
                    }
                    return (
                        <RegionMaskFill
                            key={`${region.id}-draw-mask`}
                            clip={polygonClip(region.points)}
                            rect={{
                                left: bbox.minX,
                                top: bbox.minY + bbox.h * progress,
                                w: bbox.w,
                                h: Math.max(0.0001, bbox.h * (1 - progress)),
                            }}
                            backgroundUrl={maskBg}
                        />
                    );
                }) : null}

                {/* Lớp cutout đã lộ — scale thở riêng từng vùng (isolation tránh dính màu GPU).
                    Custom bg + draw đang lộ: cửa sổ từ trên xuống (không BOARD_COLOR). */}
                {regionStates.map(({ region, progress, breatheScale, fx }) => {
                    if (!Array.isArray(region.points) || region.points.length < 3) {
                        return null;
                    }
                    if (region.action === 'erase' || progress <= 0.01) {
                        return null;
                    }
                    const bbox = polygonBBox(region.points);
                    const isPlace = region.action === 'place';
                    const placeScale = isPlace && progress < 1 ? (0.86 + 0.14 * progress) : 1;
                    const totalScale = Math.max(1, breatheScale * placeScale);
                    const originX = (bbox.minX + bbox.w / 2) * 100;
                    const originY = (bbox.minY + bbox.h / 2) * 100;
                    const clip = polygonClip(region.points);
                    const drawWindow = useCustomBg && !overBg && !isPlace && progress < 0.995;
                    return (
                        <React.Fragment key={`${region.id}-reveal-wrap`}>
                            {drawWindow ? (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        left: `${bbox.minX * 100}%`,
                                        top: `${bbox.minY * 100}%`,
                                        width: `${bbox.w * 100}%`,
                                        height: `${bbox.h * progress * 100}%`,
                                        overflow: 'hidden',
                                        pointerEvents: 'none',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: `${(-bbox.minX / bbox.w) * 100}%`,
                                            top: `${(-bbox.minY / bbox.h) * 100}%`,
                                            width: `${(1 / bbox.w) * 100}%`,
                                            height: `${(1 / bbox.h) * 100}%`,
                                            clipPath: clip,
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={imageUrl}
                                            alt=""
                                            draggable={false}
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'fill',
                                                display: 'block',
                                            }}
                                        />
                                    </Box>
                                </Box>
                            ) : (
                                <Box
                                    key={`${region.id}-reveal`}
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        clipPath: clip,
                                        opacity: isPlace && progress < 1 ? progress : 1,
                                        transform: totalScale !== 1 ? `scale(${totalScale})` : undefined,
                                        transformOrigin: `${originX.toFixed(2)}% ${originY.toFixed(2)}%`,
                                        isolation: 'isolate',
                                        willChange: totalScale !== 1 ? 'transform' : undefined,
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={imageUrl}
                                        alt=""
                                        draggable={false}
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'fill',
                                            display: 'block',
                                        }}
                                    />
                                </Box>
                            )}
                            {progress >= 0.995 ? (
                                <>
                                    <AttentionLocalFx
                                        clip={clip}
                                        fx={fx}
                                        imageUrl={imageUrl}
                                        originX={originX}
                                        originY={originY}
                                        bboxW={bbox.w}
                                        bboxH={bbox.h}
                                    />
                                    <AttentionSaberSvg points={region.points} fx={fx} />
                                </>
                            ) : null}
                        </React.Fragment>
                    );
                })}

                {/* Spotlight / god rays: dim một lần + punch focus sáng. */}
                {dimFocusRegions.length > 0 ? (
                    <>
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                bgcolor: '#000',
                                opacity: maxDimOpacity,
                                pointerEvents: 'none',
                            }}
                        />
                        {dimFocusRegions.map(({ region, fx }) => {
                            const centroid = polygonCentroid(region.points);
                            return (
                                <React.Fragment key={`${region.id}-dim-focus`}>
                                    {fx.type === 'god_rays' ? (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                background: `repeating-conic-gradient(from ${fx.cyclePhase * 40}deg at ${centroid.x * 100}% ${centroid.y * 100}%, rgba(255,240,200,0.22) 0deg 6deg, transparent 6deg 18deg)`,
                                                mixBlendMode: 'screen',
                                                opacity: (0.35 + fx.intensity * 0.45) * fx.envelope,
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    ) : null}
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            clipPath: polygonClip(region.points),
                                            filter: 'drop-shadow(0 0 18px rgba(255,255,255,0.35))',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            component="img"
                                            src={imageUrl}
                                            alt=""
                                            draggable={false}
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'fill',
                                                display: 'block',
                                            }}
                                        />
                                    </Box>
                                </React.Fragment>
                            );
                        })}
                    </>
                ) : null}

                {imageOverlays.map((overlay) => {
                    const start = resolveOverlayStartSec(overlay);
                    const end = resolveOverlayEndSec(overlay, duration);
                    const visEnd = overlay.hold_to_end ? duration : end;
                    if (playheadSec < start || playheadSec > visEnd + 0.05) {
                        return null;
                    }
                    const appearProgress = playheadSec <= start
                        ? 0
                        : (playheadSec >= end ? 1 : (playheadSec - start) / Math.max(0.05, end - start));
                    const attention = resolveAttentionWindow(overlay, beatWords, beatStartSec, duration, budget);
                    const fx = appearProgress >= 0.995 && attention.enabled
                        ? resolveAttentionFxAt(
                            playheadSec,
                            attention.start,
                            attention.end,
                            attention.type,
                            attention.cycleSec,
                            attention.scaleMax,
                            attention.intensity,
                        )
                        : resolveAttentionFxAt(0, 0, 0, 'none', 1.2, 1.2, 0.75);
                    const breatheScale = fx.type === 'breathe' ? fx.scale : 1;
                    const entryScale = appearProgress < 1 ? (0.86 + 0.14 * appearProgress) : 1;
                    const scale = Math.max(1, breatheScale * entryScale);
                    const isDim = fx.enabled && (fx.type === 'spotlight' || fx.type === 'god_rays');
                    return (
                        <React.Fragment key={overlay.id}>
                            {isDim ? (
                                <Box
                                    sx={{
                                        position: 'absolute',
                                        inset: 0,
                                        bgcolor: '#000',
                                        opacity: (0.52 + fx.intensity * 0.42) * fx.envelope,
                                        pointerEvents: 'none',
                                    }}
                                />
                            ) : null}
                            <Box
                                sx={{
                                    position: 'absolute',
                                    left: `${(overlay.x - overlay.width / 2) * 100}%`,
                                    top: `${(overlay.y - overlay.height / 2) * 100}%`,
                                    width: `${overlay.width * 100}%`,
                                    height: `${overlay.height * 100}%`,
                                    transform: `rotate(${overlay.rotation_deg || 0}deg) scale(${scale})`,
                                    transformOrigin: 'center center',
                                    pointerEvents: 'none',
                                    isolation: 'isolate',
                                    filter: isDim ? 'drop-shadow(0 0 14px rgba(255,255,255,0.4))' : undefined,
                                }}
                            >
                                <Box
                                    component="img"
                                    src={overlay.image_url}
                                    alt=""
                                    draggable={false}
                                    sx={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        display: 'block',
                                    }}
                                />
                                {fx.enabled && fx.type === 'light_sweep' ? (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            overflow: 'hidden',
                                            pointerEvents: 'none',
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left: `${fx.cyclePhase * 120 - 20}%`,
                                                width: '22%',
                                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                                                mixBlendMode: 'screen',
                                                opacity: fx.envelope,
                                            }}
                                        />
                                    </Box>
                                ) : null}
                                {fx.enabled && fx.type === 'glitch' ? (
                                    <>
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                transform: `translate(${8 * fx.intensity * fx.envelope}px, 0)`,
                                                opacity: 0.5 * fx.envelope,
                                                mixBlendMode: 'screen',
                                                background: 'rgba(255,40,40,0.35)',
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                inset: 0,
                                                transform: `translate(${-(8 * fx.intensity * fx.envelope)}px, 0)`,
                                                opacity: 0.5 * fx.envelope,
                                                mixBlendMode: 'screen',
                                                background: 'rgba(40,80,255,0.35)',
                                            }}
                                        />
                                    </>
                                ) : null}
                                {fx.enabled && fx.type === 'ripple' ? (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            left: '50%',
                                            top: '50%',
                                            width: `${28 + fx.cyclePhase * 84}%`,
                                            aspectRatio: '1',
                                            height: 'auto',
                                            transform: 'translate(-50%, -50%)',
                                            borderRadius: '50%',
                                            border: '2px solid rgba(255,255,255,0.5)',
                                            opacity: Math.max(0, (0.8 - fx.cyclePhase * 0.7) * fx.envelope),
                                        }}
                                    />
                                ) : null}
                                {fx.enabled && fx.type === 'saber' ? (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            borderRadius: 1,
                                            boxShadow: `inset 0 0 0 2px rgba(80,220,255,${(0.35 + fx.intensity * 0.45) * fx.envelope}), 0 0 12px rgba(80,220,255,${0.55 * fx.envelope})`,
                                            background: `linear-gradient(${fx.cyclePhase * 360}deg, transparent 40%, rgba(80,220,255,${0.35 * fx.envelope}) 50%, transparent 60%)`,
                                        }}
                                    />
                                ) : null}
                                {fx.enabled && fx.type === 'god_rays' ? (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: '-40%',
                                            background: `repeating-conic-gradient(from ${fx.cyclePhase * 30}deg, rgba(255,240,200,0.2) 0deg 8deg, transparent 8deg 20deg)`,
                                            mixBlendMode: 'screen',
                                            opacity: (0.4 + fx.intensity * 0.35) * fx.envelope,
                                        }}
                                    />
                                ) : null}
                            </Box>
                        </React.Fragment>
                    );
                })}
            </Box>
        </Box>
    );
}

type VideoPreviewProps = {
    videoUrl: string;
    /** Cửa sổ beat đầy đủ (scene + transition) — khớp độ dài file beat_*.mp4. */
    beatWindowSec: number;
    /** Intro đầu file video (0.15 khi có vùng, 0.3 mặc định). */
    videoIntroSec?: number;
    initialSec?: number;
    initialPlaying?: boolean;
};

export type WhiteboardBeatVideoPreviewHandle = {
    seekTo: (sec: number, playing: boolean) => void;
};

/**
 * Overlay video beat — seek KHÔNG đi qua React state từng frame.
 * Latest-wins: chỉ giữ mốc mới nhất, chờ `seeked` rồi mới seek tiếp
 * (tránh xếp hàng currentTime làm preview giật).
 */
export const WhiteboardBeatVideoPreview = React.forwardRef<
    WhiteboardBeatVideoPreviewHandle,
    VideoPreviewProps
>(function WhiteboardBeatVideoPreview({
    videoUrl,
    beatWindowSec,
    videoIntroSec = 0.15,
    initialSec = 0,
    initialPlaying = false,
}, ref) {
    const videoRef = React.useRef<HTMLVideoElement | null>(null);
    const pendingBeatSecRef = React.useRef<number | null>(null);
    const seekingRef = React.useRef(false);
    const playingRef = React.useRef(initialPlaying);
    const beatWindowRef = React.useRef(beatWindowSec);
    const introSecRef = React.useRef(videoIntroSec);
    beatWindowRef.current = beatWindowSec;
    introSecRef.current = videoIntroSec;
    const [labelSec, setLabelSec] = React.useState(initialSec);
    const labelRafRef = React.useRef(0);

    const beatToVideoSec = React.useCallback((beatSec: number) => (
        beatPlayheadToVideoSec(beatSec, beatWindowRef.current, introSecRef.current)
    ), []);

    const clampVideoSec = React.useCallback((videoSec: number) => {
        const video = videoRef.current;
        const fallback = Math.max(0.1, introSecRef.current + beatWindowRef.current);
        const dur = video && Number.isFinite(video.duration) && video.duration > 0
            ? video.duration
            : fallback;
        return Math.max(0, Math.min(Math.max(0, dur - 0.04), videoSec));
    }, []);

    const flushSeek = React.useCallback(() => {
        const video = videoRef.current;
        if (!video || seekingRef.current) {
            return;
        }
        if (pendingBeatSecRef.current == null) {
            return;
        }
        const beatSec = pendingBeatSecRef.current;
        pendingBeatSecRef.current = null;
        const t = clampVideoSec(beatToVideoSec(beatSec));
        if (Math.abs(video.currentTime - t) < 0.012) {
            return;
        }
        seekingRef.current = true;
        const media = video as HTMLVideoElement & { fastSeek?: (time: number) => void };
        try {
            if (typeof media.fastSeek === 'function') {
                media.fastSeek(t);
            } else {
                video.currentTime = t;
            }
        } catch {
            seekingRef.current = false;
        }
    }, [beatToVideoSec, clampVideoSec]);

    const seekTo = React.useCallback((beatSec: number, playing: boolean) => {
        pendingBeatSecRef.current = beatSec;
        playingRef.current = playing;
        if (!labelRafRef.current) {
            labelRafRef.current = window.requestAnimationFrame(() => {
                labelRafRef.current = 0;
                setLabelSec(beatSec);
            });
        }
        const video = videoRef.current;
        if (!video) {
            return;
        }
        if (playing) {
            if (video.paused) {
                void video.play().catch(() => undefined);
            }
            if (Math.abs(video.currentTime - clampVideoSec(beatToVideoSec(beatSec))) > 0.28) {
                flushSeek();
            }
            return;
        }
        if (!video.paused) {
            video.pause();
        }
        flushSeek();
    }, [beatToVideoSec, clampVideoSec, flushSeek]);

    React.useImperativeHandle(ref, () => ({ seekTo }), [seekTo]);

    React.useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return undefined;
        }
        const onSeeked = () => {
            seekingRef.current = false;
            flushSeek();
        };
        const onLoaded = () => {
            seekingRef.current = false;
            if (pendingBeatSecRef.current == null) {
                pendingBeatSecRef.current = initialSec;
            }
            flushSeek();
            if (playingRef.current && video.paused) {
                void video.play().catch(() => undefined);
            }
        };
        const watchdog = window.setInterval(() => {
            if (seekingRef.current && pendingBeatSecRef.current != null) {
                seekingRef.current = false;
                flushSeek();
            }
        }, 160);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('loadedmetadata', onLoaded);
        pendingBeatSecRef.current = initialSec;
        flushSeek();
        return () => {
            window.clearInterval(watchdog);
            video.removeEventListener('seeked', onSeeked);
            video.removeEventListener('loadedmetadata', onLoaded);
        };
    }, [flushSeek, initialSec, videoUrl]);

    React.useEffect(() => () => {
        if (labelRafRef.current) {
            window.cancelAnimationFrame(labelRafRef.current);
        }
    }, []);

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 3,
                bgcolor: '#000',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <video
                ref={videoRef}
                src={videoUrl}
                muted
                playsInline
                preload="auto"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    pointerEvents: 'none',
                }}
            >
                <track kind="captions" />
            </video>
            <WhiteboardBeatPreviewBadge playheadSec={labelSec} />
        </Box>
    );
});

export function WhiteboardBeatPreviewBadge({
    playheadSec,
}: {
    playheadSec: number;
    hasVideo?: boolean;
}) {
    return (
        <Box
            sx={{
                position: 'absolute',
                bottom: 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 6,
                pointerEvents: 'none',
                bgcolor: 'rgba(0,0,0,0.72)',
                color: '#fff',
                borderRadius: 1.5,
                px: 1.25,
                py: 0.4,
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    display: 'block',
                    fontWeight: 800,
                    fontSize: 11,
                    lineHeight: 1.25,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                }}
            >
                {`Video beat · ${playheadSec.toFixed(1)}s`}
            </Typography>
        </Box>
    );
}
