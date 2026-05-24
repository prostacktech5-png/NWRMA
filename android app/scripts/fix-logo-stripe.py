"""Recolor bottom brown bar on NWRMA dam micro-flag to sky blue (same family as gauge water).

Usage:
  python scripts/fix-logo-stripe.py

Keeps edits inside the tiny flag ROI and avoids the sun/yellow areas.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "image-removebg-preview.png"

# Matches water cyan in artwork (preserve alpha separately)
BLUE = (28, 174, 233)


def should_recolor_bottom_bar(r: int, g: int, b: int, a: int) -> bool:
    """Darkest ochre stripe (bottom horizontal bar): very low blue, warm red-green."""
    if a <= 200:
        return False
    # Do not touch light / white-ish pixels
    if b > 22:
        return False
    if r < 200 or g < 135:
        return False
    if (r - b) <= 160:
        return False
    return True


def main() -> None:
    im = Image.open(SRC).convert("RGBA")
    px = im.load()
    h, w = im.height, im.width
    # Tight ROI around dam flag (from 500x500 PNG analysis)
    x0, x1 = 229, 272
    y0, y1 = 323, 325
    changed = 0
    for y in range(max(0, y0), min(h, y1 + 1)):
        for x in range(max(0, x0), min(w, x1)):
            r, g, b, a = px[x, y]
            if should_recolor_bottom_bar(r, g, b, a):
                px[x, y] = (*BLUE, a)
                changed += 1
    im.save(SRC, "PNG")
    print(f"Saved {SRC} — recolored {changed} pixels (bottom bar -> blue).")


if __name__ == "__main__":
    main()
