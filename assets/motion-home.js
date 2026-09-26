/* Blue Orchid Beach — home page set-pieces. Registers with motion.js through BOB.page();
   does nothing without it. Everything animates transform or opacity only. */
(function () {
  'use strict';
  var BOB = window.BOB;
  if (!BOB || !BOB.page) return;

  BOB.page('home', function (M) {
    var gsap = M.gsap, SplitText = M.SplitText, d = document, qsa = M.qsa;

    hero();
    bookbar();
    vibe();
    badges();
    chapters();
    stats();
    cards();

    /* ---------- Experience: three chapters of a day ---------- */
    function chapters() {
      var grid = d.querySelector('.chapters');
      if (!grid) return;
      var feats = qsa('.feature', grid);
      var medias = feats.map(function (f) { return f.querySelector('.feature__media'); });
      var bodies = feats.map(function (f) { return f.querySelector('.feature__body'); });
      var imgs = medias.map(function (m) { return m.querySelector('img'); });
      var badgesOf = medias.map(function (m) { return m.querySelector('.feature__badge'); });
      var hud = grid.querySelector('.chapters__hud');
      var digits = hud.querySelector('.chapters__digits');
      var bar = hud.querySelector('.chapters__bar i');
      medias.forEach(M.claim);
      var shades = medias.map(function (m) {
        var s = d.createElement('span');
        s.className = 'chapters__shade';
        s.setAttribute('aria-hidden', 'true');
        m.insertBefore(s, m.querySelector('img').nextSibling);
        return s;
      });
      bodies.forEach(function (b, i) { b.style.setProperty('--row', i + 1); });

      // Wide screens get the sticky chapters; narrow ones keep the stacked features. An
      // iPad turning across 1024px switches cleanly: each branch sets up its own state
      // and matchMedia reverts it.
      gsap.matchMedia().add({ wide: '(min-width: 1024px)', narrow: '(max-width: 1023px)' }, function (ctx) {
        if (ctx.conditions.wide) wide(); else narrow();
        return function () {
          grid.classList.remove('is-on');
          qsa('.curtain', grid).forEach(function (n) { n.remove(); });
          medias.forEach(function (m) { m.style.zIndex = ''; m.classList.remove('is-layer'); });
          bodies.forEach(function (b) { b.classList.remove('is-active'); });
        };
      });

      function narrow() {
        medias.forEach(function (m, i) {
          M.whenVisible(m, M.curtain(m).play);
          var b = badgesOf[i];
          if (!b) return;
          gsap.set(b, { opacity: 0, x: -22 });
          M.whenVisible(b, function (delay) {
            gsap.to(b, { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out', delay: delay + 0.75 });
          });
        });
      }

      function wide() {
        grid.classList.add('is-on');
        medias.forEach(function (m, i) { m.style.zIndex = i + 1; if (i) m.classList.add('is-layer'); });
        gsap.set(medias, { opacity: 1 });
        gsap.set(imgs.slice(1), { yPercent: 100 });
        gsap.set(badgesOf.slice(1), { opacity: 0 });
        gsap.set(hud, { opacity: 0 });
        bodies[0].classList.add('is-active');

        // The first photo uncovers with the curtain (its badge rides under the sheets);
        // the counter and progress bar arrive after it.
        var first = M.curtain(medias[0], { zoom: false });
        M.whenVisible(medias[0], function (delay) {
          first.play(delay);
          gsap.to(hud, { opacity: 1, duration: 0.8, ease: 'power2.out', delay: delay + 0.9 });
        });
        gsap.fromTo(bar, { scaleX: 0 }, {
          scaleX: 1, ease: 'none',
          scrollTrigger: { trigger: grid, start: 'top 25%', end: 'bottom 75%', scrub: true },
        });

        // Each later chapter wipes its photo up over the last, which drifts up and dims.
        bodies.slice(1).forEach(function (body, k) {
          var i = k + 1;
          // Durations are explicit: the timeline spans exactly 1, so each wipe fills the
          // whole scroll range instead of finishing at GSAP's default 0.5.
          gsap.timeline({ scrollTrigger: { trigger: body, start: 'top 88%', end: 'top 36%', scrub: 0.8 } })
            .fromTo(imgs[i], { yPercent: 100, scale: 1.25 }, { yPercent: 0, scale: 1, ease: 'none', duration: 1 }, 0)
            .to(imgs[i - 1], { yPercent: -14, ease: 'none', duration: 1 }, 0)
            .to(shades[i - 1], { opacity: 0.45, ease: 'none', duration: 1 }, 0)
            .to(badgesOf[i - 1], { opacity: 0, ease: 'none', duration: 0.3 }, 0)
            .fromTo(badgesOf[i], { opacity: 0, x: -22 }, { opacity: 1, x: 0, ease: 'none', duration: 0.3 }, 0.7);
        });

        // The chapter in the middle of the screen brightens; the counter rolls to it.
        bodies.forEach(function (b, i) {
          M.ScrollTrigger.create({
            trigger: b, start: 'top 55%', end: 'bottom 55%',
            onToggle: function (self) {
              if (!self.isActive) return;
              bodies.forEach(function (x, j) { x.classList.toggle('is-active', j === i); });
              gsap.to(digits.children, { yPercent: -100 * i, duration: 0.8, ease: 'expo.inOut', overwrite: true });
            },
          });
        });
      }
    }

    /* ---------- Stats: odometer digits, flipping letters, the orchid blooms ---------- */
    function stats() {
      var wrap = d.querySelector('.stats');
      if (!wrap) return;
      M.claim(wrap);
      var items = [].slice.call(wrap.children);
      qsa('.num', wrap).forEach(function (num) {
        var text = num.textContent.trim();
        var html = '<span class="sr-only">' + text + '</span><span class="odo" aria-hidden="true">';
        text.split('').forEach(function (ch) {
          if (/\d/.test(ch)) {
            var strip = '';
            for (var k = 0; k < 20; k++) strip += '<b>' + (k % 10) + '</b>';
            html += '<span class="odo__col"><span class="odo__strip" data-d="' + ch + '">' + strip + '</span></span>';
          } else {
            html += '<span class="odo__ch">' + ch + '</span>';
          }
        });
        num.innerHTML = html + '</span>';
      });
      var strips = qsa('.odo__strip', wrap), letters = qsa('.odo__ch', wrap);
      gsap.set(wrap, { opacity: 1 });
      gsap.set(items, { opacity: 0, y: 26 });
      gsap.set(letters, { opacity: 0, rotationX: -90, transformPerspective: 400 });
      M.whenVisible(wrap, function (delay) {
        gsap.to(items, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.1, delay: delay, clearProps: 'transform' });
        // Each digit spins once through 0–9 and settles on its own number.
        strips.forEach(function (s, i) {
          gsap.fromTo(s, { yPercent: 0 }, { yPercent: -(10 + Number(s.dataset.d)) * 5, duration: 2.1, ease: 'expo.out', delay: delay + 0.15 + i * 0.09 });
        });
        gsap.to(letters, { opacity: 1, rotationX: 0, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.07, delay: delay + 0.45 });
      });

      var orn = d.querySelector('.ornament');
      if (!orn) return;
      M.claim(orn);
      var petals = qsa('.petal', orn);
      gsap.set(orn, { opacity: 1, '--o': 0 });
      gsap.set(petals, { scale: 0, rotation: -40, svgOrigin: '24 24' });
      M.whenVisible(orn, function (delay) {
        gsap.to(petals, { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(1.7)', stagger: 0.05, delay: delay });
        gsap.to(orn, { '--o': 1, duration: 1.2, ease: 'expo.inOut', delay: delay + 0.2 });
      });
    }

    /* ---------- Room cards: a staggered 3D rise, then tilt and glare under the pointer ---------- */
    function cards() {
      var grid = d.querySelector('[data-m="cards"]');
      if (!grid) return;
      M.claim(grid);
      var list = qsa('.room-card', grid);
      var pics = list.map(function (c) { return c.querySelector('.room-card__media img'); });
      gsap.set(grid, { opacity: 1 });
      gsap.set(list, { opacity: 0, y: 90, rotationX: 12, transformPerspective: 1100, transformOrigin: '50% 100%' });
      gsap.set(pics, { scale: 1.25, transition: 'none' });
      M.whenVisible(grid, function (delay) {
        gsap.to(list, { opacity: 1, y: 0, rotationX: 0, duration: 1.3, ease: 'expo.out', stagger: 0.12, delay: delay, clearProps: 'transform' });
        gsap.to(pics, { scale: 1, duration: 1.8, ease: 'expo.out', stagger: 0.12, delay: delay, clearProps: 'transform,transition' });
      });
      if (!M.fine) return;
      list.forEach(function (card) {
        var glare = d.createElement('span');
        glare.className = 'room-card__glare';
        glare.setAttribute('aria-hidden', 'true');
        card.appendChild(glare);
        var rx = gsap.quickTo(card, 'rotationX', { duration: 0.6, ease: 'power3' });
        var ry = gsap.quickTo(card, 'rotationY', { duration: 0.6, ease: 'power3' });
        var gx = gsap.quickTo(glare, 'x', { duration: 0.5, ease: 'power3' });
        var gy = gsap.quickTo(glare, 'y', { duration: 0.5, ease: 'power3' });
        card.addEventListener('pointerenter', function () { gsap.set(card, { transformPerspective: 1100 }); });
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
          ry(px * 7);
          rx(-py * 6);
          gx(px * r.width);
          gy(py * r.height);
        });
        card.addEventListener('pointerleave', function () { rx(0); ry(0); });
      });
    }

    /* ---------- Hero: the entrance, then "framed by the sea" on scroll ---------- */
    function hero() {
      var el = d.querySelector('.hero');
      if (!el) return;
      var inner = el.querySelector('.hero__inner');
      var kicker = inner.querySelector('.kicker');
      var tag = inner.querySelector('.hero__tag');
      var sub = inner.querySelector('.hero__sub');
      var actions = inner.querySelector('.hero__actions');
      var cue = el.querySelector('.hero__scroll');
      [kicker, tag, sub, actions, cue].forEach(M.claim);

      // Kicker letters track in; headline words rise out of their line masks with a
      // slight tilt; the rest follows.
      var kChars = SplitText.create(kicker, { type: 'chars', charsClass: 'm-char' }).chars;
      var tagTween, tagPlayed = false;
      SplitText.create(tag, {
        type: 'lines,words', mask: 'lines', linesClass: 'm-line', wordsClass: 'm-word', autoSplit: true,
        onSplit: function (self) {
          tagTween = gsap.fromTo(self.words, { yPercent: 112, rotation: 5 }, {
            yPercent: 0, rotation: 0, duration: 1.3, ease: 'expo.out', stagger: 0.07, paused: !tagPlayed,
          });
          return tagTween;
        },
      });
      gsap.set([kicker, tag, actions], { opacity: 1 });
      gsap.set(kicker, { '--k': 0 });
      gsap.set(kChars, { opacity: 0, y: 8 });
      gsap.set([sub, cue], { opacity: 0, y: 22 });
      gsap.set(actions.children, { opacity: 0, y: 24, scale: 0.92 });

      BOB.onEnter(function (tl) {
        tl.to(kChars, { opacity: 1, y: 0, duration: 0.6, stagger: 0.016, ease: 'power2.out' }, 0.05)
          .to(kicker, { '--k': 1, duration: 1.1, ease: 'expo.inOut' }, 0.05)
          .add(function () { tagPlayed = true; tagTween.play(); }, 0.15)
          .to(sub, { opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', clearProps: 'transform' }, 0.55)
          .to(actions.children, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: 'back.out(1.6)', stagger: 0.08, clearProps: 'transform' }, 0.72)
          .to(cue, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' }, 1.0);
      });

      // Scrolling away, the full-bleed photo shrinks into a rounded frame and sinks a
      // little while the words lift off ahead of it.
      gsap.timeline({ scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true } })
        .to(el.querySelector('.hero__frame'), { scale: 0.86, yPercent: 7, ease: 'none', duration: 1 }, 0)
        .to(inner, { yPercent: -30, opacity: 0, ease: 'none', duration: 0.6 }, 0);
    }

    /* ---------- Booking bar: rises after the hero; the nights count flips ---------- */
    function bookbar() {
      var bar = d.querySelector('.bookbar__inner');
      if (!bar) return;
      M.claim(bar);
      var kids = [].slice.call(bar.children);
      gsap.set(bar, { opacity: 0, y: 46 });
      gsap.set(kids, { opacity: 0, y: 14 });
      BOB.onEnter(function (tl) {
        tl.to(bar, { opacity: 1, y: 0, duration: 1.3, ease: 'expo.out', clearProps: 'transform' }, 0.9)
          .to(kids, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', stagger: 0.06, clearProps: 'transform' }, 1.0);
      });
      BOB.hooks.nights = function (el, text) {
        gsap.timeline()
          .to(el, { yPercent: -70, opacity: 0, duration: 0.18, ease: 'power2.in' })
          .add(function () { el.textContent = text; })
          .fromTo(el, { yPercent: 70 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: 'back.out(2.2)', clearProps: 'transform' });
      };
    }

    /* ---------- The Vibe ---------- */
    function vibe() {
      // The quote lights up word by word as it crosses the screen.
      var quote = d.querySelector('[data-m="words"]');
      if (quote) {
        M.claim(quote);
        var words = SplitText.create(quote, { type: 'words', wordsClass: 'm-word' }).words;
        gsap.set(quote, { opacity: 1 });
        gsap.fromTo(words, { opacity: 0.16 }, {
          opacity: 1, ease: 'none', stagger: 0.12,
          scrollTrigger: { trigger: quote, start: 'top 82%', end: 'bottom 48%', scrub: 0.6 },
        });
      }

      var main = d.querySelector('[data-vibe-main]');
      if (!main) return;
      var frame = main.parentElement;
      // The main photo drifts inside its frame.
      gsap.fromTo(main, { yPercent: -4 }, {
        yPercent: 4, ease: 'none',
        scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true },
      });
      // A thumbnail swaps in through the site's own curtain: dark sheet over gold, the
      // photo changes behind them, and they draw back off the other side.
      BOB.hooks.vibeSwap = function (mainImg, thumbImg, commit) {
        var btn = thumbImg.closest('.vibe-thumb');
        btn.dataset.busy = '1';
        var sheet = d.createElement('span');
        sheet.className = 'curtain';
        sheet.setAttribute('aria-hidden', 'true');
        sheet.innerHTML = '<i></i><i></i>';
        frame.appendChild(sheet);
        gsap.set(thumbImg, { transition: 'none' });
        gsap.timeline({ onComplete: function () { sheet.remove(); delete btn.dataset.busy; } })
          .fromTo(sheet.children, { xPercent: -101 }, { xPercent: 0, duration: 0.55, ease: 'expo.in', stagger: 0.07 })
          .add(function () {
            commit();
            gsap.fromTo(mainImg, { scale: 1.26 }, { scale: 1.12, duration: 1.5, ease: 'expo.out' });
            gsap.fromTo(thumbImg, { scale: 1.25, opacity: 0.3 }, { scale: 1, opacity: 1, duration: 0.9, ease: 'expo.out', clearProps: 'transform,opacity,transition' });
          })
          .to(sheet.children, { xPercent: 101, duration: 0.75, ease: 'expo.out', stagger: -0.07 });
      };
    }

    /* ---------- Photo badges slide in once their photo has uncovered ---------- */
    function badges() {
      qsa('#about .feature__badge').forEach(function (b) {
        gsap.set(b, { opacity: 0, x: -22 });
        M.whenVisible(b, function (delay) {
          gsap.to(b, { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out', delay: delay + 0.75, clearProps: 'transform' });
        });
      });
    }
  });
})();
