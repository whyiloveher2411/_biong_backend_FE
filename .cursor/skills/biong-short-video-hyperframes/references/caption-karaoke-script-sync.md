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

## Pipeline 5 bước (bắt buộc — dùng script, không hand-author)

1. **Đọc script** — `get_context.audio_script` → lưu `assets/audio-script.txt`; strip markers `[BGM: ...]`, `[Dừng Ns]`, `[SFX: ...]`, **và thẻ OmniVoice non-verbal** `[laughter]`, `[sigh]`, `[gasp]` (caption không hiển thị — chỉ 3 tag allowlist).
2. **Transcribe** — `hyperframes transcribe` trên `audio_file` → `transcript.json` hoặc `assets/transcript.json` (`words[].start`, `words[].end`).

**Sau MCP TTS OmniVoice:** bắt buộc transcribe **lại** MP3 mới — prosody `. . .` và emotion tags làm đổi duration so với ước lượng script.
3. **Sync tự động** — chạy từ thư mục project:

```bash
node .cursor/skills/biong-short-video-preflight/scripts/sync-caption-from-script.mjs .
node .cursor/skills/biong-short-video-preflight/scripts/verify-caption-sync.mjs . --strict
node .cursor/skills/biong-short-video-preflight/scripts/gen-captions-html.mjs .
```

4. **Self-check** — `verify-caption-sync.mjs` exit 0 bắt buộc trước render. FAIL → đọc `assets/caption-sync-report.json`, sửa, sync lại (tối đa 2 vòng).
5. **Wire** — host clip `compositions/captions.html` trong `index.html` — z-index 9000.

**Cấm** copy text từ `transcript.json` vào caption — Whisper hay sai chính tả tiếng Việt.

Thuật toán: [`caption-script-align.mjs`](../../biong-short-video-preflight/scripts/lib/caption-script-align.mjs) — 4 tầng map (lookahead 40):

| Tầng | Khi nào | Kết quả |
|------|---------|---------|
| **exact** | `norm(script) === norm(whisper)` | Text script + timing Whisper |
| **fuzzy** | Levenshtein ratio ≥ 0.72 | Text script + timing Whisper (log correction) |
| **positional** | Lệch từ ≤25%, còn slot Whisper | Text script + consume timing slot (vd. Whisper "ca" → hiển thị "cá") |
| **interpolate** | Hết transcript | Text script + nội suy timing |

Ví dụ: script `"Con cá lớn"`, Whisper `"Con ca lớn"` → karaoke hiển thị **"cá"** (không phải "ca").

**Cấm map timing tỷ lệ thô** (vd. `scriptWords[i] → transcript[Math.floor(i * m / n)]`) khi số từ script ≠ số từ transcript — gây caption biến mất / lệch giữa video. Luôn dùng `sync-caption-from-script.mjs`; giữ text script, chỉ lấy `start`/`end` từ transcript.

**Cấm** `npx hyperframes add caption-pill-karaoke` rồi embed `transcript.json` text — phải chạy sync pipeline trước.

---

## Fallback khi map lệch

- Giữ **text script** — không thay bằng Whisper.
- Log corrections trong `assets/caption-sync-report.json` (`corrections[]`: whisper→script).
- Interpolate `start`/`end` chỉ khi hết transcript (`interpolatedCount`).
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
- **Z-index bắt buộc:** host clip trong `index.html` phải `z-index:9000` — xem [overlay-layer-stack.md](overlay-layer-stack.md). **`data-track-index` KHÔNG thay z-index.**

```html
<!-- CUỐI #root, SAU mọi beat section -->
<div class="clip hf-overlay-caption"
     data-composition-src="compositions/captions.html"
     data-start="0"
     data-duration="{totalVideoSec}"
     data-track-index="20"
     style="position:absolute;inset:0;z-index:9000;pointer-events:none;">
</div>
```

Trong `compositions/captions.html`:

```css
html, body { background: transparent !important; }
```

- GSAP caption timeline: `window.__timelines["caption-pill-karaoke"]` — `paused: true`.
- Karaoke active word: stagger `0.08–0.12` sync `word.start` / `word.end`.
- Preflight: `/biong-short-video-preflight` hoặc `check-overlay-stack.mjs` — **pass trước render final**.

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

- [ ] `audio_script` đã đọc từ MCP → `assets/audio-script.txt`
- [ ] `transcript.json` có word timings
- [ ] `sync-caption-from-script.mjs` + `verify-caption-sync.mjs --strict` pass
- [ ] `gen-captions-html.mjs` đã chạy — không hand-author từ Whisper
- [ ] Mọi word hiển thị khớp script (không phải Whisper text)
- [ ] Chunk 3–5 từ / group (trong HTML generator)
- [ ] Caption host `z-index:9000` trong index.html
- [ ] `compositions/captions.html` body `background: transparent`
- [ ] Preflight `check-overlay-stack.mjs` pass
- [ ] Caption band không overlap diagram/CTA
