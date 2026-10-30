(function (global) {
  const params = new URLSearchParams(global.location ? global.location.search : '');
  const base = (params.get('api') || '').replace(/\/$/, '');
  const PAGE_SIZE = 500;
  const MAX_PAGES = 40;

  async function getJson(path, query) {
    const url = base + path + (query ? '?' + new URLSearchParams(query) : '');
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const body = await response.json();
    if (!body || body.success === false) throw new Error((body && body.message) || 'API error');
    return body.data;
  }

  async function fetchAll(path, query, onProgress) {
    const items = [];
    let total = Infinity;
    let truncated = false;
    for (let page = 0; items.length < total; page += 1) {
      if (page >= MAX_PAGES) {
        truncated = true;
        break;
      }
      const data = await getJson(path, { ...query, limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      items.push(...data.items);
      total = data.total;
      if (onProgress) onProgress(items.length, total);
      if (!data.items.length) break;
    }
    return { items, total, truncated };
  }

  global.BiosecApi = {
    base,
    variables: () => fetchAll('/api/environmental-variables', {}),
    observations: (variableId, onProgress) => fetchAll('/api/environmental-observations', { variableId }, onProgress),
    regions: onProgress => fetchAll('/api/regions', {}, onProgress)
  };
})(window);
