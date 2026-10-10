#!/usr/bin/env python3
"""
Build the James Cubitt Interiors site.

    python3 scripts/build.py            # -> dist/
    python3 scripts/build.py --out www  # -> www/

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
# Small helpers
# ---------------------------------------------------------------------------
def rel(depth: int) -> str:
    """Path back to the site root from a page `depth` directories down."""
    return "../" * depth if depth else "./"


def paras(items, cls="t-body"):
    return "\n".join(f'<p class="{cls}">{esc(p)}</p>' for p in items)


def picture(root: str, slug: str, alt: str, *, card=False, cls="",
            loading="lazy", sizes=None, width=None, height=None) -> str:
    """An <img> pointing at a built asset, with both widths offered."""
    base = f"{root}{IMG}/{slug}"
    srcset = f"{base}-card.webp 900w, {base}.webp 1800w"
    src = f"{base}-card.webp" if card else f"{base}.webp"
    attrs = [
        f'src="{src}"',
        f'srcset="{srcset}"',
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
    """The short metadata line under a project title."""
    bits = []
    place = ", ".join(x for x in (project.get("city"), project.get("country")) if x)
    if place:
        bits.append(place)
    if project.get("start"):
        finish = project.get("finish")
        bits.append(project["start"] if not finish or finish == project["start"]
                    else f'{project["start"]}–{finish}')
    return bits


def sector_name(sectors: list[dict], slug: str) -> str:
    for sector in sectors:
        if sector["slug"] == slug:
            return sector["name"]
    return slug.title()


def project_sectors(project: dict) -> list[str]:
    return [project["sector"]] + list(project.get("alsoIn", []))


# ---------------------------------------------------------------------------
# Shared fragments
# ---------------------------------------------------------------------------
def nav_html(data: dict, root: str, current: str) -> str:
    out = []
    for item in data["nav"]:
        href = root + item["href"].lstrip("/")
        aria = ' aria-current="page"' if item["href"] == current else ""
        out.append(f'      <a class="nav__link" href="{href}"{aria}>{esc(item["label"])}</a>')
    return "\n".join(out)


def sec_head(label: str, heading: str, *, link=None, link_label=None, tag="h2") -> str:
    right = ""
    if link:
        right = f'<a class="btn-link" href="{link}">{esc(link_label or "View all")}</a>'
    return f"""      <div class="sec-head" data-reveal>
        <div class="sec-head__meta">
          <p class="t-label t-label--accent"><span class="mark"></span> {esc(label)}</p>
          {right}
        </div>
        <{tag} class="t-section">{heading}</{tag}>
      </div>"""


def project_card(project: dict, root: str, data: dict, *, card=True,
                 modifier="", sizes="(min-width: 1040px) 30vw, (min-width: 620px) 48vw, 92vw") -> str:
    slug = project["slug"]
    image = project["images"][0]
    alt = (project.get("imageAlts") or [project["name"]])[0]
    meta = project_meta(project)
    meta_html = "".join(f"<span>{esc(m)}</span>" for m in meta)
    sectors = " ".join(project_sectors(project))
    return f"""        <a class="card {modifier}" href="{root}work/{slug}/" data-sectors="{sectors}" data-reveal>
          <div class="card__media">{picture(root, image, alt, card=card, sizes=sizes)}</div>
          <div class="card__body">
            <h3 class="card__title">{esc(project["name"])}</h3>
            <p class="card__meta">{meta_html}</p>
          </div>
        </a>"""


def cta(root: str) -> str:
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
# Pages
# ---------------------------------------------------------------------------
def page_home(data: dict, root: str) -> str:
    home = data["home"]
    featured = [p for p in data["projects"] if p.get("featured")]
    sectors = data["sectors"]

    stats = "\n".join(
        f"""        <div class="stats__item">
          <p class="stats__value">{esc(s["value"])}</p>
          <p class="t-label t-muted">{esc(s["label"])}</p>
        </div>"""
        for s in data["stats"]
    )

    sector_cards = "\n".join(
        f"""        <a class="card card--tall" href="{root}expertise/{s["slug"]}/" data-reveal>
          <div class="card__media">{picture(root, s["image"], s["imageAlt"], card=True,
                                            sizes="(min-width: 1040px) 24vw, (min-width: 620px) 48vw, 92vw")}</div>
          <div class="card__body">
            <h3 class="card__title">{esc(s["name"])}</h3>
            <p class="card__meta"><span>{esc(s["lede"])}</span></p>
          </div>
        </a>"""
        for s in sectors
    )

    hero_alt = home["heroImageAlt"]
    return f"""  <section class="hero">
    <div class="hero__media">{picture(root, home["heroImage"], hero_alt, loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> {esc(home["heroEyebrow"])}</p>
      <h1 class="t-display">{home["heroHeadline"]}</h1>
      <p class="hero__standfirst">{esc(home["heroStandfirst"])}</p>
      <div class="hero__actions">
        <a class="btn btn--primary" href="{root}work/">See the work</a>
        <a class="btn btn--secondary" href="{root}studio/">About the studio</a>
      </div>
    </div>
    <p class="t-caption hero__caption">Guinness Head Office, Lagos</p>
  </section>

  <section class="section--tight">
    <div class="shell">
      <div class="stats">
{stats}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
      <div class="split">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Why we work</p>
          <h2 class="t-section" style="margin-top:var(--s-sm)">{esc(home["missionHeadline"])}</h2>
        </div>
        <div data-reveal>
          {paras(home["missionBody"], "t-lede")}
          <p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}studio/">How we think about it</a></p>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("Selected work", "Spaces people move through well.", link=root + "work/", link_label="All work")}
      <div class="grid grid--3" data-filter-results>
{chr(10).join(project_card(p, root, data) for p in featured[:6])}
      </div>
    </div>
  </section>

  <section class="band">
    {picture(root, "afreximbank-hq-01", "Double-height atrium lobby at the Afreximbank headquarters in Abuja", sizes="100vw")}
    <div class="band__body">
      <blockquote class="quote quote--wide">“{esc(home["quote"])}”</blockquote>
      <p class="t-label quote__attrib" style="color:rgba(255,255,255,.7)">James Cubitt Interiors</p>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("What we do", "Four sectors, one way of working.", link=root + "expertise/", link_label="Expertise")}
      <div class="grid grid--4">
{sector_cards}
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="split split--narrow-first">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Clientele</p>
          <h2 class="statement" style="margin-top:var(--s-sm)">{esc(data["home"]["statement"])}</h2>
          <p style="margin-top:var(--s-md)"><a class="btn-link" href="{root}work/#index">Full project list</a></p>
        </div>
        <ul class="clientgrid" data-reveal>
{chr(10).join(f'          <li>{esc(c)}</li>' for c in data["clients"])}
        </ul>
      </div>
    </div>
  </section>

