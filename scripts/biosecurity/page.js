(function () {
  const D = window.BiosecData;
  const API = window.BiosecApi;
  const $ = id => document.getElementById(id);
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const RING_LENGTH = 251.33;

  const els = {
    province: $('province-select'),
    city: $('city-select'),
    ward: $('ward-select'),
    indicator: $('indicator-select'),
    timeframe: $('timeframe-select'),
    year: $('year-select'),
    month: $('month-select'),
    slider: $('time-slider'),
    play: $('play-btn')
  };

  const state = {
    variables: [],
    variable: null,
    rows: [],
    months: [],
    map: null,
    markers: null,
    renderer: null,
    chart: null,
    timer: null,
    token: 0
  };

  function setStatus(kind, text, badge) {
    const node = $('data-status');
    node.dataset.state = kind;
    node.textContent = text;
    if (badge) $('source-badge').textContent = badge;
  }

  function monthLabel(key) {
    return MONTH_NAMES[Number(key.slice(5)) - 1] + ' ' + key.slice(0, 4);
  }

  function fill(select, values, allLabel, labels) {
    const previous = select.value;
    select.length = 0;
    select.add(new Option(allLabel, ''));
    values.forEach(value => select.add(new Option(labels ? labels.get(value) : value, value)));
    if (values.includes(previous)) select.value = previous;
  }

  function unit() {
    return state.variable && state.variable.unit ? ' ' + state.variable.unit : '';
  }

  function format(value) {
    if (value === null || value === undefined) return '—';
    return (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2)) + unit();
  }

  function selection() {
    return { province: els.province.value, municipality: els.city.value, ward: els.ward.value };
  }

  function matches(item, sel) {
    return (!sel.province || item.province === sel.province)
      && (!sel.municipality || item.municipality === sel.municipality)
      && (!sel.ward || String(item.regionId) === sel.ward);
  }

  function activeMonths() {
    const months = state.months;
    const mode = els.timeframe.value;
    if (!months.length) return [];
    if (mode === 'latest') return months.slice(-1);
    if (mode === 'last3') return months.slice(-3);
    if (mode === 'last6') return months.slice(-6);
    if (mode === 'last12') return months.slice(-12);
    if (mode === 'all') return months;
    return months.filter(key => (!els.year.value || key.slice(0, 4) === els.year.value) && (!els.month.value || key.slice(5) === els.month.value));
  }

  function describePeriod(months) {
    if (!months.length) return 'No months selected';
    if (months.length === 1) return monthLabel(months[0]);
    return monthLabel(months[0]) + ' – ' + monthLabel(months[months.length - 1]) + ' (' + months.length + ' months)';
  }

  function populateRegionSelects() {
    const provinces = [...new Set(state.rows.map(r => r.province).filter(Boolean))].sort();
    fill(els.province, provinces, 'All provinces');
    populateMunicipalities();
    els.province.disabled = !provinces.length;
  }

  function populateMunicipalities() {
    const rows = state.rows.filter(r => !els.province.value || r.province === els.province.value);
    const municipalities = [...new Set(rows.map(r => r.municipality).filter(Boolean))].sort();
    fill(els.city, municipalities, 'All municipalities');
    els.city.disabled = !municipalities.length;
    populateWards();
  }

  function populateWards() {
    const rows = state.rows.filter(r => (!els.province.value || r.province === els.province.value) && (!els.city.value || r.municipality === els.city.value));
    const wards = new Map(rows.map(r => [String(r.regionId), r.ward]));
    const ids = [...wards.keys()].sort((a, b) => wards.get(a).localeCompare(wards.get(b), undefined, { numeric: true }));
    fill(els.ward, ids, 'All wards', wards);
    els.ward.disabled = !ids.length;
  }

  function populateTimeControls() {
    const years = [...new Set(state.months.map(key => key.slice(0, 4)))];
    fill(els.year, years, 'All years');
    const hasData = state.months.length > 0;
    els.timeframe.disabled = !hasData;
    els.slider.disabled = !hasData;
    els.play.disabled = !hasData;
    els.slider.max = Math.max(0, state.months.length - 1);
    syncCustomControls();
  }

  function syncCustomControls() {
    const custom = els.timeframe.value === 'custom' && state.months.length > 0;
    els.year.disabled = !custom;
    els.month.disabled = !custom;
  }

  function setRing(prefix, value, range, subtitle) {
    const ring = $(prefix + '-ring');
    const t = D.position(value, range);
    $(prefix + '-text').textContent = value === null ? '--' : (Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(2));
    $(prefix + '-sub').textContent = value === null ? subtitle : Math.round(t * 100) + '% of range';
    ring.style.strokeDasharray = String(RING_LENGTH);
    ring.style.strokeDashoffset = String(RING_LENGTH * (1 - (t === null ? 0 : t)));
    ring.style.stroke = t === null ? 'var(--border)' : D.ramp(t);
  }

  function ensureMap() {
    if (state.map || typeof L === 'undefined') return;
    state.map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-30.5, 25], 5);
    window.EOHAMap.addBasemap(state.map);
    state.markers = L.layerGroup().addTo(state.map);
    state.renderer = L.canvas();
  }

  function drawMap(shown, range, zoom) {
    ensureMap();
    if (!state.map) return;
    state.markers.clearLayers();
    const points = [];
    const focused = els.ward.value;
    shown.forEach(item => {
      if (item.lat === null || item.lng === null) return;
      const t = D.position(item.mean, range);
      const colour = t === null ? '#94a3b8' : D.ramp(t);
      const selected = focused && String(item.regionId) === focused;
      L.circleMarker([item.lat, item.lng], { renderer: state.renderer, radius: selected ? 9 : 5, color: selected ? '#ffffff' : colour, weight: selected ? 2 : 1, fillColor: colour, fillOpacity: 0.85 })
        .bindTooltip(item.ward + ' | ' + item.municipality + ' | ' + format(item.mean))
        .on('click', () => selectWard(item))
        .addTo(state.markers);
      points.push([item.lat, item.lng]);
    });
    if (zoom && points.length) state.map.flyToBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 12, duration: 0.8 });
  }

  function selectWard(item) {
    els.province.value = item.province;
    populateMunicipalities();
    els.city.value = item.municipality;
    populateWards();
    els.ward.value = String(item.regionId);
    refresh(true);
  }

  function renderTrend() {
    const canvas = $('trend-chart');
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
    if (typeof Chart === 'undefined' || !state.months.length) return;
    const sel = selection();
    const labels = state.months.map(monthLabel);
    const data = state.months.map(key => D.meanOf(state.rows.filter(r => r.month === key && matches(r, sel)).map(r => r.value)));
    const styles = getComputedStyle(document.documentElement);
    const token = name => styles.getPropertyValue(name).trim();
    $('trend-subtitle').textContent = 'Monthly mean · ' + (els.ward.value ? 'selected ward' : els.city.value || els.province.value || 'all wards');
    state.chart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels, datasets: [{ data, borderColor: token('--primary'), backgroundColor: 'transparent', pointRadius: 3, tension: 0.3, spanGaps: true }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: token('--text-muted'), maxTicksLimit: 5 }, grid: { display: false } }, y: { ticks: { color: token('--text-muted') }, grid: { color: token('--border') } } }
      }
    });
  }

  function syncTimeline(months) {
    const last = months.length ? state.months.indexOf(months[months.length - 1]) : 0;
    els.slider.value = String(Math.max(0, last));
    $('timeline-month').textContent = months.length ? describePeriod(months).toUpperCase() : 'NO DATA';
    $('timeline-start').textContent = state.months.length ? monthLabel(state.months[0]) : '—';
    $('timeline-end').textContent = state.months.length ? monthLabel(state.months[state.months.length - 1]) : '—';
    $('timeline-current').textContent = months.length ? monthLabel(months[months.length - 1]) : '—';
  }

  function refresh(zoom) {
    syncCustomControls();
    const months = activeMonths();
    const monthSet = new Set(months);
    const all = D.aggregate(state.rows.filter(r => monthSet.has(r.month)));
    const range = D.rangeOf(all.map(a => a.mean));
    const sel = selection();
    const shown = all.filter(a => matches(a, sel));
    drawMap(shown, range, zoom);
    syncTimeline(months);

    const ward = sel.ward ? all.find(a => String(a.regionId) === sel.ward) : null;
    setRing('sel', ward ? ward.mean : null, range, sel.ward ? 'No value in this period' : 'No ward selected');
    $('sel-name').textContent = ward ? ward.ward + (ward.municipality ? ' · ' + ward.municipality : '') : 'Select a Ward';
    const mean = D.meanOf(shown.map(a => a.mean));
    const unitLabel = state.variable && state.variable.unit ? ' (' + state.variable.unit + ')' : '';
    $('sel-label').textContent = 'Selected ward' + unitLabel;
    $('mean-label').textContent = (sel.municipality ? 'Municipality mean' : sel.province ? 'Province mean' : 'Area mean') + unitLabel;
    setRing('mean', mean, range, 'No data');
    $('mean-name').textContent = sel.municipality || sel.province || 'All wards';
    $('ramp-min').textContent = range.min === null ? 'Lowest' : 'Lowest ' + format(range.min);
    $('ramp-max').textContent = range.max === null ? 'Highest' : 'Highest ' + format(range.max);
    renderTrend();
  }

  function stopPlayback() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    els.play.setAttribute('aria-pressed', 'false');
  }

  function showMonth(key) {
    els.timeframe.value = 'custom';
    els.year.value = key.slice(0, 4);
    els.month.value = key.slice(5);
    refresh(false);
  }

  function togglePlayback() {
    if (state.timer) {
      stopPlayback();
      return;
    }
    els.play.setAttribute('aria-pressed', 'true');
    state.timer = setInterval(() => {
      const next = (Number(els.slider.value) + 1) % state.months.length;
      showMonth(state.months[next]);
    }, 1200);
  }

  function resetFilters() {
    stopPlayback();
    els.province.value = '';
    populateMunicipalities();
    els.timeframe.value = 'latest';
    els.year.value = '';
    els.month.value = '';
    refresh(true);
  }

  function useData(variable, rows) {
    state.variable = variable;
    state.rows = rows;
    state.months = [...new Set(rows.map(r => r.month))].sort();
    populateRegionSelects();
    populateTimeControls();
    refresh(true);
  }

  async function loadVariable(variable) {
    const token = ++state.token;
    stopPlayback();
    setStatus('loading', 'Loading ' + variable.variable_name + '…', 'Connecting to EOHA data…');
    try {
      const observations = await API.observations(variable.variable_id, (done, total) => {
        if (token === state.token) setStatus('loading', 'Loading observations: ' + done.toLocaleString() + ' of ' + (total === Infinity ? '…' : total.toLocaleString()), 'Loading…');
      });
      const regions = await API.regions();
      if (token !== state.token) return;
      const byId = new Map(regions.items.map(r => [r.region_id, r]));
      const mine = observations.items.filter(o => o.variable_id === variable.variable_id);
      const rows = D.toRows(mine, byId);
      useData(variable, rows);
      if (!rows.length) {
        setStatus('empty', 'The EOHA database has this indicator, but no observations with values were returned' + (observations.truncated ? ' before the page limit was reached. The API needs a filter by variable.' : '.'), 'No observations yet');
        return;
      }
      const note = observations.truncated ? ' Only part of the data was read because the API cannot yet filter by variable.' : '';
      setStatus('ready', rows.length.toLocaleString() + ' observations · ' + state.months.length + ' months · ' + variable.variable_name + '.' + note, 'EOHA database · live data');
    } catch (error) {
      setStatus('error', 'Could not load observations (' + error.message + '). Check that the backend is running and the page is served through the dev server.', 'Backend unreachable');
    }
  }

  function showUnavailable(kind, text, badge) {
    state.rows = [];
    state.months = [];
    state.variable = null;
    populateRegionSelects();
    populateTimeControls();
    refresh(false);
    setStatus(kind, text, badge);
  }

  async function init() {
    ensureMap();
    try {
      const result = await API.variables();
      state.variables = result.items.filter(D.isBiosecurityVariable);
      if (!state.variables.length) {
        showUnavailable('empty', 'No data available.', 'No data available');
        return;
      }
      fill(els.indicator, state.variables.map((v, i) => String(i)), 'Indicator', new Map(state.variables.map((v, i) => [String(i), v.variable_name])));
      els.indicator.remove(0);
      els.indicator.disabled = state.variables.length < 2;
      loadVariable(state.variables[0]);
    } catch (error) {
      showUnavailable('error', 'Could not reach the EOHA backend (' + error.message + '). Start the backend and open this page through tools/dev-server.cjs.', 'Backend unreachable');
    }
  }

  els.province.addEventListener('change', () => { populateMunicipalities(); refresh(true); });
  els.city.addEventListener('change', () => { populateWards(); refresh(true); });
  els.ward.addEventListener('change', () => refresh(true));
  els.timeframe.addEventListener('change', () => { stopPlayback(); refresh(false); });
  els.year.addEventListener('change', () => refresh(false));
  els.month.addEventListener('change', () => refresh(false));
  els.indicator.addEventListener('change', () => loadVariable(state.variables[Number(els.indicator.value)]));
  els.slider.addEventListener('input', () => { stopPlayback(); showMonth(state.months[Number(els.slider.value)]); });
  els.play.addEventListener('click', togglePlayback);
  $('reset-btn').addEventListener('click', resetFilters);
  $('recenter-btn').addEventListener('click', () => refresh(true));
  new MutationObserver(renderTrend).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  init();
})();
