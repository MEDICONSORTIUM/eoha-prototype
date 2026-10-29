/**
 * calculateRisk()
 * ---------------
 * Delegate report scoring to the shared malaria formula used by the dashboard.
 *
 * Parameters:
 * -----------
 * ward_record: object — A complete malaria ward observation.
 *
 * Returns:
 * --------
 * number | null
 */
function calculateRisk(ward_record) {
  return EOHAMalariaAPI.score(ward_record);
}

/**
 * riskLabel()
 * -----------
 * Return the display label and CSS badge class for a malaria risk score.
 *
 * Parameters:
 * -----------
 * risk_score: number — The malaria risk score from 0 to 100.
 *
 * Returns:
 * --------
 * object
 */
function riskLabel(risk_score) {
  if (risk_score >= 50) return { text: "High", cls: "badge-high" };
  if (risk_score >= 25) return { text: "Moderate", cls: "badge-mod" };
  return { text: "Low", cls: "badge-low" };
}

// Full dataset across all months
let allData = [];

// Currently visible (after filters + sort)
let tableData = [];

let sortCol = "risk";
let sortAsc = false;
let currentPage = 1;
const pageSize = 25;

// Active filter state
const filters = { month: "all", muni: "all", risk: "all", search: "" };

/**
 * applyFilters()
 * --------------
 * Filter report records by month, municipality, risk band and ward search, then refresh totals and
 * the table.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function applyFilters() {
  currentPage = 1;
  const search = filters.search.trim().toLowerCase();

  tableData = allData.filter((record) => {
    if (filters.month !== "all" && record.month !== filters.month) return false;
    if (filters.muni !== "all" && record.muni !== filters.muni) return false;
    if (filters.risk === "high" && record.risk < 50) return false;
    if (filters.risk === "moderate" && (record.risk < 25 || record.risk >= 50))
      return false;
    if (filters.risk === "low" && record.risk >= 25) return false;
    if (search && !record.ward.toLowerCase().includes(search)) return false;
    return true;
  });

  updateStats();
  renderTable();
  updateSubtitle();
}

/**
 * updateSubtitle()
 * ----------------
 * Display the active report month in the page subtitle.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function updateSubtitle() {
  const monthLabel = filters.month === "all" ? "All Months" : filters.month;
  document.getElementById("report-month").textContent = monthLabel;
}

/**
 * renderTable()
 * -------------
 * Sort the filtered records and render the current page of up to 25 report rows.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function renderTable() {
  const sorted = [...tableData].sort((a, b) => {
    const left_value = a[sortCol],
      right_value = b[sortCol];
    if (typeof left_value === "string")
      return sortAsc
        ? left_value.localeCompare(right_value)
        : right_value.localeCompare(left_value);
    return sortAsc ? left_value - right_value : right_value - left_value;
  });

  const tbody = document.getElementById("table-body");
  const start = (currentPage - 1) * pageSize;
  document.getElementById("report-page-summary").textContent = sorted.length
    ? `Showing ${start + 1}–${Math.min(start + pageSize, sorted.length)} of ${sorted.length.toLocaleString()} records`
    : "No matching records";
  document.getElementById("previous-page").disabled = currentPage === 1;
  document.getElementById("next-page").disabled =
    start + pageSize >= sorted.length;

  if (sorted.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="loading-row">No wards match the current filters.</td></tr>';
    return;
  }

  tbody.innerHTML = sorted
    .slice(start, start + pageSize)
    .map((record) => {
      const { text, cls } = riskLabel(record.risk);
      return `<tr>
      <td>${EOHAMalariaAPI.escapeHtml(record.ward)}</td>
      <td>${EOHAMalariaAPI.escapeHtml(record.muni)}</td>
      <td>${EOHAMalariaAPI.escapeHtml(record.province)}</td>
      <td>${record.lst.toFixed(1)}</td>
      <td>${record.sm.toFixed(3)}</td>
      <td><strong>${record.risk}%</strong></td>
      <td><span class="badge ${cls}">${text}</span></td>
    </tr>`;
    })
    .join("");
}

/**
 * updateStats()
 * -------------
 * Calculate the visible report totals, risk-band counts and average risk score.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function updateStats() {
  const total = tableData.length;
  const high = tableData.filter((record) => record.risk >= 50).length;
  const mod = tableData.filter(
    (record) => record.risk >= 25 && record.risk < 50,
  ).length;
  const low = tableData.filter((record) => record.risk < 25).length;
  const avg = total
    ? Math.round(tableData.reduce((s, record) => s + record.risk, 0) / total)
    : 0;

  document.getElementById("stat-total").textContent = total;
  document.getElementById("stat-high").textContent = high;
  document.getElementById("stat-mod").textContent = mod;
  document.getElementById("stat-low").textContent = low;
  document.getElementById("stat-avg").textContent = avg + "%";
}

/**
 * exportCSV()
 * -----------
 * Download every matching API-derived report record as an escaped CSV file.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function exportCSV() {
  const header =
    "Month,Ward,Municipality,Province,LST_C,Soil_Moisture,Risk_%,Risk_Level\n";
  /**
   * quote()
   * -------
   * Escape quotes and spreadsheet formula prefixes in an exported CSV text cell.
   *
   * Parameters:
   * -----------
   * value: unknown — The value to convert or escape.
   *
   * Returns:
   * --------
   * string
   */
  const quote = (value) =>
    '"' +
    String(value)
      .replace(/^[=+@-]/, "'$&")
      .replace(/"/g, '""') +
    '"';
  const rows = tableData
    .map(
      (record) =>
        `${quote(record.month)},${quote(record.ward)},${quote(record.muni)},${quote(record.province)},${record.lst.toFixed(1)},${record.sm.toFixed(3)},${record.risk},${riskLabel(record.risk).text}`,
    )
    .join("\n");

  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "malaria_risk_report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * populateMonthDropdown()
 * -----------------------
 * Populate report month options and select the latest available API period.
 *
 * Parameters:
 * -----------
 * months: Array<string> — Observation periods in chronological order.
 *
 * Returns:
 * --------
 * void
 */
function populateMonthDropdown(months) {
  const select = document.getElementById("month-filter");
  months.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
  // Default to latest month
  const latest = months[months.length - 1];
  select.value = latest;
  filters.month = latest;
}

/**
 * populateMuniDropdown()
 * ----------------------
 * Populate municipalities for the selected month and preserve a still-valid selection.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function populateMuniDropdown() {
  const municipality_names = [
    ...new Set(
      allData
        .filter(
          (record) => filters.month === "all" || record.month === filters.month,
        )
        .map((record) => record.muni),
    ),
  ].sort();

  const select = document.getElementById("muni-filter");
  const current = select.value;
  select.innerHTML = '<option value="all">All Municipalities</option>';
  municipality_names.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    select.appendChild(opt);
  });
  // Restore selection if still valid
  if (municipality_names.includes(current)) select.value = current;
  else {
    select.value = "all";
    filters.muni = "all";
  }
}

/**
 * initialize_reports_page()
 * -------------------------
 * Bind report controls, load API measurements and display explicit loading or failure states.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function initialize_reports_page() {
  document.getElementById("previous-page").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  document.getElementById("next-page").addEventListener("click", () => {
    if (currentPage * pageSize < tableData.length) {
      currentPage++;
      renderTable();
    }
  });
  EOHAMalariaAPI.load()
    .then(({ rows, excluded }) => {
      allData = rows.map((record) => ({
        month: record.Month,
        ward: record.WardLabel,
        muni: record.Municipali,
        province: record.Province,
        lst: record.LST_Surface_C,
        sm: record.Soil_Moisture,
        risk: calculateRisk(record),
      }));
      const months = [
        ...new Map(
          rows.map((record) => [record.date.slice(0, 7), record.Month]),
        ).entries(),
      ]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, month]) => month);
      populateMonthDropdown(months);
      populateMuniDropdown();
      applyFilters();
      document.getElementById("api-status").textContent =
        `API connected · ${rows.length} ward observations. ${excluded ? `${excluded} incomplete records excluded.` : ""}`;
    })
    .catch((error) => {
      const status = document.getElementById("api-status");
      status.textContent = `Risk data unavailable. ${error.message}`;
      status.setAttribute("role", "alert");
      document.getElementById("table-body").innerHTML =
        '<tr><td colspan="7" class="loading-row">API data unavailable.</td></tr>';
      document.getElementById("report-page-summary").textContent =
        "No API records loaded";
      document.getElementById("export-btn").disabled = true;
      document.getElementById("export-btn-main").disabled = true;
    });
  // Month filter
  document
    .getElementById("month-filter")
    .addEventListener("change", function () {
      filters.month = this.value;
      populateMuniDropdown();
      applyFilters();
    });

  // Municipality filter
  document
    .getElementById("muni-filter")
    .addEventListener("change", function () {
      filters.muni = this.value;
      applyFilters();
    });

  // Risk level toggle
  document.querySelectorAll(".risk-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".risk-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      filters.risk = this.dataset.risk;
      applyFilters();
    });
  });

  // Ward search
  let searchTimeout;
  document.getElementById("ward-search").addEventListener("input", function () {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      filters.search = this.value;
      applyFilters();
    }, 200);
  });

  // Reset all filters
  document
    .getElementById("reset-filters")
    .addEventListener("click", function () {
      const monthSel = document.getElementById("month-filter");
      const months = [...monthSel.options]
        .map((o) => o.value)
        .filter((v) => v !== "all");
      const latest = months[months.length - 1];

      monthSel.value = latest;
      filters.month = latest;

      populateMuniDropdown();
      document.getElementById("muni-filter").value = "all";
      filters.muni = "all";

      document
        .querySelectorAll(".risk-btn")
        .forEach((b) => b.classList.remove("active"));
      document
        .querySelector('.risk-btn[data-risk="all"]')
        .classList.add("active");
      filters.risk = "all";

      document.getElementById("ward-search").value = "";
      filters.search = "";

      applyFilters();
    });

  // Column sort
  document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", function () {
      const col = this.dataset.col;
      sortAsc = sortCol === col ? !sortAsc : true;
      sortCol = col;
      document
        .querySelectorAll("th.sortable")
        .forEach((h) => h.classList.remove("sort-asc", "sort-desc"));
      this.classList.add(sortAsc ? "sort-asc" : "sort-desc");
      renderTable();
    });
  });

  document.getElementById("export-btn").addEventListener("click", exportCSV);
  document
    .getElementById("export-btn-main")
    .addEventListener("click", exportCSV);
}

document.addEventListener("DOMContentLoaded", initialize_reports_page);
