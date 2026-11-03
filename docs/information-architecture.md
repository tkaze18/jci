# Information architecture — jamescubittinteriors.com

Services-led, following the supplied homepage flow diagram. **45 pages.**
Paths are relative to the site root.

> **The diagram was cropped.** It showed three blocks — HERO / POSITIONING,
> TRUST / CLIENTS, SERVICES — and ended at the bottom edge of the third with
> no arrow after it. Everything after SERVICES is inferred and marked as such
> below, so it is cheap to correct when the rest arrives.

---

## Primary navigation — 5 items

```
Home                                  /
├── Services                          /services/
│   ├── Strategy                      /services/strategy/
│   ├── Design                        /services/design/
│   └── Construction                  /services/construction/
├── Sectors                           /sectors/
│   └── Sector × 6                    /sectors/{sector}/
├── Work                              /work/
│   └── Project × 28                  /work/{slug}/
├── About                             /about/
└── Contact                           /contact/
```

Plus `/privacy/`, `404.html`, `sitemap.xml`, `robots.txt`,
`search-index.json`. A "Start a project" pill sits in the header on every
page, which is what a services-led site does instead of burying the CTA.

### Services: three stages, eight services

The diagram names **Strategy | Design | Construction**. JCI's brochure names
eight services. They map cleanly, so the three pillars are the pages and the
eight are their contents — no service is invented and none is dropped:

| Stage | JCI services it contains |
| --- | --- |
| Strategy | Workplace Strategy · Wellness Assessment & Correction · Design Intelligence |
| Design | Design · Experiential Projects · Lighting Design |
| Construction | Design Management · FFE (sourcing, procurement, installation) |

Each pillar page lists its services in full and then shows the projects whose
recorded scope in the brochure touches that stage.

---

## Homepage composition

| | Block | Source | Built as |
| --- | --- | --- | --- |
| 01 | **HERO / POSITIONING** | diagram | Full-bleed photograph, what JCI does in one line, three proof points, two CTAs |
| 02 | **TRUST / CLIENTS** | diagram | Twenty client marks, lifted from the clientele page of the practice's own commercial brochure |
| 03 | **SERVICES** | diagram | Strategy · Design · Construction, three cards |
| 04 | Work / proof | **inferred** | Six featured projects |
| 05 | Process | **inferred** | Assess → Design → Specify → Deliver |
| 06 | The practice + film | **inferred** | Mission, link to /about/, the 2m15 practice film |
| 07 | CTA | **inferred** | Start a project |

Blocks 04–07 are a conventional continuation of a services-led narrative —
proof that the services were delivered, how a project runs, who the practice
is, and the ask. They are all drawn from existing content; nothing was
written to fill them. Replace or reorder them the moment the rest of the
diagram arrives.

### The client logos

Block 02 asks for logos, not names. The twenty marks are extracted from page
8 of `JCI.BROCHURE.COMMERCIAL.pdf` and rendered white-on-transparent so they
sit on the near-black canvas. Each is cropped to its own ink, so the wall
reads at consistent weight despite wildly different source aspect ratios.

Two needed extra work: MTN and Nigeria LNG are printed on a filled panel in
the brochure, which came through as a grey box. The panel is detected by its
dominant alpha value and knocked out. `scripts/build_assets.py` does not
cover these — they were extracted separately and are committed as built.

---

## What was removed, and why

The previous build followed the gensler.com as-built audit: 114 pages across
eight primary sections. A services-led site does not carry most of it. These
are gone, and are recoverable from the git tag `gensler-architecture`:

| Removed | Was | Why |
| --- | --- | --- |
| Research & Insights | `/gri/`, `/latest-research-insights/`, `/blog/`, `/research-library/`, 5 × `/research-topic-{topic}/` | A services-led site leads with what it sells, not with a research arm — and JCI had supplied no research to put in it |
| Offices | `/offices/` + 6 × 5 tab pages | 30 pages of location-filtered content for a practice with one studio |
| People | `/people/`, `/people/leadership/`, 3 × profile | Folded into `/about/` and `/contact/`, where a five-item site puts them |
| Careers | `/careers/` + 4 sub-pages | No roles supplied; not part of the sales narrative |
| Press / media / community / inclusion / ethics | 5 pages | Same — all were empty-state pages |
| Case studies | 7 × `/case-study/{slug}/` | The long-form narrative already lives on the project page; two URLs for one project was a Gensler pattern |
| Expertise | `/expertise/` + 14 | Split: the 6 sectors became `/sectors/`, the 8 services became the 3 service pillars |
| `/projects/` → `/work/` | 30 pages | Renamed back; `/projects/all/` collapsed into `/work/` |
| Mega-menus | header | Pointless over five flat nav items |

Kept from that build because it earns its place regardless of structure: the
search overlay (now Category + sort), the project filter on `/work/`, the
full capability-statement table, and the honest empty states on sectors with
no published photography.

---

## URL changes

Anything already linked to the previous structure needs redirecting:

| Old | New |
| --- | --- |
| `/projects/`, `/projects/all/` | `/work/` |
| `/projects/{slug}/` | `/work/{slug}/` |
| `/case-study/{slug}/` | `/work/{slug}/` |
| `/expertise/{workplace\|hospitality\|retail\|residential\|healthcare\|education}/` | `/sectors/{same}/` |
| `/expertise/{the 8 services}/` | `/services/{strategy\|design\|construction}/` |
| `/expertise/` | `/services/` |
| `/people/*`, `/offices/*` | `/about/` |
| `/gri/*`, `/blog/*`, `/research-topic-*`, `/careers/*`, `/press-releases/` | `/` |

No redirect map is implemented — the site has never been live, so nothing
points at the old URLs yet. If it had been, these would belong in the host's
redirect config before launch.
