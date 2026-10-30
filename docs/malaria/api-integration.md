# Malaria API integration

The malaria dashboard and malaria reports consume the live Spring Boot API instead
of the Limpopo CSV. Both use the existing four-factor risk formula and exclude
records with missing required inputs. NCD historical observation browsing remains
separate. Synthetic data and fabricated forecasting have been removed.

## Hosted-first Auto mode; removable browser selection

Start with `npm start` or `npm run start:auto` for hosted-first Auto, or
`npm run start:hosted` / `npm run start:local` for an explicit process default. Node forwards
same-origin `/api/*` requests to `https://eoha-backend.onrender.com`; no local
Spring Boot process or database credentials are required for hosted mode.

For local development, start the sibling backend with `bash mvnw spring-boot:run`,
then run `npm run start:local` in the prototype. Only local mode needs the backend's
ignored `.env.local` database settings. The browser still uses relative `/api`.

Profiles and the default are in `config/api.json`. CLI equivalents are
`node tools/serve.cjs --api hosted` and `node tools/serve.cjs --api local`.
An explicit `--backend URL` overrides the profile origin; `--port PORT` changes
the frontend port. Use the browser selector to switch sources and reload the dataset, or restart
the frontend to change its process default. Auto retries network failures, timeouts and HTTP 502/503/504 on Local before
forwarding a body. Manual modes never fail over; there is no CSV fallback.

Open `http://localhost:8766/pages/malaria/dashboard.html` or
`http://localhost:8766/pages/malaria/reports.html`. Direct browser requests to
Render require backend CORS, which the deployed API did not advertise in testing.
The JavaScript same-origin proxy works without that browser CORS permission.

On 30 October 2026, hosted database readiness and environmental variables returned
200, but the required `/api/malaria-risk-inputs` route returned 404. The backend
integration's scoring-input controller/service must be deployed on Render before
hosted malaria scoring can load. The frontend now gives an actionable error.
See the [README](../../README.md) for both startup options, all endpoints and
JavaScript consumption examples.

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

Both repositories use `API-integration`; backend work starts from GitHub `main`
commit `e6c79ee`. Database access is read-only; no database records were modified.

## Removing optional selection

Set `defaultTarget` to `hosted` and `browserSelectionEnabled` to `false` in
`config/api.json`, then restart Node. The server ignores old browser preferences
and overrides. The unused local target can be removed. The selector script, CSS
and markup can then be deleted without changing API loading or scoring. Source
policy lives in `tools/api-source.cjs`; the browser helper is optional.
