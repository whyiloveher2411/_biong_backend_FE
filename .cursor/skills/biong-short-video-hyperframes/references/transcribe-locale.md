# Transcribe locale — đa ngôn ngữ short video

Pipeline transcribe **không hardcode tiếng Việt**. Ngôn ngữ lấy từ metadata project hoặc CLI.

---

## Nguồn locale (ưu tiên cao → thấp)

1. CLI `--lang` / `--model` trên `transcribe-audio.mjs`
2. Env `SHORT_VIDEO_TRANSCRIBE_LANG`, `SHORT_VIDEO_TRANSCRIBE_MODEL`
3. [`assets/agent-metadata.json`](../../../biong-short-video-preflight/scripts/map-markers-to-timing.mjs) — field **`language`** (hoặc `script_language`, `locale`, `tts_language`)
4. `assets/transcribe-manifest.json` (lần transcribe trước)
5. Default `vi`

---

## Lưu metadata phase 2

Từ `short_video_get_context`, lưu:

```json
{
  "language": "en",
  "markers": [{ "time": 0, "text": "...", "section": "hook" }],
  "timeline": { "hook_end": 5, "agitate_end": 27, "solve_end": 81, "total": 90 }
}
```

`language` = ISO 639-1 (`vi`, `en`, `ja`, `ko`, `zh`, …).

---

## Lệnh transcribe

```bash
# Tự đọc language từ agent-metadata.json
node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs .

# Override thủ công
node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs . --lang en
node .cursor/skills/biong-short-video-preflight/scripts/transcribe-audio.mjs . --lang ja --model small
```

`transcribe-vi.mjs` vẫn tồn tại (alias) — khuyến nghị dùng `transcribe-audio.mjs`.

---

## Registry locale (`transcribe-locale.mjs`)

| Code | Whisper model | Sanity profile |
|------|---------------|----------------|
| `vi` | `small` + `--language vi` | `diacritic-latin` |
| `en` | `small.en` | `latin` |
| `ja` | `small` + `--language ja` | `cjk` |
| `ko` | `small` + `--language ko` | `cjk` |
| `zh` | `small` + `--language zh` | `cjk` |
| *(khác)* | `small` + `--language <code>` | `generic` (word-count drift only) |

### Thêm ngôn ngữ mới

Sửa `LOCALES` trong `preflight/scripts/lib/transcribe-locale.mjs`:

```javascript
es: {
  label: "Spanish",
  whisperModel: "small",
  sanity: "diacritic-latin", // hoặc generic / latin / cjk
  scriptPattern: /[ñáéíóúü]/i, // optional — cho sanity CJK/diacritic
},
```

Không cần sửa `transcribe-audio.mjs` hay `verify-caption-sync.mjs`.

---

## Quy tắc Whisper (giữ nguyên)

- **Cấm** `npx hyperframes transcribe` không flag — default `small.en` dịch non-English → EN
- `en` → `small.en` (không cần `--language`)
- Mọi ngôn ngữ khác → `small` (hoặc `medium`) + `--language <iso>`
