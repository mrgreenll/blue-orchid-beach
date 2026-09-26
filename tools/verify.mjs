// Headless checks for the Blue Orchid site — the regression suite for the Tide & Light pass.
// Usage:  node tools/verify.mjs [baseUrl] [--only=name,name]
//   baseUrl defaults to http://localhost:3140   (start it with: PORT=3140 node serve.mjs)
//   names: assets console overflow nojs reduced cdnfail booking-prefill booking-noscroll
//          booking-flash reel gallery-filter lightbox-a11y intro
import { readFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { launch, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const BASE = (argv.find((a) => !a.startsWith('--')) || 'http://localhost:3140').replace(/\/$/, '');
const ONLY = (argv.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const PAGES = ['index.html', 'rooms.html', 'gallery.html', 'booking.html'];
const DISCLAIMER = 'Unofficial concept. Not affiliated with or endorsed by the business.';
// Same reference rules as Portfolio/tools/collect.mjs, which only copies what these match.
const REF = /(?:src|href)\s*=\s*["']([^"']+)["']|url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
const SKIP = /^(https?:|data:|#|mailto:|tel:|javascript:)/i;

const results = [];
const record = (ok, name, detail = '') => results.push({ ok, name, detail });
const want = (name) => !ONLY.length || ONLY.includes(name);

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plusDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

// Elements that must be visible whenever motion is not running. Anything parked inside a
// closed panel, dialog, menu or the intro is legitimately hidden and is ignored.
const HIDDEN_JS = (sel) => `(() => [...document.querySelectorAll(${JSON.stringify(sel)})]
  .filter((el) => !el.closest('.panel:not(.active), .lightbox, .mobile-menu, .intro, [hidden], .is-hidden'))
  .filter((el) => !el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
  .map((el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/)[0] : ''))
)()`;
const MUST_SHOW = 'h1, h2, .section-head p, .room-card, .g-item, .suite, .footer__brand';

function refsIn(text) {
  const out = new Set();
  for (const m of text.matchAll(REF)) {
    let u = m[1] || m[2];
    if (!u || SKIP.test(u)) continue;
    try { u = decodeURIComponent(u); } catch {}
    u = u.split('?')[0].split('#')[0].replace(/^\.\//, '').replace(/^\/+/, '');
    if (u) out.add(u);
  }
  return out;
}

function checkAssets() {
  const problems = [];
  for (const page of PAGES) {
    const html = readFileSync(join(ROOT, page), 'utf8');
    if (/\ssrcset\s*=/.test(html)) problems.push(`${page}: srcset (collect.mjs cannot follow it)`);
    if (!html.includes(DISCLAIMER)) problems.push(`${page}: concept disclaimer missing`);
    if (!/<meta name="robots" content="noindex,nofollow">/.test(html)) problems.push(`${page}: robots noindex missing`);
    for (const ref of refsIn(html)) {
      if (!existsSync(join(ROOT, ref))) problems.push(`${page}: missing ${ref}`);
      if (ref.endsWith('.css') && existsSync(join(ROOT, ref))) {
        const css = readFileSync(join(ROOT, ref), 'utf8');
        for (const r of refsIn(css)) {
          const p = join(ROOT, dirname(ref), r);
          if (!existsSync(p)) problems.push(`${ref}: missing ${r}`);
        }
      }
    }
  }
  record(!problems.length, 'assets', problems.slice(0, 8).join('; ') || 'all local refs resolve, disclaimer + noindex on every page');
}

async function run() {
  if (want('assets')) checkAssets();
  if (ONLY.length && ONLY.every((n) => n === 'assets')) return;

  const b = await launch({ width: 1440, height: 900 });
  const { cdp } = b;
  await cdp.send('Log.enable');
  await cdp.send('Network.enable');

  let errors = [];
  cdp.on('Runtime.exceptionThrown', (p) => errors.push('exception: ' + String(p.exceptionDetails.exception?.description || p.exceptionDetails.text).split('\n')[0]));
  cdp.on('Runtime.consoleAPICalled', (p) => {
    if (p.type === 'error') errors.push('console.error: ' + p.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 160));
  });
  cdp.on('Log.entryAdded', (p) => {
    if (p.entry.level === 'error') errors.push(`log: ${p.entry.text.slice(0, 140)}${p.entry.url ? ' ' + p.entry.url : ''}`);
  });

  const reset = async () => {
    await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });
    await cdp.send('Emulation.setEmulatedMedia', { features: [] });
    await cdp.send('Network.setBlockedURLs', { urls: [] });
    await b.size(1440, 900);
    errors = [];
  };

  const check = async (name, fn) => {
    if (!want(name)) return;
    await reset();
    try {
      const detail = await fn();
      record(!detail || detail.ok !== false, name, typeof detail === 'string' ? detail : detail?.msg || '');
    } catch (e) {
      record(false, name, 'threw: ' + e.message.split('\n')[0]);
    }
  };
  const failWith = (msg) => ({ ok: false, msg });

  await check('console', async () => {
    const bad = [];
    for (const p of PAGES) {
      errors = [];
      await b.goto(`${BASE}/${p}`, 2500);
      const live = await b.evaluate(`document.documentElement.className`);
      if (errors.length) bad.push(`${p}: ${errors[0]}`);
      if (/\bmotion\b/.test(live) && !/\bmotion-live\b/.test(live)) bad.push(`${p}: motion never booted`);
    }
    return bad.length ? failWith(bad.join(' | ')) : 'no errors on any page';
  });

  await check('overflow', async () => {
    const bad = [];
    for (const w of [375, 768, 1024, 1440]) {
      await b.size(w, w < 768 ? 812 : 900);
      for (const p of PAGES) {
        await b.goto(`${BASE}/${p}`, 700);
        const [sw, iw] = await b.evaluate(`[document.documentElement.scrollWidth, window.innerWidth]`);
        if (sw > iw) bad.push(`${p}@${w}: ${sw}>${iw}`);
      }
    }
    return bad.length ? failWith(bad.join(', ')) : 'no horizontal scroll at 375/768/1024/1440';
  });

  await check('nojs', async () => {
    await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
    const bad = [];
    for (const p of PAGES) {
      await b.goto(`${BASE}/${p}`, 400);
      const hidden = await b.evaluate(HIDDEN_JS(MUST_SHOW));
      if (hidden.length) bad.push(`${p}: ${hidden.length} hidden (${hidden.slice(0, 3).join(', ')})`);
    }
    return bad.length ? failWith(bad.join(' | ')) : 'all content visible without JavaScript';
  });

  await check('reduced', async () => {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const bad = [];
    for (const p of PAGES) {
      await b.goto(`${BASE}/${p}`, 900);
      const cls = await b.evaluate(`document.documentElement.className`);
      if (/\bmotion\b/.test(cls)) bad.push(`${p}: motion class set`);
      const hidden = await b.evaluate(HIDDEN_JS(MUST_SHOW));
      if (hidden.length) bad.push(`${p}: ${hidden.length} hidden (${hidden.slice(0, 3).join(', ')})`);
    }
    return bad.length ? failWith(bad.join(' | ')) : 'reduced motion: no motion class, everything visible';
  });

  await check('cdnfail', async () => {
    await cdp.send('Network.setBlockedURLs', { urls: ['*cdn.jsdelivr.net*'] });
    await b.goto(`${BASE}/index.html`, 1200);
    const cls = await b.evaluate(`document.documentElement.className`);
    const hidden = await b.evaluate(HIDDEN_JS(MUST_SHOW));
    if (/\bmotion\b/.test(cls)) return failWith('motion class survived a blocked CDN');
    if (hidden.length) return failWith(`${hidden.length} hidden (${hidden.slice(0, 3).join(', ')})`);
    return 'blocked CDN: static page, everything visible';
  });

  await check('booking-prefill', async () => {
    const ci = plusDays(5), co = plusDays(9);
    await b.goto(`${BASE}/booking.html?checkin=${ci}&checkout=${co}&guests=2-1&rooms=2`, 700);
    const v = await b.evaluate(`({
      ci: document.getElementById('ci').value, co: document.getElementById('co').value,
      ad: document.querySelector('[name=adults]').value, ch: document.querySelector('[name=children]').value,
      rooms: document.getElementById('rooms').value, nights: document.getElementById('s-nights').textContent.trim()
    })`);
    const want = { ci, co, ad: '2', ch: '1', rooms: '2', nights: '4 nights' };
    const diff = Object.keys(want).filter((k) => v[k] !== want[k]).map((k) => `${k}=${v[k]} (want ${want[k]})`);
    return diff.length ? failWith(diff.join(', ')) : 'dates, guests and rooms carried from the booking bar';
  });

  await check('booking-noscroll', async () => {
    await b.goto(`${BASE}/booking.html`, 1500);
    const y = await b.evaluate('Math.round(window.scrollY)');
    return y === 0 ? 'booking.html opens at the top' : failWith(`scrolled to ${y}px on load`);
  });

  await check('booking-flash', async () => {
    await b.goto(`${BASE}/booking.html?step=2`, 600);
    await b.evaluate(`window.__flashBtn = document.querySelector('.panel.active [data-next]'); __flashBtn.click(); true`);
    await sleep(1900);
    const html = await b.evaluate(`window.__flashBtn.innerHTML`);
    return html.includes('<svg') ? 'button keeps its icon after the warning' : failWith('icon lost: ' + html.trim().slice(0, 60));
  });

  await check('reel', async () => {
    await b.size(1440, 1000);
    await b.goto(`${BASE}/`, 1500);
    const msg = await b.evaluate(`(() => {
      const miss = ['.hero__actions .btn', '#rooms', '.room-card:nth-of-type(1)', '.room-card:nth-of-type(2)'].filter((s) => !document.querySelector(s));
      if (miss.length) return 'missing ' + miss.join(', ');
      const intro = document.querySelector('.intro');
      if (intro && intro.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return 'intro still showing';
      const tag = document.querySelector('.hero__tag');
      if (!tag.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return 'hero headline hidden';
      const moving = [tag, ...tag.querySelectorAll('*')].filter((el) => {
        const t = getComputedStyle(el).transform;
        if (t === 'none') return false;
        const m = t.match(/^matrix\\(([^)]+)\\)$/);
        if (!m) return true;
        const v = m[1].split(',').map(Number);
        return Math.abs(v[0] - 1) > 0.001 || Math.abs(v[3] - 1) > 0.001 || Math.abs(v[4]) > 0.5 || Math.abs(v[5]) > 0.5;
      });
      return moving.length ? moving.length + ' headline parts still moving' : '';
    })()`);
    return msg ? failWith(msg) : 'hero at rest 1.5s after load; reel selectors resolve';
  });

  await check('gallery-filter', async () => {
    await b.goto(`${BASE}/gallery.html`, 800);
    const count = (cat) => b.evaluate(`[...document.querySelectorAll('.g-item')].filter((e) => !e.classList.contains('is-hidden') && e.checkVisibility()).length + '/' + document.querySelectorAll('.g-item${cat ? `[data-cat=${cat}]` : ''}').length`);
    await b.evaluate(`document.querySelector('[data-filter=pools]').click(); true`);
    await sleep(1500);
    const pools = await count('pools');
    await b.evaluate(`document.querySelector('[data-filter=all]').click(); true`);
    await sleep(1500);
    const all = await count('');
    const [pv, pt] = pools.split('/'), [av, at] = all.split('/');
    if (pv !== pt) return failWith(`pools filter shows ${pv}, expected ${pt}`);
    if (av !== at) return failWith(`all filter shows ${av}, expected ${at}`);
    return `pools ${pv}, all ${av}`;
  });

  await check('lightbox-a11y', async () => {
    await b.goto(`${BASE}/gallery.html`, 800);
    await b.evaluate(`window.__lbT = document.querySelector('.g-item'); __lbT.focus(); __lbT.click(); true`);
    await sleep(1000);
    const opened = await b.evaluate(`(() => { const lb = document.querySelector('.lightbox'); return lb.classList.contains('open') && lb.contains(document.activeElement); })()`);
    if (!opened) return failWith('viewer did not open with focus inside it');
    await b.key('Escape', 'Escape', 27);
    await sleep(1000);
    const back = await b.evaluate(`document.activeElement === window.__lbT && !document.querySelector('.lightbox').classList.contains('open')`);
    return back ? 'focus moves into the viewer and back to the photo' : failWith('focus not returned to the photo after Escape');
  });

  await check('intro', async () => {
    await b.goto(`${BASE}/?intro=1`, 2000);
    const state = await b.evaluate(`(() => {
      const intro = document.querySelector('.intro');
      if (!intro) return 'skip';
      return intro.checkVisibility({ opacityProperty: true, visibilityProperty: true }) ? 'showing' : 'done';
    })()`);
    if (state === 'skip') return 'no intro in the page yet (skipped)';
    return state === 'done' ? 'intro finished within 2s of load' : failWith('intro still covering the page 2s after load');
  });

  b.close();
}

await run();
let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name.padEnd(17)} ${r.detail}`);
}
console.log(failed ? `\n${failed} failing` : `\nall ${results.length} passing`);
process.exit(failed ? 1 : 0);
