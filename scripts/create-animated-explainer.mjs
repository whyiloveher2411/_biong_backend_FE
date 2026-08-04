import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const outDir = '/Users/mac/Desktop/backend/_biong_backend_FE/outputs/animated-explainer';
fs.mkdirSync(`${outDir}/frames`, { recursive: true });

const W = 1080, H = 1080, fps = 30, frames = 300;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const slide = (t, start, duration = 0.55) => ease((t - start) / duration);
const opacity = (t, start, duration = 0.45) => clamp((t - start) / duration);

function text(x, y, value, size, fill = '#F7F1E6', weight = 700, anchor = 'start', extra = '') {
  return `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="${size}px" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" ${extra}>${esc(value)}</text>`;
}
function roundRect(x, y, w, h, r, fill, extra = '') { return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" ${extra}/>`; }
function circle(cx, cy, r, fill, extra = '') { return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${extra}/>`; }

for (let i = 0; i < frames; i++) {
  const t = i / fps;
  const s1 = slide(t, 0), s2 = slide(t, 3.05), s3 = slide(t, 6.15);
  const fade1 = 1 - clamp((t - 2.65) / 0.4), fade2 = 1 - clamp((t - 5.75) / 0.4), fade3 = opacity(t, 6.15);
  const blobs = [
    circle(120 + Math.sin(t * 0.7) * 20, 120 + Math.cos(t * 0.5) * 15, 180, '#193B4A', 'opacity="0.65"'),
    circle(960 + Math.cos(t * 0.55) * 18, 930 + Math.sin(t * 0.65) * 22, 220, '#F18C5B', 'opacity="0.22"'),
    circle(920, 170, 72 + Math.sin(t * 1.8) * 8, '#F8C76A', 'opacity="0.8"'),
  ].join('');

  let body = `<rect width="${W}" height="${H}" fill="#0E2934"/>${blobs}`;
  body += text(78, 82, 'IDEA → IMPACT', 23, '#F8C76A', 700, 'start', 'letter-spacing="4"');
  body += roundRect(78, 932, 924, 3, 2, '#F7F1E6', `opacity="0.22"`);
  body += text(78, 981, 'A 10-second explainer', 20, '#B8C8C8', 500);
  body += text(1002, 981, `${String(Math.min(3, Math.floor(t / 3.33) + 1)).padStart(2, '0')} / 03`, 20, '#B8C8C8', 700, 'end');

  // Scene 1: the problem.
  const x1 = 78 - (1 - s1) * 80;
  body += `<g opacity="${fade1 * s1}">`;
  body += text(x1, 330, 'BIG IDEAS', 82, '#F7F1E6', 800);
  body += text(x1, 425, 'deserve a', 82, '#F7F1E6', 800);
  body += text(x1, 520, 'clear path.', 82, '#F18C5B', 800);
  body += text(x1, 596, 'Turn complexity into momentum.', 28, '#B8C8C8', 500);
  body += roundRect(760, 350, 196, 196, 34, '#F7F1E6', `transform="rotate(${t * 5} 858 448)"`);
  body += text(858, 432, 'IDEA', 34, '#0E2934', 800, 'middle');
  body += text(858, 478, '↗', 62, '#F18C5B', 800, 'middle');
  body += `</g>`;

  // Scene 2: the three steps.
  body += `<g opacity="${fade2}">`;
  body += text(78, 266 - (1 - s2) * 55, 'MAKE IT', 72, '#F7F1E6', 800);
  body += text(78, 348 - (1 - s2) * 55, 'move.', 72, '#F18C5B', 800);
  const steps = [
    ['01', 'Focus', 'Find the one clear point.'],
    ['02', 'Shape', 'Give the story a simple form.'],
    ['03', 'Launch', 'Let people take the next step.'],
  ];
  steps.forEach((step, idx) => {
    const y = 474 + idx * 134;
    const p = slide(t, 3.12 + idx * 0.13, 0.42);
    const yy = y + (1 - p) * 45;
    body += `<g opacity="${p}">`;
    body += roundRect(78, yy - 54, 84, 84, 22, idx === 1 ? '#F18C5B' : '#193B4A');
    body += text(120, yy, step[0], 25, '#F7F1E6', 800, 'middle');
    body += text(198, yy - 12, step[1], 35, '#F7F1E6', 800);
    body += text(198, yy + 26, step[2], 22, '#B8C8C8', 500);
    body += roundRect(790, yy - 42, 190, 10, 5, idx === 1 ? '#F18C5B' : '#F8C76A', `transform="scale(${0.25 + p * 0.75} 1)" transform-origin="790 ${yy - 42}"`);
    body += `</g>`;
  });
  body += `</g>`;

  // Scene 3: the payoff.
  body += `<g opacity="${fade3}">`;
  body += text(78, 330 - (1 - s3) * 40, 'CLARITY', 86, '#F7F1E6', 800);
  body += text(78, 430 - (1 - s3) * 40, 'creates', 86, '#F7F1E6', 800);
  body += text(78, 530 - (1 - s3) * 40, 'momentum.', 86, '#F8C76A', 800);
  body += text(78, 620, 'Start with one idea. Make it unforgettable.', 28, '#B8C8C8', 500);
  body += roundRect(78, 724, 316, 74, 37, '#F18C5B');
  body += text(236, 772, 'MAKE YOUR MOVE  →', 22, '#0E2934', 800, 'middle');
  body += circle(824, 690, 120, 'none', 'stroke="#F7F1E6" stroke-width="10" opacity="0.85"');
  body += circle(824, 690, 72, '#F8C76A');
  body += text(824, 706, 'GO', 43, '#0E2934', 800, 'middle');
  body += `</g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${body}</svg>`;
  fs.writeFileSync(`${outDir}/frames/frame_${String(i).padStart(4, '0')}.svg`, svg);
}

// Encode from the generated artwork using FFmpeg's native vector/text filters.
// This keeps the deliverable independent of HyperFrames and external renderers.
const font = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
const base = `color=c=0x0E2934:s=${W}x${H}:r=${fps}:d=10`;
const filters = [
  `drawbox=x=0:y=0:w=1080:h=1080:color=0x0E2934:t=fill`,
  `drawbox=x=78:y=932:w=924:h=3:color=0xF7F1E6@0.22:t=fill`,
  `drawtext=fontfile='${font}':text='IDEA -> IMPACT':x=78:y=48:fontsize=23:fontcolor=0xF8C76A:letter_spacing=4`,
  `drawtext=fontfile='${font}':text='A 10-second explainer':x=78:y=950:fontsize=20:fontcolor=0xB8C8C8`,
  `drawtext=fontfile='${font}':text='01 / 03':x=900:y=950:fontsize=20:fontcolor=0xB8C8C8`,
  `drawbox=x='78-(1-min(1,max(0,t/0.55)))*80':y=245:w=720:h=4:color=0xF18C5B@'if(lt(t,2.65),1,1-(t-2.65)/0.4)':t=fill`,
  `drawtext=fontfile='${font}':text='BIG IDEAS':x='78-(1-min(1,max(0,t/0.55)))*80':y=260:fontsize=82:fontcolor=0xF7F1E6@'if(lt(t,2.65),min(1,t/0.55),1-(t-2.65)/0.4)'`,
  `drawtext=fontfile='${font}':text='deserve a':x='78-(1-min(1,max(0,t/0.55)))*80':y=355:fontsize=82:fontcolor=0xF7F1E6@'if(lt(t,2.65),min(1,t/0.55),1-(t-2.65)/0.4)'`,
  `drawtext=fontfile='${font}':text='clear path.':x='78-(1-min(1,max(0,t/0.55)))*80':y=450:fontsize=82:fontcolor=0xF18C5B@'if(lt(t,2.65),min(1,t/0.55),1-(t-2.65)/0.4)'`,
  `drawtext=fontfile='${font}':text='Turn complexity into momentum.':x=78:y=540:fontsize=28:fontcolor=0xB8C8C8@'if(lt(t,2.65),min(1,t/0.55),1-(t-2.65)/0.4)'`,
  `drawtext=fontfile='${font}':text='MAKE IT':x=78:y=220:fontsize=72:fontcolor=0xF7F1E6:enable='between(t,3.05,5.75)'`,
  `drawtext=fontfile='${font}':text='move.':x=78:y=302:fontsize=72:fontcolor=0xF18C5B:enable='between(t,3.05,5.75)'`,
  `drawtext=fontfile='${font}':text='01   Focus':x=110:y=450:fontsize=34:fontcolor=0xF7F1E6:enable='between(t,3.2,5.75)'`,
  `drawtext=fontfile='${font}':text='Find the one clear point.':x=110:y=490:fontsize=22:fontcolor=0xB8C8C8:enable='between(t,3.2,5.75)'`,
  `drawtext=fontfile='${font}':text='02   Shape':x=110:y=584:fontsize=34:fontcolor=0xF7F1E6:enable='between(t,3.5,5.75)'`,
  `drawtext=fontfile='${font}':text='Give the story a simple form.':x=110:y=624:fontsize=22:fontcolor=0xB8C8C8:enable='between(t,3.5,5.75)'`,
  `drawtext=fontfile='${font}':text='03   Launch':x=110:y=718:fontsize=34:fontcolor=0xF7F1E6:enable='between(t,3.8,5.75)'`,
  `drawtext=fontfile='${font}':text='Let people take the next step.':x=110:y=758:fontsize=22:fontcolor=0xB8C8C8:enable='between(t,3.8,5.75)'`,
  `drawtext=fontfile='${font}':text='CLARITY':x=78:y=250:fontsize=86:fontcolor=0xF7F1E6:enable='gte(t,6.15)'`,
  `drawtext=fontfile='${font}':text='creates':x=78:y=350:fontsize=86:fontcolor=0xF7F1E6:enable='gte(t,6.15)'`,
  `drawtext=fontfile='${font}':text='momentum.':x=78:y=450:fontsize=86:fontcolor=0xF8C76A:enable='gte(t,6.15)'`,
  `drawtext=fontfile='${font}':text='Start with one idea. Make it unforgettable.':x=78:y=540:fontsize=28:fontcolor=0xB8C8C8:enable='gte(t,6.15)'`,
  `drawbox=x=78:y=644:w=316:h=74:color=0xF18C5B:t=fill:enable='gte(t,6.15)'`,
  `drawtext=fontfile='${font}':text='MAKE YOUR MOVE  ->':x=98:y=668:fontsize=22:fontcolor=0x0E2934:enable='gte(t,6.15)'`,
].join(',');
execFileSync('ffmpeg', ['-y', '-f', 'lavfi', '-i', base, '-vf', filters, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', `${outDir}/animated-explainer.mp4`], { stdio: 'inherit' });
console.log(`Created ${outDir}/animated-explainer.mp4`);
