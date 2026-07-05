# Import HTML — full pipeline (Cursor agent)

Đọc khi chạy phase `import_html_full` — sinh beat HTML thiếu qua MCP, sau đó ghép video.

**Đọc kèm:** [import-html-beat-render.md](import-html-beat-render.md) · [import-html-assemble-bgm.md](import-html-assemble-bgm.md) · [hf-prompt-beat-contract.md](hf-prompt-beat-contract.md) · [import-html-beat-originality.md](import-html-beat-originality.md)

---

## Phần A — Beat HTML (CMS)

### Originality (bắt buộc)

Đọc [import-html-beat-originality.md](import-html-beat-originality.md) — **cấm** mượn beat HTML / layout từ `storage/agent-renders/{id_khác}/`. Chỉ dùng prompt MCP + skill + `hf_prompt_type` template. Mỗi beat thiết kế riêng; **cấm** bulk template (`joint-grid`, `metric-block`, script sinh hàng loạt).

### Nguồn truth

- `short_video_get_context` → `import_html.missing_beat_ids`, `beat_map`, `whisper_words`, `audio_script`
- Chỉ sinh HTML cho beat trong `missing_beat_ids` — **cấm** ghi đè beat đã có HTML

### MCP mỗi beat (tuần tự)

1. `short_video_get_import_html_beat_prompt({ short_video_id, beat_id })`
2. Sinh **một** document: `<!doctype html>` … `</html>`
3. `short_video_save_import_html_beat({ short_video_id, beat_id, html })`
4. `short_video_get_context` — xác nhận `beats_html_completed` tăng

### Định dạng HTML bắt buộc

- CSS + JS **inline** trong cùng file — cấm file riêng, cấm external link/script
- `data-duration` và `const DURATION` khớp `durationSec` của beat trong beat-map
- `render(t)` pure function hf-seek — hoạt động mọi `t` từ 0 đến DURATION
- **Cấm** karaoke, phụ đề, caption on-screen, text sync voiceover
- Visual theo `hf_prompt_type` trong prompt server — đọc `hyperframes/prompts/{type}.md` nếu cần

### Gate phần B

- `import_html.beats_html_ready === true`
- `import_html.import_html_ready === true`

---

## Phần B — Ghép video (assemble)

Sau gate phần A — làm giống `import_assemble`:

1. `hyperframes init` → `storage/agent-renders/{id}/my-video`
2. Ghi `compositions/beat_N.html` từ CMS `beat_html`
3. `normalize-import-html-beat-for-render.mjs --localize-images`
4. `bootstrap-phase2-assets.mjs` → caption từ `audio_script` + timing `whisper_words` CMS
5. **BGM chain:** `search_bgm({ limit: 8 })` → `bgm_1…n.mp3` + `bgm-chain.json` → [import-html-assemble-bgm.md](import-html-assemble-bgm.md) → `wire-bgm-chain.mjs`
6. Wire `index.html`: narration track 10 + BGM chain + beats + caption + ambient + watermark
7. Preflight (`wire-bgm-chain.mjs`, `check-media-stack.mjs --strict`) → `hyperframes render --quality high --strict`
8. `short_video_upload_agent_video` + `short_video_update_agent_status(completed)`

**Cấm** ở phần B: sinh beat HTML mới, shot-plan, stock/giphy/SFX MCP, BGM `loop`.
**Cho phép:** `short_video_search_bgm` + `wire-bgm-chain.mjs`.

---

## Status

- Bắt đầu: `short_video_update_agent_status(processing)`
- Lỗi: `failed` + `last_error`
- Xong: `completed` sau upload MP4
