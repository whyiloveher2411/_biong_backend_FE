#!/usr/bin/env python3
"""
Render chữ xuyên suốt (persistent HUD) → dải trong suốt mép trên khung (.mov qtrle, alpha).

Input JSON (--spec):
{
  "width": 1920, "height": 1080, "fps": 30, "total_sec": 61.2, "locale": "vi-VN",
  "slots": [{"id","kind":"counter|label","anchor":"top-left|top-center|top-right","label","color","initial","emphasis"}],
  "keys":  [{"slot","t": giây tuyệt đối,"value","tween_sec"}],
  "hidden": [[start, end], ...]
}
Counter chạy số (ease-out) trong tween_sec; label đổi tức thì (tween = fade ngắn bằng cách giữ
giá trị mới). Khoảng hidden (title card…) không vẽ HUD. Chạy được mọi độ dài video vì chỉ
dựng ảnh ở các mốc đổi trạng thái rồi ghép bằng ffmpeg concat.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import tempfile

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont
except Exception as exc:  # pragma: no cover
    print(json.dumps({"success": False, "message": f"PIL không khả dụng: {exc}"}))
    sys.exit(2)

TWEEN_STEP = 1 / 15  # mẫu số chạy 15 lần/giây là đủ mượt cho bộ đếm


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--spec", required=True)
    p.add_argument("--out", required=True)
    p.add_argument("--font-bold", required=True)
    p.add_argument("--font-label", default="")
    p.add_argument("--keep-temp", action="store_true")
    return p.parse_args()


def hex_rgba(value: str, alpha: int = 255):
    value = (value or "#FFFFFF").lstrip("#")
    try:
        return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), alpha)
    except Exception:
        return (255, 255, 255, alpha)


def fmt_number(value: float, locale: str) -> str:
    sep = "." if locale.startswith("vi") else ","
    dec = "," if locale.startswith("vi") else "."
    negative = value < 0
    value = abs(value)
    if abs(value - round(value)) < 1e-9:
        text = f"{int(round(value)):,}".replace(",", sep)
    else:
        whole, frac = f"{value:,.2f}".split(".")
        text = whole.replace(",", sep) + dec + frac
    return ("-" if negative else "") + text


def ease_out(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return 1 - (1 - x) ** 3


def slot_value(slot: dict, keys: list[dict], t: float):
    """Giá trị slot tại thời điểm t (keys đã sắp theo t)."""
    value = slot.get("initial")
    for i, key in enumerate(keys):
        if key["t"] > t + 1e-6:
            break
        tween = float(key.get("tween_sec") or 0)
        if slot["kind"] == "counter" and tween > 0 and t < key["t"] + tween:
            start_val = float(value if isinstance(value, (int, float)) else 0)
            return start_val + (float(key["value"]) - start_val) * ease_out((t - key["t"]) / tween), True
        value = key["value"]
    return value, False


def main() -> int:
    args = parse_args()
    spec = json.load(open(args.spec, encoding="utf-8"))
    width, height = int(spec["width"]), int(spec["height"])
    fps = int(spec.get("fps") or 30)
    total = float(spec.get("total_sec") or 0)
    locale = str(spec.get("locale") or "vi-VN")
    slots = [s for s in spec.get("slots") or [] if isinstance(s, dict)]
    if not slots or total <= 0:
        print(json.dumps({"success": False, "message": "HUD rỗng hoặc total_sec không hợp lệ"}))
        return 2
    keys_by_slot = {s["id"]: sorted([k for k in spec.get("keys") or [] if k.get("slot") == s["id"]], key=lambda k: k["t"]) for s in slots}
    hidden = [(float(a), float(b)) for a, b in (spec.get("hidden") or [])]
    slot_int = {
        s["id"]: all(float(v) == int(float(v)) for v in [s.get("initial") or 0] + [k.get("value") or 0 for k in keys_by_slot[s["id"]]])
        for s in slots if s.get("kind") == "counter"
    }

    unit = height / 1080.0
    margin_x = int(round(56 * unit))
    margin_y = int(round(40 * unit))
    label_size = max(12, int(round(22 * unit)))
    value_size = max(18, int(round(50 * unit)))
    gap = int(round(18 * unit))
    font_value = ImageFont.truetype(args.font_bold, value_size)
    font_label = ImageFont.truetype(args.font_label if args.font_label and os.path.isfile(args.font_label) else args.font_bold, label_size)
    row_h = label_size + int(6 * unit) + value_size
    rows_per_anchor: dict[str, int] = {}
    for s in slots:
        rows_per_anchor[s.get("anchor", "top-left")] = rows_per_anchor.get(s.get("anchor", "top-left"), 0) + 1
    band_h = margin_y + max(rows_per_anchor.values()) * (row_h + gap) + int(12 * unit)
    band_h += band_h % 2

    # Mốc đổi trạng thái: key, mẫu trong tween, biên hidden.
    times = {0.0, total}
    for slot in slots:
        for key in keys_by_slot[slot["id"]]:
            t0 = float(key["t"])
            times.add(t0)
            tween = float(key.get("tween_sec") or 0)
            if slot["kind"] == "counter" and tween > 0:
                n = max(1, int(tween / TWEEN_STEP))
                for i in range(1, n + 1):
                    times.add(min(total, t0 + tween * i / n))
    for a, b in hidden:
        times.update([max(0.0, a), min(total, b)])
    marks = sorted(t for t in times if 0 <= t <= total)

    temp_dir = tempfile.mkdtemp(prefix="hud-strip-")
    cache: dict[str, str] = {}

    def render(state_key: tuple, values: list) -> str:
        key = json.dumps(state_key, ensure_ascii=False)
        if key in cache:
            return cache[key]
        img = Image.new("RGBA", (width, band_h), (0, 0, 0, 0))
        if values is not None:
            shadow = Image.new("RGBA", (width, band_h), (0, 0, 0, 0))
            sdraw = ImageDraw.Draw(shadow)
            texts = []
            counters: dict[str, int] = {}
            for slot, value in zip(slots, values):
                anchor = slot.get("anchor", "top-left")
                row = counters.get(anchor, 0)
                counters[anchor] = row + 1
                y = margin_y + row * (row_h + gap)
                label = str(slot.get("label") or "").upper()
                shown = fmt_number(float(value), locale) if slot["kind"] == "counter" else str(value or "").upper()
                if not shown and not label:
                    continue
                for text, font, dy, color in (
                    (label, font_label, 0, hex_rgba("#FFFFFF", 200)),
                    (shown, font_value, label_size + int(6 * unit) if label else 0, hex_rgba(slot.get("color"), 255)),
                ):
                    if not text:
                        continue
                    w = sdraw.textlength(text, font=font)
                    x = margin_x if anchor == "top-left" else (width - margin_x - w if anchor == "top-right" else (width - w) / 2)
                    texts.append((x, y + dy, text, font, color))
                    sdraw.text((x, y + dy + 2), text, font=font, fill=(0, 0, 0, 170))
            shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(2, int(4 * unit))))
            img = Image.alpha_composite(img, shadow)
            draw = ImageDraw.Draw(img)
            for x, y, text, font, color in texts:
                draw.text((x, y), text, font=font, fill=color, stroke_width=max(1, int(1.5 * unit)), stroke_fill=(0, 0, 0, 110))
        out = os.path.join(temp_dir, f"hud_{len(cache)}.png")
        img.save(out, "PNG")
        cache[key] = out
        return out

    lines = []
    for i in range(len(marks) - 1):
        a, b = marks[i], marks[i + 1]
        if b - a < 1e-4:
            continue
        mid = a + 1e-4
        is_hidden = any(h0 <= mid < h1 for h0, h1 in hidden)
        if is_hidden:
            png = render(("hidden",), None)
        else:
            values = []
            for slot in slots:
                value, _ = slot_value(slot, keys_by_slot[slot["id"]], a)
                if slot["kind"] == "counter":
                    value = float(value or 0)
                    value = round(value) if slot_int[slot["id"]] else round(value, 2)
                values.append(value)
            png = render(tuple(str(v) for v in values), values)
        lines.append(f"file '{png}'")
        lines.append(f"duration {b - a:.4f}")
    if not lines:
        print(json.dumps({"success": False, "message": "Không dựng được trạng thái HUD"}))
        return 2
    lines.append(lines[-2])
    list_path = os.path.join(temp_dir, "concat.txt")
    with open(list_path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    out_path = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    result = subprocess.run([
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "error",
        "-f", "concat", "-safe", "0", "-i", list_path,
        "-fps_mode", "cfr", "-r", str(fps), "-c:v", "qtrle", "-pix_fmt", "argb", "-an", out_path,
    ], capture_output=True, text=True)
    if result.returncode != 0 or not os.path.isfile(out_path):
        print(json.dumps({"success": False, "message": "ffmpeg encode HUD thất bại", "log": (result.stderr or "")[-800:]}))
        return 3
    if not args.keep_temp:
        for name in os.listdir(temp_dir):
            os.remove(os.path.join(temp_dir, name))
        os.rmdir(temp_dir)
    print(json.dumps({"success": True, "out": out_path, "band_height": band_h, "states": len(cache), "segments": len(lines) // 2}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
