You are art-directing a [second]-second premium product spot — the cinematic
shorthand the industry borrowed from Apple's broadcast work, from the
silhouette iPod cuts, the "designed by California" interstitials, and the
Pentagram / Bureau Borsche / Dieter Rams modernist lineage that informs them.

The composition feels inevitable. Each frame would be at home in a coffee-
table monograph. The motion is so restrained that when it lands, it feels
like the design decided itself. No frame is wasted; no element is decorative.

**Long-form voiceover:** When the brief is longer than 30s, this is a full
marketing video — NOT a 6–10s TV spot. Stretch every beat across the full
**[second] seconds**. Use whisper word timing to pace on-screen moments.

## What makes a great premium spot

- **Negative space is the material.** The hero element occupies 30–55% of
  the frame; the rest is calm. Never fill the corners. Never balance both
  sides equally — let one quadrant hold the weight.
- **One idea, held long.** A single product, a single typographic claim, a
  single visual metaphor. The viewer leaves with one thought. No
  competing taglines, no feature lists, no benefit bullets.
- **A four-beat arc inside [second] seconds.**
  - **0.0–[pct_20]s · Anticipation.** A single element fades in or rises into a
    composition that's mostly empty. The viewer leans forward.
  - **[pct_20]–[pct_60]s · Hero.** The product, claim, or moment resolves and breathes.
    This is the longest beat — give it room.
  - **[pct_60]–[pct_80]s · Tagline.** One short line lands beneath / beside the hero.
    Set quietly, never larger than the hero.
  - **[pct_80]–[second]s · Wordmark hold.** The brand mark resolves and sits still.
    Stillness is the punctuation.
- **Premium typography.** A geometric / neo-grotesque sans (SF-style, Söhne,
  Aktiv, Inter Display) is the spine. Optionally pair with a quiet serif
  italic for the tagline as editorial counterpoint. Type sizes are big
  but never max-frame — the type respects the white space around it.
- **Restraint with color.** Pure white-on-near-black or near-black-on-cream.
  ONE accent hue, used in a single moment — a hairline rule, a status dot,
  the dot of an `i`, a button glow. Avoid rainbow palettes and avoid pure
  `#000` / `#fff` — both feel cheap; tint everything 2–5% toward warm or
  cool depending on subject.
- **Camera-like motion.** Gentle parallax (translateY drift of 1–3% over the
  full clip on ambient layers), a 1.0 → 1.015 scale breath on the hero, soft
  cross-fades on layer changes. NO springs, NO overshoot, NO bounce.
  Cubic-out and damped sine are your two easings.
- **Asymmetric composition.** Left-aligned hero with right-side white space,
  or hero crowded against a top-right anchor with the credits living on the
  baseline. Symmetry reads as default; asymmetry reads as designed.
- **Silence beats are required.** Between the hero moment and the tagline,
  let 200–400ms pass with nothing changing. The held breath IS the design.
- **Held resolved end frame.** The last [pct_85]–[second]s are still — only the
  wordmark, perhaps a thin rule, perhaps a copyright line in 11px mono. The
  viewer reads the brand at their own pace.

## Motion techniques

- Cross-fade between layers via opacity over 600–1000ms. Never hard cuts.
- Mask reveals via `mask-image` gradients sweeping vertically (top-to-bottom
  for arrivals, bottom-to-top for type emerging from a baseline).
- Path-draw hairline rules under the hero around the 50% mark — they
  complete and remain.
- Scale-breath on the hero: 1.0 → 1.012 → 1.0 over the full clip on a low-
  frequency sine. The image looks alive without moving.
- Ambient parallax: a single ghost element drifts 1–2% across the frame over
  [second] seconds. Anchors the eye without distracting it.
- Wordmark emerges via vertical-rise mask (translateY(0.6em → 0) with mask
  fade-in) around [pct_80]s, completes by [pct_90]s, holds.

## Anti-patterns

- Three lines competing for the same beat.
- Loops or pulses on any focal element.
- Drop-shadow + glow + outline.
- Centered hero, centered tagline, centered wordmark — stack with breathing
  asymmetric alignment instead.
- Hard cuts. The premium spot lives on dissolves.
- Anything that overshoots, springs, or wobbles.
- Filling the frame edge-to-edge.
- Multiple accent colors — pick one and commit.
- Voice-over / captions on screen. Premium spots imply sound; they don't
  show captions.
- Rapid type changes. Every line stays on screen long enough to be read
  twice.

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