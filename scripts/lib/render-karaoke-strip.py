#!/usr/bin/env python3
"""
Render karaoke caption STRIP (transparent band) → .mov (qtrle).

2 chế độ:
  --words <caption-words.json>   # nhóm 4 từ (caption thường)
  --beats <karaoke-beats.json>   # hiển thị TOÀN BỘ content của beat, active từng từ

Nguyên tắc (--beats): TEXT hiển thị lấy từ content audio script của beat; whisper
CHỈ dùng để xác định thời gian. Timing whisper mỗi beat được fit vào đúng độ dài
AUDIO của beat và được giới hạn trong beat đó → không trôi dồn, không lẫn beat.

Từ chỉ được tô active trong đúng khoảng [start,end] của nó; giữa các từ (khoảng
lặng) không tô gì → không "active trước khi đọc".

Không cần libass / browser → chạy được cho mọi độ dài video.
"""

from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import tempfile

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception as exc:  # pragma: no cover
    print(json.dumps({"success": False, "message": f"PIL không khả dụng: {exc}"}))
    sys.exit(2)


PAUSE_THRESHOLD = 0.12
GROUP_END_BUFFER = 0.25
PILL_BG = (12, 18, 32, 209)
PILL_RADIUS = 20
PAD_X = 36
PAD_TOP = 16
PAD_BOTTOM = 18
WORD_GAP = 10
COLOR_ACTIVE = (0, 229, 160, 255)
COLOR_INACTIVE = (200, 205, 215, 255)
LINE_HEIGHT_RATIO = 1.2
NORM_RE = re.compile(r"[^\w]", re.UNICODE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--words")
    group.add_argument("--beats")
    parser.add_argument("--out", required=True)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--band-height", type=int, default=0)
    parser.add_argument("--font", required=True)
    parser.add_argument("--font-size", type=int, default=48)
    parser.add_argument("--max-words", type=int, default=4)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--max-line-width", type=int, default=920)
    parser.add_argument("--keep-temp", action="store_true")
    return parser.parse_args()


def load_json(path: str):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_token(text: str) -> str:
    return NORM_RE.sub("", str(text or "").lower())


# ---------------------------------------------------------------------------
# Blocks: {start, end, dur, tokens:[{text, relStart, relEnd}]} (rel = giây trong block)
# ---------------------------------------------------------------------------

def make_groups(words: list[dict], max_words: int) -> list[list[dict]]:
    groups: list[list[dict]] = []
    current: list[dict] = []
    for index, word in enumerate(words):
        current.append(word)
        nxt = words[index + 1] if index + 1 < len(words) else None
        pause = (nxt["start"] - word["end"]) if nxt else 0
        punct = word["text"][-1:] in ".!?,;:…" if word["text"] else False
        if len(current) >= max_words or nxt is None or punct or pause >= PAUSE_THRESHOLD:
            groups.append(list(current))
            current = []
    return groups


def blocks_from_words(words: list[dict], duration: float, max_words: int) -> list[dict]:
    groups = make_groups(words, max_words)
    blocks = []
    for gi, group in enumerate(groups):
        visible_start = max(0.0, group[0]["start"])
        nxt = groups[gi + 1] if gi + 1 < len(groups) else None
        visible_end = duration if nxt is None else min(nxt[0]["start"], group[-1]["end"] + GROUP_END_BUFFER)
        visible_end = max(visible_start + 0.05, visible_end, group[-1]["end"])
        tokens = []
        for wi, word in enumerate(group):
            rel_start = 0.0 if wi == 0 else max(0.0, word["start"] - visible_start)
            rel_end = max(rel_start, word["end"] - visible_start)
            tokens.append({"text": word["text"], "relStart": rel_start, "relEnd": rel_end})
        blocks.append({
            "start": visible_start,
            "end": visible_end,
            "dur": max(0.05, visible_end - visible_start),
            "tokens": tokens,
        })
    return blocks


def align_times(tokens: list[str], whisper: list[dict], dur: float) -> list[tuple[float, float]]:
    """Trả về [(start,end)] theo giây trong beat.

    Whisper START từng từ là chính xác; END của từ cuối thường dính khoảng lặng/
    dấu câu (vd "." chạy tới hết file) → KHÔNG scale theo maxEnd (gây active sớm).
    Dùng start, và end = start của từ kế (từ cuối: min(whisperEnd, độ dài audio)).
    """
    n = len(tokens)
    if n == 0:
        return []
    starts: list[float | None] = [None] * n
    whisper_ends: list[float | None] = [None] * n
    if whisper:
        content_norm = [normalize_token(t) for t in tokens]
        whisper_norm = [normalize_token(w.get("text")) for w in whisper]
        matcher = difflib.SequenceMatcher(None, content_norm, whisper_norm, autojunk=False)
        for a, b, size in matcher.get_matching_blocks():
            for k in range(size):
                if a + k < n and b + k < len(whisper):
                    starts[a + k] = float(whisper[b + k].get("start") or 0)
                    whisper_ends[a + k] = float(whisper[b + k].get("end") or starts[a + k])
    known = [i for i in range(n) if starts[i] is not None]
    if not known:
        step = dur / max(1, n)
        return [(i * step, min(dur, (i + 1) * step)) for i in range(n)]

    for i in range(n):
        if starts[i] is None:
            prev = max((j for j in known if j < i), default=None)
            nxt = min((j for j in known if j > i), default=None)
            if prev is None:
                starts[i] = 0.0
            elif nxt is None:
                starts[i] = starts[prev]
            else:
                frac = (i - prev) / (nxt - prev)
                starts[i] = starts[prev] + (starts[nxt] - starts[prev]) * frac

    # Clamp + đảm bảo tăng dần
    starts = [max(0.0, min(dur, float(s or 0))) for s in starts]
    for i in range(1, n):
        if starts[i] < starts[i - 1]:
            starts[i] = starts[i - 1]

    out = []
    for i in range(n):
        s = starts[i]
        if i + 1 < n:
            e = starts[i + 1]
        else:
            raw_end = whisper_ends[i] if whisper_ends[i] is not None else s
            e = max(s, min(dur, float(raw_end)))
        out.append((s, max(s, e)))

    # Token cuối của whisper thường ôm khoảng lặng/dấu câu (vd "." chạy tới hết
    # file) → chặn active của từ cuối theo độ dài từ trung bình, tránh "active" khi
    # đã đọc xong.
    if n > 0:
        gaps = [starts[i + 1] - starts[i] for i in range(n - 1) if starts[i + 1] - starts[i] > 0.03]
        med = sorted(gaps)[len(gaps) // 2] if gaps else 0.5
        cap = starts[n - 1] + max(0.35, med)
        out[-1] = (starts[n - 1], max(starts[n - 1], min(out[-1][1], cap)))
    return out


def blocks_from_beats(beats: list[dict]) -> list[dict]:
    blocks = []
    for beat in beats:
        content = str(beat.get("content") or "").strip()
        tokens = content.split()
        start = float(beat.get("start") or 0)
        dur = float(beat.get("duration") or 0)
        if dur <= 0:
            dur = max(0.05, float(beat.get("end") or start) - start)
        if not tokens:
            continue
        times = align_times(tokens, beat.get("whisper") or [], dur)
        block_tokens = []
        for i, token in enumerate(tokens):
            s, e = times[i] if i < len(times) else (0.0, 0.0)
            s = max(0.0, min(dur, s))
            e = max(s, min(dur, e))
            block_tokens.append({"text": token, "relStart": s, "relEnd": e})
        blocks.append({"start": start, "end": start + dur, "dur": dur, "tokens": block_tokens})
    return blocks


# ---------------------------------------------------------------------------
# Layout / render
# ---------------------------------------------------------------------------

def wrap_lines(draw: ImageDraw.ImageDraw, tokens: list[dict], font, max_width: int) -> list[list[dict]]:
    lines = []
    line = []
    line_width = 0
    space = draw.textlength(" ", font=font)
    for token in tokens:
        width = draw.textlength(token["text"], font=font)
        extra = width if not line else width + space + WORD_GAP
        if line and line_width + extra > max_width:
            lines.append(line)
            line = [token]
            line_width = width
        else:
            line.append(token)
            line_width += extra
    if line:
        lines.append(line)
    return lines


def compute_layouts(draw, blocks, font, args):
    max_line_width = min(args.max_line_width, args.width - PAD_X * 2 - 40)
    layouts = []
    max_lines = 1
    space = draw.textlength(" ", font=font)
    for block in blocks:
        lines = wrap_lines(draw, block["tokens"], font, max_line_width)
        max_lines = max(max_lines, len(lines))
        widths = []
        for line in lines:
            total = 0
            for idx, token in enumerate(line):
                total += draw.textlength(token["text"], font=font)
                if idx < len(line) - 1:
                    total += space + WORD_GAP
            widths.append(total)
        layouts.append({"lines": lines, "widths": widths})
    return layouts, max_lines


def render_state(path, block, layout, active, args, font, band_h, empty=False):
    canvas_w = args.width
    img = Image.new("RGBA", (canvas_w, band_h), (0, 0, 0, 0))
    if empty or not layout["lines"]:
        img.save(path, "PNG")
        return
    draw = ImageDraw.Draw(img)
    line_height = int(round(args.font_size * LINE_HEIGHT_RATIO))
    pill_h = line_height * len(layout["lines"]) + PAD_TOP + PAD_BOTTOM
    pill_w = int(min(canvas_w - 24, max(layout["widths"], default=0) + PAD_X * 2))
    pill_x = (canvas_w - pill_w) // 2
    pill_y = band_h - pill_h

    overlay = Image.new("RGBA", (canvas_w, band_h), (0, 0, 0, 0))
    odraw = ImageDraw.Draw(overlay)
    odraw.rounded_rectangle([pill_x + 2, pill_y + 6, pill_x + pill_w + 2, pill_y + pill_h + 6], radius=PILL_RADIUS, fill=(0, 0, 0, 90))
    odraw.rounded_rectangle([pill_x, pill_y, pill_x + pill_w, pill_y + pill_h], radius=PILL_RADIUS, fill=PILL_BG)
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    space = draw.textlength(" ", font=font)
    cursor = 0
    for line_index, line in enumerate(layout["lines"]):
        x = (canvas_w - layout["widths"][line_index]) / 2
        y = pill_y + PAD_TOP + line_index * line_height
        for token in line:
            color = COLOR_ACTIVE if cursor == active else COLOR_INACTIVE
            draw.text((x + 1, y + 2), token["text"], font=font, fill=(0, 0, 0, 160))
            draw.text((x, y), token["text"], font=font, fill=color)
            x += draw.textlength(token["text"], font=font) + space + WORD_GAP
            cursor += 1
    img.save(path, "PNG")


def build_segments(blocks: list[dict], total_duration: float) -> list[dict]:
    """Segment active chính xác theo [relStart,relEnd] của từng từ; khoảng lặng → active=-1."""
    segments: list[dict] = []
    last = 0.0

    def push(s: float, e: float, block: int, active: int):
        nonlocal last
        s = max(last, s)
        e = max(s, e)
        if e - s > 0.001:
            segments.append({"start": s, "end": e, "block": block, "active": active})
            last = e

    for bi, block in enumerate(blocks):
        if block["start"] > last + 0.001:
            push(last, block["start"], -1, 0)
        for i, token in enumerate(block["tokens"]):
            ws = block["start"] + token["relStart"]
            we = block["start"] + min(token["relEnd"], block["dur"])
            if ws > last + 0.001:
                # Trước từ đầu (khoảng lặng dẫn) → vẫn HIỆN content, chưa tô từ nào.
                push(last, ws, bi, -1)
            if we > last + 0.001:
                push(last, we, bi, i)
        if block["end"] > last + 0.001:
            # Sau từ cuối → vẫn HIỆN content, không tô.
            push(last, min(block["end"], block["start"] + block["dur"]), bi, -1)
    if total_duration > last + 0.001:
        push(last, total_duration, -1, 0)
    return segments


def main() -> int:
    args = parse_args()

    font_path = os.path.abspath(args.font)
    if not os.path.isfile(font_path):
        print(json.dumps({"success": False, "message": f"Thiếu font: {font_path}"}))
        return 2

    if args.words:
        raw = load_json(os.path.abspath(args.words))
        words = raw.get("words") if isinstance(raw, dict) else raw
        words = [
            {"text": str(w.get("text") or "").strip(),
             "start": max(0.0, float(w.get("start") or 0)),
             "end": max(0.0, float(w.get("end") or 0))}
            for w in (words or [])
            if isinstance(w, dict) and str(w.get("text") or "").strip()
        ]
        if not words:
            print(json.dumps({"success": False, "message": "words rỗng"}))
            return 2
        duration = max(w["end"] for w in words)
        blocks = blocks_from_words(words, duration, args.max_words)
    else:
        raw = load_json(os.path.abspath(args.beats))
        beats = raw.get("beats") if isinstance(raw, dict) else raw
        blocks = blocks_from_beats(beats or [])
        if not blocks:
            print(json.dumps({"success": False, "message": "beats rỗng/không có content"}))
            return 2
        duration = max(b["end"] for b in blocks)

    temp_dir = tempfile.mkdtemp(prefix="karaoke-strip-")
    empty_png = os.path.join(temp_dir, "empty.png")

    cap = int(args.height * 0.6)
    font_size = args.font_size
    font = ImageFont.truetype(font_path, font_size)
    probe = Image.new("RGBA", (args.width, args.height), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(probe)
    layouts, max_lines = compute_layouts(pdraw, blocks, font, args)
    needed = max_lines * int(round(font_size * LINE_HEIGHT_RATIO)) + PAD_TOP + PAD_BOTTOM
    if needed > cap and max_lines > 0:
        font_size = max(18, int((cap - PAD_TOP - PAD_BOTTOM) / (max_lines * LINE_HEIGHT_RATIO)))
        font = ImageFont.truetype(font_path, font_size)
        layouts, max_lines = compute_layouts(pdraw, blocks, font, args)
        needed = max_lines * int(round(font_size * LINE_HEIGHT_RATIO)) + PAD_TOP + PAD_BOTTOM

    band_h = max(args.band_height, needed + 8, 60)
    Image.new("RGBA", (args.width, band_h), (0, 0, 0, 0)).save(empty_png, "PNG")

    segments = build_segments(blocks, duration)
    if not segments:
        print(json.dumps({"success": False, "message": "Không dựng được segment"}))
        return 2

    cache: dict[str, str] = {}
    list_lines: list[str] = []

    def png_for(block_index: int, active: int) -> str:
        if block_index < 0:
            return empty_png
        key = f"{block_index}_{active}"
        if key not in cache:
            out = os.path.join(temp_dir, f"cap_{block_index}_{active}.png")
            render_state(out, blocks[block_index], layouts[block_index], active, args, font, band_h)
            cache[key] = out
        return cache[key]

    for seg in segments:
        png = png_for(seg["block"], seg["active"])
        list_lines.append(f"file '{png}'")
        list_lines.append(f"duration {seg['end'] - seg['start']:.3f}")
    last_seg = segments[-1]
    list_lines.append(f"file '{png_for(last_seg['block'], last_seg['active'])}'")
    list_path = os.path.join(temp_dir, "concat.txt")
    with open(list_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(list_lines) + "\n")

    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", list_path,
        "-fps_mode", "cfr", "-r", str(args.fps),
        "-c:v", "qtrle", "-pix_fmt", "argb",
        "-an", out_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not os.path.isfile(out_path):
        print(json.dumps({
            "success": False,
            "message": "ffmpeg encode strip thất bại",
            "log": (result.stderr or "")[-800:],
        }))
        return 3

    if not args.keep_temp:
        try:
            for name in os.listdir(temp_dir):
                os.remove(os.path.join(temp_dir, name))
            os.rmdir(temp_dir)
        except OSError:
            pass

    print(json.dumps({
        "success": True,
        "out": out_path,
        "duration_sec": duration,
        "band_height": band_h,
        "font_size": font_size,
        "blocks": len(blocks),
        "segments": len(segments),
        "states": len(cache) + 1,
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
