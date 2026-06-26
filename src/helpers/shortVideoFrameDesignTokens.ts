/**
 * Biennale Yellow Frame design tokens — mirror FRAME.md + marketing-short-video-frame-design-helper.php
 */

export const FRAME_COLORS = {
    paper: '#E9E5DB',
    paperDeep: '#DCD6C4',
    sun: '#F1EE2E',
    sunSoft: '#F8F39B',
    haze: '#F0DA7C',
    ink: '#1B2566',
    ember: '#E26B4A',
} as const;

/** Nền parchment mặc định — layer dưới cùng suốt video. */
export const FRAME_DEFAULT_VIDEO_BG = FRAME_COLORS.paper;

export const FRAME_FONTS_GOOGLE_URL =
    'https://fonts.googleapis.com/css2?family=Archivo:wght@400;600&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400&display=swap';

export const FRAME_FONT_SERIF = '"Instrument Serif", Georgia, serif';
export const FRAME_FONT_SANS = 'Archivo, system-ui, sans-serif';
export const FRAME_FONT_MONO = '"JetBrains Mono", monospace';

/** Detect FRAME-styled clip (needs Google Fonts). */
export function clipUsesFrameDesign(css: string, html?: string): boolean {
    const blob = `${css}\n${html ?? ''}`;
    return (
        blob.includes('#frame')
        || blob.includes('sun-bloom')
        || blob.includes('frame-')
        || blob.includes(FRAME_COLORS.paper)
        || blob.includes('Instrument Serif')
    );
}

