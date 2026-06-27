# Typography — Be Vietnam Pro (bắt buộc)

Font chuẩn mọi video agent: **[Be Vietnam Pro](https://fonts.google.com/specimen/Be+Vietnam+Pro?preview.script=Latn)** — hỗ trợ Latin + tiếng Việt.

**Cấm** `fonts.googleapis.com` / `@import` CDN — HyperFrames lint báo `google_fonts_import` và gây blank frame lúc render.

---

## Bundle (copy vào project)

Nguồn skill:

```
.cursor/skills/biong-short-video-hyperframes/assets/fonts/
  BeVietnamPro-Regular.ttf    (400)
  BeVietnamPro-Medium.ttf     (500)
  BeVietnamPro-SemiBold.ttf   (600)
  BeVietnamPro-Bold.ttf       (700)
  BeVietnamPro-ExtraBold.ttf  (800)
```

Sau `hyperframes init`:

```bash
mkdir -p storage/agent-renders/{id}/my-video/assets/fonts
cp .cursor/skills/biong-short-video-hyperframes/assets/fonts/BeVietnamPro-*.ttf \
   storage/agent-renders/{id}/my-video/assets/fonts/
```

---

## @font-face (paste vào mọi composition)

```css
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("../assets/fonts/BeVietnamPro-Regular.ttf") format("truetype");
}
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("../assets/fonts/BeVietnamPro-Medium.ttf") format("truetype");
}
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("../assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype");
}
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("../assets/fonts/BeVietnamPro-Bold.ttf") format("truetype");
}
@font-face {
  font-family: "Be Vietnam Pro";
  font-style: normal;
  font-weight: 800;
  font-display: swap;
  src: url("../assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype");
}

html, body, #root {
  font-family: "Be Vietnam Pro", system-ui, sans-serif;
}
```

Đường dẫn `../assets/fonts/` từ `compositions/`; `assets/fonts/` từ `index.html` root.

---

## Dùng theo vai trò

| Vai trò | Weight | Size (1080×1920) |
|---------|--------|------------------|
| Hero headline | 700–800 | 64–120px |
| Body / support | 500–600 | 28–42px |
| Caption karaoke | 600–700 | min 42px portrait |
| Watermark "© Spacedev" | 600 | 18–22px |
| Metadata chip | 500 | 18–24px |

---

## Cấm

| Sai | Đúng |
|-----|------|
| Archivo, Outfit, Inter (agent render mới) | Be Vietnam Pro |
| `fonts.googleapis.com` link | Local `@font-face` |
| Chỉ `sans-serif` không load font | Copy TTF + @font-face |

---

## Checklist

- [ ] 5 file TTF copied vào `assets/fonts/`
- [ ] `@font-face` trong index.html + captions + brand-watermark
- [ ] `font-family: "Be Vietnam Pro"` trên root
- [ ] Preflight không warn thiếu font