{cta(root)}"""


def page_work(data: dict, root: str) -> str:
    sectors = data["sectors"]
    projects = data["projects"]

    # Real links, so that with JavaScript off every chip still goes somewhere
    # useful: the sector page, which lists exactly the same projects.
    chips = [f'        <a class="chip" href="{root}work/" data-filter="all" aria-current="true">All</a>']
    for sector in sectors:
        chips.append(
            f'        <a class="chip" href="{root}expertise/{sector["slug"]}/" '
            f'data-filter="{sector["slug"]}">{esc(sector["name"])}</a>'
        )

    rows = "\n".join(
        f"""            <tr>
              <td>{esc(entry["name"])}</td>
              <td>{esc(entry["type"])}</td>
              <td>{esc(entry["task"])}</td>
              <td>{esc(entry["location"])}</td>
            </tr>"""
        for entry in data["projectIndex"]
    )

    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> Work</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">Fifty interiors across five countries.</h1>
      <p class="t-lede pagehead__lede">Head offices, hotels, lounges, stores and homes — delivered from strategy
      through to the day the client gets the keys. Filter by sector, or read the full list at the bottom of the page.</p>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="filters" data-filter-group>
{chr(10).join(chips)}
        <p class="filters__count" data-filter-count>{len(projects)} projects</p>
      </div>
      <div class="grid grid--3" data-filter-results>
{chr(10).join(project_card(p, root, data) for p in projects)}
      </div>
      <p class="t-lede is-hidden" data-filter-empty style="margin-top:var(--s-md)">
        We have no published photography for that sector yet — the projects are listed in the
        <a class="btn-link" href="#index">full project list</a> below.</p>
    </div>
  </section>

  <section class="section" id="index">
    <div class="shell">
{sec_head("Capability statement", "The full project list.")}
      <div class="table-wrap" data-reveal>
        <table class="index">
          <thead>
            <tr>
              <th scope="col">Project</th>
              <th scope="col">Type</th>
              <th scope="col">Task</th>
              <th scope="col">Location</th>
            </tr>
          </thead>
          <tbody>
{rows}
          </tbody>
        </table>
      </div>
    </div>
  </section>

{cta(root)}"""