/** Shared base + component CSS for 9:16 short video overlays. */
export function buildFrameBaseCss(): string {
    const { ink, sun, sunSoft, haze, ember } = FRAME_COLORS;
    return `
#frame{
  container-type:size;
  width:100%;height:100%;
  position:relative;
  background:transparent;
  color:${ink};
  font-family:${FRAME_FONT_SANS};
  font-weight:400;
  overflow:hidden;
  pointer-events:none;
}
.frame-content{
  position:relative;
  z-index:2;
  width:100%;height:100%;
  display:flex;
  flex-direction:column;
  padding:4cqw;
  box-sizing:border-box;
}
.sun-bloom{
  position:absolute;
  z-index:0;
  width:58cqw;height:58cqw;
  border-radius:0;
  background:radial-gradient(circle at 42% 38%,${sun} 0%,${sunSoft} 38%,${haze} 62%,transparent 78%);
  opacity:0.95;
  pointer-events:none;
}
.sun-bloom--left{left:-8cqw;top:18cqh;}
.sun-bloom--center{left:50%;top:38%;transform:translate(-50%,-50%);}
.sun-bloom--corner{right:-6cqw;top:-4cqw;width:48cqw;height:48cqw;}
.ember-bloom{
  position:absolute;
  z-index:1;
  width:36cqw;height:36cqw;
  right:0;bottom:12cqh;
  background:radial-gradient(circle at 60% 60%,${ember} 0%,transparent 72%);
  opacity:0.18;
  pointer-events:none;
}
.pagenum{
  position:absolute;
  right:4cqw;bottom:3.2cqw;
  z-index:5;
  font-family:${FRAME_FONT_MONO};
  font-size:13px;
  letter-spacing:0.08em;
  color:${ink};
  opacity:0.75;
}
.hairline-rule{
  width:100%;height:0;
  border:none;
  border-top:1px solid ${ink};
  margin:2.5cqw 0;
}
.hairline-rule--soft{
  border-top-color:rgba(27,37,102,0.2);
}
.micro-label{
  margin:0 0 2cqw;
  font-family:${FRAME_FONT_SANS};
  font-size:13px;
  font-weight:600;
  letter-spacing:0.18em;
  text-transform:uppercase;
  color:${ink};
}
.rail-label{
  position:absolute;
  left:2.4cqw;top:50%;
  transform:rotate(-90deg) translateX(-50%);
  transform-origin:left center;
  font-family:${FRAME_FONT_SANS};
  font-size:13px;
  font-weight:600;
  letter-spacing:0.32em;
  text-transform:uppercase;
  color:${ink};
  z-index:3;
  white-space:nowrap;
}
.rail-label--top{
  position:relative;left:auto;top:auto;
  transform:none;
  margin-bottom:3cqw;
}
.type-display{
  margin:0;
  font-family:${FRAME_FONT_SERIF};
  font-weight:400;
  font-size:clamp(4.6cqw,14.6cqw,14.6cqw);
  line-height:1.06;
  letter-spacing:-0.005em;
  color:${ink};
}
.type-display--sm{
  font-size:clamp(2.9cqw,5.5cqw,5.5cqw);
  line-height:1.1;
}
.type-display-it{
  margin:0;
  font-family:${FRAME_FONT_SERIF};
  font-style:italic;
  font-weight:400;
  font-size:clamp(4cqw,7cqw,7cqw);
  line-height:1.04;
  letter-spacing:-0.005em;
  color:${ink};
  text-align:center;
}
.type-numeral-jumbo{
  margin:0;
  font-family:${FRAME_FONT_SERIF};
  font-weight:400;
  font-size:clamp(14cqw,22cqw,22cqw);
  line-height:0.84;
  letter-spacing:-0.04em;
  color:${ink};
}
.type-body{
  margin:0;
  font-family:${FRAME_FONT_SANS};
  font-size:clamp(1.4cqw,2.8cqw,2.8cqw);
  line-height:1.5;
  color:${ink};
}
.type-mono{
  font-family:${FRAME_FONT_MONO};
  font-size:clamp(1.4cqw,2.2cqw,2.2cqw);
  letter-spacing:0.04em;
  color:${ink};
}
.yellow-panel{
  background:${sun};
  color:${ink};
  padding:4cqw;
  box-sizing:border-box;
}
.yellow-panel--top{
  position:absolute;left:0;right:0;top:0;
  min-height:38cqh;
  z-index:1;
}
.yellow-panel--bottom{
  position:absolute;left:0;right:0;bottom:0;
  min-height:38cqh;
  z-index:1;
}
.strand-row{
  padding:2.2cqw 0;
  border-bottom:1px solid rgba(27,37,102,0.2);
}
.strand-row:last-child{border-bottom:none;}
.strand-row__title{
  margin:0 0 0.8cqw;
  font-family:${FRAME_FONT_SERIF};
  font-size:clamp(2cqw,3.2cqw,3.2cqw);
  line-height:1.1;
  color:${ink};
}
.strand-row__body{
  margin:0;
  font-family:${FRAME_FONT_SANS};
  font-size:clamp(1.4cqw,2.4cqw,2.4cqw);
  line-height:1.45;
  color:${ink};
}
.ledger-row{
  display:grid;
  grid-template-columns:14cqw 1fr 10cqw;
  gap:2cqw;
  align-items:baseline;
  padding:1.8cqw 0;
  border-bottom:1px solid rgba(27,37,102,0.2);
}
.ledger-row__date,.ledger-row__duration{
  font-family:${FRAME_FONT_MONO};
  font-size:clamp(1.2cqw,1.8cqw,1.8cqw);
  letter-spacing:0.04em;
}
.ledger-row__title{
  font-family:${FRAME_FONT_SERIF};
  font-size:clamp(1.6cqw,2.4cqw,2.4cqw);
  line-height:1.15;
}
.footer-band{
  margin-top:auto;
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:2cqw;
  padding-top:2.5cqw;
  border-top:1px solid ${ink};
}
.footer-band__cell .micro-label{margin-bottom:0.6cqw;}
.footer-band__cell .type-body{font-size:clamp(1.2cqw,2cqw,2cqw);}
.date-rail{
  position:absolute;
  right:4cqw;top:4cqw;
  font-family:${FRAME_FONT_SERIF};
  font-size:clamp(3cqw,5cqw,5cqw);
  line-height:0.96;
  letter-spacing:-0.005em;
  color:${ink};
  z-index:3;
}
.lower-third{
  margin-top:auto;
  padding-top:2cqw;
  border-top:1px solid rgba(27,37,102,0.2);
}
.progress-track{
  width:72cqw;height:1px;
  background:rgba(27,37,102,0.25);
  position:relative;
  margin:2cqw 0 1.2cqw;
}
.progress-fill{
  position:absolute;left:0;top:0;bottom:0;
  width:0%;
  background:${sun};
}
.progress-pct{
  margin:0;
  font-family:${FRAME_FONT_MONO};
  font-size:clamp(2.4cqw,4cqw,4cqw);
  letter-spacing:0.04em;
}
.emoji-glyph{
  font-size:clamp(8cqw,14cqw,14cqw);
  line-height:1;
  color:${ink};
}
.quote-mark{
  margin:0 0 2cqw;
  font-family:${FRAME_FONT_SERIF};
  font-size:clamp(6cqw,10cqw,10cqw);
  line-height:0.9;
  color:${ink};
  text-align:center;
}
@keyframes frameFadeIn{
  from{opacity:0;transform:translateY(1.2cqw)}
  to{opacity:1;transform:translateY(0)}
}
.frame-animate-in{animation:frameFadeIn 0.55s ease-out both;}
@keyframes frameStaggerIn{
  from{opacity:0;transform:translateY(2cqw)}
  to{opacity:1;transform:translateY(0)}
}
.frame-stagger-1{animation:frameStaggerIn 0.5s ease-out 0.08s both;}
.frame-stagger-2{animation:frameStaggerIn 0.5s ease-out 0.18s both;}
.frame-stagger-3{animation:frameStaggerIn 0.5s ease-out 0.28s both;}
#frame[data-overlay="over_broll"] .sun-bloom,
#frame[data-overlay="over_broll"] .ember-bloom{display:none!important}
#frame[data-overlay="over_broll"] .frame-content{
  justify-content:flex-end;
  padding-bottom:10cqw;
  padding-top:52cqh;
}
#frame[data-overlay="over_broll"] .frame-over-broll-slot{
  width:100%;
  max-width:88cqw;
}
#frame[data-overlay="over_broll"] .type-numeral-jumbo{
  font-size:clamp(8cqw,14cqw,14cqw);
  line-height:0.9;
}
#frame[data-overlay="over_broll"] .type-display{
  font-size:clamp(3.2cqw,6.8cqw,6.8cqw);
  line-height:1.08;
}
#frame[data-overlay="over_broll"] .lower-third{
  margin-top:0;
  padding:2.5cqw 3cqw;
  background:linear-gradient(180deg,rgba(233,229,219,0) 0%,rgba(233,229,219,0.92) 28%,rgba(233,229,219,0.96) 100%);
  border-top:1px solid rgba(27,37,102,0.25);
}
`.trim();
}

/** CSS bổ sung khi patch clip cũ sang over_broll (đã có trong buildFrameBaseCss — marker để tránh duplicate). */
export const FRAME_OVER_BROLL_MARKER = 'data-overlay="over_broll"';

export type FrameShellOptions = {
    pagenum?: string;
    overBroll?: boolean;
};

export function buildFrameShellHtml(innerHtml: string, options?: FrameShellOptions): string {
    const pagenum = options?.pagenum ?? '—';
    const overBroll = options?.overBroll === true;
    if (overBroll) {
        return `<div id="frame" data-frame="1" data-overlay="over_broll">
<div class="frame-content frame-animate-in frame-over-broll-slot">${innerHtml}</div>
</div>`;
    }
    return `<div id="frame" data-frame="1">
<div class="sun-bloom sun-bloom--left" aria-hidden="true"></div>
<div class="ember-bloom" aria-hidden="true"></div>
<div class="frame-content frame-animate-in">${innerHtml}</div>
<span class="pagenum">${pagenum}</span>
</div>`;
}
