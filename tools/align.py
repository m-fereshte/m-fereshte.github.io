"""
align.py — register a depth or normal export onto the photograph it came from.

Export tools rarely hand back a map that lines up pixel-for-pixel: they pad it
with a border and scale the picture by a fraction of a percent. This finds that
scale and shift per axis by matching edges — the one thing a photo and a
depth/normal map share — brute-forcing the scale and cross-correlating for the
shift.

It deliberately stops at scale + shift. Finer, local offsets can't be measured
reliably: the photo's small edges are makeup, lips and painted tear lines,
while a normal map's are the 3D model's creases, so matching them chases the
wrong lines. Fine facial detail is handled instead by softening the normals
(tools/prepare-normals.py).

Used by tools/prepare-normals.py and tools/depth-from-colormap.py. Needs numpy,
scipy and Pillow (macOS /usr/bin/python3 has all three).
"""
import numpy as np
from PIL import Image
from scipy import ndimage


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32) / 255


def edges(a, sigma=1.2):
    chans = [a[..., c] for c in range(a.shape[2])] if a.ndim == 3 else [a]
    e = sum(np.hypot(ndimage.sobel(ch, 0), ndimage.sobel(ch, 1)) for ch in chans)
    return ndimage.gaussian_filter(e, sigma)


def _peak(c):
    """Integer argmax of a wrapped correlation surface, refined to sub-pixel."""
    h, w = c.shape
    py, px = np.unravel_index(np.argmax(c), c.shape)

    def sub(cm, c0, cp):
        d = cm - 2 * c0 + cp
        return 0.0 if abs(d) < 1e-12 else float(np.clip(0.5 * (cm - cp) / d, -0.5, 0.5))

    dy = py + sub(c[(py - 1) % h, px], c[py, px], c[(py + 1) % h, px])
    dx = px + sub(c[py, (px - 1) % w], c[py, px], c[py, (px + 1) % w])
    return (dy - h if dy > h / 2 else dy), (dx - w if dx > w / 2 else dx)


def _xcorr_shift(a, b):
    """Shift d such that b(p + d) ≈ a(p), with a normalised score."""
    a = a - a.mean(); b = b - b.mean()
    c = np.fft.ifft2(np.fft.fft2(b) * np.conj(np.fft.fft2(a))).real
    dy, dx = _peak(c)
    return dy, dx, c.max() / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9)


def fit_global(photo_edges, raw_edges, region):
    """raw = s·photo + t, per axis. Returns (sx, sy, tx, ty, score)."""
    y0, y1, x0, x1 = region
    a = photo_edges[y0:y1, x0:x1]
    yy, xx = np.mgrid[y0:y1, x0:x1].astype(np.float32)

    def search(scales):
        best = None
        for sy in scales:
            for sx in scales:
                b = ndimage.map_coordinates(raw_edges, [yy * sy, xx * sx], order=1, mode="constant")
                dy, dx, score = _xcorr_shift(a, b)
                cand = (score, sx, sy, dx * sx, dy * sy)
                if best is None or cand[0] > best[0]:
                    best = cand
        return best

    score, sx, sy, tx, ty = search(np.round(np.arange(0.985, 1.0151, 0.0025), 4))
    lo, hi = min(sx, sy) - 0.002, max(sx, sy) + 0.0021
    score, sx, sy, tx, ty = search(np.round(np.arange(lo, hi, 0.0005), 4))
    return sx, sy, tx, ty, score


def warp(img, field_y, field_x):
    """Sample img (H×W or H×W×C) at (field_y, field_x) — both H×W arrays of source coords."""
    if img.ndim == 2:
        return ndimage.map_coordinates(img, [field_y, field_x], order=1, mode="nearest")
    return np.stack([ndimage.map_coordinates(img[..., c], [field_y, field_x], order=1, mode="nearest")
                     for c in range(img.shape[2])], -1)


def global_coords(W, H, sx, sy, tx, ty):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    return sy * yy + ty, sx * xx + tx


def default_region(W, H, margin=0.03):
    """Whole frame minus a small margin (y0, y1, x0, x1)."""
    my, mx = int(H * margin), int(W * margin)
    return (my, H - my, mx, W - mx)
