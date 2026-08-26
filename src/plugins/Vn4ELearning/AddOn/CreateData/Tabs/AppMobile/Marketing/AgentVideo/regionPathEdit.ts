import type { BeatRegionPoint } from './agentVideoApi';

export const REGION_PATH_MIN_POINTS = 3;

export function clamp01(n: number): number {
    return Math.max(0, Math.min(1, n));
}

export function clampPoint01(point: BeatRegionPoint): BeatRegionPoint {
    return [clamp01(point[0]), clamp01(point[1])];
}

/** Dịch toàn polygon; clamp từng điểm vào [0,1]. */
export function translatePolygon(
    points: BeatRegionPoint[],
    dx: number,
    dy: number,
): BeatRegionPoint[] {
    return points.map((p) => clampPoint01([p[0] + dx, p[1] + dy]));
}

/** Cập nhật 1 đỉnh theo index; clamp 0–1. */
export function moveVertex(
    points: BeatRegionPoint[],
    index: number,
    next: BeatRegionPoint,
): BeatRegionPoint[] {
    if (index < 0 || index >= points.length) {
        return points;
    }
    const out = points.slice();
    out[index] = clampPoint01(next);
    return out;
}

/**
 * Chèn đỉnh mới giữa cạnh bắt đầu tại `edgeStartIndex`
 * (cạnh: points[i] → points[(i+1)%n]). Trả về { points, insertedIndex }.
 */
export function insertPointOnEdge(
    points: BeatRegionPoint[],
    edgeStartIndex: number,
    point: BeatRegionPoint = [
        (points[edgeStartIndex][0] + points[(edgeStartIndex + 1) % points.length][0]) / 2,
        (points[edgeStartIndex][1] + points[(edgeStartIndex + 1) % points.length][1]) / 2,
    ],
): { points: BeatRegionPoint[]; insertedIndex: number } {
    const n = points.length;
    if (n < REGION_PATH_MIN_POINTS || edgeStartIndex < 0 || edgeStartIndex >= n) {
        return { points, insertedIndex: -1 };
    }
    const insertedIndex = edgeStartIndex + 1;
    const next = points.slice();
    next.splice(insertedIndex, 0, clampPoint01(point));
    return { points: next, insertedIndex };
}

/** Xóa đỉnh nếu còn > minPoints. Trả về null nếu không xóa được. */
export function removeVertex(
    points: BeatRegionPoint[],
    index: number,
    minPoints: number = REGION_PATH_MIN_POINTS,
): BeatRegionPoint[] | null {
    if (points.length <= minPoints || index < 0 || index >= points.length) {
        return null;
    }
    return points.filter((_, i) => i !== index);
}

export function edgeMidpoint(
    points: BeatRegionPoint[],
    edgeStartIndex: number,
): BeatRegionPoint {
    const a = points[edgeStartIndex];
    const b = points[(edgeStartIndex + 1) % points.length];
    return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
