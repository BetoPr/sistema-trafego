"""Gera PNGs da PWA (192/512/180) com o hexagono + S verde.
Usa PIL puro pra evitar dep externa de SVG."""

import math
from PIL import Image, ImageDraw, ImageFont
import os

BG = (10, 15, 16)          # #0a0f10
ACCENT = (0, 225, 154)     # #00E19A
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

def hex_points(cx, cy, r):
    """Pontos hexagono ponta-pra-cima."""
    pts = []
    for i in range(6):
        angle = math.radians(-90 + i * 60)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return pts

def gen(size):
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)

    cx, cy = size / 2, size / 2
    r = size * 0.40  # raio hexagono

    # outline hexagono
    pts = hex_points(cx, cy, r)
    stroke = max(3, int(size * 0.025))
    draw.polygon(pts, outline=ACCENT, width=stroke)

    # letra S verde italic bold no centro
    # Tenta fonts comuns. Default pra DejaVuSans-Bold.
    font_size = int(size * 0.55)
    font = None
    for cand in [
        "C:\\Windows\\Fonts\\arialbi.ttf",  # Arial Bold Italic
        "C:\\Windows\\Fonts\\arialbd.ttf",  # Arial Bold
        "C:\\Windows\\Fonts\\seguibli.ttf",  # Segoe UI Bold Italic
        "C:\\Windows\\Fonts\\seguibl.ttf",   # Segoe UI Black
        "DejaVuSans-Bold.ttf",
    ]:
        try:
            font = ImageFont.truetype(cand, font_size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), "S", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = cx - tw / 2 - bbox[0]
    ty = cy - th / 2 - bbox[1] - size * 0.02
    draw.text((tx, ty), "S", fill=ACCENT, font=font)

    # bolhinhas decorativas (canto sup-dir)
    bx1 = cx + r * 0.45
    by1 = cy - r * 0.55
    rb1 = max(2, int(size * 0.025))
    draw.ellipse([bx1 - rb1, by1 - rb1, bx1 + rb1, by1 + rb1], fill=ACCENT)
    bx2 = bx1 + size * 0.05
    by2 = by1 + size * 0.04
    rb2 = max(1, int(size * 0.015))
    draw.ellipse([bx2 - rb2, by2 - rb2, bx2 + rb2, by2 + rb2], fill=ACCENT)

    return img

os.makedirs(OUT, exist_ok=True)
for s in (192, 512, 180):
    img = gen(s)
    p = os.path.join(OUT, f"logo-s-{s}.png")
    img.save(p, "PNG")
    print(f"wrote {p}")
