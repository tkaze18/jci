#!/usr/bin/env python3
"""
Build the James Cubitt Interiors site.

    python3 scripts/build.py            # -> dist/
    python3 scripts/build.py --out www  # -> www/

The information architecture follows the as-built audit of gensler.com
supplied as the project roadmap: its eight-item primary navigation, its
thirteen URL templates, its ten-block homepage composition and its global
chrome, mapped onto a single West African practice. docs/information-
architecture.md records the mapping page by page.

Everything the site says comes from content/site.json; everything it looks
like comes from assets/css/tokens.css. This file is only the join between
the two. Pure standard library — there is nothing to install.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
from html import escape as esc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content", "site.json")
TEMPLATES = os.path.join(ROOT, "templates")
ASSETS = os.path.join(ROOT, "assets")

IMG = "assets/img/projects"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def rel(depth: int) -> str:
    """Path back to the site root from a page `depth` directories down."""
    return "../" * depth if depth else "./"


def paras(items, cls="t-body"):
    return "\n".join(f'<p class="{cls}">{esc(p)}</p>' for p in items if p)


def picture(root, slug, alt, *, card=False, cls="", loading="lazy",
            sizes=None, width=None, height=None) -> str:
    base = f"{root}{IMG}/{slug}"
    attrs = [
        f'src="{base}{"-card" if card else ""}.webp"',
        f'srcset="{base}-card.webp 900w, {base}.webp 1800w"',
        f'sizes="{sizes or "100vw"}"',
        f'alt="{esc(alt)}"',
        f'loading="{loading}"',
        'decoding="async"',
    ]
    if loading == "eager":
        attrs.append('fetchpriority="high"')
    if cls:
        attrs.append(f'class="{cls}"')
    if width:
        attrs.append(f'width="{width}"')
    if height:
        attrs.append(f'height="{height}"')
    return "<img " + " ".join(attrs) + ">"


def project_meta(project: dict) -> list[str]:
    bits = []
    place = ", ".join(x for x in (project.get("city"), project.get("country")) if x)
    if place:
        bits.append(place)
    if project.get("start"):
        finish = project.get("finish")
        bits.append(project["start"] if not finish or finish == project["start"]
                    else f'{project["start"]}–{finish}')
    return bits


def by_slug(items, slug, key="slug"):
    for item in items:
        if item[key] == slug:
            return item
    return None


def practice_name(data, slug):
    item = by_slug(data["practices"], slug)
    return item["name"] if item else slug.replace("-", " ").title()


def topic_name(data, slug):
    item = by_slug(data["topics"], slug)
    return item["name"] if item else slug.replace("-", " ").title()


def project_practices(project: dict) -> list[str]:
    return [project["sector"]] + list(project.get("alsoIn", []))


def projects_for_office(data, office_slug):
    return [p for p in data["projects"] if p["office"] == office_slug]


def projects_for_topic(data, topic_slug):
    return [p for p in data["projects"] if topic_slug in p.get("topics", [])]


def projects_for_practice(data, practice_slug):
    return [p for p in data["projects"] if practice_slug in project_practices(p)]


# ---------------------------------------------------------------------------
# Global chrome: header with mega-menus, search overlay, full footer
# ---------------------------------------------------------------------------
def mega_gri(data, root) -> str:
    topics = "\n".join(
        f'            <li><a href="{root}research-topic-{t["slug"]}/">{esc(t["name"])}</a></li>'
        for t in data["topics"])
    return f"""        <div class="mega" id="mega-gri" hidden>
          <div class="mega__inner shell">
            <div class="mega__col">
              <p class="mega__head">Gensler Research Institute</p>
              <ul>
                <li><a href="{root}gri/">Overview</a></li>
                <li><a href="{root}latest-research-insights/">Latest Research &amp; Insights</a></li>
                <li><a href="{root}research-library/">Research Library</a></li>
              </ul>
            </div>
            <div class="mega__col">
              <p class="mega__head">Featured topics</p>
              <ul>
{topics}
              </ul>
            </div>
            <div class="mega__col">
              <p class="mega__head">In focus</p>
              <ul>
                <li><a href="{root}blog/">Journal</a></li>
                <li><a href="{root}research-topic-sustainability/">Resilience by Design</a></li>
                <li><a href="{root}doc/jci-fact-sheet/">Fact Sheet</a></li>
              </ul>
            </div>
          </div>
        </div>"""


def mega_expertise(data, root) -> str:
    def column(kind, heading):
        items = "\n".join(
            f'            <li><a href="{root}expertise/{x["slug"]}/">{esc(x["name"])}</a></li>'
            for x in data["practices"] if x["kind"] == kind)
        return f"""            <div class="mega__col">
              <p class="mega__head">{heading}</p>
              <ul>
{items}
              </ul>
            </div>"""
    return f"""        <div class="mega" id="mega-expertise" hidden>
          <div class="mega__inner shell">
{column("sector", "Sectors")}
{column("service", "Services")}
            <div class="mega__col">
              <p class="mega__head">&nbsp;</p>
              <ul><li><a href="{root}expertise/">All expertise</a></li></ul>
            </div>
          </div>
        </div>"""


def mega_offices(data, root) -> str:
    regions = {}
    for office in data["offices"]:
        regions.setdefault(office["region"], []).append(office)
    cols = []
    for region, offices in regions.items():
        items = "\n".join(
            f'            <li><a href="{root}offices/{o["slug"]}/">{esc(o["city"])}</a></li>'
            for o in offices)
        cols.append(f"""            <div class="mega__col">
              <p class="mega__head">{esc(region)} <span class="t-muted">{len(offices)}</span></p>
              <ul>
{items}
              </ul>
            </div>""")
    network = " · ".join(esc(c) for c in data["footprint"]["network"])
    return f"""        <div class="mega" id="mega-offices" hidden>
          <div class="mega__inner shell">
{chr(10).join(cols)}
            <div class="mega__col mega__col--wide">
              <p class="mega__head">James Cubitt group</p>
              <p class="t-sm t-muted">{network}</p>
              <ul style="margin-top:var(--s-sm)"><li><a href="{root}offices/">All offices</a></li></ul>
            </div>
          </div>
        </div>"""


def header_html(data, root, current) -> str:
    links = []
    for item in data["nav"]:
        href = root + item["href"].lstrip("/")
        aria = ' aria-current="page"' if item["href"] == current else ""
        if item.get("mega"):
            links.append(
                f'        <a class="nav__link nav__link--mega" href="{href}"{aria} '
                f'data-mega="mega-{item["mega"]}" aria-expanded="false">{esc(item["label"])}</a>')
        else:
            links.append(f'        <a class="nav__link" href="{href}"{aria}>{esc(item["label"])}</a>')

    share = "\n".join(
        f'          <a class="share__link" href="{url}" aria-label="Share on {label}" '
        f'rel="noopener" target="_blank">{label[:2]}</a>'
        for label, url in (
            ("LinkedIn", "https://www.linkedin.com/sharing/share-offsite/?url=" + data["site"]["url"]),
            ("X", "https://twitter.com/intent/tweet?url=" + data["site"]["url"]),
            ("Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + data["site"]["url"]),
        )) + f'\n          <a class="share__link" href="mailto:?body={data["site"]["url"]}" aria-label="Share by email">@</a>'

    return f"""<header class="header">
  <div class="header__inner">
    <a class="logo" href="{root}" aria-label="James Cubitt Interiors — home">
      <img class="logo__mark" src="{root}assets/img/brand/logo-mark-card.webp" alt="" width="30" height="30" decoding="async">
      <span class="logo__text">James Cubitt<span>Interiors</span></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button>
    <nav class="nav" id="primary-nav" aria-label="Primary">
{chr(10).join(links)}
    </nav>
    <div class="header__tools">
      <button class="iconbtn" type="button" data-search-open aria-label="Search this site">
        <span aria-hidden="true">⌕</span><span class="iconbtn__label">Search</span>
      </button>
      <div class="share" aria-label="Share">
{share}
      </div>
    </div>
  </div>
{mega_gri(data, root)}
{mega_expertise(data, root)}
{mega_offices(data, root)}
</header>

<div class="searchlay" id="searchlay" hidden>
  <div class="searchlay__inner shell">
    <div class="searchlay__bar">
      <label class="visually-hidden" for="search-q">Search james cubitt interiors</label>
      <input class="searchlay__input" id="search-q" type="search" autocomplete="off"
             placeholder="Search projects, expertise, people, offices…" data-search-input>
      <button class="btn btn--secondary" type="button" data-search-close>Close</button>
    </div>
    <div class="searchlay__filters">
      <div class="searchlay__filter">
        <label class="t-label t-muted" for="f-category">Category</label>
        <select id="f-category" data-search-filter="category"><option value="">All</option></select>
      </div>
      <div class="searchlay__filter">
        <label class="t-label t-muted" for="f-topic">Topic</label>
        <select id="f-topic" data-search-filter="topic"><option value="">All</option></select>
      </div>
      <div class="searchlay__filter">
        <label class="t-label t-muted" for="f-office">Office</label>
        <select id="f-office" data-search-filter="office"><option value="">All</option></select>
      </div>
      <div class="searchlay__filter">
        <label class="t-label t-muted" for="f-sort">Sort by</label>
        <select id="f-sort" data-search-sort>
          <option value="relevance">Relevance</option>
          <option value="date">Date</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
    <p class="t-sm t-muted searchlay__popular">Popular searches:
      <a href="#" data-search-term="workplace">workplace</a>,
      <a href="#" data-search-term="hospitality">hospitality</a>,
      <a href="#" data-search-term="wellbeing">wellbeing</a>,
      <a href="#" data-search-term="Lagos">Lagos</a>,
      <a href="#" data-search-term="MTN">MTN</a>
    </p>
    <div class="searchlay__results" data-search-results aria-live="polite"></div>
  </div>
