# Tide & Light Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the four-page Blue Orchid Beach concept site a showreel-grade motion layer ("scroll is one day") and fix the nine audit findings, without changing brand, content or page structure.

**Architecture:** Progressive enhancement in two layers. `assets/main.js` keeps all functionality and works alone; it calls optional animation hooks through `BOB.run()`. `assets/motion.js` (GSAP 3.15 + Lenis 1.3.26 from jsDelivr) registers those hooks and choreographs everything else. Hidden start states exist only under `html.motion`, which a tiny inline boot script sets and a failsafe removes.

**Tech Stack:** Static HTML/CSS/vanilla JS, no build step. GSAP 3.15.0 (core, ScrollTrigger, SplitText, Flip on gallery), Lenis 1.3.26, native cross-document View Transitions. Node 26 + system Chrome over CDP for verification (no npm deps).

**Spec:** `docs/superpowers/specs/2026-09-26-motion-showreel-design.md`

## Global Constraints

- Animate only `transform` and `opacity` (SVG `transform` included). Never `transition-all`. No animated `clip-path`, `filter`, width/height/padding/gap/margin.
- Every motion gated behind `prefers-reduced-motion`; reduced motion ⇒ no `html.motion` class.
- Fonts stay Playfair Display + Raleway; palette tokens in `assets/styles.css :root` unchanged.
- Real brand photos only; no filters/grades on photos.
- Keep valid for the portfolio reel: `.hero__actions .btn`, `#rooms`, `.room-card` as the first three `article`s of `#rooms .grid-3`, card hover lift + 1.2s image zoom (`transition: transform 1.2s`).
- Every local asset referenced from HTML/CSS via `src=`, `href=` or `url()`; no `srcset`; no JS-only asset paths.
- Disclaimer div text `Unofficial concept. Not affiliated with or endorsed by the business.` and `<meta name="robots" content="noindex,nofollow">` stay on all four pages.
- CDN pins: `https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/{gsap,ScrollTrigger,SplitText,Flip}.min.js`, `https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js`.
- Automation (`navigator.webdriver`): no intro, no Lenis. `?still=1`: static finished page. `?intro=1`: force intro.
- Dev server for this plan: `PORT=3140 node serve.mjs` (port 3000 belongs to another project).
- Commit on branch `motion-showreel` after each task. Never push.

## File Map

| File | Responsibility |
|---|---|
| `verify.mjs` (new, root) | Headless CDP checks — the test suite for this plan |
| `frames.mjs` (new, root) | Captures scroll/time frame sequences for visual motion review |
| `assets/img/*.webp` (new) | Optimised copies of every photo the pages reference |
| `assets/styles.css` | Design system + fixes (labels, layout-free hovers, nav bg, translucent bands) |
| `assets/motion.css` (new) | Motion-only styles and all `html.motion` start states |
| `assets/main.js` | Functionality, fixes, hook calls (`BOB.run`) |
| `assets/motion.js` (new) | Choreography + hook implementations |
| `*.html` ×4 | Boot script, script tags, markup hooks, image paths |
| `.vercelignore` | Add `verify.mjs`, `frames.mjs` |

## Interface Contracts (shared by all tasks)

**Boot classes on `<html>`:** `js` · `motion` · `intro-on` · `still` (only `?still`) · `motion-live` (set by motion.js) · `vt-arrive` (set by the pagereveal handler when a view transition is running).

**`body[data-page]`:** `home` | `rooms` | `gallery` | `booking`.

**`window.BOB` (created in main.js):**
```js
BOB.hooks = {};                       // motion.js fills this
BOB.run(name, argsArray, fallbackFn)  // calls hooks[name](...args) or fallbackFn()
BOB.reduced                            // boolean: prefers-reduced-motion
BOB.still                              // boolean: ?still
```
Hook signatures (hook MUST call the commit/done callback exactly once; callbacks are idempotent):
- `vibeSwap(mainImg, thumbImg, commit)`
- `lightboxOpen(ctx)` · `lightboxClose(ctx, done)` · `lightboxStep(ctx, dir, commit)` — `ctx = { lb, figure, img, trigger }`
- `galleryFilter(apply)` — call `apply()` between Flip.getState and Flip.from
- `panelSwap(fromEl, toEl, dir, commit)` — dir `1` next, `-1` back
- `lock()` · `unlock()` — scroll lock (Lenis stop/start)
- `scrollTo(y)` — smooth scroll; fallback `window.scrollTo({top:y, behavior:'smooth'})`
- `nights(el, text)` — animate the nights chip text change

