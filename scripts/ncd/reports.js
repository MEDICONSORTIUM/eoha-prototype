/* NCD reports display the same historical measurements as the NCD dashboard. */
(() => {
  const month = document.getElementById('month-filter'), province = document.getElementById('province-filter');
  const municipality = document.getElementById('muni-filter'), search = document.getElementById('ward-search');
  const body = document.getElementById('table-body');
  const numericFields = new Set(['Air_Temp_C', 'LST_Surface_C', 'Population_Density_Per_KM2']);
  let rows = [], filtered = [], page = 1, sort = 'Month', ascending = false;
  const size = 25;
  /**
   * text()
   * Purpose: Write report labels without inserting data as HTML.
   * Parameters: id (string), value (string).
   * Returns: void.
   */
  function text(id, value) { document.getElementById(id).textContent = value; }
  /**
   * options()
   * Purpose: Populate available filter choices while retaining their all-values option.
   * Parameters: select (element), values (array).
   * Returns: void.
   */
  function options(select, values) {
    const previous = select.value;
    select.length = 1;
    values.forEach(value => select.add(new Option(value, value)));
    if (values.includes(previous)) select.value = previous;
    select.disabled = !values.length;
  }
  /**
   * validNumber()
   * Purpose: Preserve missing values and exclude negative population density.
   * Parameters: value (unknown), field (string).
   * Returns: number or null.
   */
  function validNumber(value, field) {
    const number = NcdData.number(value);
    return field === 'Population_Density_Per_KM2' && number !== null && number < 0 ? null : number;
  }
  /**
   * apply()
   * Purpose: Filter observations, calculate available-value means and refresh pagination.
   * Parameters: none.
   * Returns: void.
   */
  function apply() {
    const query = search.value.trim().toLowerCase(); page = 1;
    filtered = rows.filter(row => (month.value === 'all' || row.Month === month.value) &&
      (province.value === 'all' || row.Province === province.value) &&
      (municipality.value === 'all' || row.Municipali === municipality.value) &&
      (!query || `${row.WardLabel} ${row.WardID}`.toLowerCase().includes(query)));
    const summary = NcdData.summarize(filtered);
    text('stat-total', new Set(filtered.map(row => row.WardID)).size.toLocaleString());
    [['stat-high', 'Air_Temp_C'], ['stat-mod', 'LST_Surface_C'], ['stat-low', 'Population_Density_Per_KM2']].forEach(([id, field]) => {
      text(id, summary[field].value === null ? 'Unavailable' : summary[field].value.toFixed(1));
      document.getElementById(id).title = summary[field].count + ' valid ward-month observations';
    });
    text('stat-avg', 'Unavailable'); text('report-month', month.value === 'all' ? 'All Months' : month.value);
    ['export-btn', 'export-btn-main'].forEach(id => { document.getElementById(id).disabled = !filtered.length; });
    render();
  }
  /**
   * render()
   * Purpose: Sort and render one page with explicit missing-value and empty states.
   * Parameters: none.
   * Returns: void.
   */
  function render() {
    filtered.sort((a, b) => {
      let left = a[sort], right = b[sort];
      if (numericFields.has(sort)) {
        left = validNumber(left, sort); right = validNumber(right, sort);
        if (left === null) return right === null ? 0 : 1;
        if (right === null) return -1;
      } else if (sort === 'Month') { left = Date.parse('1 ' + left); right = Date.parse('1 ' + right); }
      const comparison = typeof left === 'number' ? left - right : String(left).localeCompare(String(right));
      return ascending ? comparison : -comparison;
    });
    body.replaceChildren();
    for (const row of filtered.slice((page - 1) * size, page * size)) {
      const tr = document.createElement('tr');
      const values = [row.Month, row.WardLabel, row.Municipali, row.Province,
        ...['Air_Temp_C', 'LST_Surface_C', 'Population_Density_Per_KM2'].map(field => {
          const value = validNumber(row[field], field); return value === null ? 'Unavailable' : value.toFixed(1);
        }), 'Unavailable'];
      values.forEach(value => { const td = document.createElement('td'); td.textContent = value; tr.append(td); });
      body.append(tr);
    }
    if (!filtered.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.colSpan = 8; td.className = 'loading-row'; td.textContent = rows.length ? 'No observations match these filters.' : 'Observations unavailable.';
      tr.append(td); body.append(tr);
    }
    document.querySelectorAll('th[data-col]').forEach(th => th.setAttribute('aria-sort', th.dataset.col === sort ? (ascending ? 'ascending' : 'descending') : 'none'));
    const count = filtered.length;
    text('report-page-summary', count ? `${(page - 1) * size + 1}–${Math.min(page * size, count)} of ${count.toLocaleString()} observations · Page ${page} of ${Math.ceil(count / size)}` : '0 observations');
    document.getElementById('previous-page').disabled = page === 1;
    document.getElementById('next-page').disabled = page * size >= count;
  }
  /**
   * exportCsv()
   * Purpose: Export every filtered record with missing values retained and formula-safe text.
   * Parameters: none.
   * Returns: void.
   */
  function exportCsv() {
    if (!filtered.length) return;
    const fields = ['Month', 'WardID', 'WardLabel', 'Municipali', 'Province', 'Air_Temp_C', 'LST_Surface_C', 'Population_Density_Per_KM2'];
    const data = filtered.map(row => [...fields.map(field => numericFields.has(field) ? validNumber(row[field], field) ?? '' : row[field]), 'Unavailable']);
    const csv = Papa.unparse({ fields: [...fields, 'NCD_Score_Status'], data }, { escapeFormulae: true });
    const url = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = 'ncd-environmental-observations.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  month.addEventListener('change', apply); municipality.addEventListener('change', apply); search.addEventListener('input', apply);
  province.addEventListener('change', () => {
    municipality.value = 'all';
    options(municipality, [...new Set(rows.filter(row => province.value === 'all' || row.Province === province.value).map(row => row.Municipali))].sort());
    apply();
  });
  document.querySelectorAll('th[data-col]').forEach(th => th.querySelector('button').addEventListener('click', () => {
    ascending = sort === th.dataset.col ? !ascending : true; sort = th.dataset.col; render();
  }));
  document.getElementById('previous-page').addEventListener('click', () => { page--; render(); });
  document.getElementById('next-page').addEventListener('click', () => { page++; render(); });
  document.getElementById('reset-filters').addEventListener('click', () => {
    month.value = province.value = municipality.value = 'all'; search.value = '';
    options(municipality, [...new Set(rows.map(row => row.Municipali))].sort()); apply();
  });
  ['export-btn', 'export-btn-main'].forEach(id => document.getElementById(id).addEventListener('click', exportCsv));
  /**
   * load()
   * Purpose: Read real historical observations and retain the report layout on errors.
   * Parameters: none.
   * Returns: Promise<void>.
   */
  async function load() {
    const retry = document.getElementById('retry-btn'); retry.hidden = true; rows = []; apply();
    text('api-status', 'Loading historical environmental observations…');
    [month, province, municipality].forEach(select => { select.value = 'all'; options(select, []); }); search.disabled = true;
    try {
      const response = await fetch('../../data/malaria/Limpopo_Risk_Jan25_Jan26_Safe.csv');
      if (!response.ok) throw new Error('Historical dataset request failed');
      const parsed = Papa.parse(await response.text(), { header: true, skipEmptyLines: true });
      if (parsed.errors.length) throw new Error('Historical dataset could not be parsed');
      rows = parsed.data.filter(row => row.Month && row.WardID && row.Province);
      if (!rows.length) throw new Error('No historical observations available');
      options(month, [...new Set(rows.map(row => row.Month))].sort((a, b) => Date.parse('1 ' + a) - Date.parse('1 ' + b)));
      options(province, [...new Set(rows.map(row => row.Province))].sort());
      options(municipality, [...new Set(rows.map(row => row.Municipali))].sort());
      search.disabled = false;
      text('api-status', `${rows.length.toLocaleString()} historical ward-month observations loaded. NCD scoring is unavailable.`); apply();
    } catch (error) { rows = []; apply(); text('api-status', error.message + '. Use Retry to reload.'); retry.hidden = false; }
  }
  document.getElementById('retry-btn').addEventListener('click', load);
  load();
})();
