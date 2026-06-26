import type { ShortVideoHtmlClip } from './shortVideoRenderManifestTypes';
import {
    buildFrameBaseCss,
    buildFrameShellHtml,
    type FrameShellOptions,
} from './shortVideoFrameDesignTokens';

export type ShortVideoHtmlTemplateId =
    | 'frame_cover'
    | 'frame_chapter_divider'
    | 'frame_ledger'
    | 'frame_manifesto'
    | 'frame_poster_panel'
    | 'frame_strand_list'
    | 'hook_text'
    | 'brand_card'
    | 'big_number'
    | 'listicle'
    | 'lower_third'
    | 'emoji_reaction'
    | 'progress_bar'
    | 'intro'
    | 'cta'
    | 'custom';

export type ShortVideoHtmlLedgerRow = {
    date?: string;
    title?: string;
    venue?: string;
    duration?: string;
};

export type ShortVideoHtmlStrandItem = {
    numeral?: string;
    title?: string;
    body?: string;
};

export type ShortVideoHtmlTemplateData = {
    number?: string;
    label?: string;
    title?: string;
    text?: string;
    accent?: string;
    accentWord?: string;
    kicker?: string;
    subtitle?: string;
    badge?: string;
    emoji?: string;
    percent?: number;
    items?: string[] | ShortVideoHtmlStrandItem[];
    ordinal?: string;
    railLabel?: string;
    quote?: string;
    attribution?: string;
    headline?: string;
    panelSide?: 'top' | 'bottom';
    dateRail?: string;
    footerCells?: string[];
    pagenum?: string;
    rows?: ShortVideoHtmlLedgerRow[];
};

const FRAME_CSS = buildFrameBaseCss();

export const SHORT_VIDEO_HTML_TEMPLATE_IDS: ShortVideoHtmlTemplateId[] = [
    'frame_cover',
    'frame_chapter_divider',
    'frame_ledger',
    'frame_manifesto',
    'frame_poster_panel',
    'frame_strand_list',
    'hook_text',
    'brand_card',
    'big_number',
    'listicle',
    'lower_third',
    'emoji_reaction',
    'progress_bar',
    'intro',
    'cta',
    'custom',
];

export const SHORT_VIDEO_FRAME_TEMPLATE_IDS: ShortVideoHtmlTemplateId[] = [
    'frame_cover',
    'frame_chapter_divider',
    'frame_ledger',
    'frame_manifesto',
    'frame_poster_panel',
    'frame_strand_list',
];

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function framePreset(
    label: string,
    innerHtml: string,
    extraCss = '',
    js = '',
    shellOptions?: FrameShellOptions
): Partial<ShortVideoHtmlClip> {
    return {
        label,
        html: buildFrameShellHtml(innerHtml, shellOptions),
        css: `${FRAME_CSS}\n${extraCss}`.trim(),
        js,
    };
}

const OVER_BROLL_LOWER_THIRD_INNER = {
    hook: (title: string) => (
        `<div class="lower-third frame-stagger-1"><h1 class="type-display">${title}</h1></div>`
    ),
    bigNumber: (number: string, label: string) => (
        `<div class="lower-third frame-stagger-1"><p class="type-numeral-jumbo frame-stagger-2">${number}</p>${label ? `<p class="type-body frame-stagger-3" style="margin-top:1.5cqw">${label}</p>` : ''}</div>`
    ),
    progress: (percent: number) => (
        `<div class="lower-third frame-stagger-1"><div class="progress-track"><div class="progress-fill" id="fill"></div></div><p class="progress-pct frame-stagger-2">${percent}%</p></div>`
    ),
};

function buildFooterBand(cells: string[]): string {
    const slice = cells.slice(0, 4);
    while (slice.length < 2) {
        slice.push('—');
    }
    return `<div class="footer-band">${slice
        .map((cell) => `<div class="footer-band__cell"><p class="type-body">${escapeHtml(cell)}</p></div>`)
        .join('')}</div>`;
}

function buildStrandRows(items: ShortVideoHtmlStrandItem[] | string[]): string {
    const normalized: ShortVideoHtmlStrandItem[] = items.map((item, index) => {
        if (typeof item === 'string') {
            return { numeral: String(index + 1).padStart(2, '0'), title: item };
        }
        return {
            numeral: item.numeral ?? String(index + 1).padStart(2, '0'),
            title: item.title ?? '',
            body: item.body,
        };
    });
    return normalized
        .filter((row) => row.title)
        .slice(0, 4)
        .map(
            (row) =>
                `<div class="strand-row"><p class="strand-row__title">${escapeHtml(row.numeral ?? '')} · ${escapeHtml(row.title ?? '')}</p>${row.body ? `<p class="strand-row__body">${escapeHtml(row.body)}</p>` : ''}</div>`
        )
        .join('');
}

