// @ts-check
import { test, expect } from '@playwright/test';
import { MALARIA_URL, CSV_ROUTE, getMockCsv } from './helpers/malaria.js';

/* global allCSVData, districtLookup, calculateDynamicRisk */

// ---------------------------------------------------------------------------
// These tests treat the CSV fetch + PapaParse pipeline as the "API layer".
// We verify the route is requested, the data is parsed correctly into globals,
// and that edge cases (bad rows, 500 errors) are handled gracefully.
//
// Important: calculateDynamicRisk, allCSVData, and districtLookup are declared
// with `const`/`let`/`function` at the top level of a non-module script, making
// them accessible as bare globals in page.evaluate() — NOT via window.*.
// ---------------------------------------------------------------------------

// ============================================================================
// ROUTE INTERCEPTION
// ============================================================================
test.describe(`Route Interception`, () => {
    test('the page requests the CSV from the expected path', async ({ page }) => {
        let csvWasRequested = false;

        await page.route(CSV_ROUTE, route => {
            csvWasRequested = true;
            route.fulfill({ status: 200, contentType: 'text/csv', body: getMockCsv() });
        });

        await page.goto(MALARIA_URL);
        // @ts-ignore
        await page.waitForFunction(() => typeof allCSVData !== 'undefined' && allCSVData.length > 0);

        expect(csvWasRequested).toBe(true);
    });

    test('the mocked route response is consumed by PapaParse', async ({ page }) => {
        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 200, contentType: 'text/csv', body: getMockCsv() })
        );

        await page.goto(MALARIA_URL);
        // @ts-ignore
        await page.waitForFunction(() => typeof allCSVData !== 'undefined' && allCSVData.length > 0);

        // 7 data rows in the mock fixture
        // @ts-ignore
        const count = await page.evaluate(() => allCSVData.length);
        expect(count).toBe(7);
    });
});

// ============================================================================
// DATA PARSING & LOOKUP
// ============================================================================
test.describe(`Data Parsing - districtLookup`, () => {
    test.beforeEach(async ({ page }) => {
        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 200, contentType: 'text/csv', body: getMockCsv() })
        );
        await page.goto(MALARIA_URL);
        // @ts-ignore
        await page.waitForFunction(() => typeof allCSVData !== 'undefined' && allCSVData.length > 0);
    });

    test('districtLookup is keyed by municipality name', async ({ page }) => {
        // @ts-ignore
        const keys = await page.evaluate(() => Object.keys(districtLookup).sort());
        expect(keys).toContain('Tzaneen Local Municipality');
        expect(keys).toContain('Mopani District Municipality');
    });

    test('Tzaneen municipality contains all rows across all months', async ({ page }) => {
        // 3 Jan + 2 Feb = 5 rows for Tzaneen in the fixture
        // @ts-ignore
        const count = await page.evaluate(
            // @ts-ignore
            () => districtLookup['Tzaneen Local Municipality'].length
        );
        expect(count).toBe(5);
    });

    test('Mopani municipality contains correct row count', async ({ page }) => {
        // 2 rows in Jan 2025 for Mopani
        const count = await page.evaluate(
            () => districtLookup['Mopani District Municipality'].length
        );
        expect(count).toBe(2);
    });

    test('each row has the expected numeric fields after dynamicTyping', async ({ page }) => {
        // @ts-ignore
        const ward = await page.evaluate(
            // @ts-ignore
            () => districtLookup['Tzaneen Local Municipality'].find(
                w => w.WardLabel === 'Ward 1 Tzaneen' && w.Month === 'Jan 2025'
            )
        );
        expect(typeof ward.Soil_Moisture).toBe('number');
        expect(typeof ward.LST_Surface_C).toBe('number');
        expect(typeof ward.latitude).toBe('number');
        expect(typeof ward.longitude).toBe('number');
        expect(typeof ward.Population_Density_Per_KM2).toBe('number');
    });

    test('Ward 1 Tzaneen Jan 2025 has correct field values', async ({ page }) => {
        // @ts-ignore
        const ward = await page.evaluate(
            // @ts-ignore
            () => districtLookup['Tzaneen Local Municipality'].find(
                w => w.WardLabel === 'Ward 1 Tzaneen' && w.Month === 'Jan 2025'
            )
        );
        expect(ward.Soil_Moisture).toBeCloseTo(0.40, 2);
        expect(ward.LST_Surface_C).toBeCloseTo(27.5, 1);
        expect(ward.NDWI_Water).toBeCloseTo(0.05, 2);
        expect(ward.Population_Density_Per_KM2).toBe(350);
    });
});