def page_project(project: dict, data: dict, root: str, prev: dict | None,
                 next_: dict | None) -> str:
    alts = project.get("imageAlts") or []
    images = project["images"]
    hero_alt = alts[0] if alts else project["name"]

    facts = []
    if project.get("client"):
        facts.append(("Client", project["client"]))
    facts.append(("Sector", sector_name(data["sectors"], project["sector"])))
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

    facts_html = "\n".join(
        f"        <div><dt>{esc(k)}</dt><dd>{esc(v)}</dd></div>" for k, v in facts
    )

    body = project.get("body") or [project.get("summary", "")]

    gallery = "\n".join(
        f"""        <figure data-reveal>
          {picture(root, slug, alts[i] if i < len(alts) else project["name"],
                   sizes="(min-width: 760px) 48vw, 92vw")}
          <figcaption class="t-caption">{esc(alts[i] if i < len(alts) else project["name"])}</figcaption>
        </figure>"""
        for i, slug in enumerate(images[1:], start=1)
    )

    pager = []
    if prev:
        pager.append(f"""      <a href="{root}work/{prev["slug"]}/">
        <span class="t-label t-muted">Previous</span>
        <span class="t-h-md">{esc(prev["name"])}</span>
      </a>""")
    if next_:
        pager.append(f"""      <a class="pager__next" href="{root}work/{next_["slug"]}/">
        <span class="t-label t-muted">Next</span>
        <span class="t-h-md">{esc(next_["name"])}</span>
      </a>""")

    tagline = ""
    if project.get("tagline"):
        tagline = f'      <p class="t-label t-label--accent" style="margin-top:var(--s-md)"><span class="mark"></span> {esc(project["tagline"])}</p>'

    return f"""  <section class="hero hero--short">
    <div class="hero__media">{picture(root, images[0], hero_alt, loading="eager", sizes="100vw")}</div>
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
        <div data-reveal>
          <h2 class="t-h-lg">{esc(project.get("tagline") or "The brief")}</h2>
{tagline if not project.get("tagline") else ""}
        </div>
        <div data-reveal>
{paras(body, "t-body")}
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
      <nav class="pager" aria-label="More projects">
{chr(10).join(pager)}
      </nav>
    </div>
  </section>

{cta(root)}"""


def page_expertise_index(data: dict, root: str) -> str:
    cards = "\n".join(
        f"""        <a class="card card--wide" href="{root}expertise/{s["slug"]}/" data-reveal>
          <div class="card__media">{picture(root, s["image"], s["imageAlt"], card=True,
                                            sizes="(min-width: 620px) 48vw, 92vw")}</div>
          <div class="card__body">
            <h2 class="card__title">{esc(s["name"])}</h2>
            <p class="card__meta"><span>{esc(s["lede"])}</span></p>
          </div>
        </a>"""
        for s in data["sectors"]
    )
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> Expertise</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">Four sectors, one way of working.</h1>
      <p class="t-lede pagehead__lede">We specialise in commercial, high-rise, hospitality, workplace and
      residential interiors — from mid to high-end. The sector changes the brief; it does not change the
      discipline behind it.</p>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="grid grid--2">
{cards}
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Also", "Healthcare and education.")}
      <p class="t-lede" data-reveal>Beyond the four sectors above we design healthcare and educational
      interiors on the same basis: understand the operation first, then design the room around it.
      <a class="btn-link" href="{root}contact/" style="margin-left:var(--s-xs)">Talk to us</a></p>
    </div>
  </section>

