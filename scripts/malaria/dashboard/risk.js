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
 *   A complete ward record from the backend API.
 *
 * Returns:
 * --------
 * number
 *   A malaria risk score from 0 to 100.
 */
function calculate_risk_score(ward_data) {
  return EOHAMalariaAPI.score(ward_data);
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
