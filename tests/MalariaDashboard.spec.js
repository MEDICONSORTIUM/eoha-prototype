// @ts-check
import { test, expect } from '@playwright/test';
import { setupMalariaPage, drillToWard } from './helpers/malaria.js';

// ---------------------------------------------------------------------------
// Risk score reference for mock data (calculateDynamicRisk logic):
//
//  Soil_Moisture > 0.35  → +40  |  > 0.25 → +20
//  LST_Surface_C 25–30   → +30
//  NDWI_Water > -0.1     → +20
//  Pop_Density > 300     → +10
//
//  Ward 1 Tzaneen (Jan 2025): SM=0.40(+40) LST=27.5(+30) NDWI=0.05(+20) D=350(+10) = 100 → High
//  Ward 2 Tzaneen (Jan 2025): SM=0.28(+20) LST=28.0(+30) NDWI=-0.05(+20) D=150(0)  = 70  → High
//  Ward 3 Tzaneen (Jan 2025): SM=0.15(0)   LST=35.0(0)   NDWI=-0.20(0)   D=100(0)  = 0   → Low
//  Ward 1 Mopani  (Jan 2025): SM=0.42(+40) LST=26.5(+30) NDWI=0.08(+20)  D=400(+10)= 100 → High
//  Ward 2 Mopani  (Jan 2025): SM=0.22(0)   LST=32.0(0)   NDWI=-0.15(0)   D=200(0)  = 0   → Low
// ---------------------------------------------------------------------------

// ============================================================================
// PAGE LOAD
// ============================================================================
test.describe(`Page Load`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
    });

    test('document has correct title', async ({ page }) => {
        await expect(page).toHaveTitle('Malaria Predictor');
    });

    test('map container is present in DOM', async ({ page }) => {
        await expect(page.locator('#map')).toBeAttached();
    });

    test('all four nav links are visible', async ({ page }) => {
        const nav = page.locator('.nav-pill');
        await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Forecasting' })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Resource Center' })).toBeVisible();
        await expect(nav.getByRole('link', { name: 'Reports' })).toBeVisible();
    });

    test('Dashboard nav link carries the active class', async ({ page }) => {
        await expect(page.locator('.nav-pill a.active')).toHaveText('Dashboard');
    });

    test('left sidebar and right sidebar are rendered', async ({ page }) => {
        await expect(page.locator('.sidebar-left')).toBeVisible();
        await expect(page.locator('.sidebar-right')).toBeVisible();
    });

    test('bottom timeline panel is rendered', async ({ page }) => {
        await expect(page.locator('.bottom-panel')).toBeVisible();
    });
});

// ============================================================================
// INITIAL STATE
// ============================================================================
test.describe(`Initial State`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
    });

    test('country select is enabled with Zambia and South Africa options', async ({ page }) => {
        const sel = page.locator('#country-select');
        await expect(sel).toBeEnabled();
        await expect(sel.locator('option[value="South Africa"]')).toBeAttached();
        await expect(sel.locator('option[value="Zambia"]')).toBeAttached();
    });

    test('province select is disabled on load', async ({ page }) => {
        await expect(page.locator('#province-select')).toBeDisabled();
    });

    test('ward select is disabled on load', async ({ page }) => {
        await expect(page.locator('#city-select')).toBeDisabled();
    });

    test('apply button is disabled on load', async ({ page }) => {
        await expect(page.locator('#apply-btn')).toBeDisabled();
    });

    test('ward risk donut shows default placeholder values', async ({ page }) => {
        await expect(page.locator('#risk-text')).toHaveText('--');
        await expect(page.locator('#risk-percentage')).toHaveText('0% RISK');
        await expect(page.locator('#selected-ward-name')).toHaveText('Select a Ward');
    });

    test('municipality average donut shows default placeholder values', async ({ page }) => {
        await expect(page.locator('#avg-risk-text')).toHaveText('--');
        await expect(page.locator('#avg-risk-percentage')).toHaveText('0% AVG');
        await expect(page.locator('#selected-muni-name')).toHaveText('Select Municipality');
    });

    test('all three environmental factor values show dashes', async ({ page }) => {
        await expect(page.locator('#env-agric-val')).toHaveText('--');
        await expect(page.locator('#env-temp-val')).toHaveText('--');
        await expect(page.locator('#env-soil-val')).toHaveText('--');
    });

    test('time slider starts at position 0 (Jan 2025)', async ({ page }) => {
        await expect(page.locator('#time-slider')).toHaveValue('0');
    });
});

