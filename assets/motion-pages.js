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
    clock: function (g, svg) {
      return g.timeline().from(svg.querySelector('.i-hands'), { rotation: -360, svgOrigin: '12 12', duration: 1.4, ease: 'expo.inOut' });
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

  /* ================= Gallery ================= */
  BOB.page('gallery', function (M) {
    var gsap = M.gsap, Flip = window.Flip;
    pagehead(M);
    tellIcons(M, d);

    // Photos rise in batches as the grid scrolls into view.
    var grid = d.querySelector('[data-m="batch"]');
    if (grid) {
      M.claim(grid);
      var items = M.qsa('.g-item', grid);
      gsap.set(grid, { opacity: 1 });
      gsap.set(items, { opacity: 0, y: 60 });
      gsap.set(items.map(function (it) { return it.querySelector('img'); }), { scale: 1.18, transition: 'none' });
      M.ScrollTrigger.batch(items, {
        start: 'top 94%', once: true,
        onEnter: function (batch) {
          gsap.to(batch, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, clearProps: 'transform' });
          gsap.to(batch.map(function (it) { return it.querySelector('img'); }), {
            scale: 1, duration: 1.6, ease: 'expo.out', stagger: 0.08, clearProps: 'transform,transition',
          });
        },
      });
    }

    // The active fill flows toward the new pill: the old one drains toward it, the new one
    // fills from the side it came from. Set in the capture phase, before main.js swaps
    // the classes, so the transitions start from the right edges.
    var bar = d.querySelector('.filterbar');
    if (bar) {
      bar.addEventListener('click', function (e) {
        var next = e.target.closest && e.target.closest('.filter');
        var prev = bar.querySelector('.filter.is-active');
        if (!next || !prev || next === prev) return;
        var right = next.getBoundingClientRect().left > prev.getBoundingClientRect().left;
        prev.style.setProperty('--from', right ? 'right' : 'left');
        next.style.setProperty('--from', right ? 'left' : 'right');
      }, true);
    }

    // Filtering re-flows the grid: photos glide to their new places, leavers shrink out,
    // arrivals bloom in. The grid's height is held so the page doesn't jump meanwhile.
    if (Flip && grid) {
      BOB.hooks.galleryFilter = function (apply) {
        var all = M.qsa('.g-item', grid);
        var state = Flip.getState(all, { props: 'opacity' });
        grid.style.minHeight = grid.offsetHeight + 'px';
        apply();
        Flip.from(state, {
          duration: 0.85, ease: 'expo.inOut', stagger: 0.012, absolute: true,
          onEnter: function (els) {
            return gsap.fromTo(els, { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)', delay: 0.3 });
          },
          onLeave: function (els) {
            return gsap.to(els, { opacity: 0, scale: 0.86, duration: 0.35, ease: 'power2.in' });
          },
          onComplete: function () { grid.style.minHeight = ''; M.ScrollTrigger.refresh(); },
        });
      };
    }
  });

  /* ================= Booking ================= */
  BOB.page('booking', function (M) {
    var gsap = M.gsap;
    pagehead(M);

    // Panels slide in the direction of travel; the fields follow in a short cascade.
    BOB.hooks.panelSwap = function (from, to, dir, commit) {
      gsap.to(from, {
        x: -40 * dir, opacity: 0, duration: 0.32, ease: 'power2.in',
        onComplete: function () {
          commit();
          gsap.set(from, { clearProps: 'transform,opacity' });
          var parts = to.querySelectorAll(':scope > *');
          gsap.fromTo(to, { x: 40 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.6, ease: 'expo.out', clearProps: 'transform' });
          gsap.fromTo(parts, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'expo.out', stagger: 0.04, delay: 0.05, clearProps: 'transform' });
          if (to.querySelector('.confirm')) confirmed(to.querySelector('.confirm'));
        },
      });
    };

    // Choosing a room: a ripple spreads from the pointer.
    M.qsa('.choice').forEach(function (c) {
      c.addEventListener('pointerdown', function (e) {
        var r = c.getBoundingClientRect();
        var dot = d.createElement('span');
        dot.className = 'ripple';
        dot.style.left = (e.clientX - r.left) + 'px';
        dot.style.top = (e.clientY - r.top) + 'px';
        c.appendChild(dot);
        gsap.fromTo(dot, { scale: 0, opacity: 1 }, {
          scale: Math.max(r.width, r.height) / 40, opacity: 0, duration: 0.9, ease: 'expo.out',
          onComplete: function () { dot.remove(); },
        });
      });
    });

    // Summary: the estimated total counts to its new value; changed rows flash.
    var total = d.getElementById('s-total');
    if (total && window.MutationObserver) {
      var fmt = function (n) { return '฿' + Math.round(n).toLocaleString('en-US'); };
      var num = function (t) { return parseInt(t.replace(/[^\d]/g, ''), 10); };
      var flash = function (el) { el.classList.remove('is-new'); void el.offsetWidth; el.classList.add('is-new'); };
      var shown = num(total.textContent) || 0, written = null, count = null;
      new MutationObserver(function () {
        var text = total.textContent;
        if (text === written) return; // the count's own frame
        var target = num(text);
        if (count) count.kill();
        if (isNaN(target)) { shown = 0; return; }
        flash(total);
        var o = { v: shown };
        count = gsap.to(o, {
          v: target, duration: 0.9, ease: 'expo.out',
          onUpdate: function () { shown = o.v; written = fmt(o.v); total.textContent = written; },
          onComplete: function () { shown = target; written = fmt(target); total.textContent = written; },
        });
      }).observe(total, { childList: true, characterData: true, subtree: true });
      M.qsa('.summary dd').forEach(function (dd) {
        new MutationObserver(function () { flash(dd); }).observe(dd, { childList: true, characterData: true, subtree: true });
      });
    }

    // Request confirmed: the check springs in, orchid petals burst, the reference
    // scrambles into place.
    function confirmed(box) {
      var check = box.querySelector('.confirm__check');
      var mark = check && check.querySelector('svg');
      gsap.fromTo(check, { scale: 0 }, { scale: 1, duration: 0.9, ease: 'back.out(2.2)', delay: 0.1 });
      if (mark) gsap.fromTo(mark, { scale: 0, rotation: -45 }, { scale: 1, rotation: 0, duration: 0.8, ease: 'back.out(2.6)', delay: 0.35 });
      var burst = d.createElement('span');
      burst.className = 'petal-burst';
      burst.setAttribute('aria-hidden', 'true');
      var colours = ['#E9C84A', '#EEE865', '#A84365', '#41A3BD', '#E5C89B'];
      for (var i = 0; i < 16; i++) {
        var p = d.createElement('i');
        p.style.setProperty('--c', colours[i % colours.length]);
        burst.appendChild(p);
      }
      box.appendChild(burst);
      M.qsa('i', burst).forEach(function (p, i) {
        var a = (i / 16) * Math.PI * 2 + Math.random() * 0.4, dist = 90 + Math.random() * 90;
        gsap.timeline({ delay: 0.3 })
          .fromTo(p, { x: 0, y: 0, rotation: 0, scale: 0.4, opacity: 1 }, {
            x: Math.cos(a) * dist, y: Math.sin(a) * dist * 0.8, rotation: gsap.utils.random(-220, 220), scale: 1,
            duration: 0.9, ease: 'expo.out',
          })
          .to(p, { y: '+=70', opacity: 0, rotation: '+=90', duration: 1.1, ease: 'power1.in' }, 0.7);
      });
      gsap.delayedCall(2.6, function () { burst.remove(); });

      var ref = d.getElementById('confref');
      if (!ref) return;
      var final = ref.textContent, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', t = { p: 0 };
      gsap.to(t, {
        p: 1, duration: 1, ease: 'power2.out', delay: 0.45,
        onUpdate: function () {
          var keep = Math.floor(t.p * final.length), out = '';
          for (var k = 0; k < final.length; k++) {
            out += k < keep || final[k] === '-' ? final[k] : chars[Math.floor(Math.random() * chars.length)];
          }
          ref.textContent = out;
        },
        onComplete: function () { ref.textContent = final; },
      });
    }
  });
})();
