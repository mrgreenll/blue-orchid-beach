/* Blue Orchid Beach — interactions. Subtle motion, real interactivity. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;

  // Screenshot / reduced-motion: reveal everything immediately.
  var still = /[?&]still/.test(location.search) ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (still) root.classList.add('still');

  function ready(fn) {
    if (doc.readyState !== 'loading') fn();
    else doc.addEventListener('DOMContentLoaded', fn);
  }

  // Screenshot helper: ?scroll=N jumps to a y-offset; ?shift=N pulls the page
  // up by N px via layout (so headless captures lower sections crisply).
  var scrollMatch = location.search.match(/[?&]scroll=(\d+)/);
  var shiftMatch = location.search.match(/[?&]shift=(\d+)/);
  function applyScroll() {
    if (scrollMatch) window.scrollTo(0, parseInt(scrollMatch[1], 10));
    if (shiftMatch) doc.body.style.marginTop = '-' + parseInt(shiftMatch[1], 10) + 'px';
  }
  if (scrollMatch || shiftMatch) window.addEventListener('load', applyScroll);

  ready(function () {
    applyScroll();
    /* ---- Footer year ---- */
    var y = doc.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();

    /* ---- Nav: solid-on-scroll ---- */
    var nav = doc.querySelector('.nav');
    if (nav) {
      var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 30); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    /* ---- Mobile menu ---- */
    var toggle = doc.querySelector('.nav-toggle');
    var menu = doc.querySelector('.mobile-menu');
    if (toggle && menu) {
      var setMenu = function (open) {
        doc.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      toggle.addEventListener('click', function () {
        setMenu(!doc.body.classList.contains('menu-open'));
      });
      menu.addEventListener('click', function (e) {
        if (e.target.tagName === 'A') setMenu(false);
      });
      doc.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') setMenu(false);
      });
      if (/[?&]menu=open/.test(location.search)) setMenu(true);
    }

    /* ---- Reveal on scroll ---- */
    var reveals = [].slice.call(doc.querySelectorAll('.reveal'));
    if (reveals.length) {
      if (still || !('IntersectionObserver' in window)) {
        reveals.forEach(function (el) { el.classList.add('is-in'); });
      } else {
        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
          });
        }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
        reveals.forEach(function (el) { io.observe(el); });
      }
    }

    /* ---- Date inputs: sensible defaults (today / tomorrow, no past) ---- */
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
    var ci = doc.querySelectorAll('[data-date="in"]');
    var co = doc.querySelectorAll('[data-date="out"]');
    if (ci.length || co.length) {
      var today = new Date();
      var tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
      var dat = new Date(); dat.setDate(dat.getDate() + 3);
      [].forEach.call(ci, function (el) { el.min = iso(today); if (!el.value) el.value = iso(tmr); });
      [].forEach.call(co, function (el) { el.min = iso(tmr); if (!el.value) el.value = iso(dat); });
    }

    /* ---- Guest steppers (− value +) ---- */
    [].forEach.call(doc.querySelectorAll('[data-stepper]'), function (wrap) {
      var input = wrap.querySelector('input');
      var min = parseInt(input.getAttribute('min') || '0', 10);
      var max = parseInt(input.getAttribute('max') || '20', 10);
      wrap.querySelectorAll('button').forEach(function (b) {
        b.addEventListener('click', function () {
          var v = parseInt(input.value || '0', 10) + (b.dataset.dir === 'up' ? 1 : -1);
          v = Math.max(min, Math.min(max, v));
          input.value = v;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
    });

    initGallery();
    initBooking();
    initVibeSwap();
    initParallaxZoom();
    initMarquee();
  });

  /* ===== Drifting marquee: seamless loop + click-to-lightbox ===== */
  function initMarquee() {
    var marquee = doc.querySelector('.marquee');
    if (!marquee) return;

    // Index the originals, then duplicate each row so the CSS -50% loop is seamless.
    var originals = [].slice.call(marquee.querySelectorAll('.marquee__item'));
    originals.forEach(function (it, i) { it.dataset.idx = i; });
    var data = originals.map(function (it) {
      var img = it.querySelector('img');
      return { src: img.getAttribute('src'), alt: img.alt || '', cap: it.dataset.cap || img.alt || '', cat: it.dataset.cat || '' };
    });
    [].forEach.call(marquee.querySelectorAll('.marquee__row'), function (row) {
      [].slice.call(row.children).forEach(function (it) {
        var clone = it.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.tabIndex = -1;
        row.appendChild(clone);
      });
    });

    var lb = doc.querySelector('.lightbox');
    if (!lb) return;
    var lbImg = lb.querySelector('img'), lbCap = lb.querySelector('.lb-text'), lbCat = lb.querySelector('.lb-cat');
    var cur = 0;
    function render() {
      var d = data[cur]; if (!d) return;
      lbImg.src = d.src; lbImg.alt = d.alt;
      if (lbCap) lbCap.textContent = d.cap;
      if (lbCat) lbCat.textContent = d.cat;
    }
    function open(i) { cur = (i + data.length) % data.length; render(); lb.classList.add('open'); doc.body.style.overflow = 'hidden'; }
    function step(n) { cur = (cur + n + data.length) % data.length; render(); }
    function close() { lb.classList.remove('open'); doc.body.style.overflow = ''; }

    [].forEach.call(marquee.querySelectorAll('.marquee__item'), function (it) {
      it.addEventListener('click', function () { open(parseInt(it.dataset.idx, 10) || 0); });
    });
    lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    doc.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });
    // Screenshot/debug: ?lb=N opens the lightbox at item N.
    var lbDbg = location.search.match(/[?&]lb=(\d+)/);
    if (lbDbg) open(parseInt(lbDbg[1], 10) - 1);
  }

  /* ===== Welcome photo: gentle scroll-zoom + subtle mouse parallax ===== */
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
      var vh = window.innerHeight || doc.documentElement.clientHeight;
      var center = rect.top + rect.height / 2;
      var p = Math.max(0, Math.min(1, (vh - center) / vh)); // 0 entering → 1 leaving top
      scale = 1.05 + p * 0.10;                              // zoom 1.05 → 1.15 on scroll
      request();
    }

    // Screenshot/debug: ?zoom=N forces a fixed scale
    var dbg = location.search.match(/[?&]zoom=([\d.]+)/);
    if (dbg) { scale = parseFloat(dbg[1]); apply(); return; }

    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || root.classList.contains('still')) { apply(); return; }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();

    box.addEventListener('mousemove', function (e) {
      var rect = box.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / rect.width - 0.5) * 14;  // ±7px pan
      ty = ((e.clientY - rect.top) / rect.height - 0.5) * 14;
      request();
    });
    box.addEventListener('mouseleave', function () { tx = 0; ty = 0; request(); });
  }

  /* ===== Vibe band: click a thumbnail to swap it into the main image ===== */
  function initVibeSwap() {
    var main = doc.querySelector('[data-vibe-main]');
    if (!main) return;
    var thumbButtons = [].slice.call(doc.querySelectorAll('.vibe-thumb'));
    thumbButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var timg = btn.querySelector('img');
        if (!timg || timg.src === main.src) return;
        var ms = main.getAttribute('src'), ma = main.getAttribute('alt');
        var swap = function () {
          main.setAttribute('src', timg.getAttribute('src'));
          main.setAttribute('alt', timg.getAttribute('alt'));
          timg.setAttribute('src', ms);
          timg.setAttribute('alt', ma);
          main.style.opacity = '';
        };
        if (root.classList.contains('still') ||
            (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
          swap();
        } else {
          main.style.opacity = '0';
          window.setTimeout(swap, 200);
        }
      });
    });
    // Deep-link / screenshot helper: ?vibe=N pre-swaps the Nth thumbnail.
    var vibeParam = location.search.match(/[?&]vibe=(\d+)/);
    if (vibeParam) {
      var vi = parseInt(vibeParam[1], 10) - 1;
      if (thumbButtons[vi]) thumbButtons[vi].click();
    }
  }

  /* ================= Gallery filter + lightbox ================= */
  function initGallery() {
    var grid = doc.querySelector('.masonry');
    if (!grid) return;
    var items = [].slice.call(grid.querySelectorAll('.g-item'));

    // Filtering
    [].forEach.call(doc.querySelectorAll('.filter'), function (btn) {
      btn.addEventListener('click', function () {
        doc.querySelectorAll('.filter').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');
        var cat = btn.dataset.filter;
        items.forEach(function (it) {
          var show = cat === 'all' || it.dataset.cat === cat;
          it.classList.toggle('is-hidden', !show);
        });
      });
    });

    // Lightbox
    var lb = doc.querySelector('.lightbox');
    if (!lb) return;
    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.lb-text');
    var lbCat = lb.querySelector('.lb-cat');
    var current = 0;

    function visibleItems() { return items.filter(function (it) { return !it.classList.contains('is-hidden'); }); }
    function open(it) {
      var list = visibleItems();
      current = list.indexOf(it);
      render(list);
      lb.classList.add('open');
      doc.body.style.overflow = 'hidden';
    }
    function render(list) {
      var it = list[current];
      if (!it) return;
      var img = it.querySelector('img');
      lbImg.src = img.dataset.full || img.src;
      lbImg.alt = img.alt;
      if (lbCap) lbCap.textContent = it.dataset.title || img.alt || '';
      if (lbCat) lbCat.textContent = it.dataset.cat || '';
    }
    function step(d) {
      var list = visibleItems();
      current = (current + d + list.length) % list.length;
      render(list);
    }
    function close() { lb.classList.remove('open'); doc.body.style.overflow = ''; }

    items.forEach(function (it) {
      it.addEventListener('click', function () { open(it); });
    });
    lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    doc.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
    });
  }

  /* ================= Booking flow ================= */
  function initBooking() {
    var form = doc.querySelector('[data-booking]');
    if (!form) return;
    var panels = [].slice.call(form.querySelectorAll('.panel'));
    var steps = [].slice.call(doc.querySelectorAll('.stepper li'));
    var step = 0;

    function show(i) {
      step = Math.max(0, Math.min(panels.length - 1, i));
      panels.forEach(function (p, idx) { p.classList.toggle('active', idx === step); });
      steps.forEach(function (s, idx) {
        s.classList.toggle('active', idx === step);
        s.classList.toggle('done', idx < step);
      });
      var top = form.getBoundingClientRect().top + window.scrollY - 96;
      window.scrollTo({ top: top, behavior: root.classList.contains('still') ? 'auto' : 'smooth' });
      updateSummary();
    }

    // Pre-select room from ?room= on the choose-room step
    var params = new URLSearchParams(location.search);
    var preRoom = params.get('room');

    // Room selection
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

    // Navigation buttons
    form.querySelectorAll('[data-next]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (step === 0 && !validateStay()) return;
        if (step === 1 && !form.querySelector('.choice.sel')) {
          flash(b, 'Please choose a room');
          return;
        }
        show(step + 1);
      });
    });
    form.querySelectorAll('[data-prev]').forEach(function (b) {
      b.addEventListener('click', function () { show(step - 1); });
    });

    // Final submit → confirmation
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var ref = 'BOK-' + Math.floor(100000 + Math.random() * 899999);
      var refEl = doc.getElementById('confref');
      if (refEl) refEl.textContent = ref;
      show(panels.length - 1);
    });

    function validateStay() {
      var ok = true;
      form.querySelectorAll('.panel.active [required]').forEach(function (f) {
        if (!f.value) { ok = false; }
      });
      if (!ok) form.reportValidity();
      return ok;
    }
    function flash(btn, msg) {
      var old = btn.textContent;
      btn.textContent = msg;
      btn.style.background = 'var(--andaman)';
      setTimeout(function () { btn.innerHTML = old; btn.style.background = ''; }, 1600);
    }

    // Live summary
    function val(sel) { var el = form.querySelector(sel); return el ? el.value : ''; }
    function nights(a, b) {
      var d1 = new Date(a), d2 = new Date(b);
      var n = Math.round((d2 - d1) / 86400000);
      return isNaN(n) || n < 1 ? 1 : n;
    }
    function updateSummary() {
      var setT = function (id, v) { var e = doc.getElementById(id); if (e) e.textContent = v; };
      var inD = val('[data-date="in"]'), outD = val('[data-date="out"]');
      var n = nights(inD, outD);
      var ad = val('[name="adults"]'), ch = val('[name="children"]');
      setT('s-dates', inD && outD ? fmt(inD) + ' → ' + fmt(outD) : '—');
      setT('s-nights', n + (n === 1 ? ' night' : ' nights'));
      setT('s-guests', (ad || '2') + ' adults' + (ch && ch !== '0' ? ', ' + ch + ' children' : ''));
      var sel = form.querySelector('.choice.sel');
      var rate = sel ? parseInt(sel.dataset.rate, 10) : 0;
      setT('s-room', sel ? sel.dataset.title : '—');
      var total = rate * n;
      setT('s-rate', rate ? '฿' + rate.toLocaleString() + ' × ' + n : '—');
      setT('s-total', total ? '฿' + total.toLocaleString() : '฿—');
    }
    function fmt(d) {
      var dt = new Date(d);
      if (isNaN(dt)) return d;
      return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    form.addEventListener('change', updateSummary);
    var stepParam = parseInt(params.get('step') || '1', 10);
    show(isNaN(stepParam) ? 0 : Math.max(0, Math.min(panels.length - 1, stepParam - 1)));
  }
})();