function buildLedgerRows(rows: ShortVideoHtmlLedgerRow[]): string {
    const slice = rows.length > 0 ? rows : [{ date: '—', title: '— figure —', duration: '—' }];
    return slice
        .slice(0, 5)
        .map(
            (row) =>
                `<div class="ledger-row"><span class="ledger-row__date">${escapeHtml(row.date ?? '—')}</span><span class="ledger-row__title">${escapeHtml(row.title ?? '')}</span><span class="ledger-row__duration">${escapeHtml(row.duration ?? '—')}</span></div>`
        )
        .join('');
}

function resolveFrameCover(data: ShortVideoHtmlTemplateData): Partial<ShortVideoHtmlClip> {
    const kicker = escapeHtml(String(data.kicker ?? ''));
    const title = escapeHtml(String(data.title ?? data.text ?? 'Tiêu đề'));
    const accentWord = escapeHtml(String(data.accentWord ?? data.accent ?? ''));
    const dateRail = escapeHtml(String(data.dateRail ?? ''));
    const footerCells = Array.isArray(data.footerCells) ? data.footerCells : [];
    const titleHtml = accentWord
        ? `${title} <em>${accentWord}</em>`
        : title;

    const inner = `${kicker ? `<p class="micro-label frame-stagger-1">${kicker}</p>` : ''}<h1 class="type-display frame-stagger-2">${titleHtml}</h1>${data.subtitle ? `<p class="type-body frame-stagger-3" style="margin-top:2.5cqw;max-width:78cqw">${escapeHtml(String(data.subtitle))}</p>` : ''}${footerCells.length > 0 ? buildFooterBand(footerCells) : ''}`;

    return framePreset(
        'Frame cover',
        inner,
        dateRail ? `.date-rail{display:block}` : '',
        '',
        { pagenum: data.pagenum }
    );
}

function resolveFrameChapterDivider(data: ShortVideoHtmlTemplateData): Partial<ShortVideoHtmlClip> {
    const ordinal = escapeHtml(String(data.ordinal ?? data.number ?? '01'));
    const title = escapeHtml(String(data.title ?? data.label ?? ''));
    const railLabel = escapeHtml(String(data.railLabel ?? data.kicker ?? ''));

    const inner = `${railLabel ? `<p class="rail-label rail-label--top">${railLabel}</p>` : ''}<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center"><p class="type-numeral-jumbo">${ordinal}</p>${title ? `<p class="type-display--sm" style="margin-top:2cqw">${title}</p>` : ''}</div>`;

    return framePreset('Frame chapter', inner, '.sun-bloom--left{display:none}.sun-bloom--center{display:block}', '', {
        pagenum: data.pagenum,
    });
}

function resolveFrameLedger(data: ShortVideoHtmlTemplateData): Partial<ShortVideoHtmlClip> {
    const headline = escapeHtml(String(data.headline ?? data.title ?? ''));
    const rows = Array.isArray(data.rows) ? data.rows : [];

    const inner = `${headline ? `<p class="micro-label">${headline}</p>` : ''}<div class="hairline-rule"></div>${buildLedgerRows(rows)}`;

    return framePreset('Frame ledger', inner, '.sun-bloom{opacity:0.45;width:40cqw;height:40cqw}', '', {
        pagenum: data.pagenum,
    });
}

