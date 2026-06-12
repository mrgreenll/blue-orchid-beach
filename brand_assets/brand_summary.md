# Brand Summary — Blue Orchid Beach Krabi

**Compiled:** 2026-06-05 · Input for a future brand guideline. **Collection/observation only — nothing invented.**

> **Provenance note.** No official brand guide, brand color spec, or logo file is published anywhere
> public. The only resort-controlled web presence found is a **templated booking microsite**
> (`hotels-krabi.com` network) that defines no brand colors and uses generic template fonts. Therefore:
> - **Logotype colors** below are sampled from photographs of the property's **physical signage**.
> - **Environmental/interior colors** are sampled from the property photography.
> - **Web fonts** are what the microsite actually loads (template defaults — *not* a confirmed brand identity).
> - **The logotype font** is described from direct observation; its exact typeface is unidentified.
>
> All hex values were sampled programmatically (k-means + saturation filtering, pure-Python on
> `sips`-generated bitmaps) from the downloaded assets. Treat them as **measured-from-image
> approximations**, not published brand values.

---

## 1. Logotype / wordmark colors
Sampled from `logos/logotype-streetsign.jpg` (image-73) and `logos/logotype-facade.jpg` (image-32).

| Swatch role | Hex (sampled) | Notes |
|-------------|---------------|-------|
| **Brand Blue** (script "Blue"/"Beach" letters) | `#4891C2` | Medium cerulean/azure |
| **Brand Pink/Magenta** (script "Orchid" letters) | `#A84365` | Raspberry / cerise |
| **Accent Cyan** (info panel on street sign) | `#27A1DC` | Brighter sky-cyan, used behind contact details |
| White | `#FFFFFF` | Letter edging / facade wordmark |

> The street-sign wordmark alternates **blue** and **pink** letters with a white edge; the building
> fascia renders the same wordmark in **white on the signature yellow** wall.

## 2. The "orchid" (namesake) colors
Sampled from `photos/orchid-yellow-bloom-01-THUMBONLY.jpg` (image-99) — a yellow Dendrobium.

| Swatch role | Hex (sampled) | Notes |
|-------------|---------------|-------|
| **Orchid Yellow** (petals) | `#CFC73A` | Range `#BCB41C` (deep) → `#EEE865` (highlight); lemon-chartreuse |
| **Orchid Lip Magenta** | `#99424E` | Range → `#D990A1`; raspberry — echoes the logotype pink `#A84365` |
| Foliage green (hedge behind) | `#33441E` | Deep tropical green (mid-tone `#656F4C`) |

## 3. Environmental palette (photography)
| Swatch role | Hex (sampled) | Source |
|-------------|---------------|--------|
| **Lagoon / pool turquoise** | `#41A3BD` | `pool-infinity-day-01` (image-29) |
| Hazy sea-teal | `#9EBDC1` | `beach-deck-seaview-01` (image-2) |
| Sky azure | `#81B4E0` | sea/pool images |
| **Sunset gold / warm sand-light** | `#E5C89B` | `pool-sunset-palms-01` (image-24) |
| Beach sand (wet → dry) | `#6A523A` → `#80715E` → `#CA9463` | `beach-sand-detail-01` (image-33) |

## 4. Interior signature color
| Swatch role | Hex (sampled) | Source |
|-------------|---------------|--------|
| **Signature wall yellow** (rooms + building) | `#CEA304` | `room-yellow-feature-01` (image-26); a golden/amber yellow, distinct from the brighter orchid-petal yellow |
| Dark wood / headboard tone | ~`#3A2A1A` (observed) | room photos |

### Suggested palette roles (for the future guideline — proposal only)
- **Primary:** Brand Blue `#4891C2` + Accent Cyan `#27A1DC`
- **Secondary / accent:** Brand Pink `#A84365` (reinforced by the orchid lip)
- **Signature surface:** Yellow `#CEA304`
- **Supporting naturals:** Lagoon `#41A3BD`, Foliage `#33441E`, Sand `#80715E`, Sunset `#E5C89B`

---

## 5. Typography

### Logotype (observed, not a web font)
- The "Blue Orchid Beach" wordmark is a **bold, rounded, connected brush/sign-painter script**
  (hand-lettered character — heavy strokes, looping ascenders). Exact typeface **unidentified**;
  it visually resembles casual brush-script families (Pacifico / Lobster lineage) but this is **not confirmed**.
- Rendered as 3-D channel-letter signage (street pole) and white script on the facade.

### Web fonts loaded by the microsite (template defaults — *flag, not confirmed brand*)
Observed in the page `<head>` (`preload`/`<link>` to Google Fonts):

| Font | Role on site | Source (woff2) |
|------|--------------|----------------|
| **Cinzel Decorative** (v14) | Decorative display serif | `fonts.gstatic.com/s/cinzeldecorative/v14/…` |
| **Open Sans** (v34) | Body sans-serif | `fonts.gstatic.com/s/opensans/v34/…` |
| **Raleway** (v28) | Headings / UI sans-serif | `fonts.gstatic.com/s/raleway/v28/…` |

> These three are the booking-template's typefaces. They are recorded because they are what is
> *actually deployed* on the resort's only web presence, **but they should not be assumed to be the
> brand's chosen fonts.** A real guideline would likely pair a clean sans (e.g. the existing
> Raleway/Open Sans) for body with a custom script that matches the signage wordmark.

---

## 6. Gaps / what could not be collected
- **No vector or raster logo file** (SVG/PNG) — wordmark exists only as signage photos.
- **No favicon/app-icon brand asset** — the live site's favicon is the generic React framework logo.
- **No published brand color or type spec** — all values above are sampled/observed.
- Social (Facebook/Instagram) and booking platforms (Booking.com/Agoda) blocked automated access, so no
  additional original photography could be pulled from them.
