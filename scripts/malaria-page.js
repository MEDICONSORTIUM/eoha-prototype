// -------------------- Globals --------------------
const districtLookup = {};
const markers = {};
let allCSVData = []; // Store full dataset for filtering

// Extended Slider Configuration Jan 2025 - Jan 2026
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
  { id: 'Jan 2026', month: 'January',  year: '2026' }
];
let currentMonthIndex = 0;

const LAND_COVER = {
  10: 'Tree cover', 20: 'Shrubland', 30: 'Grassland', 40: 'Cropland',
  50: 'Built-up', 60: 'Bare vegetation', 80: 'Water bodies', 90: 'Wetland'
};

// -------------------- Map Setup --------------------
const map = L.map('map', { zoomControl: false }).setView([-23.4013, 30.4179], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const cityLayer = L.layerGroup().addTo(map);

// -------------------- Risk Logic --------------------
const riskColor = r => r >= 50 ? '#d93025' : r >= 25 ? '#f9bb06' : '#34a853';

function riskLabel(r) {
  if (r >= 50) return 'High';
  if (r >= 25) return 'Moderate';
  return 'Low';
}

function calculateDynamicRisk(d) {
  let score = 0;
  if (d.Soil_Moisture > 0.35) score += 40;
  else if (d.Soil_Moisture > 0.25) score += 20;
  if (d.LST_Surface_C >= 25 && d.LST_Surface_C <= 30) score += 30;
  if (d.NDWI_Water > -0.1) score += 20;
  if (d.Population_Density_Per_KM2 > 300) score += 10;
  return score;
}

// -------------------- UI Updates --------------------
function updateEnvironmentalFactors(d, isWardSelected) {
  const habitatEl = document.getElementById('env-habitat');
  
  // Habitat only has value when a ward is selected
  if (isWardSelected && d.Habitat_Class_Code) {
    habitatEl.innerText = LAND_COVER[Math.round(d.Habitat_Class_Code)] || 'Unknown';
  } else {
    habitatEl.innerText = '--';
  }

  document.getElementById('env-demo').innerText = isWardSelected ? `${Math.round(d.Population_Density_Per_KM2 || 0)}/km²` : '--';
  setBar('env-agric-bar', 'env-agric-val', isWardSelected ? d.Agric_Percentage : 0, '%');
  setBar('env-temp-bar', 'env-temp-val', isWardSelected ? d.LST_Surface_C : 0, '°C');
  setBar('env-soil-bar', 'env-soil-val', isWardSelected ? (d.Soil_Moisture * 100) : 0, ' m³', 2);
}

function setBar(barId, valId, value = 0, unit = '', decimals = 0) {
  document.getElementById(barId).value = value;
  document.getElementById(valId).innerText = `${value.toFixed(decimals)}${unit}`;
}

function resetPanels() {
  document.getElementById('risk-text').innerText = '--';
  document.getElementById('risk-percentage').innerText = '0%';
  updateEnvironmentalFactors({}, false);
}

// -------------------- Filtering & Rendering --------------------
const riskFilter = document.getElementById('risk-level-filter');
riskFilter.onchange = () => renderAllHotspots();

function renderAllHotspots() {
  cityLayer.clearLayers();
  const currentMonthId = MONTH_DATA[currentMonthIndex].id;
  const filterVal = riskFilter.value;

  allCSVData.forEach((w, i) => {
    if (w.Month !== currentMonthId) return;

    const risk = calculateDynamicRisk(w);
    const label = riskLabel(risk);

    // Apply Risk Filter
    if (filterVal !== 'all' && label !== filterVal) return;

    const color = riskColor(risk);
    const marker = L.circleMarker([w.latitude, w.longitude], {
      radius: 8, fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.7
    });

    marker.bindPopup(`<strong>${w.WardLabel}</strong><br>Risk: ${label} (${Math.round(risk)}%)`);
    marker.on('click', () => {
        selectWardFromMap(w);
    });
    marker.addTo(cityLayer);
  });
}

function selectWardFromMap(data) {
    const risk = calculateDynamicRisk(data);
    document.getElementById('risk-text').innerText = riskLabel(risk);
    document.getElementById('risk-text').style.color = riskColor(risk);
    document.getElementById('risk-percentage').innerText = `${Math.round(risk)}%`;
    updateEnvironmentalFactors(data, true);
}

// -------------------- Dropdowns --------------------
const countrySelect = document.getElementById('country-select');
const provinceSelect = document.getElementById('province-select');
const citySelect = document.getElementById('city-select');

countrySelect.add(new Option('Limpopo', 'Limpopo'));

countrySelect.onchange = () => {
  provinceSelect.length = 1;
  provinceSelect.disabled = false;
  Object.keys(districtLookup).sort().forEach(m => {
      // Strip "Local Municipality" for the dropdown list
      const cleanName = m.replace(/ Local Municipality$/i, "");
      provinceSelect.add(new Option(cleanName, m));
  });
};

provinceSelect.onchange = () => {
    citySelect.length = 1;
    citySelect.disabled = false;
    const currentMonthId = MONTH_DATA[currentMonthIndex].id;
    const wards = districtLookup[provinceSelect.value] || [];
    wards.filter(w => w.Month === currentMonthId).forEach((w, i) => {
        citySelect.add(new Option(w.WardLabel, i));
    });
};

citySelect.onchange = () => {
    const wardData = districtLookup[provinceSelect.value][citySelect.value];
    selectWardFromMap(wardData);
};

// -------------------- Slider --------------------
const timeSlider = document.getElementById('time-slider');
timeSlider.oninput = (e) => {
  currentMonthIndex = parseInt(e.target.value);
  const cfg = MONTH_DATA[currentMonthIndex];
  document.getElementById('month-label').innerText = cfg.month;
  document.querySelector('.year-label').innerText = cfg.year;
  renderAllHotspots();
  resetPanels();
};

// -------------------- CSV Load --------------------
Papa.parse('../data/Limpopo_Risk_Jan25_Jan26_Safe.csv', {
  download: true, header: true, dynamicTyping: true,
  step: ({ data }) => {
    if (data.Municipali) {
        allCSVData.push(data);
        (districtLookup[data.Municipali] ||= []).push(data);
    }
  },
  complete: () => renderAllHotspots()
});