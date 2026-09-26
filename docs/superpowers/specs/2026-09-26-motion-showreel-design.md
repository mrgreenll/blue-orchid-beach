# Tide & Light — motion overhaul design

**Date:** 2026-09-26 · **Status:** approved by Leo (direction, all four signatures, build straight through)
**Branch:** `motion-showreel` — never pushed from here; Vercel deploys `main`.

## Goal

Turn the Blue Orchid Beach concept site — the featured piece on leosilvagni.com — into a motion
showreel, without changing its brand, content or page structure. Fix what the audit found on the way.

## Concept

**Scroll is one day at Blue Orchid.** The homepage plays out turquoise morning → midday →
golden hour → dusk, and the footer is night. The page's ambient light shifts with scroll, and a
small sun dial tracks the time of day and doubles as back-to-top.

Motion vocabulary follows the brand mood (serene, golden-hour, romantic, warm):

| Token | Use | Curve |
|---|---|---|
| `tide` | reveals, frames, page transitions | `expo.out` / `cubic-bezier(.16,1,.3,1)`, 1.1–1.6s |
| `swell` | two-way moves (curtains, panel swaps) | `expo.inOut` / `cubic-bezier(.7,0,.2,1)` |
| `bloom` | small UI only: chips, buttons, checks | `back.out(1.6)` / `--spring` |
| `drift` | ambient loops: mist, fireflies, Ken Burns | `sine.inOut` / linear, 20–90s |

Nothing fast or glitchy. Springs are for small UI; everything large moves slowly.

## Constraints (all hard)

- **Brand:** Playfair Display + Raleway, sampled palette, real photos only, no colour grading or
  filters on photos (guideline 06: no heavy filters, no cold grades).
- **WEB-BUILDS:** animate only `transform` and `opacity`; never `transition-all`; every motion
  gated behind `prefers-reduced-motion`; hover/focus-visible/active on every control with no
  layout shift. No new sections or invented facts.
- **Robustness:** content visible with no JS, with a failed CDN, and in `?still=1` screenshots.
  Disclaimer bar and `noindex` untouched on every page.
- **Portfolio pipeline** (`Portfolio/tools/`):
  - Reel selectors stay valid: `.hero__actions .btn`, `#rooms`, `.room-card` ×3 (first three
    `article`s of their grid), card hover lift + 1.2s image zoom.
  - Hero ambient loops stay CSS animations (record.mjs phase-syncs those).
  - Intro and smooth scroll are skipped under automation (`navigator.webdriver`), so the reel
    starts on a hero at rest; recorder drives `window.scrollTo` directly.
  - collect.mjs copies only what HTML/CSS reference via `src`/`href`/`url()` → no `srcset`,
    no JS-only asset paths, every local file referenced from HTML.
- **Libraries:** GSAP 3.15.0 (core, ScrollTrigger, SplitText; Flip on gallery) and Lenis 1.3.26
  from jsDelivr, pinned. Site works fully if they fail to load.

## Architecture

```
index/rooms/gallery/booking.html   markup hooks, image paths → assets/img/*.webp, fixes
assets/styles.css                  design system (existing) + fixes
assets/motion.css      NEW         motion-only styles: states, intro, sky, dial, cursor,
                                   chapters layout, fog, fireflies, view transitions
assets/main.js                     functionality (works alone) + fixes + hook calls
assets/motion.js       NEW         choreography; registers hooks main.js calls
assets/img/*.webp      NEW         optimised copies of referenced brand photos
```

**Boot flags** (inline `<head>` script, render-blocking, tiny):
`html.js` always · `html.motion` unless reduced-motion or `?still` · `html.intro-on` on the first
page of a session (sessionStorage) when motion is on and not automated (`?intro=1` forces it).
A 3.5s failsafe and `onerror` on the GSAP tags remove `motion`/`intro-on` if motion.js never
reports in; motion.js adds `html.motion-live` when it boots.

**Hidden initial states** exist only under `html.motion`, so no-JS, failed CDN, reduced motion
and `?still` all render the finished page.

**Hooks:** main.js owns state, a11y and logic; where an interaction deserves animation it calls
`BOB.run(name, args, fallback)` — motion.js registers `vibeSwap`, `lightboxOpen/Close/Step`,
`galleryFilter`, `panelSwap`, `menu`, `lock/unlock` (Lenis stop/start). Missing hook → fallback.

**Script order** (all `defer`): main.js → gsap → ScrollTrigger → SplitText (→ Flip) → lenis →
motion.js. Functionality never waits on the CDN.

## Global motion system

- **Lenis** inertial scroll on fine pointers only; off for reduced motion, `?still`, automation.
  Synced to the GSAP ticker; `lenis.stop()` while lightbox/menu is open.
- **Reveals:** SplitText line masks (`mask: "lines"`, `autoSplit`) for headings; kicker rule
  draws (scaleX) before its text; paragraphs fade-rise; chip/card groups stagger with `bloom`.
- **Colour-block curtains** for photos: a brand-colour panel covering the frame translates away
  while the photo settles from scale 1.2 → 1. Transform-only; frame and shadow never move.
- **Day-cycle sky:** fixed layer behind content (`z-index:-1`) with dawn / noon / gold / dusk
  gradient layers; ScrollTrigger scrubs their opacity over page progress. Replaces the body's
  `background-attachment: fixed` gradients. Cream bands become translucent so the light shows.
