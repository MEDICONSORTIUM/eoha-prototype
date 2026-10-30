# EOHA prototype developer guide

Use [README.md](README.md) for the current feature-folder structure, startup
commands, API flow, function-comment format and checks.

- Pages: `pages/<feature>/dashboard.html`, `reports.html`, `forecasting.html`, `resources.html`.
- Scripts: `scripts/<feature>/`, with reusable behavior in `scripts/shared/`.
- Styles: `styles/<feature>/`, with shared theme/layout styles in `styles/shared/`.
- Assets: `assets/images/`, `assets/icons/`, `assets/video/`.
- Data: retained real observations in `data/malaria/`; shared geographic boundaries in `data/shared/`.
- Tools: `tools/serve.cjs` and the real extraction utility in `tools/data-pipeline/`.
- Tests: feature subfolders under `tests/`.

Serve the repository with `node tools/serve.cjs`. The only upstream is Render,
configured in `config/api.json`; no local/Auto backend or browser selector remains.
Live Server loopback ports 5500/5501 use the Node bridge on port 8766, which must
be running. Preserve gzip forwarding and the five-minute successful-response browser
cache; neither failures nor responses without complete scoring records may become a cached fallback.
Keep database credentials on the backend.
Malaria dashboard/reports use the same formula in `scripts/malaria/api.js`.
Do not restore fabricated forecast values or synthetic NCD data. Unsupported
forecasts and NCD scoring have explicit unavailable states.

Add the requested purpose/Parameters/Returns comment to each named function.
Keep markup in HTML, styles in CSS and behavior in feature/shared scripts.
Preserve the theme's semantic tokens and load its script before first paint.
Update `config/routes.json` when moving a previously published page; the preview
implements these redirects, while deployment hosts require their own redirect rules.
