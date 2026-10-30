(() => {
  const province = document.getElementById('region-select'), municipality = document.getElementById('municipality-select');
  const ward = document.getElementById('ward-select'), canvas = document.getElementById('forecastChart');
  let rows = [], days = 7, result = null, cached = false;
  /**
   * text()
   * Purpose: Update a visible summary without inserting HTML.
   * Parameters: id (string), value (string).
   * Returns: void.
   */
  function text(id, value) { document.getElementById(id).textContent = value; }
  /**
   * options()
   * Purpose: Populate geographic filters from actual API records.
   * Parameters: select (element), values (array of value/label pairs).
   * Returns: void.
   */
  function options(select, values) {
    select.length = 1;
    values.forEach(([value, label]) => select.add(new Option(label, value)));
    select.disabled = !values.length;
  }
  /**
   * selectedRows()
   * Purpose: Filter API history without changing its observation dates.
   * Parameters: none.
   * Returns: array of rows.
   */
  function selectedRows() {
    return rows.filter(row => (!province.value || row.Province === province.value) &&
      (!municipality.value || row.Municipali === municipality.value) && (!ward.value || row.WardID === ward.value));
  }
  /**
   * updateWards()
   * Purpose: Reset ward choices for the active municipality and province.
   * Parameters: none.
   * Returns: void.
   */
  function updateWards() {
    ward.value = '';
    options(ward, [...new Map(selectedRows().map(row => [row.WardID, row.WardLabel]))].sort((a, b) => a[1].localeCompare(b[1])));
  }
  province.addEventListener('change', () => {
    municipality.value = ''; ward.value = '';
    options(municipality, [...new Set(selectedRows().map(row => row.Municipali))].sort().map(value => [value, value]));
    updateWards(); render();
  });
  municipality.addEventListener('change', () => { updateWards(); render(); });
  ward.addEventListener('change', render);
  document.querySelectorAll('[data-days]').forEach(button => button.addEventListener('click', () => {
    days = Number(button.dataset.days);
    document.querySelectorAll('[data-days]').forEach(item => {
      const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
    });
    render();
  }));
  /**
   * render()
   * Purpose: Update scenario cards and date-labelled outlook from the current filters.
   * Parameters: none.
   * Returns: void.
   */
  function render() {
    text('range-label', days + '-day outlook');
    result = EOHAForecast.forecast(selectedRows(), days);
    const points = result.points.slice(1);
    if (!points.length) {
      ['ci-upper', 'ci-mean', 'ci-lower', 'peak-day', 'peak-pct'].forEach(id => text(id, '—'));
      text('trend-text', 'Unavailable'); text('trend-arrow', '—');
      text('trend-detail', 'No eligible ward history for this selection.');
      text('model-status', rows.length ? 'Insufficient history' : 'Unavailable');
      text('forecast-status', 'Forecast unavailable. At least four consecutive monthly observations ending in the latest selected period are required.');
      text('model-detail', 'Select another region or retry the API. Missing measurements are excluded.');
      document.getElementById('ci-bar').style.width = '0%'; draw(); return;
    }
    const mean = points.reduce((sum, point) => sum + point.value, 0) / points.length;
    text('ci-upper', (points.reduce((sum, point) => sum + point.upper, 0) / points.length).toFixed(1));
    text('ci-mean', mean.toFixed(1));
    text('ci-lower', (points.reduce((sum, point) => sum + point.lower, 0) / points.length).toFixed(1));
    document.getElementById('ci-bar').style.width = mean + '%';
    const change = points.at(-1).value - result.points[0].value;
    text('trend-text', Math.abs(change) < .05 ? 'Stable' : change > 0 ? 'Increasing' : 'Decreasing');
    text('trend-arrow', Math.abs(change) < .05 ? '→' : change > 0 ? '↗' : '↘');
    text('trend-detail', change.toFixed(1) + ' score points from latest observed conditions.');
    const peak = points.reduce((best, point) => point.value > best.value ? point : best);
    text('peak-day', peak.date); text('peak-pct', peak.value.toFixed(1) + ' / 100 environmental score' + (points.every(p => p.value === peak.value) ? ' · all days tied' : ' · earliest peak'));
    text('model-status', 'Experimental projection');
    text('model-detail', `${result.eligible} / ${result.total} wards eligible. ${result.trendWards} use trend; others use persistence. Latest-month selection error: ${result.error.toFixed(1)} score points (not independent validation). Scenario bounds compare both models, not a confidence interval. Regional scores are unweighted ward means. Monthly inputs anchor to month end; daily points are modelled. Not disease incidence or infection probability.`);
    const stale = result.anchor + days * 86400000 < Date.now();
    text('forecast-status', `${points[0].date} to ${points.at(-1).date} · Latest monthly period: ${new Date(result.anchor).toISOString().slice(0, 7)} (month-end projection anchor). ${stale ? 'Historical outlook: observation history is too old for a forecast from today.' : 'Outlook starts after the latest observed month, not the current day.'}${cached ? ' API cache (up to 5 minutes).' : ''}`);
    draw();
  }
  /**
   * draw()
   * Purpose: Draw projected score and scenario envelope with a fixed 0–100 scale.
   * Parameters: none.
   * Returns: void.
   */
  function draw() {
    const box = canvas.getBoundingClientRect(), ratio = window.devicePixelRatio || 1;
    const width = Math.max(100, box.width), height = Math.max(100, box.height);
    canvas.width = width * ratio; canvas.height = height * ratio;
    const ctx = canvas.getContext('2d'); ctx.scale(ratio, ratio);
    const style = getComputedStyle(document.documentElement);
    const foreground = style.getPropertyValue('--text-muted').trim() || '#64748b';
    const primary = style.getPropertyValue('--primary').trim() || '#0865e9';
    const left = 44, right = width - 20, top = 30, bottom = height - 55;
    ctx.font = '12px Segoe UI'; ctx.fillStyle = foreground;
    for (let score = 0; score <= 100; score += 25) {
      const y = bottom - score / 100 * (bottom - top);
      ctx.fillText(String(score), 8, y + 4); ctx.strokeStyle = style.getPropertyValue('--border').trim();
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
    }
    ctx.fillText('Environmental suitability score / 100', left, 16);
    const points = result?.points || [];
    if (!points.length) { ctx.fillText('Forecast unavailable — awaiting eligible API history', left, (top + bottom) / 2); return; }
    const x = i => left + i / (points.length - 1) * (right - left);
    const y = value => bottom - value / 100 * (bottom - top);
    ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(x(i), y(point.upper)) : ctx.moveTo(x(i), y(point.upper)));
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(x(i), y(points[i].lower));
    ctx.closePath(); ctx.fillStyle = primary; ctx.globalAlpha = .16; ctx.fill(); ctx.globalAlpha = 1;
    ctx.strokeStyle = primary; ctx.lineWidth = 2.5; ctx.beginPath();
    points.forEach((point, i) => i ? ctx.lineTo(x(i), y(point.value)) : ctx.moveTo(x(i), y(point.value))); ctx.stroke();
    ctx.fillStyle = foreground; ctx.textAlign = 'left'; ctx.fillText(points[0].date, left, bottom + 25);
    ctx.textAlign = 'right'; ctx.fillText(points.at(-1).date, right, bottom + 25); ctx.textAlign = 'left';
    canvas.setAttribute('aria-label', `Environmental score from ${points[0].value.toFixed(1)} on ${points[0].date} to ${points.at(-1).value.toFixed(1)} on ${points.at(-1).date}. Scenario range is not a confidence interval.`);
  }
  /**
   * load()
   * Purpose: Reuse the hosted API and its cache; keep layout visible on failures.
   * Parameters: none.
   * Returns: Promise<void>.
   */
  async function load() {
    const retry = document.getElementById('retry-btn'); retry.disabled = true;
    text('model-status', 'Loading'); text('forecast-status', 'Fetching API observations…');
    rows = []; result = null; draw();
    [province, municipality, ward].forEach(select => { select.value = ''; options(select, []); });
    try {
      const data = await EOHAMalariaAPI.load(); rows = data.rows; cached = data.fromCache;
      options(province, [...new Set(rows.map(row => row.Province))].sort().map(value => [value, value]));
      options(municipality, [...new Set(rows.map(row => row.Municipali))].sort().map(value => [value, value]));
      updateWards(); render();
    } catch (error) {
      render(); text('forecast-status', error.message + ' Use Retry to reconnect.');
    } finally { retry.disabled = false; }
  }
  document.getElementById('retry-btn').addEventListener('click', load);
  new ResizeObserver(draw).observe(canvas.parentElement);
  new MutationObserver(draw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  load();
})();
