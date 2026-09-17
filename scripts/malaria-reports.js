function calculateRisk(d) {
  let score = 0;
  if (d.Soil_Moisture > 0.35) score += 40;
  else if (d.Soil_Moisture > 0.25) score += 20;
  if (d.LST_Surface_C >= 25 && d.LST_Surface_C <= 30) score += 30;
  if (d.NDWI_Water > -0.1) score += 20;
  if (d.Population_Density_Per_KM2 > 300) score += 10;
  return score;
}

function riskLabel(r) {
  if (r >= 50) return { text: 'High', cls: 'badge-high' };
  if (r >= 25) return { text: 'Moderate', cls: 'badge-mod' };
  return { text: 'Low', cls: 'badge-low' };
}

// Full dataset across all months
let allData = [];

// Currently visible (after filters + sort)
let tableData = [];

let sortCol = 'risk';
let sortAsc = false;

// Active filter state
const filters = { month: 'all', muni: 'all', risk: 'all', search: '' };

function applyFilters() {
  const search = filters.search.trim().toLowerCase();

  tableData = allData.filter(r => {
    if (filters.month !== 'all' && r.month !== filters.month) return false;
    if (filters.muni  !== 'all' && r.muni  !== filters.muni)  return false;
    if (filters.risk  === 'high'     && r.risk < 50)           return false;
    if (filters.risk  === 'moderate' && (r.risk < 25 || r.risk >= 50)) return false;
    if (filters.risk  === 'low'      && r.risk >= 25)           return false;
    if (search && !r.ward.toLowerCase().includes(search))       return false;
    return true;
  });

  updateStats();
  renderTable();
  updateSubtitle();
}

function updateSubtitle() {
  const monthLabel = filters.month === 'all' ? 'All Months' : filters.month;
  document.getElementById('report-month').textContent = monthLabel;
}

function renderTable() {
  const sorted = [...tableData].sort((a, b) => {
    const va = a[sortCol], vb = b[sortCol];
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortAsc ? va - vb : vb - va;
  });

  const tbody = document.getElementById('table-body');

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">No wards match the current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = sorted.map(r => {
    const { text, cls } = riskLabel(r.risk);
    return `<tr>
      <td>${r.ward}</td>
      <td>${r.muni}</td>
      <td>${r.province}</td>
      <td>${r.lst.toFixed(1)}</td>
      <td>${r.sm.toFixed(3)}</td>
      <td><strong>${r.risk}%</strong></td>
      <td><span class="badge ${cls}">${text}</span></td>
    </tr>`;
  }).join('');
}

function updateStats() {
  const total = tableData.length;
  const high  = tableData.filter(r => r.risk >= 50).length;
  const mod   = tableData.filter(r => r.risk >= 25 && r.risk < 50).length;
  const low   = tableData.filter(r => r.risk < 25).length;
  const avg   = total ? Math.round(tableData.reduce((s, r) => s + r.risk, 0) / total) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-high').textContent  = high;
  document.getElementById('stat-mod').textContent   = mod;
  document.getElementById('stat-low').textContent   = low;
  document.getElementById('stat-avg').textContent   = avg + '%';
}

function exportCSV() {
  const header = 'Month,Ward,Municipality,Province,LST_C,Soil_Moisture,Risk_%,Risk_Level\n';
  const rows = tableData.map(r =>
    `"${r.month}","${r.ward}","${r.muni}","${r.province}",${r.lst.toFixed(1)},${r.sm.toFixed(3)},${r.risk},${riskLabel(r.risk).text}`
  ).join('\n');

  const blob = new Blob([header + rows], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'malaria_risk_report.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function populateMonthDropdown(months) {
  const sel = document.getElementById('month-filter');
  months.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
  // Default to latest month
  const latest = months[months.length - 1];
  sel.value = latest;
  filters.month = latest;
}

function populateMuniDropdown() {
  const munis = [...new Set(
    allData
      .filter(r => filters.month === 'all' || r.month === filters.month)
      .map(r => r.muni)
  )].sort();

  const sel = document.getElementById('muni-filter');
  const current = sel.value;
  sel.innerHTML = '<option value="all">All Municipalities</option>';
  munis.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    sel.appendChild(opt);
  });
  // Restore selection if still valid
  if (munis.includes(current)) sel.value = current;
  else { sel.value = 'all'; filters.muni = 'all'; }
}

document.addEventListener('DOMContentLoaded', function () {
  Papa.parse('../data/Limpopo_Risk_Jan25_Jan26_Safe.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    complete: function (results) {
      const rows = results.data.filter(r => r.Month && r.WardLabel);

      allData = rows.map(r => ({
        month:    r.Month,
        ward:     r.WardLabel || '—',
        muni:     r.Municipali || '—',
        province: r.Province || 'Limpopo',
        lst:      r.LST_Surface_C || 0,
        sm:       r.Soil_Moisture || 0,
        risk:     calculateRisk(r)
      }));

      const months = [...new Set(rows.map(r => r.Month))];
      populateMonthDropdown(months);
      populateMuniDropdown();
      applyFilters();
    },
    error: function () {
      document.getElementById('table-body').innerHTML =
        '<tr><td colspan="7" class="loading-row">Failed to load data.</td></tr>';
    }
  });

  // Month filter
  document.getElementById('month-filter').addEventListener('change', function () {
    filters.month = this.value;
    populateMuniDropdown();
    applyFilters();
  });

  // Municipality filter
  document.getElementById('muni-filter').addEventListener('change', function () {
    filters.muni = this.value;
    applyFilters();
  });

  // Risk level toggle
  document.querySelectorAll('.risk-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      filters.risk = this.dataset.risk;
      applyFilters();
    });
  });

  // Ward search
  let searchTimeout;
  document.getElementById('ward-search').addEventListener('input', function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filters.search = this.value;
      applyFilters();
    }, 200);
  });

  // Reset all filters
  document.getElementById('reset-filters').addEventListener('click', function () {
    const monthSel = document.getElementById('month-filter');
    const months = [...monthSel.options].map(o => o.value).filter(v => v !== 'all');
    const latest = months[months.length - 1];

    monthSel.value = latest;
    filters.month = latest;

    populateMuniDropdown();
    document.getElementById('muni-filter').value = 'all';
    filters.muni = 'all';

    document.querySelectorAll('.risk-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.risk-btn[data-risk="all"]').classList.add('active');
    filters.risk = 'all';

    document.getElementById('ward-search').value = '';
    filters.search = '';

    applyFilters();
  });

  // Column sort
  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', function () {
      const col = this.dataset.col;
      sortAsc = sortCol === col ? !sortAsc : true;
      sortCol = col;
      document.querySelectorAll('th.sortable').forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      this.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
      renderTable();
    });
  });

  document.getElementById('export-btn').addEventListener('click', exportCSV);
  document.getElementById('export-btn-main').addEventListener('click', exportCSV);
});
