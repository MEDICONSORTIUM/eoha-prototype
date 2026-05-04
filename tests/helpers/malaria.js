// @ts-check
// "type":"module" or CommonJS. Playwright handles the ESM transform for
// spec files, but helper modules loaded via import() must be self-contained.

/* global allCSVData, districtLookup, calculateDynamicRisk */

/** Relative URL for the malaria dashboard page */
export const MALARIA_URL = '/pages/malaria-page.html';

/**
 * Glob pattern that matches the PapaParse CSV download request.
 * The script resolves '../data/...' relative to /pages/, landing at /data/.
 */
export const CSV_ROUTE = '**/data/Limpopo_Risk_Jan25_Jan26_Safe.csv';

/**
 * Mock CSV inlined as a string so no fs/path imports are needed.
 *
 * Risk scores for each ward (calculateDynamicRisk logic):
 *   Ward 1 Tzaneen Jan 2025: SM=0.40(+40) LST=27.5(+30) NDWI=0.05(+20) D=350(+10) = 100 (High)
 *   Ward 2 Tzaneen Jan 2025: SM=0.28(+20) LST=28.0(+30) NDWI=-0.05(+20) D=150(0)  =  70 (High)
 *   Ward 3 Tzaneen Jan 2025: SM=0.15(0)   LST=35.0(0)   NDWI=-0.20(0)   D=100(0)  =   0 (Low)
 *   Ward 1 Tzaneen Feb 2025: SM=0.38(+20) LST=26.0(+30) NDWI=0.10(+20)  D=350(+10)=  80 (High)
 *   Ward 2 Tzaneen Feb 2025: SM=0.30(+20) LST=29.0(+30) NDWI=0.02(+20)  D=150(0)  =  70 (High)
 *   Ward 1 Mopani  Jan 2025: SM=0.42(+40) LST=26.5(+30) NDWI=0.08(+20)  D=400(+10)= 100 (High)
 *   Ward 2 Mopani  Jan 2025: SM=0.22(0)   LST=32.0(0)   NDWI=-0.15(0)   D=200(0)  =   0 (Low)
 */
const MOCK_CSV = `Municipali,Month,latitude,longitude,WardLabel,Soil_Moisture,LST_Surface_C,NDWI_Water,Population_Density_Per_KM2,Agric_Percentage
Tzaneen Local Municipality,Jan 2025,-23.8333,30.1667,Ward 1 Tzaneen,0.40,27.5,0.05,350,45.2
Tzaneen Local Municipality,Jan 2025,-23.9000,30.2000,Ward 2 Tzaneen,0.28,28.0,-0.05,150,32.1
Tzaneen Local Municipality,Jan 2025,-23.8500,30.1500,Ward 3 Tzaneen,0.15,35.0,-0.20,100,20.0
Tzaneen Local Municipality,Feb 2025,-23.8333,30.1667,Ward 1 Tzaneen,0.38,26.0,0.10,350,45.2
Tzaneen Local Municipality,Feb 2025,-23.9000,30.2000,Ward 2 Tzaneen,0.30,29.0,0.02,150,32.1
Mopani District Municipality,Jan 2025,-23.7000,30.4000,Ward 1 Mopani,0.42,26.5,0.08,400,55.0
Mopani District Municipality,Jan 2025,-23.7500,30.4500,Ward 2 Mopani,0.22,32.0,-0.15,200,28.0`;

/** Returns the raw mock CSV string */
export function getMockCsv() {
    return MOCK_CSV;
}

/**
 * Standard page setup for Malaria Dashboard tests.
 *
 * Must be called BEFORE page.goto() so the route intercept is in place
 * when PapaParse fires its download request on page load.
 *
 * After this resolves:
 *  - The CSV route is mocked.
 *  - The page has loaded and PapaParse has parsed all rows.
 *  - districtLookup, allCSVData are populated and safe to read.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} [csvBody] - Override the CSV body (for negative/edge tests)
 */
export async function setupMalariaPage(page, csvBody) {
    const body = csvBody ?? getMockCsv();

    await page.route(CSV_ROUTE, route =>
        route.fulfill({
            status: 200,
            contentType: 'text/csv; charset=utf-8',
            body,
        })
    );

    await page.goto(MALARIA_URL);

    // Wait until PapaParse has finished processing and allCSVData is populated.
    // allCSVData is a top-level `let` in a non-module script so it is accessible
    // as a bare global inside page.evaluate / page.waitForFunction.
    await page.waitForFunction(
        () => typeof allCSVData !== 'undefined' && allCSVData.length > 0
    );
}

/**
 * Convenience: select country → province → ward and return.
 * Does NOT click apply — callers do that themselves so tests stay explicit.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ country?: string, province?: string, wardIndex?: string }} opts
 */
export async function drillToWard(page, {
    country = 'South Africa',
    province = 'Tzaneen Local Municipality',
    wardIndex = '0',
} = {}) {
    await page.locator('#country-select').selectOption(country);
    await page.locator('#province-select').selectOption(province);
    await page.locator('#city-select').selectOption(wardIndex);
}