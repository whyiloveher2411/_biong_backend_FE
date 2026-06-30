# Lottie activation — bundle local (short video agent)

Phase 2 — accent animation vector nhẹ từ bundle bundled, không cần API.

**Đọc:** [visual-shot-plan.md](visual-shot-plan.md) — `accent_media.type = lottie`, `lottie_id`

---

## Manifest

`.cursor/skills/biong-short-video-hyperframes/assets/lotties/manifest.json`

Mỗi entry: `id`, `tags`, `path`, `suggested_z` (650–800), `description`

---

## Copy vào project render

```bash
MANIFEST=.cursor/skills/biong-short-video-hyperframes/assets/lotties/manifest.json
PROJ=storage/agent-renders/{id}/my-video
mkdir -p $PROJ/assets/lotties
# Chọn lottie_id từ visual_shot_plan:
cp .cursor/skills/biong-short-video-hyperframes/assets/lotties/celebration.json $PROJ/assets/lotties/
```

---

## HyperFrames contract

```html
<div id="lottie-celebration" class="clip lottie-accent"
     style="position:absolute;z-index:720;width:240px;height:240px;right:80px;top:380px;"
     data-start="27" data-duration="8" data-track-index="5"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js"></script>
<script>
  const anim = lottie.loadAnimation({
    container: document.getElementById("lottie-celebration"),
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: "assets/lotties/celebration.json",
  });
  window.__hfLottie = window.__hfLottie || [];
  window.__hfLottie.push(anim);
</script>
```

- `autoplay: false` — HF seek per frame
- `window.__hfLottie.push(anim)` — bắt buộc

Chi tiết: `.agents/skills/remotion-to-hyperframes/references/lottie.md`

---

## Chọn lottie_id

| Tag / ngữ cảnh | lottie_id |
|----------------|-----------|
| Hook punch | `spark-burst` |
| Celebrate / CTA | `celebration` |
| Growth / stat | `arrow-up` |
| Warning / agitate | `arrow-down` |
| Loading / process | `loading-dots` |
| Edu check | `check-mark` |
| Fire / viral | `fire-loop` |
| Star / rating | `star-pop` |

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| URL Lottie external random | Bundle manifest |
| autoplay: true | false + __hfLottie |
| Lottie che hero registry | z 650–800, accent only |
