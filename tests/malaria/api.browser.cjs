const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.EOHA_URL || 'http://127.0.0.1:8766/';
const regions = Array.from({ length: 30 }, (_, i) => ({
  region_id: i + 1,
  region_name: `Ward ${i + 1}`,
  municipality_name: 'API Municipality',
  province_name: 'Limpopo',
  latitude: -23 + i / 100,
  longitude: 29,
  population_density_per_km2: 400,
}));
const inputs = regions.flatMap((region) =>
  ['2026-02-01', '2026-03-01'].map((date) => ({
    ...region,
    municipality: region.municipality_name,
    province: region.province_name,
    observation_month: date,
    lst_c: 27,
    soil_moisture: 0.4,
    ndwi: 0,
  })),
);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 } });
      const csvRequests = [],
        errors = [];
      context.on('request', (request) => {
        if (request.url().endsWith('.csv')) csvRequests.push(request.url());
      });
      context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
      await context.route('**/api/**', (route) => {
        return route.fulfill({ json: { success: true, data: inputs, message: null } });
      });
      const dashboard = await context.newPage();
      await dashboard.goto(new URL('pages/malaria/dashboard.html', base).href);
      await dashboard.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
      assert.equal(await dashboard.locator('#active-month').textContent(), 'March 2026');
      await dashboard.selectOption('#country-select', 'South Africa');
      await dashboard.selectOption('#province-select', 'API Municipality');
      await dashboard.selectOption('#city-select', '0');
      await dashboard.click('#apply-btn');
      assert.match(await dashboard.locator('#risk-percentage').innerText(), /100%/);
      await dashboard.locator('#time-slider').fill('0');
      assert.equal(await dashboard.locator('#active-month').textContent(), 'February 2026');
      const reports = await context.newPage();
      await reports.goto(new URL('pages/malaria/reports.html', base).href);
      await reports.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
      assert.equal(await reports.locator('#stat-total').textContent(), '30');
      assert.equal(await reports.locator('#table-body tr').count(), 25);
      await reports.click('#next-page');
      assert.equal(await reports.locator('#table-body tr').count(), 5);
      const download = reports.waitForEvent('download');
      await reports.click('#export-btn-main');
      assert.equal((await download).suggestedFilename(), 'malaria_risk_report.csv');
      assert.deepEqual(csvRequests, []);
      assert.deepEqual(errors, []);
      await context.close();
    }
    // Verify the unavailable state independently of local database readiness.
    const page = await browser.newPage();
    await page.route('**/api/**', (route) =>
      route.fulfill({
        status: 503,
        json: { success: false, data: null, message: 'Database unavailable' },
      }),
    );
    for (const route of ['malaria/dashboard.html', 'malaria/reports.html']) {
      await page.goto(new URL(`pages/${route}`, base).href);
      await page.locator('#api-status[role="alert"]').waitFor();
      assert.match(await page.locator('#api-status').textContent(), /Risk data unavailable/);
    }
    console.log(
      'API browser checks passed: desktop/mobile dashboard, timeline, reports, pagination, export, no CSV reads, backend failure state.',
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
