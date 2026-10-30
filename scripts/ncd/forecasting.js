/* Historical comparison controls for the NCD forecasting page. */
(() => {
  const province = document.getElementById('forecast-province');
  const municipality = document.getElementById('forecast-municipality');
  const ward = document.getElementById('forecast-ward');
  let rows = [], periods = [];
  /**
   * populate()
   * Purpose: Replace region options while retaining the all-regions choice.
   * Parameters: select (HTMLSelectElement), entries (array of value/label pairs).
   * Returns: void.
   */
  function populate(select, entries) {
    select.length = 1;
    entries.forEach(([value, label]) => select.add(new Option(label, value)));
    select.disabled = entries.length === 0;
  }
  /**
   * regionRows()
   * Purpose: Select all periods for the chosen province and municipality.
   * Parameters: none.
   * Returns: array of historical observations.
   */
  function regionRows() {
    return rows.filter(row => (!province.value || row.Province === province.value) &&
      (!municipality.value || row.Municipali === municipality.value));
  }
  /**
   * refresh()
   * Purpose: Apply geographic selection to the independent period comparison maps.
   * Parameters: none.
   * Returns: void.
   */
  function refresh() {
    NcdComparison.refresh(rows, { country: 'South Africa', province: province.value,
      municipality: municipality.value, ward: ward.value }, periods);
  }
  /**
   * populateWards()
   * Purpose: Offer wards available across all historical periods in the selected region.
   * Parameters: none.
   * Returns: void.
   */
  function populateWards() {
    populate(ward, [...new Map(regionRows().map(row => [String(row.WardID), row.WardLabel]))]
      .sort((a, b) => a[1].localeCompare(b[1])));
  }
  province.addEventListener('change', () => {
    municipality.value = '';
    populate(municipality, [...new Set(regionRows().map(row => row.Municipali))].sort().map(value => [value, value]));
    populateWards(); refresh();
  });
  municipality.addEventListener('change', () => { populateWards(); refresh(); });
  ward.addEventListener('change', refresh);
  /**
   * initialize()
   * Purpose: Load observed measurements and expose explicit loading failures.
   * Parameters: none.
   * Returns: Promise<void>.
   */
  async function initialize() {
    try {
      const response = await fetch('../../data/malaria/Limpopo_Risk_Jan25_Jan26_Safe.csv');
      if (!response.ok) throw new Error('Historical observations could not load');
      const parsed = Papa.parse(await response.text(), { header: true, skipEmptyLines: true });
      if (parsed.errors.length) throw new Error('Historical observations could not be parsed');
      rows = parsed.data.filter(row => row.Month && row.WardID && row.Province);
      periods = [...new Set(rows.map(row => row.Month))].sort((a, b) => Date.parse('1 ' + a) - Date.parse('1 ' + b));
      if (!periods.length) throw new Error('No historical observation periods available');
      populate(province, [...new Set(rows.map(row => row.Province))].sort().map(value => [value, value]));
      populate(municipality, [...new Set(rows.map(row => row.Municipali))].sort().map(value => [value, value]));
      populateWards(); refresh();
    } catch (error) {
      document.getElementById('forecast-status').textContent = error.message + '. Reload to retry. NCD forecasts remain unavailable.';
      document.querySelectorAll('.period-summary').forEach(element => { element.textContent = 'Historical observations unavailable.'; });
    }
  }
  document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-days]').forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    document.getElementById('range-label').textContent = button.dataset.days + '-day outlook';
  }));
  initialize();
})();
