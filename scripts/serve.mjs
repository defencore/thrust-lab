import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const production = process.argv.includes('--production');
const root = resolve(production ? 'dist' : '.');
const port = Number(process.env.PORT || (production ? 8081 : 8080));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.csv': 'text/csv' };
http.createServer(async (request, response) => {
  try {
    const urlPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let path = resolve(root, `.${urlPath === '/' ? '/index.html' : urlPath}`);
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Invalid path');
    if (!production && urlPath === '/favicon.svg') path = resolve('public/favicon.svg');
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    response.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache' });
    response.end(await readFile(path));
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.end('File not found');
  }
}).listen(port, '0.0.0.0', () => console.log(`Thrust Lab Studio: http://localhost:${port}`));
