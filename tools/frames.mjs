// Frame sequences for reviewing motion — either scroll positions or a timed capture after load.
// Usage:
//   node tools/frames.mjs /            --scroll=0:3000:10  [--settle=800]
//   node tools/frames.mjs "/?intro=1"  --time=1800:12
//   options: --w=1440 --h=900 --label=name --media=reduce --wait=1200 --base=http://localhost:3140
// Output: temporary screenshots/frames/<label>/NN.png|jpg, plus sheet.jpg (needs ImageMagick).
import { mkdirSync, rmSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { launch, sleep } from './cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const a = argv.find((x) => x.startsWith(`--${name}=`));
  return a ? a.slice(name.length + 3) : dflt;
};
const path = argv.find((a) => !a.startsWith('--')) || '/';
const BASE = opt('base', 'http://localhost:3140').replace(/\/$/, '');
const W = +opt('w', 1440), H = +opt('h', 900);
const label = opt('label', 'frames').replace(/[^a-z0-9_-]/gi, '');
const out = join(ROOT, 'temporary screenshots', 'frames', label);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const b = await launch({ width: W, height: H });
const { cdp } = b;
await b.size(W, H);
if (opt('media', '') === 'reduce') {
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
}
const url = BASE + (path.startsWith('/') ? path : '/' + path);
const pad = (n) => String(n).padStart(2, '0');

if (opt('time', '')) {
  // Screencast rather than repeated screenshots: frames arrive on the compositor's own
  // clock, so the spacing between saved frames is real elapsed time.
  const [ms, steps] = opt('time').split(':').map(Number);
  const frames = [];
  let t0 = 0;
  cdp.on('Page.screencastFrame', (p) => {
    frames.push({ t: Date.now() - t0, data: p.data });
    cdp.send('Page.screencastFrameAck', { sessionId: p.sessionId }).catch(() => {});
  });
  // The screencast has to start before navigating: Chrome refuses it mid-navigation.
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  t0 = Date.now();
  await cdp.send('Page.navigate', { url });
  await sleep(ms);
  await cdp.send('Page.stopScreencast');
  for (let i = 0; i < steps; i++) {
    const at = (ms * i) / Math.max(1, steps - 1);
    const f = frames.reduce((best, fr) => (Math.abs(fr.t - at) < Math.abs(best.t - at) ? fr : best), frames[0]);
    if (f) writeFileSync(join(out, `${pad(i)}-${String(f.t).padStart(4, '0')}ms.jpg`), Buffer.from(f.data, 'base64'));
  }
  console.log(`${frames.length} frames over ${ms}ms → ${steps} saved`);
} else {
  const [from, to, steps] = opt('scroll', '0:2000:6').split(':').map(Number);
  const settle = +opt('settle', 800);
  const loaded = cdp.once('Page.loadEventFired');
  await cdp.send('Page.navigate', { url });
  await loaded;
  await sleep(+opt('wait', 1200));
  for (let i = 0; i < steps; i++) {
    const y = Math.round(from + ((to - from) * i) / Math.max(1, steps - 1));
    await cdp.send('Runtime.evaluate', { expression: `window.scrollTo(0, ${y})` });
    await sleep(settle);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(out, `${pad(i)}-y${y}.png`), Buffer.from(data, 'base64'));
  }
  console.log(`${steps} frames from y=${from} to y=${to}`);
}
b.close();

const files = readdirSync(out).filter((f) => /\.(png|jpg)$/.test(f)).sort().map((f) => join(out, f));
// montage exits non-zero when no default font is configured even though it writes the
// sheet, so judge by the file rather than the status.
spawnSync('magick', ['montage', ...files, '-tile', '3x', '-geometry', '640x+6+6', '-background', '#222', join(out, 'sheet.jpg')]);
console.log(existsSync(join(out, 'sheet.jpg')) ? `sheet → ${join(out, 'sheet.jpg')}` : `frames → ${out}`);
