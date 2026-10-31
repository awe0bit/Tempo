#!/usr/bin/env python3
"""Package TEMPO icon masters into native platform sizes.

The checked-in image masters are the source of truth. --font retains the legacy
glyph renderer for reproducibility; it is not used for the current app icon.
"""

from __future__ import annotations

import argparse
import base64
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


CANVAS = 1024
GLYPH = "T"
INK = "#171816"
PAPER = "#F5F2EA"


def render_master(font_path: Path, background: str, foreground: str) -> Image.Image:
    image = Image.new("RGBA", (CANVAS, CANVAS), background)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(str(font_path), 650)
    bounds = draw.textbbox((0, 0), GLYPH, font=font)
    glyph_width = bounds[2] - bounds[0]
    glyph_height = bounds[3] - bounds[1]
    position = (
        (CANVAS - glyph_width) / 2 - bounds[0],
        (CANVAS - glyph_height) / 2 - bounds[1] - 18,
    )
    draw.text(position, GLYPH, font=font, fill=foreground)
    return image


def save_resized(master: Image.Image, destination: Path, size: int) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    master.resize((size, size), Image.Resampling.LANCZOS).save(destination)


def load_master(path: Path) -> Image.Image:
    with Image.open(path) as source:
        if source.width != source.height or source.width < CANVAS:
            raise ValueError(f"Icon master must be square and at least {CANVAS}px: {path}")
        if source.mode == "RGBA" and source.getextrema()[3] != (255, 255):
            raise ValueError(f"App icon master must be opaque: {path}")
        return source.convert("RGB").resize((CANVAS, CANVAS), Image.Resampling.LANCZOS)


def generate(repo: Path, dark_master: Image.Image, light_master: Image.Image) -> None:
    # Android applies its own mask and motion. Inset the square master to keep
    # the full mark inside the adaptive icon's safe region.
    adaptive_mark = Image.new("RGB", (CANVAS, CANVAS), dark_master.getpixel((0, 0)))
    inset_size = round(CANVAS * .78)
    inset = (CANVAS - inset_size) // 2
    adaptive_mark.paste(dark_master.resize((inset_size, inset_size), Image.Resampling.LANCZOS), (inset, inset))

    branding = repo / "apps/flutter/assets/branding"
    dark_master.convert("RGB").save(branding / "tempo-icon-master-black.png")
    light_master.convert("RGB").save(branding / "tempo-icon-master-white.png")
    dark_master.convert("RGB").save(repo / "apps/android/assets/icon/app_icon.png")
    dark_master.convert("RGB").save(repo / "assets/tempo-icon.png")
    encoded = BytesIO()
    dark_master.save(encoded, format="PNG")
    # Self-contained: SVG loaded as an <img> cannot fetch a sibling PNG.
    data_uri = "data:image/png;base64," + base64.b64encode(encoded.getvalue()).decode("ascii")
    (repo / "assets/tempo-icon.svg").write_text(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">\n'
        '  <title>Tempo icon</title>\n'
        '  <desc>Satin T with a blue rhythm accent. Embedded raster master.</desc>\n'
        f'  <image href="{data_uri}" width="1024" height="1024"/>\n'
        '</svg>\n', encoding="utf-8"
    )

    ios = repo / "apps/flutter/ios/Runner/Assets.xcassets/AppIcon.appiconset"
    # Xcode generates device sizes from universal masters, including iOS 17's
    # default icon. iOS 18+ selects the luminosity variant on the Home Screen.
    save_resized(light_master.convert("RGB"), ios / "Icon-App-1024x1024@1x.png", CANVAS)
    save_resized(dark_master.convert("RGB"), ios / "Icon-App-1024x1024-dark.png", CANVAS)

    macos = repo / "apps/flutter/macos/Runner/Assets.xcassets/AppIcon.appiconset"
    for size in (16, 32, 64, 128, 256, 512, 1024):
        save_resized(dark_master.convert("RGB"), macos / f"app_icon_{size}.png", size)

    android = repo / "apps/android/android/app/src/main/res"
    for density, (legacy_size, adaptive_size) in {
        "mdpi": (48, 108),
        "hdpi": (72, 162),
        "xhdpi": (96, 216),
        "xxhdpi": (144, 324),
        "xxxhdpi": (192, 432),
    }.items():
        destination = android / f"mipmap-{density}"
        save_resized(dark_master.convert("RGB"), destination / "ic_launcher.png", legacy_size)
        save_resized(dark_master.convert("RGB"), destination / "ic_launcher_round.png", legacy_size)
        save_resized(adaptive_mark, destination / "ic_launcher_foreground.png", adaptive_size)

    mark_set = (
        repo
        / "apps/flutter/ios/Runner/Assets.xcassets/TempoLaunchMark.imageset"
    )
    for scale, size in (("1x", 160), ("2x", 320), ("3x", 480)):
        save_resized(dark_master.convert("RGB"), mark_set / f"TempoLaunchMark@{scale}.png", size)
        save_resized(light_master.convert("RGB"), mark_set / f"TempoLaunchMark-Light@{scale}.png", size)

    icon_path = repo / "apps/flutter/windows/runner/resources/app_icon.ico"
    icon_path.parent.mkdir(parents=True, exist_ok=True)
    dark_master.convert("RGBA").save(
        icon_path,
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument(
        "--font",
        type=Path,
        help="Regenerate the legacy serif icon instead of packaging image masters",
    )
    parser.add_argument("--master", type=Path, help="Opaque dark square image master")
    parser.add_argument("--light-master", type=Path, help="Opaque light square image master")
    args = parser.parse_args()
    repo = args.repo.resolve()
    if args.font:
        if not args.font.is_file():
            raise SystemExit(f"Font not found: {args.font}")
        generate(repo, render_master(args.font, INK, PAPER),
                 render_master(args.font, PAPER, INK))
    else:
        generate(repo,
                 load_master(args.master or repo / "assets/branding/tempo-icon-dark-source.png"),
                 load_master(args.light_master or repo / "assets/branding/tempo-icon-light-source.png"))


if __name__ == "__main__":
    main()
