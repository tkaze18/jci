#!/usr/bin/env python3
"""
Build the James Cubitt Interiors site.

    python3 scripts/build.py            # -> dist/
    python3 scripts/build.py --out www  # -> www/

The site is services-led, following the supplied homepage flow diagram:

    HERO / POSITIONING  ->  what JCI does + proof + CTA
    TRUST / CLIENTS     ->  logos + credibility
    SERVICES            ->  Strategy | Design | Construction
    ...

Blocks after SERVICES are inferred: the diagram supplied was cropped below
that point. docs/information-architecture.md marks which ones, so they are
easy to correct when the rest arrives.

Everything the site says comes from content/site.json; everything it looks
like comes from assets/css/tokens.css, which is the Framer design system in
/DESIGN.md with JCI's red as its single accent. Pure standard library —
there is nothing to install.
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
    return "../" * depth if depth else "./"


def paras(items, cls="t-body"):
    return "\n".join(f'<p class="{cls}">{esc(p)}</p>' for p in items if p)


def picture(root, slug, alt, *, card=False, loading="lazy", sizes=None) -> str:
    base = f"{root}{IMG}/{slug}"
    attrs = [
        f'src="{base}{"-card" if card else ""}.webp"',
        f'srcset="{base}-card.webp 900w, {base}.webp 1800w"',
        f'sizes="{sizes or "100vw"}"',
        f'alt="{esc(alt)}"', f'loading="{loading}"', 'decoding="async"',
    ]
    if loading == "eager":
        attrs.append('fetchpriority="high"')
    return "<img " + " ".join(attrs) + ">"


def by_slug(items, slug):
    for item in items:
        if item["slug"] == slug:
            return item
    return None


def project_meta(project):
    bits = []
    place = ", ".join(x for x in (project.get("city"), project.get("country")) if x)
    if place:
        bits.append(place)
    if project.get("start"):
        finish = project.get("finish")
        bits.append(project["start"] if not finish or finish == project["start"]
                    else f'{project["start"]}–{finish}')
    return bits


def project_sectors(project):
    return [project["sector"]] + list(project.get("alsoIn", []))


def sectors(data):
    return [p for p in data["practices"] if p["kind"] == "sector"]


def projects_for_sector(data, slug):
    return [p for p in data["projects"] if slug in project_sectors(p)]


PILLAR_SCOPE = {
    "strategy": ("space optimisation", "design consultancy", "design submission"),
    "design": ("design", "design consultancy", "interior design services"),
    "construction": ("build", "fit-out", "sourcing", "procurement"),
}


def projects_for_pillar(data, pillar):
    """Projects whose recorded scope in the brochure touches this stage."""
    wants = PILLAR_SCOPE[pillar["slug"]]
    return [p for p in data["projects"]
            if any(w in s.lower() for s in p.get("services", []) for w in wants)]


# ---------------------------------------------------------------------------
# Chrome
# ---------------------------------------------------------------------------
def header_html(data, root, current) -> str:
    links = "\n".join(
        f'        <a class="nav__link" href="{root}{item["href"].lstrip("/")}"'
        f'{" aria-current=\"page\"" if item["href"] == current else ""}>{esc(item["label"])}</a>'
        for item in data["nav"])
    return f"""<header class="header">
  <div class="header__inner">
    <a class="logo" href="{root}" aria-label="James Cubitt Interiors — home">
      <img class="logo__mark" src="{root}assets/img/brand/logo-mark-card.webp" alt="" width="30" height="30" decoding="async">
      <span class="logo__text">James Cubitt<span>Interiors</span></span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button>
    <nav class="nav" id="primary-nav" aria-label="Primary">
{links}
    </nav>
    <div class="header__tools">
      <button class="iconbtn" type="button" data-search-open aria-label="Search this site">
        <span aria-hidden="true">⌕</span><span class="iconbtn__label">Search</span>
      </button>
      <a class="btn btn--primary header__cta" href="{root}contact/">Start a project</a>
    </div>
  </div>
</header>