{cta(root)}"""


def page_sector(sector: dict, data: dict, root: str) -> str:
    projects = [p for p in data["projects"] if sector["slug"] in project_sectors(p)]
    others = "\n".join(
        f'          <li><a class="btn-link" href="{root}expertise/{s["slug"]}/">{esc(s["name"])}</a></li>'
        for s in data["sectors"] if s["slug"] != sector["slug"]
    )

    # A sector we have no published photography for still gets a real page:
    # the named projects from the capability statement, and a plain note
    # saying why there are no images rather than an empty grid.
    if projects:
        count = f'{len(projects)} {"project" if len(projects) == 1 else "projects"} in this sector.'
        listing = f'      <div class="grid grid--3">\n{chr(10).join(project_card(p, root, data) for p in projects)}\n      </div>'
        link, link_label = root + "work/?sector=" + sector["slug"], "Filter all work"
    else:
        rows = [e for e in data["projectIndex"]
                if e["type"] == sector.get("indexType", sector["name"])]
        count = f'{len(rows)} {"project" if len(rows) == 1 else "projects"} in this sector.'
        listing = ('      <div class="deflist" data-reveal>\n'
                   + "\n".join(
                       f'        <div class="deflist__row">'
                       f'<p class="deflist__num">{i:02d}</p>'
                       f'<h3 class="deflist__term">{esc(e["name"])}</h3>'
                       f'<div class="deflist__desc">{esc(e["task"])} · {esc(e["location"])}</div>'
                       f"</div>"
                       for i, e in enumerate(rows, start=1))
                   + "\n      </div>")
        link, link_label = root + "work/#index", "Full project list"
    note = (f'      <p class="t-lede" style="margin-bottom:var(--s-md)" data-reveal>{esc(sector["note"])}</p>'
            if sector.get("note") else "")

    return f"""  <section class="hero hero--short">
    <div class="hero__media">{picture(root, sector["image"], sector["imageAlt"], loading="eager", sizes="100vw")}</div>
    <div class="hero__scrim"></div>
    <div class="hero__body">
      <p class="t-label hero__eyebrow"><span class="mark"></span> <a href="{root}expertise/">Expertise</a></p>
      <h1 class="t-display">{esc(sector["name"])}</h1>
      <p class="hero__standfirst">{esc(sector["lede"])}</p>
    </div>
    <p class="t-caption hero__caption">{esc(sector["imageCredit"])}</p>
  </section>

  <section class="section">
    <div class="shell">
      <div class="split">
        <div data-reveal>
          <h2 class="t-h-lg">How we approach it</h2>
        </div>
        <div data-reveal>
{paras(sector["body"], "t-body")}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head(sector["name"], count, link=link, link_label=link_label)}
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


def page_services(data: dict, root: str) -> str:
    rows = "\n".join(
        f"""        <div class="deflist__row" data-reveal>
          <p class="deflist__num">{index:02d}</p>
          <h2 class="deflist__term">{esc(service["name"])}</h2>
          <div class="deflist__desc"><strong>{esc(service["detail"])}</strong>{esc(service["body"])}</div>
        </div>"""
        for index, service in enumerate(data["services"], start=1)
    )
    values = "\n".join(
        f"""        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> {esc(value["name"])}</p>
          <p class="t-body" style="margin-top:var(--s-sm)">{esc(value["body"])}</p>
        </div>"""
        for value in data["values"]
    )
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> Services</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">How we do it.</h1>
      <p class="t-lede pagehead__lede">Eight services that can be taken whole or in part. Most clients come to us
      for one and end up using three.</p>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="deflist">
{rows}
      </div>
    </div>
  </section>

  <section class="band">
    {picture(root, "diageo-spirit-01", "Bar and lounge beneath a dark coffered ceiling at Diageo Spirit, Lagos", sizes="100vw")}
    <div class="band__body">
      <blockquote class="quote">“{esc(data["pullQuote"])}”</blockquote>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Our values", "What the work is measured against.")}
      <div class="grid grid--4">
{values}
      </div>
    </div>
  </section>

