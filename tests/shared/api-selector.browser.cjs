const assert = require('node:assert/strict');
const http = require('node:http');
const { chromium } = require('playwright');
const { create_preview_server } = require('../../tools/serve.cjs');

/**
 * listen()
 * --------
 * Start an isolated test server on a temporary local port.
 *
 * Parameters:
 * -----------
 * server: http.Server — Static preview or fixture backend.
 *
 * Returns:
 * --------
 * Promise<string>
 */
async function listen(server) {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return 'http://127.0.0.1:' + server.address().port;
}

(async () => {
  const servers = [];
  let browser;
  let hostedStatus = 200;
  const calls = [];
  try {
    const fixture = (name) => (request, response) => {
      calls.push(name);
      response.setHeader('Content-Type', 'application/json');
      if (name === 'hosted' && hostedStatus !== 200) {
        response.writeHead(hostedStatus);
        response.end(JSON.stringify({ success: false, data: null }));
        return;
      }
      response.end(
        JSON.stringify({
          success: true,
          data: [
            {
              region_id: 1,
              region_name: name + ' ward',
              municipality: 'Test Municipality',
              province: 'Limpopo',
              observation_month: '2026-01-01',
              latitude: -23,
              longitude: 29,
              lst_c: 27,
              soil_moisture: 0.4,
              ndwi: 0,
              population_density_per_km2: 400,
            },
          ],
        }),
      );
    };
    const hostedServer = http.createServer(fixture('hosted'));
    servers.push(hostedServer);
    const hosted = await listen(hostedServer);
    const localServer = http.createServer(fixture('local'));
    servers.push(localServer);
    const local = await listen(localServer);
    const config = {
      defaultTarget: 'auto',
      browserSelectionEnabled: true,
      targets: { hosted, local },
    };
    const proxy = create_preview_server({ api_config: config });
    servers.push(proxy);
    const base = await listen(proxy);
    browser = await chromium.launch({
      headless: true,
      ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
    });
    const context = await browser.newContext({ viewport: { width: 390, height: 1000 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const route = '/pages/malaria/reports.html';
    await page.goto(base + route);
    await page.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
    assert.equal(await page.locator('[data-api-choice]').inputValue(), 'auto');
    assert.match(await page.locator('[data-api-active]').textContent(), /Hosted API/);
    assert.match(await page.locator('#table-body').textContent(), /hosted ward/);
    await Promise.all([
      page.waitForURL('**?api=local'),
      page.selectOption('[data-api-choice]', 'local'),
    ]);
    await page.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
    assert.match(await page.locator('[data-api-active]').textContent(), /Local API/);
    assert.match(await page.locator('#table-body').textContent(), /local ward/);
    assert.doesNotMatch(await page.locator('#table-body').textContent(), /hosted ward/);
    await page.goto(base + route);
    await page.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
    assert.equal(await page.locator('[data-api-choice]').inputValue(), 'local');
    hostedStatus = 503;
    calls.length = 0;
    await Promise.all([
      page.waitForURL('**?api=auto'),
      page.selectOption('[data-api-choice]', 'auto'),
    ]);
    await page.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
    assert.deepEqual(calls, ['hosted', 'local']);
    assert.match(await page.locator('[data-api-active]').textContent(), /Local API/);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    hostedStatus = 200;
    const disabledProxy = create_preview_server({
      api_config: {
        ...config,
        defaultTarget: 'hosted',
        browserSelectionEnabled: false,
        targets: { hosted },
      },
    });
    servers.push(disabledProxy);
    const disabled = await listen(disabledProxy);
    await context.addInitScript(() => localStorage.setItem('eoha-api-target', 'local'));
    await page.goto(disabled + route + '?api=local');
    await page.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
    assert.equal(await page.locator('[data-api-selector]').isVisible(), false);
    assert.match(await page.locator('#table-body').textContent(), /hosted ward/);
    // Simulate deleting the optional selector script entirely.
    await page.route('**/scripts/shared/api-selector.js', (route) =>
      route.fulfill({ contentType: 'text/javascript', body: '' }),
    );
    await page.reload();
    await page.locator('#api-status').filter({ hasText: 'API connected' }).waitFor();
    assert.match(await page.locator('#table-body').textContent(), /hosted ward/);
    assert.equal(await page.evaluate(() => typeof window.EOHA_API_SOURCE), 'undefined');
    assert.deepEqual(errors, []);
    console.log(
      'PASS browser selection, source labels, hosted-first Auto, reload/persistence, disabled stale choices and selector removal.',
    );
  } finally {
    if (browser) await browser.close();
    for (const server of servers.reverse()) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
