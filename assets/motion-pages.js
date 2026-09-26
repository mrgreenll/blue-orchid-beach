/* Blue Orchid Beach — inner page set-pieces (rooms, gallery, booking).
   Registers with motion.js through BOB.page(); does nothing without it. */
(function () {
  'use strict';
  var BOB = window.BOB;
  if (!BOB || !BOB.page) return;
  var d = document;

  /* ---------- Shared: the page head drifts and lifts away as you scroll ---------- */
  function pagehead(M) {
    var head = d.querySelector('.pagehead');
    if (!head) return;
    M.gsap.timeline({ scrollTrigger: { trigger: head, start: 'top top', end: 'bottom top', scrub: true } })
      .fromTo(head.querySelector('.pagehead__media'), { yPercent: 0 }, { yPercent: 10, ease: 'none', duration: 1 }, 0)
      .to(head.querySelector('.pagehead__inner'), { yPercent: -24, opacity: 0, ease: 'none', duration: 0.7 }, 0);
  }

  /* ---------- Icons that tell their own small story once, as they appear ---------- */
  var iconStories = {
    breakfast: function (g, svg) {
      return g.timeline()
        .from(svg.querySelector('.i-glass'), { rotation: -22, svgOrigin: '12 16', duration: 0.9, ease: 'back.out(2.4)' })
        .from(svg.querySelectorAll('.i-stem, .i-base'), { scaleY: 0, scaleX: 0, transformOrigin: '50% 100%', duration: 0.5, ease: 'expo.out', stagger: 0.08 }, 0.1);
    },
    wifi: function (g, svg) {
      return g.timeline()
        .from(svg.querySelector('.i-dot'), { scale: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(3)' })
        .from(svg.querySelectorAll('.i-arc'), { opacity: 0, scale: 0.6, transformOrigin: '50% 100%', duration: 0.45, ease: 'back.out(2)', stagger: 0.12 }, 0.12);
    },
    pool: function (g, svg) {
      return g.timeline().from(svg.querySelector('.i-arch'), { scaleX: 0, transformOrigin: '50% 50%', duration: 0.8, ease: 'expo.out' });
    },
    sha: function (g, svg) {
      return g.timeline()
        .from(svg.querySelector('.i-ring'), { scale: 0.4, opacity: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(2)' })
        .from(svg.querySelector('.i-check'), { scale: 0, transformOrigin: '30% 60%', duration: 0.5, ease: 'back.out(3)' }, 0.25);
    },
    car: function (g, svg) {
      return g.timeline().from(svg.querySelector('.i-car'), { x: -9, opacity: 0, rotation: -4, svgOrigin: '12 17', duration: 0.9, ease: 'back.out(1.8)' });
    },
    housekeeping: function (g, svg) {
      return g.timeline().from(svg.querySelectorAll('.i-line'), { scaleX: 0, transformOrigin: '0% 50%', duration: 0.6, ease: 'expo.out', stagger: 0.1 });
    },
  };
  function tellIcons(M, scope) {
    M.qsa('svg[data-icon]', scope).forEach(function (svg) {
      var story = iconStories[svg.getAttribute('data-icon')];
      if (!story) return;
      var tl = story(M.gsap, svg).pause();
      M.whenVisible(svg, function (delay) { M.gsap.delayedCall(delay + 0.35, function () { tl.play(); }); });
    });
  }

  /* ================= Rooms ================= */
  BOB.page('rooms', function (M) {
    var gsap = M.gsap;
    pagehead(M);

    M.qsa('.suite').forEach(function (suite) {
      // The price plaque slides in once the photo has uncovered.
      var plaque = suite.querySelector('.suite__price');
      if (plaque && !suite.querySelector('[data-arrived]')) {
        gsap.set(plaque, { opacity: 0, x: 46 });
        M.whenVisible(plaque, function (delay) {
          gsap.to(plaque, { opacity: 1, x: 0, duration: 1, ease: 'back.out(1.4)', delay: delay + 0.85, clearProps: 'transform' });
        });
      }
      // The view word drifts at its own pace behind the photo.
      var word = suite.querySelector('.suite__word');
      if (word) {
        gsap.fromTo(word, { yPercent: 24 }, {
          yPercent: -24, ease: 'none',
          scrollTrigger: { trigger: suite, start: 'top bottom', end: 'bottom top', scrub: true },
        });
      }
    });

    tellIcons(M, d);
  });

  BOB.page('gallery', function (M) {
    pagehead(M);
  });

  BOB.page('booking', function (M) {
    pagehead(M);
  });
})();
