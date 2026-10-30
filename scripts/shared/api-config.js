// All application requests use the hosted Render backend through the Node proxy.
// Live Server on 5500/5501 needs the proxy on 8766 because it cannot forward /api.
(function (root) {
  const location = root.location;
  const liveServer =
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) &&
    ['5500', '5501'].includes(location.port);
  root.EOHA_API_CONFIG = {
    baseUrl: liveServer ? location.protocol + '//' + location.hostname + ':8766/api' : '/api',
    riskEndpoint: '/malaria-risk-inputs',
    timeoutMs: 60000,
    cacheTtlMs: 300000,
  };
})(window);
