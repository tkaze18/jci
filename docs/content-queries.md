# Content queries for the practice

Everything on the site is taken from the two brochures. These are the points
where the two brochures disagree with each other, or where a value is missing,
and the call that was made in the meantime. Each one is a one-line fix in
`content/site.json`.

Nothing here blocks launch. Items 1–3 are the ones a visitor could notice.

---

### 1. Hotel Takum — Taraba or Lagos?

The project's own page says *"Lagos, Nigeria"*. The past-projects list in the
same document says *"Hôtel Takum, Taraba"*.

**Used:** Taraba, Nigeria — the list is more specific, and the detail-page
location appears to be a template default (see item 3).

### 2. Afreximbank HQ — Abuja or Lagos?

The project's page says *"Lagos, Nigeria"*. The history timeline in the same
document says *"The Afreximbank African Trade Centre (AATC) in Abuja"*, and
the commercial brochure lists AATC at *"Abuja, Nigeria"*.

**Used:** Abuja, Nigeria.

### 3. "Lagos, Nigeria · 2025 – Present" on every hospitality page

All seven project pages in the hospitality brochure carry the same location
and the same dates. Given items 1 and 2, this looks like an unedited template
default rather than seven true values.

**Used:** as printed, except where another part of the brochure contradicted
it. Worth a pass to confirm the real location and dates for Diageo Spirit,
Gabfol Airport, Metropolitan Club and Park Inn.

### 4. Ebere Omoike's email address

The contact page lists **Ebere Omoike, Team Lead** against
`e.gbenoba@jamescubittinteriors.com`. The name and the address do not match.

**Used:** the name, with no address — directing to `info@` instead. Publishing
an address that may be wrong or may belong to someone else seemed the worse
error. Supply the correct one and it goes straight in.

### 5. Missing dates

Several commercial-brochure entries store their text in a font encoding that
drops digits, so the dates could not be recovered: **Diamond / Access Bank
HQ**, **Continental Reinsurance**, **NMRC**, and the duration for **Clickatell**,
**IFF** and **IFC** in that document.

**Used:** dates recovered from elsewhere where possible (Access Bank HQ is
dated 2019 from the history timeline; IFF 2020 and IFC 2017–2018 from their
other appearances). Continental Reinsurance and NMRC currently show no year.

### 6. "ALP" and "Alpha One Towers" — one project or two?

The commercial brochure has **ALP**, Lagos, 2023, ID Service. The capability
statement separately lists **Alpha One Towers, Eko Atlantic, Lagos**.

**Used:** kept separate — ALP as a project page, Alpha One Towers in the full
list. If they are the same, merge them and the project gains a better name.

### 7. "Project Gold"

Published under its code name, because that is what the brochure calls it.
Confirm whether the client can be named, or whether the page should come down.

### 8. NICON and MTN CI Place share a page

One page of the commercial brochure carries two projects' details
interleaved: NICON (Lekki, Lagos, 2019–2020, 11 months, design and build) and
MTN CI Place (2023–ongoing, Côte d'Ivoire, ID service).

**Used:** separated. MTN CI Place has a project page; NICON appears in the
full project list only, as the photography on that page reads as MTN's.

### 9. IFF appeared twice

Once in each brochure — as a 2020 Lagos design consultancy with a written
narrative, and as a Wings Tower fit-out with sourcing and procurement.

**Used:** merged into one project with all four photographs, the narrative
from the hospitality brochure, and the combined scope.

### 10. The homepage statistics

| Stat | Source |
| --- | --- |
| 1947 | Founding date, both brochures |
| 60+ years | *"over 60 years of West African … design experience"* |
| 50+ interiors | The capability statement table runs to 54 rows |
| 5 countries | Nigeria, Ghana, Zimbabwe, Senegal, Côte d'Ivoire |

Confirm the project count before launch — a precise number reads better than
`50+` if you have one.

### 11. Photography

All 90 images were extracted from the brochure PDFs, where they are embedded
at 800px wide. They are upscaled for full-bleed use and are soft on large
screens. Dropping the original files into `assets/img/projects/` under the
same names is the single biggest quality improvement available, and needs no
code change.

Image alt text was written from what is visible in each photograph. A quick
read-through would catch anything misdescribed.
