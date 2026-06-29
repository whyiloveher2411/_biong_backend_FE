# viral-audio-script — kịch bản giữ chân cao (bản nháp + non-verbal tags)

**Model TTS:** `k2-fsa/OmniVoice` — chỉ tag trong [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) allowlist (13 tag).

**Đọc cùng:**
- [narrative-flow-vi.md](narrative-flow-vi.md) — **bắt buộc**
- [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)
- [omnivoice-speech-script.md](omnivoice-speech-script.md)
- [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md)

---

## Narrative Flow (Solve section)

- Input: `core_signals.narrative_chain` từ `/extract-core-signals`
- Expand mỗi `{ cause, but, therefore }` thành thoại HASCAS
- **Cấm** đọc feature/spec theo thứ tự — không structural summarization
- Gom danh sách thông số → 1 câu cảm thán/so sánh
- Blocklist từ liệt kê: xem [narrative-flow-vi.md §3](narrative-flow-vi.md)

---

## Non-verbal tags (allowlist)

| Section | Tag | Quota |
|---------|-----|-------|
| Hook | `[question-en]`, `[question-ah]`, `[question-oh]`, `[question-ei]`, `[question-yi]` | 0–1 |
| Agitate | `[sigh]`, `[dissatisfaction-hnn]`, `[surprise-ah/oh/wa/yo]` | 0–1 |
| Twist / CTA | `[laughter]`, `[confirmation-en]` | 0–1 |
| **Tổng** | allowlist 13 tag | **≤2 / video** |

**Cấm:** `[gasp]`, `[happy]`, `[singing]`, `[whisper]` và mọi tag ngoài allowlist — server reject khi save.

Metadata: `expressive_plan: { hook, agitate, solve, cta }`.

Mood Hook/CTA: **neutral + `?!` + `. . .`** — không mood tag.

---

## HASCAS pacing

| Section | % thời lượng | Ghi chú |
|---------|--------------|---------|
| Hook | ~5% | Shock 0–3s + **[SFX] bắt buộc** + `?!`; optional `[question-*]` |
| Agitate | ~15% | `[sigh]` / `[dissatisfaction-hnn]` / `[surprise-*]` optional |
| Solve | ~70% | Narrative chain But/Therefore — **không checklist** |
| CTA/Loop | ~10% | Optional `[laughter]` hoặc `[confirmation-en]` |

---

## Anti-patterns

- Structural summarization — fact rời nối bằng dấu chấm
- Từ liệt kê: Tiếp theo, Ngoài ra, Đầu tiên, Một là…
- Tag mood (`[happy]`, `[singing]`, `[gasp]`, …)
- Tag không có trong allowlist
- >2 non-verbal / video
- SSML XML
