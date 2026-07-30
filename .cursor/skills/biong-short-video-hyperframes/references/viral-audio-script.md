# viral-audio-script — kịch bản giữ chân cao (bản nháp)

**Model TTS:** `k2-fsa/OmniVoice` — plain text + marker sản xuất; **không** tag voice non-verbal. Xem [omnivoice-expressive-tags.md](omnivoice-expressive-tags.md).

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

## Tags

| Loại | Hợp lệ? |
|------|---------|
| `[BGM: ...]`, `[SFX: ...]`, `[Dừng ...]` | Có — production |
| `[laughter]`, `[sigh]`, `[dissatisfaction-hnn]` | **Không** — đã tắt |
| Mood / SSML | **Không** |

Metadata: `expressive_plan: { hook: [], agitate: [], solve: [], cta: [] }` — luôn rỗng.

Mood Hook/CTA: **neutral + `?!` + `. . .`**.

---

## HASCAS pacing

| Section | % thời lượng | Ghi chú |
|---------|--------------|---------|
| Hook | ~5% | Shock 0–3s + **[SFX] bắt buộc** + `?!` |
| Agitate | ~15% | Cảm thán + `. . .` — không tag voice |
| Solve | ~70% | Narrative chain But/Therefore — **không checklist** |
| CTA/Loop | ~10% | Slogan ngắn |

---

## Anti-patterns

- Structural summarization — fact rời nối bằng dấu chấm
- Từ liệt kê: Tiếp theo, Ngoài ra, Đầu tiên, Một là…
- Tag voice / mood (`[laughter]`, `[sigh]`, `[happy]`, `[gasp]`, …)
- SSML XML
