// -------------------- Constants --------------------

const DEFAULT_VIEW = { lat: -23.4013, lng: 29.4179, zoom: 7 };

const MONTH_DATA = [
  { id: 'Jan 2025', month: 'January', year: '2025' },
  { id: 'Feb 2025', month: 'February', year: '2025' },
  { id: 'Mar 2025', month: 'March', year: '2025' },
  { id: 'Apr 2025', month: 'April', year: '2025' },
  { id: 'May 2025', month: 'May', year: '2025' },
  { id: 'Jun 2025', month: 'June', year: '2025' },
  { id: 'Jul 2025', month: 'July', year: '2025' },
  { id: 'Aug 2025', month: 'August', year: '2025' },
  { id: 'Sep 2025', month: 'September', year: '2025' },
  { id: 'Oct 2025', month: 'October', year: '2025' },
  { id: 'Nov 2025', month: 'November', year: '2025' },
  { id: 'Dec 2025', month: 'December', year: '2025' },
  { id: 'Jan 2026', month: 'January', year: '2026' },
];

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

const district_lookup = {};
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