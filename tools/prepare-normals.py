#!/usr/bin/env python3
"""
prepare-normals.py — make a surface-normal export ready for the hero's light.

    /usr/bin/python3 tools/prepare-normals.py \\
        images/depth/hero-snow.normals.jpg assets/depth/hero-snow.normals.jpg \\
        --photo images/hero-snow.jpg

Expects the usual encoding: colour = normal * 0.5 + 0.5, with x pointing right,
y pointing up and z toward the camera (flat, camera-facing surfaces are lavender).

  * aligns the map to the photograph (--photo): the export's border and its
    sub-percent scaling are measured and undone (tools/align.py)
  * softens the normals (--soften, in photo pixels). A reconstructed face is a
    close likeness, not an exact one: its eyelid, lip and jaw creases land a few
    pixels off the real ones, and a moving light turns that into ghost lines.
    Softened, the light keeps the broad form — cheekbones, nose, forehead,
    sleeves — and the photograph supplies every fine line.
  * re-normalises and saves at --width (default 1024; soft normals need no more)

Without --photo it falls back to trimming the border and stretching.
"""
import sys
import argparse
import importlib.util
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
import align  # noqa: E402

_spec = importlib.util.spec_from_file_location("depthtool", Path(__file__).with_name("depth-from-colormap.py"))
_depth = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_depth)


def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=2, keepdims=True), 1e-4)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("src")
    ap.add_argument("dst")
    ap.add_argument("--photo", help="photograph the map belongs to (recommended)")
    ap.add_argument("--region", help="y0,y1,x0,x1 in photo px to align on (default: whole frame)")
    ap.add_argument("--soften", type=float, default=6.0, help="blur radius in photo px (0 = off)")
    ap.add_argument("--width", type=int, default=1024)
    ap.add_argument("--quality", type=int, default=92)
    args = ap.parse_args()

    raw = align.load_rgb(args.src)

    if args.photo:
        photo = align.load_rgb(args.photo)
        H, W = photo.shape[:2]
        region = tuple(int(v) for v in args.region.split(",")) if args.region else align.default_region(W, H)
        sx, sy, tx, ty, score = align.fit_global(align.edges(photo.mean(2)), align.edges(raw), region)
        print(f"  aligned: raw = ({sx:.4f}·x {tx:+.2f}, {sy:.4f}·y {ty:+.2f})   edge match {score:.3f}")
        n = align.warp(raw, *align.global_coords(W, H, sx, sy, tx, ty))
    else:
        H, W = raw.shape[:2]
        t0, t1, l0, l1 = _depth.trim_dark_border(raw)
        n = np.asarray(Image.fromarray((raw[t0:t1, l0:l1] * 255).astype(np.uint8)).resize((W, H), Image.LANCZOS)).astype(np.float32) / 255
        print("  border trim only — pass --photo for exact alignment")

    n = unit(n * 2 - 1)
    if args.soften > 0:
        n = unit(np.stack([ndimage.gaussian_filter(n[..., c], args.soften) for c in range(3)], -1))

    out_h = int(H * args.width / W + 0.5)
    enc = Image.fromarray(((n * 0.5 + 0.5) * 255).round().clip(0, 255).astype(np.uint8)).resize((args.width, out_h), Image.LANCZOS)
    n = unit(np.asarray(enc).astype(np.float32) / 255 * 2 - 1)
    Image.fromarray(((n * 0.5 + 0.5) * 255).round().clip(0, 255).astype(np.uint8)).save(args.dst, quality=args.quality, optimize=True)
    print(f"✓ {args.dst}  {args.width}x{out_h}  (softened {args.soften:g}px)")


if __name__ == "__main__":
    main()
