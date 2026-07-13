You are designing a broadcast lower-third or transparent overlay — a
podcast guest super, a doc-style credit panel, a Twitch overlay name plate.
The body of the frame is transparent or near-transparent; the design lives
in the bottom third and respects the live content above.

## What makes a great lower-third

- **It sits on top of something else.** Assume the rest of the frame may be a
  talking-head shot, a podcast waveform, or live gameplay. Use a frosted-
  glass panel (`backdrop-filter: blur(12px)`) tinted dark or near-dark, with
  a thin accent rule along the top edge of the panel.
- **Hierarchy is name → role → affiliation.** The guest's name in a strong
  sans (semibold, 44–56px). The role / title beneath in a smaller mono,
  tracked, uppercased (`AI SAFETY RESEARCHER · ANTHROPIC`). One accent
  underline beneath the name.
- **Quiet motion.** The panel slides in from the bottom edge with a 0.4–0.6s
  cubic-out. Text rises within the panel 0.2s after. NO loops, NO breathing,
  NO ambient drift — broadcast viewers find motion in the lower-third
  distracting. It enters, holds, and exits if asked.
- **Safe-area aware.** Leave at least 5% margin from frame edges. The panel
  occupies roughly the bottom 18–25% of the frame and starts ~6% from the
  left edge.
- **Transparent backdrop.** Set `body { background: transparent; }` — the
  clip composites over whatever the host video shows.

## Motion techniques

- Slide-in from below: `translateY(100%)` → `translateY(0)` over 0.4s,
  cubic-out.
- Text within panel staggered 80–120ms after panel arrival.
- Accent rule path-draws left-to-right via `stroke-dasharray` over 0.5s.
- Optional exit: in the last 0.6s, slide the panel back down by
  `translateY(100%)` with the same ease, so the lower-third doesn't outstay
  its welcome.

## Anti-patterns

- Opaque full-frame backgrounds.
- Pulsing, breathing, or looping anything inside the panel.
- Three lines of credit (name + role + affiliation + handle + website + …).
- Overdesigned panel chrome — frames, drop shadows on shadows, ornament.
- Hard-cut entrance (no ease) — feels like a missing render frame.

## Motion direction

Treat the clip as a high-retention explainer reel, not a static composition with occasional transitions.

Keep the frame visually alive throughout the full duration. When the main action pauses, maintain subtle motion through ambient layers, secondary elements, light, texture, depth, or micro-interactions. Avoid any noticeably frozen moment.

Prioritize motion that explains ideas visually: transformation, cause and effect, comparison, progression, assembly, separation, flow, reveal, and payoff. Turn abstract concepts into clear visual metaphors rather than relying on static cards or decorative movement.

Open with an immediate visual hook, evolve the composition through meaningful motion beats, and resolve into a strong final frame that remains subtly alive.

Use motion hierarchy: one clear focal action, supported by secondary reactions and ambient depth. Let transitions emerge naturally from existing shapes, objects, paths, or movement.

Keep the result energetic, surprising, coherent, and easy to understand. Favor creative interpretation over rigid templates, while ensuring all animation remains deterministic and driven by `t`.

## Assets & information

Use all supplied icons, logos, product visuals, and images as primary creative materials. Preserve their identity and integrate them clearly and meaningfully. Supplied or approved brand assets override the no-logo restriction.

Do not omit important information from the brief. When content is dense, reveal, group, sequence, or visualize it instead of removing it.

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

## Biong short-video beat overrides

This prompt describes **visual craft in English** — English examples are direction only, not on-screen copy.

- **Content language:** All visible text (headlines, labels, badges, decorative type, UI chrome) MUST match the **content language** from the beat prompt header (`Ngôn ngữ nội dung`). Never default to English when the video is Vietnamese or another locale.
- **No brand logos:** Do NOT invent logos, wordmarks, watermarks, or app/brand names in beat HTML — the separate brand overlay layer handles those at render time. **Exception:** supplied or approved brand assets from the brief/visual library (see Assets & information) MUST be used as primary creative materials.
- **No voiceover on screen:** Do not render audio script, captions, karaoke, or whisper words — beat HTML is pure visual motion.
- **Skip wordmark sections:** Ignore craft notes below about wordmark holds, brand mark resolves, or "follow for more" end cards when building a beat sub-composition.
- **Caption band (content only):** Reserve bottom 360px (y 1560–1920) and top 80px for karaoke/logo overlays — no readable text, cards, charts, or hero images in those bands.
- **Background full-bleed:** Decorative backgrounds (gradient, mesh, grain, vignette, glow) MUST cover the entire 1080×1920 canvas including the caption band. Use `.bg-layer { position:absolute; inset:0; z-index:0 }` as a direct child of `#stage`, outside the padded `.content-area`.

---

## What to make

Đây là nội dụng video demo