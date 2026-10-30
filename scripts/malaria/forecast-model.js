/* Projections of environmental suitability, not disease cases or infection probabilities. */
(function (root) {
  const scoring = typeof module !== 'undefined' ? require('./api.js') : root.EOHAMalariaAPI;
  const fields = ['LST_Surface_C', 'Soil_Moisture', 'NDWI_Water'];
  const dayMs = 86400000;
  /**
   * monthEnd()
   * Purpose: Anchor monthly means to the end of their observation month in UTC.
   * Parameters: date (ISO date string).
   * Returns: number, UTC timestamp.
   */
  function monthEnd(date) {
    return Date.UTC(+date.slice(0, 4), +date.slice(5, 7), 0);
  }
  /**
   * project()
   * Purpose: Extrapolate recent inputs over actual elapsed days, with physical bounds.
   * Parameters: history (chronological rows), days (number), trend (boolean).
   * Returns: object of projected inputs.
   */
  function project(history, days, trend) {
    const last = history.at(-1), result = { ...last };
    for (const field of fields) {
      const recent = history.slice(-3);
      const x = recent.map(row => (monthEnd(row.date) - monthEnd(last.date)) / dayMs);
      const mx = x.reduce((a, b) => a + b, 0) / x.length;
      const my = recent.reduce((sum, row) => sum + row[field], 0) / recent.length;
      const denominator = x.reduce((sum, v) => sum + (v - mx) ** 2, 0);
      const slope = denominator ? recent.reduce((sum, row, i) => sum + (x[i] - mx) * (row[field] - my), 0) / denominator : 0;
      const value = last[field] + (trend ? slope * days : 0);
      result[field] = field === 'Soil_Moisture' ? Math.max(0, Math.min(1, value)) :
        field === 'NDWI_Water' ? Math.max(-1, Math.min(1, value)) : Math.max(-100, Math.min(80, value));
    }
    return result;
  }
  /**
   * forecast()
   * Purpose: Select a trend or persistence baseline per ward using a held-out month.
   * Parameters: rows (normalized API rows), days (integer 1–30).
   * Returns: object with daily aggregate scores, eligibility and holdout error.
   */
  function forecast(rows, days) {
    if (!Number.isInteger(days) || days < 1 || days > 30) throw new Error('Forecast horizon must be 1–30 days.');
    const valid = rows.filter(row => typeof row.date === 'string' && Number.isFinite(monthEnd(row.date)) && scoring.score(row) !== null);
    const anchor = valid.length ? Math.max(...valid.map(row => monthEnd(row.date))) : null;
    const wards = new Map();
    valid.forEach(row => { if (!wards.has(row.WardID)) wards.set(row.WardID, []); wards.get(row.WardID).push(row); });
    const eligible = [];
    for (const history of wards.values()) {
      const unique = new Map();
      history.forEach(row => { const key = row.date.slice(0, 7); unique.set(key, unique.has(key) ? null : row); });
      // Ambiguous duplicates are excluded rather than selected arbitrarily.
      const ordered = [...unique.values()].filter(Boolean).sort((a, b) => a.date.localeCompare(b.date));
      const recent = ordered.slice(-4);
      if (recent.length < 4 || monthEnd(recent.at(-1).date) !== anchor ||
        recent.some((row, i) => i && (monthEnd(row.date) - monthEnd(recent[i - 1].date)) / dayMs > 32)) continue;
      const training = recent.slice(0, -1), actual = scoring.score(recent.at(-1));
      const gap = (anchor - monthEnd(training.at(-1).date)) / dayMs;
      const persistenceError = Math.abs(scoring.score(project(training, gap, false)) - actual);
      const trendError = Math.abs(scoring.score(project(training, gap, true)) - actual);
      eligible.push({ history: recent, trend: trendError < persistenceError, error: Math.min(trendError, persistenceError) });
    }
    const points = [];
    if (eligible.length) for (let day = 0; day <= days; day++) {
      let total = 0, lower = 0, upper = 0;
      eligible.forEach(item => {
        const trend = scoring.score(project(item.history, day, true));
        const baseline = scoring.score(project(item.history, day, false));
        total += item.trend ? trend : baseline;
        lower += Math.min(trend, baseline); upper += Math.max(trend, baseline);
      });
      points.push({ date: new Date(anchor + day * dayMs).toISOString().slice(0, 10), value: total / eligible.length,
        lower: lower / eligible.length, upper: upper / eligible.length });
    }
    return { points, anchor, eligible: eligible.length, total: wards.size,
      error: eligible.length ? eligible.reduce((sum, item) => sum + item.error, 0) / eligible.length : null,
      trendWards: eligible.filter(item => item.trend).length };
  }
  const api = { forecast, project, monthEnd };
  if (typeof module !== 'undefined') module.exports = api;
  else root.EOHAForecast = api;
})(typeof window !== 'undefined' ? window : globalThis);