**Shared markup hooks:** `.sky > i.sky__l--{dawn,noon,gold,dusk}` · `button.sundial` · `.intro` · `.nav__progress` · `.cursor` (inserted by motion.js) · `.fog` · `.fireflies` · `.footer__mark` · `.cta__glow` · `.hero__frame` · `.chapters` / `.chapters__hud` · `[data-odo]` · `.suite__num` · `.filter__pill` · `.choice__check` · `.lb-count`.

---

### Task 0: Verification harness

**Files:**
- Create: `verify.mjs`, `frames.mjs`
- Modify: `.vercelignore`

**Interfaces:**
- Produces: `node verify.mjs [base] [--only=a,b]` → prints `PASS|FAIL name — detail`, exits 1 on any FAIL. `node frames.mjs <path> --scroll=from:to:steps | --time=ms:steps [--w=1440 --h=900 --label=x]` → PNGs in `temporary screenshots/frames/<label>/`.

- [ ] **Step 1:** Write `verify.mjs` — spawn system Chrome headless (`--headless=new --disable-gpu --hide-scrollbars --remote-debugging-port=<random 9400–9799>`), connect to the page target via `/json/list` (pattern of `Portfolio/tools/cdp.mjs`), enable `Page`, `Runtime`, `Log`, `Network`. Checks:
  - `assets` (static): every local `src|href|url()` in the 4 HTML files + CSS exists on disk; no `srcset=`; each page has the disclaimer string and robots noindex; styles include `@view-transition` (after Task 5 — skip if absent before then).
  - `console`: each page at 1440×900, wait load+2500ms; fail on `Runtime.exceptionThrown`, `console.error`, `Log.entryAdded` level error (404s).
  - `overflow`: each page × 375/768/1024/1440 — `scrollWidth <= innerWidth`.
  - `nojs`: `Emulation.setScriptExecutionDisabled(true)`; every `h1,h2,.section-head p,.room-card,.g-item` computed opacity is `1`.
  - `reduced`: `Emulation.setEmulatedMedia({features:[{name:'prefers-reduced-motion',value:'reduce'}]})`; `html` lacks `motion`; same visibility assertion.
  - `cdnfail`: `Network.setBlockedURLs(['*cdn.jsdelivr.net*'])`; index after 1200ms: `html` lacks `motion`, headings opacity 1.
  - `booking-prefill`: `booking.html?checkin=D5&checkout=D9&guests=2-1&rooms=2` (D = today+n, ISO) ⇒ `#ci`=D5, `#co`=D9, adults `2`, children `1`, `#rooms` value `2`, `#s-nights` = `4 nights`.
  - `booking-noscroll`: `booking.html` ⇒ `scrollY === 0` after 1500ms.
  - `booking-flash`: `booking.html?step=2`, click `.panel.active [data-next]` with no room ⇒ after 1900ms its `innerHTML` contains `<svg`.
  - `reel`: 1440×1000 `/`, load+1500ms ⇒ selectors `.hero__actions .btn`, `#rooms`, `.room-card:nth-of-type(1)`, `.room-card:nth-of-type(2)` resolve; `.intro` not visible; `.hero__tag` opacity 1 and every `.hero__tag` descendant with a transform has identity matrix.
  - `gallery-filter`: click `[data-filter=pools]`, wait 1500ms ⇒ visible `.g-item` count = count of `[data-cat=pools]`; click `[data-filter=all]` ⇒ 19.
  - `lightbox-a11y`: gallery, click first `.g-item`, wait 1000ms ⇒ `.lightbox.open` and focus inside it; dispatch Escape, wait 1000ms ⇒ focus back on that `.g-item`.
  - `intro`: `/?intro=1` ⇒ `.intro` present and hidden (display none or `html` lacks `intro-on`) within 2000ms of load (skip if no `.intro` in DOM).
