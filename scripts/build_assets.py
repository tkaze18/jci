#!/usr/bin/env python3
"""
Derive the site's image assets from the two James Cubitt Interiors brochures.

The brochures are the only source of project photography we have, so this
script is the provenance record: every file in assets/img/projects/ can be
traced back to a page of a PDF through the MANIFEST below.

Two extraction routes are needed:

  * JCI_HOSPITALITY_PROJECTS_1.pdf embeds plain sRGB images, so they are
    pulled straight out with `pdfimages`.
  * JCI.BROCHURE.COMMERCIAL.pdf embeds images in a colour space poppler
    cannot convert on its own (they come out near-black). Those pages are
    rendered instead, then the photo regions are cropped out by detecting
    the white page margins.

Run:  python3 scripts/build_assets.py --pdf-dir <dir-holding-the-two-pdfs>

Requires: poppler-utils (pdfimages, pdftoppm) and Pillow. Nothing else.
Re-running is safe; existing outputs are overwritten.
"""

from __future__ import annotations

import argparse
import glob
import os
import shutil
import subprocess
import sys
import tempfile

try:
    from PIL import Image, ImageEnhance
except ImportError:  # pragma: no cover
    sys.exit("Pillow is required:  pip install Pillow")

import numpy as np

HOSPITALITY_PDF = "JCI_HOSPITALITY_PROJECTS_1.pdf"
COMMERCIAL_PDF = "JCI.BROCHURE.COMMERCIAL.pdf"

OUT_DIR = os.path.join("assets", "img", "projects")
BRAND_DIR = os.path.join("assets", "img", "brand")

# Widths written for every image: the wide one backs full-bleed and detail
# views, the card one backs grid thumbnails.
WIDE_W = 1800
CARD_W = 900

