/* Optional UI: deleting this script leaves the normal /api data loader working. */
(function (root) {
  'use strict';
  const storageKey = 'eoha-api-target';
  let settings = { browserSelectionEnabled: false };
  let selected;
  let active;

  /**
   * render_selector()
   * -----------------
   * Populate optional source controls and display the backend actually used.
   *
   * Parameters:
   * -----------
   * none
   *
   * Returns:
   * --------
   * void
   */
  function render_selector() {
    document.querySelectorAll('[data-api-selector]').forEach((panel) => {
      panel.hidden = !settings.browserSelectionEnabled;
      if (panel.hidden) return;
      const select = panel.querySelector('[data-api-choice]');
      if (!select.options.length) {
        for (const [value, label] of [
          ['hosted', 'Hosted'],
          ['local', 'Local'],
          ['auto', 'Auto · Hosted → Local'],
        ]) {
          select.add(new Option(label, value));
        }
        select.addEventListener('change', () => {
          try {
            localStorage.setItem(storageKey, select.value);
          } catch {}
          // A reload discards the previous source's entire dataset.
          const url = new URL(location.href);
          url.searchParams.set('api', select.value);
          location.assign(url.href);
        });
      }
      select.value = selected;
      panel.querySelector('[data-api-active]').textContent = active
        ? 'Source: ' +
          ({ hosted: 'Hosted API', local: 'Local API', custom: 'Configured API' }[active] || active)
        : 'Connecting…';
    });
  }

  /**
   * load_settings()
   * ---------------
   * Read server policy and honor saved/query choices only when selection is enabled.
   * Failure hides this optional UI without preventing ordinary API requests.
   *
   * Parameters:
   * -----------
   * none
   *
   * Returns:
   * --------
   * Promise<void>
   */
  async function load_settings() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await root.fetch('/api-settings', {
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok) return;
      settings = await response.json();
      if (!settings.browserSelectionEnabled) return;
      selected = settings.defaultTarget;
      let saved;
      try {
        saved = localStorage.getItem(storageKey);
      } catch {}
      const query = new URLSearchParams(location.search).get('api');
      const preference = query || saved;
      if (settings.modes.includes(preference)) selected = preference;
      if (query && settings.modes.includes(query)) {
        try {
          localStorage.setItem(storageKey, query);
        } catch {}
      }
    } catch {
      settings = { browserSelectionEnabled: false };
    } finally {
      clearTimeout(timer);
      render_selector();
    }
  }
  const ready = load_settings();

  /**
   * source_fetch()
   * --------------
   * Apply an optional named source override to same-origin /api requests only.
   * Return the unmodified response and display the resolved source header.
   *
   * Parameters:
   * -----------
   * input: string — Relative API request URL.
   * options: object — Normal fetch options, including the loader's abort signal.
   *
   * Returns:
   * --------
   * Promise<Response>
   */
  async function source_fetch(input, options = {}) {
    await ready;
    const headers = new Headers(options.headers);
    const url = new URL(input, location.href);
    if (
      settings.browserSelectionEnabled &&
      selected &&
      url.origin === location.origin &&
      url.pathname.startsWith('/api/')
    ) {
      headers.set('X-EOHA-API-Target', selected);
    }
    const response = await root.fetch(input, { ...options, headers });
    active = response.headers.get('X-EOHA-API-Source');
    render_selector();
    return response;
  }
  root.EOHA_API_SOURCE = { fetch: source_fetch, ready };
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', render_selector);
  else render_selector();
})(window);
