# Background động — bắt buộc (cấm nền tĩnh)

Mọi short video phase 2 **phải** có nền **video stock** hoặc **ảnh stock Ken Burns** (animated). **Cấm** ship với chỉ CSS gradient/mesh tĩnh.

---

## Cấm

| Loại | Ví dụ | Lý do |
|------|-------|-------|
| `bg_media.type: gradient_only` | Chỉ `#root` linear-gradient | Trông phẳng, không cinematic |
| Chỉ `ambient-layer` + mesh | Orbs/grain không thay video | Ambient là lớp phụ, không phải B-roll |
| `#root { background: #0B0F1A }` opaque | Solid color | Che hết depth |
| Stock image tĩnh không motion | `<img>` bg không GSAP | Cần pan/zoom hoặc dùng `stock_video` |

---

## Bắt buộc

1. **Mỗi beat** trong `visual_shot_plan`: `bg_media.type` = `stock_video` (ưu tiên) hoặc `stock_image` + Ken Burns trong beat/ambient.
2. **`index.html`**: ≥1 `<video class="stock-bg">` full-bleed 1080×1920, `object-fit: cover`, opacity 0.35–0.55.
3. **Coverage timeline**: tổng `data-duration` các clip `stock-bg` **phủ kín** `0 → totalVideoSec` (cho phép overlap, không gap > 2s).
4. Gọi MCP: `short_video_search_stock_media({ media_type: "video", query: "…" })` — **mỗi beat khác query** khi có thể.

---

## Stack z-index (nền)

```
z 0–2   mesh tint (optional, opacity thấp — không thay video)
z 3–5   stock-bg <video>  ← BẮT BUỘC
z 6–10  ambient-layer (grain, orbs)
z 240+  beat content
```

Mesh gradient trên `#root` chỉ được phép **chồng mờ** lên stock video, không được là lớp nền duy nhất.

---

## Shot-plan mẫu

```json
"bg_media": { "type": "stock_video", "query": "abstract dark technology motion" }
```

**Cấm** trong shot-plan production:

```json
"bg_media": { "type": "gradient_only" }
```

---

## Preflight

- `check-dynamic-background.mjs` — FAIL nếu `gradient_only` trong shot-plan hoặc gap stock > 2s
- `check-stock-full-bleed.mjs` — CSS + object-fit cover

## Tham khảo

- [media-mcp-activation.md](media-mcp-activation.md)
- [visual-shot-plan.md](visual-shot-plan.md)