function resolveFrameManifesto(data: ShortVideoHtmlTemplateData): Partial<ShortVideoHtmlClip> {
    const quote = escapeHtml(String(data.quote ?? data.text ?? data.title ?? '—'));
    const attribution = escapeHtml(String(data.attribution ?? data.label ?? ''));

    const inner = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6cqw 0"><p class="quote-mark">"</p><p class="type-display-it">${quote}</p>${attribution ? `<p class="micro-label" style="margin-top:3cqw;text-align:center">${attribution}</p>` : ''}</div>`;

    return framePreset(
        'Frame manifesto',
        inner,
        '.sun-bloom--left{display:none}.sun-bloom--center{display:block}',
        '',
        { pagenum: data.pagenum }
    );
}

function resolveFramePosterPanel(data: ShortVideoHtmlTemplateData): Partial<ShortVideoHtmlClip> {
    const kicker = escapeHtml(String(data.kicker ?? ''));
    const headline = escapeHtml(String(data.headline ?? data.title ?? data.text ?? 'Statement'));
    const panelSide = data.panelSide === 'bottom' ? 'bottom' : 'top';
    const panelClass = panelSide === 'bottom' ? 'yellow-panel--bottom' : 'yellow-panel--top';

    const inner = `<div class="yellow-panel ${panelClass}">${kicker ? `<p class="micro-label">${kicker}</p>` : ''}<h1 class="type-display--sm">${headline}</h1></div><div style="flex:1"></div>`;

    return framePreset('Frame poster', inner, '', '', { pagenum: data.pagenum });
}

function resolveFrameStrandList(data: ShortVideoHtmlTemplateData): Partial<ShortVideoHtmlClip> {
    const kicker = escapeHtml(String(data.kicker ?? data.label ?? ''));
    const items = Array.isArray(data.items) ? data.items : ['Tip 1', 'Tip 2', 'Tip 3'];

    const inner = `${kicker ? `<p class="micro-label">${kicker}</p>` : ''}<div class="hairline-rule hairline-rule--soft"></div>${buildStrandRows(items)}`;

    return framePreset('Frame strand list', inner, '', '', { pagenum: data.pagenum });
}

export function resolveShortVideoHtmlTemplatePreset(
    templateId: ShortVideoHtmlTemplateId,
    data: ShortVideoHtmlTemplateData = {}
): Partial<ShortVideoHtmlClip> | null {
    const number = escapeHtml(String(data.number ?? ''));
    const label = escapeHtml(String(data.label ?? ''));
    const title = escapeHtml(String(data.title ?? data.text ?? ''));
    const emoji = escapeHtml(String(data.emoji ?? '🤔'));
    const percent = Math.max(0, Math.min(100, Number(data.percent ?? 0)));

    switch (templateId) {
        case 'frame_cover':
            return resolveFrameCover(data);
        case 'frame_chapter_divider':
            return resolveFrameChapterDivider(data);
        case 'frame_ledger':
            return resolveFrameLedger(data);
        case 'frame_manifesto':
            return resolveFrameManifesto(data);
        case 'frame_poster_panel':
            return resolveFramePosterPanel(data);
        case 'frame_strand_list':
            return resolveFrameStrandList(data);
        case 'brand_card': {
            const accentPart = escapeHtml(String(data.accent ?? ''));
            const kicker = escapeHtml(String(data.kicker ?? ''));
            const subtitle = escapeHtml(String(data.subtitle ?? ''));
            const badge = escapeHtml(String(data.badge ?? ''));
            const titleDark = title || 'Tiêu đề';
            const inner = `${kicker ? `<p class="micro-label">${kicker}</p>` : ''}<h1 class="type-display">${titleDark}${accentPart ? ` <em>${accentPart}</em>` : ''}</h1><div class="hairline-rule"></div>${subtitle ? `<p class="type-body" style="max-width:78cqw">${subtitle}</p>` : ''}${badge ? `<p class="micro-label" style="margin-top:3cqw">${badge}</p>` : ''}`;
            return framePreset('Brand card', inner, '', '', { pagenum: data.pagenum });
        }
        case 'hook_text':
            return framePreset(
                'Hook text',
                OVER_BROLL_LOWER_THIRD_INNER.hook(title || 'Hook'),
                '',
                '',
                { pagenum: data.pagenum }
            );
        case 'big_number':
            return framePreset(
                'Big number',
                OVER_BROLL_LOWER_THIRD_INNER.bigNumber(number || '— figure —', label),
                '.sun-bloom--left{display:none}',
                '',
                { pagenum: data.pagenum }
            );
        case 'listicle': {
            const items = Array.isArray(data.items) ? data.items : ['Tip 1', 'Tip 2', 'Tip 3'];
            return framePreset(
                'Listicle',
                buildStrandRows(items),
                '',
                '',
                { pagenum: data.pagenum }
            );
        }
        case 'lower_third':
            return framePreset(
                'Lower third',
                `<div class="lower-third">${label ? `<p class="micro-label">${label}</p>` : ''}<p class="type-body">${title || 'Caption'}</p></div>`,
                '',
                '',
                { pagenum: data.pagenum }
            );
        case 'emoji_reaction':
            return framePreset(
                'Emoji',
                `<div style="flex:1;display:flex;align-items:center;justify-content:center"><span class="emoji-glyph">${emoji}</span></div>`,
                '.sun-bloom--center{display:block}.sun-bloom--left{display:none}',
                '',
                { pagenum: data.pagenum }
            );
        case 'progress_bar':
            return framePreset(
                'Progress',
                OVER_BROLL_LOWER_THIRD_INNER.progress(percent),
                '',
                `(function(){var p=${percent};var el=document.getElementById("fill");var dur=Math.max(0.5,Number(window.__shortVideoClipDurationSec)||2);function seek(t){if(!el)return;var ratio=Math.min(1,Math.max(0,t/dur));el.style.width=(p*ratio)+"%";}window.addEventListener("shortvideo:seek",function(e){seek(e.detail&&e.detail.timeSec||0);});})();`,
                { pagenum: data.pagenum }
            );
        case 'intro':
            return resolveFrameCover({
                ...data,
                kicker: data.kicker ?? 'Spacedev',
                title: data.title ?? 'Tiêu đề intro',
            });
        case 'cta':
            return resolveFramePosterPanel({
                ...data,
                kicker: data.kicker ?? 'Tải ngay',
                headline: data.headline ?? data.title ?? 'Spacedev',
                panelSide: data.panelSide ?? 'bottom',
            });
        default:
            return null;
    }
}
