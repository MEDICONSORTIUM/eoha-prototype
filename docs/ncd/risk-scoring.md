# NCD environmental exposure scoring schema v0.1.0

Status: draft for review. Scoring remains disabled.

This specification records the direction proposed in the prior EOHA scoring discussion: separate pollution, heat and cold exposure panels at ward level across all nine South African provinces. These are environmental indicators, not individual disease probabilities. There is no combined NCD score, disease-specific risk weight, or clinical alert threshold in this version.

## Artifacts and scope

- `schemas/ncd/risk-record.schema.json`: JSON Schema Draft 2020-12 record contract.

The contract deliberately requires `scoring_enabled: false`, null component scores and a null combined score. A future reviewed schema version must explicitly enable computed scores. The dashboard displays historical environmental measurements without computing NCD exposure scores.

## Candidate formulas for review

Let `clip(x,0,1) = min(1,max(0,x))`. All candidate scores use a 0–100 point scale; do not append a percent sign or label them disease risk.

| Component | Candidate formula | Meaning |
| --- | --- | --- |
| Pollution | `100 * F_reference(daily_pm25_ug_m3)` | Rank of daily PM2.5 in a frozen reference distribution |
| Heat | `100 * clip((p_hot - 0.90) / 0.10, 0, 1)` | Upper-tail local seasonal temperature anomaly |
| Cold | `100 * clip((0.10 - p_cold) / 0.10, 0, 1)` | Proposed symmetric lower-tail anomaly, awaiting review |

The heat and pollution formulas were proposed previously; the cold formula is an explicit draft extension. Define the empirical CDF as `count(reference_value <= x) / N`, including ties, with a nonempty frozen sample. `p_hot` and `p_cold` are fractions from the appropriate local seasonal CDF. A percentile of 0.97 gives 70 heat points; 0.03 gives 70 cold points; pollution percentile 0.82 gives 82 points. Missing percentiles yield null, never zero. A valid zero is a real score.

Before implementation, select and freeze reference years, seasonal windows, minimum sample size, geographic fallback rules, temperature variables, aggregation and product versions. Record these in a versioned reference manifest with a content hash. Never recompute the reference from the current map selection. Forecast and historical products require separate calibration and backtesting. Absolute temperature and humidity must remain visible; anomaly points alone do not authorize health alerts. No Low/Moderate/High bands are defined yet.

## Record contract

One record represents one ward and one half-open interval `[start, end)` in Africa/Johannesburg. IDs are strings to preserve leading zeros. Boundary version and municipality code are required. `generated_at` is the processing timestamp. Forecast issue time and lead hours belong to each observation so distinct source products remain traceable. Dataset ID, band and product version must identify the actual extraction source.

Raw inputs use explicit units in their variable names: PM2.5 in micrograms per cubic metre, air temperature in degrees Celsius and relative humidity in percent. Satellite land surface temperature is not interchangeable with air temperature. Retain raw values even when coverage prevents reference eligibility. Reject non-finite numbers; missing values are JSON null.

Daily records are the intended monitoring support. Monthly and rolling annual records retain their own temporal support and coverage. Do not apply a daily reference CDF to monthly or annual means. Monthly reports should distinguish mean concentration, mean daily score (future only), valid-day count and completeness. Rolling annual pollution requires a documented window and completeness policy before calculation.

## Aggregation, quality and provenance

Record the actual spatial aggregation. Area-weighted values must never be described as population-weighted exposure. Population weighting requires a versioned population reference, valid weights and a nonzero denominator. Future province or national summaries must be calculated from compatible ward inputs and explicit weights; averaging percentile scores does not produce a province-level percentile.

Coverage is a fraction in [0,1], or null if unknown. `eligible_for_reference` describes input suitability only; it never enables scoring. True eligibility requires a finite raw value, known spatial and temporal coverage and no quality flags. Additional application validation must enforce approved coverage thresholds, freshness and source verification; no numeric thresholds are invented here. Any missing, invalid, stale, partial or insufficient input must be flagged and made ineligible. Do not fill missing data with zero, silently carry it forward, or normalize remaining components into a combined score.

The JSON Schema checks types, allowed variables, physical bounds for PM2.5 and humidity, null scores, provenance fields and selected conditional rules. A validator must enable date-time format checking. Application checks must additionally verify start < end, interval alignment, forecast lead/valid-time consistency, component-variable membership (pollution: PM2.5; heat/cold: appropriate air temperature and optional humidity), duplicate observations, flag completeness, product units and coverage thresholds. JSON Schema does not establish scientific validity or verify source access.

## Acceptance and release gates

1. The schema must reject numeric scores and enabled scoring until a reviewed version enables them.
2. Reject negative PM2.5, humidity outside [0,100], coverage outside [0,1], and forecast observations without issue time or lead hours.
3. Reject reference eligibility with missing value, missing coverage or quality flags; retain the raw observation in an ineligible record.
4. Reject population weighting without population provenance and unknown fields (including accidental disease probabilities).
5. Before scoring release: approve the formulas and reference manifest, implement the semantic checks above, verify live source units and coverage, backtest historical and forecast behaviour, and review display language. Publish a new schema version with numerical boundary tests.

The current repository extractor exports monthly malaria-oriented fields and does not yet supply the daily PM2.5, temperature extrema, coverage and source provenance needed here. No data extraction or Earth Engine export is triggered by these artifacts.

## Shared CSV dashboard integration

The NCD dashboard reads `data/malaria/Limpopo_Risk_Jan25_Jan26_Safe.csv`, the same source as the malaria dashboard. Despite its filename, the checked dataset contains 58,084 records across all nine provinces; January 2026 contains 4,468 wards. Month, province, municipality and ward filters select historical records. Leaflet markers represent observation locations, not disease risk. Available air temperature, surface temperature and population density are displayed in their original units; regional values are unweighted means with valid-value counts. Blank and invalid values remain unavailable. These monthly measurements do not meet the daily pollution/heat/cold scoring contract, so scores remain null and no reference eligibility is inferred.
