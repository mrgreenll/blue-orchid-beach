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
        .to(el.querySelector('.hero__frame'), { scale: 0.86, yPercent: 7, ease: 'none' }, 0)
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
      qsa('.feature__badge').forEach(function (b) {
        gsap.set(b, { opacity: 0, x: -22 });
        M.whenVisible(b, function (delay) {
          gsap.to(b, { opacity: 1, x: 0, duration: 0.9, ease: 'expo.out', delay: delay + 0.75, clearProps: 'transform' });
        });
      });
    }
  });
})();
