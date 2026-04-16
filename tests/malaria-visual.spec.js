// @ts-check
import { test, expect } from '@playwright/test';
import { setupMalariaPage, drillToWard } from './helpers/malaria.js';

// ---------------------------------------------------------------------------
// VISUAL REGRESSION TESTS
//
// First run: Playwright creates baseline snapshots in tests/__snapshots__/.
// Subsequent runs: diffs against those baselines.
//
// To update baselines after intentional UI changes:
//   npx playwright test malaria-visual --update-snapshots
//
// These tests run on Chromium only (consistent rendering engine) to avoid
// cross-browser font/antialiasing noise. Add other projects if you need them.
//
// Element-scoped screenshots are preferred over full-page captures —
// they are more stable (immune to layout shifts in unrelated regions)
// and produce smaller, more focused diffs.
// ---------------------------------------------------------------------------

test.use({
    // Pin viewport for reproducible screenshots across machines
    viewport: { width: 1440, height: 900 },
});

// ============================================================================
// LAYOUT SECTIONS — DEFAULT STATE
// ============================================================================
test.describe(`Visual - Default State`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
        // Let any CSS transitions settle
        await page.waitForTimeout(500);
    });

    test('top bar matches baseline', async ({ page }) => {
        await expect(page.locator('.top-bar')).toHaveScreenshot('topbar-default.png', {
            animations: 'disabled',
        });
    });

    test('region selector card matches baseline', async ({ page }) => {
        await expect(page.locator('.region-selector')).toHaveScreenshot('region-selector-default.png', {
            animations: 'disabled',
        });
    });

    test('environmental factors card matches baseline', async ({ page }) => {
        await expect(page.locator('.enviro-factors')).toHaveScreenshot('env-factors-default.png', {
            animations: 'disabled',
        });
    });

    test('ward risk donut card matches baseline', async ({ page }) => {
        await expect(page.locator('.risk-card').first()).toHaveScreenshot('ward-risk-default.png', {
            animations: 'disabled',
        });
    });

    test('municipality average donut card matches baseline', async ({ page }) => {
        await expect(page.locator('#avg-risk-container')).toHaveScreenshot('avg-risk-default.png', {
            animations: 'disabled',
        });
    });

    test('map legend card matches baseline', async ({ page }) => {
        await expect(page.locator('.map-legend')).toHaveScreenshot('map-legend-default.png', {
            animations: 'disabled',
        });
    });

    test('bottom timeline panel matches baseline', async ({ page }) => {
        await expect(page.locator('.bottom-panel')).toHaveScreenshot('bottom-panel-default.png', {
            animations: 'disabled',
        });
    });
});

// ============================================================================
// RISK PANELS — AFTER WARD SELECTION
// ============================================================================
test.describe(`Visual - High Risk Ward Selected`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
        await drillToWard(page, { wardIndex: '0' }); // Ward 1 Tzaneen → 100% risk
        await page.locator('#apply-btn').click();
        // Wait for donut animation (transition: stroke-dashoffset 1s ease-out)
        await page.waitForTimeout(1_200);
    });

    test('ward risk donut shows High state', async ({ page }) => {
        await expect(page.locator('.risk-card').first()).toHaveScreenshot('ward-risk-high.png', {
            animations: 'disabled',
        });
    });

    test('environmental factors card shows High ward values', async ({ page }) => {
        await expect(page.locator('.enviro-factors')).toHaveScreenshot('env-factors-high.png', {
            animations: 'disabled',
        });
    });

    test('municipality average donut is active', async ({ page }) => {
        await expect(page.locator('#avg-risk-container')).toHaveScreenshot('avg-risk-active.png', {
            animations: 'disabled',
        });
    });

    test('region selector card shows populated dropdowns', async ({ page }) => {
        await expect(page.locator('.region-selector')).toHaveScreenshot('region-selector-selected.png', {
            animations: 'disabled',
        });
    });
});

test.describe(`Visual - Low Risk Ward Selected`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
        await drillToWard(page, { wardIndex: '2' }); // Ward 3 Tzaneen → 0% risk
        await page.locator('#apply-btn').click();
        await page.waitForTimeout(1_200);
    });

    test('ward risk donut shows Low state', async ({ page }) => {
        await expect(page.locator('.risk-card').first()).toHaveScreenshot('ward-risk-low.png', {
            animations: 'disabled',
        });
    });
});

// ============================================================================
// SLIDER INTERACTION
// ============================================================================
test.describe(`Visual - Slider At Feb 2025`, () => {
    test('bottom panel shows slider at position 1', async ({ page }) => {
        await setupMalariaPage(page);
        await page.locator('#time-slider').evaluate(el => {
            el.value = '1';
            el.dispatchEvent(new Event('input'));
        });
        await page.waitForTimeout(300);

        await expect(page.locator('.bottom-panel')).toHaveScreenshot('bottom-panel-feb2025.png', {
            animations: 'disabled',
        });
    });
});

// ============================================================================
// MOBILE ORIENTATION LOCK
// ============================================================================
test.describe(`Visual - Mobile Portrait`, () => {
    test('orientation lock overlay renders correctly on 390px viewport', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
        });
        const page = await context.newPage();
        await setupMalariaPage(page);
        await page.waitForTimeout(300);

        await expect(page.locator('#orientation-lock')).toHaveScreenshot('orientation-lock-mobile.png', {
            animations: 'disabled',
        });

        await context.close();
    });
});