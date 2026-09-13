#!/usr/bin/env python3
"""
depth-from-colormap.py — turn a colour-coded depth visualisation back into a
greyscale depth map the hero can use (white = near, black = far).

    /usr/bin/python3 tools/depth-from-colormap.py \
        images/depth/hero-snow.depth-colour.jpg assets/depth/hero-snow.png \
        --photo images/hero-snow.jpg

Most depth tools export a colourised preview (matplotlib "Spectral": dark red
near, purple-blue far). This projects every pixel onto that colour ramp to
recover a depth value, then cleans the result for parallax use:

  * aligns the map to the photograph (--photo): the export's border and its
    sub-percent scaling are measured and undone (tools/align.py). Without
    --photo it trims the black border and stretches, accurate to a few pixels.
  * median filter to remove JPEG speckle
  * removes isolated specks (snowflakes, dust) from the depth — a flake marked
    "near" slides further than its own size and smears; as background it just
    moves with the backdrop. Anything attached to a large shape (fingers to a
    hand, a sleeve to an arm) is kept.
  * a max-filter so near objects grow slightly past their silhouette — the
    backdrop then stretches at an edge instead of the actress
  * only a very light blur, so that edge stays sharp

Needs numpy, scipy + Pillow (the macOS system /usr/bin/python3 has all three).
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

SPECK_SIZE = 61           # px at OUT_WIDTH: bright things narrower than this are candidates
SPECK_AREA = 10000        # px²: candidates smaller than this are removed
SPECK_RISE = 0.10         # how much nearer than their surroundings they must be

OUT_WIDTH = 1024          # depth is smooth; it doesn't need full resolution

SPECTRAL = np.array([     # matplotlib Spectral, t=0 (near) … t=1 (far)
    (0.619, 0.004, 0.259), (0.835, 0.243, 0.310), (0.957, 0.427, 0.263),
    (0.992, 0.682, 0.380), (0.996, 0.878, 0.545), (1.000, 1.000, 0.749),
    (0.902, 0.961, 0.596), (0.671, 0.867, 0.643), (0.400, 0.761, 0.647),
    (0.196, 0.533, 0.741), (0.369, 0.310, 0.635)])


def trim_dark_border(rgb, thresh=0.08, look=60):
    """Return (top, bottom, left, right) crop of near-black letterbox bars."""
    rows = rgb.mean(axis=(1, 2)); cols = rgb.mean(axis=(0, 2))
    h, w = len(rows), len(cols)
    top = next(i for i in range(look) if rows[i] > thresh)
    bot = next(i for i in range(look) if rows[h - 1 - i] > thresh)
    lef = next(i for i in range(look) if cols[i] > thresh)
    rig = next(i for i in range(look) if cols[w - 1 - i] > thresh)
    # one extra pixel: the bar edge is anti-aliased into the image
    return top + 1, h - bot - 1, lef + 1, w - rig - 1


def remove_specks(im):
    """Replace small isolated near blobs with the depth of what's behind them."""
    near = np.asarray(im).astype(np.float32) / 255
    # Grey opening erases every bright structure narrower than SPECK_SIZE;
    # whatever rises well above it is a candidate speck.
    behind = ndimage.grey_opening(near, size=(SPECK_SIZE, SPECK_SIZE))
    raised = (near - behind) > SPECK_RISE

    labels, n = ndimage.label(raised)
    if n:
        areas = ndimage.sum(raised, labels, index=np.arange(1, n + 1))
        small = np.isin(labels, np.nonzero(areas < SPECK_AREA)[0] + 1)
        small = ndimage.binary_dilation(small, iterations=3)   # take the soft halo too
        # Fill each hole from its surroundings (normalised convolution): the
        # average depth of the nearby pixels that were NOT removed.
        keep = (~small).astype(np.float32)
        fill = ndimage.gaussian_filter(near * keep, 18) / np.maximum(ndimage.gaussian_filter(keep, 18), 1e-4)
        near = np.where(small, fill, near)
        print(f"  removed {int((areas < SPECK_AREA).sum())} specks, kept {int((areas >= SPECK_AREA).sum())} shapes")
    return Image.fromarray((np.clip(near, 0, 1) * 255).astype(np.uint8))


def main(src, dst, photo=None):
    img = Image.open(src).convert("RGB")
    W, H = img.size
    rgb = np.asarray(img).astype(np.float32) / 255

    if photo:
        sys.path.insert(0, str(Path(__file__).parent))
        import align
        ph = align.load_rgb(photo)
        H, W = ph.shape[:2]
        sx, sy, tx, ty, score = align.fit_global(align.edges(ph.mean(2)), align.edges(rgb), align.default_region(W, H))
        rgb = align.warp(rgb, *align.global_coords(W, H, sx, sy, tx, ty))
        how = f"aligned: raw = ({sx:.4f}·x {tx:+.2f}, {sy:.4f}·y {ty:+.2f}), edge match {score:.3f}"
    else:
        t0, t1, l0, l1 = trim_dark_border(rgb)
        rgb = rgb[t0:t1, l0:l1]
        how = f"trimmed border t{t0} b{H - t1} l{l0} r{W - l1} — pass --photo for exact alignment"

    # Project onto a dense ramp. Done on a downscaled copy for speed — the
    # result gets resized to OUT_WIDTH anyway.
    work_w = OUT_WIDTH
    work_h = round(rgb.shape[0] * work_w / rgb.shape[1])
    small = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8))
                       .resize((work_w, work_h), Image.LANCZOS)).astype(np.float32) / 255

    ts = np.linspace(0, 1, 512)
    xs = np.linspace(0, 1, len(SPECTRAL))
    ramp = np.stack([np.interp(ts, xs, SPECTRAL[:, c]) for c in range(3)], 1)

    flat = small.reshape(-1, 3)
    depth = np.empty(len(flat), np.float32)
    for i in range(0, len(flat), 65536):
        chunk = flat[i:i + 65536]
        d = ((chunk[:, None, :] - ramp[None, :, :]) ** 2).sum(-1)
        depth[i:i + 65536] = ts[d.argmin(1)]
    near = 1.0 - depth.reshape(work_h, work_w)          # white = near

    # Stretch to the full 0..1 range using robust percentiles.
    lo, hi = np.percentile(near, 1), np.percentile(near, 99.5)
    near = np.clip((near - lo) / (hi - lo), 0, 1)

    # Match the photograph's proportions exactly.
    out_h = int(H * OUT_WIDTH / W + 0.5)
    im = Image.fromarray((near * 255).astype(np.uint8)).resize((OUT_WIDTH, out_h), Image.LANCZOS)

    im = remove_specks(im)
    im = im.filter(ImageFilter.MedianFilter(5))
    # Grow near shapes ~4px past their silhouette and keep the edge fairly
    # sharp: when the camera moves, the gap that opens beside her is filled by
    # stretching the pixels just OUTSIDE her outline (dark backdrop), which
    # reads as shadow. A soft edge would stretch her sleeve colour instead.
    im = im.filter(ImageFilter.MaxFilter(9))
    im = im.filter(ImageFilter.GaussianBlur(1.0))

    im.save(dst, optimize=True)
    print(f"✓ {dst}  {im.size[0]}x{im.size[1]}  ({how})")


if __name__ == "__main__":
    args = sys.argv[1:]
    photo = None
    if "--photo" in args:
        i = args.index("--photo")
        photo = args[i + 1]
        del args[i:i + 2]
    if len(args) != 2:
        sys.exit(__doc__)
    main(args[0], args[1], photo)
