# NCD synthetic scenario data v2

107,232 ward-month scenarios cover 4,468 wards across nine provinces, January 2025–December 2026. These are synthetic scenarios, not observed conditions, disease probabilities, or validated forecasts.

Run `python3 data-pipeline/generate_ncd_mock.py` to reproduce both CSV and fixed reference manifest. Version: `synthetic-monthly-2026-v2`. This replaces v1; scores across versions are not directly comparable.

Ward geography, January temperature anchors and fixed population density come from January 2026 in the shared CSV. Missing anchors use the province median. All other environmental measurements are generated. January measurements are scenario anchors, not validated climatological normals.

The model uses a smooth Southern Hemisphere seasonal temperature cycle, longitude-dependent seasonal amplitude, persistent ward differences and shared province-month weather anomalies. Daily-minimum and maximum monthly means share the same temperature anomaly and remain ordered. Humidity varies inversely with temperature anomalies. Pollution follows a positive skewed distribution linked to density, with a winter increase and persistent local differences. These are illustrative assumptions, not an emissions inventory or meteorological model. Density stays fixed between months. About 2.5% of records have incomplete valid-day counts and are excluded from scores by existing eligibility rules.

Fixed province/calendar-month reference distributions are independently simulated with the same model, rather than uniform ramps or references recomputed for map selections. Heat/cold tail formulas and pollution percentile formulas are unchanged. High/medium/low colours remain prototype display bands, not clinical thresholds. Real-data scoring remains disabled.

Limitations: no elevation, coastal-distance, transport, industrial emissions or validated local climate model; broad provincial references can misrepresent local extremes. No synthetic values should be substituted for measured health or environmental evidence. Months beyond the present are scenarios, not predictions.
