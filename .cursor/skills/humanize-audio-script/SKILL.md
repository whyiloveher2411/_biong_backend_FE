---
name: humanize-audio-script
description: Polish văn nói tự nhiên từ viral draft — GIỮ non-verbal tags OmniVoice, cấm thêm/xóa tag. Dùng sau /viral-audio-script, trước /audit-audio-script.
---

# humanize-audio-script

Polish **bản nháp** từ `/viral-audio-script` — văn người thật, thành ngữ, từ đệm hội thoại.

**Cấm thêm/xóa/di chuyển non-verbal tags** — tag đã gắn trong viral draft.

**Cấm thêm từ liệt kê** khi humanize — giữ But/Therefore đã có.

**Đọc trước:**
- `biong-short-video-hyperframes/references/narrative-flow-vi.md`
- `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md` (§1 §2 §6)
- `biong-short-video-hyperframes/references/humanize-audio-script.md`
- `biong-short-video-hyperframes/references/omnivoice-expressive-tags.md`

## Prompt cốt lõi

```text
QUAN TRỌNG: Giữ nguyên mọi thẻ allowlist OmniVoice (13 tag — xem omnivoice-expressive-tags.md) — cấm thêm/xóa tag. Cấm [happy] [singing] [whisper] [gasp].
Giữ [BGM], [SFX], [Dừng] nguyên vị trí.

NARRATIVE FLOW — áp dụng nghiêm:
1. Cấm từ liệt kê: Một là, Hai là, Đầu tiên, Tiếp theo, Ngoài ra, Đồng thời, Bên cạnh đó.
2. Nối ý bằng But/Therefore: Nhưng mà, Thành ra, Chính vì vậy, Tưởng vậy là…, Chưa dừng ở đó…
3. Pacing reviewer TikTok — gom thông số thành câu cảm thán/so sánh, không đọc từng dòng.
4. Cấm structural summarization — mỗi câu phải kéo câu sau.

Dưới đây là đoạn văn cần sửa: [DRAFT_SCRIPT]
```

## Bước tiếp

`/audit-audio-script` — QA + sửa lỗi; **chỉ** `save_audio_script` khi `script_diagnosis.pass === true`

## Output (chuyển sang audit)

```json
{
  "estimated_duration_sec": 90,
  "expressive_plan": { "hook": [], "agitate": ["[sigh]"], "solve": [], "cta": ["[laughter]"] },
  "tts_engine_hint": "omnivoice"
}
```
