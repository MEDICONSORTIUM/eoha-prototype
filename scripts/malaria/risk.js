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