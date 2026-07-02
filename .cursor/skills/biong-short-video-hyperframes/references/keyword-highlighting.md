# Keyword Highlighting — auto-detect + vibrant colors

Agent **bắt buộc** tô màu keyword trong mọi dòng text hiển thị trên beat (headline, quote, card body, chip). Không để toàn bộ dòng cùng một màu.

**Đọc kèm:** [typography-be-vietnam-pro.md](typography-be-vietnam-pro.md) · [kinetic-typography-brief.md](kinetic-typography-brief.md)

---

## Auto-detection patterns

| Type | Regex / heuristic | Ví dụ |
|------|-------------------|-------|
| `number` | `\d+[%$×x]?`, `\d+\s*(triệu\|nghìn\|K\|lần\|năm\|tháng)` | `75%`, `10×`, `4 tháng` |
| `company` | Tên riêng công ty / sản phẩm trong script | Uber, OpenAI, GitHub, Claude |
| `tech` | Thuật ngữ kỹ thuật | AI, token, API, cache, RAG, plugin |
| `action` | Động từ nhấn mạnh | cắt giảm, tối ưu, tiết kiệm, lọc, kiểm soát |
| `success` | Kết quả tích cực / stat tốt | rẻ hơn, hiệu quả, giảm |

**Thứ tự áp dụng:** `number` → `company` → `tech` → `action` → `success`. Không wrap lồng span (skip nếu đã nằm trong `<span class="kw`).

---

## Color palette (vibrant, dark-bg safe)

| Class | Màu | Dùng cho |
|-------|-----|----------|
| `.kw-number` | `#00d9ff` | Số, %, đơn vị |
| `.kw-company` | `#ff6b35` | Brand, công ty |
| `.kw-tech` | `#a855f7` | Thuật ngữ tech |
| `.kw-action` | `#ffea00` | Động từ hành động (trên nền tím/đỏ dùng `#ffea00`) |
| `.kw-success` | `#4ade80` | Kết quả / lợi ích |
| `.kw-emphasis` | `#22d3ee` | Từ nhấn trong hook title box |

**Contrast:** min **4.5:1** với nền tối (`#0a0a12`–`#1a0a2e`). Cấm pastel mờ trên nền tối.

---

## Cấm màu tối (keyword & số liệu)

**Cấm** cho `.kw-*`, `.stat-val`, số trong title:

| Cấm | Lý do |
|-----|-------|
| `#000`, `#111`, `#1a1a1a` | Chìm trên nền tối |
| `rgba(0,0,0,...)` text | Không đọc được |
| `color: inherit` trên nền đỏ/tối | Mất contrast |
| `focal-gradient` clip trong `.hook-title-box` | Vùng gradient tối |
| `focal-gradient` / `focal-large` trong `.mockup-body`, `.card-body`, `.ui-card`, `.quote-box` | Dùng `.kw-number` / `.kw-tech` solid |

**Bắt buộc:** keyword luminance ~70%+; trong support zone **cấm** `focal-large` — chỉ hero/headline.

`.card-body .kw-company` trên nền tối: `#ff8c5a` nếu `#ff6b35` chìm.

`.stat-val`, `.card-detail`, `.stat-label`: dùng `#e2e8f0` hoặc opacity ≥ 0.88 — không xám `#64748b` trên nền tối.

---

## HTML implementation

```html
<div class="hero-sm">${highlightKeywords("Uber đốt sạch ngân sách AI")}</div>
<!-- → Uber → kw-company, AI → kw-tech -->
```

```css
.kw{font-weight:700}
.kw-number{color:#00d9ff}
.kw-company{color:#ff6b35}
.kw-tech{color:#a855f7}
.kw-action{color:#ffea00}
.kw-success{color:#4ade80}
.kw-emphasis{color:#22d3ee}
```

Helper trong `gen-beats.mjs` hoặc beat HTML:

```javascript
function highlightKeywords(text) {
  const patterns = [
    { regex: /(\d+[%$×x]?|\d+\s*(triệu|nghìn|K|lần|năm|tháng))/gi, type: "number" },
    { regex: /(Uber|OpenAI|GitHub|Nvidia|Claude|Codex|Gemini|Walmart|Copilot|Sam Altman)/gi, type: "company" },
    { regex: /(AI|token|API|cache|RAG|plugin|markdown|chatbot)/gi, type: "tech" },
    { regex: /(cắt giảm|tối ưu|tiết kiệm|lọc|kiểm soát|đốt|trị)/gi, type: "action" },
    { regex: /(rẻ hơn|hiệu quả|giảm)/gi, type: "success" },
  ];
  let result = text;
  for (const { regex, type } of patterns) {
    result = result.replace(regex, (match, _g, offset, str) => {
      const before = str.slice(0, offset);
      if (before.lastIndexOf('<span class="kw') > before.lastIndexOf('</span>')) return match;
      return `<span class="kw kw-${type}">${match}</span>`;
    });
  }
  return result;
}
```

---

## Rules

- Mỗi beat: **≥1 dòng** có ≥2 keyword màu khác nhau khi script cho phép
- Headline hero: highlight ít nhất 1 keyword
- Quote box / card body: highlight số hoặc thuật ngữ chính
- Caption karaoke: **không** bắt buộc keyword highlight (giữ sync đơn giản)

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Cả dòng trắng đơn sắc | Ít nhất 1–2 keyword màu |
| Màu pastel mờ | Vibrant neon trên nền tối |
| Keyword đen / xám tối | Palette `.kw-*` sáng only |
| `focal-gradient` trong card/mockup | Solid `.kw-*` only |
| `focal-large` trong support zone | Chỉ headline `.hero` |

---

## Headline hierarchy (beats 2–N)

**Đọc kèm:** [kinetic-typography-brief.md](kinetic-typography-brief.md)

| Class | Size |
|-------|------|
| `.hero` | `clamp(56px, 5.5vw, 80px)` — mặc định |
| `.hero-sm` | chỉ câu >8 từ: `clamp(48px, 4.5vw, 64px)` |
| `.stat-val` / `.focal-large` trong card | `≤ 56px` |
| `.card-title` | `36px` |

Thứ tự: **hero ≥ stat-val ≥ card-title ≥ card-body**

| Highlight random từ thường | Chỉ pattern ở bảng trên |
| Nested `<span class="kw">` | Skip nếu đã wrap |
