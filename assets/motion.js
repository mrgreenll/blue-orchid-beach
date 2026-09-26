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

  /* ================= Global chrome ================= */
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var esc = function (t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;'); };
  M.clamp = clamp;

  // Nav: hides on the way down, returns on the way up; hairline tracks page progress.
  function chromeNav() {
    var nav = d.querySelector('.nav');
    if (!nav) return;
    qsa('.nav-links a').forEach(function (a) {
      var t = esc(a.textContent.trim());
      a.innerHTML = '<span class="roll"><span>' + t + '</span><span aria-hidden="true">' + t + '</span></span>';
    });
    var bar = nav.querySelector('.nav__progress');
    var lastY = w.scrollY, hidden = false;
    var setHidden = function (v) { if (v !== hidden) { hidden = v; nav.classList.toggle('nav--hide', v); } };
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        if (bar) bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')';
        var y = self.scroll();
        if (y < 160) setHidden(false);
        else if (y > lastY + 4 && !d.body.classList.contains('menu-open')) setHidden(true);
        else if (y < lastY - 4) setHidden(false);
        lastY = y;
      },
    });
    nav.addEventListener('focusin', function () { setHidden(false); });
  }

  // Scroll is one day: dawn → noon → golden hour → dusk, crossfaded behind the page.
  function chromeSky() {
    var sky = d.querySelector('.sky');
    if (!sky) return;
    var L = function (n) { return sky.querySelector('.sky__l--' + n); };
    gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { start: 0, end: 'max', scrub: 0.8 } })
      .to(L('dawn'), { opacity: 0, duration: 0.25 }, 0)
      .to(L('noon'), { opacity: 1, duration: 0.25 }, 0)
      .to(L('noon'), { opacity: 0, duration: 0.35 }, 0.25)
      .to(L('gold'), { opacity: 1, duration: 0.35 }, 0.25)
      .to(L('gold'), { opacity: 0, duration: 0.3 }, 0.6)
      .to(L('dusk'), { opacity: 1, duration: 0.3 }, 0.6)
      .to({}, { duration: 0.1 }, 0.9);
  }

  // Sun dial: the sun crosses its arc with the page and the label names the hour.
  // Hovering offers what the button does.
  function chromeSundial() {
    var dial = d.querySelector('.sundial');
    if (!dial) return;
    var rot = dial.querySelector('.sundial__rot'), label = dial.querySelector('.sundial__label');
    var phases = [[0, 'Morning'], [0.2, 'Midday'], [0.45, 'Golden hour'], [0.72, 'Dusk'], [0.9, 'Night']];
    var phase = '', shown = label.textContent.trim(), hover = false;
    gsap.set(rot, { rotation: 0, svgOrigin: '32 34' });
    var turn = gsap.quickTo(rot, 'rotation', { duration: 0.8, ease: 'power3' });
    function show(text) {
      if (text === shown) return;
      shown = text;
      // A swap still in flight is settled first, so fast scrolling never stacks labels.
      while (label.children.length > 1) label.removeChild(label.firstElementChild);
      var old = label.firstElementChild;
      gsap.killTweensOf(old);
      gsap.set(old, { yPercent: 0 });
      var next = d.createElement('span');
      next.textContent = text;
      label.appendChild(next);
      gsap.fromTo([old, next], { yPercent: 0 }, {
        yPercent: -100, duration: 0.6, ease: 'expo.out',
        onComplete: function () { if (old && old.parentNode) old.remove(); gsap.set(next, { yPercent: 0 }); },
      });
    }
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        turn(self.progress * 180);
        var name = 'Morning';
        phases.forEach(function (p) { if (self.progress >= p[0]) name = p[1]; });
        if (name !== phase) { phase = name; if (!hover) show(name); }
      },
    });
    dial.addEventListener('pointerenter', function () { hover = true; show('Back to top'); });
    dial.addEventListener('pointerleave', function () { hover = false; show(phase || 'Morning'); });
    phase = 'Morning';
    show('Morning');
  }

  // A bubble follows the pointer and names what a click does, over photos that open.
  function chromeCursor() {
    if (!M.fine) return;
    qsa('.marquee__item, .g-item').forEach(function (el) { el.setAttribute('data-cursor', 'View'); });
    var c = d.createElement('div');
    c.className = 'cursor';
    c.setAttribute('aria-hidden', 'true');
    var lab = d.createElement('span');
    c.appendChild(lab);
    d.body.appendChild(c);
    gsap.set(c, { xPercent: -50, yPercent: -50, scale: 0 });
    var xTo = gsap.quickTo(c, 'x', { duration: 0.45, ease: 'power3' });
    var yTo = gsap.quickTo(c, 'y', { duration: 0.45, ease: 'power3' });
    var active = null;
    w.addEventListener('pointermove', function (e) { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    d.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-cursor]') : null;
      if (t === active) return;
      active = t;
      if (t) {
        lab.textContent = t.getAttribute('data-cursor');
        gsap.to(c, { scale: 1, duration: 0.55, ease: 'back.out(1.8)', overwrite: 'auto' });
      } else {
        gsap.to(c, { scale: 0, duration: 0.35, ease: 'power3.out', overwrite: 'auto' });
      }
    });
    d.documentElement.addEventListener('pointerleave', function () {
      active = null;
      gsap.to(c, { scale: 0, duration: 0.3, overwrite: 'auto' });
    });
    M.cursor = { el: c, label: lab };
  }

  // Primary buttons lean toward the pointer, a little.
  function chromeMagnetic() {
    if (!M.fine) return;
    qsa('.btn:not(.btn--sm), .nav__cta, .subscribe button, .sundial').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo(clamp((e.clientX - (r.left + r.width / 2)) * 0.28, -10, 10));
        yTo(clamp((e.clientY - (r.top + r.height / 2)) * 0.34, -8, 8));
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
    });
  }

  // Footer is night: fireflies drift only while it is on screen; the wordmark rises.
  function chromeFooter() {
    var footer = d.querySelector('.footer');
    if (!footer) return;
    ScrollTrigger.create({
      trigger: footer, start: 'top bottom', end: 'bottom top',
      toggleClass: { targets: footer, className: 'is-inview' },
    });
    var mark = footer.querySelector('.footer__mark');
    if (mark) {
      gsap.fromTo(mark, { yPercent: 55, opacity: 0 }, {
        yPercent: 0, opacity: 0.08, ease: 'none',
        scrollTrigger: { trigger: footer, start: 'top 85%', end: 'bottom bottom', scrub: 0.6 },
      });
    }
  }

  /* ================= Boot ================= */
  var booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    initLenis();
    (M.pages[M.page] || []).forEach(function (fn) { fn(M); });
    initReveals();
    chromeNav();
    chromeSky();
    chromeSundial();
    chromeCursor();
    chromeMagnetic();
    chromeFooter();
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
