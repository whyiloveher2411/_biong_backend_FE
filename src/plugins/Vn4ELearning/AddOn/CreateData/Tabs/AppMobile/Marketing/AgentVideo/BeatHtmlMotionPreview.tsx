import React from 'react';
import { Box, Typography } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import {
    ensureImportHtmlDataDuration,
    localizeImportHtmlExternalScripts,
    seekCustomHtmlIframe,
} from './agentVideoCustomHtmlPreview';

type Props = {
    /** HTML motion của beat (full document). */
    html: string;
    /** Thời điểm playhead (giây, beat-local) — iframe seek theo giá trị này. */
    timeSec: number;
    /** Window audio của beat (giây). */
    durationSec: number;
    /** ID beat — dùng để đổi `key` của iframe khi chuyển beat (tránh tái dùng
     *  node iframe cũ khiến trình duyệt không reload srcdoc). */
    beatId?: string;
};

/** Hash ngắn cho chuỗi — dùng làm phần `key` của iframe (tránh key khổng lồ). */
function quickHash(input: string): string {
    let hash = 5381;
    for (let i = 0; i < input.length; i += 1) {
        hash = ((hash << 5) + hash + input.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}

/** Đoán kích thước canvas beat HTML được thiết kế (khớp runner render). */
function detectAuthoredSize(html: string): { w: number; h: number } | null {
    const dw = html.match(/data-width=["']?(\d+)/i);
    const dh = html.match(/data-height=["']?(\d+)/i);
    if (dw && dh) {
        const w = Number(dw[1]);
        const h = Number(dh[1]);
        if (w > 0 && h > 0) {
            return { w, h };
        }
    }
    const stage = html.match(/#stage\s*\{([^}]*)\}/i);
    if (stage) {
        const w = stage[1].match(/width\s*:\s*(\d+)px/i);
        const h = stage[1].match(/height\s*:\s*(\d+)px/i);
        if (w && h) {
            return { w: Number(w[1]), h: Number(h[1]) };
        }
    }
    const da = html.match(/data-aspect=["']?(\d+)\s*:\s*(\d+)/i);
    if (da) {
        const a = Number(da[1]);
        const b = Number(da[2]);
        if (a > 0 && b > 0) {
            const base = 1080;
            return a >= b
                ? { w: Math.round((base * a) / b), h: base }
                : { w: base, h: Math.round((base * b) / a) };
        }
    }
    return null;
}

/**
 * Preview HTML motion 1 beat: render srcDoc trong iframe, seek theo playhead
 * (`timeSec`). Đặt TRONG khung geometry của editor nên zoom/pan + kéo timeline
 * (playhead) đều áp dụng lên preview.
 */
export default function BeatHtmlMotionPreview({ html, timeSec, durationSec, beatId }: Props) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
    const latestTimeRef = React.useRef(0);
    const [size, setSize] = React.useState({ w: 0, h: 0 });

    const duration = Math.max(0.2, Number(durationSec) || 0.2);
    const srcDoc = React.useMemo(
        () => ensureImportHtmlDataDuration(
            localizeImportHtmlExternalScripts(String(html || '')),
            duration,
        ),
        [html, duration],
    );
    const authored = React.useMemo(() => detectAuthoredSize(String(html || '')), [html]);

    // Đổi beat / đổi nội dung HTML → đổi key để React tạo iframe MỚI (buộc reload
    // srcDoc). Không có key, trình duyệt có thể giữ document cũ → preview dính beat trước.
    const iframeKey = `${beatId || 'beat'}:${quickHash(srcDoc)}`;

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return undefined;
        }
        const update = () => setSize({ w: container.clientWidth, h: container.clientHeight });
        update();
        const observer = new ResizeObserver(update);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const seek = React.useCallback((time: number) => {
        const clamped = Math.max(0, Math.min(duration, Number(time) || 0));
        latestTimeRef.current = clamped;
        seekCustomHtmlIframe(iframeRef.current, clamped);
    }, [duration]);

    React.useEffect(() => {
        seek(timeSec);
    }, [timeSec, seek, srcDoc]);

    const fitScale = authored && size.w > 0 && size.h > 0
        ? Math.min(size.w / authored.w, size.h / authored.h)
        : 1;

    if (!String(html || '').trim()) {
        return (
            <Box
                sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.75,
                    color: 'common.white',
                }}
            >
                <CodeIcon sx={{ fontSize: 32, opacity: 0.85 }} />
                <Typography variant="caption">Chưa có HTML motion</Typography>
            </Box>
        );
    }

    return (
        <Box
            ref={containerRef}
            sx={{
                position: 'absolute',
                inset: 0,
                overflow: 'hidden',
                bgcolor: 'common.black',
                pointerEvents: 'none',
            }}
        >
            <Box
                component="iframe"
                key={iframeKey}
                ref={iframeRef}
                title="HTML motion beat"
                srcDoc={srcDoc}
                scrolling="no"
                onLoad={() => seek(latestTimeRef.current)}
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: authored ? authored.w : '100%',
                    height: authored ? authored.h : '100%',
                    transform: authored
                        ? `translate(-50%, -50%) scale(${fitScale})`
                        : 'translate(-50%, -50%)',
                    transformOrigin: 'center center',
                    border: 0,
                    bgcolor: 'common.black',
                    pointerEvents: 'none',
                }}
            />
        </Box>
    );
}
