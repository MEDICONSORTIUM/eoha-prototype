/* Shared-CSV measurements only: these helpers do not compute NCD scores. */
(function (root) {
  const fields = ['Air_Temp_C', 'LST_Surface_C', 'Population_Density_Per_KM2'];
  /**
   * number()
   * --------
   * Parse a finite measurement while keeping empty, missing and nonfinite values unavailable.
   *
   * Parameters:
   * -----------
   * value: unknown — The value to convert or escape.
   *
   * Returns:
   * --------
   * number | null
   */
  function number(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  }
  /**
   * filter()
   * --------
   * Select historical South African ward observations matching the chosen period and region.
   *
   * Parameters:
   * -----------
   * rows: Array<object> — Historical ward observations to process.
   * selection: object — Country, province, municipality, ward and month filter values.
   *
   * Returns:
   * --------
   * Array<object>
   */
  function filter(rows, selection) {
    if (selection.country !== 'South Africa') return [];
    return rows.filter(
      (row) =>
        row.Month === selection.month &&
        (!selection.province || row.Province === selection.province) &&
        (!selection.municipality || row.Municipali === selection.municipality) &&
        (!selection.ward || String(row.WardID) === selection.ward),
    );
  }
  /**
   * summarize()
   * -----------
   * Calculate per-measurement ward means and valid-value counts without filling missing
   * measurements.
   *
   * Parameters:
   * -----------
   * rows: Array<object> — Historical ward observations to process.
   *
   * Returns:
   * --------
   * object
   */
  function summarize(rows) {
    return Object.fromEntries(
      fields.map((field) => {
        const values = rows
          .map((row) => number(row[field]))
          .filter(
            (value) => value !== null && (field !== 'Population_Density_Per_KM2' || value >= 0),
          );
        return [
          field,
          {
            value: values.length ? values.reduce((a, b) => a + b, 0) / values.length : null,
            count: values.length,
          },
        ];
      }),
    );
  }
  const api = { number, filter, summarize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NcdData = api;
})(typeof window === 'undefined' ? this : window);
