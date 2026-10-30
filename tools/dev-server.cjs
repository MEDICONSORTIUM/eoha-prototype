const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT) || 5500;
const backend = new URL(process.env.EOHA_API_URL || 'http://127.0.0.1:8080');

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4'
};

function proxy(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end();
    return;
  }
  const upstream = http.request({
    hostname: backend.hostname,
    port: backend.port,
    path: url.pathname + url.search,
    method: req.method,
    headers: { accept: 'application/json' }
  }, response => {
    res.writeHead(response.statusCode, { 'content-type': response.headers['content-type'] || 'application/json' });
    response.pipe(res);
  });
  upstream.on('error', () => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ success: false, data: null, message: 'EOHA backend unreachable' }));
  });
  upstream.end();
}

function serveFile(res, url) {
  let file = path.join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (url.pathname.endsWith('/')) file = path.join(file, 'index.html');
  fs.readFile(file, (error, content) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': types[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(content);
  });
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) proxy(req, res, url);
  else serveFile(res, url);
}).listen(port, () => console.log('EOHA prototype on http://localhost:' + port + '  (API proxied to ' + backend.origin + ')'));