<div class="searchlay" id="searchlay" hidden>
  <div class="searchlay__inner shell">
    <div class="searchlay__bar">
      <label class="visually-hidden" for="search-q">Search this site</label>
      <input class="searchlay__input" id="search-q" type="search" autocomplete="off"
             placeholder="Search services, sectors, projects…" data-search-input>
      <button class="btn btn--secondary" type="button" data-search-close>Close</button>
    </div>
    <div class="searchlay__filters">
      <div class="searchlay__filter">
        <label class="t-label t-muted" for="f-category">Category</label>
        <select id="f-category" data-search-filter="category"><option value="">All</option></select>
      </div>
      <div class="searchlay__filter">
        <label class="t-label t-muted" for="f-sort">Sort by</label>
        <select id="f-sort" data-search-sort>
          <option value="relevance">Relevance</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
    <p class="t-sm t-muted searchlay__popular">Popular searches:
      <a href="#" data-search-term="workplace">workplace</a>,
      <a href="#" data-search-term="hospitality">hospitality</a>,
      <a href="#" data-search-term="fit-out">fit-out</a>,
      <a href="#" data-search-term="MTN">MTN</a>
    </p>
    <div class="searchlay__results" data-search-results aria-live="polite"></div>
  </div>
</div>"""


def footer_html(data, root) -> str:
    site = data["site"]
    cols = "\n".join(
        f"""      <div class="footer__col">
        <h2>{esc(col["heading"])}</h2>
        <ul>
{chr(10).join(f'          <li><a href="{root}{l["href"].lstrip("/")}">{esc(l["label"])}</a></li>' for l in col["links"])}
        </ul>
      </div>""" for col in data["footer"]["columns"])
    social = " · ".join(f'<a href="{s["href"]}" rel="noopener" target="_blank">{esc(s["label"])}</a>'
                        for s in data["footer"]["social"])
    legal = " · ".join(f'<a href="{root}{l["href"].lstrip("/")}">{esc(l["label"])}</a>'
                       for l in data["footer"]["legal"])
    return f"""<footer class="footer">
  <div class="shell">
    <div class="footer__grid">
      <div class="footer__col footer__col--brand">
        <p class="footer__promise">Improving well-being through interior design.</p>
        <p class="t-sm t-muted">Part of the James Cubitt group — founded in London in 1947, in West Africa since 1950.</p>
      </div>
{cols}
      <div class="footer__col">
        <h2>Get in touch</h2>
        <ul>
          <li><a href="mailto:{esc(site["email"])}">{esc(site["email"])}</a></li>
          <li><a href="tel:{esc(site["phoneHref"])}">{esc(site["phone"])}</a></li>
          <li><span class="t-muted">Lagos · Abuja · Accra · Abidjan</span></li>
        </ul>
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
          <p class="t-label t-muted"><span class="mark"></span> {esc(label)}</p>
          {right}
        </div>
        <{tag} class="t-section">{heading}</{tag}>
      </div>"""


def pagehead(label, heading, lede="", *, root=None, parent=None, parent_label=None) -> str:
    crumb = f'<a href="{root}{parent}">{esc(parent_label)}</a>' if parent else esc(label)
    lede_html = f'<p class="t-lede pagehead__lede">{lede}</p>' if lede else ""
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-muted"><span class="mark"></span> {crumb}</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">{heading}</h1>
      {lede_html}
    </div>
  </section>"""


def project_card(project, root, *, sizes="(min-width: 1040px) 30vw, (min-width: 620px) 48vw, 92vw") -> str:
    alt = (project.get("imageAlts") or [project["name"]])[0]
    meta = "".join(f"<span>{esc(m)}</span>" for m in project_meta(project))
    return f"""        <a class="card" href="{root}work/{project["slug"]}/"
           data-sectors="{" ".join(project_sectors(project))}" data-reveal>
          <div class="card__media">{picture(root, project["images"][0], alt, card=True, sizes=sizes)}</div>
          <div class="card__body">
            <h3 class="card__title">{esc(project["name"])}</h3>
            <p class="card__meta">{meta}</p>
          </div>
        </a>"""


