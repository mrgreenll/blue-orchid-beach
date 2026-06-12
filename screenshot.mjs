// Headless-Chrome screenshot helper (no Puppeteer).
// Usage:  node screenshot.mjs <url> [label] [width] [height]
//   node screenshot.mjs http://localhost:3000
//   node screenshot.mjs http://localhost:3000 home
//   node screenshot.mjs http://localhost:3000 home-mobile 390
// Saves full-page PNGs to ./temporary screenshots/screenshot-N[-label].png (auto-incremented).
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readdirSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const execFileP = promisify(execFile);
const ROOT = dirname(fileURLToPath(import.meta.url));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const url = process.argv[2] || 'http://localhost:3000';
const label = (process.argv[3] || '').replace(/[^a-z0-9_-]/gi, '');
const width = parseInt(process.argv[4] || '1440', 10);
const height = parseInt(process.argv[5] || '900', 10);

const outDir = join(ROOT, 'temporary screenshots');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

let max = 0;
for (const f of readdirSync(outDir)) {
  const m = f.match(/^screenshot-(\d+)/);
  if (m) max = Math.max(max, parseInt(m[1], 10));
}
const n = max + 1;
const out = join(outDir, `screenshot-${n}${label ? '-' + label : ''}.png`);

// --headless=new: the screenshot equals the --window-size. For full-page,
// pass a tall height and load the page with ?still=1 (pins svh heroes to fixed px).
const args = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--default-background-color=00000000',
  `--force-device-scale-factor=1`,
  `--window-size=${width},${height}`,
  '--virtual-time-budget=6000',
  `--screenshot=${out}`,
  url,
];

try {
  await execFileP(CHROME, args, { timeout: 90000 });
} catch (err) {
  if (!existsSync(out)) { console.error('Screenshot failed:', err.message); process.exit(1); }
}
if (existsSync(out)) console.log('Saved: ' + out);
else { console.error('Screenshot produced no file.'); process.exit(1); }