- [ ] **Step 2:** Write `frames.mjs` — same launcher; `--scroll` mode sets `window.scrollTo(0,y)` per step, waits 2 rAFs + 120ms, `Page.captureScreenshot`; `--time` mode navigates then captures every `ms/steps`.
- [ ] **Step 3:** Add `verify.mjs` and `frames.mjs` under "Local dev tooling" in `.vercelignore`.
- [ ] **Step 4:** Run baseline `node verify.mjs`. Expected FAIL: `booking-prefill`, `booking-noscroll`, `booking-flash`, `nojs`, `cdnfail`(reveal hidden), `lightbox-a11y`. Record output in the task log.
- [ ] **Step 5:** Commit `Add headless verification and frame-capture tooling`.

### Task 1: Image derivatives + font trim

**Files:**
- Create: `assets/img/*.webp` (one per referenced photo)
- Modify: all 4 HTML (`brand_assets/photos/X.jpg` → `assets/img/X.webp`; fonts link)

- [ ] **Step 1:** Generate: for each unique `brand_assets/photos/*.jpg` referenced by the HTML — `hero.jpg` native size; page-head images (`room-warm-balcony-01`, `pool-walkway-palms-01`, `pool-elevated-seaview-01`) and `beach-deck-seaview-01` at 2000px long edge; all others 1600px long edge (never upscale):
  `magick in.jpg -auto-orient -resize "1600x1600>" -strip -quality 80 -define webp:method=6 assets/img/name.webp`
- [ ] **Step 2:** Replace paths in HTML (`sed` per file), leave logos in `brand_assets/logos/`.
- [ ] **Step 3:** Fonts → `https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..700;1,400..600&family=Raleway:wght@400..700&display=swap`.
- [ ] **Step 4:** `node verify.mjs --only=assets,console` ⇒ PASS. Report before/after photo KB per page.
- [ ] **Step 5:** Commit `Serve optimised WebP photos and trim font weights`.

### Task 2: Functional fixes + hook registry

**Files:** Modify `assets/main.js`, `assets/styles.css`, all 4 HTML.

**Interfaces:** Produces `window.BOB` (contract above); `data-page` on body; lightbox `ctx`; `.bookbar__label`, `.bookbar__nights`; guests option values `a-c`; rooms option values `1..3`.

- [ ] **Step 1:** main.js — `BOB` registry at top; `still` = `?still` only, `reduced` from media query; remove the `.reveal` IntersectionObserver (motion.js owns reveals).
- [ ] **Step 2:** Booking fixes: `show(i, {scroll:false})` on init; `flash()` saves/restores `innerHTML`; prefill from `checkin`/`checkout` (valid ISO ≥ today, checkout > checkin), `guests=a-c`, `rooms=n`; panel changes go through `BOB.run('panelSwap', …)`; step scroll through `BOB.run('scrollTo', …)`.
- [ ] **Step 3:** Stepper markup: bars move inside `li` (`<span class="bar" aria-hidden="true"><i></i></span>`), `aria-current="step"` on active; CSS updated.
- [ ] **Step 4:** Bookbar: wrap label text in `<span class="bookbar__label">`, add `<span class="bookbar__nights" data-nights aria-live="polite"></span>` in the check-out field, option values; main.js computes nights on change → `BOB.run('nights', [el, text], set)`.
- [ ] **Step 5:** One lightbox module serving `.marquee__item` (non-clone) and `.g-item` sources: open/close/step, counter `.lb-count` ("03 / 19"), keyboard (←/→/Esc/Tab trap), swipe (pointer, 40px threshold), neighbour preload, focus into close button on open, return focus on close, `aria-live="polite"` caption; calls `BOB.run('lightboxOpen'|'lightboxClose'|'lightboxStep')` and `BOB.run('lock'|'unlock')`.
- [ ] **Step 6:** Mobile menu: `aria-controls`, focus first link on open, Tab trap, return focus, `visibility` delayed until the close transition ends (`transition: transform …, visibility 0s linear .85s`), `BOB.run('lock'|'unlock')`.
- [ ] **Step 7:** Footer: remove Instagram link (4 pages); subscribe `required`, no inline handler, main.js success state (`.subscribe.is-done`, message "Thank you — you're on the list." in `.subscribe__msg[role=status]`).
- [ ] **Step 8:** Room cards: media becomes `<a class="room-card__media" href="rooms.html#<id>" tabindex="-1" aria-hidden="true">`, h3 text wrapped in a link to the same URL; `data-vt="<id>"` on the card img.
- [ ] **Step 9:** `body data-page`; sun dial markup + click → `BOB.run('scrollTo',[0])` (visible on all pages; static when reduced).
- [ ] **Step 10:** styles.css — layout-free hovers: `.link-arrow` (no gap transition), `.footer__links a`/`.mobile-menu a` use `translate` not padding; `.btn`, `.room-card`, `.filter`, `.choice`, `.vibe-thumb`, `.socials a` hover lifts use the `translate` property and transition `translate` (not `transform`), so GSAP transforms compose; nav keeps constant height with glass background on `.nav::after` (opacity).
- [ ] **Step 11:** `node verify.mjs` ⇒ `booking-*`, `lightbox-a11y` PASS; `nojs`/`cdnfail` still FAIL until Task 3.
- [ ] **Step 12:** Commit `Fix booking hand-off, lightbox focus, menu and hover layout shifts`.

