(function (global) {
  const SITES = [
    { province: 'Western Cape', municipality: 'City of Cape Town Metropolitan Municipality', lat: -33.92, lng: 18.45, code: 'CPT' },
    { province: 'KwaZulu-Natal', municipality: 'eThekwini Metropolitan Municipality', lat: -29.9, lng: 30.98, code: 'DUR' },
    { province: 'Eastern Cape', municipality: 'Nelson Mandela Bay Metropolitan Municipality', lat: -33.93, lng: 25.58, code: 'GQE' }
  ];
  const WARDS_PER_SITE = 24;
  const MONTHS = 14;

  function seeded(seed) {
    let state = seed;
    return function next() {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  function build() {
    const random = seeded(2026);
    const variable = { variable_id: 9001, variable_code: 'biosecurity_preview_index', variable_name: 'Biosecurity indicator (preview)', unit: 'index', category: 'Biosecurity' };
    const regions = [];
    const observations = [];
    let regionId = 100000;
    let observationId = 1;
    SITES.forEach(site => {
      for (let w = 1; w <= WARDS_PER_SITE; w += 1) {
        regionId += 1;
        const lat = site.lat + (random() - 0.5) * 0.35;
        const lng = site.lng + (random() - 0.5) * 0.45;
        const base = 20 + random() * 50;
        regions.push({ region_id: regionId, region_name: site.code + '_' + w, region_type: 'Ward', province: site.province });
        for (let m = 0; m < MONTHS; m += 1) {
          const date = new Date(Date.UTC(2025, m, 1) - 2 * 3600 * 1000);
          const wave = Math.sin((m / 12) * Math.PI * 2) * 12;
          observations.push({
            observation_id: observationId++,
            region_id: regionId,
            variable_id: variable.variable_id,
            observation_month: date.toISOString(),
            statistic: 'mean',
            value: Math.max(0, Math.min(100, base + wave + (random() - 0.5) * 10)),
            metadata: JSON.stringify({ municipality: site.municipality, latitude: lat, longitude: lng })
          });
        }
      }
    });
    return { variables: [variable], regions, observations };
  }

  global.BiosecPreview = { build };
})(window);
