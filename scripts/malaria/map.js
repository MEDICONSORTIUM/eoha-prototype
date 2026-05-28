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