// ============================================================================
// RISK CALCULATION
// ============================================================================
test.describe(`Risk Calculation - calculateDynamicRisk()`, () => {
    test.beforeEach(async ({ page }) => {
        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 200, contentType: 'text/csv', body: getMockCsv() })
        );
        await page.goto(MALARIA_URL);
        // @ts-ignore
        await page.waitForFunction(() => typeof allCSVData !== 'undefined' && allCSVData.length > 0);
    });

    test('Ward 1 Tzaneen scores 100 — all conditions met', async ({ page }) => {
        // SM=0.40(+40) LST=27.5(+30) NDWI=0.05(+20) Density=350(+10) = 100
        // @ts-ignore
        const score = await page.evaluate(() => {
            // @ts-ignore
            const ward = allCSVData.find(
                d => d.WardLabel === 'Ward 1 Tzaneen' && d.Month === 'Jan 2025'
            );
            // @ts-ignore
            return calculateDynamicRisk(ward);
        });
        expect(score).toBe(100);
    });

    test('Ward 2 Tzaneen scores 70 — high but below max', async ({ page }) => {
        // SM=0.28(+20) LST=28.0(+30) NDWI=-0.05(+20) Density=150(0) = 70
        const score = await page.evaluate(() => {
            const ward = allCSVData.find(
                d => d.WardLabel === 'Ward 2 Tzaneen' && d.Month === 'Jan 2025'
            );
            return calculateDynamicRisk(ward);
        });
        expect(score).toBe(70);
    });

    test('Ward 3 Tzaneen scores 0 — no conditions met', async ({ page }) => {
        // SM=0.15(0) LST=35.0(0, outside 25-30) NDWI=-0.20(0) Density=100(0) = 0
        const score = await page.evaluate(() => {
            const ward = allCSVData.find(d => d.WardLabel === 'Ward 3 Tzaneen');
            return calculateDynamicRisk(ward);
        });
        expect(score).toBe(0);
    });

    test('Ward 1 Mopani scores 100', async ({ page }) => {
        // SM=0.42(+40) LST=26.5(+30) NDWI=0.08(+20) Density=400(+10) = 100
        const score = await page.evaluate(() => {
            const ward = allCSVData.find(
                d => d.WardLabel === 'Ward 1 Mopani' && d.Month === 'Jan 2025'
            );
            return calculateDynamicRisk(ward);
        });
        expect(score).toBe(100);
    });

    test('Ward 2 Mopani scores 0 — LST out of band, dry soil, low density', async ({ page }) => {
        // SM=0.22(0) LST=32.0(0) NDWI=-0.15(0) Density=200(0) = 0
        const score = await page.evaluate(() => {
            const ward = allCSVData.find(d => d.WardLabel === 'Ward 2 Mopani');
            return calculateDynamicRisk(ward);
        });
        expect(score).toBe(0);
    });

    test('score boundary: soil moisture exactly 0.35 does NOT trigger the upper bracket', async ({ page }) => {
        // SM=0.35 is NOT > 0.35, so no +40; but IS > 0.25 so +20
        const score = await page.evaluate(() =>
            calculateDynamicRisk({
                Soil_Moisture: 0.35,
                LST_Surface_C: 20, // outside range
                NDWI_Water: -0.5,  // below threshold
                Population_Density_Per_KM2: 100,
            })
        );
        expect(score).toBe(20);
    });

    test('score boundary: LST at exactly 25°C triggers the temperature bracket', async ({ page }) => {
        const score = await page.evaluate(() =>
            calculateDynamicRisk({
                Soil_Moisture: 0.1,  // no contribution
                LST_Surface_C: 25,   // exactly at lower bound → +30
                NDWI_Water: -0.5,
                Population_Density_Per_KM2: 100,
            })
        );
        expect(score).toBe(30);
    });

    test('score boundary: LST at exactly 30°C triggers the temperature bracket', async ({ page }) => {
        const score = await page.evaluate(() =>
            calculateDynamicRisk({
                Soil_Moisture: 0.1,
                LST_Surface_C: 30,   // exactly at upper bound → +30
                NDWI_Water: -0.5,
                Population_Density_Per_KM2: 100,
            })
        );
        expect(score).toBe(30);
    });

    test('score boundary: LST at 30.1°C does NOT trigger the temperature bracket', async ({ page }) => {
        const score = await page.evaluate(() =>
            calculateDynamicRisk({
                Soil_Moisture: 0.1,
                LST_Surface_C: 30.1, // just over → 0
                NDWI_Water: -0.5,
                Population_Density_Per_KM2: 100,
            })
        );
        expect(score).toBe(0);
    });
});

