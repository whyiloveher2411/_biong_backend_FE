# Vietnamese TTS script prep

Read when preparing **Vietnamese** text for TTS (OmniVoice, VieNeu, Saydi, Vbee) in Biong short video pipeline.

Full spec: `biong-short-video-hyperframes/references/vi-voiceover-naturalization.md`

---

## 4. Punctuation tuning (prosody)

TTS models infer pause and pitch from punctuation. **No SSML.**

| Technique | Example | Effect |
|-----------|---------|--------|
| Ellipsis `...` or `. . .` | `Ba bước này . . .` | ~300–500ms pause |
| Em dash `—` | `Lỗi lớn nhất — bỏ qua bước một` | Beat before keyword |
| `?!` | `Ai cũng mắc lỗi này?!` | Rising question intonation |
| Staccato periods | `Sai. Lầm. Lớn. Nhất.` | Emphasis, grit |

Production tag `[Dừng 0.5s]` in saved script → server converts to `. . .` at synthesize time.

---

## 5. English brand terms — TTS layer only

**Saved `audio_script` keeps original spelling** (captions/karaoke display correct brands).

Server applies phonetic map **only when calling OmniVoice**:

| In script | Sent to TTS |
|-----------|-------------|
| HyperFrames | Hai-pơ-phờ-reim |
| API | A-pi-ai |
| App | Áp |
| TikTok | Tíc-tóc |
| AI Agent | Ei-Ai Êi-gừnt |

Agents must **not** write phonetic forms into `save_audio_script` text.

---

## Chain note

- OmniVoice: keeps expressive tags `[laughter]`, `[sigh]`, `[dissatisfaction-hnn]`; strips `[BGM]`/`[SFX]`
- Fallback providers strip all bracket tags — write prosody into punctuation instead

See [tts.md](tts.md) for provider chain and word timestamps.
