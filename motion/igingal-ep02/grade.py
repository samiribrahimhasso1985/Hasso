"""Unified colour grade for IGINGAL episode 2 source images.

Every image is brought to the same exposure, partly desaturated and then pushed through
the series' gradient map (deep brown-black → amber → pale gold), so AI renders, museum
photos and black-and-white archive shots read as one film.

Usage: python3 grade.py            -> graded/NN.jpg  (same aspect, 2x size for camera moves)
       python3 grade.py --preview  -> also preview/NN.jpg 16:9 frames + preview/sheet.jpg
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageDraw, ImageFont

HERE = Path(__file__).parent
SRC, OUT, PREV = HERE / 'source', HERE / 'graded', HERE / 'preview'
W, H = 1920, 1080

# shot list: (source, layout, focus 0..1 = vertical centre of the 16:9 crop for "cover")
SHOTS = [
    ('03', 'cover', .40), ('14', 'cover', .45), ('02', 'side-r', 0), ('13', 'cover', .55),
    ('09', 'cover', .50), ('15', 'center', 0), ('18', 'cover', .45), ('16', 'cover', .62),
    ('01', 'side-l', 0), ('06', 'side-r', 0), ('11', 'cover', .30), ('17', 'side-l', 0),
    ('07', 'center', 0), ('05', 'cover', .40), ('04', 'side-r', 0), ('10', 'cover', .50),
    ('12', 'center', 0), ('08', 'center', 0),
]

# gradient map stops (luminance -> colour), the series palette
STOPS = np.array([0, .18, .45, .75, 1.0])
COLS = np.array([[8, 6, 5], [52, 30, 16], [150, 92, 42], [226, 172, 100], [250, 232, 196]]) / 255.0


def grade(img: Image.Image) -> Image.Image:
    a = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    lum = a @ np.array([.2126, .7152, .0722], dtype=np.float32)
    # normalise exposure: map the 2nd..98th percentile to a fixed range
    lo, hi = np.percentile(lum, 2), np.percentile(lum, 98)
    a = np.clip((a - lo) / max(hi - lo, 1e-3), 0, 1)
    lum = a @ np.array([.2126, .7152, .0722], dtype=np.float32)
    a = np.clip(lum[..., None] + (a - lum[..., None]) * .55, 0, 1)             # desaturate
    gm = np.stack([np.interp(lum, STOPS, COLS[:, c]) for c in range(3)], -1)   # gradient map
    out = a * .38 + gm * .62
    out = np.clip(out, 0, 1)
    out = out * out * (3 - 2 * out) * .35 + out * .65                         # gentle S-curve
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))


def upscale(img: Image.Image, factor=2) -> Image.Image:
    big = img.resize((img.width * factor, img.height * factor), Image.LANCZOS)
    return big.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))


def vignette(frame: Image.Image) -> Image.Image:
    y, x = np.ogrid[:H, :W]
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    v = np.clip(1 - (d - .55) * .55, .55, 1)[..., None]
    return Image.fromarray((np.asarray(frame).astype(np.float32) * v).astype(np.uint8))


def frame_for(img: Image.Image, layout: str, focus: float) -> Image.Image:
    """The 16:9 composition each layout produces (middle of its camera move)."""
    if layout == 'cover':
        s = W / img.width
        h = int(img.height * s)
        big = img.resize((W, h), Image.LANCZOS)
        top = int(np.clip(focus * h - H / 2, 0, h - H))
        return vignette(big.crop((0, top, W, top + H)))
    # blurred, darkened copy fills the frame; the full image sits on top at full height
    s = W / img.width
    bgi = img.resize((W, int(img.height * s)), Image.LANCZOS)
    t = (bgi.height - H) // 2
    bgi = bgi.crop((0, max(t, 0), W, max(t, 0) + H)).filter(ImageFilter.GaussianBlur(40))
    bgi = Image.fromarray((np.asarray(bgi).astype(np.float32) * .35).astype(np.uint8))
    s = H / img.height
    fg = img.resize((int(img.width * s), H), Image.LANCZOS)
    x = {'center': (W - fg.width) // 2, 'side-r': W - fg.width - 120, 'side-l': 120}[layout]
    # feather the foreground edges into the background
    m = Image.new('L', fg.size, 0)
    ImageDraw.Draw(m).rectangle((26, 0, fg.width - 26, fg.height), fill=255)
    bgi.paste(fg, (x, 0), m.filter(ImageFilter.GaussianBlur(22)))
    return vignette(bgi)


def main():
    OUT.mkdir(exist_ok=True)
    preview = '--preview' in sys.argv
    if preview:
        PREV.mkdir(exist_ok=True)
    thumbs = []
    for i, (src, layout, focus) in enumerate(SHOTS, 1):
        g = grade(Image.open(SRC / f'{src}.jpg'))
        upscale(g).save(OUT / f'{src}.jpg', quality=93)
        if preview:
            f = frame_for(g, layout, focus)
            f.save(PREV / f'shot{i:02d}_{src}.jpg', quality=90)
            t = f.resize((480, 270), Image.LANCZOS)
            ImageDraw.Draw(t).text((10, 8), f'{i}', fill=(240, 200, 120))
            thumbs.append(t)
    if preview:
        cols = 6
        rows = (len(thumbs) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * 480 + (cols + 1) * 8, rows * 270 + (rows + 1) * 8), (10, 8, 6))
        for k, t in enumerate(thumbs):
            sheet.paste(t, (8 + (k % cols) * 488, 8 + (k // cols) * 278))
        sheet.save(PREV / 'sheet.jpg', quality=90)
        # before / after strip
        ba = Image.new('RGB', (6 * 240, 2 * 360), (0, 0, 0))
        for k, s in enumerate(['03', '15', '07', '12', '18', '06']):
            o = Image.open(SRC / f'{s}.jpg').convert('RGB')
            for r, im in enumerate([o, grade(o)]):
                im = im.resize((240, int(im.height * 240 / im.width)))
                ba.paste(im.crop((0, 0, 240, 360)), (k * 240, r * 360))
        ba.save(PREV / 'before_after.jpg', quality=90)


if __name__ == '__main__':
    main()
