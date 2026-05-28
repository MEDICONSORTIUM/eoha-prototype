// -------------------- Constants --------------------
const DEFAULT_VIEW = { lat: -23.4013, lng: 29.4179, zoom: 7 };

const MONTH_DATA = [
  { id: 'Jan 2025', month: 'January', year: '2025' },
  { id: 'Feb 2025', month: 'February', year: '2025' },
  { id: 'Mar 2025', month: 'March', year: '2025' },
  { id: 'Apr 2025', month: 'April', year: '2025' },
  { id: 'May 2025', month: 'May', year: '2025' },
  { id: 'Jun 2025', month: 'June', year: '2025' },
  { id: 'Jul 2025', month: 'July', year: '2025' },
  { id: 'Aug 2025', month: 'August', year: '2025' },
  { id: 'Sep 2025', month: 'September', year: '2025' },
  { id: 'Oct 2025', month: 'October', year: '2025' },
  { id: 'Nov 2025', month: 'November', year: '2025' },
  { id: 'Dec 2025', month: 'December', year: '2025' },
  { id: 'Jan 2026', month: 'January', year: '2026' },
];

const RISK_COLORS = {
  high: '#d93025',
  moderate: '#f9bb06',
  low: '#34a853',
  empty: '#cbd5e1',
  average: '#5c6c85',
};

const HEATMAP_GRADIENT = {
  0.4: RISK_COLORS.low,
  0.6: RISK_COLORS.moderate,
  1.0: RISK_COLORS.high,
};

// -------------------- State --------------------
const district_lookup = {};
let all_risk_data = [];
let current_month_index = 0;
let selected_municipality = null;

// -------------------- DOM Elements --------------------
const country_select = document.getElementById('country-select');
const municipality_select = document.getElementById('province-select');
const ward_select = document.getElementById('city-select');
const apply_button = document.getElementById('apply-btn');
const reset_button = document.getElementById('reset-btn');
const risk_filter = document.getElementById('risk-level-filter');
const time_slider = document.getElementById('time-slider');

// -------------------- Map Setup --------------------
const map = L.map('map', { zoomControl: false }).setView(
  [DEFAULT_VIEW.lat, DEFAULT_VIEW.lng],
  DEFAULT_VIEW.zoom,
);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
}).addTo(map);

const city_layer = L.layerGroup().addTo(map);

const heat_layer = L.heatLayer([], {
  radius: 20,
  blur: 15,
  maxZoom: 10,
  minOpacity: 0.3,
  max: 1.5,
  gradient: HEATMAP_GRADIENT,
}).addTo(map);

map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none';

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
  pane: 'labels',
}).addTo(map);

// -------------------- Risk Logic --------------------

/**
 * get_risk_color()
 * ----------------
 * Returns the display color for a given malaria risk score.
 *
 * Parameters:
 * -----------
 * score: number
 *   The calculated malaria risk score.
 *
 * Returns:
 * --------
 * string
 *   A hex color value representing the risk level.
 */
function get_risk_color(score) {
  if (score >= 50) return RISK_COLORS.high;
  if (score >= 25) return RISK_COLORS.moderate;
  return RISK_COLORS.low;
}

/**
 * get_risk_label()
 * ----------------
 * Returns the textual risk label for a given malaria risk score.
 *
 * Parameters:
 * -----------
 * score: number
 *   The calculated malaria risk score.
 *
 * Returns:
 * --------
 * string
 *   The risk label: 'High', 'Moderate', or 'Low'.
 */
function get_risk_label(score) {
  if (score >= 50) return 'High';
  if (score >= 25) return 'Moderate';
  return 'Low';
}

/**
 * calculate_risk_score()
 * ----------------------
 * Calculates a malaria risk score using ward-level environmental data.
 *
 * Parameters:
 * -----------
 * ward_data: object
 *   A ward record from the CSV dataset.
 *
 * Returns:
 * --------
 * number
 *   A malaria risk score from 0 to 100.
 */
