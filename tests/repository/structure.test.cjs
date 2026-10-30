'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');

/**
 * files_in()
 * ----------
 * Recursively list files for local reference and runtime checks.
 *
 * Parameters:
 * -----------
 * directory: string — The source directory to inspect.
 *
 * Returns:
 * --------
 * Array<string>
 */
function files_in(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? files_in(file) : [file];
  });
}

/**
 * local_target()
 * --------------
 * Resolve a local asset reference while ignoring external URLs and anchors.
 *
 * Parameters:
 * -----------
 * source: string — The HTML or CSS file containing the reference.
 * reference: string — The resource URL to resolve.
 *
 * Returns:
 * --------
 * string | null
 */
function local_target(source, reference) {
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(reference)) return null;
  const pathname = decodeURIComponent(reference.split(/[?#]/)[0]);
  if (!pathname) return null;
  return path.resolve(
    pathname.startsWith('/') ? ROOT : path.dirname(source),
    pathname.replace(/^\//, ''),
  );
}

test('all local HTML navigation and resource references exist', () => {
  for (const source of [
    path.join(ROOT, 'index.html'),
    ...files_in(path.join(ROOT, 'pages')).filter((file) => file.endsWith('.html')),
  ]) {
    for (const match of fs
      .readFileSync(source, 'utf8')
      .matchAll(/\b(?:href|src|poster)\s*=\s*["']([^"']+)["']/g)) {
      const target = local_target(source, match[1]);
      if (target) assert.ok(fs.statSync(target).isFile(), `${source}: ${match[1]}`);
    }
  }
});
test('all local CSS assets exist', () => {
  for (const source of files_in(path.join(ROOT, 'styles')).filter((file) =>
    file.endsWith('.css'),
  )) {
    for (const match of fs.readFileSync(source, 'utf8').matchAll(/url\(["']?([^\)"']+)/g)) {
      const target = local_target(source, match[1]);
      if (target) assert.ok(fs.statSync(target).isFile(), `${source}: ${match[1]}`);
    }
  }
});
test('legacy routes have distinct existing destinations', () => {
  for (const [old, destination] of Object.entries(require('../../config/routes.json'))) {
    assert.notEqual(old, destination);
    assert.ok(fs.statSync(path.join(ROOT, destination)).isFile());
  }
});
test('demo files and synthetic runtime generators remain removed', () => {
  for (const folder of ['scripts', 'data', 'pages', 'tools']) {
    for (const source of files_in(path.join(ROOT, folder))) {
      assert.doesNotMatch(path.basename(source), /ncd[-_]mock|ncd[-_]demo|generate_ncd_mock/);
      if (source.endsWith('.js') && !source.includes(`${path.sep}vendor${path.sep}`)) {
        assert.doesNotMatch(
          fs.readFileSync(source, 'utf8'),
          /\b(?:Math\.random|FORECAST_DATA|NcdDemo|isDemo)\b/,
        );
      }
    }
  }
});

test('feature navigation retains the same order on every page', () => {
  for (const feature of ['malaria', 'ncd']) {
    for (const page of ['dashboard', 'forecasting', 'resources', 'reports']) {
      const html = fs.readFileSync(path.join(ROOT, 'pages', feature, page + '.html'), 'utf8');
      const nav = html.match(/<nav class="nav-pill"[^>]*>([\s\S]*?)<\/nav>/)[1];
      assert.deepEqual([...nav.matchAll(/href="([^"]+)"/g)].map(match => match[1]),
        ['dashboard.html', 'forecasting.html', 'resources.html', 'reports.html']);
      assert.equal([...nav.matchAll(/aria-current="page"/g)].length, 1);
      assert.match(nav, new RegExp('href="' + page + '\\.html" class="active" aria-current="page"'));
    }
  }
});
