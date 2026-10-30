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

  function parseMeta(meta) {
    if (!meta) return {};
    if (typeof meta === 'object') return meta;
    try {
      return JSON.parse(meta);
    } catch (_) {
      return {};
    }
  }

  function createWardBuilder(codeById, regionsById) {
    const wards = new Map();
    function add(items) {
      items.forEach(observation => {
        const code = codeById.get(observation.variable_id);
        if (!code || observation.value === null || observation.value === undefined) return;
        const value = Number(observation.value);
        if (!Number.isFinite(value)) return;
        let ward = wards.get(observation.region_id);
        if (!ward) {
          const meta = parseMeta(observation.metadata);
          const region = regionsById.get(observation.region_id) || {};
          const lat = Number(meta.latitude);
          const lng = Number(meta.longitude);
          ward = {
            regionId: observation.region_id,
            ward: region.region_name || 'Region ' + observation.region_id,
            province: region.province || '',
            municipality: meta.municipality || '',
            lat: Number.isFinite(lat) ? lat : null,
            lng: Number.isFinite(lng) ? lng : null,
            series: {}
          };
          wards.set(observation.region_id, ward);
        }
        const key = monthKey(observation.observation_month);
        if (!ward.series[key]) ward.series[key] = {};
        ward.series[key][code] = value;
      });
    }
    return { add, result: () => [...wards.values()] };
  }

  function meanOf(values) {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }

  global.BiosecData = { ramp, monthKey, parseMeta, createWardBuilder, meanOf };
})(typeof window !== 'undefined' ? window : globalThis);