function calculate_risk_score(ward_data) {
  let score = 0;

  const soil_moisture = Number(ward_data.Soil_Moisture) || 0;
  const surface_temp = Number(ward_data.LST_Surface_C) || 0;
  const water_index = Number(ward_data.NDWI_Water) || 0;
  const population_density = Number(ward_data.Population_Density_Per_KM2) || 0;

  if (soil_moisture > 0.35) {
    score += 40;
  } else if (soil_moisture > 0.25) {
    score += 20;
  }

  if (surface_temp >= 25 && surface_temp <= 30) {
    score += 30;
  }

  if (water_index > -0.1) {
    score += 20;
  }

  if (population_density > 300) {
    score += 10;
  }

  return Math.min(score, 100);
}

// -------------------- Shared Helpers --------------------

/**
 * get_current_month_id()
 * ----------------------
 * Gets the dataset month ID selected by the timeline slider.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * string
 *   The selected month ID, for example 'Jan 2025'.
 */
function get_current_month_id() {
  return MONTH_DATA[current_month_index].id;
}

/**
 * clear_select()
 * --------------
 * Clears a dropdown while keeping its default placeholder option.
 *
 * Parameters:
 * -----------
 * select_element: HTMLSelectElement
 *   The dropdown element to clear.
 *
 * Returns:
 * --------
 * void
 */
function clear_select(select_element) {
  select_element.length = 1;
}

/**
 * get_current_municipality_wards()
 * --------------------------------
 * Gets all wards for the selected municipality and selected month.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * array
 *   A list of ward records for the current municipality and month.
 */
function get_current_municipality_wards() {
  if (!selected_municipality) return [];

  const current_month_id = get_current_month_id();
  const wards = district_lookup[selected_municipality] || [];

  return wards.filter((ward) => ward.Month === current_month_id);
}

/**
 * calculate_average_risk_score()
 * ------------------------------
 * Calculates the average malaria risk score for a list of wards.
 *
 * Parameters:
 * -----------
 * wards: array
 *   A list of ward records.
 *
 * Returns:
 * --------
 * number | null
 *   The rounded average risk score, or null when no wards are available.
 */
function calculate_average_risk_score(wards) {
  if (wards.length === 0) return null;

  const total_score = wards.reduce((sum, ward) => {
    return sum + calculate_risk_score(ward);
  }, 0);

  return Math.round(total_score / wards.length);
}

/**
 * format_municipality_name()
 * --------------------------
 * Removes unnecessary wording from a municipality name for cleaner display.
 *
 * Parameters:
 * -----------
 * municipality_name: string
 *   The full municipality name from the dataset.
 *
 * Returns:
 * --------
 * string
 *   The cleaned municipality name.
 */
function format_municipality_name(municipality_name) {
  return municipality_name.replace(/ Local Municipality$/i, '');
}

// -------------------- Donut Charts --------------------

/**
 * update_risk_donut()
 * -------------------
 * Updates a circular risk chart with a score, label, color, and suffix.
 *
 * Parameters:
 * -----------
 * options: object
 *   Contains the element IDs and display values used to update the donut chart.
 *
 * Returns:
 * --------
 * void
 */
function update_risk_donut({
  ring_id,
  label_id,
  percentage_id,
  score,
  label,
  color,
  suffix = 'RISK',
}) {
  const ring = document.getElementById(ring_id);
  const label_element = document.getElementById(label_id);
  const percentage_element = document.getElementById(percentage_id);

  if (!ring || !label_element || !percentage_element) return;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  ring.style.strokeDashoffset = offset;
  ring.style.stroke = color;

  label_element.innerText = label;
  label_element.style.color = color;
  percentage_element.innerText = `${Math.round(score)}% ${suffix}`;
}

