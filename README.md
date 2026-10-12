# James Cubitt Interiors — website

A static site for James Cubitt Interiors (JCI), the commercial interior
architecture practice. 45 pages. Dark canvas, oversized white type, one red
accent, photography doing the emotional work.

The site is services-led, following the supplied homepage flow diagram:
HERO / POSITIONING → TRUST / CLIENTS → SERVICES. That diagram was cropped
below the third block, so the blocks after SERVICES are inferred and marked
as such in `docs/information-architecture.md`, which also records what the
previous gensler.com-based structure contained and where each of its URLs
now goes.

The earlier 114-page build is recoverable at the git tag
`gensler-architecture`.

```
python3 scripts/serve.py        # build + serve on http://127.0.0.1:8000
python3 scripts/build.py        # build only, into dist/
```

No dependencies, no package manager, no build toolchain — the generator is
Python standard library only. The output in `dist/` is plain HTML, CSS, JS
and images that any static host will serve.

## Where things live

| Path | What it is |
| --- | --- |
| `content/site.json` | **Every word on the site.** Projects, services, timeline, people, clients. |
| `DESIGN.md` | The Framer design system, installed by `npx getdesign@latest add framer`. Left as shipped. |
| `assets/css/tokens.css` | That system as CSS custom properties: colour, type, spacing, radius, elevation, motion. |
| `assets/css/site.css` | Components, built only from those tokens. |
| `assets/js/site.js` | Progressive enhancement — header state, menu, reveals, work filter. |
| `assets/img/projects/` | Project photography, two widths each (`-card` 900px, full 1800px). |
| `assets/img/clients/` | 20 client marks for the trust band, white-on-transparent. |
| `assets/video/` | The practice film (WebM + MP4) and its poster frame. |
| `templates/base.html` | The page shell: head, header, footer. |
| `scripts/build.py` | Renders `content/site.json` into `dist/`. |
| `scripts/build_assets.py` | Re-derives the images from the source brochure PDFs. |
| `docs/information-architecture.md` | The sitemap, URL patterns and what was deliberately left out. |
| `docs/design-system.md` | How the Cuub Studio system was applied to JCI. |

## Making changes

**Copy, projects, people, clients** — edit `content/site.json` and rebuild.
Nothing else needs touching. A new project needs a `slug`, a `sector`, at
least one entry in `images`, and a matching `imageAlts` entry per image.

**Filling an empty section** — Research & Insights, the Journal, Press
Releases, In The Media and Careers are built, routed and styled, and each
says that its content is not supplied yet. Add an entry to the matching
list in `content/site.json` (`insights`, `blog`, `press`, `media`, `roles`)
and it publishes to its own page, the section index, the homepage feed and
the search index. No code change.

**Look and feel** — edit `assets/css/tokens.css`. Changing `--c-tertiary`
re-accents the whole site; changing `--font-display` re-voices it. Components
never hard-code a value, so the tokens are the only place to change.

The system is the Framer one in `DESIGN.md`, with a single substitution:
the accent is JCI's own `#D42127` in place of Framer's `#0099ff`, and the
gradient spotlight cards are not implemented. `docs/design-system.md` gives
the reasoning and records what is followed to the number.

**Structure** — page composition lives in `scripts/build.py`, one function per
page type (`page_home`, `page_project`, `page_sector`, …).

## The film

`assets/video/jci-film.*` is the practice's 2m15s brand film, supplied as a
15.7 MB 848×478 WhatsApp export and re-encoded for the web:

| | | |
| --- | --- | --- |
| `jci-film.webm` | VP9 / Opus, CRF 41 | 6.3 MB — offered first |
| `jci-film.mp4` | H.264 high / AAC, CRF 28, faststart | 7.1 MB — universal fallback |
| `jci-film-poster.webp` | frame at 108s | 96 KB |

Both encodes measure 35.9 dB PSNR against each other and are visually
indistinguishable from the source. The MP4 alone would cover Safari, iOS,
Edge and every phone; the WebM exists because Chromium builds shipped
without H.264 (common on Linux) cannot play the MP4 at all, and it happens
to be the smaller file.

It sits on the home page as a click-to-play block, not a hero background:
the film carries its own burnt-in titles, which would collide with the hero
headline, and at 848×478 it would be softer full-bleed than the still it
would replace. `preload="none"` means it costs nothing until someone presses
play — which matters for an audience largely on mobile data.

To re-encode after a new master lands:

```
ffmpeg -i master.mp4 -c:v libvpx-vp9 -crf 41 -b:v 0 -row-mt 1 \
  -pix_fmt yuv420p -c:a libopus -b:a 96k assets/video/jci-film.webm
ffmpeg -i master.mp4 -c:v libx264 -profile:v high -crf 28 -preset slow \
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 96k assets/video/jci-film.mp4
```

## Content provenance

Every fact, project, date and paragraph on this site comes from two documents
supplied by the practice:

- `JCI.BROCHURE.COMMERCIAL.pdf` — commercial portfolio, 28 projects with
  dates, locations and scopes; history timeline; services; values; clientele.
- `JCI_HOSPITALITY_PROJECTS_1.pdf` — hospitality portfolio, with written
  narratives for seven projects, the capability statement project table, the
  global footprint and the named contacts.

Nothing has been invented. Where a brochure gave only facts (dates, location,
scope) the project page shows facts; written narrative appears only where the
brochure supplied one.

All 90 photographs were extracted from those two PDFs. `scripts/build_assets.py`
holds the manifest mapping every image file back to its source page, and can
regenerate the whole set:

```
python3 scripts/build_assets.py --pdf-dir /path/to/the/two/pdfs
```

It needs `poppler-utils`, Pillow and NumPy; nothing else in the project does.

### Known limits of the source material

The brochures are the only assets available, and they impose two ceilings
worth knowing about before launch:

1. **Image resolution.** The photographs are embedded in the PDFs at 800px
   wide. They are upscaled to 1800px for full-bleed use, which is soft on a
   large retina display. Replacing `assets/img/projects/` with the original
   photography — same filenames — is the single biggest quality win available
   and needs no code change.
2. **Four content questions** for the practice to confirm — see
   `docs/content-queries.md`.

## Deploying

`dist/` is self-contained; upload it anywhere. The included GitHub Actions
workflow (`.github/workflows/pages.yml`) builds and publishes to GitHub Pages
on every push to the default branch.

For any other host, set the build command to `python3 scripts/build.py` and
the publish directory to `dist`.

`dist/` is not committed — it is generated. Run a build before deploying.

## Browser support

Modern evergreen browsers. The site is readable and fully navigable with
JavaScript disabled; JS only adds the sticky-header state, the mobile menu,
the scroll reveals and the client-side work filter (which also works as plain
`?sector=` URLs on a page load).