</div>"""


def footer_html(data, root) -> str:
    site = data["site"]
    cols = []
    for column in data["footer"]["columns"]:
        items = "\n".join(
            f'          <li><a href="{root}{l["href"].lstrip("/")}">{esc(l["label"])}</a></li>'
            for l in column["links"])
        cols.append(f"""      <div class="footer__col">
        <h2>{esc(column["heading"])}</h2>
        <ul>
{items}
        </ul>
      </div>""")
    social = " · ".join(
        f'<a href="{s["href"]}" rel="noopener" target="_blank">{esc(s["label"])}</a>'
        for s in data["footer"]["social"])
    legal = " · ".join(
        f'<a href="{root}{l["href"].lstrip("/")}">{esc(l["label"])}</a>'
        for l in data["footer"]["legal"])
    news = data["footer"]["newsletter"]
    return f"""<footer class="footer">
  <div class="shell">
    <div class="footer__grid">
      <div class="footer__col footer__col--brand">
        <p class="footer__promise">Improving well-being through interior design.</p>
        <p class="t-sm t-muted">Part of the James Cubitt group — a practice founded in London in 1947 and working in West Africa since 1950.</p>
      </div>
{chr(10).join(cols)}
      <div class="footer__col">
        <h2>{esc(news["heading"])}</h2>
        <p class="t-sm t-muted">{esc(news["body"])}</p>
        <p><a class="btn-link" href="mailto:{esc(site["email"])}?subject=Newsletter">{esc(news["cta"])}</a></p>
        <h2 style="margin-top:var(--s-sm)">Follow</h2>
        <p class="t-sm">{social}</p>
      </div>
    </div>
    <div class="footer__bottom">
      <span>&copy; <span data-year>2026</span> James Cubitt Interiors. All rights reserved.</span>
      <span class="footer__legal">{legal}</span>
      <span>we design, you experience</span>
    </div>
  </div>
</footer>"""


# ---------------------------------------------------------------------------
# Shared blocks
# ---------------------------------------------------------------------------
def sec_head(label, heading, *, link=None, link_label=None, tag="h2") -> str:
    right = f'<a class="btn-link" href="{link}">{esc(link_label or "View all")}</a>' if link else ""
    return f"""      <div class="sec-head" data-reveal>
        <div class="sec-head__meta">
          <p class="t-label t-label--accent"><span class="mark"></span> {esc(label)}</p>
          {right}
        </div>
        <{tag} class="t-section">{heading}</{tag}>
      </div>"""


def pagehead(label, heading, lede="", *, root=None, parent=None, parent_label=None) -> str:
    crumb = (f'<a href="{root}{parent}">{esc(parent_label)}</a>'
             if parent else esc(label))
    lede_html = f'<p class="t-lede pagehead__lede">{lede}</p>' if lede else ""
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> {crumb}</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">{heading}</h1>
      {lede_html}
    </div>
  </section>"""


def project_card(project, root, *, card=True, modifier="",
                 sizes="(min-width: 1040px) 30vw, (min-width: 620px) 48vw, 92vw") -> str:
    alt = (project.get("imageAlts") or [project["name"]])[0]
    meta = "".join(f"<span>{esc(m)}</span>" for m in project_meta(project))
    return f"""        <a class="card {modifier}" href="{root}projects/{project["slug"]}/"
           data-practices="{" ".join(project_practices(project))}"
           data-topics="{" ".join(project.get("topics", []))}"
           data-office="{project["office"]}" data-reveal>
          <div class="card__media">{picture(root, project["images"][0], alt, card=card, sizes=sizes)}</div>
          <div class="card__body">
            <h3 class="card__title">{esc(project["name"])}</h3>
            <p class="card__meta">{meta}</p>
          </div>
        </a>"""


def empty_state(message, root=None, cta=None, cta_label=None) -> str:
    link = f' <a class="btn-link" href="{cta}">{esc(cta_label)}</a>' if cta else ""
    return f"""      <div class="empty" data-reveal>
        <p class="t-lede">{esc(message)}{link}</p>
      </div>"""


def cta(root) -> str:
    return f"""  <section class="cta">
    <div class="shell">
      <div class="cta__inner">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Start a project</p>
          <h2 class="statement" style="margin-top:var(--s-sm)">Tell us what the space has to do.</h2>
        </div>
        <div class="hero__actions" data-reveal>
          <a class="btn btn--primary" href="mailto:info@jamescubittinteriors.com">Email the studio</a>
          <a class="btn btn--secondary" href="{root}contact/">Contact</a>
        </div>
      </div>
    </div>
  </section>"""


# ---------------------------------------------------------------------------
# 01 Home — the document's ten blocks, top to bottom
# ---------------------------------------------------------------------------
HERO_SLIDES = [
    ("guinness-hq-01", "Guinness Head Office", "Lagos", "projects/guinness-hq/"),
    ("afreximbank-hq-01", "Afreximbank HQ", "Abuja", "case-study/afreximbank-hq/"),
    ("gabfol-airport-01", "Gabfol Airport", "Lagos", "case-study/gabfol-airport/"),
    ("mtn-cote-divoire-01", "MTN CI Place", "Abidjan", "projects/mtn-cote-divoire/"),
    ("hotel-takum-04", "Hotel Takum", "Taraba", "case-study/hotel-takum/"),
    ("diageo-spirit-01", "Diageo Spirit", "Lagos", "case-study/diageo-spirit/"),
    ("metropolitan-club-01", "Metropolitan Club", "Lagos", "case-study/metropolitan-club/"),
    ("nlng-campus-01", "NLNG Campus", "Port Harcourt", "projects/nlng-campus/"),
]


