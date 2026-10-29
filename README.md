# EOHA — Earth Observation Health Analytics

EOHA is the Medical Consortium of Africa's prototype for exploring environmental
measurements and malaria risk across South African wards. The frontend uses plain
HTML, CSS and JavaScript. A separate local Spring Boot backend reads AWS RDS data.
There is no frontend build step.

## Run locally

Start the sibling backend with Java 21:

```bash
cd ../eoha_backend
bash mvnw spring-boot:run
```

The backend loads its ignored `.env.local` automatically. Keep database credentials
there, never in frontend code. The file uses `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASSWORD` and `DB_SSLMODE`.

From this repository's root:

```bash
python3 tools/serve.py
```

Open [the prototype](http://localhost:8766). The preview serves static files on port
8766 and forwards `/api/*` to the backend on port 8080. Override these with
`--port PORT` and `--backend URL`. Plain static servers need an equivalent reverse
proxy or a configured API origin with backend CORS support.

## Feature folders

Pages, scripts and styles use matching feature names. A file named `dashboard`
belongs to that feature's dashboard; reusable behavior belongs in `shared`.

```text
eoha-prototype/
├── index.html                       # Landing page
├── pages/
│   ├── malaria/
│   │   ├── dashboard.html           # Live API map and ward risk
│   │   ├── reports.html             # Live API filtering, table and export
│   │   ├── forecasting.html         # Forecast endpoint unavailable
│   │   └── resources.html
│   ├── ncd/
│   │   ├── dashboard.html           # Historical environmental measurements
│   │   ├── reports.html             # NCD scoring endpoint unavailable
│   │   ├── forecasting.html         # Forecast endpoint unavailable
│   │   └── resources.html
│   └── contact/index.html
├── scripts/
│   ├── malaria/
│   │   ├── api.js                   # Request, normalize and score API records
│   │   ├── dashboard.js             # Dashboard initializer
│   │   ├── dashboard/               # Config, data, dropdowns, events, map, risk, UI
│   │   └── reports.js               # Report loading, filtering, sorting and export
│   ├── ncd/
│   │   ├── dashboard.js             # Historical observation map and controls
│   │   ├── data.js                  # Missing-value handling, filters and means
│   │   └── regions.js               # Country/province navigation metadata
│   ├── contact/index.js
│   ├── shared/                      # API config, theme, map theme, resource filters
│   └── vendor/                      # Unmodified third-party browser libraries
├── styles/
│   ├── malaria/                     # dashboard.css and reports.css
│   ├── ncd/dashboard.css
│   ├── contact/index.css
│   ├── home/index.css
│   └── shared/                      # Theme, components, mobile and resources
├── assets/
│   ├── icons/
│   ├── images/
│   └── video/
├── data/
│   ├── malaria/                     # Retained historical observation CSVs
│   └── shared/                      # Country and province GeoJSON boundaries
├── schemas/ncd/risk-record.schema.json
├── config/routes.json               # Old page URL → canonical page URL
├── tools/
│   ├── serve.py                     # Static preview, API proxy and legacy redirects
│   └── data-pipeline/               # Real Earth Engine extraction utility
├── tests/
│   ├── malaria/                     # API unit, browser and live RDS checks
│   ├── ncd/                         # Historical observation helper tests
│   ├── shared/                      # Themes, layouts, resources and redirects
│   └── repository/                  # Local references and demo-removal checks
└── docs/
    ├── malaria/api-integration.md
    ├── ncd/risk-scoring.md
```

Static unavailable pages do not have empty or artificial JavaScript files. Add a
feature script when the backend supplies real behavior for that page. Styles
shared by those pages live in `styles/shared/resources.css`.

## Current behavior

| Feature | Data and behavior |
| --- | --- |
| Malaria dashboard | Live API measurements, risk heatmap, region/ward selectors and observation timeline |
| Malaria reports | The same live measurements and formula, filters, sorting, 25 rows per page and full filtered CSV export |
| NCD dashboard | Real historical CSV measurements and geographic boundaries; NCD scores remain unavailable |
| Forecasting | Explicit unavailable states until a forecasting endpoint/model exists |
| NCD reports | Explicit unavailable state until validated NCD scoring exists |
| Resource centers | Shared category filtering and links to retained data/specifications |
| Contact | Organisation details and the location map |

All synthetic NCD datasets, reference data, demo score calculations, synthetic
projection code and data generators have been removed. Fabricated malaria forecast
series and their uncertainty bands have also been removed. Test fixtures stay in
`tests/` and are never loaded by the application. The real Earth Engine extractor
in `tools/data-pipeline/` is retained; it does not generate demo data.

## API and risk scoring

```text
Browser → localhost:8766/api/malaria-risk-inputs
        → local eoha_backend:8080 → AWS RDS
        ← JSON ward-month measurements
        → shared frontend scoring → dashboard / reports
```

`scripts/shared/api-config.js` defines the base URL, joined endpoint and request
timeout. `scripts/malaria/api.js` validates JSON responses, converts measurement
fields to UI fields and excludes incomplete records. The backend projection caches
results for 60 seconds. Filters and pagination operate on the loaded data in the
browser; there is no automatic polling or CSV fallback for malaria risk.

The existing score is unchanged:

| Factor | Condition | Points |
| --- | --- | ---: |
| Soil moisture | Above 0.35 | 40 |
| Soil moisture | Above 0.25 through 0.35 | 20 |
| Surface temperature | 25–30°C inclusive | 30 |
| NDWI | Above −0.1 | 20 |
| Population density | Above 300 persons/km² | 10 |

Scores of 50 or more are High; 25–49 Moderate; below 25 Low. All four inputs must
exist to calculate a score. See [API integration](docs/malaria/api-integration.md)
for response fields, conversions and live verification details, and
[NCD scoring requirements](docs/ncd/risk-scoring.md) for the future NCD contract.

## Readable code and function comments

Use descriptive names, two-space indentation for JavaScript, and one clear task
per function. Named JavaScript functions use this comment format, with accurate
parameter types and return values:

```js
/**
 * update_card_stack_and_progress()
 * --------------------------------
 * Calculates scroll progress inside the stack section,
 * updates the vertical progress bar, and applies above/active/below
 * classes to each card.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
```

Document purpose and behavior, including missing-value handling and side effects.
Keep short event callbacks next to the operation they trigger. Python utilities
use equivalent purpose/Parameters/Returns docstrings. Vendor files retain their
original third-party source and licensing.

HTML owns markup, CSS owns presentation and JavaScript owns behavior. Resource
filtering has been extracted from inline HTML into `scripts/shared/resources.js`.
Load the shared theme script in the page head before first paint, and load the
malaria dashboard helper scripts before its `dashboard.js` initializer.

## Checks

Run from the repository root:

```bash
python3 -m unittest discover -s tests/repository -p 'test_*.py'
node --test tests/malaria/api.test.cjs tests/ncd/data.test.cjs
```

With Playwright available and the preview running:

```bash
node tests/malaria/api.browser.cjs
node tests/shared/theme.browser.cjs
# Requires the running backend and RDS connection:
node tests/malaria/api.live.cjs
```

Browser checks cover the migrated routes, desktop/tablet/mobile layouts, both
themes, asset loading, filters, export, unavailable states and old URL redirects.
`EOHA_URL` and `BROWSER_EXECUTABLE` can override the preview URL and browser binary.
The live test verifies RDS-backed malaria scoring without mocking API requests.

## Navigation and deployment

Canonical routes are under `pages/malaria/`, `pages/ncd/` and `pages/contact/`.
The local preview redirects old bookmarks, for example
`/pages/malaria-reports.html` → `/pages/malaria/reports.html`, using
`config/routes.json`. Configure the same redirects on a production static host;
the JSON file alone does not make a static host redirect requests.

When adding a page, keep its HTML in `pages/<feature>/`, its behavior in
`scripts/<feature>/` and its styles in `styles/<feature>/`. Use relative links from
the actual page location, reuse shared theme tokens and update navigation and
structural/browser checks. Reusable data and assets belong in their corresponding
feature folder or `shared/`.
