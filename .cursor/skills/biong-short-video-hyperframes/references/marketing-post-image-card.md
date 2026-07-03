# Marketing post — content freedom + image card

**Bắt buộc đọc** khi `creative_brief.marketing_post_id > 0` hoặc `marketing_post_images` không rỗng.

Nguồn: `short_video_get_context` → `creative_brief.content_plain_text`, `creative_brief.marketing_post_images`.

---

## Content freedom (on-screen)

Khi short video liên kết marketing post:

- Agent **được** lấy fact, insight, quote, số liệu, caption từ marketing post để làm giàu visual on-screen.
- **Không** bó buộc mọi element phải bám từng câu `audio_script` — narration vẫn sync caption track; on-screen có thể bổ sung nội dung bài gốc.
- **Cấm** bịa số liệu không có trong marketing post / `core_signals` / brief.

Ghi vào `visual_enrichment[]` hoặc `supporting_graphics[]` với `source: "marketing_post"`.

---

## Rule ảnh marketing post

| Rule | Giá trị |
|------|---------|
| Nguồn ảnh | `creative_brief.marketing_post_images[]` — field backend, không tự parse thủ công |
| Mỗi ảnh | **Đúng 1 beat riêng** — `hero_mode: "marketing_post_image"` |
| Tối đa / beat | **1 ảnh** — cấm 2+ ảnh marketing post trong cùng beat |
| Trùng lặp | Cấm cùng `url` xuất hiện ở 2 beat |
| Bắt buộc dùng hết? | **Không** — agent có thể bỏ ảnh kém chất lượng (preflight chỉ WARN) |

Tải ảnh về `assets/images/marketing_post_N.{ext}` trước khi viết beat HTML.

---

## `.browser-mockup-card` — macOS browser frame

Ảnh thật từ marketing post **bắt buộc** nằm trong card browser macOS: traffic-light dots, **không padding** quanh `<img>`.

### CSS scaffold

```css
.browser-mockup-card {
  width: 100%;
  max-width: 940px;
  border-radius: 16px;
  overflow: hidden;
  background: #1e1e1e;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
.browser-mockup-card .browser-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #2a2a2a;
}
.browser-mockup-card .browser-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.browser-mockup-card .browser-dot.red { background: #ff5f56; }
.browser-mockup-card .browser-dot.yellow { background: #ffbd2e; }
.browser-mockup-card .browser-dot.green { background: #27c93f; }
.browser-mockup-card img {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 0;
}
```

### HTML scaffold

```html
<div class="browser-mockup-card">
  <div class="browser-bar">
    <span class="browser-dot red"></span>
    <span class="browser-dot yellow"></span>
    <span class="browser-dot green"></span>
  </div>
  <img
    src="assets/images/marketing_post_1.jpg"
    data-marketing-post-image="1"
    data-marketing-post-image-url="https://example.com/original.jpg"
    alt=""
  />
</div>
```

- `data-marketing-post-image="1"` — bắt buộc để preflight detect.
- `data-marketing-post-image-url` — URL gốc từ `marketing_post_images[].url`.
- Caption (nếu có) → `.context-chip` hoặc `.quote-box` **dưới** card, không đè ảnh.

Đặt card trong `.content-cluster` — xem [layout-9x16-zones.md](layout-9x16-zones.md).

---

## Shot-plan fields

```json
{
  "beat_id": "beat_4",
  "hero_mode": "marketing_post_image",
  "layout_archetype": "editorial_image_reveal",
  "visual_enrichment": [
    {
      "type": "marketing_post_image",
      "url": "https://...",
      "caption": "Caption từ post",
      "source": "marketing_post"
    }
  ],
  "visual_story": "Browser mockup reveal ảnh bài gốc + caption chip"
}
```

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| 2 ảnh marketing post trong 1 beat | 1 ảnh / 1 beat |
| `<img>` không có `data-marketing-post-image` | Attribute bắt buộc |
| Padding/margin quanh ảnh trong card | `img { margin:0; padding:0 }` full-bleed trong frame |
| `object-fit: cover` crop cứng ảnh editorial | `width:100%; height:auto` |
| Stock Pexels thay ảnh post có sẵn | Dùng ảnh thật từ `marketing_post_images` |
| Echo toàn bộ audio_script lên màn hình | On-screen ngắn; narration ở caption track |

---

## Preflight

```bash
node .cursor/skills/biong-short-video-preflight/scripts/check-marketing-post-images.mjs $PROJ
```

- FAIL: ≥2 ảnh/beat, trùng URL giữa beat, thiếu `.browser-mockup-card` ancestor.
- WARN: URL trong `assets/marketing-post-images.json` chưa dùng ở beat nào.

---

## Tham khảo

- [visual-shot-plan.md](visual-shot-plan.md) — `hero_mode`, `visual_enrichment`
- [extract-core-signals.md](extract-core-signals.md) — Phase 2 enrichment
- [layout-9x16-zones.md](layout-9x16-zones.md) — `.content-cluster`
