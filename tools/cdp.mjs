// Shared by verify.mjs and frames.mjs: launches the system Chrome headless and speaks the
// DevTools protocol over Node 26's global WebSocket — the same pattern as
// Portfolio/tools/cdp.mjs, so this folder needs no npm packages either.
import { spawn } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function client(socket) {
  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();

  socket.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id) {
      const slot = pending.get(msg.id);
      if (!slot) return;
      pending.delete(msg.id);
      if (msg.error) slot.reject(new Error(msg.error.message));
      else slot.resolve(msg.result);
      return;
    }
    const fns = listeners.get(msg.method);
    if (fns) for (const fn of [...fns]) fn(msg.params);
  };

  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event).delete(fn);
    },
    once(event) {
      return new Promise((resolve) => {
        const off = this.on(event, (params) => { off(); resolve(params); });
      });
    },
  };
}

async function connect(port) {
  // Page.* only exists on a page-level target, not the browser socket.
  const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const page = list.find((t) => t.type === 'page');
  if (!page) throw new Error(`no page target on port ${port}`);
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error(`cannot reach Chrome on port ${port}`));
  });
  return client(ws);
}

// A throwaway profile keeps sessionStorage fresh (the intro keys off it) and stops
// Chrome handing the launch to an already-running desktop instance.
export async function launch({ width = 1440, height = 900 } = {}) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), 'bob-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--no-default-browser-check', '--force-device-scale-factor=1',
    `--window-size=${width},${height}`, `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  proc.on('error', (e) => { console.error(`chrome failed to start: ${e.message}`); process.exit(1); });

  let cdp = null;
  for (let i = 0; i < 80 && !cdp; i++) {
    try { cdp = await connect(port); } catch { await sleep(200); }
  }
  const close = () => {
    try { proc.kill(); } catch {}
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  };
  if (!cdp) { close(); throw new Error('Chrome never opened its debugging port'); }
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  return { cdp, close, ...helpers(cdp) };
}

export function helpers(cdp) {
  return {
    async size(width, height) {
      await cdp.send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: 1, mobile: width < 768,
      });
    },
    async goto(url, wait = 0) {
      const loaded = cdp.once('Page.loadEventFired');
      await cdp.send('Page.navigate', { url });
      await Promise.race([loaded, sleep(20000)]);
      if (wait) await sleep(wait);
    },
    async evaluate(expression) {
      const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) {
        throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      }
      return r.result.value;
    },
    async key(key, code, keyCode) {
      for (const type of ['keyDown', 'keyUp']) {
        await cdp.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: keyCode });
      }
    },
  };
}