/**
 * reset_ward_risk_donut()
 * -----------------------
 * Resets the selected ward risk donut to its empty state.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function reset_ward_risk_donut() {
  update_risk_donut({
    ring_id: 'ward-risk-ring',
    label_id: 'risk-text',
    percentage_id: 'risk-percentage',
    score: 0,
    label: '--',
    color: RISK_COLORS.empty,
    suffix: 'RISK',
  });
}

/**
 * reset_average_risk_donut()
 * --------------------------
 * Resets the municipality average risk donut to its empty state.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function reset_average_risk_donut() {
  update_risk_donut({
    ring_id: 'avg-risk-ring',
    label_id: 'avg-risk-text',
    percentage_id: 'avg-risk-percentage',
    score: 0,
    label: '--',
    color: RISK_COLORS.empty,
    suffix: 'AVG',
  });
}

// -------------------- Dashboard Updates --------------------

/**
 * update_municipality_average_risk()
 * ----------------------------------
 * Calculates and displays the average risk score for the selected municipality.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function update_municipality_average_risk() {
  const average_container = document.getElementById('avg-risk-container');
  const municipality_name = document.getElementById('selected-muni-name');

  if (!average_container || !municipality_name) return;

  if (!selected_municipality) {
    average_container.style.opacity = '0.4';
    municipality_name.innerText = 'Select Municipality';
    reset_average_risk_donut();
    return;
  }

  const wards = get_current_municipality_wards();
  const average_score = calculate_average_risk_score(wards);

  if (average_score === null) {
    average_container.style.opacity = '0.4';
    municipality_name.innerText = format_municipality_name(selected_municipality);
    reset_average_risk_donut();
    return;
  }

  update_risk_donut({
    ring_id: 'avg-risk-ring',
    label_id: 'avg-risk-text',
    percentage_id: 'avg-risk-percentage',
    score: average_score,
    label: get_risk_label(average_score),
    color: RISK_COLORS.average,
    suffix: 'AVG',
  });

  municipality_name.innerText = format_municipality_name(selected_municipality);
  average_container.style.opacity = '1';
}

/**
 * set_metric_bar()
 * ----------------
 * Updates a metric progress bar and its displayed value.
 *
 * Parameters:
 * -----------
 * options: object
 *   Contains the bar ID, value ID, metric value, unit, decimals, and max value.
 *
 * Returns:
 * --------
 * void
 */
function set_metric_bar({
  bar_id,
  value_id,
  value = null,
  unit = '',
  decimals = 0,
  max = 100,
}) {
  const bar = document.getElementById(bar_id);
  const value_element = document.getElementById(value_id);
  const numeric_value = Number(value);
  const has_value = Number.isFinite(numeric_value);

  if (bar) {
    const percentage = has_value ? (numeric_value / max) * 100 : 0;
    const clamped_percentage = Math.min(Math.max(percentage, 0), 100);
    bar.style.width = `${clamped_percentage}%`;
  }

  if (value_element) {
    value_element.innerText = has_value
      ? `${numeric_value.toFixed(decimals)}${unit}`
      : '--';
  }
}

/**
 * update_environmental_factors()
 * ------------------------------
 * Updates the environmental factor bars for the selected ward.
 *
 * Parameters:
 * -----------
 * ward_data: object | null
 *   The selected ward record, or null when no ward is selected.
 *
 * Returns:
 * --------
 * void
 */
function update_environmental_factors(ward_data = null) {
  const has_selected_ward = Boolean(ward_data);

  set_metric_bar({
    bar_id: 'env-agric-bar',
    value_id: 'env-agric-val',
    value: has_selected_ward ? ward_data.Agric_Percentage : null,
    unit: '%',
    max: 100,
  });

  set_metric_bar({
    bar_id: 'env-temp-bar',
    value_id: 'env-temp-val',
    value: has_selected_ward ? ward_data.LST_Surface_C : null,
    unit: '°C',
    max: 50,
  });

  set_metric_bar({
    bar_id: 'env-soil-bar',
    value_id: 'env-soil-val',
    value: has_selected_ward ? ward_data.Soil_Moisture * 100 : null,
    unit: '%',
    max: 100,
  });
}