### Task 3: Boot system + motion core

**Files:** Create `assets/motion.css`, `assets/motion.js`; modify all 4 HTML, `assets/styles.css`.

**Interfaces:** Produces in motion.js: `M` state `{ lenis, fine, auto, arrive }`; `ease` names registered via `CustomEase`-free strings (`tide`=`expo.out`, `swell`=`expo.inOut`, `bloom`=`back.out(1.6)`, `drift`=`sine.inOut`); `reveal` helpers `splitLines(el, opts)`, `fadeUp(els, opts)`, `bloomIn(els, opts)`, `curtain(frame, opts)`, `kicker(el)`; `onPage(name, fn)`.

- [ ] **Step 1:** Inline boot script in every `<head>` before the stylesheet:
```html
<script>(function(d,w){var h=d.documentElement,q=location.search,c=['js'];if(/[?&]still/.test(q))c.push('still');var rm=w.matchMedia&&w.matchMedia('(prefers-reduced-motion: reduce)').matches;if(!rm&&!/[?&]still/.test(q)){c.push('motion');var s=0;try{s=sessionStorage.getItem('bob-intro')}catch(e){}if((!s&&!navigator.webdriver)||/[?&]intro=1/.test(q))c.push('intro-on');w.__bobFail=function(){h.classList.remove('motion','intro-on')};setTimeout(function(){if(!h.classList.contains('motion-live'))w.__bobFail()},3500)}h.className+=' '+c.join(' ')})(document,window);</script>
```
- [ ] **Step 2:** Scripts before `</body>` (before the disclaimer div): `main.js` defer, then the CDN tags defer with `onerror="window.__bobFail&&__bobFail()"`, `Flip` only on gallery, then `assets/motion.js` defer. `<link rel="stylesheet" href="assets/motion.css">` after styles.css.
- [ ] **Step 3:** styles.css — remove global `.reveal` hidden state and `background-attachment:fixed` gradients (moved to `.sky`); `.bg-paper2` becomes `rgba(236,227,210,.62)`.
- [ ] **Step 4:** motion.css start states, all prefixed `.motion` — `[data-reveal]`, `.hero__tag`, `.pagehead h1`, `.section-head > *`, `.kicker::before` (scaleX 0), `.intro` display only under `.intro-on`; Lenis rules (`html.lenis,html.lenis body{height:auto}`, `.lenis-smooth{scroll-behavior:auto!important}`, `.lenis-stopped{overflow:hidden}`); `.sky` layer styles (fixed, `z-index:-1`, dawn opacity 1 by default).
- [ ] **Step 5:** motion.js core: bail + `__bobFail()` if `gsap` missing; register plugins; add `motion-live`; Lenis (fine pointer, not `auto`) on GSAP ticker; hooks `lock/unlock/scrollTo`; reveal engine (SplitText `mask:'lines'`, `autoSplit:true`, `aria:'auto'`; defaults: lines `yPercent:105→0`, 1.2s `tide`, stagger .09, trigger `top 85%`); curtain (insert `.curtain` span, panel `xPercent/yPercent 0→±101`, 1.3s `swell`; image scale 1.2→1, 1.6s `tide`); section-head auto choreography; `data-reveal` fade/bloom/stagger; `html.still` guard.
- [ ] **Step 6:** `node verify.mjs` ⇒ all PASS (`nojs`, `reduced`, `cdnfail` now pass). `node screenshot.mjs "http://localhost:3140/?still=1" t3 1440 900` unchanged layout.
- [ ] **Step 7:** Commit `Add motion boot flags, Lenis and the reveal engine`.

