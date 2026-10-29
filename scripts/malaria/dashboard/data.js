/**
 * load_risk_data()
 * ----------------
 * Load API records, index municipalities, build the observation timeline and render the malaria
 * map.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * Promise<void>
 */
async function load_risk_data() {
  const status = document.getElementById('api-status');
  country_select.disabled = true;
  time_slider.disabled = true;
  document.getElementById('play-months').disabled = true;
  try {
    const { rows, excluded } = await EOHAMalariaAPI.load();
    all_risk_data = rows.filter(
      (row) =>
        Number.isFinite(row.latitude) &&
        Number.isFinite(row.longitude) &&
        Math.abs(row.latitude) <= 90 &&
        Math.abs(row.longitude) <= 180,
    );
    if (!all_risk_data.length)
      throw new Error(
        'API records have no valid map coordinates. Check the region column mapping.',
      );
    for (const row of all_risk_data) (district_lookup[row.Municipali] ||= []).push(row);
    const periods = [
      ...new Map(all_risk_data.map((row) => [row.date.slice(0, 7), row.Month])).entries(),
    ].sort(([a], [b]) => a.localeCompare(b));
    MONTH_DATA.splice(
      0,
      MONTH_DATA.length,
      ...periods.map(([date, id]) => ({
        id,
        month: new Date(`${date}-01T00:00:00Z`).toLocaleString('en-GB', {
          month: 'long',
          timeZone: 'UTC',
        }),
        year: date.slice(0, 4),
      })),
    );
    current_month_index = MONTH_DATA.length - 1;
    time_slider.max = String(current_month_index);
    time_slider.value = String(current_month_index);
    const labels = document.querySelector('.slider-labels');
    labels.replaceChildren(
      ...[periods[0][1], periods[Math.floor(periods.length / 2)][1], periods.at(-1)[1]].map(
        (text) => {
          const span = document.createElement('span');
          span.textContent = text;
          return span;
        },
      ),
    );
    update_observation_label();
    country_select.disabled = false;
    time_slider.disabled = false;
    document.getElementById('play-months').disabled = MONTH_DATA.length < 2;
    status.textContent = `API connected · ${all_risk_data.length} ward observations. ${excluded ? `${excluded} incomplete records excluded.` : ''}`;
    render_hotspots();
  } catch (error) {
    status.textContent = `Risk data unavailable. ${error.message}`;
    status.setAttribute('role', 'alert');
    document.getElementById('active-month').textContent = 'No API data';
    reset_dashboard_panels();
  }
}