- **Sun dial:** fixed bottom-left button (back to top). Sun rides an arc by rotation; label rolls
  Morning → Midday → Golden hour → Dusk → Night. Appears once past the hero.
- **Nav:** constant height; glass background fades in via pseudo-element; hides on scroll down,
  returns on scroll up; text-roll link hovers; day-gradient progress hairline (scaleX).
- **Cursor bubble** ("View") over photos that open the viewer; "Drag" while dragging the strip.
  Fine pointers only.
- **Magnetic CTAs:** primary buttons lean ≤10px toward the cursor. CSS hover lifts move to the
  individual `translate` property so they compose with GSAP transforms.
- **Page transitions:** `@view-transition { navigation: auto }` (no-preference only). Outgoing
  page sinks and dims; incoming page rises as a rounded sheet ("the tide"). Nav and sun dial
  persist via `view-transition-name`. Home room card → its suite on rooms.html morphs as a
  shared element (sessionStorage handoff + `pagereveal`). Unsupported browsers navigate normally.
- **First-visit intro (≤1.5s):** foliage-green panel; orchid mark blooms; stacked wordmark wipes
  in; panel lifts into the hero as the hero settles and its headline rises.

## Page by page

**Home**
- Hero: headline lines rise; kicker tracks in; buttons bloom. On scroll the photo and scrim shrink
  into a rounded frame (hero literally "framed by the sea") while the text lifts away. CSS Ken
  Burns stays (lower max scale — the source is only 1201px wide). Scroll cue becomes a tide line.
- Booking bar: springs up after the hero; live nights chip counts ("3 nights").
- The Vibe: quote lights up word by word on scroll; thumbnail flies into the main frame (FLIP)
  on click; main photo drifts; background glows breathe.
- Welcome: curtain photo (keeps scroll zoom + pointer parallax), chips bloom.
- Experience → **three chapters** (≥1024px, motion-live only): `.feature` becomes
  `display:contents` inside a 2-column grid; bodies stack left, the three photos share one sticky
  frame right; each chapter wipes its photo up over the last, with a 01/02/03 counter and progress
  bar on the frame; inactive chapter text dims. Below 1024px or without motion: current layout.
- Stats: odometer digit rolls; "SHA" letters flip in; orchid ornament blooms.
- Rooms: staggered 3D rise; cursor-follow tilt with glare. Card photo + title link to the suite on
  rooms.html (enables the shared-element morph).
- Moments: JS marquee reacting to scroll velocity (speed + skew, direction follows scroll),
  drag-and-throw, eases to a stop on hover; photos zoom out of the strip into the viewer.
- Location: karst mist drifts (CSS fog cinemagraph); pins drop in.
- CTA: photo parallax; a faint warm glow sinks at the horizon (kept subtle — no fake sun).
- Footer: night — fireflies, oversized wordmark rises; newsletter button morphs to a check.

**Rooms** — letter-by-letter title, page-head zoom-out + parallax; suites unveil from alternating
sides; price plaque slides in; amenities stagger; giant outlined numerals 01–03 parallax behind
each suite; per-icon hover micro-animations on "Every stay includes".

**Gallery** — sliding active pill; filtering re-flows the masonry with Flip (leavers shrink out,
arrivals bloom in); batch curtain reveals; viewer zooms from the thumbnail and back; mist on the
karst photo; map frame reveal; contact icons animate on hover.

**Booking** — stepper line fills and completed dots morph to checks; panels slide by direction;
room choice ripple + check badge; summary totals count; confirmation check draws, petals burst,
reference scrambles in.

**Viewer (home + gallery)** — one lightbox implementation: FLIP zoom in/out, directional slides,
swipe, counter, focus trap + focus return, `aria-live` caption.

## Audit fixes

1. Booking bar values reach booking.html (`checkin`, `checkout`, `guests`, `rooms` prefill).
2. booking.html no longer scrolls past its header on load.
3. "Please choose a room" flash restores the button's markup (icon kept).
4. Reveal-hidden content only under `html.motion` (no blank page without JS).
5. Photos → `assets/img/*.webp` (1600px long edge, full-bleed 2000px, hero native 1201px).
   Google Fonts trimmed to variable ranges actually used.
6. Instagram icon removed (it linked to Facebook; no official Instagram exists).
7. Stepper markup valid (bars inside `li`); booking-bar labels get their intended style.
8. Lightbox focus management; mobile menu animates closed and traps focus.
9. Layout-animating hovers (padding, gap, height) replaced with transforms.

## Reduced motion / fallbacks

Reduced motion: no Lenis, intro, scrubs, chapters layout, marquee motion, fog, fireflies, cursor,
magnetism, tilt or page-transition slides; sun dial stays as a static back-to-top. No JS or failed
CDN: finished static page, current layouts, CSS marquee. `?still=1`: finished static page.

## Verification

- Screenshot loop at 375 / 768 / 1024 / 1440 for all four pages (`?still=1`), ≥2 passes.
- Frame captures mid-motion (scripted CDP scroll) for hero frame, chapters, marquee, viewer,
  transitions; console clean; no horizontal overflow; reduced-motion run; no-JS run.
- Reel check: headless 1440×1000, plain `/`, hero at rest within 1.5s of load, selectors present.
- Functional checks: booking prefill, no load scroll, flash icon, filter, viewer keyboard/focus.

## Out of scope

Portfolio repo changes (the reel is re-recorded by Leo after merge), pushing or deploying,
new content, font or palette changes, WebGL.