### Task 4: Global chrome — nav, sky, sun dial, cursor, magnetic, footer

**Files:** Modify `assets/motion.js`, `assets/motion.css`, `assets/styles.css`, 4 HTML.

| Piece | Spec |
|---|---|
| Nav | `.nav--hide` (`translateY(-100%)`, .6s `tide`) when scrolling down past 160px, removed on scroll up or menu open; `.nav__progress` scaleX = page progress, gradient `--lagoon → --yellow-soft → --orchid`; link text roll: JS wraps text `<span class="roll"><span>t</span><span aria-hidden="true">t</span></span>`, hover translates both −100%, .5s `tide` |
| Sky | layers: dawn `radial(70vw 60vw at 85% -10%, rgba(65,163,189,.20))`, noon `radial(80vw 70vw at 50% 0%, rgba(129,180,224,.16))`, gold `radial(80vw 70vw at 10% 100%, rgba(229,200,155,.34))`, dusk `radial(80vw 70vw at 90% 100%, rgba(168,67,101,.16)) + radial(60vw 50vw at 0 0, rgba(72,145,194,.10))`; one scrubbed timeline over the document: dawn→noon (0–.25), noon→gold (.25–.6), gold→dusk (.6–.9) |
| Sun dial | 64×40 SVG arc; `.sundial__rot` `rotation 0→180`, `svgOrigin:"32 34"`, scrub; label phases Morning <.2 ≤ Midday <.45 ≤ Golden hour <.72 ≤ Dusk <.9 ≤ Night — swap with y 60%→0 fade .5s; button shows (`autoAlpha 0→1`, y 12→0) after 60% of first viewport |
| Cursor | fixed `.cursor` (72px circle, `--orchid` 90%, label 11px caps), `gsap.quickTo` x/y .45s `power3`; scale 0→1 `bloom` on enter of `[data-cursor]`, label from attribute; fine pointer only |
| Magnetic | `.btn:not(.btn--sm)`, `.nav__cta`, `.subscribe button`, `.sundial`: pull ×0.28 (max 10px), inner children ×0.14, return `elastic.out(1,.45)` .9s |
| Buttons | `.btn::after` shimmer `translateX(-120%→120%)` .9s on hover; `:active` `scale:.97` |
| Footer | `.fireflies` 12 dots, CSS `@keyframes firefly` (translate drift + opacity pulse, 7–13s, per-dot vars), paused unless `.is-inview`; `.footer__mark` (horizontal logo, 8% opacity) `yPercent 60→0` scrub over last 60vh |

- [ ] **Step 1:** Markup (4 pages): `.sky` first in body, `.nav__progress` in nav, `.fireflies` + `.footer__mark` in footer.
- [ ] **Step 2:** CSS + JS for each piece in the table.
- [ ] **Step 3:** `node frames.mjs / --scroll=0:9000:12 --label=chrome` and inspect nav, dial, sky tint; `node verify.mjs` all PASS.
- [ ] **Step 4:** Commit `Add nav, day-cycle sky, sun dial, cursor and footer night`.

### Task 5: First-visit intro + page transitions

**Files:** Modify `assets/motion.js`, `assets/motion.css`, 4 HTML (intro markup, pagereveal/pageswap inline script).

