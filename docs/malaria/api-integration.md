# Malaria API integration

The malaria dashboard and malaria reports consume the live Spring Boot API instead
of the Limpopo CSV. Both use the existing four-factor risk formula and exclude
records with missing required inputs. NCD historical observation browsing remains
separate. Synthetic data and fabricated forecasting have been removed.

## Hosted-only access

Run `npm start` and open `http://localhost:8766/pages/malaria/dashboard.html`.
Node forwards `/api/*` only to `https://eoha-backend.onrender.com`, configured in
`config/api.json`. No local Java backend or database credentials are needed.
Local/Auto modes and the browser selector have been removed; stale preferences
are ignored.

Live Server on loopback port 5500/5501 is also supported while Node runs on port
8766. Shared browser configuration sends API requests to that bridge; restricted
loopback CORS permits the browser to read its responses. Render remains the sole
data source. Plain static servers cannot perform API forwarding themselves.

The proxy preserves gzip, reducing the large JSON transfer. Browser CacheStorage
reuses successful hosted records for five minutes across dashboard/report loads on
the same origin. Cached data is labelled; failures and results without any complete scoring records are
not cached. After expiry the next load refreshes. The backend has its own
60-second query cache, so observation age can include both cache layers.
A shared Canvas renderer reduces ward marker DOM work.

The hosted joined endpoint now returns 200 with real ward/month records. The
earlier missing-route deployment blocker is resolved. See the
[README](../../README.md) for all routes, response locations, configuration,
JavaScript examples and diagnostics.

## API contract and data conversion

`GET /api/malaria-risk-inputs` returns `{success:true,data:[...],message:null}`.
The read-only backend projection joins regions, variables, sources and mean ward
observations, returning one record per ward/month. It avoids downloading hundreds
of raw measurement pages. Results are cached for 60 seconds; failed queries are
not cached. A cold RDS query can take about 17 seconds for the current dataset.

| API field | Scoring/UI input |
| --- | --- |
| `region_code`, `region_name` | Ward identifier and label |
| `province` | Province |
| `municipality`, `latitude`, `longitude` | Observation metadata for selection and map placement |
| `observation_month` | Calendar date as `YYYY-MM-DD`, preserving month across timezones |
| `lst_c` | Surface temperature in °C |
| `soil_moisture` | Fraction in m³/m³ |
| `ndwi` | Water index |
| `population_density_per_km2` | WorldPop mean pixel count × 100 |
| `air_temp_c`, `agric_percentage` | Optional environmental display values |

Population conversion follows the existing EOHA pipeline convention: a mean count
per 100 m WorldPop pixel is multiplied by 100 to approximate persons/km². The
backend applies it only to mean observations from the WORLDPOP 100 m dataset with
unit `persons`. Regional population totals must not use that conversion.
Agriculture fractions are multiplied by 100 for percentage display. Unsupported
required-variable units or ambiguous duplicate inputs yield null values, which
are excluded from scoring instead of being replaced with zeros.

The map additionally requires valid coordinates. Timeline and report month choices
come from returned records. Both pages show API failures explicitly without a CSV
fallback; report CSV export still downloads the displayed API-derived data.

## Verification

```bash
# Backend directory:
bash mvnw test
# Prototype directory:
node --test tests/malaria/api.test.cjs
# With Playwright available:
node tests/malaria/api.browser.cjs
node tests/malaria/api.live.cjs
curl http://localhost:8766/api/health/database
```

`tests/malaria/api.browser.cjs` tests desktop/mobile scoring, timeline, reports,
pagination, export and failures using controlled API fixtures.
`tests/malaria/api.live.cjs` uses the running backend and real RDS data without mocking.
`EOHA_URL` and `BROWSER_EXECUTABLE` override the preview and browser paths.

Earlier local-backend verification on 28 October 2026 confirmed database readiness, 44,680 projected
ward-month records across January–October 2026, and 44,480 complete scoring records.
The other 200 records were excluded for missing required inputs. The live browser
check confirmed ward scoring, timeline changes, report totals, zero CSV reads and
zero JavaScript errors. Backend tests passed (3 tests), along with frontend API
unit tests and desktop/mobile browser checks.

Database access is read-only; no database records were modified.

## Experimental malaria outlook

The forecasting page restores the original EOHA chart and card layout. It consumes
`EOHAMalariaAPI.load()` and does not read CSVs or generate illustrative values.
Province, municipality and ward filters use returned API metadata; horizons are
7, 14 and 30 days. Layout and Retry remain available during loading or failure.

`forecast-model.js` requires four consecutive complete monthly observations per
ward, ending in the latest month of the selected region. Duplicate ward/month
records are ambiguous and excluded. Monthly means are anchored at UTC month end.
For each ward, the first three months predict the fourth: compare a recent linear
input trend against persistence using absolute error in the existing four-factor
score. Ties use persistence. The selected method projects the latest three input
observations up to 30 days; population density remains at its latest value.
Soil moisture and NDWI are bounded to their physical ranges. Regional output is
an unweighted mean across a fixed eligible cohort; coverage is visible.

The displayed latest-month error is model-selection error, not independent test
accuracy. Scenario bounds span persistence and trend scores; they are not a
statistical confidence interval. These experimental outputs describe environmental
suitability, not malaria cases or probability of infection. Daily points are
modelled from monthly inputs and do not imply daily observations. Stale data is
labelled as a historical outlook with explicit dates, never relabelled as today.

Run `node --test tests/malaria/forecast.test.cjs` for horizon, month-end, missing
history, duplicate, gap, score and cohort checks.
