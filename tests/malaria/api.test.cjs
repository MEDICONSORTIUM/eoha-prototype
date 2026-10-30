const { test } = require('node:test');
const assert = require('node:assert/strict');
const api = require('../../scripts/malaria/api.js');
const config = {
  baseUrl: '/api',
  riskEndpoint: '/malaria-risk-inputs',
  timeoutMs: 1000,
};
const fixture = {
  region_id: 2,
  region_code: '93301001',
  region_name: 'LIM331_1',
  municipality: 'Greater Giyani Local Municipality',
  province: 'Limpopo',
  latitude: -23.37,
  longitude: 30.36,
  observation_month: '2026-01-01',
  lst_c: 25.1,
  soil_moisture: 0.3518,
  ndwi: -0.1342,
  population_density_per_km2: 547.6,
  air_temp_c: 22.58,
  agric_percentage: 0.39,
};
test('maps the real API projection and retains month and ward identifier', () => {
  const { rows, excluded } = api.normalize([fixture]);
  assert.equal(excluded, 0);
  assert.equal(rows[0].Month, 'Jan 2026');
  assert.equal(rows[0].WardID, '93301001');
  assert.equal(api.score(rows[0]), 80);
});
test('missing and nonfinite inputs remain unavailable; zero remains valid', () => {
  for (const value of [null, '', undefined, NaN, Infinity]) {
    assert.equal(api.normalize([{ ...fixture, ndwi: value }]).excluded, 1);
  }
  assert.equal(api.score({}), null);
  assert.equal(api.normalize([{ ...fixture, ndwi: 0 }]).rows.length, 1);
});
test('rejects malformed dates and preserves SQL DATE without timezone shifts', () => {
  assert.equal(api.normalize([{ ...fixture, observation_month: '2026-02-30' }]).rows.length, 0);
  assert.equal(
    api.normalize([{ ...fixture, observation_month: '2026-01-31T22:00:00.000Z' }]).rows.length,
    0,
  );
  assert.equal(
    api.normalize([{ ...fixture, observation_month: '2026-02-01' }]).rows[0].Month,
    'Feb 2026',
  );
});
test('requires municipality metadata and complete record shape', () => {
  assert.equal(api.normalize([{ ...fixture, municipality: null }]).rows.length, 0);
  assert.throws(() => api.normalize({}), /Invalid/);
});
test('scoring thresholds retain the existing formula', () => {
  const row = {
    Soil_Moisture: 0.25,
    LST_Surface_C: 24.9,
    NDWI_Water: -0.1,
    Population_Density_Per_KM2: 300,
  };
  assert.equal(api.score(row), 0);
  assert.equal(api.score({ ...row, Soil_Moisture: 0.35 }), 20);
  assert.equal(
    api.score({
      ...row,
      Soil_Moisture: 0.351,
      LST_Surface_C: 30,
      NDWI_Water: 0,
      Population_Density_Per_KM2: 301,
    }),
    100,
  );
});
test('fetches the joined endpoint and never requests CSV', async () => {
  const urls = [];
  const result = await api.load(config, async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ success: true, data: [fixture] }) };
  });
  assert.deepEqual(urls, ['/api/malaria-risk-inputs']);
  assert.equal(result.rows.length, 1);
});
test('API failure and empty/incomplete datasets are errors without fallback', async () => {
  await assert.rejects(
    api.load(config, async () => ({ ok: false, status: 503 })),
    /503/,
  );
  await assert.rejects(
    api.load(config, async () => ({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })),
    /No complete/,
  );
});
test('escapes database strings before HTML rendering', () => {
  assert.equal(api.escapeHtml('<img src=x>'), '&lt;img src=x&gt;');
});

test('a missing hosted scoring endpoint gives deployment guidance without fallback', async () => {
  let requests = 0;
  await assert.rejects(
    api.load(config, async () => {
      requests++;
      return { ok: false, status: 404 };
    }),
    /Hosted malaria endpoint unavailable/,
  );
  assert.equal(requests, 1);
});

test('successful hosted responses are reused across page loads only within the cache TTL', async (context) => {
  const saved = new Map();
  global.location = {
    href: 'http://127.0.0.1:8766/pages/malaria/dashboard.html',
  };
  global.caches = {
    open: async () => ({
      match: async (key) => saved.get(key)?.clone(),
      put: async (key, response) =>
        saved.set(
          key,
          new Response(await response.arrayBuffer(), {
            headers: response.headers,
          }),
        ),
    }),
  };
  context.after(() => {
    delete global.location;
    delete global.caches;
  });
  let calls = 0;
  const fetcher = async () => {
    calls++;
    return new Response(JSON.stringify({ success: true, data: [fixture] }));
  };
  const cachedConfig = { ...config, cacheTtlMs: 300000 };
  assert.equal((await api.load(cachedConfig, fetcher)).fromCache, false);
  assert.equal((await api.load(cachedConfig, fetcher)).fromCache, true);
  assert.equal(calls, 1);
  const key = [...saved.keys()][0];
  saved.set(
    key,
    new Response(JSON.stringify({ success: true, data: [fixture] }), {
      headers: { 'X-EOHA-Cached-At': String(Date.now() - 240000) },
    }),
  );
  assert.equal((await api.load(cachedConfig, fetcher)).fromCache, true);
  assert.equal(calls, 1, 'four-minute-old data should still be reused');

  saved.set(
    key,
    new Response(JSON.stringify({ success: true, data: [fixture] }), {
      headers: { 'X-EOHA-Cached-At': String(Date.now() - 301000) },
    }),
  );
  assert.equal((await api.load(cachedConfig, fetcher)).fromCache, false);
  assert.equal(calls, 2);
});
test('unavailable browser storage cannot block fresh hosted measurements', async (context) => {
  global.location = { href: 'http://127.0.0.1:8766/' };
  global.caches = {
    open: async () => {
      throw new Error('Storage unavailable');
    },
  };
  context.after(() => {
    delete global.location;
    delete global.caches;
  });
  const result = await api.load(
    { ...config, cacheTtlMs: 300000 },
    async () => new Response(JSON.stringify({ success: true, data: [fixture] })),
  );
  assert.equal(result.rows.length, 1);
  assert.equal(result.fromCache, false);
});
