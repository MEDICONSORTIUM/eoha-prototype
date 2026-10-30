(function () {
  "use strict";

  /* ---------------------------------------------------------------
     Config
     dataMode "mock": reads the synthetic CSV (works with no backend).
     dataMode "api":  reads the EOHA Spring Boot API (see loadFromApi).
  ---------------------------------------------------------------- */
  const CONFIG = {
    dataMode: "mock",
    csvUrl: "../data/sea-level-mock-monthly-2018-2026.csv",
    apiBase: "http://localhost:8081",
    mapCenter: [-31.5, 24.5],
    mapZoom: 6,
    // Demo thresholds in mm per year. Replace once real thresholds are agreed.
    trendHigh: 3.5,
    trendMid: 2.5,
    playIntervalMs: 350
  };

  const COLORS = { high: "#d64545", mid: "#e0a82e", low: "#3aa76d" };

  /* ---------------------------------------------------------------
     Data loading
     Every loader returns rows shaped like:
     { code, name, province, lat, lon, month: "YYYY-MM-01", value }
  ---------------------------------------------------------------- */
  async function loadObservations() {
    return CONFIG.dataMode === "api" ? loadFromApi() : loadFromCsv();
  }

  async function loadFromCsv() {
    const res = await fetch(CONFIG.csvUrl);
    if (!res.ok) throw new Error("CSV request failed: " + res.status);
    return parseCsv(await res.text());
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(function (l) { return l.trim() !== ""; });
    const header = lines.shift().split(",");
    const idx = {};
    header.forEach(function (h, i) { idx[h.trim()] = i; });

    return lines.map(function (line) {
      const c = line.split(",");
      return {
        code: c[idx.station_code],
        name: c[idx.station_name],
        province: c[idx.province],
        lat: parseFloat(c[idx.latitude]),
        lon: parseFloat(c[idx.longitude]),
        month: c[idx.month],
        value: parseFloat(c[idx.sea_level_mm])
      };
    }).filter(function (r) { return Number.isFinite(r.value); });
  }

  // Needs a backend endpoint that does not exist yet: GET /api/sea-level
  // returning { success, data: { items: [ ...rows with the CSV columns ] } }.
  async function loadFromApi() {
    const res = await fetch(CONFIG.apiBase + "/api/sea-level");
    if (!res.ok) throw new Error("API request failed: " + res.status);
    const body = await res.json();
    return body.data.items.map(function (r) {
      return {
        code: r.station_code,
        name: r.station_name,
        province: r.province,
        lat: Number(r.latitude),
        lon: Number(r.longitude),
        month: String(r.month).slice(0, 10),
        value: Number(r.sea_level_mm)
      };
    });
  }

  /* ---------------------------------------------------------------
     State
  ---------------------------------------------------------------- */
  const state = {
    stations: new Map(), // code -> { code, name, province, lat, lon, series, stats }
    months: [],          // sorted "YYYY-MM-01" strings
    selected: null,      // station code
    monthIndex: 0,
    playTimer: null
  };

  const markers = new Map();
  let map = null;

  /* ---------------------------------------------------------------
     Helpers
  ---------------------------------------------------------------- */
  const $ = function (id) { return document.getElementById(id); };

  function formatMonth(iso) {
    // Built from the string parts so there is no timezone shift.
    const parts = iso.split("-");
    const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return names[parseInt(parts[1], 10) - 1] + " " + parts[0];
  }

  function fmt(value, digits) {
    return Number.isFinite(value) ? value.toFixed(digits) : "--";
  }

  function clampPct(x) {
    return Math.max(0, Math.min(100, x));
  }

  function trendColor(trend) {
    if (trend >= CONFIG.trendHigh) return COLORS.high;
    if (trend >= CONFIG.trendMid) return COLORS.mid;
    return COLORS.low;
  }

  function svgEl(name, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  /* ---------------------------------------------------------------
     Build stations from rows
  ---------------------------------------------------------------- */
  function buildStations(rows) {
    const monthSet = new Set();
    rows.forEach(function (r) { monthSet.add(r.month); });
    state.months = Array.from(monthSet).sort();
    const monthPos = new Map();
    state.months.forEach(function (m, i) { monthPos.set(m, i); });

    rows.forEach(function (r) {
      if (!state.stations.has(r.code)) {
        state.stations.set(r.code, {
          code: r.code,
          name: r.name,
          province: r.province,
          lat: r.lat,
          lon: r.lon,
          series: new Array(state.months.length).fill(null),
          stats: null
        });
      }
      state.stations.get(r.code).series[monthPos.get(r.month)] = r.value;
    });

    state.stations.forEach(function (s) { s.stats = computeStats(s.series); });
  }

  function computeStats(series) {
    const pts = [];
    series.forEach(function (v, i) { if (v !== null) pts.push([i / 12, v]); });
    if (pts.length < 2) return { trend: NaN, min: NaN, max: NaN };

    // Least squares slope in mm per year.
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0, min = Infinity, max = -Infinity;
    pts.forEach(function (p) {
      sx += p[0]; sy += p[1]; sxx += p[0] * p[0]; sxy += p[0] * p[1];
      if (p[1] < min) min = p[1];
      if (p[1] > max) max = p[1];
    });
    const denom = n * sxx - sx * sx;
    const trend = denom === 0 ? NaN : (n * sxy - sx * sy) / denom;
    return { trend: trend, min: min, max: max };
  }

  /* ---------------------------------------------------------------
     Selectors
  ---------------------------------------------------------------- */
  function populateProvinces() {
    const provinces = new Set();
    state.stations.forEach(function (s) { provinces.add(s.province); });
    const sel = $("province-select");
    sel.length = 1;
    Array.from(provinces).sort().forEach(function (p) {
      sel.add(new Option(p, p));
    });
    sel.disabled = false;
  }

  function populateStations(province) {
    const sel = $("station-select");
    sel.length = 1;
    state.stations.forEach(function (s) {
      if (!province || s.province === province) sel.add(new Option(s.name, s.code));
    });
    sel.disabled = !province;
    $("apply-btn").disabled = true;
  }

  function wireSelectors() {
    $("province-select").addEventListener("change", function (e) {
      populateStations(e.target.value);
    });
    $("station-select").addEventListener("change", function (e) {
      $("apply-btn").disabled = !e.target.value;
    });
    $("apply-btn").addEventListener("click", function () {
      const code = $("station-select").value;
      if (code) selectStation(code, true);
    });
    $("reset-btn").addEventListener("click", resetView);
  }

  /* ---------------------------------------------------------------
     Map
  ---------------------------------------------------------------- */
  function initMap() {
    map = L.map("map", { zoomControl: true }).setView(CONFIG.mapCenter, CONFIG.mapZoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(map);
  }

  function addMarkers() {
    state.stations.forEach(function (s) {
      const color = trendColor(s.stats.trend);
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 9,
        color: "#ffffff",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.95
      }).addTo(map);

      marker.bindTooltip(s.name);
      marker.on("click", function () { selectStation(s.code, false); });
      markers.set(s.code, marker);
    });
  }

  function popupContent(s) {
    const box = document.createElement("div");
    box.className = "sl-popup";
    const title = document.createElement("strong");
    title.textContent = s.name;
    const line = document.createElement("span");
    const v = s.series[state.monthIndex];
    line.textContent = formatMonth(state.months[state.monthIndex]) + ": " + (v === null ? "no data" : fmt(v, 0) + " mm");
    box.appendChild(title);
    box.appendChild(line);
    return box;
  }

  function highlightMarker() {
    markers.forEach(function (m, code) {
      const active = code === state.selected;
      m.setStyle({ radius: active ? 12 : 9, weight: active ? 3 : 2 });
      if (active) m.bringToFront();
    });
  }

  /* ---------------------------------------------------------------
     Selection and rendering
  ---------------------------------------------------------------- */
  function selectStation(code, fromSelectors) {
    const s = state.stations.get(code);
    if (!s) return;
    state.selected = code;

    if (!fromSelectors) {
      $("province-select").value = s.province;
      populateStations(s.province);
      $("station-select").value = code;
      $("apply-btn").disabled = false;
    }

    $("reset-btn").classList.remove("hidden-reset");
    highlightMarker();
    map.flyTo([s.lat, s.lon], 8, { duration: 0.8 });
    markers.get(code).bindPopup(popupContent(s)).openPopup();
    render();
  }

  function resetView() {
    stopPlayback();
    state.selected = null;
    $("province-select").value = "";
    populateStations("");
    $("reset-btn").classList.add("hidden-reset");
    map.closePopup();
    map.flyTo(CONFIG.mapCenter, CONFIG.mapZoom, { duration: 0.8 });
    highlightMarker();
    render();
  }

  function render() {
    renderMeasures();
    renderRightCards();
    renderChart();
    renderTimelineLabels();
  }

  function setBar(id, pct) {
    $(id).style.width = clampPct(pct) + "%";
  }

  function renderMeasures() {
    const s = state.selected ? state.stations.get(state.selected) : null;

    if (!s) {
      $("sl-level-val").textContent = "--";
      $("sl-change-val").textContent = "--";
      $("sl-trend-val").textContent = "--";
      setBar("sl-level-bar", 0);
      setBar("sl-change-bar", 0);
      setBar("sl-trend-bar", 0);
      $("sl-insight").textContent = "\u201CSelect a station to see its monthly mean sea level and long-term trend.\u201D";
      return;
    }

    const i = state.monthIndex;
    const value = s.series[i];
    const earlier = i >= 12 ? s.series[i - 12] : null;
    const change = value !== null && earlier !== null ? value - earlier : NaN;
    const span = s.stats.max - s.stats.min;

    $("sl-level-val").textContent = value === null ? "--" : fmt(value, 0) + " mm";
    setBar("sl-level-bar", value === null || span === 0 ? 0 : ((value - s.stats.min) / span) * 100);

    $("sl-change-val").textContent = Number.isFinite(change) ? (change >= 0 ? "+" : "") + fmt(change, 0) + " mm" : "--";
    setBar("sl-change-bar", Number.isFinite(change) ? (Math.abs(change) / 100) * 100 : 0);

    $("sl-trend-val").textContent = (s.stats.trend >= 0 ? "+" : "") + fmt(s.stats.trend, 1) + " mm/yr";
    setBar("sl-trend-bar", (Math.abs(s.stats.trend) / 6) * 100);

    $("sl-insight").textContent = "\u201C" + s.name + " shows a trend of " + fmt(s.stats.trend, 1) +
      " mm per year across " + formatMonth(state.months[0]) + " to " +
      formatMonth(state.months[state.months.length - 1]) + " in this demo data.\u201D";
  }

  function renderRightCards() {
    const s = state.selected ? state.stations.get(state.selected) : null;

    if (s) {
      const v = s.series[state.monthIndex];
      $("sl-station-level").textContent = v === null ? "--" : fmt(v, 0) + " mm";
      $("sl-station-month").textContent = "mean sea level, " + formatMonth(state.months[state.monthIndex]);
      $("sl-station-name").textContent = s.name;
      $("sl-station-trend").textContent = "Trend " + (s.stats.trend >= 0 ? "+" : "") + fmt(s.stats.trend, 1) + " mm per year";
    } else {
      $("sl-station-level").textContent = "--";
      $("sl-station-month").textContent = "Select a station";
      $("sl-station-name").textContent = "No station selected";
      $("sl-station-trend").textContent = "";
    }

    let sum = 0, count = 0;
    state.stations.forEach(function (st) {
      if (Number.isFinite(st.stats.trend)) { sum += st.stats.trend; count += 1; }
    });
    $("sl-avg-trend").textContent = count ? (sum / count >= 0 ? "+" : "") + fmt(sum / count, 1) : "--";
    $("sl-station-count").textContent = state.stations.size + (state.stations.size === 1 ? " station" : " stations");
  }

  function renderChart() {
    const host = $("sl-chart");
    host.textContent = "";
    const s = state.selected ? state.stations.get(state.selected) : null;
    if (!s) return;

    const W = 280, H = 120, padL = 34, padR = 8, padT = 8, padB = 18;
    const n = s.series.length;
    const min = s.stats.min, max = s.stats.max;
    const range = max - min || 1;

    const x = function (i) { return padL + (i / Math.max(1, n - 1)) * (W - padL - padR); };
    const y = function (v) { return padT + (1 - (v - min) / range) * (H - padT - padB); };

    const svg = svgEl("svg", { viewBox: "0 0 " + W + " " + H, role: "img" });

    let d = "";
    let pen = false;
    s.series.forEach(function (v, i) {
      if (v === null) { pen = false; return; }
      d += (pen ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1) + " ";
      pen = true;
    });
    svg.appendChild(svgEl("path", { d: d.trim(), class: "line" }));

    const maxLabel = svgEl("text", { x: padL - 4, y: padT + 3, "text-anchor": "end", class: "axis-label" });
    maxLabel.textContent = fmt(max, 0);
    const minLabel = svgEl("text", { x: padL - 4, y: H - padB, "text-anchor": "end", class: "axis-label" });
    minLabel.textContent = fmt(min, 0);
    const startLabel = svgEl("text", { x: padL, y: H - 4, "text-anchor": "start", class: "axis-label" });
    startLabel.textContent = state.months[0].slice(0, 4);
    const endLabel = svgEl("text", { x: W - padR, y: H - 4, "text-anchor": "end", class: "axis-label" });
    endLabel.textContent = state.months[n - 1].slice(0, 4);
    [maxLabel, minLabel, startLabel, endLabel].forEach(function (el) { svg.appendChild(el); });

    const v = s.series[state.monthIndex];
    if (v !== null) {
      const cx = x(state.monthIndex);
      svg.appendChild(svgEl("line", { x1: cx, x2: cx, y1: padT, y2: H - padB, class: "guide" }));
      svg.appendChild(svgEl("circle", { cx: cx, cy: y(v), r: 4, class: "point" }));
    }

    host.appendChild(svg);
  }

  function renderTimelineLabels() {
    $("sl-label-first").textContent = formatMonth(state.months[0]);
    $("sl-label-current").textContent = formatMonth(state.months[state.monthIndex]);
    $("sl-label-last").textContent = formatMonth(state.months[state.months.length - 1]);
  }

  /* ---------------------------------------------------------------
     Timeline
  ---------------------------------------------------------------- */
  function setMonthIndex(i) {
    state.monthIndex = i;
    $("time-slider").value = String(i);
    if (state.selected) {
      const s = state.stations.get(state.selected);
      const m = markers.get(state.selected);
      if (m && m.getPopup()) m.getPopup().setContent(popupContent(s));
    }
    render();
  }

  function stopPlayback() {
    if (state.playTimer) {
      clearInterval(state.playTimer);
      state.playTimer = null;
    }
    $("play-btn").setAttribute("aria-pressed", "false");
  }

  function togglePlayback() {
    if (state.playTimer) { stopPlayback(); return; }
    $("play-btn").setAttribute("aria-pressed", "true");
    if (state.monthIndex >= state.months.length - 1) setMonthIndex(0);
    state.playTimer = setInterval(function () {
      if (state.monthIndex >= state.months.length - 1) { stopPlayback(); return; }
      setMonthIndex(state.monthIndex + 1);
    }, CONFIG.playIntervalMs);
  }

  function wireTimeline() {
    const slider = $("time-slider");
    slider.max = String(state.months.length - 1);
    slider.disabled = false;
    slider.addEventListener("input", function (e) {
      stopPlayback();
      setMonthIndex(parseInt(e.target.value, 10));
    });

    const play = $("play-btn");
    play.addEventListener("click", togglePlayback);
    play.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePlayback(); }
    });

    const recenter = $("recenter-btn");
    recenter.setAttribute("role", "button");
    recenter.setAttribute("tabindex", "0");
    recenter.addEventListener("click", function () {
      const s = state.selected ? state.stations.get(state.selected) : null;
      if (s) map.flyTo([s.lat, s.lon], 8, { duration: 0.8 });
      else map.flyTo(CONFIG.mapCenter, CONFIG.mapZoom, { duration: 0.8 });
    });
    recenter.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); recenter.click(); }
    });

    $("sl-range-badge").textContent =
      (CONFIG.dataMode === "mock" ? "SYNTHETIC DEMO | " : "") +
      formatMonth(state.months[0]) + " to " + formatMonth(state.months[state.months.length - 1]);
  }

  /* ---------------------------------------------------------------
     Start
  ---------------------------------------------------------------- */
  async function init() {
    initMap();
    const status = $("sl-status");

    try {
      const rows = await loadObservations();
      if (!rows.length) throw new Error("No sea level rows returned");

      buildStations(rows);
      populateProvinces();
      wireSelectors();
      addMarkers();
      wireTimeline();

      // Start on the latest month.
      state.monthIndex = state.months.length - 1;
      $("time-slider").value = String(state.monthIndex);

      status.textContent = CONFIG.dataMode === "mock"
        ? "Showing synthetic demo data."
        : "Showing data from the EOHA API.";
      render();
    } catch (err) {
      console.error(err);
      status.classList.add("error");
      status.textContent = CONFIG.dataMode === "mock"
        ? "Could not load the sea level CSV. Open the site through a local web server (for example VS Code Live Server) and check the file path."
        : "Could not load sea level data from the API. Check that the backend is running and that CORS allows this page.";
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
