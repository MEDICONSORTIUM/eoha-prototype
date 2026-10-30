// -------------------- Constants --------------------

const DEFAULT_VIEW = { lat: -23.4013, lng: 29.4179, zoom: 7 };

// Replaced with actual periods after the API request completes.
const MONTH_DATA = [{ id: '', month: 'Loading observations', year: '' }];

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

const district_lookup = Object.create(null);
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
