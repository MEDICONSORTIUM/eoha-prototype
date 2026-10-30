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

test('local API selection remains explicit and optional', () => {
  assert.equal(resolve_backend({ api_target: 'local' }).origin, 'http://127.0.0.1:8080');
  assert.equal(
    resolve_backend({ api_target: 'hosted', backend: 'https://example.com' }).origin,
    'https://example.com',
  );
});

test('unknown API profiles fail instead of silently selecting another backend', () => {
  assert.throws(() => resolve_backend({ api_target: 'unknown' }), /hosted.*local/);
  assert.throws(
    () =>
      resolve_backend({
        api_target: 'auto',
        api_config: {
          defaultTarget: 'hosted',
          browserSelectionEnabled: false,
          targets: { hosted: 'https://example.com' },
        },
      }),
    /Auto requires/,
  );
});

test('Auto tries hosted before local and reports the source actually used', async (context) => {
  const calls = [];
  const hosted = await start_server(
    context,
    http.createServer((req, res) => {
      calls.push('hosted');
      res.writeHead(503);
      res.end('unavailable');
    }),
  );
  const local = await start_server(
    context,
    http.createServer((req, res) => {
      calls.push('local');
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, data: ['local'] }));
    }),
  );
  const api_config = {
    defaultTarget: 'auto',
    browserSelectionEnabled: true,
    autoOrder: ['hosted', 'local'],
    targets: { hosted, local },
  };
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), api_config }),
  );
  const response = await fetch(base + '/api/regions');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-eoha-api-source'), 'local');
  assert.deepEqual((await response.json()).data, ['local']);
  assert.deepEqual(calls, ['hosted', 'local']);
});

test('Auto keeps hosted success and does not mask missing endpoints', async (context) => {
  let status = 200;
  let localCalls = 0;
  const hosted = await start_server(
    context,
    http.createServer((req, res) => {
      res.writeHead(status);
      res.end('hosted');
    }),
  );
  const local = await start_server(
    context,
    http.createServer((req, res) => {
      localCalls++;
      res.end('local');
    }),
  );
  const api_config = {
    defaultTarget: 'auto',
    browserSelectionEnabled: true,
    targets: { hosted, local },
  };
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), api_config }),
  );
  assert.equal((await fetch(base + '/api/regions')).headers.get('x-eoha-api-source'), 'hosted');
  status = 404;
  assert.equal((await fetch(base + '/api/regions')).status, 404);
  assert.equal(localCalls, 0);
});

test('manual browser modes do not fail over or accept arbitrary URLs', async (context) => {
  const calls = [];
  const hosted = await start_server(
    context,
    http.createServer((req, res) => {
      calls.push('hosted');
      res.writeHead(503);
      res.end('hosted failure');
    }),
  );
  const local = await start_server(
    context,
    http.createServer((req, res) => {
      calls.push('local');
      res.end('local');
    }),
  );
  const api_config = {
    defaultTarget: 'auto',
    browserSelectionEnabled: true,
    targets: { hosted, local },
  };
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), api_config }),
  );
  assert.equal(
    (await fetch(base + '/api/regions', { headers: { 'X-EOHA-API-Target': 'hosted' } })).status,
    503,
  );
  assert.deepEqual(calls, ['hosted']);
  const selected = await fetch(base + '/api/regions', {
    headers: { 'X-EOHA-API-Target': 'local' },
  });
  assert.equal(selected.headers.get('x-eoha-api-source'), 'local');
  assert.equal(
    (
      await fetch(base + '/api/regions', {
        headers: { 'X-EOHA-API-Target': 'https://example.com' },
      })
    ).status,
    400,
  );
});

test('disabling browser selection enforces the configured default despite stale overrides', async (context) => {
  const calls = [];
  const hosted = await start_server(
    context,
    http.createServer((req, res) => {
      calls.push('hosted');
      res.end('hosted');
    }),
  );
  const local = await start_server(
    context,
    http.createServer((req, res) => {
      calls.push('local');
      res.end('local');
    }),
  );
  const api_config = {
    defaultTarget: 'hosted',
    browserSelectionEnabled: false,
    targets: { hosted },
  };
  const base = await start_server(
    context,
    create_preview_server({ root: fixture_root(context), api_config }),
  );
  const settings = await (await fetch(base + '/api-settings')).json();
  assert.equal(settings.browserSelectionEnabled, false);
  const response = await fetch(base + '/api/regions', {
    headers: { 'X-EOHA-API-Target': 'local' },
  });
  assert.equal(response.headers.get('x-eoha-api-source'), 'hosted');
  assert.deepEqual(calls, ['hosted']);
});

test('Auto falls back on connection failure and timeout, with hosted-first order enforced', async (context) => {
  const local = await start_server(
    context,
    http.createServer((req, res) => res.end('local')),
  );
  const stalled = await start_server(
    context,
    http.createServer(() => {}),
  );
  for (const hosted of ['http://127.0.0.1:1', stalled]) {
    const api_config = {
      defaultTarget: 'auto',
      browserSelectionEnabled: true,
      targets: { hosted, local },
    };
    const base = await start_server(
      context,
      create_preview_server({ root: fixture_root(context), api_config, timeout_ms: 30 }),
    );
    const response = await fetch(base + '/api/regions');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-eoha-api-source'), 'local');
  }
  assert.throws(
    () =>
      create_preview_server({
        api_config: {
          defaultTarget: 'auto',
          targets: { hosted: local, local },
          autoOrder: ['local', 'hosted'],
        },
      }),
    /hosted first/,
  );
});