// ============================================================================
// EDGE CASES & ERROR HANDLING
// ============================================================================
test.describe(`Edge Cases`, () => {
    test('rows with a missing Municipali field are silently skipped', async ({ page }) => {
        // Append a row with empty Municipali — the `if (data.Municipali)` guard should drop it
        const csvWithBadRow = getMockCsv().trim() +
            '\n,Jan 2025,-23.5,30.0,Ghost Ward,0.1,25.0,-0.1,100,10.0';

        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 200, contentType: 'text/csv', body: csvWithBadRow })
        );
        await page.goto(MALARIA_URL);
        // @ts-ignore
        await page.waitForFunction(() => typeof allCSVData !== 'undefined' && allCSVData.length > 0);

        // @ts-ignore
        const count = await page.evaluate(() => allCSVData.length);
        expect(count).toBe(7); // still 7, bad row excluded
    });

    test('a CSV 500 error leaves allCSVData empty', async ({ page }) => {
        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 500, body: 'Internal Server Error' })
        );
        await page.goto(MALARIA_URL);

        // PapaParse will not call complete with data on a 500.
        // Wait briefly then assert no data was pushed.
        await page.waitForTimeout(3_000);

        // @ts-ignore
        const count = await page.evaluate(() => allCSVData.length);
        expect(count).toBe(0);
    });

    test('province dropdown stays empty when CSV fails', async ({ page }) => {
        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 500, body: 'Internal Server Error' })
        );
        await page.goto(MALARIA_URL);
        await page.waitForTimeout(3_000);

        await page.locator('#country-select').selectOption('South Africa');
        await expect(page.locator('#province-select option:not([value=""])')).toHaveCount(0);
    });

    test('only rows matching the current month index are shown in ward dropdown', async ({ page }) => {
        // Default slider = 0 = Jan 2025. Tzaneen has 3 rows for Jan 2025 in the fixture.
        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 200, contentType: 'text/csv', body: getMockCsv() })
        );
        await page.goto(MALARIA_URL);
        // @ts-ignore
        await page.waitForFunction(() => typeof allCSVData !== 'undefined' && allCSVData.length > 0);

        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');

        await expect(page.locator('#city-select option:not([value=""])')).toHaveCount(3);
    });

    test('slider advancing to Feb 2025 shows only Feb wards for Tzaneen', async ({ page }) => {
        await page.route(CSV_ROUTE, route =>
            route.fulfill({ status: 200, contentType: 'text/csv', body: getMockCsv() })
        );
        await page.goto(MALARIA_URL);
        // @ts-ignore
        await page.waitForFunction(() => typeof allCSVData !== 'undefined' && allCSVData.length > 0);

        await page.locator('#country-select').selectOption('South Africa');
        await page.locator('#province-select').selectOption('Tzaneen Local Municipality');

        await page.locator('#time-slider').evaluate(el => {
            el.value = '1'; // index 1 = Feb 2025
            el.dispatchEvent(new Event('input'));
        });

        // Mock has 2 Tzaneen rows for Feb 2025
        await expect(page.locator('#city-select option:not([value=""])')).toHaveCount(2);
    });
});