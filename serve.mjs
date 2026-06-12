// Minimal static file server for the Blue Orchid Beach Krabi site.
// Serves the project root at http://localhost:3000  (run: node serve.mjs)
import http from 'http';
import { readFile } from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { extname, join, normalize, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const handler = async (req, res) => {
  try {
    const { pathname } = new URL(req.url, `http://localhost:${PORT}`);
    let urlPath = decodeURIComponent(pathname);
    if (urlPath === '/') urlPath = '/index.html';

    const safePath = normalize(join(ROOT, urlPath));
    if (!safePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('Forbidden'); return;
    }

    let filePath = safePath;
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = join(filePath, 'index.html');
    }
    if (!existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<h1>404 — Not Found</h1>');
      return;
    }

    const data = await readFile(filePath);
    const type = MIME[extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(data);
  } catch (err) {
    res.writeHead(500); res.end('Server error: ' + err.message);
  }
};

// Listen on PORT; if it's busy, walk up to the next free port automatically.
function listen(port, attemptsLeft) {
  const server = http.createServer(handler);
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
      console.log(`Port ${port} in use — trying ${port + 1}…`);
      listen(port + 1, attemptsLeft - 1);
    } else {
      console.error(err.message); process.exit(1);
    }
  });
  server.listen(port, () => {
    console.log(`Blue Orchid Beach — serving ${ROOT}`);
    console.log(`→ http://localhost:${port}`);
  });
}
listen(PORT, 10);
