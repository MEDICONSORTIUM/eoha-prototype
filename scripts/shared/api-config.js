// Same-origin /api uses the hosted Render backend by default via tools/serve.cjs.
// Run npm run start:local to explicitly use the local backend; see config/api.json.
// Keep this relative to avoid cross-origin browser requests to Render.
window.EOHA_API_CONFIG = {
  baseUrl: '/api',
  riskEndpoint: '/malaria-risk-inputs',
  timeoutMs: 60000,
};