/**
 * reset_dashboard_panels()
 * ------------------------
 * Resets the ward risk panel, environmental factors, and municipality average panel.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function reset_dashboard_panels() {
  reset_ward_risk_donut();
  document.getElementById('selected-ward-name').innerText = 'Select a Ward';
  update_environmental_factors();
  update_municipality_average_risk();
}

/**
 * select_ward()
 * -------------
 * Updates the dashboard using the selected ward's risk and environmental data.
 *
 * Parameters:
 * -----------
 * ward_data: object
 *   The selected ward record.
 *
 * Returns:
 * --------
 * void
 */
function select_ward(ward_data) {
  const risk_score = calculate_risk_score(ward_data);
  const risk_color = get_risk_color(risk_score);

  update_risk_donut({
    ring_id: 'ward-risk-ring',
    label_id: 'risk-text',
    percentage_id: 'risk-percentage',
    score: risk_score,
    label: get_risk_label(risk_score),
    color: risk_color,
    suffix: 'RISK',
  });

  document.getElementById('selected-ward-name').innerText =
    ward_data.WardLabel || 'Unknown Ward';

  update_environmental_factors(ward_data);
  update_municipality_average_risk();
}

// -------------------- Map Rendering --------------------

/**
 * get_visible_wards()
 * -------------------
 * Filters the dataset by selected month, municipality, and risk level.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * array
 *   A list of ward records that should currently appear on the map.
 */
function get_visible_wards() {
  const current_month_id = get_current_month_id();
  const selected_risk_level = risk_filter.value;

  return all_risk_data.filter((ward) => {
    if (ward.Month !== current_month_id) return false;
    if (selected_municipality && ward.Municipali !== selected_municipality) return false;

    const risk_score = calculate_risk_score(ward);
    const risk_label = get_risk_label(risk_score);

    return selected_risk_level === 'all' || risk_label === selected_risk_level;
  });
}

/**
 * get_popup_content()
 * -------------------
 * Builds the HTML content shown inside a ward map popup.
 *
 * Parameters:
 * -----------
 * ward_data: object
 *   The ward record used in the popup.
 *
 * risk_score: number
 *   The calculated risk score for the ward.
 *
 * risk_color: string
 *   The display color for the ward's risk level.
 *
 * Returns:
 * --------
 * string
 *   HTML content for the Leaflet popup.
 */
function get_popup_content(ward_data, risk_score, risk_color) {
  return `
    <div style="font-family:'Inter',sans-serif; text-align:center;">
      <h3 style="margin:0 0 5px 0; font-size:14px;">${ward_data.WardLabel}</h3>
      <span style="color:${risk_color}; font-weight:bold;">${Math.round(risk_score)}% Risk</span>
    </div>
  `;
}

/**
 * create_ward_marker()
 * --------------------
 * Creates an invisible clickable marker for a ward on the map.
 *
 * Parameters:
 * -----------
 * ward_data: object
 *   The ward record used to create the marker.
 *
 * Returns:
 * --------
 * object
 *   A Leaflet circle marker.
 */
function create_ward_marker(ward_data) {
  const risk_score = calculate_risk_score(ward_data);
  const risk_color = get_risk_color(risk_score);

  const marker = L.circleMarker([ward_data.latitude, ward_data.longitude], {
    radius: 12,
    fillColor: risk_color,
    color: '#fff',
    weight: 0,
    fillOpacity: 0,
    opacity: 0,
  });

  marker.bindPopup(get_popup_content(ward_data, risk_score, risk_color));

  marker.on('click', () => {
    select_ward(ward_data);
    map.setView(marker.getLatLng(), 14);
    marker.openPopup();
  });

  return marker;
}

