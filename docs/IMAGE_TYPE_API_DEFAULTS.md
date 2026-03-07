# Image Type - Default Params cho Backend

**Mục đích:** Khi user **không** click Edit mà bấm "Generate Image" trực tiếp, frontend chỉ gửi `prompt`, `description`, `image_id`. Nếu component có `image_type`, backend cần dựa vào bảng dưới để **tự động áp dụng** các param style tương ứng.

**Lưu ý:** Khi user click Edit và tạo ảnh qua CourseEditImageDrawer, frontend đã gửi đầy đủ params → backend **không cần** override gì.

---

## Format API (POST generate-image)

Các field backend có thể nhận/sử dụng:

| Field | Type | Mô tả |
|-------|------|-------|
| `prompt` | string | Mô tả chính (user nhập) |
| `description` | string | Mô tả bổ sung |
| `image_id` | number/string | ID ảnh cần regenerate |
| `image_type` | string | Loại ảnh (value: general_art, infographic, mindmap_diagram, technical_drawing, ui_ux_design) |
| `image_type_add` | string | Chuỗi bổ sung cho infographic/mindmap (format: "Layout Style: X, Structure: Y, Infographic Color Palette: Z") |
| `art_style` | string | Phong cách nghệ thuật (value) |
| `lighting` | string | Ánh sáng (value) |
| `mood` | string | Tâm trạng (value) |
| `camera_angle` | string | Góc máy (value) |
| `lens` | string | Ống kính (value) |
| `color_palette` | string | Bảng màu (value) |
| `subject` | string | Chủ đề (value) |
| `era` | string | Thời đại/phong cách (value) |
| `background` | string | Nền (value) |
| `aspect_ratio` | string | Tỉ lệ (1:1, 16:9, ...) |
| `quality` | string | Chất lượng (512, 1024, ...) |
| `negative_prompt` | string | Chuỗi negative prompt (đã map từ negativePrompts array) |

---

## Mapping: image_type → Default Params

### 1. `general_art` (Ảnh nghệ thuật/đời thực) - Default

**Preset tham chiếu:** Thumbnail (preset đầu tiên match)

```json
{
  "image_type": "general_art",
  "image_type_add": "",
  "art_style": "3d_render_octane",
  "lighting": "neon_lights",
  "mood": "vibrant",
  "camera_angle": "close_up",
  "lens": "wide_angle",
  "color_palette": "vibrant",
  "subject": "abstract",
  "era": "futuristic",
  "background": "gradient",
  "aspect_ratio": "16:9",
  "quality": "1024",
  "negative_prompt": "low quality, deformed, text, watermark, signature, blurry, out of focus"
}
```

---

### 2. `infographic` (Đồ họa thông tin)

**Preset tham chiếu:** Infographic

```json
{
  "image_type": "infographic",
  "image_type_add": "Layout Style: Flat Design (Thiết kế phẳng hiện đại), Structure: Process/Flow (Quy trình theo bước 1, 2, 3...), Infographic Color Palette: Corporate (Xanh dương, xám, trắng - Chuyên nghiệp)",
  "art_style": "flat_design",
  "lighting": "",
  "mood": "",
  "camera_angle": "",
  "lens": "",
  "color_palette": "vibrant",
  "subject": "abstract",
  "era": "modern",
  "background": "simple",
  "aspect_ratio": "16:9",
  "quality": "1024",
  "negative_prompt": "low quality, deformed, text, watermark, signature, blurry, out of focus"
}
```

---

### 3. `mindmap_diagram` (Sơ đồ tư duy, sơ đồ luồng)

**Preset tham chiếu:** Mindmap

```json
{
  "image_type": "mindmap_diagram",
  "image_type_add": "Layout Style: Hand-drawn/Sketchy (Vẽ tay, phù hợp Mindmap), Structure: Hierarchical (Phân cấp từ trên xuống dưới), Infographic Color Palette: Vibrant/Pastel (Màu sắc rực rỡ hoặc nhẹ - Sáng tạo)",
  "art_style": "",
  "lighting": "",
  "mood": "",
  "camera_angle": "",
  "lens": "",
  "color_palette": "vibrant_pastel",
  "subject": "abstract",
  "era": "modern",
  "background": "simple",
  "aspect_ratio": "1:1",
  "quality": "1024",
  "negative_prompt": "low quality, deformed, text, watermark, signature"
}
```

---

### 4. `ui_ux_design` (Giao diện web/app)

**Preset tham chiếu:** Logo

```json
{
  "image_type": "ui_ux_design",
  "image_type_add": "",
  "art_style": "vector_art",
  "lighting": "studio_lighting",
  "mood": "vibrant",
  "camera_angle": "",
  "lens": "",
  "color_palette": "cool_tones",
  "subject": "abstract",
  "era": "futuristic",
  "background": "simple",
  "aspect_ratio": "1:1",
  "quality": "512",
  "negative_prompt": "low quality, deformed, text, watermark, signature, blurry, out of focus"
}
```

---

### 5. `technical_drawing` (Bản vẽ kỹ thuật, kiến trúc)

**Không có preset tương ứng.** Backend có thể dùng giá trị mặc định tối thiểu:

```json
{
  "image_type": "technical_drawing",
  "image_type_add": "",
  "art_style": "",
  "lighting": "",
  "mood": "",
  "camera_angle": "",
  "lens": "",
  "color_palette": "",
  "subject": "",
  "era": "",
  "background": "simple",
  "aspect_ratio": "1:1",
  "quality": "1024",
  "negative_prompt": "low quality, deformed, text, watermark, signature, blurry, out of focus"
}
```

---

## Mapping Negative Prompt (value → keyword string)

Backend cần map array `negativePrompts` (value) sang chuỗi `negative_prompt`:

| value | keyword |
|-------|---------|
| `low_quality_deformed` | low quality, deformed |
| `extra_fingers` | extra fingers, mutated hands |
| `text_watermark` | text, watermark, signature |
| `blurry` | blurry, out of focus |
| `bad_anatomy` | bad anatomy |
| `ugly_face` | ugly face |
| `amputation` | amputation |
| `cropped` | cropped |
| `duplicate` | duplicate |
| `oversaturated` | oversaturated |

---

## Logic Backend gợi ý

```
Khi nhận request generate-image:
1. Nếu request đã có đầy đủ: art_style, lighting, mood, ... (từ Edit drawer)
   → Dùng nguyên params từ request, không override.

2. Nếu request chỉ có: prompt, description, image_id (từ Generate Image trực tiếp)
   → Kiểm tra image_type (có thể từ component/image metadata).
   → Nếu có image_type: áp dụng default params tương ứng từ bảng trên.
   → Nếu không có image_type: dùng default general_art.
```
