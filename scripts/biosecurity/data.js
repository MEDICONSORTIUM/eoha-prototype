(function (global) {
  const GREEN = [52, 168, 83];
  const YELLOW = [249, 187, 6];
  const RED = [217, 48, 37];
  const SAST_OFFSET_MS = 2 * 3600 * 1000;

  function mix(a, b, t) {
    return a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
  }

  function ramp(t) {
    const clamped = Math.min(1, Math.max(0, t));
    const colour = clamped < 0.5 ? mix(GREEN, YELLOW, clamped * 2) : mix(YELLOW, RED, (clamped - 0.5) * 2);
    return 'rgb(' + colour.join(',') + ')';
  }

  function monthKey(iso) {
    const shifted = new Date(new Date(iso).getTime() + SAST_OFFSET_MS);
    return shifted.getUTCFullYear() + '-' + String(shifted.getUTCMonth() + 1).padStart(2, '0');
  }

  function isBiosecurityVariable(variable) {
    return /biosec/i.test(String(variable.category || '')) || /^biosec/i.test(String(variable.variable_code || ''));
  }

  function parseMeta(meta) {
    if (!meta) return {};
    if (typeof meta === 'object') return meta;
    try {
      return JSON.parse(meta);
    } catch (_) {
      return {};
    }
  }

  function toRows(observations, regionsById) {
    const rows = [];
    observations.forEach(obs => {
      const value = obs.value === null || obs.value === undefined ? null : Number(obs.value);
      if (value === null || !Number.isFinite(value)) return;
      const meta = parseMeta(obs.metadata);
      const region = regionsById.get(obs.region_id) || {};
      const lat = Number(meta.latitude);
      const lng = Number(meta.longitude);
      rows.push({
        regionId: obs.region_id,
        month: monthKey(obs.observation_month),
        value,
        ward: region.region_name || 'Region ' + obs.region_id,
        province: region.province || '',
        municipality: meta.municipality || '',
        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null
      });
    });
    return rows;
  }

  function aggregate(rows) {
    const byRegion = new Map();
    rows.forEach(row => {
      let item = byRegion.get(row.regionId);
      if (!item) {
        item = { regionId: row.regionId, ward: row.ward, province: row.province, municipality: row.municipality, lat: row.lat, lng: row.lng, sum: 0, n: 0 };
        byRegion.set(row.regionId, item);
      }
      item.sum += row.value;
      item.n += 1;
    });
    return [...byRegion.values()].map(item => ({ ...item, mean: item.sum / item.n }));
  }

  function meanOf(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }

  function rangeOf(values) {
    if (!values.length) return { min: null, max: null };
    return { min: Math.min(...values), max: Math.max(...values) };
  }

  function position(value, range) {
    if (value === null || range.min === null) return null;
    return range.max > range.min ? (value - range.min) / (range.max - range.min) : 0.5;
  }

  global.BiosecData = { ramp, monthKey, isBiosecurityVariable, parseMeta, toRows, aggregate, meanOf, rangeOf, position };
})(typeof window !== 'undefined' ? window : globalThis);