/**
 * render_hotspots()
 * -----------------
 * Renders ward risk hotspots on the map and updates the heatmap layer.
 *
 * Parameters:
 * -----------
 * should_fit_to_municipality: boolean
 *   Whether the map should zoom to fit the selected municipality.
 *
 * Returns:
 * --------
 * void
 */
function render_hotspots(should_fit_to_municipality = false) {
  city_layer.clearLayers();

  const visible_wards = get_visible_wards();
  const heatmap_points = [];
  const bounds_points = [];

  visible_wards.forEach((ward) => {
    const risk_score = calculate_risk_score(ward);

    heatmap_points.push([ward.latitude, ward.longitude, risk_score / 100]);
    bounds_points.push([ward.latitude, ward.longitude]);

    create_ward_marker(ward).addTo(city_layer);
  });

  heat_layer.setLatLngs(heatmap_points);

  if (should_fit_to_municipality && bounds_points.length > 0) {
    const bounds = L.latLngBounds(bounds_points);

    map.flyToBounds(bounds, {
      padding: [40, 40],
      maxZoom: 13,
      duration: 1.2,
    });
  }
}

/**
 * open_marker_popup_for_ward()
 * ----------------------------
 * Finds the map marker for a selected ward and opens its popup.
 *
 * Parameters:
 * -----------
 * ward_data: object
 *   The ward record whose marker popup should be opened.
 *
 * Returns:
 * --------
 * void
 */
function open_marker_popup_for_ward(ward_data) {
  city_layer.eachLayer((layer) => {
    const lat_lng = layer.getLatLng();

    const is_matching_marker =
      Math.abs(lat_lng.lat - ward_data.latitude) < 0.0001 &&
      Math.abs(lat_lng.lng - ward_data.longitude) < 0.0001;

    if (is_matching_marker) {
      layer.openPopup();
    }
  });
}

// -------------------- Dropdowns --------------------

/**
 * populate_country_select()
 * -------------------------
 * Adds the available country options to the country dropdown.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function populate_country_select() {
  country_select.add(new Option('Zambia', 'Zambia'));
  country_select.add(new Option('South Africa', 'South Africa'));
}

/**
 * populate_municipality_select()
 * ------------------------------
 * Adds municipality options to the municipality dropdown.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function populate_municipality_select() {
  clear_select(municipality_select);

  Object.keys(district_lookup)
    .sort()
    .forEach((municipality) => {
      const display_name = format_municipality_name(municipality);
      municipality_select.add(new Option(display_name, municipality));
    });
}

/**
 * populate_ward_select()
 * ----------------------
 * Adds ward options for the selected municipality and month.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function populate_ward_select() {
  clear_select(ward_select);

  get_current_municipality_wards().forEach((ward, index) => {
    ward_select.add(new Option(ward.WardLabel, index));
  });
}

/**
 * reset_region_selects()
 * ----------------------
 * Resets and disables the municipality and ward dropdowns.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function reset_region_selects() {
  clear_select(municipality_select);
  municipality_select.disabled = true;

  clear_select(ward_select);
  ward_select.disabled = true;

  apply_button.disabled = true;
}

// -------------------- Event Handlers --------------------

/**
 * handle_country_change()
 * -----------------------
 * Handles country dropdown changes and prepares municipality selection.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_country_change() {
  selected_municipality = null;
  reset_region_selects();
  reset_dashboard_panels();
  render_hotspots(false);

  if (!country_select.value) return;

  municipality_select.disabled = false;
  populate_municipality_select();
}

/**
 * handle_municipality_change()
 * ----------------------------
 * Handles municipality dropdown changes and updates ward options and map view.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_municipality_change() {
  selected_municipality = municipality_select.value || null;

  clear_select(ward_select);
  ward_select.disabled = true;
  apply_button.disabled = true;

  reset_dashboard_panels();

  if (!selected_municipality) {
    render_hotspots(false);
    update_municipality_average_risk();
    return;
  }

  ward_select.disabled = false;
  populate_ward_select();
  render_hotspots(true);
  update_municipality_average_risk();
}

/**
 * handle_ward_change()
 * --------------------
 * Enables or disables the apply button based on ward selection.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_ward_change() {
  apply_button.disabled = ward_select.value === '';
}

/**
 * handle_apply_click()
 * --------------------
 * Applies the selected ward and updates the dashboard and map view.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_apply_click() {
  const ward_index = ward_select.value;

  if (ward_index === '' || !selected_municipality) return;

  const wards = get_current_municipality_wards();
  const selected_ward = wards[ward_index];

  if (!selected_ward) return;

  select_ward(selected_ward);

  map.flyTo([selected_ward.latitude, selected_ward.longitude], 14, {
    duration: 1.5,
  });

  open_marker_popup_for_ward(selected_ward);
}

/**
 * handle_reset_click()
 * --------------------
 * Resets filters, dashboard panels, and the map view.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_reset_click() {
  country_select.value = '';
  selected_municipality = null;
  risk_filter.value = 'all';

  reset_region_selects();
  reset_dashboard_panels();

  map.flyTo([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom, {
    duration: 1.5,
  });

  render_hotspots();
}

/**
 * handle_time_slider_input()
 * --------------------------
 * Updates the active month and refreshes the dashboard and map.
 *
 * Parameters:
 * -----------
 * event: InputEvent
 *   The input event from the timeline slider.
 *
 * Returns:
 * --------
 * void
 */
