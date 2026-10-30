'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { create_preview_server, resolve_backend } = require('../../tools/serve.cjs');

/**
 * start_server()
 * --------------
 * Start a test server on a temporary local port and register its cleanup.
 *
 * Parameters:
 * -----------
 * context: TestContext — Current test and teardown registration.
 * server: http.Server — The server to start.
 *
 * Returns:
 * --------
 * Promise<string>
 */
async function start_server(context, server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}

/**
 * fixture_root()
 * --------------
 * Create temporary static files with a private file and a legacy redirect.
 *
 * Parameters:
 * -----------
 * context: TestContext — Current test and teardown registration.
 *
 * Returns:
 * --------
 * string
 */
function fixture_root(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eoha-server-test-'));
  fs.mkdirSync(path.join(root, 'config'));
  fs.writeFileSync(
    path.join(root, 'config/routes.json'),
    JSON.stringify({ '/old.html': '/index.html' }),
  );
  fs.writeFileSync(path.join(root, 'index.html'), '<h1>EOHA test page</h1>');
  fs.writeFileSync(path.join(root, 'style.css'), 'body { color: inherit; }');
  fs.writeFileSync(path.join(root, '.env.local'), 'test-only-private-value');
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('serves static files with correct types and body-free HEAD responses', async (context) => {
  const base = await start_server(context, create_preview_server({ root: fixture_root(context) }));
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.match(await page.text(), /EOHA test page/);
  const head = await fetch(base + '/style.css', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.match(head.headers.get('content-type'), /text\/css/);
  assert.equal(await head.text(), '');
  assert.equal((await fetch(base + '/missing.html')).status, 404);
});
test('legacy redirects retain query strings for GET and HEAD', async (context) => {
  const base = await start_server(context, create_preview_server({ root: fixture_root(context) }));
  for (const method of ['GET', 'HEAD']) {
    const response = await fetch(base + '/old.html?month=2026-01', {
      method,
      redirect: 'manual',
    });
    assert.equal(response.status, 308);
    assert.equal(response.headers.get('location'), '/index.html?month=2026-01');
  }
});
test('forwards API paths and queries, preserves errors, and supports HEAD', async (context) => {
  const requests = [];
  const backend = await start_server(
    context,
    http.createServer((request, response) => {
      requests.push([request.method, request.url, request.headers.authorization]);
      response.writeHead(503, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          success: false,
          data: null,
          message: 'Database unavailable',
        }),
      );
    }),
  );
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), backend }),
  );
  const response = await fetch(base + '/api/environmental-variables?limit=2&offset=1');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).message, 'Database unavailable');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const head = await fetch(base + '/api/health', { method: 'HEAD' });
  assert.equal(head.status, 503);
  assert.equal(await head.text(), '');
  assert.deepEqual(
    requests.map(([method, url]) => [method, url]),
    [
      ['GET', '/api/environmental-variables?limit=2&offset=1'],
      ['HEAD', '/api/health'],
    ],
  );
  assert.ok(requests.every(([, , auth]) => auth === undefined));
});
test('upstream connection failures return JSON 502', async (context) => {
  const base = await start_server(
    context,
    create_preview_server({
      root: fixture_root(context),
      backend: 'http://127.0.0.1:1',
    }),
  );
  const response = await fetch(base + '/api/health');
  assert.equal(response.status, 502);
  assert.equal((await response.json()).success, false);
});
test('stalled upstream connections return JSON 504', async (context) => {
  const backend = await start_server(
    context,
    http.createServer(() => {}),
  );
  const base = await start_server(
    context,
    create_preview_server({
      root: fixture_root(context),
      backend,
      timeout_ms: 30,
    }),
  );
  const response = await fetch(base + '/api/health');
  assert.equal(response.status, 504);
  assert.match((await response.json()).message, /timed out/);
});
test('write methods are rejected locally', async (context) => {
  const base = await start_server(context, create_preview_server({ root: fixture_root(context) }));
  const response = await fetch(base + '/api/regions', { method: 'POST' });
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET, HEAD');
});
test('hidden files, escaping symlinks and malformed paths are blocked', async (context) => {
  const root = fixture_root(context);
  fs.symlinkSync(os.tmpdir(), path.join(root, 'outside'));
  const base = await start_server(context, create_preview_server({ root }));
  for (const pathname of ['/.env.local', '/%2eenv.local', '/outside/']) {
    assert.equal((await fetch(base + pathname)).status, 403);
  }
  assert.equal((await fetch(base + '/%ZZ')).status, 400);
});
test('upstream must be an explicit HTTP(S) origin', () => {
  for (const backend of [
    'file:///etc/passwd',
    'http://user:password@localhost',
    'http://localhost/prefix',
  ]) {
    assert.throws(() => create_preview_server({ backend }), /Backend must/);
  }
});

test('defaults to the hosted Render API without a local backend dependency', () => {
  assert.equal(resolve_backend().origin, 'https://eoha-backend.onrender.com');
  assert.equal(
    resolve_backend({ api_target: 'hosted' }).origin,
    'https://eoha-backend.onrender.com',
  );
});

test('removed local and Auto profiles cannot be selected', () => {
  for (const api_target of ['local', 'auto', 'unknown']) {
    assert.throws(() => resolve_backend({ api_target }), /Only the hosted API/);
  }
});
test('stale browser preferences never change hosted routing or hide failures', async (context) => {
  let calls = 0;
  const backend = await start_server(
    context,
    http.createServer((req, res) => {
      calls++;
      res.writeHead(503);
      res.end('hosted unavailable');
    }),
  );
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), backend }),
  );
  for (const mode of ['local', 'auto', 'https://example.com']) {
    const response = await fetch(base + '/api/regions', {
      headers: { 'X-EOHA-API-Target': mode },
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get('x-eoha-api-source'), 'hosted');
  }
  assert.equal(calls, 3);
  const settings = await (await fetch(base + '/api-settings')).json();
  assert.deepEqual(settings, {
    defaultTarget: 'hosted',
    browserSelectionEnabled: false,
    modes: ['hosted'],
  });
});
test('preserves upstream gzip so large responses are compressed over the wire', async (context) => {
  const { gzipSync } = require('node:zlib');
  const body = JSON.stringify({
    success: true,
    data: ['compressed measurements'],
  });
  let encoding;
  const backend = await start_server(
    context,
    http.createServer((req, res) => {
      encoding = req.headers['accept-encoding'];
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
      });
      res.end(gzipSync(body));
    }),
  );
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), backend }),
  );
  const response = await fetch(base + '/api/malaria-risk-inputs', {
    headers: { 'Accept-Encoding': 'gzip' },
  });
  assert.equal(encoding, 'gzip');
  assert.equal(response.headers.get('content-encoding'), 'gzip');
  assert.equal(await response.text(), body);
});
test('Live Server loopback origins can read the proxy; foreign origins cannot', async (context) => {
  const backend = await start_server(
    context,
    http.createServer((req, res) => res.end('{}')),
  );
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), backend }),
  );
  for (const origin of ['http://127.0.0.1:5500', 'http://localhost:5501']) {
    const response = await fetch(base + '/api/health', {
      headers: { Origin: origin },
    });
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(
      (
        await fetch(base + '/api/health', {
          method: 'OPTIONS',
          headers: { Origin: origin },
        })
      ).status,
      204,
    );
  }
  const response = await fetch(base + '/api/health', {
    headers: { Origin: 'https://example.com' },
  });
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
