# James Cubitt Interiors — website

A static site for James Cubitt Interiors (JCI), the commercial interior
architecture practice. Dark editorial canvas, oversized white type, one red
accent, photography doing the emotional work.

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
| `assets/css/tokens.css` | The design system: colour, type, spacing, radius, motion. |
| `assets/css/site.css` | Components, built only from those tokens. |
| `assets/js/site.js` | Progressive enhancement — header state, menu, reveals, work filter. |
| `assets/img/projects/` | Project photography, two widths each (`-card` 900px, full 1800px). |
| `templates/base.html` | The page shell: head, header, footer. |
| `scripts/build.py` | Renders `content/site.json` into `dist/`. |
| `scripts/build_assets.py` | Re-derives the images from the source brochure PDFs. |
| `docs/information-architecture.md` | The sitemap, URL patterns and what was deliberately left out. |
| `docs/design-system.md` | How the Cuub Studio system was applied to JCI. |

## Making changes

**Copy, projects, people, clients** — edit `content/site.json` and rebuild.
Nothing else needs touching. A new project needs a `slug`, a `sector`, at
least one entry in `images`, and a matching `imageAlts` entry per image.

**Look and feel** — edit `assets/css/tokens.css`. Changing `--c-tertiary`
re-accents the whole site; changing `--font-display` re-voices it. Components
never hard-code a value, so the tokens are the only place to change.

**Structure** — page composition lives in `scripts/build.py`, one function per
page type (`page_home`, `page_project`, `page_sector`, …).

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
