# Blue Orchid Beach Krabi — client website

**Build rules:** `WEB-BUILDS.md` at the workspace root. Read it first — it covers the
`frontend-design` skill requirement, the localhost + screenshot loop, and the design guardrails.
Only this project's specifics are below.

## Project

- Client website. Multi-page static site with its own git repo.
- Pages: `index.html`, `rooms.html`, `gallery.html`, `booking.html`
- Shared files in `assets/`

## Brand

- `brand_assets/` holds real logos and photography — **use them, not placeholders**.
- Start with `brand_assets/brand_summary.md` and `brand_assets/MANIFEST.md` (the asset map).
- Logos: `brand_assets/logos/` — exact horizontal + stacked, white, SVG and PNG.
- Photos: `brand_assets/photos/` — real property photography (rooms, food).
- Pages serve WebP copies from `assets/img/` (q72, 1600px long edge). A new photo goes
  there too, referenced from HTML with `src` — `collect.mjs` copies only what HTML/CSS
  reference, so no `srcset` and no JS-only image paths.

## Motion ("Tide & Light", 2026-09-26)

- Static site, no build. GSAP 3.15 (ScrollTrigger, SplitText; Flip on gallery) and Lenis
  1.3.26 load from jsDelivr, pinned in each page's script tags.
- `assets/main.js` holds all behaviour and works alone. `assets/motion.js` is the
  choreography core; `motion-home.js` / `motion-pages.js` hold page set-pieces. They meet
  on `BOB.run(hook, …)` — every hook has a plain fallback.
- Motion roles are `data-m="…"` attributes in the markup (enter, kicker, lines, up, kids,
  curtain, words, cards, batch, ornament). Start states apply only under `html.motion`,
  set by the inline boot script in every `<head>`: no JS, reduced motion, a blocked CDN
  and `?still=1` all render the finished page. Animate `transform`/`opacity` only.
- `?still=1` = screenshot mode, `?intro=1` forces the first-visit intro. Headless Chrome
  (verify, frames, the portfolio reel) gets native scroll and no intro.
- Chrome's `--screenshot` / `--virtual-time-budget` mode (this repo's `screenshot.mjs`, the
  portfolio's `shoot.mjs`) barely runs animation frames, so the GSAP entrance never
  finishes there: always shoot with `?still=1`. CDP-driven tools run in real time and are fine.

## Checks

- Serve with `PORT=3140 node serve.mjs` (port 3000 belongs to another project).
- `node tools/verify.mjs` — headless regression suite: assets as collect.mjs sees them,
  console, overflow, clipped text, no-JS, reduced motion, blocked CDN, booking hand-off,
  the reel's hero-at-rest contract, gallery filter, viewer focus, intro.
- `node tools/frames.mjs <path> --scroll=a:b:n | --time=ms:n` — frame sequences for
  reviewing motion (`temporary screenshots/frames/`).

## Portfolio reel

- `Portfolio/tools/reels/blue-orchid-beach.mjs` relies on `.hero__actions .btn`,
  `#rooms` and the first two `.room-card`s (hover lift + 1.2s zoom) — keep them.
- Its two scrollTo beats are sized by the distance to `#rooms` (5,905px at 1440×1000,
  beats 5600/5900ms, ~1,050px/s). If the page above `#rooms` changes height, rescale
  them, then `node tools/collect.mjs blue-orchid-beach` and `node tools/record.mjs
  blue-orchid-beach` in `Portfolio/`.
