const { test } = require('node:test');
const assert = require('node:assert/strict');
const { forecast, monthEnd } = require('../../scripts/malaria/forecast-model.js');
const history = ['2026-01-01', '2026-02-01', '2026-03-01', '2026-04-01'].map((date, i) => ({
  date, WardID: '001', LST_Surface_C: 27, Soil_Moisture: .2 + i * .06,
  NDWI_Water: 0, Population_Density_Per_KM2: 500,
}));
test('forecast uses actual API-derived inputs and limits horizon', () => {
  const result = forecast(history, 30);
  assert.equal(result.eligible, 1);
  assert.equal(result.points.length, 31);
  assert.equal(result.points[0].date, '2026-04-30');
  assert.equal(result.points.at(-1).date, '2026-05-30');
  assert.equal(result.points[0].value, 100);
  assert.ok(result.points.every(p => p.lower <= p.value && p.value <= p.upper && p.upper <= 100));
  assert.throws(() => forecast(history, 90));
});
test('missing, duplicate, gapped and short histories cannot become forecasts', () => {
  assert.equal(forecast([], 7).points.length, 0);
  assert.equal(forecast(history.slice(1), 7).eligible, 0);
  assert.equal(forecast([...history, history[1]], 7).eligible, 0);
  assert.equal(forecast(history.map((row, i) => i === 3 ? { ...row, date: '2026-06-01' } : row), 7).eligible, 0);
  assert.equal(forecast(history.map((row, i) => i === 2 ? { ...row, Soil_Moisture: null } : row), 7).eligible, 0);
});
test('older wards are excluded from current regional cohort', () => {
  const older = history.map(row => ({ ...row, WardID: '002', date: row.date.replace('2026', '2025') }));
  const result = forecast([...history, ...older], 14);
  assert.equal(result.total, 2); assert.equal(result.eligible, 1);
});
test('month-end anchoring handles leap years', () => {
  assert.equal(new Date(monthEnd('2024-02-01')).toISOString().slice(0, 10), '2024-02-29');
});
