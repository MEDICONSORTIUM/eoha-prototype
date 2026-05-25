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