// -------------------- Globals --------------------
const districtLookup = {};
const markers = {};

// Slider Configuration
const MONTH_DATA = [
  { id: 'Nov 2025', month: 'November', year: '2025' },
  { id: 'Dec 2025', month: 'December', year: '2025' },
  { id: 'Jan 2026', month: 'January',  year: '2026' }
];
let currentMonthIndex = 0;

const LAND_COVER = {
  10: 'Tree cover',
  20: 'Shrubland',
  30: 'Grassland',
  40: 'Cropland',
  50: 'Built-up',
  60: 'Bare / sparse vegetation',
  70: 'Snow and ice',
  80: 'Permanent water bodies',
  90: 'Herbaceous wetland',
  95: 'Mangroves',
  100: 'Moss and lichen'
};

// -------------------- Map Setup --------------------
const map = L.map('map', { zoomControl: false })
  .setView([-23.4013, 29.4179], 7);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const cityLayer = L.layerGroup().addTo(map);

// -------------------- Utilities --------------------
const riskColor = r =>
  r >= 50 ? '#d93025' :
  r >= 25 ? '#f9bb06' :
  '#34a853';

function riskLabel(r) {
  if (r >= 50) return 'High';
  if (r >= 25) return 'Moderate';
  return 'Low';
}

// Custom Risk Calculation (Flood Focused)
function calculateDynamicRisk(d) {
  let score = 0;

  // 1. Soil Moisture (Weighted 40%) - FLOOD FACTOR
  // >0.35 is extreme saturation (flooding)
  const moisture = d.Soil_Moisture || 0;
  if (moisture > 0.35) score += 40;
  else if (moisture > 0.25) score += 30;
  else if (moisture > 0.15) score += 15;
  
  // 2. Surface Temperature (Weighted 30%)
  // Optimal mosquito breeding: 25°C - 30°C
  const temp = d.LST_Surface_C || 0;
  if (temp >= 25 && temp <= 30) score += 30;
  else if (temp >= 20 && temp <= 34) score += 15;
  
  // 3. Water Index / NDWI (Weighted 20%)
  // > -0.1 implies surface water, > -0.25 implies moist veg
  const water = d.NDWI_Water || -1;
  if (water > -0.1) score += 20;
  else if (water > -0.25) score += 10;
  
  // 4. Population Density (Weighted 10%)
  const pop = d.Population_Density_Per_KM2 || 0;
  if (pop > 500) score += 10;
  else if (pop > 100) score += 5;

  return score;
}

// -------------------- Panel Updates --------------------
function updateRiskPanel(risk) {
  const text = document.getElementById('risk-text');
  const perc = document.getElementById('risk-percentage');

  if (risk == null) {
    text.innerText = '--';
    perc.innerText = '--';
    text.style.color = '#333';
    return;
  }

  text.innerText = riskLabel(risk);
  text.style.color = riskColor(risk);
  perc.innerText = `${Math.round(risk)}%`;
}

function updateEnvironmentalFactors(d) {
  document.getElementById('env-habitat').innerText =
    LAND_COVER[Math.round(d.Habitat_Class_Code)] || 'Unknown';

  document.getElementById('env-demo').innerText =
    `${Math.round(d.Population_Density_Per_KM2 || 0)} persons/km²`;

  setBar('env-agric-bar', 'env-agric-val', d.Agric_Percentage, '%');
  setBar('env-temp-bar', 'env-temp-val', d.LST_Surface_C, '°C');
  setBar('env-soil-bar', 'env-soil-val', (d.Soil_Moisture || 0) * 100, ' m³', 2);
}

function setBar(barId, valId, value = 0, unit = '', decimals = 0) {
  const v = Number(value) || 0;
  document.getElementById(barId).value = v;
  document.getElementById(valId).innerText =
    `${v.toFixed(decimals)}${unit}`;
}

function resetPanels() {
  updateRiskPanel(null);
  updateEnvironmentalFactors({});
}

function updateTimeDisplay() {
  const cfg = MONTH_DATA[currentMonthIndex];
  document.getElementById('month-label').innerText = cfg.month;
  document.querySelector('.year-label').innerText = cfg.year;
}