- [ ] **Step 1:** Intro markup after `<body>`: `.intro > .intro__inner > svg.intro__orchid (5 petals + lip + column, petals as `<g class="petal">`) + .intro__mark > .intro__mask > img(stacked white logo)`.
- [ ] **Step 2:** Timeline (≤1.5s): petals scale 0→1 + rotation −40→0 stagger .06 `bloom` (0–.55); logo mask wipe (outer `xPercent −101→0`, inner `+101→0`) .7s `swell` (.2–.9); panel `yPercent 0→−100` .75s `swell` (.8–1.55) while `.hero__frame`/`.pagehead__media` scale 1.25→1 and the hero entrance starts at 1.05; on complete set `sessionStorage bob-intro=1`, remove `intro-on`. Click skips to end.
- [ ] **Step 3:** CSS view transitions inside `@media (prefers-reduced-motion: no-preference)`: `@view-transition{navigation:auto}`; `::view-transition-old(root)` → `translateY(-4%) scale(.965)`, opacity .35, .8s `cubic-bezier(.7,0,.2,1)`; `::view-transition-new(root)` from `translateY(100%)`, 1s `cubic-bezier(.16,1,.3,1)`, `border-radius: 28px 28px 0 0`, shadow; `.nav{view-transition-name:site-nav}`, `.sundial{view-transition-name:sundial}`; `::view-transition-group(room-media)` .9s `cubic-bezier(.7,0,.2,1)`, old/new `object-fit:cover; height:100%`.
- [ ] **Step 4:** Shared element: home card link click (no modifier keys) → `sessionStorage bob-vt=<id>`, card img `style.viewTransitionName='room-media'`. Inline head script on all pages: `pagereveal` → if `e.viewTransition`, add `vt-arrive`; if `bob-vt` set and `#<id> .suite__media img` exists, name it `room-media`, mark `data-arrived`; clear both after `e.viewTransition.finished`. `pageshow` (persisted) clears names. motion.js skips reveals for `[data-arrived]` and delays entrances .35s under `vt-arrive`.
- [ ] **Step 5:** `node verify.mjs --only=intro,reel,console` PASS; `node frames.mjs "/?intro=1" --time=1800:12 --label=intro` and inspect.
- [ ] **Step 6:** Commit `Add first-visit intro and tide page transitions`.

### Task 6: Home — hero, booking bar, The Vibe, Welcome

| Piece | Spec |
|---|---|
| Hero markup | `.hero__frame` wraps `.hero__media` + `.hero__scrim` (+ `.hero__leak` warm light, opacity .22, CSS drift 26s) |
| Entrance | frame scale 1.18→1 1.8s `tide`; kicker letters `autoAlpha` stagger .02; `.hero__tag` lines rise stagger .1 (1.3s); sub fade-up .2 later; actions `bloom` stagger .08; cue fades in |
| Frame on scroll | ScrollTrigger `.hero` `top top`→`bottom top` scrub .6: frame `scale 1→.86`, `yPercent 0→8`; `.hero__inner` `yPercent 0→-35`, `autoAlpha 1→0` by 70%; frame box `inset:-4vw; border-radius:44px` so corners appear only when scaled |
| Ken Burns | CSS stays; keyframe max scale 1.16 → 1.1 |
| Scroll cue | `.hero__scroll` becomes text + 44px line whose fill scaleY loops (CSS, 2.4s) |
| Booking bar | from y 40 + autoAlpha after hero entrance, fields stagger .06; nights hook rolls old text up / new text in (.45s) |
| Vibe | quote SplitText words, opacity .16→1 scrubbed `top 75%`→`bottom 55%`; copy + thumbs fade-up; `vibeSwap` hook = FLIP: clone thumb img fixed at thumb rect → tween to main rect (.9s `swell`), main fades .3s, `commit()`, clone removed; main img parallax `yPercent -6→6` inside frame (wrapper scale 1.12) |
| Welcome | curtain on `.feature__media` (panel `--lagoon`), badge slides x −20→0; chips `bloom` stagger .06; keep existing scroll zoom + pointer parallax |

- [ ] **Step 1:** Markup + CSS + JS per table.
- [ ] **Step 2:** `node frames.mjs / --scroll=0:1400:10 --label=hero` + `--time=1600:10 --label=hero-in`; inspect framing, legibility at every frame.
- [ ] **Step 3:** `node verify.mjs --only=reel,console,overflow,nojs` PASS.
- [ ] **Step 4:** Commit `Home: hero frame, booking bar, vibe and welcome motion`.

### Task 7: Home — Experience chapters, stats, room cards

