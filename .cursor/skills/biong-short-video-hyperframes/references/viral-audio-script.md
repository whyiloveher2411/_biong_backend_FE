# viral-audio-script — kịch bản giữ chân cao (bản nháp + non-verbal tags)

**Model TTS:** `k2-fsa/OmniVoice` — chỉ tag trong [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md) allowlist.

**Đọc cùng:**
- [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md)
- [omnivoice-speech-script.md](omnivoice-speech-script.md)
- [vi-voiceover-naturalization.md](vi-voiceover-naturalization.md)

---

## Non-verbal tags (allowlist)

| Section | Tag | Quota |
|---------|-----|-------|
| Agitate | `[sigh]` hoặc `[gasp]` | 0–1 |
| Twist / CTA | `[laughter]` | 0–1 |
| **Tổng** | `[laughter]` `[sigh]` `[gasp]` | **≤2 / video** |

**Cấm:** `[happy]`, `[singing]`, `[whisper]` và mọi tag ngoài allowlist — server reject khi save.

Metadata: `expressive_plan: { hook, agitate, solve, cta }`.

Mood Hook/CTA: **neutral + `?!` + `. . .`** — không mood tag.

---

## HASCAS pacing

| Section | % thời lượng | Ghi chú |
|---------|--------------|---------|
| Hook | ~5% | Shock 0–3s + **[SFX] bắt buộc** + `?!` |
| Agitate | ~15% | `[sigh]` hoặc `[gasp]` optional |
| Solve | ~70% | Neutral — `. . .` prosody |
| CTA/Loop | ~10% | Optional `[laughter]` |

---

## Anti-patterns

- Tag mood (`[happy]`, `[singing]`, …)
- Tag không có trong allowlist
- >2 non-verbal / video
- SSML XML
