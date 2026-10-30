'use strict';
const http = require('node:http');
const https = require('node:https');
const { pipeline } = require('node:stream');
const DEFAULT_CONFIG = require('../config/api.json');
const RETRY_STATUSES = new Set([502, 503, 504]);

/**
 * validate_config()
 * -----------------
 * Validate named backend origins and hosted-first Auto ordering at startup.
 *
 * Parameters:
 * -----------
 * config: object — Source selection configuration.
 *
 * Returns:
 * --------
 * object
 */
function validate_config(config) {
  if (!['hosted', 'local', 'auto'].includes(config.defaultTarget))
    throw new Error('API target must be hosted, local or auto.');
  const required =
    config.defaultTarget === 'auto' || config.browserSelectionEnabled === true
      ? ['hosted', 'local']
      : [config.defaultTarget];
  if (required.some((name) => !config.targets?.[name]))
    throw new Error('Required API target is not configured.');
  for (const name of Object.keys(config.targets || {})) {
    const origin = new URL(config.targets[name]);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash
    ) {
      throw new Error('Backend must be an HTTP(S) origin without a path or credentials.');
    }
  }
  if (
    config.autoOrder &&
    JSON.stringify(config.autoOrder) !== JSON.stringify(['hosted', 'local'])
  ) {
    throw new Error('Auto must try hosted first, then local.');
  }
  return config;
}

/**
 * resolve_backend()
 * -----------------
 * Resolve an explicit origin or the first origin for the configured source mode.
 * This helper does not make network requests.
 *
 * Parameters:
 * -----------
 * options: object — Optional api_config, api_target and backend overrides.
 *
 * Returns:
 * --------
 * URL
 */
function resolve_backend(options = {}) {
  const config = validate_config(options.api_config || DEFAULT_CONFIG);
  const mode = options.api_target || config.defaultTarget;
  if (!['hosted', 'local', 'auto'].includes(mode))
    throw new Error('API target must be hosted, local or auto.');
  if (mode === 'auto' && !options.backend && (!config.targets.hosted || !config.targets.local)) {
    throw new Error('Auto requires hosted and local targets.');
  }
  const backend = options.backend || config.targets[mode === 'auto' ? 'hosted' : mode];
  if (!backend) throw new Error('Selected API target is not configured.');
  // Reuse origin validation for explicit CLI overrides as well.
  validate_config({ ...config, targets: { ...config.targets, hosted: backend } });
  return new URL(backend);
}

/**
 * create_api_router()
 * -------------------
 * Isolate optional browser selection and hosted-first failover from page/data code.
 * Disabled selection ignores browser overrides, including previously saved choices.
 *
 * Parameters:
 * -----------
 * options: object — Source configuration, CLI defaults and request timeout.
 * send_error: function — Shared JSON error response helper.
 *
 * Returns:
 * --------
 * object — Public settings and the read-only request forwarding function.
 */
function create_api_router(options, send_error) {
  const config = validate_config(options.api_config || DEFAULT_CONFIG);
  const defaultMode = options.api_target || config.defaultTarget;
  resolve_backend(options);
  const enabled = config.browserSelectionEnabled === true && !options.backend;
  const settings = {
    defaultTarget: defaultMode,
    browserSelectionEnabled: enabled,
    modes: ['hosted', 'local', 'auto'],
    autoOrder: ['hosted', 'local'],
  };

  /**
   * forward()
   * ---------
   * Forward one complete request; Auto retries hosted failures on local only before
   * any response body is sent. Manual modes never fail over. Client URLs are rejected.
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
    const override = enabled ? request.headers['x-eoha-api-target'] : undefined;
    const mode = override || defaultMode;
    if (!['hosted', 'local', 'auto'].includes(mode)) {
      send_error(
        response,
        400,
        'API target must be hosted, local or auto.',
        request.method === 'HEAD',
      );
      return;
    }
    const candidates = options.backend
      ? [{ name: 'custom', url: resolve_backend(options) }]
      : (mode === 'auto' ? ['hosted', 'local'] : [mode]).map((name) => ({
          name,
          url: new URL(config.targets[name]),
        }));
    let active;
    let finished = false;
    const attempt = (index) => {
      if (response.destroyed || finished) return;
      const candidate = candidates[index];
      const transport = candidate.url.protocol === 'https:' ? https : http;
      let settled = false;
      const upstream = transport.request(
        {
          protocol: candidate.url.protocol,
          hostname: candidate.url.hostname,
          port: candidate.url.port || undefined,
          path: request.url,
          method: request.method,
          headers: { Accept: 'application/json' },
        },
        (incoming) => {
          settled = true;
          if (index + 1 < candidates.length && RETRY_STATUSES.has(incoming.statusCode)) {
            // Discard the failed response; never combine records from two responses.
            incoming.destroy();
            attempt(index + 1);
            return;
          }
          finished = true;
          response.writeHead(incoming.statusCode, {
            'Content-Type': incoming.headers['content-type'] || 'application/json',
            'Cache-Control': 'no-store',
            'X-EOHA-API-Source': candidate.name,
            'X-EOHA-API-Mode': mode,
          });
          pipeline(incoming, response, () => {});
        },
      );
      active = upstream;
      upstream.setTimeout(
        options.timeout_ms || (mode === 'auto' && !options.backend ? 25000 : 60000),
        () => {
          const error = new Error('Backend timeout');
          error.code = 'UPSTREAM_TIMEOUT';
          upstream.destroy(error);
        },
      );
      upstream.on('error', (error) => {
        if (settled || finished || response.destroyed) return;
        settled = true;
        if (index + 1 < candidates.length) {
          attempt(index + 1);
          return;
        }
        finished = true;
        response.setHeader('X-EOHA-API-Source', candidate.name);
        response.setHeader('X-EOHA-API-Mode', mode);
        const timeout = error.code === 'UPSTREAM_TIMEOUT';
        send_error(
          response,
          timeout ? 504 : 502,
          timeout ? 'EOHA backend timed out' : 'EOHA backend unavailable',
          request.method === 'HEAD',
        );
      });
      upstream.end();
    };
    response.on('close', () => {
      if (!response.writableFinished) active?.destroy();
    });
    attempt(0);
  }
  return { settings, forward };
}
module.exports = { create_api_router, resolve_backend };
