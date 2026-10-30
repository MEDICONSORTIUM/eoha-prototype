const countrySelect = document.getElementById('country-select');
const provinceSelect = document.getElementById('province-select');
const citySelect = document.getElementById('city-select');
const status = document.getElementById('map-status');
const regionName = document.getElementById('selected-region-name');
let map, countries, provinces;
const countryLayers = new Map();
const provinceLayers = new Map();
const neutralStyle = { color: '#64748b', weight: 1.5, fillColor: '#94a3b8', fillOpacity: 0.12 };
const selectedStyle = { color: '#1a82ff', weight: 3, fillColor: '#1a82ff', fillOpacity: 0.2 };
let loadVersion = 0;
let observations = [],
  wardMarkers = null,
  wardRenderer = null;
const wardSelect = document.getElementById('ward-select');
const monthSelect = document.getElementById('month-select');
const timeSlider = document.getElementById('time-slider');
let timelineMonths = [],
  playback = null;
/**
 * selection()
 * -----------
 * Read the currently selected NCD observation country, province, municipality, ward and month.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * object
 */
function selection() {
  return {
    country: countrySelect.value,
    province: provinceSelect.value,
    municipality: citySelect.value,
    ward: wardSelect.value,
    month: monthSelect.value,
  };
}
/**
 * availableRows()
 * ---------------
 * Return historical NCD observations for the selected country, province and month before ward
 * filtering.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Array<object>
 */
function availableRows() {
  return NcdData.filter(observations, { ...selection(), municipality: '', ward: '' });
}
/**
 * populateMunicipalities()
 * ------------------------
 * Build municipality options for the active region and month, optionally preserving the current
 * selection.
 *
 * Parameters:
 * -----------
 * preserve: boolean — Whether to keep the currently selected municipality when it remains
 * available.
 *
 * Returns:
 * --------
 * void
 */
function populateMunicipalities(preserve = false) {
  const previous = preserve ? citySelect.value : '';
  const municipalities = [...new Set(availableRows().map((row) => row.Municipali))].sort();
  options(citySelect, municipalities);
  citySelect.disabled = municipalities.length === 0;
  if (municipalities.includes(previous)) citySelect.value = previous;
  populateWards();
}
/**
 * populateWards()
 * ---------------
 * Build ward options for the active municipality and preserve a still-available selected ward.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function populateWards() {
  const previous = wardSelect.value;
  const rows = availableRows().filter(
    (row) => !citySelect.value || row.Municipali === citySelect.value,
  );
  wardSelect.length = 1;
  const wards = new Map(rows.map((row) => [String(row.WardID), row.WardLabel]));
  [...wards]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([id, label]) => wardSelect.add(new Option(label, id)));
  wardSelect.disabled = wards.size === 0;
  if (wards.has(previous)) wardSelect.value = previous;
}
/**
 * updateTimeline()
 * ----------------
 * Synchronize the month dropdown, timeline slider and visible observation-period labels.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function updateTimeline() {
  const index = timelineMonths.indexOf(monthSelect.value);
  timeSlider.value = Math.max(0, index);
  timeSlider.setAttribute('aria-valuetext', monthSelect.value);
  document.getElementById('timeline-month').textContent = monthSelect.value;
  document.getElementById('timeline-current').textContent = monthSelect.value;
}
/**
 * refreshObservations()
 * ---------------------
 * Summarize historical measurements, redraw neutral ward markers and optionally frame the selected
 * region.
 *
 * Parameters:
 * -----------
 * zoom: boolean — Whether to fit the map around the selected observation locations.
 *
 * Returns:
 * --------
 * void
 */
