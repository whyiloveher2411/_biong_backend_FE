import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import ReplayIcon from '@mui/icons-material/Replay';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import type { BeatRegion } from './agentVideoApi';
import { drawEffectAfterSec, getAgentWhiteboardBeatRenderTimeline, placeEffectAfterSec } from './agentVideoApi';

/**
 * TIMELINE RENDER THEO VÙNG — layout NHIỀU DÒNG (mỗi vùng 1 dòng).
 *
 * - MỖI VÙNG 1 DÒNG riêng, sắp cây (cha → các con ngay dưới → các vùng khác),
 *   kéo tay trái/phải trên dải màu để đặt bắt đầu / xong render (min 1s).
 * - THANH AUDIO (hàng đầu) SẠCH — chỉ thước giây + vạch từ + playhead đỏ dọc,
 *   KHÔNG có mảnh màu vùng trên thanh audio.
 * - Click tên vùng / dải = chọn vùng (đồng bộ ảnh + scroll quản lý).
 * - Audio script: CHỈ highlight từ trong khoảng render của vùng đang chọn
 *   (bỏ highlight theo script_end_word cũ); từ đang phát màu ĐỎ.
 * - user-select: none toàn thanh (không bị bôi đen khi kéo).
 */

type Word = { index: number; text: string; start: number };

type Props = {
    regions: BeatRegion[];
    beatDurationSec: number;
    beatStartSec: number;
    beatWords: Word[];
    colorFor: (index: number) => string;
    onChangeRegion: (id: string, patch: Partial<BeatRegion>) => void;
    onSelectRegion?: (id: string) => void;
    selectedRegionId?: string;
    audioUrl?: string;
    maxWidth?: number;
    /** Thời lượng chuyển cảnh cuối beat (giây THỰC TẾ) — 0/không có = ẩn box đỏ. */
    transitionDurationSec?: number;
    shortVideoId?: number;
    beatId?: string;
    onCopyError?: (message: string) => void;
    /** Playhead scene-relative (0 → beatDuration) + đang phát — đồng bộ preview phía trên. */
    onPlayheadChange?: (sec: number, playing: boolean) => void;
};

const HANDLE_W = 12;
const ROW_H = 26;
const AUDIO_ROW_H = 30;
const LABEL_W = 80;
const MIN_DUR = 1.0;

