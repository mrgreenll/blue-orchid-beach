/* Blue Orchid Beach — functionality. Everything here works on its own; motion.js adds the
   choreography through the BOB hooks below, and every hook call carries a plain fallback. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;

  // ?still=1 is the screenshot mode: finished page, nothing moving.
  var still = /[?&]still/.test(location.search);
  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (still) root.classList.add('still');

  /* ---- Hook registry ---- */
  var BOB = window.BOB = window.BOB || {};
  BOB.hooks = BOB.hooks || {};
  BOB.still = still;
  BOB.reduced = reduced;
  BOB.run = function (name, args, fallback) {
    var fn = BOB.hooks[name];
    if (typeof fn === 'function') {
      try { return fn.apply(null, args || []); } catch (e) { if (window.console) console.error(e); }
    }
    return fallback ? fallback() : undefined;
  };
  // Callbacks handed to hooks run once, so a hook that fails after committing can't
  // make its fallback apply the same change twice.
  function once(fn) {
    var done = false;
    return function () { if (!done) { done = true; return fn.apply(null, arguments); } };
  }
  var locks = 0;
  BOB.lock = function () {
    if (locks++ === 0) { doc.body.style.overflow = 'hidden'; BOB.run('lock'); }
  };
  BOB.unlock = function () {
    if (locks > 0 && --locks === 0) { doc.body.style.overflow = ''; BOB.run('unlock'); }
  };
  BOB.scrollTo = function (y) {
    BOB.run('scrollTo', [y], function () {
      window.scrollTo({ top: y, behavior: still || reduced ? 'auto' : 'smooth' });
    });
  };

  function ready(fn) {
    if (doc.readyState !== 'loading') fn();
    else doc.addEventListener('DOMContentLoaded', fn);
  }
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); };
  var dayAfter = function (value) { var d = new Date(value + 'T00:00'); d.setDate(d.getDate() + 1); return iso(d); };
  var focusables = function (el) {
    return [].slice.call(el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'))
      .filter(function (n) { return n.offsetParent !== null || n === doc.activeElement; });
  };
  function trapTab(e, els) {
    if (!els.length) return;
    var first = els[0], last = els[els.length - 1];
    if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  // Screenshot helper: ?scroll=N jumps to a y-offset; ?shift=N pulls the page up by N px
  // via layout (so headless captures lower sections crisply).
  var scrollMatch = location.search.match(/[?&]scroll=(\d+)/);
  var shiftMatch = location.search.match(/[?&]shift=(\d+)/);
  function applyScroll() {
    if (scrollMatch) window.scrollTo(0, parseInt(scrollMatch[1], 10));
    if (shiftMatch) doc.body.style.marginTop = '-' + parseInt(shiftMatch[1], 10) + 'px';
  }
  if (scrollMatch || shiftMatch) window.addEventListener('load', applyScroll);
  window.addEventListener('load', function () { root.classList.add('is-loaded'); });

  // Land on a #fragment instantly, before motion.js loads: a ScrollTrigger refresh that
  // runs first records scroll 0, and the browser then abandons its own jump.
  function landOnHash() {
    if (location.hash.length < 2) return;
    var t = null;
    try { t = doc.getElementById(decodeURIComponent(location.hash.slice(1))); } catch (e) { return; }
    if (t) t.scrollIntoView({ block: 'start', behavior: 'instant' });
  }

  ready(function () {
    landOnHash();
    applyScroll();
    var y = doc.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    initNav();
    initMenu();
    initDates();
    initSteppers();
    initNights();
    initMarquee();
    initLightbox();
    initGallery();
    initBooking();
    initVibeSwap();
    initParallaxZoom();
    initSubscribe();
    initSundial();
  });

  /* ===== Nav: solid-on-scroll ===== */
  function initNav() {
    var nav = doc.querySelector('.nav');
    if (!nav) return;
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 30); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ===== Mobile menu ===== */
  function initMenu() {
    var toggle = doc.querySelector('.nav-toggle');
    var menu = doc.querySelector('.mobile-menu');
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-controls', menu.id || 'mobileMenu');
    menu.setAttribute('aria-hidden', 'true');
    var open = false;
    var setMenu = function (next, returnFocus) {
      if (next === open) return;
      open = next;
      doc.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (open) {
        BOB.lock();
        var first = menu.querySelector('a');
        if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 60);
      } else {
        BOB.unlock();
        if (returnFocus) toggle.focus({ preventScroll: true });
      }
      BOB.run('menu', [open]);
    };
    toggle.addEventListener('click', function () { setMenu(!open, true); });
    menu.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setMenu(false, false);
    });
    doc.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') setMenu(false, true);
      else if (e.key === 'Tab') trapTab(e, [toggle].concat(focusables(menu)));
    });
    if (/[?&]menu=open/.test(location.search)) setMenu(true, false);
  }

  /* ===== Date inputs: sensible defaults, no past dates, check-out always after check-in ===== */
  function initDates() {
    var ins = doc.querySelectorAll('[data-date="in"]');
    var outs = doc.querySelectorAll('[data-date="out"]');
    if (!ins.length && !outs.length) return;
    var today = new Date();
    var tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
    var later = new Date(); later.setDate(later.getDate() + 3);
    [].forEach.call(ins, function (el) { el.min = iso(today); if (!el.value) el.value = iso(tmr); });
    [].forEach.call(outs, function (el) { el.min = iso(tmr); if (!el.value) el.value = iso(later); });
    [].forEach.call(ins, function (inEl) {
      var scope = inEl.closest('form') || doc;
      var outEl = scope.querySelector('[data-date="out"]');
      if (!outEl) return;
      inEl.addEventListener('change', function () {
        if (!inEl.value) return;
        outEl.min = dayAfter(inEl.value);
        if (!outEl.value || outEl.value <= inEl.value) {
          outEl.value = dayAfter(inEl.value);
          outEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }

  /* ===== Guest steppers (− value +) ===== */
  function initSteppers() {
    [].forEach.call(doc.querySelectorAll('[data-stepper]'), function (wrap) {
      var input = wrap.querySelector('input');
      var min = parseInt(input.getAttribute('min') || '0', 10);
      var max = parseInt(input.getAttribute('max') || '20', 10);
      [].forEach.call(wrap.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () {
          var v = parseInt(input.value || '0', 10) + (b.dataset.dir === 'up' ? 1 : -1);
          input.value = Math.max(min, Math.min(max, v));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });
  }

  /* ===== Booking bar: live nights count ===== */
  function initNights() {
    var out = doc.querySelector('[data-nights]');
    if (!out) return;
    var form = out.closest('form');
    var ci = form.querySelector('[data-date="in"]'), co = form.querySelector('[data-date="out"]');
    var first = true;
    function update() {
      var n = Math.round((new Date(co.value) - new Date(ci.value)) / 86400000);
      var text = isNaN(n) || n < 1 ? '' : n + (n === 1 ? ' night' : ' nights');
      if (out.textContent === text) return;
      if (first) { out.textContent = text; first = false; return; }
      BOB.run('nights', [out, text], function () { out.textContent = text; });
    }
    ci.addEventListener('change', update);
    co.addEventListener('change', update);
    update();
  }

  /* ===== Drifting marquee: duplicate each row so the loop is seamless ===== */
  function initMarquee() {
    var marquee = doc.querySelector('.marquee');
    if (!marquee) return;
    [].forEach.call(marquee.querySelectorAll('.marquee__item'), function (it, i) { it.dataset.idx = i; });
    [].forEach.call(marquee.querySelectorAll('.marquee__row'), function (row) {
      [].slice.call(row.children).forEach(function (it) {
        var clone = it.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.tabIndex = -1;
        row.appendChild(clone);
      });
    });
  }

  /* ===== Photo viewer — one implementation for the gallery grid and the home strip ===== */
  function initLightbox() {
    var lb = doc.querySelector('.lightbox');
    if (!lb) return;
    var figure = lb.querySelector('figure');
    var img = figure.querySelector('img');
    var cap = lb.querySelector('.lb-text'), cat = lb.querySelector('.lb-cat'), count = lb.querySelector('.lb-count');
    var closeBtn = lb.querySelector('.lb-close');
    var list = [], cur = 0, trigger = null, isOpen = false;
    lb.setAttribute('aria-hidden', 'true');

    function sourceFor(el) {
      if (el.classList.contains('g-item')) {
        var items = [].slice.call(doc.querySelectorAll('.g-item')).filter(function (it) { return !it.classList.contains('is-hidden'); });
        return { items: items, index: items.indexOf(el) };
      }
      return { items: [].slice.call(doc.querySelectorAll('.marquee__item:not(.is-clone)')), index: parseInt(el.dataset.idx, 10) || 0 };
    }
    function toData(el) {
      var im = el.querySelector('img');
      return { src: im.getAttribute('src'), alt: im.alt || '', cap: el.dataset.title || el.dataset.cap || im.alt || '', cat: el.dataset.cat || '' };
    }
    function render() {
      var d = list[cur];
      if (!d) return;
      img.src = d.src;
      img.alt = d.alt;
      if (cap) cap.textContent = d.cap;
      if (cat) cat.textContent = d.cat;
      if (count) count.textContent = pad2(cur + 1) + ' / ' + pad2(list.length);
      // Warm both neighbours so stepping never waits on the network.
      [cur - 1, cur + 1].forEach(function (i) {
        var n = list[(i + list.length) % list.length];
        if (n) { var pre = new Image(); pre.src = n.src; }
      });
    }
    function ctx() { return { lb: lb, figure: figure, img: img, trigger: trigger }; }

    function open(el) {
      var src = sourceFor(el);
      list = src.items.map(toData);
      cur = Math.max(0, src.index);
      trigger = el;
      render();
      isOpen = true;
      lb.classList.add('open');
      lb.removeAttribute('aria-hidden');
      BOB.lock();
      BOB.run('lightboxOpen', [ctx()]);
      closeBtn.focus({ preventScroll: true });
    }
    function close() {
      if (!isOpen) return;
      isOpen = false;
      var done = once(function () {
        lb.classList.remove('open');
        lb.setAttribute('aria-hidden', 'true');
        BOB.unlock();
        if (trigger && trigger.focus) trigger.focus({ preventScroll: true });
      });
      BOB.run('lightboxClose', [ctx(), done], done);
    }
    function step(dir) {
      if (!isOpen || list.length < 2) return;
      var commit = once(function () { cur = (cur + dir + list.length) % list.length; render(); });
      BOB.run('lightboxStep', [ctx(), dir, commit], commit);
    }

    doc.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('.g-item, .marquee__item');
      if (el) open(el);
    });
    lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    closeBtn.addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    doc.addEventListener('keydown', function (e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Tab') trapTab(e, focusables(lb));
    });

    // Swipe to step on touch screens.
    var sx = 0, sy = 0, swiping = false;
    figure.addEventListener('pointerdown', function (e) { swiping = true; sx = e.clientX; sy = e.clientY; });
    figure.addEventListener('pointerup', function (e) {
      if (!swiping) return;
      swiping = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
    });
    figure.addEventListener('pointercancel', function () { swiping = false; });

    // Screenshot/debug: ?lb=N opens the viewer at item N.
    var dbg = location.search.match(/[?&]lb=(\d+)/);
    if (dbg) {
      var all = doc.querySelectorAll('.g-item, .marquee__item:not(.is-clone)');
      var target = all[parseInt(dbg[1], 10) - 1];
      if (target) open(target);
    }
  }

  /* ===== Gallery filter ===== */
  function initGallery() {
    var grid = doc.querySelector('.masonry');
    if (!grid) return;
    var items = [].slice.call(grid.querySelectorAll('.g-item'));
    var buttons = [].slice.call(doc.querySelectorAll('.filter'));
    buttons.forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.classList.contains('is-active') ? 'true' : 'false');
      btn.addEventListener('click', function () {
        if (btn.classList.contains('is-active')) return;
        var cat = btn.dataset.filter;
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var apply = once(function () {
          items.forEach(function (it) { it.classList.toggle('is-hidden', !(cat === 'all' || it.dataset.cat === cat)); });
        });
        BOB.run('galleryFilter', [apply, btn], apply);
      });
    });
  }

  /* ===== Booking flow ===== */
  function initBooking() {
    var form = doc.querySelector('[data-booking]');
    if (!form) return;
    var panels = [].slice.call(form.querySelectorAll('.panel'));
    var steps = [].slice.call(doc.querySelectorAll('.stepper li'));
    var params = new URLSearchParams(location.search);
    var step = 0, swapping = false;

    // Values handed over by the home page's booking bar.
    (function prefill() {
      var ci = form.querySelector('[data-date="in"]'), co = form.querySelector('[data-date="out"]');
      var isDate = /^\d{4}-\d{2}-\d{2}$/, today = iso(new Date());
      var inV = params.get('checkin'), outV = params.get('checkout');
      if (ci && inV && isDate.test(inV) && inV >= today) { ci.value = inV; if (co) co.min = dayAfter(inV); }
      if (co && outV && isDate.test(outV) && outV > ((ci && ci.value) || today)) co.value = outV;
      if (ci && co && co.value <= ci.value) co.value = dayAfter(ci.value);
      var g = (params.get('guests') || '').match(/^(\d{1,2})-(\d{1,2})$/);
      if (g) { setCount('adults', g[1]); setCount('children', g[2]); }
      var r = params.get('rooms'), rooms = form.querySelector('#rooms');
      if (rooms && /^[1-3]$/.test(r || '')) rooms.value = r;
    })();
    function setCount(name, v) {
      var input = form.querySelector('[name="' + name + '"]');
      if (!input) return;
      var min = parseInt(input.getAttribute('min') || '0', 10), max = parseInt(input.getAttribute('max') || '20', 10);
      input.value = Math.max(min, Math.min(max, parseInt(v, 10)));
    }

    function show(i, initial) {
      var next = Math.max(0, Math.min(panels.length - 1, i));
      var from = panels[step], to = panels[next], dir = next >= step ? 1 : -1;
      var commit = once(function () {
        panels.forEach(function (p, idx) { p.classList.toggle('active', idx === next); });
        step = next;
        swapping = false;
        steps.forEach(function (s, idx) {
          s.classList.toggle('active', idx === next);
          s.classList.toggle('done', idx < next);
          if (idx === next) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
        });
        updateSummary();
      });
      if (initial || from === to) { commit(); return; }
      swapping = true;
      BOB.run('panelSwap', [from, to, dir, commit], commit);
      var top = form.getBoundingClientRect().top + window.scrollY - 110;
      if (window.scrollY > top + 40 || form.getBoundingClientRect().top > window.innerHeight * 0.6) BOB.scrollTo(top);
    }

    var preRoom = params.get('room');
    var choices = [].slice.call(form.querySelectorAll('.choice'));
    function selectChoice(c) {
      choices.forEach(function (x) { x.classList.remove('sel'); });
      c.classList.add('sel');
      var radio = c.querySelector('input');
      if (radio) radio.checked = true;
      updateSummary();
    }
    choices.forEach(function (c) {
      c.addEventListener('click', function () { selectChoice(c); });
      if (preRoom && c.dataset.room === preRoom) selectChoice(c);
    });

    [].forEach.call(form.querySelectorAll('[data-next]'), function (b) {
      b.addEventListener('click', function () {
        if (swapping) return;
        if (step === 0 && !validateStay()) return;
        if (step === 1 && !form.querySelector('.choice.sel')) { flash(b, 'Please choose a room'); return; }
        show(step + 1);
      });
    });
    [].forEach.call(form.querySelectorAll('[data-prev]'), function (b) {
      b.addEventListener('click', function () { if (!swapping) show(step - 1); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var refEl = doc.getElementById('confref');
      if (refEl) refEl.textContent = 'BOK-' + Math.floor(100000 + Math.random() * 899999);
      show(panels.length - 1);
    });

    function validateStay() {
      var ok = true;
      [].forEach.call(form.querySelectorAll('.panel.active [required]'), function (f) { if (!f.value) ok = false; });
      if (!ok) form.reportValidity();
      return ok;
    }
    // Swap the label for a moment, then put the original markup (icon included) back.
    function flash(btn, msg) {
      if (btn.dataset.flashing) return;
      btn.dataset.flashing = '1';
      var old = btn.innerHTML;
      btn.textContent = msg;
      btn.classList.add('is-warn');
      setTimeout(function () {
        btn.innerHTML = old;
        btn.classList.remove('is-warn');
        delete btn.dataset.flashing;
      }, 1600);
    }

    function val(sel) { var el = form.querySelector(sel); return el ? el.value : ''; }
    function nights(a, b) {
      var n = Math.round((new Date(b) - new Date(a)) / 86400000);
      return isNaN(n) || n < 1 ? 1 : n;
    }
    function fmt(d) {
      var dt = new Date(d + 'T00:00');
      return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    function updateSummary() {
      var setT = function (id, v) { var e = doc.getElementById(id); if (e && e.textContent !== v) e.textContent = v; };
      var inD = val('[data-date="in"]'), outD = val('[data-date="out"]');
      var n = nights(inD, outD);
      var ad = val('[name="adults"]'), ch = val('[name="children"]');
      setT('s-dates', inD && outD ? fmt(inD) + ' → ' + fmt(outD) : '—');
      setT('s-nights', n + (n === 1 ? ' night' : ' nights'));
      setT('s-guests', (ad || '2') + (ad === '1' ? ' adult' : ' adults') + (ch && ch !== '0' ? ', ' + ch + (ch === '1' ? ' child' : ' children') : ''));
      var sel = form.querySelector('.choice.sel');
      var rate = sel ? parseInt(sel.dataset.rate, 10) : 0;
      setT('s-room', sel ? sel.dataset.title : '—');
      setT('s-rate', rate ? '฿' + rate.toLocaleString('en-US') + ' × ' + n : '—');
      setT('s-total', rate ? '฿' + (rate * n).toLocaleString('en-US') : '฿—');
    }

    form.addEventListener('change', updateSummary);
    var stepParam = parseInt(params.get('step') || '1', 10);
    show(isNaN(stepParam) ? 0 : stepParam - 1, true);
  }

  /* ===== The Vibe: click a thumbnail to swap it into the main image ===== */
  function initVibeSwap() {
    var main = doc.querySelector('[data-vibe-main]');
    if (!main) return;
    var thumbs = [].slice.call(doc.querySelectorAll('.vibe-thumb'));
    var label = function (btn) {
      var im = btn.querySelector('img');
      if (im) btn.setAttribute('aria-label', 'Show larger: ' + im.alt);
    };
    thumbs.forEach(function (btn) {
      label(btn);
      btn.addEventListener('click', function () {
        var timg = btn.querySelector('img');
        if (!timg || btn.dataset.busy) return;
        var ms = main.getAttribute('src'), ma = main.getAttribute('alt');
        var commit = once(function () {
          main.setAttribute('src', timg.getAttribute('src'));
          main.setAttribute('alt', timg.getAttribute('alt'));
          timg.setAttribute('src', ms);
          timg.setAttribute('alt', ma);
          label(btn);
        });
        BOB.run('vibeSwap', [main, timg, commit], function () {
          if (still || reduced) { commit(); return; }
          main.style.opacity = '0';
          setTimeout(function () { commit(); main.style.opacity = ''; }, 200);
        });
      });
    });
    // Deep-link / screenshot helper: ?vibe=N pre-swaps the Nth thumbnail.
    var vibeParam = location.search.match(/[?&]vibe=(\d+)/);
    if (vibeParam) {
      var vi = parseInt(vibeParam[1], 10) - 1;
      if (thumbs[vi]) thumbs[vi].click();
    }
  }

  /* ===== Welcome photo: gentle scroll-zoom + subtle pointer parallax ===== */
  function initParallaxZoom() {
    var img = doc.querySelector('[data-zoom]');
    if (!img) return;
    var box = img.parentElement;
    var scale = 1.05, tx = 0, ty = 0, ticking = false;

    function apply() {
      img.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + scale.toFixed(3) + ')';
      ticking = false;
    }
    function request() { if (!ticking) { ticking = true; window.requestAnimationFrame(apply); } }
    function onScroll() {
      var rect = box.getBoundingClientRect();
      var vh = window.innerHeight || root.clientHeight;
      var p = Math.max(0, Math.min(1, (vh - (rect.top + rect.height / 2)) / vh));
      scale = 1.05 + p * 0.10;
      request();
    }

    var dbg = location.search.match(/[?&]zoom=([\d.]+)/);
    if (dbg) { scale = parseFloat(dbg[1]); apply(); return; }
    if (reduced || still) { apply(); return; }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
    box.addEventListener('mousemove', function (e) {
      var rect = box.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 14;
      request();
    });
    box.addEventListener('mouseleave', function () { tx = 0; ty = 0; request(); });
  }

  /* ===== Newsletter: concept demo — confirms in place, sends nothing ===== */
  function initSubscribe() {
    [].forEach.call(doc.querySelectorAll('.subscribe'), function (f) {
      var input = f.querySelector('input');
      var msg = f.parentNode.querySelector('.subscribe__msg');
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!input.checkValidity()) { input.reportValidity(); return; }
        f.classList.add('is-done');
        input.value = '';
        input.disabled = true;
        f.querySelector('button').disabled = true;
        if (msg) msg.textContent = 'Thank you — you’re on the list.';
      });
    });
  }

  /* ===== Sun dial: back to top, shown once the hero is behind you ===== */
  function initSundial() {
    var dial = doc.querySelector('.sundial');
    if (!dial) return;
    var onScroll = function () { dial.classList.toggle('is-shown', window.scrollY > window.innerHeight * 0.6); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    dial.addEventListener('click', function () {
      BOB.scrollTo(0);
      var brand = doc.querySelector('.brand');
      if (brand) setTimeout(function () { brand.focus({ preventScroll: true }); }, 50);
    });
  }
})();
