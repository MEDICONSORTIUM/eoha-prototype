# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: malaria-visual.spec.js >> Visual - High Risk Ward Selected >> region selector card shows populated dropdowns
- Location: tests/malaria-visual.spec.js:110:9

# Error details

```
Error: expect(locator).toHaveScreenshot(expected) failed

Locator: locator('.region-selector')
Timeout: 5000ms
  Timeout 5000ms exceeded.

  Snapshot: region-selector-selected.png

Call log:
  - Expect "toHaveScreenshot(region-selector-selected.png)" with timeout 5000ms
    - verifying given screenshot expectation
  - waiting for locator('.region-selector')
    - locator resolved to <section class="card region-selector">…</section>
  - taking element screenshot
    - disabled all CSS animations
  - waiting for fonts to load...
  - fonts loaded
  - attempting scroll into view action
    - waiting for element to be stable
  - 160 pixels (ratio 0.01 of all image pixels) are different.
  - waiting 100ms before taking screenshot
  - waiting for locator('.region-selector')
  - Timeout 5000ms exceeded.

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e3]:
    - img [ref=e4]
    - paragraph [ref=e6]:
      - text: Please rotate your device
      - text: to view the map
  - generic [ref=e7]:
    - generic:
      - generic:
        - img
      - generic [ref=e11]:
        - generic [ref=e14]:
          - heading "Ward 1 Tzaneen" [level=3] [ref=e15]
          - text: 100% Risk
        - button "Close popup" [ref=e17]: ×
    - generic [ref=e18]:
      - link "Leaflet" [ref=e19]:
        - /url: https://leafletjs.com
        - img [ref=e20]
        - text: Leaflet
      - text: "| © OpenStreetMap contributors © CARTO"
  - generic:
    - banner [ref=e24]:
      - generic [ref=e25]:
        - heading [level=1]
      - navigation [ref=e26]:
        - link "Dashboard" [ref=e27]:
          - /url: "#"
        - link "Forecasting" [ref=e28]:
          - /url: "#"
        - link "Resource Center" [ref=e29]:
          - /url: "#"
        - link "Reports" [ref=e30]:
          - /url: "#"
      - generic [ref=e31]:
        - button [ref=e32] [cursor=pointer]:
          - img [ref=e33]
        - button [ref=e36] [cursor=pointer]:
          - img [ref=e37]
    - complementary [ref=e41]:
      - generic [ref=e42]:
        - generic [ref=e43]:
          - img [ref=e45]
          - heading "Region Selector" [level=2] [ref=e48]
          - button "Reset Filters" [ref=e49] [cursor=pointer]:
            - img [ref=e50]
        - paragraph [ref=e53]: Refine your spatial analysis
        - generic [ref=e54]:
          - generic [ref=e55]: COUNTRY
          - combobox [ref=e56] [cursor=pointer]:
            - option "-- Select Country --"
            - option "Zambia"
            - option "South Africa" [selected]
        - generic [ref=e57]:
          - generic [ref=e58]: PROVINCE
          - combobox [ref=e59] [cursor=pointer]:
            - option "-- Select Province --"
            - option "Mopani District Municipality"
            - option "Tzaneen" [selected]
        - generic [ref=e60]:
          - generic [ref=e61]: WARD
          - combobox [ref=e62] [cursor=pointer]:
            - option "-- Select Ward --"
            - option "Ward 1 Tzaneen" [selected]
            - option "Ward 2 Tzaneen"
            - option "Ward 3 Tzaneen"
        - button "Update View" [active] [ref=e63] [cursor=pointer]:
          - img [ref=e64]
          - text: Update View
      - generic [ref=e68]:
        - generic [ref=e69]:
          - img [ref=e71]
          - heading "Environmental Factors" [level=2] [ref=e72]
        - generic [ref=e74]:
          - generic [ref=e75]: Precipitation
          - generic [ref=e76]: 45%
        - generic [ref=e80]:
          - generic [ref=e81]: Avg Temperature
          - generic [ref=e82]: 28°C
        - generic [ref=e86]:
          - generic [ref=e87]: Humidity Level
          - generic [ref=e88]: 40%
        - generic [ref=e91]: "\"Higher precipitation levels in the last 14 days indicate a surge in mosquito breeding sites.\""
    - complementary [ref=e92]:
      - generic [ref=e93]:
        - paragraph [ref=e94]: CURRENT WARD RISK
        - generic [ref=e95]:
          - img [ref=e96]
          - generic [ref=e99]:
            - heading "High" [level=3] [ref=e100]
            - generic [ref=e101]: 100% RISK
        - heading "Ward 1 Tzaneen" [level=4] [ref=e102]
        - link "View Full Analysis ›" [ref=e103]:
          - /url: "#"
      - generic [ref=e104]:
        - paragraph [ref=e105]: MUNICIPALITY AVERAGE
        - generic [ref=e106]:
          - img [ref=e107]
          - generic [ref=e110]:
            - heading "High" [level=3] [ref=e111]
            - generic [ref=e112]: 57% AVG
        - heading "Tzaneen" [level=4] [ref=e113]
        - link "Compare Regions ⇋" [ref=e114]:
          - /url: "#"
      - generic [ref=e115]:
        - generic [ref=e116]:
          - heading "Map Legend" [level=2] [ref=e117]
          - generic [ref=e118]: i
        - list [ref=e119]:
          - listitem [ref=e120]: LIVE HEATMAP OVERLAY ACTIVE
          - listitem [ref=e122]: High Risk (Red)
          - listitem [ref=e124]: Moderate (Yellow)
          - listitem [ref=e126]: Low Risk (Green)
    - contentinfo [ref=e128]:
      - generic [ref=e129]:
        - generic [ref=e130]:
          - img [ref=e132] [cursor=pointer]
          - heading "Forecasting Timeline" [level=3] [ref=e134]
        - generic [ref=e135]: NEXT 30 DAYS
        - generic "Recenter Map" [ref=e136] [cursor=pointer]:
          - img [ref=e137]
      - generic [ref=e139]:
        - slider [ref=e140] [cursor=pointer]: "0"
        - generic [ref=e141]:
          - generic [ref=e142]: Oct 12
          - generic [ref=e143]: Today
          - generic [ref=e144]: Oct 26
          - generic [ref=e145]: Nov 11
```