{cta(root)}"""


def page_studio(data: dict, root: str) -> str:
    timeline = "\n".join(
        f"""        <div class="timeline__item" data-reveal>
          <p class="timeline__year">{esc(entry["year"])}</p>
          <p class="timeline__title">{esc(entry["title"])}</p>
          <p class="timeline__body">{esc(entry["body"])}</p>
        </div>"""
        for entry in data["timeline"]
    )
    people = "\n".join(
        f"""        <div class="people__row" data-reveal>
          <p class="people__name">{esc(person["name"])}</p>
          <p class="people__role">{esc(person["role"])}</p>
          <p>{f'<a class="btn-link" href="mailto:{person["email"]}">{esc(person["email"])}</a>' if person.get("email") else '<span class="t-muted">info@jamescubittinteriors.com</span>'}</p>
        </div>"""
        for person in data["people"]
    )
    why = "\n".join(
        f'          <p class="t-body">{esc(p)}</p>' for p in data["why"]
    )
    operating = "".join(
        f'<li>{esc(c)}</li>' for c in data["footprint"]["operating"]
    )
    network = "".join(
        f'<li>{esc(c)}</li>' for c in data["footprint"]["network"]
    )
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> Studio</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">We are not just designers.</h1>
      <p class="t-lede pagehead__lede">We are innovators, crafts people and thinkers — interior architects,
      designers and strategists, with a decade as an independent practice behind sixty years of West African work.</p>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
      <div class="split">
        <div data-reveal>
          <h2 class="t-h-lg">About us</h2>
        </div>
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
      <div class="split">
        <div data-reveal>
          <p class="t-label t-label--accent"><span class="mark"></span> Why we work</p>
          <h2 class="t-section" style="margin-top:var(--s-sm)">Our environment is changing how we live.</h2>
        </div>
        <div data-reveal>
{why}
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("History", "Seventy-eight years, and counting.")}
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
          <h2 class="statement" style="margin-top:var(--s-sm)">Built in West Africa, drawn from a global network.</h2>
        </div>
        <div data-reveal>
          <p class="t-label t-muted">Where we operate</p>
          <ul class="taglist" style="margin:var(--s-sm) 0 var(--s-md)">{operating}</ul>
          <p class="t-label t-muted">James Cubitt group offices</p>
          <ul class="taglist" style="margin-top:var(--s-sm)">{network}</ul>
        </div>
      </div>
    </div>
  </section>

  <section class="section section--flush-top">
    <div class="shell">
{sec_head("People", "Who you will be working with.", link=root + "contact/", link_label="Contact the studio")}
      <div class="people">
{people}
      </div>
    </div>
  </section>

{cta(root)}"""


def page_contact(data: dict, root: str) -> str:
    site = data["site"]
    people = "\n".join(
        f"""        <div class="people__row" data-reveal>
          <p class="people__name">{esc(person["name"])}</p>
          <p class="people__role">{esc(person["role"])}</p>
          <p>{f'<a class="btn-link" href="mailto:{person["email"]}">{esc(person["email"])}</a>' if person.get("email") else '<span class="t-muted">via info@</span>'}</p>
        </div>"""
        for person in data["people"]
    )
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> Contact</p>
      <h1 class="t-display" style="margin-top:var(--s-sm)">Tell us what the space has to do.</h1>
      <p class="t-lede pagehead__lede">Whether you have a floor, a building or only a problem with the one you are
      in, start with an email. We will tell you honestly whether it is a job for us.</p>
    </div>
  </section>

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
          <p class="t-body" style="margin-top:var(--s-md)">For new enquiries, the fastest route is email.
          Tell us the building, the floor area, the headcount and the date you need to be in — that is
          usually enough for a first conversation.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="shell">
{sec_head("Direct", "Speak to someone.")}
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


