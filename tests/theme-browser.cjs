/* Run with a local HTTP server and Playwright installed. Optional env:
   EOHA_URL, BROWSER_EXECUTABLE, EOHA_SCREENSHOTS. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const routes = ['index.html', 'pages/malaria-page.html', 'pages/malaria-forecasting.html',
  'pages/malaria-reports.html', 'pages/resource-center.html', 'pages/ncd-page.html',
  'pages/ncd-resource-center.html', 'pages/contact-page.html'];
(async () => {
  const browser = await chromium.launch({headless: true, ...(process.env.BROWSER_EXECUTABLE ? {executablePath: process.env.BROWSER_EXECUTABLE} : {})});
  const context = await browser.newContext({viewport: {width: 1440, height: 1000}, colorScheme: 'light', reducedMotion: 'reduce'});
  const failures = [];
  const base = process.env.EOHA_URL || 'http://127.0.0.1:8766/';
  const out = process.env.EOHA_SCREENSHOTS;
  if (out) fs.mkdirSync(out, {recursive: true});
  try {
    for (const route of routes) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      try {
        await page.goto(new URL(route, base).href, {waitUntil: 'load'});
        assert.equal(await page.locator('.theme-picker').count(), 1);
        for (const width of [1440, 900, 390]) {
          await page.setViewportSize({width, height: 1000});
          for (const theme of ['light', 'dark']) {
            await page.locator(`[data-theme-choice="${theme}"]`).click();
            assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
            assert.equal(await page.locator(`[data-theme-choice="${theme}"]`).getAttribute('aria-pressed'), 'true');
            const overflow = await page.evaluate(() => ({scroll: document.documentElement.scrollWidth, viewport: innerWidth}));
            assert.ok(overflow.scroll <= overflow.viewport + 1, `${route} ${width} ${theme} overflows: ${JSON.stringify(overflow)}`);
            if (route.includes('forecasting')) {
              assert.equal(await page.evaluate(() => chart.data.datasets[1].borderColor), await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()));
            }
            if (out && (width === 1440 || width === 390 && theme === 'dark')) {
              await page.screenshot({path: path.join(out, `${path.basename(route, '.html')}-${width}-${theme}.png`), fullPage: true, timeout: 15000});
            }
          }
        }
        await page.locator('[data-theme-choice="system"]').click();
        await page.emulateMedia({colorScheme: 'dark'});
        await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
        await page.emulateMedia({colorScheme: 'light'});
        await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
        if (route.includes('resource-center')) {
          await page.locator('[data-category="data"].filter-btn').click();
          assert.ok(await page.locator('.resource-card[data-category="data"]:visible').count() > 0);
          assert.equal(await page.locator('.resource-card:not([data-category="data"]):visible').count(), 0);
        }
        if (route.includes('forecasting')) {
          await page.locator('[data-days="30"]').click();
          assert.equal(await page.evaluate(() => chart.data.labels.length), 30);
          await page.selectOption('#region-select', 'mpumalanga');
          assert.equal(await page.evaluate(() => chart.data.datasets[1].data[0]), await page.evaluate(() => FORECAST_DATA.mpumalanga[30][0]));
        }
        if (route === 'pages/malaria-page.html') {
          assert.equal(await page.locator('#env-temp-val').textContent(), '--');
          await page.locator('#time-slider').fill('6');
          assert.equal(await page.locator('#active-month').textContent(), 'July 2025');
          await page.locator('#play-months').click();
          assert.equal(await page.locator('#play-months').getAttribute('aria-pressed'), 'true');
          await page.locator('#play-months').click();
          await page.locator('#recenter-map').click();
          assert.ok(await page.locator('.leaflet-tile-container img[src*="tile.openstreetmap.org"]').count() > 0);
        }
        if (route === 'pages/ncd-page.html') {
          await page.waitForFunction(() => document.querySelector('#time-slider').max !== '0');
          assert.equal(await page.locator('#risk-text').textContent(), '—');
        }
        if (route === 'pages/malaria-reports.html') {
          await page.waitForFunction(() => !document.querySelector('#next-page').disabled);
          assert.ok(await page.locator('#table-body tr').count() <= 25);
          await page.locator('#next-page').click();
          assert.match(await page.locator('#report-page-summary').textContent(), /Showing 26/);
          await page.locator('#previous-page').click();
          await page.locator('[data-risk="high"]').click();
          assert.equal(await page.locator('#table-body .badge:not(.badge-high)').count(), 0);
          const [download] = await Promise.all([
            page.waitForEvent('download'),
            page.locator('#export-btn-main').click()
          ]);
          const csv = fs.readFileSync(await download.path(), 'utf8');
          assert.equal(csv.split('\n').length - 1, Number(await page.locator('#stat-total').textContent()));
        }
        assert.deepEqual(errors, [], 'JavaScript errors');
        console.log('PASS', route, '(3 widths, 2 themes, system preference, route controls)');
      } catch (error) { failures.push(`${route}: ${error.message}`); console.error('FAIL', route, error.message); }
      await page.close();
    }
    // Preference survives navigation and a full reload.
    const page = await context.newPage();
    await page.goto(new URL('index.html', base).href);
    await page.locator('[data-theme-choice="dark"]').click();
    await page.goto(new URL('pages/resource-center.html', base).href);
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    assert.equal(await page.locator('[data-theme-choice="dark"]').getAttribute('aria-pressed'), 'true');
    console.log('PASS theme preference across navigation and reload');
    const privateContext = await browser.newContext();
    await privateContext.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Blocked', 'SecurityError');}});
    });
    const privatePage = await privateContext.newPage();
    await privatePage.goto(new URL('index.html', base).href);
    await privatePage.locator('[data-theme-choice="dark"]').click();
    assert.equal(await privatePage.locator('html').getAttribute('data-theme'), 'dark');
    console.log('PASS theme controls with unavailable localStorage');
    await privateContext.close();
  } finally { await browser.close(); }
  assert.deepEqual(failures, []);
})().catch(error => {console.error(error); process.exitCode = 1;});