function refreshObservations(zoom = false) {
  updateTimeline();
  const rows = NcdData.filter(observations, selection());
  const summary = NcdData.summarize(rows);
  const fields = [
    ['air-temp-value', 'Air_Temp_C', '°C'],
    ['surface-temp-value', 'LST_Surface_C', '°C'],
    ['density-value', 'Population_Density_Per_KM2', 'people/km²'],
  ];
  for (const [id, field, unit] of fields) {
    const item = summary[field];
    document.getElementById(id).textContent =
      item.value === null ? 'Unavailable' : item.value.toFixed(1) + ' ' + unit;
    document.getElementById(id).title = item.count + ' wards with valid measurements';
    document.getElementById(id.replace('-value', '-bar')).style.width =
      (rows.length ? (100 * item.count) / rows.length : 0) + '%';
  }
  document.getElementById('dataset-summary').textContent = rows.length
    ? monthSelect.value + ' · ' + rows.length + ' historical ward observations'
    : 'No historical observations for this region and month.';
  regionName.textContent =
    (wardSelect.value ? wardSelect.selectedOptions[0].textContent : '') ||
    citySelect.value ||
    provinceSelect.value ||
    countrySelect.value ||
    'Select a Region';
  document.getElementById('selected-municipality-name').textContent =
    citySelect.value || 'Select a municipality';
  if (!map) return;
  if (!wardMarkers) wardMarkers = L.layerGroup().addTo(map);
  wardMarkers.clearLayers();
  const points = [];
  const renderer = wardRenderer || (wardRenderer = L.canvas());
  const markerColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--primary')
    .trim();
  rows.forEach((row) => {
    const latitude = NcdData.number(row.latitude);
    const longitude = NcdData.number(row.longitude);
    if (
      latitude === null ||
      longitude === null ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    )
      return;
    const label = document.createElement('span');
    label.textContent =
      row.WardLabel + ' | ' + row.Municipali + ' | ' + row.Month + ' | observed measurements';
    L.circleMarker([latitude, longitude], {
      radius: wardSelect.value ? 8 : 4,
      color: markerColor,
      fillColor: markerColor,
      weight: 1,
      fillOpacity: 0.8,
      renderer,
    })
      .bindTooltip(label)
      .on('click', () => {
        provinceSelect.value = row.Province;
        populateMunicipalities();
        citySelect.value = row.Municipali;
        populateWards();
        wardSelect.value = String(row.WardID);
        refreshObservations(true);
      })
      .addTo(wardMarkers);
    points.push([latitude, longitude]);
  });
  if (zoom && points.length) frame({ getBounds: () => L.latLngBounds(points) });
}
/**
 * loadObservations()
 * ------------------
 * Read the historical observation CSV, initialize valid periods and selectors, and expose load
 * failures.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */
async function loadObservations() {
  const version = ++loadVersion;
  stopPlayback();
  observations = [];
  timelineMonths = [];
  monthSelect.disabled = true;
  timeSlider.disabled = true;
  document.getElementById('play-months-btn').disabled = true;
  document.getElementById('dataset-summary').textContent = 'Loading historical observations…';
  try {
    if (typeof Papa === 'undefined') throw new Error('CSV parser unavailable');
    const response = await fetch('../../data/malaria/Limpopo_Risk_Jan25_Jan26_Safe.csv');
    if (!response.ok) throw new Error('Historical dataset request failed');
    const parsed = Papa.parse(await response.text(), { header: true, skipEmptyLines: true });
    if (parsed.errors.length) throw new Error('Invalid historical dataset');
    if (version !== loadVersion) return;
    observations = parsed.data.filter((row) => row.Month && row.WardID && row.Province);
    const months = [...new Set(observations.map((row) => row.Month))].sort(
      (a, b) => Date.parse('1 ' + a) - Date.parse('1 ' + b),
    );
    if (!months.length) throw new Error('No historical observations');
    timelineMonths = months;
    timeSlider.max = months.length - 1;
    timeSlider.disabled = false;
    document.getElementById('play-months-btn').disabled = months.length < 2;
    document.getElementById('timeline-start').textContent = months[0];
    document.getElementById('timeline-end').textContent = months.at(-1);
    options(monthSelect, months);
    monthSelect.options[0].textContent = '-- Select Month --';
    monthSelect.options[0].disabled = true;
    monthSelect.value = months.at(-1);
    monthSelect.disabled = false;
    countrySelect.value = 'South Africa';
    countryChanged();
    refreshObservations(true);
  } catch (error) {
    if (version !== loadVersion) return;
    observations = [];
    refreshObservations();
    document.getElementById('dataset-summary').textContent =
      error.message + '. Reload the page to retry.';
  }
}
/**
 * options()
 * ---------
 * Replace select options while retaining the first placeholder option.
 *
 * Parameters:
 * -----------
 * select: HTMLSelectElement — The dropdown whose options should be replaced.
 * values: Array<string> — The available dropdown choices.
 *
 * Returns:
 * --------
 * void
 */