// -------------------- Rendering --------------------
function renderAllHotspots() {
  cityLayer.clearLayers();
  Object.keys(markers).forEach(k => delete markers[k]);

  const currentMonthId = MONTH_DATA[currentMonthIndex].id;

  Object.entries(districtLookup).forEach(([muni, wards]) => {

    wards.forEach((w, i) => {
      if (w.Month !== currentMonthId) return;
      if (!w.latitude || !w.longitude) return;

      const risk = calculateDynamicRisk(w);
      const color = riskColor(risk);

      const marker = L.circleMarker([w.latitude, w.longitude], {
        radius: 8,
        fillColor: color,
        color: '#fff',
        weight: 1,
        fillOpacity: 0.7
      });

      marker.bindPopup(`
        <div class="modern-popup-card">
          <div class="card-header" style="background:${color}">
            <h3>${w.WardLabel}</h3>
            <span class="subtitle">Risk Analysis</span>
          </div>
          <div class="card-footer">
            <span>${Math.round(risk)}% Risk</span>
          </div>
        </div>
      `, { closeButton: false });

      marker.on('click', () => {
        provinceSelect.value = muni;
        provinceSelect.onchange(); 
        citySelect.value = i;     
        selectWard(muni, i);
        map.setView(marker.getLatLng(), 14);
      });

      marker.addTo(cityLayer);
      markers[`${muni}-${i}`] = marker;
    });
  });
}

// -------------------- Selection Logic --------------------
function selectWard(muni, index) {
  const d = districtLookup[muni][index];
  const calculatedRisk = calculateDynamicRisk(d);
  updateRiskPanel(calculatedRisk);
  
  updateEnvironmentalFactors(d);

  const m = markers[`${muni}-${index}`];
  if (m) {
    map.setView(m.getLatLng(), 16);
    m.openPopup();
  }
}

// -------------------- Dropdowns --------------------
const countrySelect = document.getElementById('country-select');
const provinceSelect = document.getElementById('province-select');
const citySelect = document.getElementById('city-select');

countrySelect.add(new Option('Limpopo', 'Limpopo'));

countrySelect.onchange = () => {
  provinceSelect.length = 1;
  citySelect.length = 1;
  citySelect.disabled = true;
  resetPanels();

  if (!countrySelect.value) return;

  provinceSelect.disabled = false;
  Object.keys(districtLookup)
    .sort()
    .forEach(m => provinceSelect.add(new Option(m, m)));
};

provinceSelect.onchange = () => {
  citySelect.length = 1;
  resetPanels();

  if (!provinceSelect.value) {
    citySelect.disabled = true;
    return;
  }

  citySelect.disabled = false;
  
  const currentMonthId = MONTH_DATA[currentMonthIndex].id;
  const wards = districtLookup[provinceSelect.value] || [];
  wards.forEach((w, i) => {
    if (w.Month === currentMonthId) {
      citySelect.add(new Option(w.WardLabel, i));
    }
  });
};

citySelect.onchange = () => {
  if (citySelect.value !== '') {
    selectWard(provinceSelect.value, citySelect.value);
  }
};

// -------------------- Slider Logic --------------------
const timeSlider = document.getElementById('time-slider');

if (timeSlider) {
  timeSlider.addEventListener('input', (e) => {
    currentMonthIndex = parseInt(e.target.value, 10);
    updateTimeDisplay();
    renderAllHotspots();

    let restored = false;
    if (provinceSelect.value) {
      const selectedWardLabel = citySelect.options[citySelect.selectedIndex]?.text;
      provinceSelect.onchange(); 
      if (selectedWardLabel) {
        for (let i = 0; i < citySelect.options.length; i++) {
          if (citySelect.options[i].text === selectedWardLabel) {
            citySelect.value = citySelect.options[i].value;
            citySelect.onchange();
            restored = true;
            break;
          }
        }
      }
    }
    
    if (!restored) {
      resetPanels();
    }
  });
}
// -------------------- CSV Load --------------------
Papa.parse('../data/Limpopo_Risk_Dataset.csv', {
  download: true,
  header: true,
  dynamicTyping: true,
  step: ({ data }) => {
    if (!data.Municipali) return;
    (districtLookup[data.Municipali] ||= []).push(data);
  },
  complete: () => {
    updateTimeDisplay();
    renderAllHotspots();
  }
});