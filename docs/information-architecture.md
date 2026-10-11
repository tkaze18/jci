# Information architecture — jamescubittinteriors.com

As built, following the as-built audit of **gensler.com** supplied as the
project roadmap: its eight-item primary navigation, its thirteen URL
templates, its ten-block homepage composition and its global chrome, mapped
onto a single West African practice.

**114 pages.** Paths are relative to the site root.

---

## Primary navigation — 8 items

The document's eight, in its order, with the same URL roots.

```
Home                                        /
├── Research & Insights        mega-menu    /gri/
│   ├── Latest Research & Insights          /latest-research-insights/
│   ├── Journal                             /blog/            + /blog/{slug}/
│   ├── Research Library                    /research-library/
│   └── Featured topics × 5                 /research-topic-{topic}/
├── Expertise                  mega-menu    /expertise/
│   └── Practice × 14                       /expertise/{practice}/
├── Projects                                /projects/
│   ├── All                                 /projects/all/
│   ├── Project × 28                        /projects/{slug}/
│   └── Case study × 7                      /case-study/{slug}/
├── People                                  /people/
│   ├── Leadership                          /people/leadership/
│   └── Profile × 3                         /people/{first-last}/
├── Offices                    mega-menu    /offices/
│   └── Office × 6                          /offices/{city}/
│       └── 4 tabs each                     /offices/{city}/{tab}/
├── About                                   /about/
│   ├── In The Media                        /in-the-media/
│   ├── Press Releases                      /press-releases/
│   ├── Community                           /about/community/
│   ├── Inclusion                           /about/inclusion/
│   └── Ethics & Compliance                 /ethics-compliance/
├── Careers                                 /careers/
│   └── not in menu, linked from careers    /how-to-apply/ · /internships/
│                                           /great-people-great-rewards/
│                                           /recruitment-privacy-statement/
└── Contact Us                              /contact/
```

Plus `/doc/jci-fact-sheet/`, `/privacy/`, `/transparency-statement/`,
`404.html`, `sitemap.xml`, `robots.txt`, `search-index.json`.

---

## Content types & URL patterns

The document's thirteen templates, and what each is here.

| Template | Document's pattern | Built | Count |
| --- | --- | --- | --- |
| Research report | `/gri/{slug}` | same | template only — none published |
| Blog article | `/blog/{slug}` | same | template only — none published |
| Research topic hub | `/research-topic-{topic}` | same | 5 |
| Project | `/projects/{slug}` | same | 28 |
| Case study | `/case-study/{slug}` | same | 7 |
| Person profile | `/people/{name}` | `/people/{first-last}/` | 3 |
| Expertise / practice | `/expertise/{practice}` | same | 14 |
| Office | `/offices/{city}[/{tab}]` | same, 4 tabs each | 6 × 5 |
| Press release | `/press-releases/{slug}` | same | template only — none published |
| Downloadable doc | `/doc/{name}` | same | 1 — the fact sheet |
| Design Forecast | `/publications/design-forecast/{year}` | **not built** | Gensler's own annual publication; no JCI analogue |
| Campaign / landing | `/{slug}` flat | **not built** | finding 1 of the audit calls flat root pages out |
| Embedded tool | `/iframe/{slug}` | **not built** | nothing to embed |

### Expertise: where the sectors and the services both live

gensler.com's 34 practices mix **sectors** (Aviation, Healthcare, Hospitality,
Retail, Residential) with **services** (Brand Design, Strategy, Wellness,
Product Development). JCI's fourteen follow the same mixed model:

- **Sectors (6)** — Workplace, Hospitality, Retail, Residential, Healthcare, Education
- **Services (8)** — Design, Workplace Strategy, Wellness Assessment & Correction,
  Experiential Projects, Design Intelligence, Design Management, FFE, Lighting Design

An earlier draft of this site had a separate top-level "Services" page, which
is not in the document. It is gone; that content is now `/expertise/{practice}/`
where the model puts it.

---

## Homepage composition — the document's ten blocks, top to bottom