function options(select, values) {
  select.length = 1;
  values.forEach((value) => select.add(new Option(value, value)));
}
/**
 * frame()
 * -------
 * Fit the map to the selected boundaries while allowing space for the dashboard panels.
 *
 * Parameters:
 * -----------
 * layer: object — A Leaflet layer exposing the selected geographic bounds.
 *
 * Returns:
 * --------
 * void
 */
function frame(layer) {
  if (!map || !layer) return;
  const desktop = window.innerWidth > 1100;
  map.fitBounds(layer.getBounds(), {
    paddingTopLeft: desktop ? [280, 150] : [20, 20],
    paddingBottomRight: desktop ? [260, 150] : [20, 35],
    maxZoom: 9,
  });
}
/**
 * selectRegion()
 * --------------
 * Highlight the selected country or province boundary and refresh its historical observations.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function selectRegion() {
  const country = countrySelect.value;
  const province = provinceSelect.value;
  countryLayers.forEach((layer) => layer.setStyle(neutralStyle));
  provinceLayers.forEach((layer) => layer.setStyle(neutralStyle));
  if (provinces) {
    if (country === 'South Africa') provinces.addTo(map);
    else map.removeLayer(provinces);
  }
  const layer =
    (country === 'South Africa' && province ? provinceLayers.get(province) : null) ||
    countryLayers.get(country);
  if (layer) {
    layer.setStyle(selectedStyle);
    frame(layer);
  }
  regionName.textContent = province || country || 'Select a Region';
  status.textContent = country
    ? 'Historical measurements; NCD scoring unavailable.'
    : 'Select a country or click a boundary to explore.';
  refreshObservations();
}
/**
 * countryChanged()
 * ----------------
 * Reset dependent province and municipality selectors after the country selection changes.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function countryChanged() {
  options(provinceSelect, Object.keys(ncdRegionData[countrySelect.value] || {}));
  provinceSelect.disabled = !countrySelect.value;
  options(citySelect, []);
  citySelect.disabled = true;
  populateMunicipalities();
  document.getElementById('apply-btn').disabled = !countrySelect.value;
  selectRegion();
}
countrySelect.addEventListener('change', countryChanged);
provinceSelect.addEventListener('change', () => {
  populateMunicipalities();
  selectRegion();
});
citySelect.addEventListener('change', () => {
  populateWards();
  refreshObservations(true);
});
document.getElementById('ward-select').addEventListener('change', () => refreshObservations(true));
document.getElementById('month-select').addEventListener('change', () => {
  populateMunicipalities(true);
  refreshObservations(true);
});
document.getElementById('apply-btn').addEventListener('click', () => {
  selectRegion();
  refreshObservations(true);
});
document.getElementById('reset-btn').addEventListener('click', () => {
  countrySelect.value = '';
  countryChanged();
  recenter();
});
/**
 * recenter()
 * ----------
 * Restore the NCD map to its default southern Africa view.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function recenter() {
  if (map) map.setView([-23, 25], 4);
}
document.getElementById('recenter-btn').addEventListener('click', recenter);
options(countrySelect, Object.keys(ncdRegionData));
document.getElementById('risk-text').textContent = '—';
document.getElementById('risk-percentage').textContent = 'No score';
/**
 * loadGeojson()
 * -------------
 * Request a local boundary file and reject unsuccessful HTTP responses.
 *
 * Parameters:
 * -----------
 * path: string — The local GeoJSON request path.
 *
 * Returns:
 * --------
 * Promise<object>
 */
async function loadGeojson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('Boundary request failed: ' + response.status);
  return response.json();
}
/**
 * initializeMap()
 * ---------------
 * Initialize the NCD map and its selectable country and province boundary layers.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */
async function initializeMap() {
  if (typeof L === 'undefined') {
    status.textContent = 'The map library could not load. Check your connection and reload.';
    return;
  }
  map = L.map('map', { zoomControl: false });
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  recenter();
  const tiles = EOHAMap.addBasemap(map);
  tiles.on('tileerror', () => {
    status.textContent = 'Basemap tiles are unavailable. Local boundaries remain usable.';
  });
  const results = await Promise.allSettled([
    loadGeojson('../../data/shared/africa-countries.geo.json'),
    loadGeojson('../../data/shared/South_Africa_ADM1.geojson'),
  ]);
  if (results[0].status === 'fulfilled') {
    countries = L.geoJSON(results[0].value, {
      filter: (feature) => Object.hasOwn(ncdRegionData, feature.properties.name),
      style: neutralStyle,
      /**
       * onEachFeature()
       * ---------------
       * Attach a boundary tooltip and connect map clicks to region selection.
       *
       * Parameters:
       * -----------
       * feature: object — A GeoJSON country or province feature.
       * layer: object — A Leaflet layer exposing the selected geographic bounds.
       *
       * Returns:
       * --------
       * void
       */
      onEachFeature(feature, layer) {
        const name = feature.properties.name;
        countryLayers.set(name, layer);
        layer.bindTooltip(name);
        layer.on('click', () => {
          countrySelect.value = name;
          countryChanged();
        });
      },
    }).addTo(map);
  }
  if (results[1].status === 'fulfilled') {
    provinces = L.geoJSON(results[1].value, {
      style: neutralStyle,
      /**
       * onEachFeature()
       * ---------------
       * Attach a boundary tooltip and connect map clicks to region selection.
       *
       * Parameters:
       * -----------
       * feature: object — A GeoJSON country or province feature.
       * layer: object — A Leaflet layer exposing the selected geographic bounds.
       *
       * Returns:
       * --------
       * void
       */
      onEachFeature(feature, layer) {
        const name = feature.properties.shapeName;
        provinceLayers.set(name, layer);
        layer.bindTooltip(name);
        layer.on('click', () => {
          if (countrySelect.value !== 'South Africa') {
            countrySelect.value = 'South Africa';
            countryChanged();
          }
          provinceSelect.value = name;
          provinceSelect.dispatchEvent(new Event('change'));
        });
      },
    });
  }
  selectRegion();
  if (results.some((result) => result.status === 'rejected'))
    status.textContent =
      'Some boundaries could not load. Serve this project with a local HTTP server and reload.';
  new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById('map'));
}
initializeMap().catch(() => {
  status.textContent = 'The map could not initialize. Reload the page to try again.';
});

loadObservations();

timeSlider.addEventListener('input', () => {
  monthSelect.value = timelineMonths[Number(timeSlider.value)];
  monthSelect.dispatchEvent(new Event('change'));
});
/**
 * stopPlayback()
 * --------------
 * Stop NCD timeline animation and restore the play button labels.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function stopPlayback() {
  clearInterval(playback);
  playback = null;
  document.getElementById('play-months-btn').setAttribute('aria-pressed', 'false');
  document
    .getElementById('play-months-btn')
    .setAttribute('aria-label', 'Play observation timeline');
}
document.getElementById('play-months-btn').addEventListener('click', () => {
  if (playback) {
    stopPlayback();
    return;
  }
  document.getElementById('play-months-btn').setAttribute('aria-pressed', 'true');
  document
    .getElementById('play-months-btn')
    .setAttribute('aria-label', 'Pause observation timeline');
  playback = setInterval(() => {
    const next = (Number(timeSlider.value) + 1) % timelineMonths.length;
    timeSlider.value = next;
    timeSlider.dispatchEvent(new Event('input'));
  }, 1500);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopPlayback();
});
document
  .getElementById('find-region-btn')
  .addEventListener('click', () => document.getElementById('city-select').focus());
document.getElementById('dataset-info-btn').addEventListener('click', () => {
  const summary = document.getElementById('dataset-summary');
  summary.scrollIntoView({ block: 'center' });
  summary.setAttribute('tabindex', '-1');
  summary.focus({ preventScroll: true });
});
