#!/usr/bin/env python3
"""Regenerate PWA icons from public/icons/icon-512.png."""

from pathlib import Path

from PIL import Image

CREAM = (250, 247, 242)
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'public/icons/icon-512.png'
OUT_DIR = ROOT / 'public/icons'

SIZES = [
    (512, 'icon-512.png'),
    (192, 'icon-192.png'),
    (180, 'apple-touch-icon.png'),
]


def make_icon(size: int, name: str) -> None:
    src_rgba = Image.open(SOURCE).convert('RGBA')
    flattened = Image.new('RGB', src_rgba.size, CREAM)
    flattened.paste(src_rgba, mask=src_rgba.split()[3])

    canvas = Image.new('RGB', (size, size), CREAM)
    inner = int(size * 0.96)
    logo = flattened.resize((inner, inner), Image.Resampling.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(logo, (offset, offset))

    canvas.save(OUT_DIR / name, 'PNG')
    print(f'wrote {name} ({size}x{size})')


def main() -> None:
    for size, name in SIZES:
        make_icon(size, name)


if __name__ == '__main__':
    main()