def page_home(data, root) -> str:
    home = data["home"]

    # 01 Hero carousel
    slides = []
    for i, (img, name, place, href) in enumerate(HERO_SLIDES):
        slides.append(f"""        <li class="carousel__slide" id="slide-{i}" aria-roledescription="slide"
            aria-label="{i + 1} of {len(HERO_SLIDES)}: {esc(name)}">
          <a href="{root}{href}">
            {picture(root, img, f"{name}, {place}", loading="eager" if i == 0 else "lazy", sizes="100vw")}
            <div class="carousel__scrim"></div>
            <div class="carousel__body shell">
              <p class="t-label hero__eyebrow"><span class="mark"></span> {esc(home["heroEyebrow"])}</p>
              <h2 class="t-display">{esc(name)}</h2>
              <p class="hero__standfirst">{esc(place)}</p>
            </div>
          </a>
        </li>""")
    dots = "\n".join(
        f'          <button type="button" class="carousel__dot" data-goto="{i}" '
        f'aria-label="Go to slide {i + 1}"{" aria-current=\"true\"" if i == 0 else ""}></button>'
        for i in range(len(HERO_SLIDES)))

    hero = f"""  <section class="carousel" data-carousel aria-roledescription="carousel" aria-label="Featured work">
    <h1 class="visually-hidden">{esc(data["site"]["name"])} — {esc(data["site"]["tagline"])}</h1>
    <ul class="carousel__track" data-carousel-track>
{chr(10).join(slides)}
    </ul>
    <div class="carousel__controls">
      <button type="button" class="carousel__arrow" data-prev aria-label="Previous slide">‹</button>
      <div class="carousel__dots" role="tablist" aria-label="Choose slide">
{dots}
      </div>
      <button type="button" class="carousel__arrow" data-next aria-label="Next slide">›</button>
    </div>
  </section>"""

    # 02 Featured project caption — full-bleed image with project link
    feat = by_slug(data["projects"], "afreximbank-hq")
    block02 = f"""  <section class="band band--feature">
    {picture(root, "afreximbank-hq-02", feat["imageAlts"][1], sizes="100vw")}
    <div class="band__body">
      <p class="t-label" style="color:rgba(255,255,255,.7)"><span class="mark"></span> Featured project</p>
      <p class="quote quote--wide" style="margin-top:var(--s-sm)">{esc(feat["summary"])}</p>
      <p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}case-study/{feat["slug"]}/">{esc(feat["name"])}, {esc(feat["city"])}</a></p>
    </div>
  </section>"""

    # 03 Trending topics — three text links
    trending = data["topics"][:3]
    block03 = f"""  <section class="section--tight">
    <div class="shell">
      <div class="trending" data-reveal>
        <p class="t-label t-muted">Trending topics</p>
        <ul class="trending__list">
{chr(10).join(f'          <li><a href="{root}research-topic-{t["slug"]}/">{esc(t["name"])}</a></li>' for t in trending)}
        </ul>
      </div>
    </div>
  </section>"""

    # 04 Latest feed — mixed cards, tagged by category
    feed = build_feed(data, root, limit=25)
    cards = "\n".join(feed_card(item, root) for item in feed)
    block04 = f"""  <section class="section section--flush-top">
    <div class="shell">
{sec_head("Latest", "What the studio is publishing.")}
      <div class="grid grid--3">
{cards}
      </div>
      <p class="t-sm t-muted" style="margin-top:var(--s-md)" data-reveal>
        Research notes, journal entries and press releases will appear in this feed as they are published.
      </p>
    </div>
  </section>"""

    # 05 Feed CTAs
    block05 = f"""  <section class="section--tight">
    <div class="shell">
      <div class="hero__actions" data-reveal>
        <a class="btn btn--secondary" href="{root}latest-research-insights/">View latest research</a>
        <a class="btn btn--secondary" href="{root}blog/">View the journal</a>
      </div>
    </div>
  </section>"""

    # 06 Mission statement — firm summary, link to /about
    block06 = f"""  <section class="section">
    <div class="shell">
      <div class="split">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Who we are</p>
          <h2 class="t-section" style="margin-top:var(--s-sm)">{esc(home["missionHeadline"])}</h2>
        </div>
        <div data-reveal>
{paras(home["missionBody"], "t-lede")}
          <p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}about/">About the practice</a></p>
        </div>
      </div>
    </div>
  </section>"""

    # 07 Spotlight — themed video block with four related articles
    film = data["film"]
    sources = "\n".join(
        f'            <source src="{root}{s["src"]}" type="{s["type"]}">' for s in film["sources"])
    related = [by_slug(data["projects"], s) for s in
               ("hotel-takum", "gabfol-airport", "diageo-spirit", "metropolitan-club")]
    related_html = "\n".join(
        f"""          <li><a href="{root}case-study/{r["slug"]}/">
            <span class="t-label t-muted">Case study</span>
            <span class="t-h-sm">{esc(r["name"])}</span>
          </a></li>""" for r in related)
    block07 = f"""  <section class="section section--flush-top" id="spotlight">
    <div class="shell">
{sec_head(f'Spotlight · {film["durationLabel"]}', esc(film["heading"]))}
      <div class="spotlight">
        <figure class="film" data-film data-reveal>
          <video class="film__video" controls preload="none" playsinline
                 poster="{root}assets/video/{film["poster"]}.webp"
                 aria-label="{esc(film["name"])}">
{sources}
            <p class="t-body">Your browser cannot play this video.
              <a href="{root}{film["sources"][-1]["src"]}">Download the film</a> instead.</p>
          </video>
          <button class="film__play" type="button" data-film-play
                  aria-label="Play the {esc(film["name"])}, {esc(film["durationLabel"])}">
            <span class="film__play-icon" aria-hidden="true"></span>
            <span class="film__play-label t-label">Play film <span aria-hidden="true">·</span> {esc(film["durationLabel"])}</span>
          </button>
        </figure>
        <div class="spotlight__side" data-reveal>
          <p class="t-body">{esc(film["standfirst"])}</p>
          <p class="t-label t-muted" style="margin-top:var(--s-md)">Related</p>
          <ul class="spotlight__related">
{related_html}
          </ul>
        </div>
      </div>
    </div>
  </section>"""

    # 08 Featured projects — three cards
    featured = [p for p in data["projects"] if p.get("featured")][:3]
    block08 = f"""  <section class="section">
    <div class="shell">
{sec_head("Featured projects", "Spaces people move through well.", link=root + "projects/", link_label="All projects")}
      <div class="grid grid--3">
{chr(10).join(project_card(p, root) for p in featured)}
      </div>
    </div>
  </section>"""

    # 09 Newsletter sign-up
    news = data["footer"]["newsletter"]
    block09 = f"""  <section class="section--tight">
    <div class="shell">
      <div class="newsletter" data-reveal>
        <div>
          <p class="t-label t-label--accent"><span class="mark"></span> {esc(news["heading"])}</p>
          <p class="t-h-lg" style="margin-top:var(--s-xs)">{esc(news["body"])}</p>
        </div>
        <a class="btn btn--primary" href="mailto:{esc(data["site"]["email"])}?subject=Newsletter">{esc(news["cta"])}</a>
      </div>
    </div>
  </section>"""

    # 10 Careers CTA
    block10 = f"""  <section class="cta">
    <div class="shell">
      <div class="cta__inner">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Careers</p>
          <h2 class="statement" style="margin-top:var(--s-sm)">Join our team.</h2>
        </div>
        <div class="hero__actions" data-reveal>
          <a class="btn btn--primary" href="{root}careers/">See careers</a>
        </div>
      </div>
    </div>
  </section>"""

    return "\n\n".join([hero, block02, block03, block04, block05,
                        block06, block07, block08, block09, block10])


def build_feed(data, root, limit=25):
    """The homepage feed: every published item, newest first.

    Today that is projects, case studies and the film; research notes,
    journal entries, press releases and media mentions join it from the
    same lists in content/site.json as soon as they exist.
    """
    feed = []
    for item in data["insights"]:
        feed.append({"category": "Research", "title": item["title"],
                     "href": f'gri/{item["slug"]}/', "date": item.get("date", ""),
                     "image": item.get("image"), "alt": item.get("imageAlt", "")})
    for item in data["blog"]:
        feed.append({"category": "Journal", "title": item["title"],
                     "href": f'blog/{item["slug"]}/', "date": item.get("date", ""),
                     "image": item.get("image"), "alt": item.get("imageAlt", "")})
    for item in data["press"]:
        feed.append({"category": "Press Release", "title": item["title"],
                     "href": f'press-releases/{item["slug"]}/', "date": item.get("date", ""),
                     "image": item.get("image"), "alt": item.get("imageAlt", "")})
    for item in data["media"]:
        feed.append({"category": "In The Media", "title": item["title"],
                     "href": item.get("href", "in-the-media/"), "date": item.get("date", ""),
                     "image": item.get("image"), "alt": item.get("imageAlt", "")})
    feed.append({"category": "Film", "title": data["film"]["heading"],
                 "href": "#spotlight", "date": "2026",
                 "image": None, "alt": data["film"]["posterAlt"],
                 "poster": "assets/video/jci-film-poster-card.webp"})
    for project in data["projects"]:
        feed.append({
            "category": "Case study" if project.get("caseStudy") else "Project",
            "title": project["name"],
            "href": f'{"case-study" if project.get("caseStudy") else "projects"}/{project["slug"]}/',
            "date": project.get("finish") or project.get("start") or "",
            "image": project["images"][0],
            "alt": (project.get("imageAlts") or [project["name"]])[0],
        })

    def key(item):
        date = str(item.get("date") or "")
        return "9999" if date == "Present" else date
    feed.sort(key=key, reverse=True)
    return feed[:limit]


def feed_card(item, root) -> str:
    if item.get("poster"):
        media = (f'<img src="{root}{item["poster"]}" alt="{esc(item["alt"])}" '
                 f'loading="lazy" decoding="async">')
    elif item.get("image"):
        media = picture(root, item["image"], item["alt"], card=True,
                        sizes="(min-width: 1040px) 30vw, (min-width: 620px) 48vw, 92vw")
    else:
        media = ""
    href = item["href"] if item["href"].startswith("#") else root + item["href"]
    return f"""        <a class="card" href="{href}" data-reveal>
          <div class="card__media">{media}</div>
          <div class="card__body">
            <p class="t-label t-label--accent">{esc(item["category"])}</p>
            <h3 class="card__title">{esc(item["title"])}</h3>
          </div>
        </a>"""


# ---------------------------------------------------------------------------
# Research & Insights
# ---------------------------------------------------------------------------
def page_gri(data, root) -> str:
    topics = "\n".join(
        f"""        <a class="card card--wide" href="{root}research-topic-{t["slug"]}/" data-reveal>
          <div class="card__body">
            <h3 class="card__title">{esc(t["name"])}</h3>
            <p class="card__meta"><span>{esc(t["lede"])}</span></p>
          </div>
        </a>""" for t in data["topics"])
    body = (empty_state(
        "The first research notes are being written. Until they are published, the "
        "practice's thinking lives in the project case studies and in the film.",
        cta=root + "projects/", cta_label="Read the case studies")
        if not data["insights"] else "")
    return f"""{pagehead("Research & Insights", "What sixty years of building teaches.",
        "The research arm of the practice: what we learn from the projects, and what we go looking for.")}

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("Latest", "Research &amp; insights.", link=root + "latest-research-insights/", link_label="All research")}
{body}
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Featured topics", "The five questions we keep returning to.")}
      <div class="grid grid--2">
{topics}
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("In focus", "Elsewhere.")}
      <div class="grid grid--3">
        <a class="card card--wide" href="{root}blog/" data-reveal><div class="card__body">
          <h3 class="card__title">Journal</h3><p class="card__meta"><span>Short-form notes from the studio.</span></p></div></a>
        <a class="card card--wide" href="{root}research-library/" data-reveal><div class="card__body">
          <h3 class="card__title">Research Library</h3><p class="card__meta"><span>Downloadable documents and the capability statement.</span></p></div></a>
        <a class="card card--wide" href="{root}research-topic-sustainability/" data-reveal><div class="card__body">
          <h3 class="card__title">Resilience by Design</h3><p class="card__meta"><span>Wellness and sustainability in the built environment.</span></p></div></a>
      </div>
    </div>
  </section>

{cta(root)}"""


