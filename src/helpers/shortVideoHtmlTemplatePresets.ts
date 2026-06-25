import type { ShortVideoHtmlClip } from './shortVideoRenderManifestTypes';

export type ShortVideoHtmlTemplateId =
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

export type ShortVideoHtmlTemplateData = {
    number?: string;
    label?: string;
    title?: string;
    text?: string;
    accent?: string;
    kicker?: string;
    subtitle?: string;
    badge?: string;
    emoji?: string;
    percent?: number;
    items?: string[];
};

const CARD_SHELL_CSS = `#app{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:72px 56px;background:transparent;pointer-events:none;}
.card{width:100%;max-width:920px;padding:56px 48px;border-radius:28px;background:linear-gradient(145deg,#f8f4ec 0%,#efe8dc 55%,#e8dfd0 100%);box-shadow:0 24px 80px rgba(0,0,0,0.45);animation:cardIn 0.55s cubic-bezier(.2,.8,.2,1) both;}
@keyframes cardIn{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}`;

export const SHORT_VIDEO_HTML_TEMPLATE_IDS: ShortVideoHtmlTemplateId[] = [
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

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
        case 'brand_card': {
            const accentPart = escapeHtml(String(data.accent ?? ''));
            const kicker = escapeHtml(String(data.kicker ?? ''));
            const subtitle = escapeHtml(String(data.subtitle ?? ''));
            const badge = escapeHtml(String(data.badge ?? ''));
            const titleDark = title || 'Tiêu đề';
            return {
                label: 'Brand card',
                html: `<div id="app"><div class="card">${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h1 class="title"><span class="dark">${titleDark}</span>${accentPart ? `<span class="accent">${accentPart}</span>` : ''}</h1><div class="rule"></div>${subtitle ? `<p class="sub">${subtitle}</p>` : ''}${badge ? `<div class="badge">${badge}</div>` : ''}</div></div>`,
                css: `${CARD_SHELL_CSS}
.kicker{margin:0 0 16px;font:600 22px/1.2 system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#e85d2c}
.title{margin:0;font:800 88px/1.02 Georgia,"Times New Roman",serif;color:#111}
.dark{color:#111}.accent{color:#e85d2c}
.rule{width:120px;height:4px;background:#e85d2c;margin:28px 0;border-radius:2px}
.sub{margin:0;font:400 34px/1.35 Georgia,"Times New Roman",serif;color:#4a4a4a;max-width:90%}
.badge{display:inline-flex;margin-top:32px;padding:14px 22px;border-radius:999px;background:rgba(232,93,44,.12);border:1px solid rgba(232,93,44,.35);font:600 24px/1 system-ui,sans-serif;color:#333}`,
                js: '',
            };
        }
        case 'hook_text':
            return {
                label: 'Hook text',
                html: `<div id="app"><div class="card"><h1 class="hook">${title || 'Hook'}</h1></div></div>`,
                css: `${CARD_SHELL_CSS}
.hook{margin:0;font:800 64px/1.08 Georgia,"Times New Roman",serif;color:#111;text-align:left}`,
                js: '',
            };
        case 'big_number':
            return {
                label: 'Big number',
                html: `<div id="app"><div class="card stats"><p class="num">${number || '0%'}</p>${label ? `<p class="lbl">${label}</p>` : ''}</div></div>`,
                css: `${CARD_SHELL_CSS}
.stats{align-items:flex-start}
.num{margin:0;font:800 108px/1 system-ui,sans-serif;color:#e85d2c;letter-spacing:-0.02em}
.lbl{margin:16px 0 0;font:500 32px/1.3 system-ui,sans-serif;color:#333}`,
                js: '',
            };
        case 'listicle': {
            const items = Array.isArray(data.items) ? data.items.slice(0, 3) : [];
            const lis = (items.length > 0 ? items : ['Tip 1', 'Tip 2', 'Tip 3'])
                .map((item, index) => {
                    const text = escapeHtml(String(item));
                    return `<li style="animation-delay:${index * 0.15}s">${text}</li>`;
                })
                .join('');
            return {
                label: 'Listicle',
                html: `<div id="app"><ul>${lis}</ul></div>`,
                css: `@keyframes slideIn { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
#app { display:flex; align-items:center; min-height:100vh; padding:64px; }
ul { margin:0; padding:0; list-style:none; }
li { margin:0 0 20px; font-size:40px; color:#fff; font-family:system-ui,sans-serif; animation:slideIn 0.5s ease-out both; }`,
                js: '',
            };
        }
        case 'lower_third':
            return {
                label: 'Lower third',
                html: `<div id="app"><div class="bar"><span>${title || 'Caption'}</span></div></div>`,
                css: `@keyframes slideUp { from{opacity:0;transform:translateY(40px)} to{opacity:1;transform:translateY(0)} }
#app { display:flex; align-items:flex-end; min-height:100vh; padding:0 0 120px 48px; }
.bar { background:rgba(0,0,0,0.75); padding:16px 28px; border-left:4px solid #ff3331; animation:slideUp 0.45s ease-out both; }
span { color:#fff; font-size:32px; font-family:system-ui,sans-serif; }`,
                js: '',
            };
        case 'emoji_reaction':
            return {
                label: 'Emoji',
                html: `<div id="app"><span class="emo">${emoji}</span></div>`,
                css: `@keyframes shake { 0%,100%{transform:rotate(0)} 25%{transform:rotate(-8deg)} 75%{transform:rotate(8deg)} }
#app { display:flex; align-items:center; justify-content:center; min-height:100vh; }
.emo { font-size:120px; animation:shake 0.6s ease-in-out both; }`,
                js: '',
            };
        case 'progress_bar':
            return {
                label: 'Progress',
                html: `<div id="app"><div class="track"><div class="fill" id="fill"></div></div><p class="pct">${percent}%</p></div>`,
                css: `#app { display:flex; flex-direction:column; align-items:flex-start; justify-content:center; min-height:100vh; padding:64px; gap:16px; }
.track { width:80%; height:16px; background:rgba(255,255,255,0.2); border-radius:8px; overflow:hidden; }
.fill { height:100%; width:0%; background:#ff3331; border-radius:8px; transition:width 0.3s ease; }
.pct { margin:0; color:#fff; font-size:48px; font-family:system-ui,sans-serif; }`,
                js: `(function(){var p=${percent};var el=document.getElementById("fill");function seek(t){if(el)el.style.width=Math.min(100,p*(t/2))+"%";}window.addEventListener("shortvideo:seek",function(e){seek(e.detail&&e.detail.timeSec||0);});})();`,
            };
        case 'intro':
            return {
                label: 'Intro HTML',
                html: `<div id="app"><p class="eyebrow">Spacedev</p><h1>${title || 'Tiêu đề intro'}</h1></div>`,
                css: `@keyframes rise { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
#app { display:flex; flex-direction:column; align-items:flex-start; justify-content:center; min-height:100vh; padding:64px; color:#fff; font-family:system-ui,sans-serif; }
.eyebrow { margin:0 0 12px; font-size:28px; color:#ff3331; animation:rise 0.6s ease-out both; }
h1 { margin:0; font-size:72px; line-height:1.1; animation:rise 0.8s ease-out 0.15s both; }`,
                js: '',
            };
        case 'cta':
            return {
                label: 'CTA HTML',
                html: '<div id="app"><p class="cta-label">Tải ngay</p><h1>Spacedev</h1></div>',
                css: `@keyframes pulse { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
#app { display:flex; flex-direction:column; align-items:flex-start; justify-content:center; min-height:100vh; padding:64px; color:#fff; font-family:system-ui,sans-serif; }
.cta-label { margin:0 0 8px; font-size:24px; color:#ff3331; animation:pulse 0.5s ease-out both; }
h1 { margin:0; font-size:56px; line-height:1.15; animation:pulse 0.7s ease-out 0.1s both; }`,
                js: '',
            };
        default:
            return null;
    }
}
