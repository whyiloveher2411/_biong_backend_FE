You are designing a sting — a [second]-second scene-bridging beat. Network
ident, channel bumper, transition between segments, logo flash before the
ad break. It must be punchy, complete, and forgettable in the right way:
the viewer remembers the energy, not the duration.

## What makes a great sting

- **Cold to warm to cold.** Or warm to cold. Or monochrome to accent. The
  sting is a sliver of energy bracketed by stillness on either side. Pick a
  color arc and follow it ruthlessly.
- **One graphic event.** A wipe, a melt, a prism shatter, a chromatic
  aberration burst, a logo ident materializing. Not three.
- **The logo / wordmark resolves at the end and holds from [pct_76]s through [second]s.**
  Even at [second]s total, the held frame is essential — without it, the sting
  feels unfinished.
- **Aggressive easing.** Hard cubic-in for the buildup, snap-stop on the
  reveal (back.out(1.4) is the upper bound — anything more is cartoonish).
- **Sound-design-ready.** Compose with implied audio in mind: a swell, a
  hit, a tail. The visual peak lands on the implied hit beat, around 60–70%
  through the clip.

## Motion techniques

- Block wipes via `clip-path: inset()` animating across the frame in 200ms.
- Melts / pixelations via `feDisplacementMap` with a turbulence driven by
  `t`, settling at the resolve.
- Prism shatter: split the wordmark into 6–10 `clip-path: polygon()` shards
  that fly in from offsets and assemble at the resolve.
- Chromatic split: duplicate the wordmark in three layers tinted red /
  green / blue, offset by `translate(±2px)` during the buildup, converging at
  the resolve.
- Color flood: a full-frame radial gradient that grows from a single point
  during the buildup, recedes at the resolve to reveal the wordmark.

## Anti-patterns

- Long entrances. The sting IS the entrance.
- Ambient breathing on the held frame — let it sit still, decisively.
- Multiple competing graphic events.
- A logo that arrives at the start instead of the end.
- Long tail beyond 0.8s — the sting ends; the next thing starts.

## What HyperFrames lets you build

You're authoring a single self-contained HTML document. Modern browsers are the
canvas — anything that renders in a sandboxed iframe is available to you.
A short tour of the toolkit:

- **Layout & typography.** Full CSS Grid / Flexbox, container queries, custom
  properties, `font-variant-numeric: tabular-nums` for stable rolling counters,
  variable axes via system fonts, mixed serif + sans hierarchies.
- **2D transforms & 3D.** `transform: translate / scale / rotate` with
  per-element `transform-origin`. `perspective` + `rotate3d` for parallax
  cards, magazine flips, depth-sorted layers.
- **CSS filters.** `blur(8px)` on a duplicated layer reads as motion blur.
  `drop-shadow`, `saturate`, `hue-rotate`, `contrast`, `brightness`,
  `backdrop-filter: blur()` for frosted panels.
- **Gradients & masking.** Radial / conic / linear gradients, `mask-image`
  with gradients for soft edges, `clip-path: inset(... round ...)` for block
  reveals, `clip-path: polygon(...)` for prism cuts and shatter pieces.
- **Inline SVG.** `feTurbulence` for organic grain, `feDisplacementMap` for
  liquid distortion, `feGaussianBlur` for bloom, `feColorMatrix` for hue
  control, gradient strokes, path-draw via `stroke-dasharray` +
  `stroke-dashoffset`, masks and clip-paths driven by `t`.
- **Canvas 2D.** When you need per-pixel control — particle fields,
  spectrum bars, generative grain — drop in a `<canvas>` and redraw it from
  the same `t`.
- **Text-as-hero.** `font-stretch`, negative letter-spacing on display
  type, optical caps via `text-transform: uppercase` + tracking, word-by-word
  reveals via `<span>` wrappers staggered by index.
- **Composition cues.** Hairline accent rules, ghost text at 3–8% opacity,
  monospace credits, broadcast-style timestamps, "live" pulse dots, grid
  ledger lines — quiet detail that signals craft.
- **Audio reactivity.** If the brief calls for it, a `<audio>` element +
  `AudioContext.decodeAudioData` + `AnalyserNode` gives you FFT magnitudes
  you can sample per frame keyed off `t`.

You don't have to use everything — pick the few techniques that serve the
brief. The brief leads; the toolkit follows.

## Composition rules

- The clip runs **[second] seconds**. Build an arc: entry 0–20%,
  develop 20–80%, settle 80–100%. The peak narrative beat lands near
  `t = [pct_50]s`. The final 15% holds a resolved frame — not mid-action.
- Offset the first tween 0.1–0.3s into the clip; never start exactly at
  `t = 0`.
- The frame is **1080x1920 (9:16 vertical)**. Compose for that aspect — safe areas, focal
  weight, hierarchy. Keep all content inside the canvas at every `t`.
- Layout BEFORE animation. Write a static page that already looks like an
  editorial poster, then layer motion on top. If you can't pause the clip at
  any `t` and have it read as a still, the layout is wrong.

## Output contract

Return ONE document, nothing else — no markdown fences, no commentary.

1. Begin with `<!doctype html>`.
2. The root tag MUST declare the composition's natural runtime AND aspect:
   `<html data-duration="[second]" data-aspect="9:16">`.
   - `data-duration` is in seconds and sizes the playground scrub timeline.
   - `data-aspect` is `16:9`, `9:16`, or `1:1` and tells the playground
     which canvas to render into. Without it, vertical compositions render
     letterboxed in a 16:9 frame.
3. Open the `<style>` block with this brand variable preamble verbatim:

```css
:root {
  --cream:#f6f5f1; --cream-2:#efece4; --ink:#0a0a0a; --mute:#6b6862;
  --line:#e3dfd3; --signal:#ff3b1f; --signal-2:#ff6a4a; --frame:#ffb800;
  --green:#1f8a5b; --blue:#2b66ff;
}
* { box-sizing: border-box; }
body { margin: 0; }
```

4. The composition MUST be a pure function of one `t` (seconds, 0..duration).
   Two calls with the same `t` must produce identical pixels. Add this
   playback bridge once:

```html
<script>
  let t = 0;
  function render() {
    // read t and update the DOM / canvas
  }
  addEventListener('hf-seek', (e) => { t = e.detail.time; render(); });
  render();
</script>
```

5. No `setInterval`, `setTimeout`, self-driven `requestAnimationFrame`,
   CSS keyframe animations, or CSS transitions chained off class toggles —
   none of those are deterministic across scrub. No `Math.random()`,
   `Date.now()`, or `performance.now()` at runtime; seed any randomness from
   `t` and integer indices.
6. The iframe runs under `sandbox="allow-scripts allow-same-origin"`. No
   network fetch, no external fonts, no external images. Inline SVG, CSS
   gradients, and `feTurbulence` / `feDisplacementMap` are fine. System fonts
   only (`ui-sans-serif, system-ui, -apple-system, ui-serif, Georgia,
   ui-monospace, monospace`).
7. Frame size is **1080x1920 (9:16 vertical)**. Lay everything out so it composes at that
   aspect ratio; no glyph, shape, or particle may exit the frame at any `t`.
8. Respect `prefers-reduced-motion` — lock `t` to a representative still
   frame when reduced motion is on.

Return only the HTML document.

---

## What to make

Đây là nội dụng video demo