def page_latest(data, root) -> str:
    items = [i for i in build_feed(data, root, limit=60)
             if i["category"] in ("Research", "Journal", "Press Release", "In The Media")]
    body = ("\n".join(feed_card(i, root) for i in items) if items else "")
    inner = (f'      <div class="grid grid--3">\n{body}\n      </div>' if items else
             empty_state("No research has been published yet. The template is in place: "
                         "add an entry to the insights list in content/site.json and it appears here.",
                         cta=root + "gri/", cta_label="Research & Insights"))
    return f"""{pagehead("Research & Insights", "Latest research &amp; insights.",
        "Everything the practice publishes, newest first.", root=root,
        parent="gri/", parent_label="Research & Insights")}

  <section class="section section--flush-top">
    <div class="shell">
{inner}
    </div>
  </section>

{cta(root)}"""


def page_blog(data, root) -> str:
    inner = (f'      <div class="grid grid--3">\n'
             + "\n".join(feed_card({"category": "Journal", "title": b["title"],
                                    "href": f'blog/{b["slug"]}/', "image": b.get("image"),
                                    "alt": b.get("imageAlt", "")}, root) for b in data["blog"])
             + "\n      </div>") if data["blog"] else empty_state(
        "The journal has not started yet. Add an entry to the blog list in "
        "content/site.json and it is published here and in the homepage feed.")
    return f"""{pagehead("Journal", "Short-form notes from the studio.",
        "Where the practice writes about what it is working on.", root=root,
        parent="gri/", parent_label="Research & Insights")}

  <section class="section section--flush-top">
    <div class="shell">
{inner}
    </div>
  </section>

{cta(root)}"""


def page_topic(topic, data, root) -> str:
    projects = projects_for_topic(data, topic["slug"])
    cards = "\n".join(project_card(p, root) for p in projects)
    return f"""{pagehead("Research topic", esc(topic["name"]), esc(topic["lede"]), root=root,
        parent="gri/", parent_label="Research & Insights")}

  <section class="section section--flush-top">
    <div class="shell">
{sec_head(topic["name"], f'{len(projects)} {"project" if len(projects) == 1 else "projects"} on this topic.',
          link=root + "projects/all/?topic=" + topic["slug"], link_label="Filter all projects")}
      <div class="grid grid--3">
{cards}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Writing", "Research on this topic.")}
{empty_state("No research note has been published on this topic yet.")}
    </div>
  </section>

{cta(root)}"""


def page_research_library(data, root) -> str:
    return f"""{pagehead("Research Library", "Documents.",
        "What the practice publishes in long form.", root=root,
        parent="gri/", parent_label="Research & Insights")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="grid grid--3">
        <a class="card card--wide" href="{root}doc/jci-fact-sheet/" data-reveal><div class="card__body">
          <p class="t-label t-label--accent">Fact sheet</p>
          <h3 class="card__title">James Cubitt Interiors fact sheet</h3>
          <p class="card__meta"><span>The practice in numbers, sectors and locations.</span></p></div></a>
      </div>
      <p class="t-sm t-muted" style="margin-top:var(--s-md)" data-reveal>
        The commercial and hospitality brochures belong here as downloads once cleared for publication.
      </p>
    </div>
  </section>

{cta(root)}"""


# ---------------------------------------------------------------------------
# Expertise
# ---------------------------------------------------------------------------
def page_expertise_index(data, root) -> str:
    def group(kind, label, heading):
        cards = "\n".join(
            f"""        <a class="card {"card--wide" if x["image"] else "card--text"}" href="{root}expertise/{x["slug"]}/" data-reveal>
          {f'<div class="card__media">{picture(root, x["image"], x["imageAlt"], card=True, sizes="(min-width: 620px) 48vw, 92vw")}</div>' if x["image"] else ""}
          <div class="card__body">
            <h3 class="card__title">{esc(x["name"])}</h3>
            <p class="card__meta"><span>{esc(x["lede"])}</span></p>
          </div>
        </a>""" for x in data["practices"] if x["kind"] == kind)
        return f"""  <section class="section section--flush-top">
    <div class="shell">
{sec_head(label, heading)}
      <div class="grid grid--2">
{cards}
      </div>
    </div>
  </section>"""

    return f"""{pagehead("Expertise", "Fourteen practices, one way of working.",
        "Six sectors and eight services. The sector changes the brief; it does not change the discipline behind it. "
        "gensler.com runs its thirty-four practices as a menu with no landing page — finding 3 of the audit calls that out, so this index exists.")}

{group("sector", "Sectors", "Where we work.")}
{group("service", "Services", "What we do.")}

{cta(root)}"""


def page_practice(practice, data, root) -> str:
    projects = projects_for_practice(data, practice["slug"])
    siblings = [x for x in data["practices"]
                if x["kind"] == practice["kind"] and x["slug"] != practice["slug"]]
    others = "\n".join(
        f'          <li><a class="btn-link" href="{root}expertise/{x["slug"]}/">{esc(x["name"])}</a></li>'
        for x in siblings)

    if practice["image"]:
        head = f"""  <section class="hero hero--short">
    <div class="hero__media">{picture(root, practice["image"], practice["imageAlt"], loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> <a href="{root}expertise/">Expertise</a></p>
      <h1 class="t-display">{esc(practice["name"])}</h1>
      <p class="hero__standfirst">{esc(practice["lede"])}</p>
    </div>
    {f'<p class="t-caption hero__caption">{esc(practice["imageCredit"])}</p>' if practice.get("imageCredit") else ""}
  </section>"""
    else:
        head = pagehead("Expertise", esc(practice["name"]), esc(practice["lede"]),
                        root=root, parent="expertise/", parent_label="Expertise")

    if projects:
        count = f'{len(projects)} {"project" if len(projects) == 1 else "projects"} in this practice.'
        listing = ('      <div class="grid grid--3">\n'
                   + "\n".join(project_card(p, root) for p in projects) + "\n      </div>")
        link, link_label = root + "projects/all/?practice=" + practice["slug"], "Filter all projects"
    elif practice.get("indexType"):
        rows = [e for e in data["projectIndex"] if e["type"] == practice["indexType"]]
        count = f'{len(rows)} {"project" if len(rows) == 1 else "projects"} in this practice.'
        listing = ('      <div class="deflist" data-reveal>\n' + "\n".join(
            f'        <div class="deflist__row"><p class="deflist__num">{i:02d}</p>'
            f'<h3 class="deflist__term">{esc(e["name"])}</h3>'
            f'<div class="deflist__desc">{esc(e["task"])} · {esc(e["location"])}</div></div>'
            for i, e in enumerate(rows, start=1)) + "\n      </div>")
        link, link_label = root + "projects/all/", "Full project list"
    else:
        count = "No published project in this practice yet."
        listing = empty_state(
            practice.get("note") or "Nothing has been published in this practice yet.",
            cta=root + "contact/", cta_label="Talk to us")
        link, link_label = root + "projects/", "All projects"

    note = (f'      <p class="t-lede" style="margin-bottom:var(--s-md)" data-reveal>{esc(practice["note"])}</p>'
            if practice.get("note") and projects else "")

    return f"""{head}

  <section class="section">
    <div class="shell">
      <div class="split">
        <div data-reveal><h2 class="t-h-lg">How we approach it</h2></div>
        <div data-reveal>
{paras(practice["body"], "t-body")}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head(practice["name"], count, link=link, link_label=link_label)}
{note}
{listing}
    </div>
  </section>

  <section class="section--tight">
    <div class="shell">
      <hr class="rule">
      <div style="padding-top:var(--s-md)">
        <p class="t-label t-muted" style="margin-bottom:var(--s-sm)">Other {practice["kind"]}s</p>
        <ul class="taglist">
{others}
        </ul>
      </div>
    </div>
  </section>

{cta(root)}"""


# ---------------------------------------------------------------------------
# Projects
# ---------------------------------------------------------------------------
def page_projects(data, root) -> str:
    featured = [p for p in data["projects"] if p.get("featured")]
    return f"""{pagehead("Projects", "Fifty interiors across five countries.",
        "Head offices, hotels, lounges, stores and homes — delivered from strategy through to the day the client gets the keys.")}

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("Featured", "Selected work.", link=root + "projects/all/", link_label="All projects")}
      <div class="grid grid--3">
{chr(10).join(project_card(p, root) for p in featured)}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Browse", "By topic, by office.")}
      <div class="grid grid--2">
        <div data-reveal>
          <p class="t-label t-muted">By topic</p>
          <ul class="taglist" style="margin-top:var(--s-sm)">
{chr(10).join(f'            <li><a class="btn-link" href="{root}projects/all/?topic={t["slug"]}">{esc(t["name"])}</a></li>' for t in data["topics"])}
          </ul>
        </div>
        <div data-reveal>
          <p class="t-label t-muted">By office</p>
          <ul class="taglist" style="margin-top:var(--s-sm)">
{chr(10).join(f'            <li><a class="btn-link" href="{root}projects/all/?office={o["slug"]}">{esc(o["city"])}</a></li>' for o in data["offices"])}
          </ul>
        </div>
      </div>
    </div>
  </section>

{cta(root)}"""