# Test source

```ts
  11  | // To update baselines after intentional UI changes:
  12  | //   npx playwright test malaria-visual --update-snapshots
  13  | //
  14  | // These tests run on Chromium only (consistent rendering engine) to avoid
  15  | // cross-browser font/antialiasing noise. Add other projects if you need them.
  16  | //
  17  | // Element-scoped screenshots are preferred over full-page captures —
  18  | // they are more stable (immune to layout shifts in unrelated regions)
  19  | // and produce smaller, more focused diffs.
  20  | // ---------------------------------------------------------------------------
  21  | 
  22  | test.use({
  23  |     // Pin viewport for reproducible screenshots across machines
  24  |     viewport: { width: 1440, height: 900 },
  25  | });
  26  | 
  27  | // ============================================================================
  28  | // LAYOUT SECTIONS — DEFAULT STATE
  29  | // ============================================================================
  30  | test.describe(`Visual - Default State`, () => {
  31  |     test.beforeEach(async ({ page }) => {
  32  |         await setupMalariaPage(page);
  33  |         // Let any CSS transitions settle
  34  |         await page.waitForTimeout(5000);
  35  |     });
  36  | 
  37  |     test('top bar matches baseline', async ({ page }) => {
  38  |         await expect(page.locator('.top-bar')).toHaveScreenshot('topbar-default.png', {
  39  |             animations: 'disabled',
  40  |         });
  41  |     });
  42  | 
  43  |     test('region selector card matches baseline', async ({ page }) => {
  44  |         await expect(page.locator('.region-selector')).toHaveScreenshot('region-selector-default.png', {
  45  |             animations: 'disabled',
  46  |         });
  47  |     });
  48  | 
  49  |     test('environmental factors card matches baseline', async ({ page }) => {
  50  |         await expect(page.locator('.enviro-factors')).toHaveScreenshot('env-factors-default.png', {
  51  |             animations: 'disabled',
  52  |         });
  53  |     });
  54  | 
  55  |     test('ward risk donut card matches baseline', async ({ page }) => {
  56  |         await expect(page.locator('.risk-card').first()).toHaveScreenshot('ward-risk-default.png', {
  57  |             animations: 'disabled',
  58  |         });
  59  |     });
  60  | 
  61  |     test('municipality average donut card matches baseline', async ({ page }) => {
  62  |         await expect(page.locator('#avg-risk-container')).toHaveScreenshot('avg-risk-default.png', {
  63  |             animations: 'disabled',
  64  |         });
  65  |     });
  66  | 
  67  |     test('map legend card matches baseline', async ({ page }) => {
  68  |         await expect(page.locator('.map-legend')).toHaveScreenshot('map-legend-default.png', {
  69  |             animations: 'disabled',
  70  |         });
  71  |     });
  72  | 
  73  |     test('bottom timeline panel matches baseline', async ({ page }) => {
  74  |         await expect(page.locator('.bottom-panel')).toHaveScreenshot('bottom-panel-default.png', {
  75  |             animations: 'disabled',
  76  |         });
  77  |     });
  78  | });
  79  | 
  80  | // ============================================================================
  81  | // RISK PANELS — AFTER WARD SELECTION
  82  | // ============================================================================
  83  | test.describe(`Visual - High Risk Ward Selected`, () => {
  84  |     test.beforeEach(async ({ page }) => {
  85  |         await setupMalariaPage(page);
  86  |         await drillToWard(page, { wardIndex: '0' }); // Ward 1 Tzaneen → 100% risk
  87  |         await page.locator('#apply-btn').click();
  88  |         // Wait for donut animation (transition: stroke-dashoffset 1s ease-out)
  89  |         await page.waitForTimeout(1_200);
  90  |     });
  91  | 
  92  |     test('ward risk donut shows High state', async ({ page }) => {
  93  |         await expect(page.locator('.risk-card').first()).toHaveScreenshot('ward-risk-high.png', {
  94  |             animations: 'disabled',
  95  |         });
  96  |     });
  97  | 
  98  |     test('environmental factors card shows High ward values', async ({ page }) => {
  99  |         await expect(page.locator('.enviro-factors')).toHaveScreenshot('env-factors-high.png', {
  100 |             animations: 'disabled',
  101 |         });
  102 |     });
  103 | 
  104 |     test('municipality average donut is active', async ({ page }) => {
  105 |         await expect(page.locator('#avg-risk-container')).toHaveScreenshot('avg-risk-active.png', {
  106 |             animations: 'disabled',
  107 |         });
  108 |     });
  109 | 
  110 |     test('region selector card shows populated dropdowns', async ({ page }) => {
> 111 |         await expect(page.locator('.region-selector')).toHaveScreenshot('region-selector-selected.png', {
      |                                                        ^ Error: expect(locator).toHaveScreenshot(expected) failed
  112 |             animations: 'disabled',
  113 |         });
  114 |     });
  115 | });
  116 | 
  117 | test.describe(`Visual - Low Risk Ward Selected`, () => {
  118 |     test.beforeEach(async ({ page }) => {
  119 |         await setupMalariaPage(page);
  120 |         await drillToWard(page, { wardIndex: '2' }); // Ward 3 Tzaneen → 0% risk
  121 |         await page.locator('#apply-btn').click();
  122 |         await page.waitForTimeout(2_400);
  123 |     });
  124 | 
  125 |     test('ward risk donut shows Low state', async ({ page }) => {
  126 |         await expect(page.locator('.risk-card').first()).toHaveScreenshot('ward-risk-low.png', {
  127 |             animations: 'disabled',
  128 |         });
  129 |     });
  130 | });
  131 | 
  132 | // ============================================================================
  133 | // SLIDER INTERACTION
  134 | // ============================================================================
  135 | test.describe(`Visual - Slider At Feb 2025`, () => {
  136 |     test('bottom panel shows slider at position 1', async ({ page }) => {
  137 |         await setupMalariaPage(page);
  138 |         await page.locator('#time-slider').evaluate(el => {
  139 |             el.value = '1';
  140 |             el.dispatchEvent(new Event('input'));
  141 |         });
  142 |         await page.waitForTimeout(300);
  143 | 
  144 |         await expect(page.locator('.bottom-panel')).toHaveScreenshot('bottom-panel-feb2025.png', {
  145 |             animations: 'disabled',
  146 |         });
  147 |     });
  148 | });
  149 | 
  150 | // ============================================================================
  151 | // MOBILE ORIENTATION LOCK
  152 | // ============================================================================
  153 | test.describe(`Visual - Mobile Portrait`, () => {
  154 |     test('orientation lock overlay renders correctly on 390px viewport', async ({ browser }) => {
  155 |         const context = await browser.newContext({
  156 |             viewport: { width: 390, height: 844 },
  157 |         });
  158 |         const page = await context.newPage();
  159 |         await setupMalariaPage(page);
  160 |         await page.waitForTimeout(300);
  161 | 
  162 |         await expect(page.locator('#orientation-lock')).toHaveScreenshot('orientation-lock-mobile.png', {
  163 |             animations: 'disabled',
  164 |         });
  165 | 
  166 |         await context.close();
  167 |     });
  168 | });
```