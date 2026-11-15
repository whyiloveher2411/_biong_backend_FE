import React from 'react';
import { Box } from '@mui/material';

/** Dữ liệu từ get-agent-audio-content.story_overlay (voice-mode + chữ xuyên suốt). */
export type StoryOverlayHudSlot = {
    id: string;
    kind: 'counter' | 'label';
    anchor: 'top-left' | 'top-center' | 'top-right';
    label: string;
    color: string;
    initial: number | string;
};
export type StoryOverlayData = {
    voice_mode?: 'full' | 'mixed' | 'none';
    hud?: {
        slots: StoryOverlayHudSlot[];
        keys: { slot: string; beat_id: string; local_sec: number; value: number | string; tween_sec: number }[];
        hidden_beats: string[];
        number_locale?: string;
    } | null;
    captions?: Record<string, { type: 'voice' | 'caption'; text: string; start: number; end: number }[]>;
};
type Section = { id: string; startSec: number; endSec: number };

const easeOut = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);

/** Giá trị slot tại giây tuyệt đối t — cùng công thức với render-hud-strip.py. */
export function hudSlotValue(slot: StoryOverlayHudSlot, keys: { t: number; value: number | string; tween_sec: number }[], t: number): number | string {
    let value: number | string = slot.initial;
    for (const key of keys) {
        if (key.t > t + 1e-6) break;
        if (slot.kind === 'counter' && key.tween_sec > 0 && t < key.t + key.tween_sec) {
            const from = Number(value) || 0;
            return from + (Number(key.value) - from) * easeOut((t - key.t) / key.tween_sec);
        }
        value = key.value;
    }
    return value;
}

/** Câu caption đang hiện: chia phần caption thành câu theo tỉ lệ số chữ (giống strip render). */
export function captionSentenceAt(text: string, start: number, end: number, t: number): string {
    const tokens = text.split(/\s+/).filter(Boolean);
    const sentences: string[][] = [];
    let current: string[] = [];
    tokens.forEach((token) => {
        current.push(token);
        if (/[.!?…:;]["'”’)]*$/.test(token) && current.length >= 3) {
            sentences.push(current);
            current = [];
        }
    });
    if (current.length) {
        if (sentences.length && current.length < 3) sentences[sentences.length - 1].push(...current);
        else sentences.push(current);
    }
    const weights = sentences.map((s) => s.reduce((n, w) => n + w.length + 1, 0));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let cursor = start;
    for (let i = 0; i < sentences.length; i += 1) {
        const next = i === sentences.length - 1 ? end : cursor + ((end - start) * weights[i]) / total;
        if (t >= cursor && t < next) return sentences[i].join(' ');
        cursor = next;
    }
    return '';
}

export default function StoryOverlay({ data, sections, time }: { data?: StoryOverlayData | null; sections: Section[]; time: number }) {
    const hud = data?.hud;
    const beat = sections.find((b) => time >= b.startSec && time < b.endSec);
    const startById = React.useMemo(() => new Map(sections.map((b) => [b.id, b.startSec])), [sections]);
    const keysBySlot = React.useMemo(() => {
        const map = new Map<string, { t: number; value: number | string; tween_sec: number }[]>();
        (hud?.keys || []).forEach((k) => {
            const start = startById.get(k.beat_id);
            if (start === undefined) return;
            const list = map.get(k.slot) || [];
            list.push({ t: start + k.local_sec, value: k.value, tween_sec: k.tween_sec });
            map.set(k.slot, list);
        });
        map.forEach((list) => list.sort((a, b) => a.t - b.t));
        return map;
    }, [hud, startById]);

    let caption = '';
    if (beat && data?.captions?.[beat.id]) {
        const local = time - beat.startSec;
        const parts = data.captions[beat.id];
        parts.forEach((part, i) => {
            const end = i === parts.length - 1 ? beat.endSec - beat.startSec : Math.max(part.end, parts[i + 1].start);
            if (part.type === 'caption' && local >= part.start && local < end) caption = captionSentenceAt(part.text, part.start, end, local);
        });
    }
    const hudVisible = Boolean(hud?.slots?.length) && !(beat && hud?.hidden_beats?.includes(beat.id));
    const locale = hud?.number_locale || 'vi-VN';
    const anchors: StoryOverlayHudSlot['anchor'][] = ['top-left', 'top-center', 'top-right'];

    return <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3, containerType: 'size' }} aria-hidden>
        {hudVisible ? anchors.map((anchor) => {
            const slots = (hud?.slots || []).filter((s) => s.anchor === anchor);
            if (!slots.length) return null;
            return <Box key={anchor} sx={{ position: 'absolute', top: '3.7cqh', ...(anchor === 'top-left' ? { left: '2.9cqw', textAlign: 'left' } : anchor === 'top-right' ? { right: '2.9cqw', textAlign: 'right' } : { left: 0, right: 0, textAlign: 'center' }), display: 'flex', flexDirection: 'column', gap: '1.6cqh', fontFamily: '"Be Vietnam Pro", sans-serif', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>
                {slots.map((slot) => {
                    const value = hudSlotValue(slot, keysBySlot.get(slot.id) || [], time);
                    const shown = slot.kind === 'counter'
                        ? Math.round(Number(value) || 0).toLocaleString(locale)
                        : String(value || '').toUpperCase();
                    return <Box key={slot.id}>
                        {slot.label ? <Box sx={{ fontSize: '2cqh', fontWeight: 600, color: 'rgba(255,255,255,.8)', textTransform: 'uppercase', lineHeight: 1.2 }}>{slot.label}</Box> : null}
                        <Box sx={{ fontSize: '4.6cqh', fontWeight: 800, color: slot.color, lineHeight: 1.1 }}>{shown}</Box>
                    </Box>;
                })}
            </Box>;
        }) : null}
        {caption ? <Box sx={{ position: 'absolute', left: '6%', right: '6%', bottom: '8cqh', textAlign: 'center', color: '#fff', fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontSize: '4.8cqh', lineHeight: 1.25, textShadow: '0 2px 8px rgba(0,0,0,.65)' }}>{caption}</Box> : null}
    </Box>;
}