| Piece | Spec |
|---|---|
| Chapters (≥1024 + `motion-live`) | `.chapters` grid `1fr 1fr`, gap 6vw; `.chapters .feature{display:contents}`; bodies col 1 row n, `min-height:88vh`, centered; all `.feature__media` col 2 `grid-row:1 / span 3`, `position:sticky; top:11vh; height:78vh; align-self:start`; media 2/3 image wrapper starts `yPercent 100`; per chapter n>1: scrub `top 75%`→`top 25%` of body n: incoming img `yPercent 100→0` + scale 1.25→1, outgoing img `yPercent 0→-18` + overlay opacity 0→.35; HUD counter digits `yPercent` to −100·(n−1), bar scaleY = progress; inactive bodies opacity .28 ↔ 1 |
| Chapters (<1024 or no motion) | existing alternating features with curtain reveals |
| Stats | `[data-odo]` digits → `.odo > .odo__strip` 0–9 columns, strip `yPercent −10·d` 1.6s `tide` stagger .08; "SHA" chars rotateX 90→0 `bloom`; ornament rotation −90→0 + scale 0→1, side rules scaleX |
| Room cards | batch rise: y 90, rotationX 12, autoAlpha 0, `transformPerspective:1100`, 1.3s `tide`, stagger .12, img scale 1.25→1 then `clearProps`; tilt on pointermove rotateY ±6 / rotateX ±5 via quickTo .6s, `.room-card__glare` radial follows pointer, reset on leave |

- [ ] **Step 1:** Markup (`.chapters` class, `.chapters__hud`, overlay spans) + CSS + JS per table.
- [ ] **Step 2:** `node frames.mjs / --scroll=<experience top>:<rooms bottom>:16 --label=chapters` at 1440×900 and 1024×768; inspect.
- [ ] **Step 3:** `node verify.mjs --only=reel,console,overflow` PASS; confirm `.room-card:hover` still lifts and zooms (CSS unchanged apart from `translate`).
- [ ] **Step 4:** Commit `Home: pinned experience chapters, odometer stats, tilting room cards`.

### Task 8: Home — Moments marquee, viewer motion, location mist, CTA glow

| Piece | Spec |
|---|---|
| Marquee | `.marquee.is-live` disables CSS animation; per row `x` in px, base 38px/s (row 2 opposite); velocity boost `+ |v|·0.35`, direction sign follows scroll direction; skewX = clamp(v·0.004, −5, 5) lerped .1; hover → speed lerps to 0; drag with pointer capture, release inertia decay .95/frame; click suppressed after 6px travel; wrap at half width; paused off-screen (ScrollTrigger `onToggle`); `data-cursor="View"` on items |
| Viewer | `lightboxOpen`: backdrop 0→1 .45s; image FLIP from trigger rect (uniform scale, translate) .8s `swell`; caption lines rise; `lightboxClose`: reverse to trigger if on-screen else scale .94 + fade .4s; `lightboxStep`: out x ∓60 + fade .3s, `commit()`, in from ±60 .55s `tide` |
| Location mist | `.fog > i` ×2: 220% wide soft radial "puffs", `@keyframes fog` translateX 0→−50%, 70s / 110s linear infinite, opacity .38 / .24, band top 8%–58%; paused when off-screen |
| Location | pins drop y −14→0 `bounce.out` .8s stagger .12; image parallax |
| CTA | media scale 1.18→1 scrub; `.cta__glow` radial amber at 70% 38%, `yPercent 0→40` + opacity .55→0 scrub (very subtle); text lines rise |

- [ ] **Step 1:** Implement per table.
- [ ] **Step 2:** `frames.mjs` scroll captures of marquee + CTA; manual drag/click check in the browser pane.
- [ ] **Step 3:** `node verify.mjs` all PASS.
- [ ] **Step 4:** Commit `Home: kinetic marquee, zooming viewer, drifting mist, dusk glow`.

### Task 9: Rooms page

