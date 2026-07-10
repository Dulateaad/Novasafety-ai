"""Generate PWA + Apple Touch icons from NOVA SAFETY circular logo."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
SRC_LOGO = ROOT / "src" / "assets" / "pwa-icon-source.png"
WHITE = (255, 255, 255)


def load_logo_on_white() -> Image.Image:
    """Логотип на непрозрачном белом фоне (iOS не любит прозрачность)."""
    src = Image.open(SRC_LOGO).convert("RGBA")
    # Чёрные углы исходника → белые
    pixels = src.load()
    w, h = src.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a < 16 or (r < 45 and g < 45 and b < 45):
                pixels[x, y] = (*WHITE, 255)
    return src


def fit_opaque(logo: Image.Image, size: int, padding_ratio: float = 0.02) -> Image.Image:
    canvas = Image.new("RGB", (size, size), WHITE)
    inner = int(size * (1 - padding_ratio * 2))
    lw, lh = logo.size
    scale = min(inner / lw, inner / lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    resized = logo.resize((nw, nh), Image.Resampling.LANCZOS)
    # paste с alpha на RGB-холст
    layer = Image.new("RGBA", (size, size), (*WHITE, 255))
    x = (size - nw) // 2
    y = (size - nh) // 2
    layer.paste(resized, (x, y), resized)
    return Image.alpha_composite(
        Image.new("RGBA", (size, size), (*WHITE, 255)),
        layer,
    ).convert("RGB")


def main() -> int:
    if not SRC_LOGO.is_file():
        print(f"Missing source logo: {SRC_LOGO}")
        return 1

    logo = load_logo_on_white()
    PUBLIC.mkdir(parents=True, exist_ok=True)

    outputs = [
        ("nova-icon-192.png", 192, 0.02),
        ("nova-icon-512.png", 512, 0.02),
        ("nova-icon-maskable-512.png", 512, 0.14),
        ("apple-touch-icon.png", 180, 0.04),
        # старые имена — тоже обновляем, чтобы не осталась тёмная версия
        ("pwa-192.png", 192, 0.02),
        ("pwa-512.png", 512, 0.02),
        ("pwa-512-maskable.png", 512, 0.14),
    ]

    for name, size, pad in outputs:
        out = PUBLIC / name
        fit_opaque(logo, size, pad).save(out, format="PNG", optimize=True)
        print(f"Wrote {out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