# ---------------------------------------------------------------------------
# Manifest: output slug -> source reference
#
#   ("h", "<image-id>")  image <image-id> extracted from the hospitality PDF
#   ("c", "<page>_<n>")  crop <n> of page <page> of the commercial PDF
# ---------------------------------------------------------------------------
MANIFEST: dict[str, tuple[str, str]] = {
    # --- Hospitality brochure -------------------------------------------
    "diageo-spirit-01":      ("h", "015-134"),
    "diageo-spirit-02":      ("h", "016-135"),
    "diageo-spirit-03":      ("h", "017-136"),
    "hotel-takum-01":        ("h", "018-137"),
    "hotel-takum-02":        ("h", "019-139"),
    "hotel-takum-03":        ("h", "020-140"),
    "hotel-takum-04":        ("h", "020-142"),
    "hotel-takum-05":        ("h", "020-143"),
    "afreximbank-hq-01":     ("h", "021-144"),
    "afreximbank-hq-02":     ("h", "024-150"),
    "afreximbank-hq-03":     ("h", "024-149"),
    "afreximbank-hq-04":     ("h", "023-148"),
    "afreximbank-hq-05":     ("h", "022-146"),
    "iff-01":                ("h", "025-152"),
    "iff-02":                ("h", "026-153"),
    "gabfol-airport-01":     ("h", "028-155"),
    "gabfol-airport-02":     ("h", "027-154"),
    "gabfol-airport-03":     ("h", "029-157"),
    "gabfol-airport-04":     ("h", "029-156"),
    "metropolitan-club-01":  ("h", "030-158"),
    "metropolitan-club-02":  ("h", "031-159"),
    "metropolitan-club-03":  ("h", "032-160"),
    "park-inn-01":           ("h", "033-161"),
    "park-inn-02":           ("h", "034-166"),
    "park-inn-03":           ("h", "034-164"),

    # --- Commercial brochure ---------------------------------------------
    "clickatell-01":         ("c", "10_0"),
    "clickatell-02":         ("c", "11_0"),
    "clickatell-03":         ("c", "10_1"),
    "iff-office-01":         ("c", "12_1"),
    "iff-office-02":         ("c", "13_0"),
    "access-bank-hq-01":     ("c", "14_0"),
    "access-bank-hq-02":     ("c", "15_0"),
    "access-bank-hq-03":     ("c", "15_1"),
    "sterling-bank-01":      ("c", "16_0"),
    "sterling-bank-02":      ("c", "16_1"),
    "sterling-bank-03":      ("c", "17_0"),
    "paramount-01":          ("c", "19_0"),
    "paramount-02":          ("c", "18_0"),
    "paramount-03":          ("c", "18_1"),
    "ifc-01":                ("c", "21_0"),
    "ifc-02":                ("c", "20_0"),
    "ifc-03":                ("c", "20_1"),
    "reckitt-benckiser-01":  ("c", "22_0"),
    "reckitt-benckiser-02":  ("c", "24_1"),
    "reckitt-benckiser-03":  ("c", "24_0"),
    "stanbic-ibtc-01":       ("c", "25_0"),
    "stanbic-ibtc-02":       ("c", "25_2"),
    "stanbic-ibtc-03":       ("c", "26_0"),
    "nlng-campus-01":        ("c", "28_2"),
    "nlng-campus-02":        ("c", "27_1"),
    "nlng-campus-03":        ("c", "28_0"),
    "nlng-campus-04":        ("c", "27_0"),
    "airtel-store-01":       ("c", "30_0"),
    "airtel-store-02":       ("c", "29_0"),
    "airtel-store-03":       ("c", "29_1"),
    "mtn-accra-hq-01":       ("c", "31_0"),
    "mtn-accra-hq-02":       ("c", "32_0"),
    "mtn-accra-hq-03":       ("c", "32_1"),
    "mtn-accra-hq-04":       ("c", "34_0"),
    "mtn-graphic-road-01":   ("c", "33_0"),
    "mtn-graphic-road-02":   ("c", "33_1"),
    "mtn-graphic-road-03":   ("c", "35_1"),
    "mtn-cote-divoire-01":   ("c", "36_0"),
    "project-gold-01":       ("c", "37_1"),
    "project-gold-02":       ("c", "38_0"),
    "project-gold-03":       ("c", "37_0"),
    "sony-music-01":         ("c", "39_0"),
    "sony-music-02":         ("c", "39_1"),
    "sony-music-03":         ("c", "40_0"),
    "afd-01":                ("c", "41_1"),
    "afd-02":                ("c", "42_0"),
    "afd-03":                ("c", "41_0"),
    "continental-re-01":     ("c", "43_0"),
    "continental-re-02":     ("c", "44_1"),
    "continental-re-03":     ("c", "43_1"),
    "nmrc-01":               ("c", "46_0"),
    "nmrc-02":               ("c", "46_1"),
    "nmrc-03":               ("c", "45_0"),
    "alp-01":                ("c", "47_0"),
    "alp-02":                ("c", "47_1"),
    "alp-03":                ("c", "48_0"),
    "guinness-hq-01":        ("c", "49_0"),
    "guinness-hq-02":        ("c", "50_0"),
    "guinness-hq-03":        ("c", "50_1"),
    "promasidor-01":         ("c", "51_1"),
    "promasidor-02":         ("c", "52_0"),
    "promasidor-03":         ("c", "51_0"),
    "aatc-onomo-01":         ("c", "54_0"),
    "aatc-onomo-02":         ("c", "53_0"),
    "aatc-onomo-03":         ("c", "53_1"),
}

# The logo mark, lifted from the back page of the hospitality brochure.
BRAND = {"logo-mark": ("h", "035-167")}

# Favicon sizes written from the trimmed logo mark.
FAVICONS = (16, 32, 180, 512)

# Pages of the commercial brochure that hold project photography.
COMMERCIAL_PAGES = range(9, 55)


def run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def runs_of(mask: np.ndarray, min_len: int) -> list[tuple[int, int]]:
    """Contiguous True runs in a 1-D boolean mask, at least min_len long."""
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            if i - start >= min_len:
                out.append((start, i))
            start = None
    if start is not None and len(mask) - start >= min_len:
        out.append((start, len(mask)))
    return out


def crop_page(pdf: str, page: int, work: str) -> list[Image.Image]:
    """Render one brochure page and cut out its photo regions.

    The brochure lays photos out as full-bleed blocks separated by white
    margins, so the regions fall out of a projection of "not near-white"
    pixels onto each axis. Flat blocks (the red corner tabs, solid panels)
    are rejected by their low colour variance.
    """
    prefix = os.path.join(work, "page")
    run(["pdftoppm", "-f", str(page), "-l", str(page), "-r", "150", "-png", pdf, prefix])
    rendered = glob.glob(prefix + "-*.png")
    if not rendered:
        return []
    img = Image.open(rendered[0]).convert("RGB")
    arr = np.asarray(img).astype(np.int16)
    height, width, _ = arr.shape
    content = arr.min(axis=2) < 235

    tiles = []
    for x0, x1 in runs_of(content.mean(axis=0) > 0.45, int(width * 0.14)):
        column = content[:, x0:x1]
        for y0, y1 in runs_of(column.mean(axis=1) > 0.5, int(height * 0.30)):
            tile = img.crop((x0, y0, x1, y1))
            sample = np.asarray(tile.resize((60, 60))).astype(np.int16)
            if sample.reshape(-1, 3).std(axis=0).mean() < 18:
                continue  # a flat colour panel, not a photograph
            tiles.append(tile)
    os.remove(rendered[0])
    return tiles


