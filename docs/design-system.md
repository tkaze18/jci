# Design system — Framer, with JCI's red

The site is built on the Framer design system in `/DESIGN.md`, installed
with `npx getdesign@latest add framer`. `assets/css/tokens.css` is that
document expressed as CSS custom properties; `assets/css/site.css` builds
every component from those tokens and hard-codes nothing.

One substitution, and one omission. Both are deliberate and both are below.

---

## The substitution: #D42127 in place of #0099ff

`DESIGN.md` specifies a single chromatic accent, sky blue `#0099ff`,
reserved for hyperlinks, focus rings and selected indicators, and forbidden
as a surface or button fill.

That rule is kept exactly. The colour is not: the accent here is
**`#D42127`**, sampled from the James Cubitt Interiors logo mark. `#0099ff`
is Framer's brand, and a practice's site should carry its own.

The discipline is unchanged — one accent, never two. The red appears on:

- link hover and the rule under `.btn-link`
- the focus ring (`--e-ring`, the level-3 signal)
- the border on a selected filter chip and the current carousel dot
- the current nav item on mobile

It does **not** appear on section eyebrows, which `DESIGN.md` would treat as
decorative. Those are `ink-muted`. This is a real change from the previous
build, where the red marked every section label; under Framer's rules the
accent is a signal, not an ornament.

`--c-tertiary-deep` (`#9E1B22`, the deeper red from the printed brochures)
is kept for pressed states.

## The omission: gradient spotlight cards

`DESIGN.md` calls the magenta / violet / orange / coral spotlight cards the
brand's signature atmosphere device. They are not implemented.

They exist on framer.com to show what Framer produces — they *are* the
product demo. JCI has ninety photographs of finished interiors doing that
job, and Framer's own rule is that the palette must not carry a second
chromatic family beyond the one accent. Dropping four saturated hues onto
an interior-architecture portfolio would fight the photography it exists to
show.

Where Framer would place a spotlight card, this site places a full-bleed
photograph instead.

---

## What is followed exactly

### Colour

| Token | Value | Role |
| --- | --- | --- |
| `--c-neutral` | `#090909` | canvas — hero, body, footer, every band |
| `--c-surface` | `#141414` | surface-1: cards, secondary pills, tiles |
| `--c-surface-2` | `#1C1C1C` | surface-2: selected chips, featured cards |
| `--c-border` | `#262626` | hairline |
| `--c-border-soft` | `#1A1A1A` | hairline-soft |
| `--c-on-surface` | `#FFFFFF` | ink |
| `--c-secondary` | `#999999` | ink-muted — the only secondary tone |

Hierarchy on the dark canvas is carried by surface lift and by the binary
ink → ink-muted contrast, never by opacity on white type.

### Type

GT Walsheim is not web-licensable. `DESIGN.md` names Mona Sans, Geist or
Inter 600–700 as substitutes; **Mona Sans** is used, which the document
calls the closest, and which is open source and served by Google Fonts.
Body is **Inter**.

The tracking is the brand signature and is followed to the number. Framer's
px values are exactly −5% of size at every display step (−5.5/110,
−4.25/85, −3.1/62), so it is set in `em` and survives the responsive ramp:

```css
--ls-display: -0.05em;
--fs-display-xxl: clamp(32px, 7.8vw, 110px);  /* 110 → ~62 at 810 → 32 floor */
```

Measured in the browser at desktop width: display renders at `110px /
93.5px / -5.5px`, body at `15px / 19.5px / -0.15px`. Both match the
document exactly.

Inter's character variants are set globally, because `DESIGN.md` is
explicit that the brand depends on them:

```css
--font-features: "cv01", "cv05", "cv09", "cv11", "ss03", "ss07", "dlig";
```

`tnum` is added on tabular contexts only — the stats row and the timeline
years.

Four display tiers, each used for what the document assigns it:
`display-xxl` for hero statements, `display-xl` for section openers,
`display-lg` for pull quotes and standfirsts, `display-md` for stats,
timeline years, contact lines and the footer promise.

### Shape

Every text CTA is a pill (`--r-pill`, 100px) with 10px/15px padding and a
44px minimum tap height. Icon buttons are full circles at 40px. Cards are
20px. Nothing is squared off.

This reverses the previous system, which specified 4px buttons and warned
against over-rounding. Framer's vocabulary wins; the two cannot both hold.

### Depth

| Level | Treatment |
| --- | --- |
| 0 | flat — canvas type, rows, footer |
| 1 | `surface-1` lift — cards, secondary pills |
| 2 | `--e-2`: `inset 0 0.5px 0 rgba(255,255,255,.10)` + `0 10px 30px rgba(0,0,0,.25)` — cards on hover |
| 3 | `--e-ring`: the accent at 45% / 15% — focus and selection |

Shadows are now in play, where the previous system had none.

### Spacing

Framer's 5-based scale, not a 4/8 scale: `1 · 4 · 8 · 12 · 15 · 20 · 30 ·
40 · 96`. Section rhythm is `clamp(56px, 8vw, 96px)`, reaching the
documented 96px on desktop.

### Dark only

`DESIGN.md`: *"Don't ship a light-mode marketing page."* The site does not
follow `prefers-color-scheme`. A light palette sits behind
`html[data-theme="light"]` as an opt-in for a future surface that needs
one; nothing sets it.

---

## Lint

`DESIGN.md`'s iteration guide suggests running its linter:

```
npx @google/design.md lint DESIGN.md
```

It reports **0 errors, 7 warnings** — all `orphaned-tokens` on colours the
template defines but never references from a component (`gradient-coral`,
`semantic-success` and five others). Those are in the template as shipped;
`DESIGN.md` is left as installed so it stays diffable against the upstream
template.

## Accessibility

- White on `#090909` is 19.5:1. `ink-muted` `#999999` on canvas is 7.0:1,
  past AA for body text at every size used.
- `#D42127` on canvas is 4.3:1. It is never the sole carrier of meaning:
  a selected chip also lifts to `surface-2`, and focus also draws a ring.
  It is never used for body copy.
- Focus is a two-stop ring at 45% and 15%, never removed.
- Pills hold a 44px minimum tap height at every viewport.
- Every image has written alt text; the site is navigable with JavaScript
  off.