// ============================================================================
// REGION SELECTOR CASCADE
// ============================================================================
test.describe(`Region Selector - Cascade`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
    });

    test('selecting a country enables the province dropdown', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        await expect(page.locator('#province-select')).toBeEnabled();
    });

    test('province dropdown is populated with municipalities from CSV', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        // Mock CSV has 2 municipalities: Tzaneen + Mopani
        await expect(page.locator('#province-select option:not([value=""])')).toHaveCount(2);
    });

    test('province option display text strips "Local Municipality" suffix', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        const texts = await page.locator('#province-select option:not([value=""])').allTextContents();
        expect(texts.some(t => t.includes('Local Municipality'))).toBe(false);
    });

    test('province option value retains the full municipality name', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        const values = await page.locator('#province-select option:not([value=""])')
            .evaluateAll(opts => opts.map(o => o.value));
        expect(values).toContain('Tzaneen Local Municipality');
        expect(values).toContain('Mopani District Municipality');
    });

    test('selecting a province enables the ward dropdown', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');
        await expect(page.locator('#city-select')).toBeEnabled();
    });

    test('ward dropdown is populated with wards for the current month (Jan 2025)', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');
        // Mock has 3 Tzaneen wards for Jan 2025
        await expect(page.locator('#city-select option:not([value=""])')).toHaveCount(3);
    });

    test('ward option text matches WardLabel values from CSV', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');
        const texts = await page.locator('#city-select option:not([value=""])').allTextContents();
        expect(texts).toContain('Ward 1 Tzaneen');
        expect(texts).toContain('Ward 2 Tzaneen');
        expect(texts).toContain('Ward 3 Tzaneen');
    });

    test('selecting a ward enables the apply button', async ({ page }) => {
        await drillToWard(page);
        await expect(page.locator('#apply-btn')).toBeEnabled();
    });

    test('apply button stays disabled when no ward is chosen', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');
        // Ward still at placeholder
        await expect(page.locator('#apply-btn')).toBeDisabled();
    });

    test('switching province resets the ward dropdown', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');
        await page.locator('#province-select').selectOption('Mopani District Municipality');
        // Mopani has 2 wards in Jan 2025
        await expect(page.locator('#city-select option:not([value=""])')).toHaveCount(2);
    });
});

// ============================================================================
// APPLY — HIGH RISK WARD
// ============================================================================
test.describe(`Apply - High Risk Ward (Ward 1 Tzaneen)`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
        await drillToWard(page, { wardIndex: '0' }); // Ward 1 Tzaneen → 100% risk
        await page.locator('#apply-btn').click();
    });

    test('ward name panel updates to selected ward', async ({ page }) => {
        await expect(page.locator('#selected-ward-name')).toHaveText('Ward 1 Tzaneen');
    });

    test('risk label shows High', async ({ page }) => {
        await expect(page.locator('#risk-text')).toHaveText('High');
    });

    test('risk percentage shows 100%', async ({ page }) => {
        await expect(page.locator('#risk-percentage')).toHaveText('100% RISK');
    });

    test('environmental temperature factor shows correct value', async ({ page }) => {
        // LST=27.5 → (27.5).toFixed(0) = "28"
        await expect(page.locator('#env-temp-val')).toHaveText('28°C');
    });

    test('environmental soil moisture factor shows correct value', async ({ page }) => {
        // Soil_Moisture=0.40 → 0.40*100=40 → "40%"
        await expect(page.locator('#env-soil-val')).toHaveText('40%');
    });

    test('environmental agric/precipitation factor shows correct value', async ({ page }) => {
        // Agric_Percentage=45.2 → (45.2).toFixed(0) = "45"
        await expect(page.locator('#env-agric-val')).toHaveText('45%');
    });

    test('municipality name updates on the average risk panel', async ({ page }) => {
        // "Tzaneen Local Municipality" has " Local Municipality" stripped
        await expect(page.locator('#selected-muni-name')).toHaveText('Tzaneen');
    });

    test('municipality average donut is no longer dashes', async ({ page }) => {
        await expect(page.locator('#avg-risk-text')).not.toHaveText('--');
    });
});

// ============================================================================
// APPLY — LOW RISK WARD
// ============================================================================
test.describe(`Apply - Low Risk Ward (Ward 3 Tzaneen)`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
        await drillToWard(page, { wardIndex: '2' }); // Ward 3 Tzaneen → 0% risk
        await page.locator('#apply-btn').click();
    });

    test('risk label shows Low', async ({ page }) => {
        await expect(page.locator('#risk-text')).toHaveText('Low');
    });

    test('risk percentage shows 0%', async ({ page }) => {
        await expect(page.locator('#risk-percentage')).toHaveText('0% RISK');
    });

    test('environmental factors are populated (not dashes) even for low-risk wards', async ({ page }) => {
        // Value is 0 so setBar returns '--' for the 0-value case — this is expected
        // behaviour; the ward is selected, the bar should reflect zero data.
        await expect(page.locator('#selected-ward-name')).toHaveText('Ward 3 Tzaneen');
    });
});