def trust_band(data, root, *, heading=True) -> str:
    """TRUST / CLIENTS — block 02 of the supplied flow.

    Real marks, lifted from the clientele page of the practice's own
    commercial brochure and rendered white-on-transparent for the canvas.
    """
    logos = "\n".join(
        f"""          <li><img src="{root}assets/img/clients/{c["slug"]}.png" alt="{esc(c["name"])}"
              loading="lazy" decoding="async" width="160"></li>""" for c in data["clientLogos"])
    head = sec_head("Clients", esc(data["home"]["trustHeading"])) if heading else ""
    return f"""  <section class="section section--tight">
    <div class="shell">
{head}
      <ul class="logowall" data-reveal>
{logos}
      </ul>
      <p class="t-caption t-muted" style="margin-top:var(--s-md)">{esc(data["home"]["trustNote"])}</p>
    </div>
  </section>"""


def cta(root, *, heading="Tell us what the space has to do.") -> str:
    return f"""  <section class="cta">
    <div class="shell">
      <div class="cta__inner">
        <div data-reveal>
          <p class="t-label t-muted"><span class="mark"></span> Start a project</p>
          <h2 class="statement" style="margin-top:var(--s-sm)">{esc(heading)}</h2>
        </div>
        <div class="hero__actions" data-reveal>
          <a class="btn btn--primary" href="mailto:info@jamescubittinteriors.com">Email the studio</a>
          <a class="btn btn--secondary" href="{root}contact/">Contact</a>
        </div>
      </div>
    </div>
  </section>"""


# ---------------------------------------------------------------------------
# Home — the supplied flow
# ---------------------------------------------------------------------------
def page_home(data, root) -> str:
    home = data["home"]

    # ---- 01 HERO / POSITIONING: what JCI does + proof + CTA --------------
    proof = "\n".join(f"          <li>{esc(p)}</li>" for p in home["proof"])
    hero = f"""  <section class="hero">
    <div class="hero__media">{picture(root, home["heroImage"], home["heroImageAlt"], loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> {esc(home["heroEyebrow"])}</p>
      <h1 class="t-display">{home["heroHeadline"]}</h1>
      <p class="hero__standfirst">{esc(home["positioning"])}</p>
      <ul class="prooflist">
{proof}
      </ul>
      <div class="hero__actions">
        <a class="btn btn--primary" href="{root}{home["ctaPrimary"]["href"].lstrip("/")}">{esc(home["ctaPrimary"]["label"])}</a>
        <a class="btn btn--secondary" href="{root}{home["ctaSecondary"]["href"].lstrip("/")}">{esc(home["ctaSecondary"]["label"])}</a>
      </div>
    </div>
    <p class="t-caption hero__caption">Guinness Head Office, Lagos</p>
  </section>"""

    # ---- 03 SERVICES: Strategy | Design | Construction --------------------
    pillar_cards = "\n".join(
        f"""        <a class="card card--wide" href="{root}services/{p["slug"]}/" data-reveal>
          <div class="card__media">{picture(root, p["image"], p["imageAlt"], card=True, sizes="(min-width: 760px) 32vw, 92vw")}</div>
          <div class="card__body">
            <h3 class="card__title">{esc(p["name"])}</h3>
            <p class="card__meta"><span>{esc(p["lede"])}</span></p>
            <p class="t-caption t-muted">{esc(" · ".join(x["name"] for x in p["detail"]))}</p>
          </div>
        </a>""" for p in data["pillars"])
    services = f"""  <section class="section">
    <div class="shell">
{sec_head("Services", "Strategy. Design. Construction.", link=root + "services/", link_label="All services")}
      <div class="grid grid--3">
{pillar_cards}
      </div>
    </div>
  </section>"""

    # ---- 04 WORK / PROOF — inferred (diagram cropped below SERVICES) -----
    featured = [p for p in data["projects"] if p.get("featured")][:6]
    work = f"""  <section class="section section--flush-top">
    <div class="shell">
{sec_head("Work", "Fifty interiors across five countries.", link=root + "work/", link_label="All work")}
      <div class="grid grid--3">
{chr(10).join(project_card(p, root) for p in featured)}
      </div>
    </div>
  </section>"""

    # ---- 05 PROCESS — inferred -------------------------------------------
    steps = "\n".join(
        f"""        <div class="process__step" data-reveal>
          <p class="process__num">{esc(s["step"])}</p>
          <h3 class="t-h-md">{esc(s["name"])}</h3>
          <p class="t-sm t-muted">{esc(s["body"])}</p>
        </div>""" for s in data["process"])
    process = f"""  <section class="section">
    <div class="shell">
{sec_head("Process", "How a project runs.")}
      <div class="process">
{steps}
      </div>
    </div>
  </section>"""

    # ---- 06 THE PRACTICE + FILM — inferred -------------------------------
    film = data["film"]
    sources = "\n".join(f'            <source src="{root}{s["src"]}" type="{s["type"]}">'
                        for s in film["sources"])
    about = f"""  <section class="section section--flush-top" id="film">
    <div class="shell">
      <div class="split">
        <div data-reveal>
          <p class="t-label t-muted"><span class="mark"></span> The practice</p>
          <h2 class="t-section" style="margin-top:var(--s-sm)">{esc(home["missionHeadline"])}</h2>
          <p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}about/">About James Cubitt Interiors</a></p>
        </div>
        <div data-reveal>
{paras(home["missionBody"], "t-body")}
        </div>
      </div>
      <figure class="film" data-film data-reveal style="margin-top:var(--s-lg)">
        <video class="film__video" controls preload="none" playsinline
               poster="{root}assets/video/{film["poster"]}.webp" aria-label="{esc(film["name"])}">
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
    </div>
  </section>"""

    return "\n\n".join([hero, trust_band(data, root), services, work, process, about, cta(root)])


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------
def service_rows(items, start=1):
    return "\n".join(
        f"""        <div class="deflist__row" data-reveal>
          <p class="deflist__num">{i:02d}</p>
          <h3 class="deflist__term">{esc(s["name"])}</h3>
          <div class="deflist__desc"><strong>{esc(s["lede"])}</strong>{esc(s["body"])}</div>
        </div>""" for i, s in enumerate(items, start=start))


