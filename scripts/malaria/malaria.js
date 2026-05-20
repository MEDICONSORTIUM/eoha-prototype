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