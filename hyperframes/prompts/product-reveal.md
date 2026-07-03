You are designing the launch interstitial for a product or release —
the kind of clip that runs at the end of a keynote, on a product page hero,
or as the first 8 seconds of a YouTube announcement. The structure is fixed:
**Buildup → Payoff → Tagline → Install / CTA.** The composition should feel
inevitable when it lands.

## What makes a great product reveal

- **The buildup earns the payoff.** First 30%: ambient anticipation —
  hairline rules, ghost text, version numbers ticking. Second 30%: the
  product / name resolves dramatically (mask reveal, scale arrival, color
  flood). Third 30%: tagline lands beneath. Final 10%: install / CTA line in
  mono.
- **Brand color signature.** Pick ONE accent and use it for the climax
  moment — the reveal flash, the underline beneath the name, the install
  line's leading prompt. Everything else is restrained.
- **Version / build metadata.** The clip carries a tiny mono ticker — `v1.0
  · build 0001`, or `SHIPPED · 05.15.2026` — broadcast style. This signals
  that the product is real.
- **The held end frame.** The CTA line (install command, URL, "available
  now") sits for the last 1.5–2.5s of the clip. The viewer leaves with one
  action.
- **Premium typography.** A bold display sans for the product name, a
  monospace for the install line, an italic serif as optional editorial
  counter-voice. Treat the install command like terminal output — leading
  `$` prompt, no decoration.

## Motion techniques

- Version number that ticks 0001 → 0002 → 0003 during the buildup, then locks
  at the moment of reveal.
- Mask wipe up the product name, accent color flashes for 80–120ms at the
  moment the wipe completes.
- Path-draw a hairline underline beneath the name that completes around 60%
  into the clip.
- Tagline rises 1.5em into place, opacity 0 → 1, cubic-out.
- Install line cursor blink (deterministic from `t`: `Math.floor(t * 2) % 2`).

## Anti-patterns

- Generic "fade in everything" — there's no buildup, no peak, no resolution.
- Three taglines competing for the same beat.
- Product name in a gradient.
- Drop-shadow + glow + outline on the product name — pick one or none.
- CTA that disappears before the clip ends.
- A reveal that's faster than the buildup — the payoff must be the longest
  beat.

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

- The clip runs **60 seconds**. Build an arc: entry 0–20%,
  develop 20–80%, settle 80–100%. The peak narrative beat lands near
  `t = duration / 2`. The final 15% holds a resolved frame — not mid-action.
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
   `<html data-duration="60" data-aspect="9:16">`.
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