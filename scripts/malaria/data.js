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