/* Blue Orchid Beach — motion layer ("Tide & Light").
   Choreography only: every behaviour lives in main.js and works without this file.
   Runs only under html.motion (set by the inline boot script); page set-pieces live in
   motion-home.js / motion-pages.js and register through BOB.page(). */
(function () {
  'use strict';
  var d = document, h = d.documentElement, w = window;
  var BOB = w.BOB || (w.BOB = { hooks: {} });
  BOB.hooks = BOB.hooks || {};

  if (!h.classList.contains('motion') || !w.gsap || !w.ScrollTrigger || !w.SplitText) {
    if (w.__bobFail) w.__bobFail();
    return;
  }
  // Report in first, so the boot script's failsafe never strips the start states.
  h.classList.add('motion-live');

  var gsap = w.gsap, ScrollTrigger = w.ScrollTrigger, SplitText = w.SplitText;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  if (w.Flip) gsap.registerPlugin(w.Flip);
  gsap.config({ nullTargetWarn: false });
  ScrollTrigger.config({ ignoreMobileResize: true });

  var M = BOB.motion = {
    gsap: gsap, ScrollTrigger: ScrollTrigger, SplitText: SplitText,
    fine: w.matchMedia('(hover: hover) and (pointer: fine)').matches,
    // Headless capture (the portfolio reel, verify/frames) gets native scroll and no intro.
    auto: !!navigator.webdriver || /HeadlessChrome/.test(navigator.userAgent),
    page: d.body.getAttribute('data-page') || '',
    lenis: null,
    entrance: null,          // the page-load timeline (hero / page head)
    held: true,              // scroll reveals wait until the entrance is well under way
    pages: {},
    enterHooks: [],
    chrome: [],
  };
  // Each page file registers its set-pieces; BOB.onEnter adds to the load timeline.
  BOB.page = function (name, fn) { (M.pages[name] = M.pages[name] || []).push(fn); };
  BOB.onEnter = function (fn) { M.enterHooks.push(fn); };
  BOB.chrome = function (fn) { M.chrome.push(fn); };

  var qsa = function (sel, ctx) { return [].slice.call((ctx || d).querySelectorAll(sel)); };
  var expoOut = function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
  M.qsa = qsa;
  M.expoOut = expoOut;

  /* ================= Smooth scroll ================= */
  function initLenis() {
    if (!w.Lenis || !M.fine || M.auto) return;
    M.lenis = new w.Lenis({
      lerp: 0.085,
      smoothWheel: true,
      autoRaf: false,
      prevent: function (node) { return !!(node.closest && node.closest('.lightbox, .mobile-menu, iframe')); },
    });
    M.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { M.lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Same-page anchors glide instead of jumping (the nav's gallery.html#contact included).
    d.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href*="#"]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      var url = new URL(a.getAttribute('href'), location.href);
      if (url.pathname !== location.pathname || !url.hash) return;
      var target = d.getElementById(decodeURIComponent(url.hash.slice(1)));
      if (!target) return;
      e.preventDefault();
      M.lenis.scrollTo(target, { offset: -90, duration: 1.6, easing: expoOut });
      history.pushState(null, '', url.hash);
    });
  }

  BOB.hooks.lock = function () { if (M.lenis) M.lenis.stop(); };
  BOB.hooks.unlock = function () { if (M.lenis) M.lenis.start(); };
  BOB.hooks.scrollTo = function (y) {
    if (M.lenis) {
      M.lenis.scrollTo(y, { duration: Math.min(2.4, 1 + Math.abs(w.scrollY - y) / 5000), easing: expoOut });
    } else {
      w.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  /* ================= Reveal engine =================
     Elements carry a role in data-m. Triggers that fire in the same frame are played in
     document order with a short cascade, so a section head reads kicker → title → text. */
  var queue = [], flushing = false;
  function enqueue(el, play) {
    queue.push({ el: el, play: play });
    if (!flushing) { flushing = true; w.requestAnimationFrame(flush); }
  }
  function flush() {
    flushing = false;
    if (M.held) return;
    var batch = queue.splice(0);
    batch.sort(function (a, b) {
      return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    batch.forEach(function (item, i) { item.play(Math.min(i, 6) * 0.085); });
  }
  M.release = function () {
    if (!M.held) return;
    M.held = false;
    flush();
  };
  function whenVisible(el, play, start) {
    var done = false;
    var run = el.__mPlay = function (delay) {
      if (done) return;
      done = true;
      play(delay || 0);
    };
    ScrollTrigger.create({
      trigger: el, start: start || 'top 94%', once: true,
      onEnter: function () { enqueue(el, run); },
    });
  }
  // Keyboard users never wait on a reveal: focus inside a pending element plays it now.
  d.addEventListener('focusin', function (e) {
    for (var n = e.target; n && n !== d.body; n = n.parentNode) {
      if (n.__mPlay) n.__mPlay(0);
    }
  });
  M.whenVisible = whenVisible;
  M.claim = function (el) { el.__mClaimed = true; };

  var roles = {
    kicker: function (el) {
      var centred = el.classList.contains('kicker--center');
      gsap.set(el, { opacity: 0, x: centred ? 0 : -14, y: centred ? 10 : 0, '--k': 0 });
      return function (delay) {
        gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.9, ease: 'expo.out', delay: delay, clearProps: 'transform' });
        gsap.to(el, { '--k': 1, duration: 1.2, ease: 'expo.inOut', delay: delay + 0.05 });
      };
    },
    lines: function (el) { return splitLines(el).play; },
    up: function (el) {
      gsap.set(el, { opacity: 0, y: 34 });
      return function (delay) {
        gsap.to(el, { opacity: 1, y: 0, duration: 1.15, ease: 'expo.out', delay: delay, clearProps: 'transform' });
      };
    },
    kids: function (el) {
      var kids = [].slice.call(el.children);
      gsap.set(el, { opacity: 1 });
      gsap.set(kids, { opacity: 0, y: 22, scale: 0.96 });
      return function (delay) {
        gsap.to(kids, {
          opacity: 1, y: 0, scale: 1, duration: 0.95, ease: 'back.out(1.5)',
          stagger: 0.065, delay: delay, clearProps: 'transform',
        });
      };
    },
    curtain: function (el) { return curtain(el).play; },
  };
  // Roles a page file normally claims; if it doesn't, they degrade to a plain role.
  var fallbacks = { cards: 'kids', batch: 'kids', ornament: 'up', words: 'up' };

  // Headings rise line by line out of masks. autoSplit re-splits on resize and font load,
  // and SplitText carries the returned tween's progress across the re-split.
  function splitLines(el, opts) {
    opts = opts || {};
    var tween, played = false;
    SplitText.create(el, {
      type: opts.chars ? 'lines,chars' : 'lines',
      mask: 'lines',
      linesClass: 'm-line',
      charsClass: 'm-char',
      autoSplit: true,
      onSplit: function (self) {
        var targets = opts.chars ? self.chars : self.lines;
        tween = gsap.fromTo(targets, { yPercent: opts.chars ? 110 : 108 }, {
          yPercent: 0,
          duration: opts.duration || (opts.chars ? 1.1 : 1.25),
          ease: 'expo.out',
          stagger: opts.stagger || (opts.chars ? 0.022 : 0.1),
          paused: !played,
        });
        return tween;
      },
    });
    gsap.set(el, { opacity: 1 });
    return {
      play: function (delay) {
        played = true;
        gsap.delayedCall(delay || 0, function () { tween.play(); });
      },
      tween: function () { return tween; },
    };
  }
  M.splitLines = splitLines;

  // Colour-block curtain over a photo frame; the photo settles from 1.22 as it uncovers.
  function curtainColour(el) {
    var y = el.getBoundingClientRect().top + w.scrollY;
    var p = y / Math.max(1, h.scrollHeight);
    return p < 0.34 ? '#41A3BD' : p < 0.66 ? '#E5C89B' : '#A84365';
  }
  function curtain(el, opts) {
    opts = opts || {};
    var img = el.querySelector(':scope > img');
    var dir = opts.dir || el.getAttribute('data-m-dir') || (el.closest('.feature--rev, .suite--rev') ? 'left' : 'right');
    var sheet = d.createElement('span');
    sheet.className = 'curtain';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = '<i></i><i></i>';
    sheet.style.setProperty('--c1', curtainColour(el));
    el.appendChild(sheet);
    var prop = dir === 'up' ? 'yPercent' : 'xPercent';
    var off = dir === 'right' ? 101 : -101;
    // The welcome photo's scroll zoom writes its own transform; leave that one alone.
    var zoom = img && !img.hasAttribute('data-zoom') && opts.zoom !== false;
    gsap.set(el, { opacity: 0 });
    if (zoom) gsap.set(img, { scale: 1.22, transition: 'none' });
    return {
      play: function (delay) {
        var tl = gsap.timeline({ delay: delay || 0, onComplete: function () { sheet.remove(); } });
        var top = { duration: 1, ease: 'expo.inOut' }, under = { duration: 1.1, ease: 'expo.inOut' };
        top[prop] = off;
        under[prop] = off;
        tl.to(el, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
          .to(sheet.children[1], top, 0.08)
          .to(sheet.children[0], under, 0.22);
        if (zoom) tl.to(img, { scale: 1, duration: 1.9, ease: 'expo.out', clearProps: 'transform,transition' }, 0.28);
        return tl;
      },
    };
  }
  M.curtain = curtain;

  function initReveals() {
    qsa('[data-m]').forEach(function (el) {
      if (el.__mClaimed) return;
      var role = el.getAttribute('data-m');
      if (role === 'enter') return;
      var prep = roles[role] || roles[fallbacks[role]];
      if (!prep || el.hasAttribute('data-arrived')) { gsap.set(el, { opacity: 1 }); return; }
      whenVisible(el, prep(el));
    });
  }

  /* ================= Page entrance ================= */
  function buildEntrance() {
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    var t = 0.12;
    qsa('[data-m="enter"]').forEach(function (el) {
      if (el.__mClaimed) return;
      if (el.tagName === 'H1') {
        var sl = splitLines(el, { chars: !el.classList.contains('hero__tag') });
        tl.add(function () { sl.play(0); }, t);
        t += 0.3;
      } else {
        tl.fromTo(el, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.2, clearProps: 'transform' }, t);
        t += 0.12;
      }
    });
    M.enterHooks.forEach(function (fn) { fn(tl); });
    // Let scroll reveals that are already on screen follow on, rather than compete.
    tl.add(M.release, Math.min(tl.duration(), 0.9));
    return tl;
  }
  // The header photo settles from the 1.16 scale motion.css paints it at. It starts at
  // boot, without waiting for fonts, or at the intro's lift when there is one.
  M.settleMedia = function () {
    var media = d.querySelector('.hero__media, .pagehead__media');
    if (!media || media.__settled) return;
    media.__settled = true;
    gsap.fromTo(media, { scale: 1.16 }, { scale: 1, duration: 2.2, ease: 'expo.out' });
  };
  M.startEntrance = function () {
    if (!M.entrance || M.entrance.__started) return;
    M.entrance.__started = true;
    M.entrance.play(0);
  };

  /* ================= Boot ================= */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    initLenis();
    (M.pages[M.page] || []).forEach(function (fn) { fn(M); });
    initReveals();
    M.chrome.forEach(function (fn) { fn(M); });
    M.entrance = buildEntrance();

    var intro = h.classList.contains('intro-on') && typeof M.playIntro === 'function';
    if (!intro) M.settleMedia();
    var go = function () {
      if (intro) M.playIntro();
      else gsap.delayedCall(h.classList.contains('vt-arrive') ? 0.35 : 0.02, M.startEntrance);
    };
    // Wait (briefly) for the web fonts so the first split measures real line breaks.
    var fontsReady = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 450); })]).then(go);

    w.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
  // Page files are deferred after this one; DOMContentLoaded fires once they have run.
  if (d.readyState === 'complete') boot();
  else d.addEventListener('DOMContentLoaded', boot, { once: true });
})();
