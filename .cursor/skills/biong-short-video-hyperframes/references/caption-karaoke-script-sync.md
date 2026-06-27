# Caption karaoke — script text + Whisper timing

**Bắt buộc** mọi video phase 2. Đọc trước khi wire `compositions/captions.html`.

---

## Hợp đồng (không thương lượng)

| Nguồn | Dùng cho |
|-------|----------|
| `audio_script` từ `short_video_get_context` | **Text hiển thị** — mọi từ trên màn hình |
| `transcript.json` từ `/hyperframes-media` transcribe | **Timing only** — `start` / `end` per word |

**Cấm** hiển thị text raw từ Whisper — Whisper hay sai chính tả tiếng Việt / tên riêng.

---

## Pipeline 5 bước

1. **Đọc script** — `get_context.audio_script`; strip markers `[BGM: ...]`, `[Dừng Ns]`, `[SFX: ...]`.
2. **Transcribe** — `hyperframes transcribe` trên `audio_file` → `transcript.json` (`words[].start`, `words[].end`).
3. **Tokenize script** — tách từ theo thứ tự nói (giữ dấu câu gắn từ nếu cần).
4. **Chunk** — nhóm **3–5 từ** mỗi caption group; break tại pause >150ms hoặc ranh giới câu.
5. **Map timing tuần tự** — word thứ *N* trong script ← timestamp word thứ *N* trong transcript (theo vị trí, không text-match mù).

Thuật toán tham chiếu: `agent/skills/embedded-captions/scripts/fill-timings.cjs` — map theo sequence, lookahead 40 words.

**Cấm map timing tỷ lệ thô** (vd. `scriptWords[i] → transcript[Math.floor(i * m / n)]`) khi số từ script ≠ số từ transcript — gây caption biến mất / lệch giữa video. Luôn dùng sequential map + `fill-timings.cjs`; giữ text script, chỉ lấy `start`/`end` từ transcript.

---

## Fallback khi map lệch

- Giữ **text script** — không thay bằng Whisper.
- Log word không match; interpolate `start`/`end` từ word kề.
- Nếu transcript ngắn hơn script → kéo dài group cuối đến `totalVideoSec`.

---

## Style — chỉ HyperFrames registry catalog

Cài block từ registry — **không** hand-author caption skin từ đầu:

```bash
cd storage/agent-renders/{id}/my-video
npx hyperframes add caption-pill-karaoke      # mặc định — social / conversational
npx hyperframes add caption-kinetic-slam      # hook / cao trào
npx hyperframes add caption-highlight         # emphasis word
```

| Block | Khi nào |
|-------|---------|
| `caption-pill-karaoke` | Mặc định — karaoke pill, word highlight theo giọng |
| `caption-kinetic-slam` | Hook 0–3s, punch line, số liệu shock |
| `caption-highlight` | Từ khóa CTA / brand trong group |
| `caption-neon-glow` | Chỉ khi palette neon-electric đã chọn |

Browse: `registry/registry.json` — skill `/hyperframes-registry`.

Customize in-place sau khi `add` — không reinvent HTML/CSS caption.

---

## Vị trí & wiring

- Caption **tách file** — `compositions/captions.html` hoặc registry sub-composition.
- Band **78–100%** canvas (1498–1920px) — xem [layout-9x16-zones.md](layout-9x16-zones.md).
- **Cấm** karaoke inline trong beat HTML cùng layer diagram.

```html
<div class="clip" data-composition-src="compositions/captions.html"
     data-start="0" data-duration="{totalVideoSec}" data-track-index="5">
</div>
```

- GSAP caption timeline: `window.__timelines["caption-pill-karaoke"]` — `paused: true`.
- Karaoke active word: stagger `0.08–0.12` sync `word.start` / `word.end`.

---

## Word data shape (author trong captions plan)

```json
{
  "groups": [
    {
      "id": "g0",
      "in": 0.0,
      "out": 1.8,
      "words": [
        { "text": "Bạn", "start": 0.0, "end": 0.32 },
        { "text": "có", "start": 0.33, "end": 0.48 },
        { "text": "biết", "start": 0.49, "end": 0.72 }
      ]
    }
  ]
}
```

`text` luôn từ script; `start`/`end` từ transcript map.

---

## Anti-patterns

| Sai | Đúng |
|-----|------|
| Subtitle tĩnh cả clip | Word-level karaoke sync |
| Text từ Whisper | Text từ `audio_script` |
| Không có caption | Luôn wire caption sub-composition |
| Caption trong beat HTML | `compositions/captions.html` riêng |
| Font caption <42px portrait | `fitTextFontSize` min 42px — xem hyperframes-media captions |

---

## Checklist

- [ ] `audio_script` đã đọc từ MCP
- [ ] `transcript.json` có word timings
- [ ] Mọi word hiển thị khớp script (không phải Whisper text)
- [ ] Chunk 3–5 từ / group
- [ ] Registry block installed + wired
- [ ] Caption band không overlap diagram/CTA
