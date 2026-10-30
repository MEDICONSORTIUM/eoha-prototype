(function (root) {
  'use strict';
  /**
   * numeric()
   * ---------
   * Convert a measurement to a number while preserving missing inputs as NaN.
   *
   * Parameters:
   * -----------
   * value: unknown — The value to convert or escape.
   *
   * Returns:
   * --------
   * number
   */
  const numeric = (value) =>
    value === null || value === undefined || value === '' ? NaN : Number(value);
  const required = ['Soil_Moisture', 'LST_Surface_C', 'NDWI_Water', 'Population_Density_Per_KM2'];
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  /**
   * score()
   * -------
   * Calculate the existing four-factor malaria risk score. Return null when any required
   * measurement is missing.
   *
   * Parameters:
   * -----------
   * row: object — A ward observation with the measurements required by this operation.
   *
   * Returns:
   * --------
   * number | null
   */
  function score(row) {
    if (!required.every((key) => Number.isFinite(numeric(row[key])))) return null;
    return (
      (row.Soil_Moisture > 0.35 ? 40 : row.Soil_Moisture > 0.25 ? 20 : 0) +
      (row.LST_Surface_C >= 25 && row.LST_Surface_C <= 30 ? 30 : 0) +
      (row.NDWI_Water > -0.1 ? 20 : 0) +
      (row.Population_Density_Per_KM2 > 300 ? 10 : 0)
    );
  }

  /**
   * escapeHtml()
   * ------------
   * Escape database text before inserting it into report rows or map popup markup.
   *
   * Parameters:
   * -----------
   * value: unknown — The value to convert or escape.
   *
   * Returns:
   * --------
   * string
   */
  function escapeHtml(value) {
    return String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  }

  /**
   * normalize()
   * -----------
   * Translate backend ward-month records into UI fields and exclude incomplete or invalid scoring
   * records.
   *
   * Parameters:
   * -----------
   * inputs: Array<object> — Ward-month records returned by the backend.
   *
   * Returns:
   * --------
   * object
   */
  function normalize(inputs) {
    if (!Array.isArray(inputs)) throw new Error('Invalid malaria API response.');
    const rows = [];
    for (const input of inputs) {
      // The backend formats SQL DATE as text so timezone conversion cannot move it into the previous month.
      const date = input.observation_month;
      if (
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date
      )
        continue;
      const row = {
        WardID: String(input.region_code ?? input.region_id),
        WardLabel: input.region_name,
        Municipali: input.municipality,
        Province: input.province || '—',
        latitude: numeric(input.latitude),
        longitude: numeric(input.longitude),
        LST_Surface_C: numeric(input.lst_c),
        Soil_Moisture: numeric(input.soil_moisture),
        NDWI_Water: numeric(input.ndwi),
        Population_Density_Per_KM2: numeric(input.population_density_per_km2),
        Air_Temp_C: Number.isFinite(numeric(input.air_temp_c)) ? numeric(input.air_temp_c) : null,
        Agric_Percentage: Number.isFinite(numeric(input.agric_percentage))
          ? numeric(input.agric_percentage)
          : null,
        date,
        Month: `${months[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`,
      };
      if (row.WardLabel && row.Municipali && score(row) !== null) rows.push(row);
    }
    return { rows, excluded: inputs.length - rows.length };
  }

  /**
   * load()
   * ------
   * Request the joined malaria measurements, validate the response and return complete scoring
   * records and an exclusion count.
   *
   * Parameters:
   * -----------
   * config: object — API base URL, endpoint path and request timeout.
   * fetcher: function — The fetch implementation; tests may provide a controlled replacement.
   *
   * Returns:
   * --------
   * Promise<object>
   */
  async function load(
    config = root.EOHA_API_CONFIG,
    fetcher = root.EOHA_API_SOURCE?.fetch || root.fetch.bind(root),
  ) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs || 60000);
    try {
      const response = await fetcher(config.baseUrl.replace(/\/$/, '') + config.riskEndpoint, {
        signal: controller.signal,
      });
      if (response.status === 404) {
        throw new Error(
          'Malaria API endpoint unavailable (404). Deploy /api/malaria-risk-inputs to the selected backend.',
        );
      }
      if (response.status === 503) {
        throw new Error(
          'Backend database unavailable (503). Check /api/health/database on the selected backend.',
        );
      }
      if (!response.ok) {
        throw new Error(
          `Backend request failed (${response.status}). Check API and database health.`,
        );
      }
      const body = await response.json();
      if (body.success !== true)
        throw new Error(body.message || 'Backend returned an unsuccessful response.');
      const result = normalize(body.data);
      if (!result.rows.length)
        throw new Error(
          'No complete malaria scoring records from the API. Required measurements or region metadata are missing.',
        );
      return result;
    } finally {
      clearTimeout(timer);
    }
  }
  const api = { load, normalize, score, escapeHtml };
  root.EOHAMalariaAPI = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
