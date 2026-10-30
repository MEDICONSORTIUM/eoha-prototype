(function (global) {
  const params = new URLSearchParams(global.location ? global.location.search : '');
  const base = (params.get('api') || '').replace(/\/$/, '');
  const PAGE_SIZE = 500;
  const CONCURRENCY = 8;

  async function getJson(path, query) {
    const url = base + path + (query ? '?' + new URLSearchParams(query) : '');
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const body = await response.json();
    if (!body || body.success === false) throw new Error((body && body.message) || 'API error');
    return body.data;
  }

  async function fetchAll(path) {
    const items = [];
    let total = Infinity;
    for (let offset = 0; items.length < total; offset += PAGE_SIZE) {
      const data = await getJson(path, { limit: PAGE_SIZE, offset });
      items.push(...data.items);
      total = data.total;
      if (!data.items.length) break;
    }
    return { items, total };
  }

  async function streamObservations(onItems, onProgress) {
    const path = '/api/environmental-observations';
    const first = await getJson(path, { limit: PAGE_SIZE, offset: 0 });
    const pages = Math.ceil(first.total / PAGE_SIZE);
    let done = 1;
    let next = 1;
    onItems(first.items);
    if (onProgress) onProgress(done, pages);
    async function worker() {
      while (next < pages) {
        const page = next;
        next += 1;
        const data = await getJson(path, { limit: PAGE_SIZE, offset: page * PAGE_SIZE });
        onItems(data.items);
        done += 1;
        if (onProgress) onProgress(done, pages);
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, Math.max(pages - 1, 0)) }, worker));
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('eoha-biosecurity', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('cache');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function withTimeout(promise, ms, fallback) {
    return Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallback), ms))]);
  }

  async function cacheGet() {
    const read = (async () => {
      try {
        const db = await openDb();
        return await new Promise(resolve => {
          const request = db.transaction('cache').objectStore('cache').get('wards');
          request.onsuccess = () => resolve(request.result || null);
          request.onerror = () => resolve(null);
        });
      } catch (_) {
        return null;
      }
    })();
    return withTimeout(read, 2000, null);
  }

  async function cacheSet(value) {
    try {
      const db = await openDb();
      await new Promise(resolve => {
        const tx = db.transaction('cache', 'readwrite');
        tx.objectStore('cache').put(value, 'wards');
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    } catch (_) {
      return;
    }
  }

  global.BiosecApi = {
    base,
    variables: () => fetchAll('/api/environmental-variables'),
    regions: () => fetchAll('/api/regions'),
    etlRuns: () => fetchAll('/api/etl-runs'),
    observationTotal: async () => (await getJson('/api/environmental-observations', { limit: 1, offset: 0 })).total,
    streamObservations,
    cacheGet,
    cacheSet
  };
})(typeof window !== 'undefined' ? window : globalThis);
