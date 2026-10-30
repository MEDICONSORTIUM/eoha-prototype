(function () {
  const D = window.BiosecData;
  const API = window.BiosecApi;
  const S = window.BiosecScoring;
  const DISEASES = window.BiosecDiseases;
  const $ = id => document.getElementById(id);
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const RING_LENGTH = 251.33;
  const DEMO_NOTE = 'Environmental risk indicator with placeholder weights. Not outbreak records and not a prediction.';

  const els = {
    province: $('province-select'),
    city: $('city-select'),
    ward: $('ward-select'),
    disease: $('disease-select'),
    timeframe: $('timeframe-select'),
    year: $('year-select'),
    month: $('month-select'),
    slider: $('time-slider'),
    play: $('play-btn')
  };

  const state = { wards: [], months: [], map: null, markers: null, renderer: null, chart: null, timer: null, cache: new Map() };

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

  function formatRaw(value, unit) {
    if (value === null || value === undefined) return 'n/a';
    const digits = Math.abs(value) >= 100 ? 0 : Math.abs(value) >= 1 ? 1 : 3;
    return value.toFixed(digits) + (unit ? ' ' + unit : '');
  }

  function disease() {
    return DISEASES[els.disease.value];
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

  function scoreFor(months) {
    const key = els.disease.value + '|' + months.join(',');
    if (!state.cache.has(key)) {
      const scored = S.scoreWards(state.wards, months, disease()).filter(w => w.score !== null).map(w => ({ ...w, mean: w.score }));
      state.cache.set(key, scored);
    }
    return state.cache.get(key);
  }

  function populateRegionSelects() {
    const provinces = [...new Set(state.wards.map(w => w.province).filter(Boolean))].sort();
    fill(els.province, provinces, 'All provinces');
    els.province.disabled = !provinces.length;
    populateMunicipalities();
  }

  function populateMunicipalities() {
    const rows = state.wards.filter(w => !els.province.value || w.province === els.province.value);
    const municipalities = [...new Set(rows.map(w => w.municipality).filter(Boolean))].sort();
    fill(els.city, municipalities, 'All municipalities');
    els.city.disabled = !municipalities.length;
    populateWards();
  }

  function populateWards() {
    const rows = state.wards.filter(w => (!els.province.value || w.province === els.province.value) && (!els.city.value || w.municipality === els.city.value));
    const names = new Map(rows.map(w => [String(w.regionId), w.ward]));
    const ids = [...names.keys()].sort((a, b) => names.get(a).localeCompare(names.get(b), undefined, { numeric: true }));
    fill(els.ward, ids, 'All wards', names);
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

  function setRing(prefix, value, emptyText) {
    const ring = $(prefix + '-ring');
    const t = value === null ? null : value / 100;
    $(prefix + '-text').textContent = value === null ? '--' : value.toFixed(0);
    $(prefix + '-sub').textContent = value === null ? emptyText : 'out of 100';
    ring.style.strokeDasharray = String(RING_LENGTH);
    ring.style.strokeDashoffset = String(RING_LENGTH * (1 - (t === null ? 0 : t)));
    ring.style.stroke = t === null ? 'var(--border)' : D.ramp(t);
  }

  function renderFactors(parts) {
    const list = $('factor-list');
    list.replaceChildren();
    parts.forEach(part => {
      const row = document.createElement('div');
      row.className = 'factor-row';
      const labels = document.createElement('div');
      labels.className = 'factor-labels';
      const name = document.createElement('span');
      name.textContent = part.label + ' · weight ' + part.weight + '%';
      const value = document.createElement('span');
      value.className = 'val';
      value.textContent = formatRaw(part.raw, part.unit);
      labels.append(name, value);
      const track = document.createElement('div');
      track.className = 'track';
      const level = part.level === null ? 0 : Math.round(part.level * 100);
      track.title = part.level === null ? 'No data for this factor' : 'Factor level: ' + level + '% of its maximum contribution';
      const bar = document.createElement('div');
      bar.className = 'fill';
      bar.style.width = level + '%';
      track.append(bar);
      row.append(labels, track);
      list.append(row);
    });
  }

  function averageParts(shown) {
    return disease().factors.map((factor, index) => {
      const present = shown.map(w => w.parts[index]).filter(p => p.raw !== null);
      return {
        key: factor.key,
        label: factor.label,
        weight: factor.weight,
        unit: factor.unit,
        raw: D.meanOf(present.map(p => p.raw)),
        level: D.meanOf(present.map(p => p.level))
      };
    });
  }

  function ensureMap() {
    if (state.map || typeof L === 'undefined') return;
    state.map = L.map('map', { zoomControl: false, attributionControl: true }).setView([-29, 25], 5);
    window.EOHAMap.addBasemap(state.map);
    state.markers = L.layerGroup().addTo(state.map);
    state.renderer = L.canvas();
  }

  function drawMap(shown, zoom) {
    ensureMap();
    if (!state.map) return;
    state.markers.clearLayers();
    const points = [];
    const focused = els.ward.value;
    shown.forEach(item => {
      if (item.lat === null || item.lng === null) return;
      const colour = D.ramp(item.mean / 100);
      const selected = focused && String(item.regionId) === focused;
      L.circleMarker([item.lat, item.lng], { renderer: state.renderer, radius: selected ? 9 : shown.length > 800 ? 3 : 5, color: selected ? '#ffffff' : colour, weight: selected ? 2 : 1, fillColor: colour, fillOpacity: 0.85 })
        .bindTooltip(item.ward + ' | ' + item.municipality + ' | ' + item.mean.toFixed(0) + ' pts')
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
    if (state.chart) {
      state.chart.destroy();
      state.chart = null;
    }
    if (typeof Chart === 'undefined' || !state.months.length) return;
    const sel = selection();
    const data = state.months.map(key => D.meanOf(scoreFor([key]).filter(w => matches(w, sel)).map(w => w.score)));
    const styles = getComputedStyle(document.documentElement);
    const token = name => styles.getPropertyValue(name).trim();
    $('trend-subtitle').textContent = 'Monthly mean · ' + (els.ward.value ? 'selected ward' : els.city.value || els.province.value || 'all wards');
    state.chart = new Chart($('trend-chart').getContext('2d'), {
      type: 'line',
      data: { labels: state.months.map(monthLabel), datasets: [{ data, borderColor: token('--primary'), backgroundColor: 'transparent', pointRadius: 3, tension: 0.3, spanGaps: true }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ticks: { color: token('--text-muted'), maxTicksLimit: 5 }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: token('--text-muted') }, grid: { color: token('--border') } } }
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
    $('disease-summary').textContent = disease().summary;
    const months = activeMonths();
    const all = scoreFor(months);
    const sel = selection();
    const shown = all.filter(w => matches(w, sel));
    drawMap(shown, zoom);
    syncTimeline(months);

    const ward = sel.ward ? all.find(w => String(w.regionId) === sel.ward) : null;
    setRing('sel', ward ? ward.score : null, sel.ward ? 'Too little data' : 'No ward selected');
    $('sel-name').textContent = ward ? ward.ward + (ward.municipality ? ' · ' + ward.municipality : '') : 'Select a Ward';
    const mean = D.meanOf(shown.map(w => w.score));
    $('mean-label').textContent = (sel.municipality ? 'Municipality mean' : sel.province ? 'Province mean' : 'Area mean') + ' · risk points';
    setRing('mean', mean, 'No data');
    $('mean-name').textContent = sel.municipality || sel.province || 'All wards';
    if (ward) renderFactors(ward.parts);
    else if (shown.length) renderFactors(averageParts(shown));
    else $('factor-list').replaceChildren();
    $('factor-subtitle').textContent = (ward ? 'Selected ward' : 'Average of the wards shown') + ' · placeholder weights';
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
    state.timer = setInterval(() => showMonth(state.months[(Number(els.slider.value) + 1) % state.months.length]), 1200);
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

  function useData(wards) {
    state.cache.clear();
    state.wards = wards;
    state.months = [...new Set(wards.flatMap(w => Object.keys(w.series)))].sort();
    populateRegionSelects();
    populateTimeControls();
    refresh(true);
    const first = state.months[0];
    const last = state.months[state.months.length - 1];
    setStatus('ready', wards.length.toLocaleString() + ' wards · ' + (state.months.length ? monthLabel(first) + ' – ' + monthLabel(last) : 'no months') + '. ' + DEMO_NOTE, 'Environmental indicator · placeholder weights');
  }

  function neededCodes() {
    return new Set(Object.values(DISEASES).flatMap(d => d.factors.map(f => f.variable)));
  }

  async function load() {
    setStatus('loading', 'Connecting to EOHA data…', 'Connecting to EOHA data…');
    const variables = (await API.variables()).items;
    const needed = neededCodes();
    const codeById = new Map(variables.filter(v => needed.has(v.variable_code)).map(v => [v.variable_id, v.variable_code]));
    const missing = [...needed].filter(code => ![...codeById.values()].includes(code));
    if (missing.length) {
      setStatus('error', 'The EOHA database is missing required variables: ' + missing.join(', ') + '.', 'Data incomplete');
      return;
    }
    const [total, runs] = await Promise.all([API.observationTotal(), API.etlRuns()]);
    const key = total + ':' + Math.max(0, ...runs.items.map(run => run.etl_run_id));
    const cached = await API.cacheGet();
    if (cached && cached.key === key) {
      useData(cached.wards);
      return;
    }
    const regions = await API.regions();
    const builder = D.createWardBuilder(codeById, new Map(regions.items.map(region => [region.region_id, region])));
    await API.streamObservations(builder.add, (done, pages) => {
      setStatus('loading', 'Loading EOHA observations: ' + done + ' of ' + pages + ' pages. The API has no filters yet, so the first load is slow. It is saved in this browser for next time.', 'Loading EOHA data…');
    });
    const wards = builder.result();
    useData(wards);
    API.cacheSet({ key, wards });
  }

  async function init() {
    ensureMap();
    $('disease-summary').textContent = disease().summary;
    try {
      await load();
    } catch (error) {
      setStatus('error', 'Could not load EOHA data (' + error.message + '). Check that the backend is running and open this page through tools/dev-server.cjs.', 'Backend unreachable');
    }
  }

  els.province.addEventListener('change', () => { populateMunicipalities(); refresh(true); });
  els.city.addEventListener('change', () => { populateWards(); refresh(true); });
  els.ward.addEventListener('change', () => refresh(true));
  els.disease.addEventListener('change', () => { stopPlayback(); refresh(false); });
  els.timeframe.addEventListener('change', () => { stopPlayback(); refresh(false); });
  els.year.addEventListener('change', () => refresh(false));
  els.month.addEventListener('change', () => refresh(false));
  els.slider.addEventListener('input', () => { stopPlayback(); showMonth(state.months[Number(els.slider.value)]); });
  els.play.addEventListener('click', togglePlayback);
  $('reset-btn').addEventListener('click', resetFilters);
  $('recenter-btn').addEventListener('click', () => refresh(true));
  new MutationObserver(renderTrend).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  init();
})();