| Piece | Spec |
|---|---|
| Page head (shared by 3 inner pages) | h1 SplitText chars `yPercent 110→0` stagger .025 1.1s; crumbs/p fade-up; media scale 1.22→1 1.8s then scrub `yPercent 0→18`, scrim opacity up |
| Suites | curtain alternating direction (`suite--rev` from left); price plaque x 40→0 `bloom`; kicker rule; amenities stagger .05 with icons rotate −30→0; `.suite__num` (outlined Playfair 18vw, `-webkit-text-stroke`, 7% ink) `yPercent 30→−30` scrub |
| Inclusions | cards stagger `bloom`; icon hover micro-animations (CSS on `.loccard:hover`): breakfast steam rise, wifi arcs pulse in sequence, pool waves slide, SHA check pop, car nudge, housekeeping lines sweep |

- [ ] **Step 1:** Markup (`.suite__num`, icon sub-paths/classes) + CSS + JS.
- [ ] **Step 2:** frames at 1440 + 375; `node verify.mjs` PASS.
- [ ] **Step 3:** Commit `Rooms: letter-built titles, suite unveils, parallax numerals, living icons`.

### Task 10: Gallery page

| Piece | Spec |
|---|---|
| Filter | `.filter__pill` absolutely positioned; on click `Flip.getState(pill)`, move pill into active button, `Flip.from` .6s `tide`; `galleryFilter` hook: `Flip.getState('.g-item')`, `apply()`, `Flip.from(state,{duration:.8, ease:'expo.inOut', stagger:.015, absolute:true, onEnter: bloom in, onLeave: scale .8 + fade})` |
| Masonry | `ScrollTrigger.batch('.g-item')` curtain + rise, stagger .08; `data-cursor="View"` |
| Location / map | fog on karst; `.locmap` curtain; loc cards stagger |
| Contact | icon hover: phone wiggle (rotate ±12°), envelope flap (scaleY), clock hands rotate |

- [ ] **Step 1:** Implement per table (Flip script tag on gallery only).
- [ ] **Step 2:** `node verify.mjs --only=gallery-filter,lightbox-a11y,console,overflow` PASS; frames of a filter change.
- [ ] **Step 3:** Commit `Gallery: flipping filter, sliding pill, batch unveils`.

### Task 11: Booking page

| Piece | Spec |
|---|---|
| Stepper | `.bar i` scaleX 0→1 when step done (.7s `tide`); active dot `bloom` scale 1.15→1; done dot shows check (`.dot` text → svg, scale pop) |
| Panels | `panelSwap`: out x −40·dir + fade .35s `power2.in`, `commit()`, in x 40·dir→0 + fade .6s `tide`, fields stagger .04 |
| Choices | click ripple span scale 0→4, opacity .22→0 .7s; `.choice__check` scale 0→1 `bloom` when `.sel` |
| Summary | total counts via tween of a number object (0.8s `tide`), formatted `฿#,###`; updated rows flash (pseudo opacity .6→0 .8s) |
| Confirm | `.confirm__check` scale 0→1 `back.out(2)`; check path reveal via mask rect translateX; 14 petals burst (random angle, distance 90–180px, rotation, fall 60px, fade) 1.6s; reference scrambles 0.9s |

- [ ] **Step 1:** Implement per table.
- [ ] **Step 2:** `node verify.mjs --only=booking-prefill,booking-noscroll,booking-flash,console` PASS; frames of step changes + confirmation.
- [ ] **Step 3:** Commit `Booking: stepping progress, sliding panels, counting totals, petal confirm`.

### Task 12: Full verification pass

- [ ] **Step 1:** `node verify.mjs` — all PASS.
- [ ] **Step 2:** Screenshot loop, 2 passes: each page at 375, 768, 1024, 1440 with `?still=1` via `node screenshot.mjs "<url>?still=1" <label> <w> <h>`; fix spacing/overflow/legibility issues found.
- [ ] **Step 3:** Motion review via `frames.mjs` at 1440×900 for hero, chapters, stats, cards, marquee, CTA, footer, each inner page head; reduced-motion run (`verify.mjs --only=reduced`) and visual check.
- [ ] **Step 4:** Browser-pane live check: Lenis feel, cursor, magnetic, page transitions + room morph, intro (`?intro=1`), mobile menu at 375.
- [ ] **Step 5:** Update `CLAUDE.md` project section with stack/motion notes (GSAP/Lenis CDN, verify/frames tools, boot flags) — keep it short.
- [ ] **Step 6:** Commit `Verify and polish the Tide & Light pass`.
