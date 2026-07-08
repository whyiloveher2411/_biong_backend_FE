## 1. Visual Theme

Strix should feel like a security product with real authority: dark, precise, and technical, but not noisy or theatrical. The captured GitHub page is light-first and restrained, so the video should borrow that clarity while introducing a darker terminal layer for tension and proof. The mood is developer-serious, with one strong accent color and minimal decoration. The distinctive move is contrast between clean repository UI framing and a black terminal / exploit proof scene.

## 2. Quick Reference

#### Colors

- **GitHub Slate** (`#1F2328`): primary text, terminal ink, headline color on light surfaces
- **GitHub Canvas** (`#F6F8FA`): main light background, repo-card surfaces
- **GitHub White** (`#FFFFFF`): clean framing, cards, and overlays
- **GitHub Border** (`#D1D9E0`): dividers, card borders, subtle structure
- **GitHub Muted** (`#59636E`): secondary text, labels, metadata
- **GitHub Blue** (`#0969DA`): link and emphasis color on light UI moments
- **GitHub Green** (`#1F883D`): success, code status, CI green signal
- **GitHub Black** (`#000000`): terminal base and full-bleed dark scenes
- **Soft Gray** (`#EFEFEF`): support surfaces, neutral fills
- **Alert Blue Tint** (`#DDF4FF`): selected chips, callout highlights

- On `#F6F8FA`: use `#1F2328` or `#59636E` for readable text.
- On `#000000`: use `#FFFFFF` or `#DDF4FF` for large accent copy.
- Do not use `#1F883D` for body copy on dark surfaces; it is better as a signal color.

#### Fonts

- **Display / Body:** `"Mona Sans VF"` - available in capture metadata, but no font file was downloaded
  - Fallback: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Mono:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`

```css
@font-face {
  font-family: "Mona Sans VF";
  src: local("Mona Sans");
  font-weight: 400 600;
  font-display: swap;
}
```

The brand reads best with size and weight changes, not lots of color variation.

## 3. Component Stylings

#### GitHub Repo Header

- Background: `#FFFFFF`
- Border: `1px solid #D1D9E0`
- Radius: `12px`
- Shadow: soft, nearly invisible
- Use: top-level framing, repository identity blocks

#### Terminal Panel

- Background: `#000000`
- Text: `#EFEFEF`
- Border: `1px solid rgba(255,255,255,0.08)`
- Radius: `16px`
- Use: exploit proof, command execution, scan output

#### Code Block

- Background: `#111111`
- Text: `#DDF4FF` and `#F6F8FA`
- Border: `1px solid rgba(209,217,224,0.2)`
- Radius: `10px`
- Use: install commands, CI snippets, output

#### Accent Chip

- Background: `#DDF4FF`
- Text: `#0969DA`
- Radius: `999px`
- Use: labels, proof tags, subtle emphasis

#### Primary CTA

- Background: `#1F883D`
- Text: `#FFFFFF`
- Radius: `999px`
- Use: closing invitation or start action

#### Card

- Background: `#FFFFFF`
- Border: `1px solid #D1D9E0`
- Radius: `14px`
- Use: repo stats, workflow summary, feature cards

## 4. Spacing & Layout

#### Spacing scale

- Base unit: `8px`
- Common values: `8, 16, 24, 32, 48, 64`

#### Layout rules

- Use generous whitespace in light scenes.
- Keep dark scenes tighter and more compressed.
- Prefer left alignment for technical text.
- Let one focal block dominate each beat.

## 5. Do's and Don'ts

- Do keep the palette close to GitHub's captured look.
- Do use monochrome terminal contrast for the proof scene.
- Do emphasize dynamic validation, not abstract AI hype.
- Don't introduce extra bright brand colors.
- Don't make the video look like a generic cyber-thriller.
- Don't use serif fonts or decorative type.