def page_services(data, root) -> str:
    cards = "\n".join(
        f"""        <a class="card card--wide" href="{root}services/{p["slug"]}/" data-reveal>
          <div class="card__media">{picture(root, p["image"], p["imageAlt"], card=True, sizes="(min-width: 760px) 32vw, 92vw")}</div>
          <div class="card__body">
            <h2 class="card__title">{esc(p["name"])}</h2>
            <p class="card__meta"><span>{esc(p["lede"])}</span></p>
          </div>
        </a>""" for p in data["pillars"])
    everything = [x for p in data["pillars"] for x in p["detail"]]
    return f"""{pagehead("Services", "Strategy. Design. Construction.",
        "Eight services in three stages. Most clients come to us for one and end up using three.")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="grid grid--3">
{cards}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("In full", "What each one covers.")}
      <div class="deflist">
{service_rows(everything)}
      </div>
    </div>
  </section>

{trust_band(data, root)}

{cta(root)}"""


def page_pillar(pillar, data, root) -> str:
    projects = projects_for_pillar(data, pillar)[:6]
    others = "\n".join(
        f'          <li><a class="btn-link" href="{root}services/{p["slug"]}/">{esc(p["name"])}</a></li>'
        for p in data["pillars"] if p["slug"] != pillar["slug"])
    work = ('      <div class="grid grid--3">\n'
            + "\n".join(project_card(p, root) for p in projects) + "\n      </div>"
            ) if projects else ""
    return f"""  <section class="hero hero--short">
    <div class="hero__media">{picture(root, pillar["image"], pillar["imageAlt"], loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> <a href="{root}services/">Services</a></p>
      <h1 class="t-display">{esc(pillar["name"])}</h1>
      <p class="hero__standfirst">{esc(pillar["lede"])}</p>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="split">
        <div data-reveal><h2 class="t-h-lg">Why it matters</h2></div>
        <div data-reveal>
{paras(pillar["body"], "t-body")}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head(pillar["name"], "What it covers.")}
      <div class="deflist">
{service_rows(pillar["detail"])}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Proof", f'{len(projects)} projects that used it.', link=root + "work/", link_label="All work")}
{work}
    </div>
  </section>

  <section class="section--tight">
    <div class="shell">
      <hr class="rule">
      <div style="padding-top:var(--s-md)">
        <p class="t-label t-muted" style="margin-bottom:var(--s-sm)">Other stages</p>
        <ul class="taglist">
{others}
        </ul>
      </div>
    </div>
  </section>

{cta(root)}"""