function handle_time_slider_input(event) {
  current_month_index = Number(event.target.value);

  render_hotspots(false);
  reset_dashboard_panels();

  clear_select(ward_select);
  ward_select.disabled = true;
  apply_button.disabled = true;

  if (!selected_municipality) return;

  ward_select.disabled = false;
  populate_ward_select();
  update_municipality_average_risk();
}

/**
 * bind_event_handlers()
 * ---------------------
 * Connects page controls to their event handler functions.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function bind_event_handlers() {
  country_select.addEventListener('change', handle_country_change);
  municipality_select.addEventListener('change', handle_municipality_change);
  ward_select.addEventListener('change', handle_ward_change);
  apply_button.addEventListener('click', handle_apply_click);
  reset_button.addEventListener('click', handle_reset_click);
  time_slider.addEventListener('input', handle_time_slider_input);
  risk_filter.addEventListener('change', () => render_hotspots());
}

// -------------------- CSV Loading --------------------

/**
 * handle_risk_data_row()
 * ----------------------
 * Stores a parsed CSV row and groups it by municipality.
 *
 * Parameters:
 * -----------
 * row: object
 *   A PapaParse row object containing the parsed CSV data.
 *
 * Returns:
 * --------
 * void
 */
function handle_risk_data_row({ data }) {
  if (!data.Municipali) return;

  all_risk_data.push(data);

  if (!district_lookup[data.Municipali]) {
    district_lookup[data.Municipali] = [];
  }

  district_lookup[data.Municipali].push(data);
}

/**
 * load_risk_data()
 * ----------------
 * Loads the malaria risk CSV dataset and renders the initial map hotspots.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function load_risk_data() {
  Papa.parse('../data/Limpopo_Risk_Jan25_Jan26_Safe.csv', {
    download: true,
    header: true,
    dynamicTyping: true,
    step: handle_risk_data_row,
    complete: () => render_hotspots(),
  });
}

// -------------------- Initialisation --------------------

/**
 * initialise_dashboard()
 * ----------------------
 * Sets up the dashboard controls, event handlers, default panels, and dataset.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function initialise_dashboard() {
  populate_country_select();
  bind_event_handlers();
  reset_dashboard_panels();
  load_risk_data();
}

initialise_dashboard();