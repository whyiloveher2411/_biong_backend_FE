---
name: humanize-audio-script
description: "[OPTIONAL — không trong pipeline] Polish giọng robot sau audit. Pipeline mặc định gộp vào /viral-audio-script."
---

# humanize-audio-script (optional)

**Không còn bước bắt buộc** trong Phase 1. `/viral-audio-script` viết script hoàn chỉnh one-pass.

Chỉ invoke khi `/audit-audio-script` báo giọng robot / jargon sau khi đã sửa plain-language.

Sau khi humanize (nếu dùng) → `/audit-audio-script` lại.

Tham khảo: `biong-short-video-hyperframes/references/humanize-audio-script.md`
