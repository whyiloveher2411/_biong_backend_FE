import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { formatClock, formatPct, type InsightsHistoryPoint, type InsightsRetention } from './channelInsightsApi';

/** Một chuỗi dữ liệu duy nhất: một màu (xanh series 1, có bản riêng cho nền tối). */
function useSeriesColor(): string {
    const theme = useTheme();
    return theme.palette.mode === 'dark' ? '#3987e5' : '#2a78d6';
}

/** Xu hướng của một số qua các lần đọc; trục ngang theo thời điểm đọc. */
export function Sparkline({ history, label }: { history: InsightsHistoryPoint[]; label: string }) {
    const color = useSeriesColor();
    if (history.length < 2) {
        return null;
    }
    const W = 96;
    const H = 24;
    const times = history.map((h) => new Date(h.at).getTime());
    const values = history.map((h) => h.value);
    const t0 = Math.min(...times);
    const span = Math.max(...times) - t0 || 1;
    const low = Math.min(...values);
    const range = Math.max(...values) - low;
    const xy = history.map((h, i) => [
        3 + ((times[i] - t0) / span) * (W - 6),
        range === 0 ? H / 2 : H - 4 - ((h.value - low) / range) * (H - 8),
    ]);
    const last = xy[xy.length - 1];
    const summary = `${label}: ${history.map((h) => `${new Date(h.at).toLocaleString('vi-VN')} = ${h.text}`).join('; ')}`;
    return (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
            <title>{summary}</title>
            <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
        </svg>
    );
}

/** Bề rộng thật của khung, để chữ trên trục giữ nguyên cỡ khi khung hẹp. */
function useWidth(fallback: number) {
    const ref = React.useRef<HTMLDivElement>(null);
    const [width, setWidth] = React.useState(fallback);
    React.useEffect(() => {
        const node = ref.current;
        if (!node || typeof ResizeObserver === 'undefined') {
            return undefined;
        }
        const observer = new ResizeObserver((entries) => {
            const next = Math.round(entries[0].contentRect.width);
            if (next > 0) {
                setWidth(Math.max(240, next));
            }
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);
    return [ref, width] as const;
}

/** Số đánh dấu của các đoạn nằm sát nhau được đẩy ra cho khỏi chồng. */
function spreadLabels(centers: number[], gap: number): number[] {
    const out = [...centers];
    const order = centers.map((_, i) => i).sort((a, b) => centers[a] - centers[b]);
    for (let k = 1; k < order.length; k++) {
        out[order[k]] = Math.max(out[order[k]], out[order[k - 1]] + gap);
    }
    return out;
}

const H = 220;
const PAD = { left: 40, right: 10, top: 18, bottom: 22 };

/** Đường giữ chân; vùng tô có đánh số là các đoạn rơi mạnh, trùng số với danh sách bên dưới. */
export function RetentionChart({ retention }: { retention: InsightsRetention }) {
    const theme = useTheme();
    const color = useSeriesColor();
    const [hover, setHover] = React.useState<number | null>(null);
    const [frame, W] = useWidth(640);
    const { points, duration_sec: duration, drops, beats } = retention;
    const top = Math.max(100, Math.ceil(Math.max(...points.map((p) => p[1])) / 25) * 25);
    const x = (sec: number) => PAD.left + (sec / duration) * (W - PAD.left - PAD.right);
    const y = (pct: number) => PAD.top + (1 - pct / top) * (H - PAD.top - PAD.bottom);

    const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        if (box.width <= 0) {
            return;
        }
        const sx = ((event.clientX - box.left) / box.width) * W;
        const sec = ((sx - PAD.left) / (W - PAD.left - PAD.right)) * duration;
        let best = 0;
        points.forEach((p, i) => {
            if (Math.abs(p[0] - sec) < Math.abs(points[best][0] - sec)) {
                best = i;
            }
        });
        setHover(best);
    };

    const point = hover === null ? null : points[hover];
    const labelX = spreadLabels(drops.map((d) => (x(d.from) + x(d.to)) / 2), 11);
    const ticks = W < 360 ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
    const beatAt = point ? beats.find((b) => point[0] >= b.start && point[0] < b.end) : undefined;

    return (
        <Box ref={frame}>
            <svg
                width="100%"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label={`Đường giữ chân, ${points.length} điểm, từ ${formatPct(points[0][1])} xuống ${formatPct(points[points.length - 1][1])}`}
                onMouseMove={onMove}
                onMouseLeave={() => setHover(null)}
            >
                {drops.map((d, i) => (
                    <g key={`${d.from}-${d.to}`}>
                        <rect x={x(d.from)} y={PAD.top} width={Math.max(3, x(d.to) - x(d.from))} height={H - PAD.top - PAD.bottom} fill={theme.palette.text.primary} opacity={0.1} />
                        <text x={labelX[i]} y={PAD.top - 5} textAnchor="middle" fontSize={11} fontWeight={600} fill={theme.palette.text.primary}>
                            {i + 1}
                        </text>
                    </g>
                ))}
                {[0, 25, 50, 75, 100, 125, 150, 175, 200].filter((v) => v <= top && (top <= 100 || v % 50 === 0)).map((v) => (
                    <g key={v}>
                        <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} stroke={theme.palette.divider} strokeWidth={1} />
                        <text x={PAD.left - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill={theme.palette.text.secondary}>{`${v}%`}</text>
                    </g>
                ))}
                {ticks.map((q) => (
                    <text key={q} x={x(duration * q)} y={H - 6} textAnchor={q === 0 ? 'start' : q === 1 ? 'end' : 'middle'} fontSize={11} fill={theme.palette.text.secondary}>
                        {formatClock(duration * q)}
                    </text>
                ))}
                <polyline points={points.map((p) => `${x(p[0])},${y(p[1])}`).join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
                {point ? (
                    <g pointerEvents="none">
                        <line x1={x(point[0])} x2={x(point[0])} y1={PAD.top} y2={H - PAD.bottom} stroke={theme.palette.text.secondary} strokeWidth={1} />
                        <circle cx={x(point[0])} cy={y(point[1])} r={4.5} fill={color} stroke={theme.palette.background.paper} strokeWidth={2} />
                    </g>
                ) : null}
            </svg>
            <Typography variant="caption" color="text.secondary" component="div" sx={{ minHeight: 40 }} aria-live="polite">
                {point
                    ? `${formatClock(point[0])} · còn xem ${formatPct(point[1])}${beatAt ? ` · ${beatAt.beat}: “${beatAt.text}”` : ''}`
                    : 'Rê chuột lên biểu đồ để xem từng thời điểm và câu thoại đang chiếu.'}
            </Typography>
        </Box>
    );
}