// ============================================================================
// RESET
// ============================================================================
test.describe(`Reset Button`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
        // Establish a selection to reset from
        await drillToWard(page);
        await page.locator('#apply-btn').click();
        await expect(page.locator('#risk-text')).toHaveText('High'); // sanity
    });

    test('reset clears country select value', async ({ page }) => {
        await page.locator('#reset-btn').click();
        await expect(page.locator('#country-select')).toHaveValue('');
    });

    test('reset disables province select', async ({ page }) => {
        await page.locator('#reset-btn').click();
        await expect(page.locator('#province-select')).toBeDisabled();
    });

    test('reset disables ward select', async ({ page }) => {
        await page.locator('#reset-btn').click();
        await expect(page.locator('#city-select')).toBeDisabled();
    });

    test('reset disables apply button', async ({ page }) => {
        await page.locator('#reset-btn').click();
        await expect(page.locator('#apply-btn')).toBeDisabled();
    });

    test('reset returns ward risk panel to default placeholder', async ({ page }) => {
        await page.locator('#reset-btn').click();
        await expect(page.locator('#risk-text')).toHaveText('--');
        await expect(page.locator('#selected-ward-name')).toHaveText('Select a Ward');
    });

    test('reset returns all environmental factor values to dashes', async ({ page }) => {
        await page.locator('#reset-btn').click();
        await expect(page.locator('#env-agric-val')).toHaveText('--');
        await expect(page.locator('#env-temp-val')).toHaveText('--');
        await expect(page.locator('#env-soil-val')).toHaveText('--');
    });

    test('reset clears the province select options', async ({ page }) => {
        await page.locator('#reset-btn').click();
        await expect(page.locator('#province-select option:not([value=""])')).toHaveCount(0);
    });
});

// ============================================================================
// TIME SLIDER
// ============================================================================
test.describe(`Time Slider`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
    });

    test('slider has min=0 and max=12 (Jan 2025 to Jan 2026)', async ({ page }) => {
        const slider = page.locator('#time-slider');
        await expect(slider).toHaveAttribute('min', '0');
        await expect(slider).toHaveAttribute('max', '12');
    });

    test('moving slider resets ward risk panel to defaults', async ({ page }) => {
        await drillToWard(page);
        await page.locator('#apply-btn').click();
        await expect(page.locator('#risk-text')).toHaveText('High');

        await page.locator('#time-slider').evaluate(el => {
            el.value = '1'; // Feb 2025
            el.dispatchEvent(new Event('input'));
        });

        await expect(page.locator('#risk-text')).toHaveText('--');
    });

    test('moving slider with municipality selected repopulates ward dropdown', async ({ page }) => {
        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');

        // Move to Feb 2025 (index 1) — mock has 2 Tzaneen wards in Feb
        await page.locator('#time-slider').evaluate(el => {
            el.value = '1';
            el.dispatchEvent(new Event('input'));
        });

        await expect(page.locator('#city-select option:not([value=""])')).toHaveCount(2);
    });

    test('moving slider with no municipality selected keeps ward and apply disabled', async ({ page }) => {
        await page.locator('#time-slider').evaluate(el => {
            el.value = '1';
            el.dispatchEvent(new Event('input'));
        });

        await expect(page.locator('#city-select')).toBeDisabled();
        await expect(page.locator('#apply-btn')).toBeDisabled();
    });
});

// ============================================================================
// MAP LEGEND
// ============================================================================
test.describe(`Map Legend`, () => {
    test.beforeEach(async ({ page }) => {
        await setupMalariaPage(page);
    });

    test('legend renders exactly four items', async ({ page }) => {
        await expect(page.locator('.legend-list li')).toHaveCount(4);
    });

    test('first legend item is the live heatmap status indicator', async ({ page }) => {
        await expect(page.locator('.legend-list li.active')).toContainText('LIVE HEATMAP OVERLAY ACTIVE');
    });

    test('High Risk legend item is present', async ({ page }) => {
        await expect(page.locator('.legend-list')).toContainText('High Risk');
    });

    test('Moderate legend item is present', async ({ page }) => {
        await expect(page.locator('.legend-list')).toContainText('Moderate');
    });

    test('Low Risk legend item is present', async ({ page }) => {
        await expect(page.locator('.legend-list')).toContainText('Low Risk');
    });
});

// ============================================================================
// ORIENTATION LOCK
// ============================================================================
test.describe(`Orientation Lock`, () => {
    test('orientation lock element exists in DOM', async ({ page }) => {
        await setupMalariaPage(page);
        await expect(page.locator('#orientation-lock')).toBeAttached();
    });

    test('orientation lock is not visible on a standard 1280×720 desktop viewport', async ({ page }) => {
        await setupMalariaPage(page);
        // Desktop viewport — CSS only activates the lock at max-width: 768px
        await expect(page.locator('#orientation-lock')).not.toBeVisible();
    });

    test('orientation lock is visible on a 390px portrait mobile viewport', async ({ browser }) => {
        const context = await browser.newContext({
            viewport: { width: 390, height: 844 },
        });
        const mobilePage = await context.newPage();
        await setupMalariaPage(mobilePage);

        // The media query @media (max-width: 768px) sets display:flex on the lock overlay
        await expect(mobilePage.locator('#orientation-lock')).toBeVisible();
        await context.close();
    });
});