export default function WhiteboardRegionTimeline({
    regions,
    beatDurationSec,
    beatStartSec,
    beatWords,
    colorFor,
    onChangeRegion,
    onSelectRegion,
    selectedRegionId,
    audioUrl,
    maxWidth,
    transitionDurationSec = 0,
    shortVideoId = 0,
    beatId = '',
    onCopyError,
    onPlayheadChange,
}: Props) {
    const duration = Math.max(0.1, beatDurationSec);
    const transitionDur = Math.max(0, Math.min(duration, Number(transitionDurationSec) || 0));
    const trackRef = React.useRef<HTMLDivElement | null>(null);
    const dragRef = React.useRef<{ id: string; handle: 'start' | 'end' | 'body'; startX: number; origStartSec: number; origEndSec: number } | null>(null);
    const scrubRef = React.useRef(false);

    // ---- Audio playback ----
    const audioRef = React.useRef<HTMLAudioElement | null>(null);
    const [playing, setPlaying] = React.useState(false);
    const [playhead, setPlayhead] = React.useState(0);
    const [copied, setCopied] = React.useState(false);
    const [copying, setCopying] = React.useState(false);
    const rafRef = React.useRef<number>(0);
    const onPlayheadChangeRef = React.useRef(onPlayheadChange);
    onPlayheadChangeRef.current = onPlayheadChange;
    const playingRef = React.useRef(false);
    playingRef.current = playing;

    const emitPlayhead = (sec: number, isPlaying: boolean) => {
        onPlayheadChangeRef.current?.(sec, isPlaying);
    };

    React.useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;
        const stop = () => setPlaying(false);
        audio.addEventListener('ended', stop);
        audio.addEventListener('pause', stop);
        return () => {
            audio.removeEventListener('ended', stop);
            audio.removeEventListener('pause', stop);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    React.useEffect(() => {
        const audio = audioRef.current;
        if (audio) audio.pause();
        setPlaying(false);
        setPlayhead(0);
        emitPlayhead(0, false);
    }, [beatStartSec, beatDurationSec]);

    const updatePlayhead = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const t = Math.max(beatStartSec, Math.min(beatStartSec + duration, audio.currentTime));
        const local = t - beatStartSec;
        setPlayhead(local);
        emitPlayhead(local, true);
        if (t >= beatStartSec + duration - 0.02) {
            audio.pause();
            setPlaying(false);
            emitPlayhead(local, false);
            return;
        }
        rafRef.current = requestAnimationFrame(updatePlayhead);
    };

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        if (playing) {
            audio.pause();
            setPlaying(false);
            emitPlayhead(playhead, false);
            return;
        }
        const cur = audio.currentTime;
        if (cur < beatStartSec - 0.05 || cur > beatStartSec + duration + 0.05) {
            audio.currentTime = beatStartSec;
        }
        void audio.play().then(() => {
            setPlaying(true);
            emitPlayhead(Math.max(0, audio.currentTime - beatStartSec), true);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(updatePlayhead);
        }).catch(() => setPlaying(false));
    };

    const seekToSec = (sec: number) => {
        const audio = audioRef.current;
        const next = Math.max(0, Math.min(duration, sec));
        if (audio && audioUrl) {
            audio.currentTime = Math.max(0, beatStartSec + next);
        }
        setPlayhead(next);
        emitPlayhead(next, playingRef.current);
    };

    const replay = () => {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = beatStartSec;
        setPlayhead(0);
        emitPlayhead(0, true);
        void audio.play().then(() => {
            setPlaying(true);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(updatePlayhead);
        }).catch(() => setPlaying(false));
    };

    // ---- Timing helpers ----
    const wordTimeOf = (wordIndex: number | null | undefined): number | null => {
        if (wordIndex == null) return null;
        const w = beatWords.find((x) => x.index === wordIndex);
        return w ? Math.max(0, Math.min(duration, w.start - beatStartSec)) : null;
    };
    const startSecOf = (region: BeatRegion): number => {
        if (region.start_sec != null) return Math.max(0, Math.min(duration, region.start_sec));
        const wt = wordTimeOf(region.script_start_word);
        return wt != null ? wt : 0;
    };
    const endSecOf = (region: BeatRegion): number => {
        if (region.end_sec != null) return Math.max(0, Math.min(duration, region.end_sec));
        const wt = wordTimeOf(region.script_end_word);
        return wt != null ? wt : duration;
    };
    const ancestorEndMax = (id: string, seen = new Set<string>()): number => {
        const region = regions.find((r) => r.id === id);
        if (!region || seen.has(id)) return 0;
        seen.add(id);
        const pid = region.parent_id || null;
        const parent = pid ? regions.find((r) => r.id === pid) : null;
        const parentEnd = parent ? endSecOf(parent) : 0;
        return Math.max(parentEnd, pid ? ancestorEndMax(pid, seen) : 0);
    };
    const minStartOf = (region: BeatRegion): number => {
        if (!region.parent_id) return 0;
        return Math.min(ancestorEndMax(region.id), duration);
    };

    // Sắp CÂY: cha → các con (đệ quy) → các vùng khác.
    const orderedRegions = React.useMemo(() => {
        const out: BeatRegion[] = [];
        const visited = new Set<string>();
        const visit = (r: BeatRegion) => {
            if (visited.has(r.id)) return;
            visited.add(r.id);
            out.push(r);
            regions.filter((c) => c.parent_id === r.id).forEach(visit);
        };
        regions.filter((r) => !r.parent_id).forEach(visit);
        regions.forEach(visit);
        return out;
    }, [regions]);

    const secToPct = (sec: number) => (sec / duration) * 100;
    const posToSec = (clientX: number): number => {
        const el = trackRef.current;
        if (!el) return 0;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0) return 0;
        return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
    };

    const commit = (id: string, start: number, end: number) => {
        let s = Math.max(0, Math.min(duration, start));
        let e = Math.max(0, Math.min(duration, end));
        if (e - s < MIN_DUR) {
            if (start >= duration - MIN_DUR) s = Math.max(0, e - MIN_DUR);
            else e = Math.min(duration, s + MIN_DUR);
        }
        const region = regions.find((r) => r.id === id);
        if (!region) return;
        const minStart = minStartOf(region);
        if (s < minStart) s = minStart;
        if (e < minStart) e = minStart;
        if (e <= s) e = Math.min(duration, s + MIN_DUR);
        onChangeRegion(id, {
            start_sec: Math.round(s * 100) / 100,
            end_sec: Math.round(e * 100) / 100,
        });
    };

    const handlePointerDown = (e: React.PointerEvent, id: string, handle: 'start' | 'end' | 'body') => {
        e.preventDefault();
        e.stopPropagation();
        const region = regions.find((r) => r.id === id);
        if (!region) return;
        // UX: click-giữ + kéo vùng nào → TỰ ĐỘNG chọn vùng đó (không cần thả chuột
        // rồi bấm lại) — vùng đang kéo luôn là vùng đang quản lý.
        if (onSelectRegion) onSelectRegion(id);
        dragRef.current = {
            id, handle,
            startX: e.clientX,
            origStartSec: startSecOf(region),
            origEndSec: endSecOf(region),
        };
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (scrubRef.current) {
            seekToSec(posToSec(e.clientX));
            return;
        }
        const drag = dragRef.current;
        if (!drag) return;
        const dx = posToSec(e.clientX) - posToSec(drag.startX);
        let s = drag.origStartSec;
        let end = drag.origEndSec;
        if (drag.handle === 'body') { s = drag.origStartSec + dx; end = drag.origEndSec + dx; }
        else if (drag.handle === 'start') { s = drag.origStartSec + dx; }
        else { end = drag.origEndSec + dx; }
        commit(drag.id, s, end);
    };

    const endDrag = (e?: React.PointerEvent) => {
        if (e) (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        dragRef.current = null;
        scrubRef.current = false;
    };

    const handleWordClick = (word: Word) => {
        const t = Math.max(0, Math.min(duration, word.start - beatStartSec));
        seekToSec(t);
        const region = selectedRegionId ? regions.find((r) => r.id === selectedRegionId) : undefined;
        if (!region) return;
        const minStart = minStartOf(region);
        const currentStart = region.start_sec != null ? startSecOf(region) : Math.max(minStart, t - 1.0);
        const s = Math.max(minStart, Math.min(t, currentStart));
        onChangeRegion(region.id, {
            start_sec: Math.round(s * 100) / 100,
            end_sec: Math.round(Math.max(s + MIN_DUR, t) * 100) / 100,
        });
    };

    // Vùng đang chọn: khoảng render [start_sec, end_sec] để highlight audio script.
    const selectedRegionObj = selectedRegionId ? regions.find((r) => r.id === selectedRegionId) : undefined;
    const selectedRange = selectedRegionObj
        ? { start: startSecOf(selectedRegionObj), end: endSecOf(selectedRegionObj) }
        : null;

    // Copy JSON timeline từ SERVER (override đã lưu → scene payload engine render).
    const copyTimelineJson = async () => {
        if (copying) return;
        const writeClipboard = (json: string) => {
            const done = () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
            };
            if (navigator.clipboard?.writeText) {
                void navigator.clipboard.writeText(json).then(done).catch(() => setCopied(false));
            } else {
                const ta = document.createElement('textarea');
                ta.value = json;
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); done(); } catch { /* noop */ }
                document.body.removeChild(ta);
            }
        };

        const sid = Number(shortVideoId || 0);
        const bid = String(beatId || '').trim();
        if (sid <= 0 || !bid) {
            onCopyError?.('Thiếu shortVideoId / beatId — không gọi được API server');
            return;
        }

        setCopying(true);
        try {
            const res = await getAgentWhiteboardBeatRenderTimeline(sid, bid);
            if (!res?.success || !res.timeline) {
                onCopyError?.(
                    typeof res?.message === 'string' && res.message
                        ? res.message
                        : 'Không lấy được timeline từ server',
                );
                return;
            }
            writeClipboard(JSON.stringify(res.timeline, null, 2));
        } catch (e) {
            onCopyError?.(e instanceof Error ? e.message : String(e));
        } finally {
            setCopying(false);
        }
    };

    return (
        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', pb: 0.5, userSelect: 'none' }}>
            <audio ref={audioRef} src={audioUrl || undefined} preload="auto" style={{ display: 'none' }} />
            <Box sx={{ width: '100%', maxWidth: maxWidth || '100%', userSelect: 'none' }}>
                {/* Từ như đoạn văn xuống dòng */}
                <Box
                    sx={{
                        maxHeight: 52,
                        overflowY: 'auto',
                        mb: 0.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 0.5,
                        bgcolor: 'background.paper',
                        lineHeight: 1.9,
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                    }}
                >
                    {beatWords.length === 0 ? (
                        <Typography variant="caption" color="text.secondary">
                            Chưa có whisper — kéo các điểm trên thanh để đặt thời gian render theo giây.
                        </Typography>
                    ) : (
                        beatWords.map((word) => {
                            const wi = word.index ?? 0;
                            const t = Math.max(0, Math.min(duration, word.start - beatStartSec));
                            const isCurrent = Math.abs(playhead - t) < 0.12;
                            const inRange = selectedRange
                                ? t >= selectedRange.start - 0.1 && t <= selectedRange.end + 0.1
                                : false;
                            return (
                                <Box
                                    component="span"
                                    key={wi}
                                    onClick={() => handleWordClick(word)}
                                    sx={{
                                        display: 'inline-block',
                                        cursor: 'pointer',
                                        borderRadius: 0.5,
                                        px: 0.35,
                                        py: 0.05,
                                        mr: 0.3,
                                        fontSize: 12,
                                        fontWeight: (isCurrent || inRange) ? 800 : 400,
                                        color: isCurrent ? '#f50057' : (inRange ? '#fff' : 'text.primary'),
                                        bgcolor: inRange ? 'primary.main' : 'transparent',
                                        '&:hover': { bgcolor: 'primary.light', color: '#fff' },
                                        userSelect: 'none',
                                        WebkitUserSelect: 'none',
                                    }}
                                    title={`«${word.text}» @ ${t.toFixed(2)}s — bấm để chạy audio + gắn mốc XONG cho vùng đang chọn`}
                                >
                                    {word.text}
                                </Box>
                            );
                        })
                    )}
                </Box>

                {/* Timeline nhiều dòng (kiểu CapCut) */}
                <Box sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden', bgcolor: 'background.paper' }}>
                    {/* Cột tên vùng */}
                    <Box sx={{ width: LABEL_W, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.04)' }}>
                        {/* Hàng 1: điều khiển audio */}
                        <Box sx={{ height: AUDIO_ROW_H, display: 'flex', alignItems: 'center', justifyContent: 'space-around', px: 0.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Tooltip title={playing ? 'Dừng' : 'Phát audio beat'}>
                                <IconButton size="small" onClick={togglePlay} disabled={!audioUrl} sx={{ p: 0.4 }}>
                                    {playing ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayArrowIcon sx={{ fontSize: 18 }} />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Phát lại từ đầu beat">
                                <IconButton size="small" onClick={replay} disabled={!audioUrl} sx={{ p: 0.4 }}>
                                    <ReplayIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={
                                copied
                                    ? 'Đã copy JSON timeline server!'
                                    : (copying
                                        ? 'Đang lấy timeline từ server…'
                                        : 'Copy JSON timeline server (đúng khi render)')
                            }>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={() => { void copyTimelineJson(); }}
                                        disabled={copying}
                                        sx={{ p: 0.4, color: copied ? 'success.main' : 'inherit' }}
                                    >
                                        <ContentCopyIcon sx={{ fontSize: 14 }} />
                                    </IconButton>
                                </span>
                            </Tooltip>
                        </Box>
                        {/* Các dòng vùng */}
                        {orderedRegions.map((region) => {
                            const index = regions.findIndex((r) => r.id === region.id);
                            const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                            const isSel = region.id === selectedRegionId;
                            return (
                                <Box
                                    key={region.id}
                                    onClick={() => onSelectRegion?.(region.id)}
                                    sx={{
                                        height: ROW_H, display: 'flex', alignItems: 'center', px: 0.5,
                                        borderTop: '1px solid', borderColor: 'divider',
                                        borderLeft: `3px solid ${color}`,
                                        bgcolor: isSel ? `${color}26` : 'transparent',
                                        cursor: 'pointer',
                                    }}
                                    title={`Click để chọn vùng ${region.name}`}
                                >
                                    <Typography variant="caption" sx={{
                                        fontSize: 10.5, fontWeight: 800, color: '#111',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>
                                        {region.name}{region.parent_id ? ' (con)' : ' (cha)'}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>

                    {/* Cột track */}
                    <Box
                        ref={trackRef}
                        sx={{
                            flex: 1, minWidth: 0, position: 'relative',
                            px: HANDLE_W / 2,
                            pl: 1,
                            overflow: 'hidden',
                            bgcolor: 'rgba(0,0,0,0.02)',
                            cursor: 'ew-resize',
                        }}
                        onPointerDown={(e) => {
                            scrubRef.current = true;
                            seekToSec(posToSec(e.clientX));
                            (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                        }}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                    >
                        {/* Hàng 1: THANH AUDIO SẠCH — chỉ thước giây + vạch từ (không mảnh màu).
                            Kéo/click trên hàng này (và khoảng trống track) = seek playhead + preview. */}
                        <Box
                            sx={{ position: 'relative', height: AUDIO_ROW_H, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'rgba(0,0,0,0.03)' }}
                            title="Kéo thanh audio để xem preview beat tại thời điểm đó"
                        >
                            {Array.from({ length: Math.max(1, Math.ceil(duration)) }).map((_, i) => (
                                <React.Fragment key={i}>
                                    <Box sx={{ position: 'absolute', left: `${(i / duration) * 100}%`, top: 5, height: 16, width: 1, bgcolor: 'rgba(0,0,0,0.25)' }} />
                                    <Typography sx={{ position: 'absolute', left: `${(i / duration) * 100}%`, top: 2, transform: 'translateX(2px)', fontSize: 9, color: 'text.secondary', fontWeight: 700 }}>
                                        {i}s
                                    </Typography>
                                </React.Fragment>
                            ))}
                            {beatWords.map((word) => {
                                const t = (word.start - beatStartSec) / duration;
                                if (t < 0 || t > 1) return null;
                                return <Box key={`tick-${word.index}`} sx={{ position: 'absolute', left: `${t * 100}%`, top: 22, height: 5, width: 1, bgcolor: 'rgba(0,0,0,0.40)' }} />;
                            })}
                        </Box>

                        {/* Dòng từng vùng — dải màu + tay kéo */}
                        {orderedRegions.map((region) => {
                            const index = regions.findIndex((r) => r.id === region.id);
                            const color = region.action === 'erase' ? '#f44336' : colorFor(index);
                            const isSel = region.id === selectedRegionId;
                            const start = startSecOf(region);
                            const end = endSecOf(region);
                            const left = secToPct(start);
                            const width = Math.max(0.01, secToPct(end) - left);
                            return (
                                <Box key={region.id} sx={{ position: 'relative', height: ROW_H, borderTop: '1px solid', borderColor: 'divider' }}>
                                    <Box
                                        onPointerDown={(e) => handlePointerDown(e, region.id, 'body')}
                                        onClick={() => onSelectRegion?.(region.id)}
                                        sx={{
                                            position: 'absolute', top: 3, bottom: 3,
                                            left: `${left}%`, width: `${width}%`,
                                            borderRadius: 1, bgcolor: color,
                                            opacity: isSel ? 0.9 : 0.6,
                                            border: `2px solid ${color}`,
                                            cursor: 'grab', boxSizing: 'border-box', zIndex: 1,
                                        }}
                                        title={`${region.name} — kéo giữa để di chuyển, click để chọn`}
                                    >
                                        {width > 6 ? (
                                            <Typography sx={{
                                                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: 8.5, fontWeight: 800, color: '#fff',
                                                textShadow: '0 1px 2px rgba(0,0,0,0.75)', overflow: 'hidden', whiteSpace: 'nowrap',
                                            }}>
                                                {region.name}
                                            </Typography>
                                        ) : null}
                                    </Box>
                                    <Box
                                        onPointerDown={(e) => handlePointerDown(e, region.id, 'start')}
                                        sx={{
                                            position: 'absolute', top: 1, bottom: 1,
                                            left: `calc(${left}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                            bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                            cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color, zIndex: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                        }}
                                        title="Kéo = thời điểm BẮT ĐẦU render"
                                    >
                                        <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                    </Box>
                                    <Box
                                        onPointerDown={(e) => handlePointerDown(e, region.id, 'end')}
                                        sx={{
                                            position: 'absolute', top: 1, bottom: 1,
                                            left: `calc(${secToPct(end)}% - ${HANDLE_W / 2}px)`, width: HANDLE_W,
                                            bgcolor: '#fff', border: `2px solid ${color}`, borderRadius: 1,
                                            cursor: 'ew-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color, zIndex: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                                        }}
                                        title="Kéo = thời điểm render XONG"
                                    >
                                        <DragHandleIcon sx={{ fontSize: 9, pointerEvents: 'none' }} />
                                    </Box>
                                    {/* HIỆU ỨNG SAU RENDER: place (full) hoặc draw
                                        (subset) — khoảng cố định engine chạy
                                        NGAY SAU bar vùng. Sọc chéo, không bắt chuột. */}
                                    {(region.action === 'place' || region.action === 'draw') ? (() => {
                                        const fxSec = region.action === 'draw'
                                            ? drawEffectAfterSec(region.place_effect)
                                            : placeEffectAfterSec(region.place_effect);
                                        if (!(fxSec > 0.01)) return null;
                                        const extStart = Math.min(end, duration);
                                        const extEnd = Math.min(duration, extStart + fxSec);
                                        const extLeft = secToPct(extStart);
                                        const extWidth = secToPct(extEnd) - extLeft;
                                        if (!(extWidth > 0)) return null;
                                        const fxLabel = region.action === 'draw'
                                            ? (region.place_effect || 'none')
                                            : (region.place_effect || 'loang');
                                        return (
                                            <Box
                                                key={`${region.id}-fx`}
                                                sx={{
                                                    position: 'absolute', top: 3, bottom: 3,
                                                    left: `${extLeft}%`, width: `${extWidth}%`,
                                                    borderRadius: 1,
                                                    background: `repeating-linear-gradient(45deg, ${color}59 0 6px, ${color}1f 6px 12px)`,
                                                    border: `1.5px dashed ${color}`,
                                                    borderLeft: `3px solid ${color}`,
                                                    zIndex: 1, pointerEvents: 'none',
                                                    overflow: 'hidden', boxSizing: 'border-box',
                                                }}
                                                title={`Hiệu ứng "${fxLabel}" chạy ~${fxSec}s sau khi ${region.action === 'draw' ? 'vẽ' : 'đặt ảnh'} xong`}
                                            >
                                                {extWidth >= 7 ? (
                                                    <Typography sx={{
                                                        position: 'absolute', inset: 0, display: 'flex',
                                                        alignItems: 'center', justifyContent: 'center',
                                                        fontSize: 8.5, fontWeight: 800, color: '#fff',
                                                        textShadow: '0 1px 2px rgba(0,0,0,0.75)',
                                                        overflow: 'hidden', whiteSpace: 'nowrap',
                                                    }}>
                                                        {`+${Math.round(fxSec * 10) / 10}s`}
                                                    </Typography>
                                                ) : null}
                                            </Box>
                                        );
                                    })() : null}
                                </Box>
                            );
                        })}

                        {/* VÙNG ĐỎ CUỐI BEAT = khoảng hiệu ứng chuyển cảnh (độ dài
                            THỰC TẾ theo transition đang chọn — mirror logic PHP).
                            Box bao trọn TẤT CẢ các dòng (từ thanh audio đến dòng vùng
                            cuối), bán trong suốt + pointer-events:none để không chặn
                            kéo/scrub trên timeline. */}
                        {transitionDur > 0.05 ? (
                            <Box sx={{
                                position: 'absolute', top: 0, bottom: 0,
                                left: `${secToPct(Math.max(0, duration - transitionDur))}%`, right: 0,
                                bgcolor: 'rgba(239,68,68,0.28)',
                                borderLeft: '2px solid rgba(239,68,68,0.95)',
                                boxShadow: 'inset 0 0 0 1px rgba(239,68,68,0.55)',
                                zIndex: 4, pointerEvents: 'none', overflow: 'hidden',
                            }}>
                                {100 - secToPct(Math.max(0, duration - transitionDur)) >= 7 ? (
                                    <Box sx={{
                                        position: 'absolute', top: AUDIO_ROW_H, left: 0, right: 0, bottom: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        <Typography sx={{
                                            fontSize: 9.5, fontWeight: 800, color: '#fff',
                                            whiteSpace: 'nowrap', px: 0.6, py: '1px', borderRadius: 0.5,
                                            bgcolor: 'rgba(185,28,28,0.72)',
                                            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                                        }}>
                                            {`Chuyển cảnh ${Math.round(transitionDur * 10) / 10}s`}
                                        </Typography>
                                    </Box>
                                ) : null}
                            </Box>
                        ) : null}

                        {/* PLAYHEAD — thanh đỏ dọc chạy qua tất cả các dòng (CapCut) */}
                        <Box sx={{
                            position: 'absolute', top: 0, bottom: 0,
                            left: `${secToPct(playhead)}%`, width: 2,
                            bgcolor: '#f50057', zIndex: 6, pointerEvents: 'none',
                        }}>
                            <Box sx={{ position: 'absolute', top: 0, left: -4, width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '7px solid #f50057' }} />
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