# ---------------------------------------------------------------------------
# Sectors
# ---------------------------------------------------------------------------
def page_sectors(data, root) -> str:
    cards = "\n".join(
        f"""        <a class="card {"card--wide" if s["image"] else "card--text"}" href="{root}sectors/{s["slug"]}/" data-reveal>
          {f'<div class="card__media">{picture(root, s["image"], s["imageAlt"], card=True, sizes="(min-width: 620px) 48vw, 92vw")}</div>' if s["image"] else ""}
          <div class="card__body">
            <h2 class="card__title">{esc(s["name"])}</h2>
            <p class="card__meta"><span>{esc(s["lede"])}</span></p>
          </div>
        </a>""" for s in sectors(data))
    return f"""{pagehead("Sectors", "Six sectors, one way of working.",
        "The sector changes the brief. It does not change the discipline behind it.")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="grid grid--2">
{cards}
      </div>
    </div>
  </section>

{cta(root)}"""


def page_sector(sector, data, root) -> str:
    projects = projects_for_sector(data, sector["slug"])
    others = "\n".join(
        f'          <li><a class="btn-link" href="{root}sectors/{s["slug"]}/">{esc(s["name"])}</a></li>'
        for s in sectors(data) if s["slug"] != sector["slug"])

    if sector["image"]:
        head = f"""  <section class="hero hero--short">
    <div class="hero__media">{picture(root, sector["image"], sector["imageAlt"], loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> <a href="{root}sectors/">Sectors</a></p>
      <h1 class="t-display">{esc(sector["name"])}</h1>
      <p class="hero__standfirst">{esc(sector["lede"])}</p>
    </div>
    {f'<p class="t-caption hero__caption">{esc(sector["imageCredit"])}</p>' if sector.get("imageCredit") else ""}
  </section>"""
    else:
        head = pagehead("Sectors", esc(sector["name"]), esc(sector["lede"]),
                        root=root, parent="sectors/", parent_label="Sectors")

    if projects:
        count = f'{len(projects)} {"project" if len(projects) == 1 else "projects"}.'
        listing = ('      <div class="grid grid--3">\n'
                   + "\n".join(project_card(p, root) for p in projects) + "\n      </div>")
    elif sector.get("indexType"):
        rows = [e for e in data["projectIndex"] if e["type"] == sector["indexType"]]
        count = f'{len(rows)} {"project" if len(rows) == 1 else "projects"}.'
        listing = ('      <div class="deflist" data-reveal>\n' + "\n".join(
            f'        <div class="deflist__row"><p class="deflist__num">{i:02d}</p>'
            f'<h3 class="deflist__term">{esc(e["name"])}</h3>'
            f'<div class="deflist__desc">{esc(e["task"])} · {esc(e["location"])}</div></div>'
            for i, e in enumerate(rows, start=1)) + "\n      </div>")
    else:
        count = "No published project in this sector yet."
        listing = f"""      <div class="empty" data-reveal>
        <p class="t-lede">{esc(sector.get("note") or "Nothing published here yet.")}
        <a class="btn-link" href="{root}contact/">Talk to us</a></p>
      </div>"""

    note = (f'      <p class="t-lede" style="margin-bottom:var(--s-md)" data-reveal>{esc(sector["note"])}</p>'
            if sector.get("note") and projects else "")

    return f"""{head}

  <section class="section">
    <div class="shell">
      <div class="split">
        <div data-reveal><h2 class="t-h-lg">How we approach it</h2></div>
        <div data-reveal>
{paras(sector["body"], "t-body")}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head(sector["name"], count)}
{note}
{listing}
    </div>
  </section>

  <section class="section--tight">
    <div class="shell">
      <hr class="rule">
      <div style="padding-top:var(--s-md)">
        <p class="t-label t-muted" style="margin-bottom:var(--s-sm)">Other sectors</p>
        <ul class="taglist">
{others}
        </ul>
      </div>
    </div>
  </section>

{cta(root)}"""


