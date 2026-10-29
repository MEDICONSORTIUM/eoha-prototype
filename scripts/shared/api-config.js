// Same-origin /api is forwarded by tools/serve.py (or a production reverse proxy).
window.EOHA_API_CONFIG = {
  baseUrl: '/api',
  riskEndpoint: '/malaria-risk-inputs',
  timeoutMs: 60000,
};
