'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const API_TARGETS = require('../config/api.json');
const { create_api_router, resolve_backend } = require('./api-source.cjs');
const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.pdf': 'application/pdf',
};

/**
 * send_error()
 * ------------
 * Return a small JSON error without revealing local paths or upstream credentials.
 *
 * Parameters:
 * -----------
 * response: http.ServerResponse — The browser response.
 * status: number — HTTP error status.
 * message: string — Public error description.
 * head_only: boolean — Whether to omit the response body.
 *
 * Returns:
 * --------
 * void
 */
function send_error(response, status, message, head_only = false) {
  const body = JSON.stringify({ success: false, data: null, message });
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  response.end(head_only ? undefined : body);
}

/**
 * serve_static_file()
 * -------------------
 * Serve a project file while blocking hidden files, traversal and escaping symlinks.
 * Directories resolve only to index.html; directory listings are not exposed.
 *
 * Parameters:
 * -----------
 * request: http.IncomingMessage — A GET or HEAD request.
 * response: http.ServerResponse — The browser response.
 * root: string — The resolved project directory.
 * pathname: string — A decoded URL path.
 *
 * Returns:
 * --------
 * Promise<void>
 */
async function serve_static_file(request, response, root, pathname) {
  const segments = pathname.split('/');
  if (segments.some((segment) => segment.startsWith('.')) || /[\\\x00-\x1f]/.test(pathname)) {
    send_error(response, 403, 'File access denied', request.method === 'HEAD');
    return;
  }
  try {
    let file = path.resolve(root, '.' + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      send_error(response, 403, 'File access denied', request.method === 'HEAD');
      return;
    }
    let resolved = await fs.promises.realpath(file);
    if (
      (!resolved.startsWith(root + path.sep) && resolved !== root) ||
      path
        .relative(root, resolved)
        .split(path.sep)
        .some((segment) => segment.startsWith('.'))
    ) {
      send_error(response, 403, 'File access denied', request.method === 'HEAD');
      return;
    }
    let stat = await fs.promises.stat(resolved);
    if (stat.isDirectory()) {
      file = path.join(resolved, 'index.html');
      resolved = await fs.promises.realpath(file);
      stat = await fs.promises.stat(resolved);
    }
    if (
      !resolved.startsWith(root + path.sep) ||
      !stat.isFile() ||
      path
        .relative(root, resolved)
        .split(path.sep)
        .some((segment) => segment.startsWith('.'))
    ) {
      send_error(response, 403, 'File access denied', request.method === 'HEAD');
      return;
    }
    response.writeHead(200, {
      'Content-Type': CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    if (request.method === 'HEAD') {
      response.end();
      return;
    }
    pipeline(fs.createReadStream(resolved), response, () => {});
  } catch (error) {
    if (response.headersSent) {
      response.destroy();
      return;
    }
    send_error(
      response,
      error.code === 'EACCES' ? 403 : 404,
      'File not found',
      request.method === 'HEAD',
    );
  }
}

/**
 * create_preview_server()
 * -----------------------
 * Create the JavaScript static server, API proxy and legacy page redirects.
 * The caller starts listening, which allows tests to use temporary ports.
 *
 * Parameters:
 * -----------
 * options: object — Optional root, api_target, backend origin, routes and timeout_ms overrides.
 *
 * Returns:
 * --------
 * http.Server
 */
function create_preview_server(options = {}) {
  const root = fs.realpathSync(options.root || PROJECT_ROOT);
  const api_router = create_api_router(options, send_error);
  const routes =
    options.routes || JSON.parse(fs.readFileSync(path.join(root, 'config/routes.json'), 'utf8'));
  return http.createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      send_error(response, 405, 'Only GET and HEAD requests are supported');
      return;
    }
    let pathname;
    const raw_path = request.url.split('?')[0];
    try {
      pathname = decodeURIComponent(raw_path);
    } catch {
      send_error(response, 400, 'Invalid request path', request.method === 'HEAD');
      return;
    }
    if (!pathname.startsWith('/') || pathname.startsWith('//')) {
      send_error(response, 400, 'Invalid request path', request.method === 'HEAD');
      return;
    }
    if (pathname === '/api-settings') {
      const body = JSON.stringify(api_router.settings);
      response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(request.method === 'HEAD' ? undefined : body);
      return;
    }
    if (Object.hasOwn(routes, pathname)) {
      const query = request.url.includes('?') ? request.url.slice(request.url.indexOf('?')) : '';
      response.writeHead(308, {
        Location: routes[pathname] + query,
        'Content-Length': '0',
      });
      response.end();
      return;
    }
    if (pathname === '/api' || pathname.startsWith('/api/')) {
      api_router.forward(request, response);
      return;
    }
    serve_static_file(request, response, root, pathname);
  });
}

/**
 * main()
 * ------
 * Select the hosted/local API profile, parse overrides and start the Node.js preview server.
 *
 * Parameters:
 * -----------
 * args: Array<string> — Command-line options after the script filename.
 *
 * Returns:
 * --------
 * void
 */
function main(args = process.argv.slice(2)) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'Usage: node tools/serve.cjs [--port 8766] [--api hosted|local|auto] [--backend URL]\nDefault API: ' +
        API_TARGETS.defaultTarget +
        ' (Auto: hosted → local)',
    );
    return;
  }
  let port = 8766,
    api_target = API_TARGETS.defaultTarget,
    backend;
  for (let index = 0; index < args.length; index += 2) {
    if (args[index] === '--port' && args[index + 1]) port = Number(args[index + 1]);
    else if (args[index] === '--api' && args[index + 1]) api_target = args[index + 1];
    else if (args[index] === '--backend' && args[index + 1]) backend = args[index + 1];
    else throw new Error('Unknown or incomplete option. Use --help.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Port must be an integer from 1 to 65535.');
  const selection = { api_target, backend };
  const server = create_preview_server(selection);
  const selected_origin = resolve_backend(selection).origin;
  server.on('error', (error) => {
    console.error('Preview server failed:', error.code || 'configuration error');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () =>
    console.log(`EOHA preview: http://localhost:${port}\nAPI backend: ${selected_origin}`),
  );
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => {
      server.close();
      server.closeAllConnections();
    });
}

module.exports = { create_preview_server, resolve_backend };
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