# ---------------------------------------------------------------------------
# Work
# ---------------------------------------------------------------------------
def page_work(data, root) -> str:
    chips = [f'        <a class="chip" href="{root}work/" data-filter="all" aria-current="true">All</a>']
    for s in sectors(data):
        chips.append(f'        <a class="chip" href="{root}sectors/{s["slug"]}/" '
                     f'data-filter="{s["slug"]}">{esc(s["name"])}</a>')
    rows = "\n".join(
        f"""            <tr><td>{esc(e["name"])}</td><td>{esc(e["type"])}</td>
              <td>{esc(e["task"])}</td><td>{esc(e["location"])}</td></tr>"""
        for e in data["projectIndex"])
    return f"""{pagehead("Work", "Fifty interiors across five countries.",
        "Head offices, hotels, lounges, stores and homes — delivered from strategy through to the day the client gets the keys.")}

  <section class="section section--flush-top">
    <div class="shell">
      <div class="filters" data-filter-group>
{chr(10).join(chips)}
        <p class="filters__count" data-filter-count>{len(data["projects"])} projects</p>
      </div>
      <div class="grid grid--3" data-filter-results>
{chr(10).join(project_card(p, root) for p in data["projects"])}
      </div>
      <p class="t-lede is-hidden" data-filter-empty style="margin-top:var(--s-md)">
        Nothing published in that sector yet — it is in the
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


def page_project(project, data, root, prev, next_) -> str:
    alts = project.get("imageAlts") or []
    images = project["images"]

    facts = []
    if project.get("client"):
        facts.append(("Client", project["client"]))
    sector = by_slug(data["practices"], project["sector"])
    facts.append(("Sector", sector["name"] if sector else project["sector"]))
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
    facts_html = "\n".join(f"        <div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in facts)

    gallery = "\n".join(
        f"""        <figure data-reveal>
          {picture(root, slug, alts[i] if i < len(alts) else project["name"], sizes="(min-width: 760px) 48vw, 92vw")}
          <figcaption class="t-caption">{esc(alts[i] if i < len(alts) else project["name"])}</figcaption>
        </figure>""" for i, slug in enumerate(images[1:], start=1))

    pager = []
    if prev:
        pager.append(f"""      <a href="{root}work/{prev["slug"]}/">
        <span class="t-label t-muted">Previous</span>
        <span class="t-h-md">{esc(prev["name"])}</span></a>""")
    if next_:
        pager.append(f"""      <a class="pager__next" href="{root}work/{next_["slug"]}/">
        <span class="t-label t-muted">Next</span>
        <span class="t-h-md">{esc(next_["name"])}</span></a>""")

    return f"""  <section class="hero hero--short">
    <div class="hero__media">{picture(root, images[0], alts[0] if alts else project["name"], loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> <a href="{root}work/">Work</a></p>
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
        <div data-reveal><h2 class="t-h-lg">{esc(project.get("tagline") or "The brief")}</h2></div>
        <div data-reveal>
{paras(project.get("body") or [project.get("summary", "")], "t-body")}
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
  </section>

  <section class="section--tight">
    <div class="shell">
      <nav class="pager" aria-label="More work">
{chr(10).join(pager)}
      </nav>
    </div>
  </section>

{cta(root)}"""


# ---------------------------------------------------------------------------
# About, Contact, legal
# ---------------------------------------------------------------------------
def people_rows(data):
    return "\n".join(
        f"""        <div class="people__row" data-reveal>
          <p class="people__name">{esc(p["name"])}</p>
          <p class="people__role">{esc(p["role"])}</p>
          <p>{f'<a class="btn-link" href="mailto:{p["email"]}">{esc(p["email"])}</a>' if p.get("email") else '<span class="t-muted">via info@</span>'}</p>
        </div>""" for p in data["people"])


def page_about(data, root) -> str:
    timeline = "\n".join(
        f"""        <div class="timeline__item" data-reveal>
          <p class="timeline__year">{esc(e["year"])}</p>
          <p class="timeline__title">{esc(e["title"])}</p>
          <p class="timeline__body">{esc(e["body"])}</p>
        </div>""" for e in data["timeline"])
    values = "\n".join(
        f"""        <div data-reveal>
          <p class="t-label t-muted"><span class="mark"></span> {esc(v["name"])}</p>
          <p class="t-body" style="margin-top:var(--s-sm)">{esc(v["body"])}</p>
        </div>""" for v in data["values"])
    stats = "\n".join(
        f"""        <div class="stats__item">
          <p class="stats__value">{esc(s["value"])}</p>
          <p class="t-label t-muted">{esc(s["label"])}</p>
        </div>""" for s in data["stats"])
    operating = "".join(f"<li>{esc(c)}</li>" for c in data["footprint"]["operating"])
    return f"""{pagehead("About", "We are not just designers.",
        "We are innovators, crafts people and thinkers — interior architects, designers and strategists.")}

  <section class="section--tight">
    <div class="shell"><div class="stats">
{stats}
    </div></div>
  </section>

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

  <section class="section">
    <div class="shell">
{sec_head("Values", "What the work is measured against.")}
      <div class="grid grid--4">
{values}
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
          <p class="t-label t-muted"><span class="mark"></span> Footprint</p>
          <h2 class="statement" style="margin-top:var(--s-sm)">Built in West Africa.</h2>
        </div>
        <div data-reveal><ul class="taglist">{operating}</ul></div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("People", "Who you will be working with.", link=root + "contact/", link_label="Contact the studio")}
      <div class="people">
{people_rows(data)}
      </div>
    </div>
  </section>

{trust_band(data, root)}

{cta(root)}"""


def page_contact(data, root) -> str:
    site = data["site"]
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
          <p class="t-label t-muted">Where we work</p>
          <p class="t-body" style="margin-top:var(--s-sm)">Nigeria · Ghana · Zimbabwe · Senegal · Côte d'Ivoire.
          Projects delivered in Lagos, Abuja, Port Harcourt, Accra and Abidjan.</p>
          <p class="t-body" style="margin-top:var(--s-md)">For new enquiries the fastest route is email. Tell us
          the building, the floor area, the headcount and the date you need to be in — that is usually enough for
          a first conversation.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Direct", "Speak to someone.")}
      <div class="people">
{people_rows(data)}
      </div>
    </div>
  </section>

{trust_band(data, root)}"""


def page_simple(label, heading, lede, body_html, root) -> str:
    return f"""{pagehead(label, heading, lede)}

  <section class="section section--flush-top">
    <div class="shell">
{body_html}
    </div>
  </section>

{cta(root)}"""


def page_404(root) -> str:
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-muted"><span class="mark"></span> 404</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">That page has been fitted out elsewhere.</h1>
      <p class="t-lede pagehead__lede">The link you followed does not lead anywhere on this site.</p>
      <div class="hero__actions" style="margin-top:var(--s-md)">
        <a class="btn btn--primary" href="{root}">Home</a>
        <a class="btn btn--secondary" href="{root}work/">See the work</a>
      </div>
    </div>
  </section>"""


# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


def video_jsonld(data):
    film, site = data["film"], data["site"]
    return '<script type="application/ld+json">' + json.dumps({
        "@context": "https://schema.org", "@type": "VideoObject",
        "name": film["name"], "description": film["standfirst"],
        "thumbnailUrl": f'{site["url"]}/assets/video/{film["poster"]}.webp',
        "contentUrl": f'{site["url"]}/{film["sources"][-1]["src"]}',
        "duration": film["durationISO"],
        "publisher": {"@type": "Organization", "name": site["name"], "url": site["url"]},
    }, ensure_ascii=False) + "</script>"


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

    pages = []

    def add(path, nav, title, desc, body, og, category=None):
        pages.append((path, nav, title, desc, body, og, category))

    add("index.html", "/", f'{site["name"]} — {site["tagline"]}',
        site["description"], page_home(data, rel(0)), data["home"]["heroImage"])

    add("services/index.html", "/services/", f'Services — {site["name"]}',
        "Strategy, design and construction for commercial interiors across West Africa.",
        page_services(data, rel(1)), "diageo-spirit-01", "Services")
    for pillar in data["pillars"]:
        add(f'services/{pillar["slug"]}/index.html', "/services/",
            f'{pillar["name"]} — {site["name"]}', pillar["lede"],
            page_pillar(pillar, data, rel(2)), pillar["image"], "Services")

    add("sectors/index.html", "/sectors/", f'Sectors — {site["name"]}',
        "Workplace, hospitality, retail, residential, healthcare and education interiors.",
        page_sectors(data, rel(1)), "mtn-cote-divoire-01", "Sectors")
    for sector in sectors(data):
        add(f'sectors/{sector["slug"]}/index.html', "/sectors/",
            f'{sector["name"]} — {site["name"]}', sector["lede"],
            page_sector(sector, data, rel(2)),
            sector["image"] or "mtn-cote-divoire-01", "Sectors")

    add("work/index.html", "/work/", f'Work — {site["name"]}',
        "Selected interiors by James Cubitt Interiors across Nigeria, Ghana and Côte d'Ivoire.",
        page_work(data, rel(1)), "guinness-hq-01", "Work")
    projects = data["projects"]
    for index, project in enumerate(projects):
        add(f'work/{project["slug"]}/index.html', "/work/",
            f'{project["name"]} — {site["name"]}',
            project.get("summary") or f'{project["name"]} by James Cubitt Interiors.',
            page_project(project, data, rel(2),
                         projects[index - 1] if index else None,
                         projects[index + 1] if index + 1 < len(projects) else None),
            project["images"][0], "Project")

    add("about/index.html", "/about/", f'About — {site["name"]}',
        "James Cubitt Interiors: firm profile, values, history, people and clientele.",
        page_about(data, rel(1)), "hotel-takum-04", "About")
    add("contact/index.html", "/contact/", f'Contact — {site["name"]}',
        f'Contact James Cubitt Interiors — {site["email"]}, {site["phone"]}.',
        page_contact(data, rel(1)), "mtn-cote-divoire-01", "Contact")
    add("privacy/index.html", "/about/", f'Privacy — {site["name"]}',
        "Privacy and cookies at James Cubitt Interiors.",
        page_simple("Legal", "Privacy.", "How this site handles your data.",
                    '      <div class="empty" data-reveal><p class="t-lede">No privacy policy has been '
                    'supplied. This page is reserved for it, and should be in place before the site goes '
                    'live.</p></div>\n'
                    '      <h2 class="t-h-lg" style="margin-top:var(--s-lg)">Cookies</h2>\n'
                    '      <p class="t-body">This site sets no cookies and loads no analytics. The only '
                    'third-party request is to Google Fonts for two typefaces.</p>', rel(1)),
        "guinness-hq-01", "Legal")
    add("404.html", "/", f'Page not found — {site["name"]}',
        "That page does not exist.", page_404(rel(0)), "guinness-hq-01")

    urls, index_entries = [], []
    for path, nav_key, title, description, body, og, category in pages:
        root = rel(path.count("/"))
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
            if category:
                index_entries.append({
                    "title": title.split(" — ")[0], "url": "/" + path.replace("index.html", ""),
                    "category": category, "topics": [], "office": "", "date": "",
                    "summary": description})

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