def write_variants(img: Image.Image, slug: str, out_dir: str) -> None:
    """Write the wide and card variants of one image as WebP."""
    img = img.convert("RGB")
    for width, suffix in ((WIDE_W, ""), (CARD_W, "-card")):
        copy = img.copy()
        if copy.width > width:
            copy = copy.resize(
                (width, round(copy.height * width / copy.width)), Image.LANCZOS
            )
        # The brochure scans are a touch flat; a light lift keeps them from
        # going muddy against the black canvas.
        copy = ImageEnhance.Sharpness(copy).enhance(1.25)
        copy = ImageEnhance.Contrast(copy).enhance(1.04)
        copy.save(os.path.join(out_dir, f"{slug}{suffix}.webp"), "WEBP",
                  quality=80, method=6)


def write_favicons(mark: Image.Image) -> None:
    """Crop the logo mark to its red field and write PNG favicons.

    The mark comes out of the PDF with a thin white margin; browsers render a
    favicon at 16px, where that margin eats a fifth of the icon, so it goes.
    """
    arr = np.asarray(mark.convert("RGB")).astype(int)
    red = (abs(arr[:, :, 0] - 212) < 60) & (arr[:, :, 1] < 110) & (arr[:, :, 2] < 110)
    ys, xs = np.where(red)
    square = mark.convert("RGB").crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    for size in FAVICONS:
        square.resize((size, size), Image.LANCZOS).save(
            os.path.join(BRAND_DIR, f"favicon-{size}.png"), "PNG", optimize=True
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pdf-dir", required=True,
        help="directory holding the two JCI brochure PDFs",
    )
    args = parser.parse_args()

    hospitality = os.path.join(args.pdf_dir, HOSPITALITY_PDF)
    commercial = os.path.join(args.pdf_dir, COMMERCIAL_PDF)
    for path in (hospitality, commercial):
        if not os.path.exists(path):
            # Allow the uploaded files' hash-prefixed names too.
            matches = glob.glob(os.path.join(args.pdf_dir, "*" + os.path.basename(path)))
            if not matches:
                return print(f"missing: {path}") or 1

    def resolve(path: str) -> str:
        if os.path.exists(path):
            return path
        return glob.glob(os.path.join(args.pdf_dir, "*" + os.path.basename(path)))[0]

    hospitality, commercial = resolve(hospitality), resolve(commercial)
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(BRAND_DIR, exist_ok=True)

    with tempfile.TemporaryDirectory() as work:
        # --- hospitality: straight extraction ---------------------------
        hosp_dir = os.path.join(work, "hosp")
        os.makedirs(hosp_dir)
        run(["pdfimages", "-j", "-p", hospitality, os.path.join(hosp_dir, "h")])
        hosp = {
            os.path.basename(f)[2:].rsplit(".", 1)[0]: f
            for f in glob.glob(os.path.join(hosp_dir, "h-*"))
        }

        # --- commercial: render, then crop --------------------------------
        comm: dict[str, Image.Image] = {}
        for page in COMMERCIAL_PAGES:
            for index, tile in enumerate(crop_page(commercial, page, work)):
                comm[f"{page}_{index}"] = tile

        written = 0
        for slug, (source, ref) in {**MANIFEST, **BRAND}.items():
            target = BRAND_DIR if slug in BRAND else OUT_DIR
            if source == "h":
                path = hosp.get(ref)
                if not path:
                    print(f"  ! no hospitality image {ref} for {slug}")
                    continue
                image = Image.open(path)
            else:
                image = comm.get(ref)
                if image is None:
                    print(f"  ! no commercial crop {ref} for {slug}")
                    continue
            write_variants(image, slug, target)
            if slug == "logo-mark":
                write_favicons(image)
                written += len(FAVICONS)
            written += 1

    print(f"wrote {written} images "
          f"({len(MANIFEST)} project, {len(BRAND)} brand) "
          f"to {OUT_DIR} and {BRAND_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
