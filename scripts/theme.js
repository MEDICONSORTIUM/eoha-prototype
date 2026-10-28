// Apply before first paint. A missing preference follows the operating system.
(function () {
  const key = 'eoha-theme';
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = 'system';
  try {
    const saved = localStorage.getItem(key);
    if (['light', 'dark', 'system'].includes(saved)) preference = saved;
  } catch (_) { /* Theme controls still work when storage is unavailable. */ }
  function apply() {
    const theme = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === preference));
    });
    window.dispatchEvent(new CustomEvent('eoha:themechange', { detail: { theme, preference } }));
  }
  window.setThemePreference = function (next) {
    if (!['system', 'light', 'dark'].includes(next)) return;
    preference = next;
    try { localStorage.setItem(key, next); } catch (_) { /* Session-only preference. */ }
    apply();
  };
  media.addEventListener('change', () => { if (preference === 'system') apply(); });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = ['light', 'dark', 'system'].includes(event.newValue) ? event.newValue : 'system';
      apply();
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => window.setThemePreference(button.dataset.themeChoice));
    });
    apply();
  });
  apply();
}());
