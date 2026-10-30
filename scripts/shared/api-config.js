// Same-origin /api uses configurable Hosted/Local/hosted-first Auto routing.
// Optional browser selection is isolated in api-selector.js; see config/api.json.
// Keep this relative to avoid cross-origin browser requests to Render.
window.EOHA_API_CONFIG = {
  baseUrl: '/api',
  riskEndpoint: '/malaria-risk-inputs',
  timeoutMs: 60000,
};