def page_404(root: str) -> str:
    return f"""  <section class="pagehead">
    <div class="shell">
      <p class="t-label t-label--accent"><span class="mark"></span> 404</p>
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
def write(path: str, text: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(text)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="dist", help="output directory (default: dist)")
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

    # Static assets, copied verbatim.
    shutil.copytree(ASSETS, os.path.join(out, "assets"))

    pages: list[tuple[str, str, str, str, str, str]] = []  # path, nav-key, title, desc, body, og

    pages.append((
        "index.html", "/",
        f'{site["name"]} — {site["tagline"]}',
        site["description"],
        page_home(data, rel(0)),
        data["home"]["heroImage"],
    ))
    pages.append((
        "work/index.html", "/work/",
        f'Work — {site["name"]}',
        "Selected interiors by James Cubitt Interiors: head offices, hotels, lounges, stores and homes across Nigeria, Ghana and Côte d'Ivoire.",
        page_work(data, rel(1)),
        "guinness-hq-01",
    ))
    pages.append((
        "expertise/index.html", "/expertise/",
        f'Expertise — {site["name"]}',
        "Workplace, hospitality, retail and residential interior architecture from James Cubitt Interiors.",
        page_expertise_index(data, rel(1)),
        "mtn-cote-divoire-01",
    ))
    pages.append((
        "services/index.html", "/services/",
        f'Services — {site["name"]}',
        "Design, workplace strategy, wellness assessment, experiential projects, design intelligence, design management, FFE and lighting design.",
        page_services(data, rel(1)),
        "diageo-spirit-01",
    ))
    pages.append((
        "studio/index.html", "/studio/",
        f'Studio — {site["name"]}',
        "James Cubitt Interiors: who we are, how the practice got here, and the people you will work with.",
        page_studio(data, rel(1)),
        "hotel-takum-04",
    ))
    pages.append((
        "contact/index.html", "/contact/",
        f'Contact — {site["name"]}',
        f'Contact James Cubitt Interiors — {site["email"]}, {site["phone"]}.',
        page_contact(data, rel(1)),
        "mtn-cote-divoire-01",
    ))
    pages.append((
        "404.html", "/",
        f'Page not found — {site["name"]}',
        "That page does not exist.",
        page_404(rel(0)),
        "guinness-hq-01",
    ))

    for sector in data["sectors"]:
        pages.append((
            f'expertise/{sector["slug"]}/index.html', "/expertise/",
            f'{sector["name"]} — {site["name"]}',
            sector["lede"],
            page_sector(sector, data, rel(2)),
            sector["image"],
        ))

    projects = data["projects"]
    for index, project in enumerate(projects):
        prev = projects[index - 1] if index else None
        next_ = projects[index + 1] if index + 1 < len(projects) else None
        pages.append((
            f'work/{project["slug"]}/index.html', "/work/",
            f'{project["name"]} — {site["name"]}',
            project.get("summary") or f'{project["name"]} by James Cubitt Interiors.',
            page_project(project, data, rel(2), prev, next_),
            project["images"][0],
        ))

    urls = []
    for path, nav_key, title, description, body, og in pages:
        depth = path.count("/")
        root = rel(depth)
        url = site["url"] + "/" + ("" if path == "index.html" else path.replace("index.html", ""))
        html = (base
                .replace("{{title}}", esc(title))
                .replace("{{description}}", esc(description))
                .replace("{{canonical}}", esc(url))
                .replace("{{ogimage}}", f'{site["url"]}/{IMG}/{og}.webp')
                .replace("{{root}}", root)
                .replace("{{nav}}", nav_html(data, root, nav_key))
                .replace("{{body}}", body)
                .replace("{{head}}", "")
                .replace("{{scripts}}", ""))
        write(os.path.join(out, path), html)
        if not path.endswith("404.html"):
            urls.append(url)

    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n'
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               + "".join(f"  <url><loc>{esc(u)}</loc></url>\n" for u in urls)
               + "</urlset>\n")
    write(os.path.join(out, "sitemap.xml"), sitemap)
    write(os.path.join(out, "robots.txt"),
          f'User-agent: *\nAllow: /\nSitemap: {site["url"]}/sitemap.xml\n')

    print(f"built {len(pages)} pages -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
