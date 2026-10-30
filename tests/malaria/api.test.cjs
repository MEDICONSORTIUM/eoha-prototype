const { test } = require('node:test');
const assert = require('node:assert/strict');
const api = require('../../scripts/malaria/api.js');
const config = { baseUrl: '/api', riskEndpoint: '/malaria-risk-inputs', timeoutMs: 1000 };
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
    api.load(config, async () => ({ ok: true, json: async () => ({ success: true, data: [] }) })),
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
    /Deploy \/api\/malaria-risk-inputs/,
  );
  assert.equal(requests, 1);
});
