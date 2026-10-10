# Information architecture — jamescubittinteriors.com

As built. Paths are relative to the site root.

The structure is adapted from the as-built audit of **gensler.com** supplied
as the roadmap for this project, scaled from a 58-office global practice to a
single West African studio, and with the six problems that audit identified
deliberately designed out. Those fixes are listed at the end.

---

## Primary navigation — 5 items

```
Home                                          /
├── Work                                      /work/
│   └── Project                               /work/{slug}/            28 pages
├── Expertise                                 /expertise/
│   └── Sector                                /expertise/{sector}/      4 pages
├── Services                                  /services/
├── Studio                                    /studio/
└── Contact                                   /contact/
```

Plus `404.html`, `sitemap.xml`, `robots.txt`. **39 pages in total.**

Gensler runs eight primary items with mega-menus. JCI has roughly one
twentieth of the content, so eight would be mostly empty rooms. Five items fit
a single row at every breakpoint and need no mega-menu, which is why there
isn't one.

---

## Content types & URL patterns

| Template | URL pattern | Example | Indexed by |
| --- | --- | --- | --- |
| Home | `/` | `/` | — |
| Work index | `/work/` | `/work/` | nav, footer, sitemap |
| Work index, filtered | `/work/?sector={sector}` | `/work/?sector=hospitality` | sector pages |
| Project | `/work/{slug}/` | `/work/afreximbank-hq/` | work index, sector pages, project pager |
| Expertise index | `/expertise/` | `/expertise/` | nav, footer |
| Sector | `/expertise/{sector}/` | `/expertise/workplace/` | expertise index, home, sibling sectors |
| Services | `/services/` | `/services/` | nav, footer |
| Studio | `/studio/` | `/studio/` | nav, footer, home |
| Contact | `/contact/` | `/contact/` | nav, footer, every CTA |
| Capability statement | `/work/#index` | `/work/#index` | home clientele block |

Slugs are stable, lowercase, hyphenated, and derived from the project name —
never from a date or a client code, so they survive a re-shoot or a rename of
the sector.

---

## Page composition

### Home — top to bottom

| | Block | Notes |
| --- | --- | --- |
| 01 | Hero | Full-bleed photograph, oversized headline, two CTAs, image credit |
| 02 | Stats | 1947 · 60+ years · 50+ interiors · 5 countries |
| 03 | Mission | "Our environment is changing how we live." + two paragraphs |
| 04 | Selected work | 6 featured projects, 3-up |
| 05 | Quote band | Full-bleed photograph with the wellness quote |
| 06 | Sectors | 4 sector cards linking to `/expertise/{sector}/` |
| 07 | Clientele | Statement + 36-client grid, link to the full project list |
| 08 | CTA | "Tell us what the space has to do." |

Gensler's homepage carries ten blocks including a video carousel, a ~25-card
mixed feed and a newsletter sign-up. JCI has no editorial operation to feed a
carousel or a newsletter, so neither is here: an empty feed reads worse than
no feed. See *Deliberately not built* below.

### Project — `/work/{slug}/`

Short photographic hero → factsheet strip (client, sector, location, year,
duration, services) → narrative → gallery → previous/next pager → CTA.

The factsheet is a `<dl>` and only renders the facts a given project actually
has, so a project with no recorded duration does not show an empty field.

### Sector — `/expertise/{sector}/`

Photographic hero → "How we approach it" → every project tagged to that sector
→ links to the other three sectors.

A project can belong to more than one sector (`alsoIn` in the content file).
Afreximbank HQ is both workplace and hospitality, and appears under both.

---

## Global chrome

**Header** — logo, 5-item nav, mobile menu button. Fixed, transparent over the
hero with a gradient scrim, solid black once scrolled past 24px. No search: at
39 pages, search would be slower than the nav.

**Footer** — the practice promise, an Explore column mirroring the nav, a
contact column (email, phone, cities), copyright and the tagline.

**Every page** ends with the same CTA band except `/contact/`, which is the
destination.

---

## Deliberately not built

Three sections from the Gensler model are in the architecture but not in this
build, because JCI does not yet have the content to fill them honestly:

| Section | Gensler equivalent | Why not now | What it would need |
| --- | --- | --- | --- |
| Insights / Journal | Research & Insights, `dialogue` blog, Design Forecast | Writing it would mean inventing editorial the practice has not published | 6–8 real articles, then `/insights/` and `/insights/{slug}/` |
| Offices | `/offices/{city}/` × 58 | JCI operates from one studio; the group network is a list on `/studio/`, which is what it is | A second staffed studio |
| Careers | `/careers/` with 6 sub-pages | No live roles supplied | Open roles and a hiring process to describe |

Each slots into the existing nav without restructuring: Insights between Work
and Expertise, Careers in the footer first and the nav later.

---

## How the gensler.com audit findings were handled

The roadmap document listed six observations "for a rebuild or audit". All six
are addressed:

1. **"Hierarchy is shallow and wide; campaign and topic pages are flat at the
   root, so the URL doesn't show where a page belongs."**
   Every page here sits under the section it belongs to. There are no
   root-level campaign pages, and no page is more than two levels deep.

2. **"Research has two entry points, plus `/latest-research-insights` and
   `/gri/all`. Consolidating them would reduce overlap."**
   Each content type has exactly one canonical index. Work is only at
   `/work/`; expertise only at `/expertise/`. No aliases, no duplicates.

3. **"Expertise has no index page; the 34 practices are reachable only from
   the menu."**
   `/expertise/` is a real, linked, indexable page listing all four sectors.

4. **"Project and people filters use hash fragments (`#topics`, `#offices`),
   which search engines don't index as separate pages."**
   The work filter uses a real query string, `/work/?sector=hospitality`.
   Sector pages at `/expertise/{sector}/` are separately indexable documents
   carrying the same project sets with their own copy, titles and
   descriptions. The in-page filter is an enhancement over that, not the only
   route to it.

5. **"Offices are the largest templated section (58 × 5 pages); each office
   tab reuses global content filtered by location."**
   Not replicated. Locations are a list on `/studio/`, not 290 thin pages.

6. **"Legacy Design Forecast pages from 2015–2016 remain live at the root."**
   There is no legacy to carry. The rule going forward: a page that is no
   longer true is removed or redirected, not left at the root.
