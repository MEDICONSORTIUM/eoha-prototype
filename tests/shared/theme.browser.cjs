/* Run against tools/serve.py with Playwright available. */
const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const base = process.env.EOHA_URL || "http://127.0.0.1:8766/";
const routes = [
  "index.html",
  "pages/malaria/dashboard.html",
  "pages/malaria/reports.html",
  "pages/malaria/forecasting.html",
  "pages/malaria/resources.html",
  "pages/ncd/dashboard.html",
  "pages/ncd/reports.html",
  "pages/ncd/forecasting.html",
  "pages/ncd/resources.html",
  "pages/contact/index.html",
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.BROWSER_EXECUTABLE
      ? { executablePath: process.env.BROWSER_EXECUTABLE }
      : {}),
  });
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    // API functionality is covered separately; keep layout checks independent of RDS.
    await context.route("**/api/malaria-risk-inputs", (route) =>
      route.fulfill({ json: { success: true, data: [], message: null } }),
    );
    for (const route of routes) {
      const page = await context.newPage();
      const errors = [],
        failedAssets = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("response", (response) => {
        if (response.url().startsWith(base) && response.status() >= 400)
          failedAssets.push(response.url());
      });
      await page.goto(new URL(route, base).href);
      assert.equal(await page.locator(".theme-picker").count(), 1);
      for (const width of [1440, 900, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const theme of ["light", "dark"]) {
          await page.locator(`[data-theme-choice="${theme}"]`).click();
          assert.equal(
            await page.locator("html").getAttribute("data-theme"),
            theme,
          );
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
            `${route}: overflow at ${width}`,
          );
        }
      }
      await page.locator('[data-theme-choice="system"]').click();
      await page.emulateMedia({ colorScheme: "dark" });
      await page.waitForFunction(
        () => document.documentElement.dataset.theme === "dark",
      );
      if (route.endsWith("/resources.html")) {
        await page.click('[data-category="data"].filter-btn');
        assert.ok(
          (await page
            .locator('.resource-card[data-category="data"]:visible')
            .count()) > 0,
        );
        assert.equal(
          await page
            .locator('.resource-card:not([data-category="data"]):visible')
            .count(),
          0,
        );
      }
      if (
        route.endsWith("/forecasting.html") ||
        route === "pages/ncd/reports.html"
      ) {
        assert.match(
          await page.locator('main [role="status"]').textContent(),
          /backend does not expose/i,
        );
        assert.equal(await page.locator("canvas").count(), 0);
      }
      if (route === "pages/ncd/dashboard.html") {
        await page.waitForFunction(
          () => !document.getElementById("month-select").disabled,
        );
        assert.equal(await page.locator("#data-source").count(), 0);
        assert.equal(await page.locator("#risk-text").textContent(), "—");
      }
      assert.deepEqual(errors, [], `${route}: JavaScript errors`);
      assert.deepEqual(failedAssets, [], `${route}: failed local assets`);
      await page.close();
      console.log(
        "PASS",
        route,
        "(3 widths, 2 themes, local assets and page behavior)",
      );
    }
    for (const [old, destination] of Object.entries(
      require("../../config/routes.json"),
    )) {
      const response = await context.request.get(new URL(old, base).href, {
        maxRedirects: 0,
      });
      assert.equal(response.status(), 308);
      assert.equal(response.headers().location, destination);
    }
    const page = await context.newPage();
    await page.goto(base);
    await page.click('[data-theme-choice="dark"]');
    await page.goto(new URL("pages/malaria/resources.html", base).href);
    await page.reload();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    const privateContext = await browser.newContext();
    await privateContext.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Blocked", "SecurityError");
        },
      });
    });
    const privatePage = await privateContext.newPage();
    await privatePage.goto(base);
    await privatePage.click('[data-theme-choice="dark"]');
    assert.equal(
      await privatePage.locator("html").getAttribute("data-theme"),
      "dark",
    );
    await privateContext.close();
    console.log("PASS legacy redirects, theme persistence and blocked storage");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