def page_projects_all(data, root) -> str:
    projects = data["projects"]
    chips = ['        <a class="chip" href="{r}projects/all/" data-filter-all aria-current="true">All</a>'.format(r=root)]
    for practice in [x for x in data["practices"] if x["kind"] == "sector"]:
        chips.append(f'        <a class="chip" href="{root}expertise/{practice["slug"]}/" '
                     f'data-filter-practice="{practice["slug"]}">{esc(practice["name"])}</a>')
    topic_chips = "\n".join(
        f'        <a class="chip" href="{root}research-topic-{t["slug"]}/" data-filter-topic="{t["slug"]}">{esc(t["name"])}</a>'
        for t in data["topics"])
    office_chips = "\n".join(
        f'        <a class="chip" href="{root}offices/{o["slug"]}/" data-filter-office="{o["slug"]}">{esc(o["city"])}</a>'
        for o in data["offices"])

    rows = "\n".join(
        f"""            <tr>
              <td>{esc(e["name"])}</td><td>{esc(e["type"])}</td>
              <td>{esc(e["task"])}</td><td>{esc(e["location"])}</td>
            </tr>""" for e in data["projectIndex"])

    return f"""{pagehead("Projects", "All projects.",
        "Filter by practice, topic or office. Each filter is also a page of its own, so it can be linked and indexed — finding 4 of the audit.",
        root=root, parent="projects/", parent_label="Projects")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="filters" data-filter-group>
        <p class="t-label t-muted filters__legend">Practice</p>
{chr(10).join(chips)}
        <p class="filters__count" data-filter-count>{len(projects)} projects</p>
      </div>
      <div class="filters" data-filter-group>
        <p class="t-label t-muted filters__legend">Topic</p>
{topic_chips}
      </div>
      <div class="filters" data-filter-group>
        <p class="t-label t-muted filters__legend">Office</p>
{office_chips}
      </div>
      <div class="grid grid--3" data-filter-results>
{chr(10).join(project_card(p, root) for p in projects)}
      </div>
      <p class="t-lede is-hidden" data-filter-empty style="margin-top:var(--s-md)">
        Nothing published in that cut yet — the projects are in the
        <a class="btn-link" href="#index">full list</a> below.</p>
    </div>
  </section>

  <section class="section" id="index">
    <div class="shell">
{sec_head("Capability statement", "The full project list.")}
      <div class="table-wrap" data-reveal>
        <table class="index">
          <thead><tr><th scope="col">Project</th><th scope="col">Type</th>
            <th scope="col">Task</th><th scope="col">Location</th></tr></thead>
          <tbody>
{rows}
          </tbody>
        </table>
      </div>
    </div>
  </section>

{cta(root)}"""


