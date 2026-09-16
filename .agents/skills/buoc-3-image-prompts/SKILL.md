---
name: buoc-3-image-prompts
description: Chạy Bước 3 của workflow "video-image" (Tạo video từ image) — chuyển kịch bản audio thành prompt ảnh hoạt hình 2D. Trigger khi user nói "chạy bước 3", "làm bước 3", "tạo prompt ảnh", "sinh plan-prompt / prompt-image-v2-final", "buoc-3-image-prompts", hoặc đưa short video id kèm yêu cầu tạo prompt image cho beat. Skill dùng MCP biong-short-video-agent để kiểm tra điều kiện, tự sinh 2 output (plan-prompt rồi prompt-image-v2-final), lưu vào workflow_outputs và đẩy prompt vào từng beat.
---

# Bước 3 — Chuyển kịch bản thành prompt ảnh hoạt hình 2D

Skill này thực thi đúng **Bước 3** của workflow `video-image`
(`_biong_backend/prompts/workflow/video-image/index.md`) theo đúng 2 prompt con:

| Thứ tự | Prompt | updateField | buttonUpdate |
|--------|--------|-------------|--------------|
| 1 | `buoc-3-v2-2.md` — Lập ý tưởng hình ảnh cho từng beat | `plan-prompt` | — |
| 2 | `buoc-3-v2-3.md` — Viết prompt hình ảnh hoàn chỉnh | `prompt-image-v2-final` | `imagePromptBeatUpdate` |

**Nguyên tắc:** thực hiện đúng prompt trong file, **KHÔNG hỏi approval** (bỏ qua
CHECKPOINT trong file prompt). Chỉ dừng để hỏi user khi **điều kiện gate** không đạt.

## Input

- `short_video_id` — user cung cấp (bắt buộc). Nếu thiếu, hỏi đúng 1 câu.
- `workflow` — cố định `video-image`.

Repo path (backend): `_biong_backend/prompts/workflow/video-image/` — nằm cạnh
`_biong_backend_FE` (thư mục hiện tại của skill).

## Bước 0 — Gate: kiểm tra có chạy được ngay không

Gọi song song 3 MCP tool (server `biong-short-video-agent`):

1. `short_video_get_context({ short_video_id })`
   - Lấy `audio_script`. **Bắt buộc `audio_script` không rỗng.**
2. `short_video_get_image_style({ short_video_id })`
   - **Bắt buộc `has_image_style === true`.** Lấy `prompt` làm `[prompt-style]`.
3. `short_video_get_workflow_outputs({ short_video_id, workflow: 'video-image' })`
   - Lấy `workflow_outputs` (object key/value).
   - **`plan-prompt` phải CHƯA tồn tại.** Nếu đã có → DỪNG, báo user và hỏi
     có muốn ghi đè không. Chỉ tiếp tục khi user xác nhận rõ ràng.

Ma trận gate:

| Điều kiện | Đạt | Không đạt |
|-----------|-----|-----------|
| `audio_script` | có nội dung | DỪNG: "Chưa có audio script — hoàn tất Bước 1 trước" |
| image style | `has_image_style` true | DỪNG: "Chưa chọn phong cách hình ảnh — chọn style trước" |
| `plan-prompt` | chưa tồn tại | DỪNG/hỏi: "Đã có plan-prompt — ghi đè?" |

Khi mọi điều kiện đạt → chạy tiếp, không hỏi gì thêm.

## Bước 1 — Sinh `plan-prompt`

1. Đọc file `_biong_backend/prompts/workflow/video-image/buoc-3-v2-2.md`.
2. Thay placeholder (không phân biệt hoa thường, giữ nguyên phần còn lại):
   - `[audio-script]` → `audio_script` (nguyên văn, giữ đúng xuống dòng).
   - `[prompt-style]` → prompt image style.
3. Thực thi prompt đã thay key **đúng nguyên văn**. Bỏ qua mục CHECKPOINT —
   không hỏi approval. Trả về đúng DATA OUTPUT bắt đầu bằng dòng `BEAT VISUAL PLAN`.
4. Lưu kết quả:
   `short_video_save_workflow_output({ short_video_id, workflow: 'video-image', key: 'plan-prompt', value: <toàn bộ BEAT VISUAL PLAN markdown> })`
5. Kiểm tra `success === true` mới sang bước 2.

## Bước 2 — Sinh `prompt-image-v2-final` và đẩy vào beat

1. Đọc file `_biong_backend/prompts/workflow/video-image/buoc-3-v2-3.md`.
2. Thay placeholder:
   - `[audio-script]` → `audio_script`.
   - `[prompt-style]` → prompt image style.
   - `[plan-prompt]` → nội dung `plan-prompt` vừa sinh ở Bước 1.
3. Thực thi prompt **đúng nguyên văn**, bỏ qua CHECKPOINT. Trả về đúng DATA OUTPUT
   bắt đầu bằng dòng `BEAT IMAGE PROMPTS`.
   - Mỗi beat phải có: `SCRIPT SENTENCE` (nguyên văn narration), `IMAGE PROMPT`,
     `NEGATIVE PROMPT`.
   - Số khối `BEAT` phải khớp số dòng không rỗng của `audio_script`.
4. Lưu output:
   `short_video_save_workflow_output({ short_video_id, workflow: 'video-image', key: 'prompt-image-v2-final', value: <toàn bộ BEAT IMAGE PROMPTS markdown> })`
5. Đẩy prompt vào beat (tương đương buttonUpdate `imagePromptBeatUpdate`):
   `short_video_update_beat_image_prompts({ short_video_id, file_text: <toàn bộ BEAT IMAGE PROMPTS markdown> })`
   - All-or-nothing: nếu `success === false`, đọc `errors[]` và sửa output rồi gọi lại.
   - Lỗi thường gặp: clip không ở chế độ video 2s, clip chưa có beat, thiếu/thừa beat,
     `SCRIPT SENTENCE` không khớp content beat, `IMAGE PROMPT` trùng nhau.
6. `success === true` → báo `updated_orders` (số beat đã cập nhật) và
   `beat_division_completed`.

## Output cuối cho user

Báo gọn: short_video_id, số beat, `plan-prompt` đã lưu, `prompt-image-v2-final` đã lưu,
số beat đã đẩy prompt. Nêu rõ nếu có bước bị dừng và lý do.

## Ghi chú vận hành

- Nếu MCP server chưa thấy tool mới: rebuild và restart.
  `cd _biong_backend_FE/mcp/short-video-agent && npm run build` rồi restart MCP
  `biong-short-video-agent` trong Cursor/Codex.
- Không dùng prompt cũ `buoc-3-*.md` (v1) — chỉ dùng `buoc-3-v2-2.md` và `buoc-3-v2-3.md`.
- Nội dung output theo prompt là **tiếng Anh**; narration trong `SCRIPT SENTENCE`
  giữ nguyên bản gốc.