| | Block | Built as |
| --- | --- | --- |
| 01 | Hero carousel · ~8 video/image slides | 8 slides, scroll-snap, dots, arrows, 7s autoplay that stops on interaction |
| 02 | Featured project caption · full-bleed image with project link | Afreximbank HQ, full-bleed, linked to its case study |
| 03 | Trending topics · 3 text links | first three research topics |
| 04 | Latest feed · ~25 mixed cards, tagged | 25 cards tagged Case study / Project / Film, newest first |
| 05 | Feed CTAs · View latest research, View blog | both |
| 06 | Mission statement · firm summary, link to /about | same |
| 07 | Spotlight · themed video block with 4 related articles | the practice film + 4 related case studies |
| 08 | Featured projects · 3 project cards | same |
| 09 | Newsletter sign-up | email subscribe — no fake form with no backend behind it |
| 10 | Careers CTA · Join our team → /careers | same |

Block 04 is where the empty sections show. The feed is built from every
published list in `content/site.json`; today that is projects, case studies
and the film. Research notes, journal entries, press releases and media
mentions join it automatically as soon as those lists have entries, and the
block carries a line saying so.

---

## Global chrome

**Header** — logo · 8-item nav with mega-menus on Research & Insights,
Expertise and Offices · Search · Share (LinkedIn, X, Facebook, email).
Exactly the document's header spec.

**Search overlay** — keyword search with filters for **Category**, **Topics**
and **Offices**, sort by **Relevance / Date / Name**, and popular searches.
Client-side over `search-index.json`, which the build emits with one entry
per page (112 of the 114). Opens from the header or by pressing `/`.

**Footer** — Contact · Fact Sheet · Guiding Principles · Newsletter ·
Inclusion · Ethics & Compliance · Resilience · Social · Privacy · Cookie
Preferences · Transparency Statement. The document's full set.

---

## Deliberate differences, and why

Five places where this site does not copy gensler.com. Each is either an
audit finding the document itself raises, or a point where copying would
mean publishing something untrue.

1. **Expertise has an index page.** The document records `NO LANDING PAGE ·
   MENU ONLY`, and finding 3 calls it out. `/expertise/` exists.

2. **Filters are query strings, not hash fragments.** The document has
   `/projects/all#topics` and `/people#offices`; finding 4 notes search
   engines don't index those. Here it is `/projects/all/?practice=…&topic=…
   &office=…`, and every filter is *also* a standalone page — the practice
   page, the topic hub, the office page — each with its own copy, title and
   description. The chips are real links to those pages, so with JavaScript
   off nothing is a dead control.

3. **Six offices, not 58.** Finding 5 notes that 58 offices × 5 pages is
   ~290 URLs of templated thin content. The template is identical — overview
   plus Leaders, Projects, News, Research & Insight — at the size the
   practice actually is. Offices are the five countries in the brochure's
   footprint plus Abuja; the wider James Cubitt group's twelve cities are
   listed on `/offices/` but do not get pages, because they are not JCI
   studios.

4. **No Design Forecast, no flat campaign pages, no embedded tools.** The
   first is Gensler's own annual publication. The second is finding 1 —
   `/{slug}` at the root hides where a page belongs. The third has nothing
   to embed.

5. **Nothing invented.** Research & Insights, the Journal, Press Releases,
   In The Media, Community, Inclusion, Ethics, Privacy, the Transparency
   Statement and the Careers sub-pages are all built, routed, styled,
   indexed and linked — and each says plainly that its content has not been
   supplied yet. Adding an entry to the matching list in
   `content/site.json` publishes it to its own page, to the section index,
   to the homepage feed and to the search index with no code change.

---

## Audit findings

All six observations at the end of the roadmap document are addressed:

| # | Finding | Here |
| --- | --- | --- |
| 1 | Shallow and wide; campaign and topic pages flat at the root | Every page sits under its section. No root-level campaign pages. Research topics keep the document's `/research-topic-{topic}` pattern, which is flat by its own spec — the one place the pattern is followed as given rather than corrected, so the URL stays recognisable |
| 2 | Research has two entry points plus two more indexes | One canonical index per content type. `/gri/` is the only Research & Insights root; `/latest-research-insights/` is its feed, not a second front door |
| 3 | Expertise has no index page | `/expertise/` exists and is linked and indexable |
| 4 | Filters use hash fragments | Query strings, plus a standalone page per filter value |
| 5 | Offices are the largest templated section | Same template, six locations |
| 6 | Legacy pages still live at the root | No legacy. The rule: a page that is no longer true is removed or redirected, not left at the root |
