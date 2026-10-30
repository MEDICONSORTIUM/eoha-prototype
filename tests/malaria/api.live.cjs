const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.EOHA_URL || 'http://127.0.0.1:8766/';
(async () => {
  const health = await fetch(new URL('api/health/database', base));
  assert.equal(health.status, 200);
  assert.equal((await health.json()).data.ready, true);
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const csv = [],
      errors = [];
    context.on('request', (r) => {
      if (r.url().endsWith('.csv')) csv.push(r.url());
    });
    context.on('page', (p) => p.on('pageerror', (e) => errors.push(e.message)));
    const page = await context.newPage();
    await page.goto(new URL('pages/malaria/dashboard.html', base).href);
    await page
      .locator('#api-status')
      .filter({ hasText: 'API connected' })
      .waitFor({ timeout: 90000 });
    const data = await page.evaluate(() => ({
      total: all_risk_data.length,
      latest: MONTH_DATA.at(-1).id,
      months: MONTH_DATA.length,
      ward: all_risk_data.find((r) => r.Month === MONTH_DATA.at(-1).id),
    }));
    assert.ok(data.total > 40000);
    assert.equal(data.months, 10);
    await page.selectOption('#country-select', 'South Africa');
    await page.selectOption('#province-select', data.ward.Municipali);
    await page.selectOption('#city-select', '0');
    await page.click('#apply-btn');
    const expected = await page.evaluate(() =>
      EOHAMalariaAPI.score(get_current_municipality_wards()[0]),
    );
    assert.match(await page.locator('#risk-percentage').innerText(), new RegExp(`${expected}%`));
    await page.locator('#time-slider').fill('0');
    assert.equal(await page.locator('#active-month').textContent(), 'January 2026');
    const reports = await context.newPage();
    await reports.goto(new URL('pages/malaria/reports.html', base).href);
    await reports
      .locator('#api-status')
      .filter({ hasText: 'API connected' })
      .waitFor({ timeout: 90000 });
    assert.ok(Number(await reports.locator('#stat-total').textContent()) > 4000);
    assert.equal(await reports.locator('#table-body tr').count(), 25);
    await reports.selectOption('#month-filter', 'all');
    assert.equal(Number(await reports.locator('#stat-total').textContent()), data.total);
    assert.deepEqual(csv, []);
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify({
        databaseReady: true,
        scoredWardMonths: data.total,
        months: data.months,
        latest: data.latest,
        selectedWardRisk: expected,
        csvRequests: csv.length,
        pageErrors: errors,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
