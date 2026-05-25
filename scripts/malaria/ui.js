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