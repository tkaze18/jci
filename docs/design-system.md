# Design system — how Cuub Studio was applied to JCI

The supplied `cuubstudio.com-design.md` describes a stark editorial system:
dark canvas, oversized white type, a single vivid accent, flat surfaces, no
shadows, photography carrying the emotion. That system is implemented here
almost verbatim in `assets/css/tokens.css`. This note records the four places
it was adapted, and why.

---

## 1. The accent is JCI's red, not Cuub's

| | Cuub | Here |
| --- | --- | --- |
| Accent | `#FF4438` | `#D42127` |

`#D42127` is sampled directly from the James Cubitt Interiors logo mark on the
back page of the hospitality brochure. `#9E1B22` — the deeper red used for the
page furniture throughout the printed brochures — is kept as
`--c-tertiary-deep` for hover and pressed states.

Everything else in the Cuub palette is unchanged: `#FFFFFF` primary,
`#B3B3B3` secondary, `#000000` canvas, `#111111` surface, `#374151` border,
and errors reusing the accent rather than introducing a warning hue.

The accent stays rare, as the system asks. It appears on section labels, the
small rule before them, link and card underlines on hover, the active filter
chip, and the timeline year on hover. It is never a large fill.

## 2. Two web-licensed typefaces stand in

TT Firs Neue is not available for web licensing, and Helvetica Neue is not
installed on most non-Apple devices. The substitutes:

| Role | Cuub | Here | Why |
| --- | --- | --- | --- |
| Display | TT Firs Neue | **Archivo** | A grotesque of the same density and geometry; holds up at 104px |
| UI / body | Helvetica Neue | **Helvetica Neue → Inter** | Native where it exists, Inter elsewhere |

Every size, weight, line-height and letter-spacing token from the source
system is kept exactly: `headline-display` 70/77/600, `body-lg` 18/28,
`label-sm` 12/16/600 at `0.08em`, and the rest.

If the practice licenses TT Firs Neue, swap `--font-display` in
`tokens.css` and self-host the files. Nothing else changes.

## 3. Two fluid sizes extend the scale, they do not replace it

The source system specifies a fixed 70px display size. A fixed 70px headline
overflows a 390px phone. Two clamped tokens were added alongside the fixed
one, which is still there and still used:

```css
--fs-hero:    clamp(40px, 7.4vw, 104px);   /* full-bleed hero statements */
--fs-section: clamp(30px, 4.6vw, 70px);    /* section heads — tops out at the 70px token */
```

`--fs-section` reaches exactly the specified 70px at desktop width and shrinks
below it; it never exceeds the system. `--fs-hero` goes above 70px only in the
full-bleed hero, which is the "oversized hero statement" the system asks for.

Section rhythm is clamped the same way: `--s-section: clamp(46px, 11vw, 148px)`
reaches the specified `xl` break on desktop and falls back to `lg` on a phone.
The raw `xs/sm/md/lg/xl` tokens (6/18/30/46/148) are unchanged.

## 4. Dark is not a preference

The system says: *"Do keep the canvas dark and let white typography carry most
of the hierarchy."* So the site does not follow `prefers-color-scheme`. A
light JCI would be a different brand.

A light palette is kept in `tokens.css` behind `html[data-theme="light"]` as
an opt-in, for a future surface that genuinely needs one. Nothing in the site
sets it.

---

## What was followed without change

- **Flat.** No shadows anywhere. Separation comes from borders
  (`--c-border-soft` hairlines), contrast, and the photography itself.
- **Modest radii.** `4px` on buttons, `8px` on cards and images, `9999px` only
  on filter chips. Everything else is square.
- **Full-bleed imagery, asymmetric overlays.** Heroes and quote bands run edge
  to edge; type sits low-left over a gradient scrim rather than centred in a
  box.
- **Restrained components.** `button-primary` is white on black at 40px high
  with `8px 16px` padding; `button-secondary` is a transparent outline;
  `button-link` is text with a rule under it. Hovers shift tone, never add a
  shadow or a bounce.
- **Concise copy over dense paragraphs.** Body text is capped at `62ch`.

## Motion

The source system does not specify motion beyond "keep hover states subtle".
Three movements were added, all slow and none decorative:

- a 24s scale drift on hero images,
- a 14px fade-and-rise as sections enter the viewport,
- a 1.045 scale on card images on hover.

All three are removed entirely under `prefers-reduced-motion: reduce`.

## Accessibility notes

- White on black is 21:1. `--c-secondary` (`#B3B3B3`) on black is 9.6:1, well
  past AA for body text.
- `--c-tertiary` (`#D42127`) on black is 4.0:1 — enough for the large display
  type and the non-text marks it is used on, but it is **never** used for body
  copy or for small text that carries meaning on its own. The active filter
  chip puts white on the red (4.4:1) rather than red on dark.
- Focus is a 2px accent outline at 3px offset, never removed.
- Every image has a written alt description in `content/site.json`; decorative
  marks are empty-alt.
- The site is fully navigable and readable with JavaScript off.
