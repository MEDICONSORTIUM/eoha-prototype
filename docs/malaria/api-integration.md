# Malaria API integration

The malaria dashboard and malaria reports consume the live Spring Boot API instead
of the Limpopo CSV. Both use the existing four-factor risk formula and exclude
records with missing required inputs. NCD historical observation browsing remains
separate. Synthetic data and fabricated forecasting have been removed.

## Run locally

From `eoha_backend`, with Java 21:

```bash
bash mvnw spring-boot:run
```

Spring automatically loads the backend's Git-ignored `.env.local`. That file
contains exactly `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and
`DB_SSLMODE`, with owner-only permissions. `DB_URL` and `DB_USERNAME` are also
supported as environment overrides. Do not put database credentials in frontend
JavaScript or commit the local file.

From the prototype root:

```bash
python3 tools/serve.py
```

Open `http://localhost:8766/pages/malaria/dashboard.html` or
`http://localhost:8766/pages/malaria/reports.html`. The local preview forwards
read-only `/api/*` requests to `http://127.0.0.1:8080`. Use `--backend URL` or
`--port PORT` to change those defaults. This is a local development server.

For deployment, proxy `/api` to the backend, or set `baseUrl` in
`scripts/shared/api-config.js` to an HTTPS backend origin and configure backend CORS.
A plain static server alone does not forward `/api`.

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

Live verification on 28 October 2026 confirmed database readiness, 44,680 projected
ward-month records across January–October 2026, and 44,480 complete scoring records.
The other 200 records were excluded for missing required inputs. The live browser
check confirmed ward scoring, timeline changes, report totals, zero CSV reads and
zero JavaScript errors. Backend tests passed (3 tests), along with frontend API
unit tests and desktop/mobile browser checks.

Both repositories use `API-integration`; backend work starts from GitHub `main`
commit `e6c79ee`. Database access is read-only; no database records were modified.
