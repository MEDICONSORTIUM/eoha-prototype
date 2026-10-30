'use strict';
const http = require('node:http');
const https = require('node:https');
const { pipeline } = require('node:stream');
const CONFIG = require('../config/api.json');

/**
 * resolve_backend()
 * -----------------
 * Resolve the sole hosted backend. Programmatic overrides support isolated tests;
 * browser source preferences and removed local/Auto profiles cannot select a backend.
 *
 * Parameters:
 * -----------
 * options: object — Optional backend origin for server tests.
 *
 * Returns:
 * --------
 * URL
 */
function resolve_backend(options = {}) {
  if (options.api_target && options.api_target !== 'hosted')
    throw new Error('Only the hosted API is supported.');
  const backend = new URL(
    options.backend || options.api_config?.targets?.hosted || CONFIG.targets.hosted,
  );
  if (
    !['http:', 'https:'].includes(backend.protocol) ||
    backend.username ||
    backend.password ||
    backend.pathname !== '/' ||
    backend.search ||
    backend.hash
  ) {
    throw new Error('Backend must be an HTTP(S) origin without a path or credentials.');
  }
  return backend;
}

/**
 * create_api_router()
 * -------------------
 * Forward requests to the hosted API only and preserve upstream compression.
 * Saved source headers are ignored; there is no local backend or automatic failover.
 *
 * Parameters:
 * -----------
 * options: object — Optional test backend and request timeout.
 * send_error: function — Shared JSON error response helper.
 *
 * Returns:
 * --------
 * object — Hosted-only compatibility settings and request forwarding function.
 */
function create_api_router(options, send_error) {
  const backend = resolve_backend(options);
  const settings = {
    defaultTarget: 'hosted',
    browserSelectionEnabled: false,
    modes: ['hosted'],
  };
  /**
   * forward()
   * ---------
   * Stream a hosted response without decompressing/recompressing it in the proxy.
   * Browsers decode gzip automatically, reducing transfer size for large datasets.
   *
   * Parameters:
   * -----------
   * request: http.IncomingMessage — Browser GET/HEAD request.
   * response: http.ServerResponse — Browser response.
   *
   * Returns:
   * --------
   * void
   */
  function forward(request, response) {
    const transport = backend.protocol === 'https:' ? https : http;
    const upstream = transport.request(
      {
        protocol: backend.protocol,
        hostname: backend.hostname,
        port: backend.port || undefined,
        path: request.url,
        method: request.method,
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': request.headers['accept-encoding'] || 'identity',
        },
      },
      (incoming) => {
        const headers = {
          'Content-Type': incoming.headers['content-type'] || 'application/json',
          'Cache-Control': 'no-store',
          'X-EOHA-API-Source': 'hosted',
        };
        if (incoming.headers['content-encoding'])
          headers['Content-Encoding'] = incoming.headers['content-encoding'];
        response.writeHead(incoming.statusCode, headers);
        pipeline(incoming, response, () => {});
      },
    );
    upstream.setTimeout(options.timeout_ms || 60000, () => {
      const error = new Error('Backend timeout');
      error.code = 'UPSTREAM_TIMEOUT';
      upstream.destroy(error);
    });
    upstream.on('error', (error) => {
      if (response.destroyed) return;
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const timeout = error.code === 'UPSTREAM_TIMEOUT';
      send_error(
        response,
        timeout ? 504 : 502,
        timeout ? 'Hosted API timed out' : 'Hosted API unavailable',
        request.method === 'HEAD',
      );
    });
    response.on('close', () => {
      if (!response.writableFinished) upstream.destroy();
    });
    upstream.end();
  }
  return { settings, forward };
}
module.exports = { create_api_router, resolve_backend };
