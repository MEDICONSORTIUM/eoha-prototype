// Same-origin /api is forwarded by tools/serve.cjs (or a production reverse proxy).
window.EOHA_API_CONFIG = {
  baseUrl: '/api',
  riskEndpoint: '/malaria-risk-inputs',
  timeoutMs: 60000,
};
