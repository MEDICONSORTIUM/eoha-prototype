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
  update_observation_label();

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
  update_observation_label();
  document.getElementById('recenter-map').addEventListener('click', () => {
    map.setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);
  });
  let playback = null;
  const play = document.getElementById('play-months');
  /**
   * pause()
   * -------
   * Stop timeline playback and restore the play button accessibility labels.
   *
   * Parameters:
   * -----------
   * none
   *
   * Returns:
   * --------
   * void
   */
  function pause() {
    clearInterval(playback);
    playback = null;
    play.setAttribute('aria-pressed', 'false');
    play.setAttribute('aria-label', 'Play observation timeline');
  }
  play.addEventListener('click', () => {
    if (playback) return pause();
    play.setAttribute('aria-pressed', 'true');
    play.setAttribute('aria-label', 'Pause observation timeline');
    playback = setInterval(() => {
      time_slider.value = (Number(time_slider.value) + 1) % MONTH_DATA.length;
      time_slider.dispatchEvent(new Event('input'));
    }, 1600);
  });
  time_slider.addEventListener('pointerdown', pause);
  time_slider.addEventListener('keydown', pause);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
}

/**
 * update_observation_label()
 * --------------------------
 * Display the active API observation period and update the slider accessibility text.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function update_observation_label() {
  const period = MONTH_DATA[current_month_index];
  document.getElementById('active-month').textContent = period.month + ' ' + period.year;
  time_slider.setAttribute('aria-valuetext', period.month + ' ' + period.year);
}
