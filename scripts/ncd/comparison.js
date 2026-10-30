/* Period comparisons use observed values only and a common numeric scale. */
const NcdComparison = (() => {
  const maps = [], layers = [];
  const palette = ['#433e85', '#3573b5', '#22a7af', '#91bb62', '#e6bb48', '#d96748'];
  const metadata = {
    Air_Temp_C: ['Air temperature', '°C'],
    LST_Surface_C: ['Surface temperature', '°C'],
    Population_Density_Per_KM2: ['Population density', 'people/km²'],
  };
  let source = [], selected = {}, months = [], initialized = false, syncing = false;
  /**
   * refresh()
   * Purpose: Render three comparable periods using shared extent and measurement bins.
   * Parameters: rows (array), selection (object), periods (array of month labels).
   * Returns: void.
   */
  function refresh(rows, selection, periods) {
    source = rows; selected = selection; months = periods;
    document.getElementById('comparison-region').textContent = selection.ward
      ? 'Ward ' + selection.ward : selection.municipality || selection.province || selection.country || 'Select a region';
    if (!initialized && periods.length) {
      for (let i = 0; i < 3; i++) {
        const select = document.getElementById('period-' + i);
        select.replaceChildren(...periods.map(month => new Option(month, month)));
        select.value = periods[Math.round(i * (periods.length - 1) / 2)];
        select.disabled = false;
        select.addEventListener('change', render);
      }
      document.getElementById('comparison-metric').addEventListener('change', render);
      initialized = true;
    }
    render();
  }
  /**
   * render()
   * Purpose: Draw available ward values, consistent legends and descriptive comparisons.
   * Parameters: none.
   * Returns: void.
   */
  function render() {
    const field = document.getElementById('comparison-metric').value;
    const [name, unit] = metadata[field];
    const groups = [0, 1, 2].map(i => NcdData.filter(source, {
      ...selected, month: document.getElementById('period-' + i).value,
    }));
    const values = groups.flat().map(row => NcdData.number(row[field])).filter(value => value !== null && (field !== 'Population_Density_Per_KM2' || value >= 0));
    const low = values.length ? Math.min(...values) : 0;
    const high = values.length ? Math.max(...values) : 0;
    const step = (high - low) / palette.length;
    document.getElementById('comparison-unit').textContent = name + ' (' + unit + ')';
    const legend = document.getElementById('comparison-legend');
    legend.replaceChildren();
    (values.length ? (step ? palette : [palette[0]]) : []).forEach((color, index, colors) => {
      const li = document.createElement('li'), swatch = document.createElement('span');
      swatch.style.background = color; swatch.className = 'scale-swatch';
      li.append(swatch, step ? `${(low + index * step).toFixed(1)} – ${(low + (index + 1) * step).toFixed(1)}${index === colors.length - 1 ? ' (inclusive)' : ''}` : low.toFixed(1));
      legend.append(li);
    });
    const missing = document.createElement('li'); missing.textContent = '○ Missing measurement'; legend.append(missing);
    const points = groups.flat().filter(row => validLocation(row)).map(row => [+row.latitude, +row.longitude]);
    groups.forEach((rows, i) => {
      const summary = NcdData.summarize(rows)[field];
      document.getElementById('period-summary-' + i).textContent = summary.count
        ? `${summary.value.toFixed(1)} ${unit} mean · ${summary.count} / ${rows.length} valid ward values`
        : 'No measurements for this selection.';
      if (typeof L === 'undefined') {
        document.getElementById('comparison-map-' + i).textContent = 'Map library unavailable. Measurement summaries remain available.';
        return;
      }
      if (!maps[i]) {
        maps[i] = L.map('comparison-map-' + i, { scrollWheelZoom: false }).setView([-29, 25], 5);
        EOHAMap.addBasemap(maps[i]);
        layers[i] = L.layerGroup().addTo(maps[i]);
        maps[i].on('moveend', () => {
          if (syncing) return;
          syncing = true;
          maps.forEach(other => { if (other !== maps[i]) other.setView(maps[i].getCenter(), maps[i].getZoom(), { animate: false }); });
          syncing = false;
        });
        new ResizeObserver(() => maps[i].invalidateSize()).observe(document.getElementById('comparison-map-' + i));
      }
      layers[i].clearLayers();
      const renderer = L.canvas();
      rows.filter(validLocation).forEach(row => {
        const value = NcdData.number(row[field]);
        const available = value !== null && (field !== 'Population_Density_Per_KM2' || value >= 0);
        const color = available ? palette[step ? Math.min(5, Math.floor((value - low) / step)) : 0] : '#7b8794';
        const label = document.createElement('span');
        label.textContent = `${row.WardLabel} · ${row.Month} · ${available ? value.toFixed(1) + ' ' + unit : 'Measurement unavailable'}`;
        L.circleMarker([+row.latitude, +row.longitude], { radius: 4, color, fillColor: color, fillOpacity: available ? .85 : 0, weight: 1, renderer }).bindTooltip(label).addTo(layers[i]);
      });
    });
    if (points.length && maps.length) {
      syncing = true;
      const bounds = L.latLngBounds(points);
      maps.forEach(map => map.fitBounds(bounds, { padding: [15, 15], maxZoom: 10, animate: false }));
      syncing = false;
    }
    document.getElementById('comparison-reading').textContent = values.length
      ? `Across the selected periods, available ${name.toLowerCase()} values range from ${low.toFixed(1)} to ${high.toFixed(1)} ${unit}. Compare colours using the shared scale. Changing ward coverage can affect the mean; differences are descriptive and do not establish a health trend.`
      : 'No measurements are available for these periods and this region. Choose another region or observation period. Missing data is not zero exposure.';
  }
  /**
   * validLocation()
   * Purpose: Exclude missing or out-of-range coordinates from spatial displays.
   * Parameters: row (object) containing latitude and longitude.
   * Returns: boolean.
   */
  function validLocation(row) {
    const lat = NcdData.number(row.latitude), lon = NcdData.number(row.longitude);
    return lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  }
  return { refresh };
})();