def project_body(project, data, root, *, long_form: bool) -> str:
    alts = project.get("imageAlts") or []
    images = project["images"]
    hero_alt = alts[0] if alts else project["name"]

    facts = []
    if project.get("client"):
        facts.append(("Client", project["client"]))
    facts.append(("Practice", practice_name(data, project["sector"])))
    place = ", ".join(x for x in (project.get("city"), project.get("country")) if x)
    if project.get("venue"):
        place = f'{project["venue"]}, {place}'
    if place:
        facts.append(("Location", place))
    if project.get("start"):
        finish = project.get("finish")
        facts.append(("Year", project["start"] if not finish or finish == project["start"]
                      else f'{project["start"]}–{finish}'))
    if project.get("durationMonths"):
        facts.append(("Duration", f'{project["durationMonths"]} months'))
    if project.get("services"):
        facts.append(("Services", ", ".join(project["services"])))
    office = by_slug(data["offices"], project["office"])
    if office:
        facts.append(("Office", office["city"]))
    facts_html = "\n".join(f"        <div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in facts)

    body = project.get("body") or [project.get("summary", "")]
    gallery = "\n".join(
        f"""        <figure data-reveal>
          {picture(root, slug, alts[i] if i < len(alts) else project["name"], sizes="(min-width: 760px) 48vw, 92vw")}
          <figcaption class="t-caption">{esc(alts[i] if i < len(alts) else project["name"])}</figcaption>
        </figure>""" for i, slug in enumerate(images[1:], start=1))

    topics = "".join(
        f'<li><a class="btn-link" href="{root}research-topic-{t}/">{esc(topic_name(data, t))}</a></li>'
        for t in project.get("topics", []))

    crumb = "Case study" if long_form else "Projects"
    switch = ""
    if project.get("caseStudy"):
        switch = (f'<p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}projects/{project["slug"]}/">See the project page</a></p>'
                  if long_form else
                  f'<p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}case-study/{project["slug"]}/">Read the long-form case study</a></p>')

    return f"""  <section class="hero hero--short">
    <div class="hero__media">{picture(root, images[0], hero_alt, loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> <a href="{root}projects/">{crumb}</a></p>
      <h1 class="t-display">{esc(project["name"])}</h1>
      <p class="hero__standfirst">{esc(project.get("summary", ""))}</p>
    </div>
  </section>

  <section class="section--tight">
    <div class="shell">
      <dl class="factsheet">
{facts_html}
      </dl>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="split">
        <div data-reveal>
          <h2 class="t-h-lg">{esc(project.get("tagline") or "The brief")}</h2>
          <ul class="taglist" style="margin-top:var(--s-md)">{topics}</ul>
        </div>
        <div data-reveal>
{paras(body, "t-body")}
{switch}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="gallery">
{gallery}
      </div>
    </div>
  </section>"""


def page_project(project, data, root, prev, next_) -> str:
    pager = []
    if prev:
        pager.append(f"""      <a href="{root}projects/{prev["slug"]}/">
        <span class="t-label t-muted">Previous</span>
        <span class="t-h-md">{esc(prev["name"])}</span></a>""")
    if next_:
        pager.append(f"""      <a class="pager__next" href="{root}projects/{next_["slug"]}/">
        <span class="t-label t-muted">Next</span>
        <span class="t-h-md">{esc(next_["name"])}</span></a>""")
    return f"""{project_body(project, data, root, long_form=False)}

  <section class="section--tight">
    <div class="shell">
      <nav class="pager" aria-label="More projects">
{chr(10).join(pager)}
      </nav>
    </div>
  </section>

{cta(root)}"""


def page_case_study(project, data, root) -> str:
    return f"""{project_body(project, data, root, long_form=True)}

{cta(root)}"""


# ---------------------------------------------------------------------------
# People
# ---------------------------------------------------------------------------
def person_row(person, data, root) -> str:
    office = by_slug(data["offices"], person["office"])
    return f"""        <a class="people__row" href="{root}people/{person["slug"]}/" data-reveal>
          <p class="people__name">{esc(person["name"])}</p>
          <p class="people__role">{esc(person["role"])}</p>
          <p class="t-muted">{esc(office["city"]) if office else ""}</p>
        </a>"""


def page_people(data, root) -> str:
    return f"""{pagehead("People", "Who you will be working with.",
        "A small team. You will deal with the people who do the work.")}

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("All", f'{len(data["people"])} people.', link=root + "people/leadership/", link_label="Leadership")}
      <div class="people">
{chr(10).join(person_row(p, data, root) for p in data["people"])}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="grid grid--2">
        <div data-reveal>
          <p class="t-label t-muted">By topic</p>
          <ul class="taglist" style="margin-top:var(--s-sm)">
{chr(10).join(f'            <li><a class="btn-link" href="{root}research-topic-{t["slug"]}/">{esc(t["name"])}</a></li>' for t in data["topics"])}
          </ul>
        </div>
        <div data-reveal>
          <p class="t-label t-muted">By office</p>
          <ul class="taglist" style="margin-top:var(--s-sm)">
{chr(10).join(f'            <li><a class="btn-link" href="{root}offices/{o["slug"]}/leaders/">{esc(o["city"])}</a></li>' for o in data["offices"])}
          </ul>
        </div>
      </div>
    </div>
  </section>

{cta(root)}"""


def page_leadership(data, root) -> str:
    leaders = [p for p in data["people"] if p.get("leadership")]
    return f"""{pagehead("People", "Leadership.",
        "The people accountable for the work.", root=root, parent="people/", parent_label="People")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="people">
{chr(10).join(person_row(p, data, root) for p in leaders)}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("History", "Leadership through the years.")}
      <div class="timeline">
{chr(10).join(f'''        <div class="timeline__item" data-reveal>
          <p class="timeline__year">{esc(e["year"])}</p>
          <p class="timeline__title">{esc(e["title"])}</p>
          <p class="timeline__body">{esc(e["body"])}</p>
        </div>''' for e in data["timeline"] if any(
            w in e["body"] for w in ("Baker", "Craig", "Davies", "Cubitt", "Plocki", "Maltland", "Oku")))}
      </div>
    </div>
  </section>

{cta(root)}"""


def page_person(person, data, root) -> str:
    office = by_slug(data["offices"], person["office"])
    topics = "".join(
        f'<li><a class="btn-link" href="{root}expertise/{t}/">{esc(practice_name(data, t))}</a></li>'
        for t in person.get("topics", []))
    email = (f'<a class="btn-link" href="mailto:{person["email"]}">{esc(person["email"])}</a>'
             if person.get("email")
             else f'<a class="btn-link" href="mailto:{data["site"]["email"]}">{esc(data["site"]["email"])}</a>'
                  f'<br><span class="t-caption t-muted">A direct address for {esc(person["name"].split()[0])} '
                  f'has not been confirmed — see docs/content-queries.md.</span>')
    return f"""{pagehead("People", esc(person["name"]), esc(person["role"]),
        root=root, parent="people/", parent_label="People")}

  <section class="section section--flush-top">
    <div class="shell">
      <dl class="factsheet">
        <div><dt>Role</dt><dd>{esc(person["role"])}</dd></div>
        <div><dt>Office</dt><dd><a href="{root}offices/{person["office"]}/">{esc(office["city"]) if office else ""}</a></dd></div>
        <div><dt>Contact</dt><dd>{email}</dd></div>
      </dl>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="split">
        <div data-reveal><h2 class="t-h-lg">Expertise</h2></div>
        <div data-reveal>
          <ul class="taglist">{topics}</ul>
          <p class="t-sm t-muted" style="margin-top:var(--s-md)">
            A written profile has not been supplied for this page. The template takes a
            biography, a portrait and a selected-projects list as soon as there is one.</p>
        </div>
      </div>
    </div>
  </section>

{cta(root)}"""


# ---------------------------------------------------------------------------
# Offices
# ---------------------------------------------------------------------------
def page_offices(data, root) -> str:
    regions = {}
    for office in data["offices"]:
        regions.setdefault(office["region"], []).append(office)
    blocks = []
    for region, offices in regions.items():
        rows = "\n".join(
            f"""        <a class="people__row" href="{root}offices/{o["slug"]}/" data-reveal>
          <p class="people__name">{esc(o["city"])}</p>
          <p class="people__role">{esc(o["country"])}</p>
          <p class="t-muted">{len(projects_for_office(data, o["slug"]))} projects</p>
        </a>""" for o in offices)
        blocks.append(f"""  <section class="section section--flush-top">
    <div class="shell">
{sec_head(region, f'{len(offices)} {"location" if len(offices) == 1 else "locations"}.')}
      <div class="people">
{rows}
      </div>
    </div>
  </section>""")
    network = " · ".join(esc(c) for c in data["footprint"]["network"])
    return f"""{pagehead("Offices", "Where we work.",
        "The practice operates across five countries. gensler.com runs 58 offices with four child pages each — "
        "roughly 290 URLs; finding 5 of the audit flags that scale. This section keeps the same template at a size that stays true.")}

{chr(10).join(blocks)}

  <section class="section">
    <div class="shell">
      <div class="split split--narrow-first">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Network</p>
          <h2 class="statement" style="margin-top:var(--s-sm)">Drawn from a global group.</h2>
        </div>
        <div data-reveal>
          <p class="t-body">James Cubitt group offices: {network}. These are the wider practice's addresses, not JCI studios, so they do not have pages here.</p>
        </div>
      </div>
    </div>
  </section>

{cta(root)}"""


def page_office(office, data, root, tab=None) -> str:
    projects = projects_for_office(data, office["slug"])
    people = [p for p in data["people"] if p["office"] == office["slug"]]
    tabs = "\n".join(
        f'        <a class="chip" href="{root}offices/{office["slug"]}/{t["slug"]}/"'
        f'{" aria-current=\"true\"" if tab == t["slug"] else ""}>{esc(t["label"])}</a>'
        for t in data["officeTabs"])
    overview = (f'<a class="chip" href="{root}offices/{office["slug"]}/"'
                f'{" aria-current=\"true\"" if tab is None else ""}>Overview</a>')

    if tab == "leaders":
        heading, label = "Leaders.", "Leaders"
        inner = (f'      <div class="people">\n'
                 + "\n".join(person_row(p, data, root) for p in people) + "\n      </div>"
                 ) if people else empty_state(f'No one is listed against the {office["city"]} office yet.')
    elif tab == "projects":
        heading, label = "Projects.", "Projects"
        inner = (f'      <div class="grid grid--3">\n'
                 + "\n".join(project_card(p, root) for p in projects) + "\n      </div>"
                 ) if projects else empty_state(
            office.get("note") or f'No published project in {office["city"]} yet.',
            cta=root + "projects/all/", cta_label="All projects")
    elif tab == "news":
        heading, label = "News.", "News"
        inner = empty_state(f'No news has been published for {office["city"]}. '
                            f'Press releases filed against this office will appear here.',
                            cta=root + "press-releases/", cta_label="Press releases")
    elif tab == "research-insight":
        heading, label = "Research &amp; insight.", "Research & Insight"
        inner = empty_state(f'No research has been filed against {office["city"]} yet.',
                            cta=root + "gri/", cta_label="Research & Insights")
    else:
        heading, label = esc(office["city"]), "Overview"
        stats = f"""      <div class="stats">
        <div class="stats__item"><p class="stats__value">{len(projects)}</p><p class="t-label t-muted">Projects</p></div>
        <div class="stats__item"><p class="stats__value">{len(people)}</p><p class="t-label t-muted">People</p></div>
        <div class="stats__item"><p class="stats__value">{esc(office["country"])}</p><p class="t-label t-muted">Country</p></div>
        <div class="stats__item"><p class="stats__value">{esc(office["region"])}</p><p class="t-label t-muted">Region</p></div>
      </div>"""
        recent = ('      <div class="grid grid--3">\n'
                  + "\n".join(project_card(p, root) for p in projects[:3]) + "\n      </div>"
                  ) if projects else empty_state(office.get("note") or "No published project here yet.")
        inner = stats + "\n" + sec_head("Selected work", "From this office.",
                                        link=f'{root}offices/{office["slug"]}/projects/',
                                        link_label="All projects") + "\n" + recent

    crumb_label = f'{office["city"]} · {label}' if tab else office["city"]
    return f"""{pagehead("Offices", heading if tab else esc(office["city"]),
        esc(office["lede"]), root=root, parent="offices/", parent_label="Offices")}

  <section class="section--tight">
    <div class="shell">
      <div class="filters" aria-label="{esc(crumb_label)}">
        {overview}
{tabs}
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{inner}
    </div>
  </section>

  <section class="section--tight">
    <div class="shell">
      <dl class="factsheet">
        <div><dt>Email</dt><dd><a class="btn-link" href="mailto:{esc(data["site"]["email"])}">{esc(data["site"]["email"])}</a></dd></div>
        <div><dt>Telephone</dt><dd><a class="btn-link" href="tel:{esc(data["site"]["phoneHref"])}">{esc(data["site"]["phone"])}</a></dd></div>
        <div><dt>Country</dt><dd>{esc(office["country"])}</dd></div>
      </dl>
    </div>
  </section>

{cta(root)}"""


# ---------------------------------------------------------------------------
# About, Careers, Contact and the standing pages
# ---------------------------------------------------------------------------
def page_about(data, root) -> str:
    timeline = "\n".join(
        f"""        <div class="timeline__item" data-reveal>
          <p class="timeline__year">{esc(e["year"])}</p>
          <p class="timeline__title">{esc(e["title"])}</p>
          <p class="timeline__body">{esc(e["body"])}</p>
        </div>""" for e in data["timeline"])
    values = "\n".join(
        f"""        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> {esc(v["name"])}</p>
          <p class="t-body" style="margin-top:var(--s-sm)">{esc(v["body"])}</p>
        </div>""" for v in data["values"])
    operating = "".join(f'<li>{esc(c)}</li>' for c in data["footprint"]["operating"])
    return f"""{pagehead("About", "Firm profile.",
        "We are not just designers. We are innovators, crafts people and thinkers.")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="split">
        <div data-reveal><h2 class="t-h-lg">About us</h2></div>
        <div data-reveal>
{paras(data["about"], "t-body")}
        </div>
      </div>
    </div>
  </section>

  <section class="band">
    {picture(root, "hotel-takum-04", "Restaurant under a ceiling of woven rattan discs at Hotel Takum", sizes="100vw")}
    <div class="band__body">
      <blockquote class="quote quote--wide">“{esc(data["pullQuote"])}”</blockquote>
    </div>
  </section>

  <section class="section" id="principles">
    <div class="shell">
{sec_head("Guiding principles", "What the work is measured against.")}
      <div class="grid grid--4">
{values}
      </div>
      <div class="split" style="margin-top:var(--s-lg)">
        <div data-reveal><h2 class="t-h-lg">Why we work</h2></div>
        <div data-reveal>
{paras(data["why"], "t-body")}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("History", "Seventy-nine years, and counting.")}
      <div class="timeline">
{timeline}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="split split--narrow-first">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Footprint</p>
          <h2 class="statement" style="margin-top:var(--s-sm)">Built in West Africa.</h2>
        </div>
        <div data-reveal>
          <ul class="taglist">{operating}</ul>
          <p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}offices/">See the offices</a></p>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("Clientele", "Who we work for.")}
      <ul class="clientgrid" data-reveal>
{chr(10).join(f'        <li>{esc(c)}</li>' for c in data["clients"])}
      </ul>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="grid grid--4">
        <a class="card card--text" href="{root}in-the-media/" data-reveal><div class="card__body">
          <h3 class="card__title">In The Media</h3></div></a>
        <a class="card card--text" href="{root}press-releases/" data-reveal><div class="card__body">
          <h3 class="card__title">Press Releases</h3></div></a>
        <a class="card card--text" href="{root}about/community/" data-reveal><div class="card__body">
          <h3 class="card__title">Community</h3></div></a>
        <a class="card card--text" href="{root}about/inclusion/" data-reveal><div class="card__body">
          <h3 class="card__title">Inclusion</h3></div></a>
      </div>
    </div>
  </section>

{cta(root)}"""


def page_simple(label, heading, lede, body_html, root, *, parent=None, parent_label=None) -> str:
    return f"""{pagehead(label, heading, lede, root=root, parent=parent, parent_label=parent_label)}

  <section class="section section--flush-top">
    <div class="shell">
{body_html}
    </div>
  </section>

{cta(root)}"""


def page_careers(data, root) -> str:
    sub = "\n".join(
        f"""        <a class="card card--text" href="{root}{c["path"].lstrip("/")}" data-reveal>
          <div class="card__body"><h3 class="card__title">{esc(c["name"])}</h3></div></a>"""
        for c in data["careersPages"])
    roles = (("\n".join(
        f'        <div class="deflist__row"><h3 class="deflist__term">{esc(r["title"])}</h3>'
        f'<div class="deflist__desc">{esc(r.get("location", ""))}</div></div>' for r in data["roles"]))
        if data["roles"] else empty_state(
        "There are no open roles listed right now. We still read every portfolio that arrives.",
        cta="mailto:" + data["site"]["email"], cta_label="Send us your work"))
    return f"""{pagehead("Careers", "Join our team.",
        "Interior architects, designers and strategists. Sixty years of West African work to build on.")}

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("Open roles", "Current vacancies.")}
{roles}
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("More", "Working here.")}
      <div class="grid grid--4">
{sub}
      </div>
    </div>
  </section>

{cta(root)}"""


def page_contact(data, root) -> str:
    site = data["site"]
    people = "\n".join(person_row(p, data, root) for p in data["people"])
    offices = "\n".join(
        f'            <li><a class="btn-link" href="{root}offices/{o["slug"]}/">{esc(o["city"])}</a></li>'
        for o in data["offices"])
    return f"""{pagehead("Contact", "Tell us what the space has to do.",
        "Whether you have a floor, a building or only a problem with the one you are in, start with an email.")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="split">
        <div class="contact-lines" data-reveal>
          <a href="mailto:{esc(site["email"])}">{esc(site["email"])}</a>
          <a href="tel:{esc(site["phoneHref"])}">{esc(site["phone"])}</a>
        </div>
        <div data-reveal>
          <p class="t-label t-muted">Offices</p>
          <ul class="taglist" style="margin:var(--s-sm) 0 var(--s-md)">
{offices}
          </ul>
          <p class="t-body">For new enquiries, the fastest route is email. Tell us the building, the floor
          area, the headcount and the date you need to be in — that is usually enough for a first conversation.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Direct", "Speak to someone.", link=root + "people/", link_label="All people")}
      <div class="people">
{people}
      </div>
    </div>
  </section>

  <section class="band">
    {picture(root, "mtn-cote-divoire-01", "Planted atrium workspace at MTN CI Place in Abidjan", sizes="100vw")}
    <div class="band__body">
      <p class="t-label" style="color:rgba(255,255,255,.7)"><span class="mark"></span> we design, you experience</p>
      <p class="quote" style="margin-top:var(--s-sm)">Improving well-being through interior design.</p>
    </div>
  </section>"""


def page_fact_sheet(data, root) -> str:
    rows = [
        ("Legal name", "James Cubitt Interiors"),
        ("Founded", "2010 as an independent company; the James Cubitt practice dates from 1947"),
        ("Discipline", "Commercial interior architecture and design"),
        ("Sectors", ", ".join(p["name"] for p in data["practices"] if p["kind"] == "sector")),
        ("Services", ", ".join(p["name"] for p in data["practices"] if p["kind"] == "service")),
        ("Operating countries", ", ".join(data["footprint"]["operating"])),
        ("Offices", ", ".join(o["city"] for o in data["offices"])),
        ("Projects published", str(len(data["projects"]))),
        ("Projects in the capability statement", str(len(data["projectIndex"]))),
        ("Clients", str(len(data["clients"]))),
        ("Email", data["site"]["email"]),
        ("Telephone", data["site"]["phone"]),
    ]
    body = ('      <div class="deflist" data-reveal>\n' + "\n".join(
        f'        <div class="deflist__row"><h2 class="deflist__term">{esc(k)}</h2>'
        f'<div class="deflist__desc">{esc(v)}</div></div>' for k, v in rows) + "\n      </div>")
    return page_simple("Document", "Fact sheet.",
                       "The practice in numbers. Everything on this page is drawn from the brochures.",
                       body, root, parent="research-library/", parent_label="Research Library")


def page_404(root) -> str:
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> 404</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">That page has been fitted out elsewhere.</h1>
      <p class="t-lede pagehead__lede">The link you followed does not lead anywhere on this site.</p>
      <div class="hero__actions" style="margin-top:var(--s-md)">
        <a class="btn btn--primary" href="{root}">Home</a>
        <a class="btn btn--secondary" href="{root}projects/">See the projects</a>
      </div>
    </div>
  </section>"""


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def write(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


def video_jsonld(data: dict) -> str:
    film, site = data["film"], data["site"]
    payload = {
        "@context": "https://schema.org", "@type": "VideoObject",
        "name": film["name"], "description": film["standfirst"],
        "thumbnailUrl": f'{site["url"]}/assets/video/{film["poster"]}.webp',
        "contentUrl": f'{site["url"]}/{film["sources"][-1]["src"]}',
        "duration": film["durationISO"],
        "publisher": {"@type": "Organization", "name": site["name"], "url": site["url"]},
    }
    return '<script type="application/ld+json">' + json.dumps(payload, ensure_ascii=False) + "</script>"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="dist")
    args = parser.parse_args()

    out = os.path.join(ROOT, args.out)
    with open(CONTENT, encoding="utf-8") as handle:
        data = json.load(handle)
    with open(os.path.join(TEMPLATES, "base.html"), encoding="utf-8") as handle:
        base = handle.read()
    site = data["site"]

    if os.path.isdir(out):
        shutil.rmtree(out)
    os.makedirs(out)
    shutil.copytree(ASSETS, os.path.join(out, "assets"))

    pages = []   # (path, nav-key, title, description, body, og-image, search-entry)

    def add(path, nav, title, desc, body, og, *, category=None, topics=(), office=None, date=""):
        pages.append((path, nav, title, desc, body, og,
                      {"category": category, "topics": list(topics),
                       "office": office, "date": date} if category else None))

    add("index.html", "/", f'{site["name"]} — {site["tagline"]}', site["description"],
        page_home(data, rel(0)), data["home"]["heroImage"])

    # --- Research & Insights ------------------------------------------------
    add("gri/index.html", "/gri/", f'Research & Insights — {site["name"]}',
        "The research arm of James Cubitt Interiors.", page_gri(data, rel(1)),
        "iff-01", category="Research", date="2026")
    add("latest-research-insights/index.html", "/gri/",
        f'Latest Research & Insights — {site["name"]}',
        "Everything James Cubitt Interiors publishes, newest first.",
        page_latest(data, rel(1)), "iff-01", category="Research", date="2026")
    add("blog/index.html", "/gri/", f'Journal — {site["name"]}',
        "Short-form notes from the James Cubitt Interiors studio.",
        page_blog(data, rel(1)), "diageo-spirit-01", category="Journal", date="2026")
    add("research-library/index.html", "/gri/", f'Research Library — {site["name"]}',
        "Downloadable documents from James Cubitt Interiors.",
        page_research_library(data, rel(1)), "nlng-campus-01", category="Research")
    for topic in data["topics"]:
        add(f'research-topic-{topic["slug"]}/index.html', "/gri/",
            f'{topic["name"]} — {site["name"]}', topic["lede"],
            page_topic(topic, data, rel(1)), "iff-01",
            category="Research topic", topics=[topic["slug"]])

    # --- Expertise ----------------------------------------------------------
    add("expertise/index.html", "/expertise/", f'Expertise — {site["name"]}',
        "Six sectors and eight services from James Cubitt Interiors.",
        page_expertise_index(data, rel(1)), "mtn-cote-divoire-01", category="Expertise")
    for practice in data["practices"]:
        add(f'expertise/{practice["slug"]}/index.html', "/expertise/",
            f'{practice["name"]} — {site["name"]}', practice["lede"],
            page_practice(practice, data, rel(2)),
            practice["image"] or "mtn-cote-divoire-01", category="Expertise")

    # --- Projects -----------------------------------------------------------
    add("projects/index.html", "/projects/", f'Projects — {site["name"]}',
        "Selected interiors by James Cubitt Interiors across Nigeria, Ghana and Côte d'Ivoire.",
        page_projects(data, rel(1)), "guinness-hq-01", category="Projects")
    add("projects/all/index.html", "/projects/", f'All projects — {site["name"]}',
        "Every published James Cubitt Interiors project, filterable by practice, topic and office.",
        page_projects_all(data, rel(2)), "guinness-hq-01", category="Projects")
    projects = data["projects"]
    for index, project in enumerate(projects):
        prev = projects[index - 1] if index else None
        next_ = projects[index + 1] if index + 1 < len(projects) else None
        add(f'projects/{project["slug"]}/index.html', "/projects/",
            f'{project["name"]} — {site["name"]}',
            project.get("summary") or f'{project["name"]} by James Cubitt Interiors.',
            page_project(project, data, rel(2), prev, next_), project["images"][0],
            category="Project", topics=project.get("topics", []),
            office=project["office"], date=str(project.get("finish") or project.get("start") or ""))
        if project.get("caseStudy"):
            add(f'case-study/{project["slug"]}/index.html', "/projects/",
                f'{project["name"]} — case study — {site["name"]}',
                project.get("summary", ""), page_case_study(project, data, rel(2)),
                project["images"][0], category="Case study",
                topics=project.get("topics", []), office=project["office"],
                date=str(project.get("finish") or project.get("start") or ""))

    # --- People -------------------------------------------------------------
    add("people/index.html", "/people/", f'People — {site["name"]}',
        "The people at James Cubitt Interiors.", page_people(data, rel(1)),
        "afreximbank-hq-01", category="People")
    add("people/leadership/index.html", "/people/", f'Leadership — {site["name"]}',
        "Leadership at James Cubitt Interiors.", page_leadership(data, rel(2)),
        "afreximbank-hq-01", category="People")
    for person in data["people"]:
        add(f'people/{person["slug"]}/index.html', "/people/",
            f'{person["name"]} — {site["name"]}', f'{person["name"]}, {person["role"]}.',
            page_person(person, data, rel(2)), "afreximbank-hq-01",
            category="People", office=person["office"])

    # --- Offices ------------------------------------------------------------
    add("offices/index.html", "/offices/", f'Offices — {site["name"]}',
        "James Cubitt Interiors works across Nigeria, Ghana, Côte d'Ivoire, Senegal and Zimbabwe.",
        page_offices(data, rel(1)), "mtn-cote-divoire-01", category="Offices")
    for office in data["offices"]:
        add(f'offices/{office["slug"]}/index.html', "/offices/",
            f'{office["city"]} — {site["name"]}', office["lede"],
            page_office(office, data, rel(2)), "mtn-cote-divoire-01",
            category="Office", office=office["slug"])
        for tab in data["officeTabs"]:
            add(f'offices/{office["slug"]}/{tab["slug"]}/index.html', "/offices/",
                f'{office["city"]} · {tab["label"]} — {site["name"]}', office["lede"],
                page_office(office, data, rel(3), tab["slug"]), "mtn-cote-divoire-01",
                category="Office", office=office["slug"])

    # --- About and its children --------------------------------------------
    add("about/index.html", "/about/", f'About — {site["name"]}',
        "James Cubitt Interiors: firm profile, guiding principles, history and clientele.",
        page_about(data, rel(1)), "hotel-takum-04", category="About")
    add("in-the-media/index.html", "/about/", f'In The Media — {site["name"]}',
        "James Cubitt Interiors in the press.",
        page_simple("About", "In the media.", "Where the practice has been written about.",
                    empty_state("No media coverage has been filed yet. Entries added to the media list "
                                "in content/site.json appear here and in the homepage feed."),
                    rel(1), parent="about/", parent_label="About"),
        "hotel-takum-04", category="About")
    add("press-releases/index.html", "/about/", f'Press Releases — {site["name"]}',
        "Press releases from James Cubitt Interiors.",
        page_simple("About", "Press releases.", "Announcements from the practice.",
                    empty_state("No press release has been published yet. The template is in place at "
                                "/press-releases/{slug}/."),
                    rel(1), parent="about/", parent_label="About"),
        "hotel-takum-04", category="About")
    add("about/community/index.html", "/about/", f'Community — {site["name"]}',
        "James Cubitt Interiors in its community.",
        page_simple("About", "Community.", "What the practice does beyond the projects.",
                    empty_state("No community programme has been documented yet."),
                    rel(2), parent="about/", parent_label="About"),
        "hotel-takum-04", category="About")
    add("about/inclusion/index.html", "/about/", f'Inclusion — {site["name"]}',
        "Inclusion at James Cubitt Interiors.",
        page_simple("About", "Inclusion.", "How the practice thinks about who it hires and who it designs for.",
                    empty_state("No inclusion statement has been supplied. This page is reserved for it."),
                    rel(2), parent="about/", parent_label="About"),
        "hotel-takum-04", category="About")
    add("ethics-compliance/index.html", "/about/", f'Ethics & Compliance — {site["name"]}',
        "Ethics and compliance at James Cubitt Interiors.",
        page_simple("About", "Ethics &amp; compliance.", "How the practice holds itself to account.",
                    empty_state("No ethics and compliance statement has been supplied. This page is reserved for it."),
                    rel(1), parent="about/", parent_label="About"),
        "hotel-takum-04", category="About")

    # --- Careers ------------------------------------------------------------
    add("careers/index.html", "/careers/", f'Careers — {site["name"]}',
        "Work at James Cubitt Interiors.", page_careers(data, rel(1)),
        "mtn-accra-hq-02", category="Careers")
    careers_copy = {
        "how-to-apply": ("How to apply.", "What to send, and what happens next.",
                         "No application process has been documented. Until it is, send a portfolio and a note to the studio."),
        "internships": ("Internships.", "For students and recent graduates.",
                        "No internship programme has been documented yet."),
        "great-people-great-rewards": ("Benefits.", "What the practice offers its people.",
                                       "No benefits statement has been supplied."),
        "recruitment-privacy-statement": ("Recruitment privacy.", "What happens to the data in your application.",
                                          "No recruitment privacy statement has been supplied. This page is reserved for it, and should be in place before any application form goes live."),
    }
    for page in data["careersPages"]:
        heading, lede, empty = careers_copy[page["slug"]]
        add(f'{page["slug"]}/index.html', "/careers/", f'{page["name"]} — {site["name"]}', lede,
            page_simple("Careers", heading, lede,
                        empty_state(empty, cta="mailto:" + site["email"], cta_label="Email the studio"),
                        rel(1), parent="careers/", parent_label="Careers"),
            "mtn-accra-hq-02", category="Careers")

    # --- Standing pages -----------------------------------------------------
    add("contact/index.html", "/contact/", f'Contact — {site["name"]}',
        f'Contact James Cubitt Interiors — {site["email"]}, {site["phone"]}.',
        page_contact(data, rel(1)), "mtn-cote-divoire-01", category="Contact")
    add("doc/jci-fact-sheet/index.html", "/gri/", f'Fact sheet — {site["name"]}',
        "James Cubitt Interiors in numbers.", page_fact_sheet(data, rel(2)),
        "nlng-campus-01", category="Document")
    add("privacy/index.html", "/about/", f'Privacy — {site["name"]}',
        "Privacy and cookies at James Cubitt Interiors.",
        page_simple("Legal", "Privacy.", "How this site handles your data.",
                    empty_state("No privacy policy has been supplied. This page is reserved for it, and "
                                "should be in place before the site goes live.") +
                    '\n      <h2 class="t-h-lg" id="cookies" style="margin-top:var(--s-lg)">Cookie preferences</h2>'
                    '\n      <p class="t-body">This site sets no cookies and loads no analytics. '
                    'The only third-party request is to Google Fonts for two typefaces.</p>',
                    rel(1)),
        "guinness-hq-01", category="Legal")
    add("transparency-statement/index.html", "/about/", f'Transparency Statement — {site["name"]}',
        "Transparency statement.",
        page_simple("Legal", "Transparency statement.", "Modern slavery and supply chain.",
                    empty_state("No transparency statement has been supplied. This page is reserved for it."),
                    rel(1)),
        "guinness-hq-01", category="Legal")
    add("404.html", "/", f'Page not found — {site["name"]}', "That page does not exist.",
        page_404(rel(0)), "guinness-hq-01")

    # --- Render -------------------------------------------------------------
    urls, index_entries = [], []
    for path, nav_key, title, description, body, og, search in pages:
        depth = path.count("/")
        root = rel(depth)
        url = site["url"] + "/" + ("" if path == "index.html" else path.replace("index.html", ""))
        html = (base
                .replace("{{title}}", esc(title))
                .replace("{{description}}", esc(description))
                .replace("{{canonical}}", esc(url))
                .replace("{{ogimage}}", f'{site["url"]}/{IMG}/{og}.webp')
                .replace("{{header}}", header_html(data, root, nav_key))
                .replace("{{footer}}", footer_html(data, root))
                .replace("{{root}}", root)
                .replace("{{body}}", body)
                .replace("{{head}}", video_jsonld(data) if path == "index.html" else "")
                .replace("{{scripts}}", ""))
        write(os.path.join(out, path), html)
        if not path.endswith("404.html"):
            urls.append(url)
            if search:
                index_entries.append({
                    "title": title.split(" — ")[0],
                    "url": "/" + path.replace("index.html", ""),
                    "category": search["category"],
                    "topics": search["topics"],
                    "office": search["office"] or "",
                    "date": search["date"],
                    "summary": description,
                })

    write(os.path.join(out, "search-index.json"),
          json.dumps(index_entries, ensure_ascii=False, separators=(",", ":")))
    write(os.path.join(out, "sitemap.xml"),
          '<?xml version="1.0" encoding="UTF-8"?>\n'
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + "".join(f"  <url><loc>{esc(u)}</loc></url>\n" for u in urls) + "</urlset>\n")
    write(os.path.join(out, "robots.txt"),
          f'User-agent: *\nAllow: /\nSitemap: {site["url"]}/sitemap.xml\n')

    print(f"built {len(pages)} pages, {len(index_entries)} indexed -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
