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

// Track which municipality is currently selected for filtering
let selectedMunicipality = null;

// Define default view coordinates for easy resetting
const DEFAULT_VIEW = { lat: -23.4013, lng: 29.4179, zoom: 7 };

const LAND_COVER = {
  10: 'Tree cover', 20: 'Shrubland', 30: 'Grassland', 40: 'Cropland',
  50: 'Built-up', 60: 'Bare vegetation', 80: 'Water bodies', 90: 'Wetland'
};

// -------------------- Map Setup --------------------
const map = L.map('map', { zoomControl: false })
  .setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);

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

// -------------------- Average Risk --------------------
/**
 * Calculates the average risk score for all wards in the currently selected
 * municipality for the currently displayed month, then updates the average
 * risk UI elements.
 */
function updateAverageRisk() {
  const avgContainer = document.getElementById('avg-risk-container');

  if (!selectedMunicipality) {
    // No municipality selected — hide the average block
    avgContainer.classList.remove('visible');
    avgContainer.classList.add('hidden');
    return;
  }

  const currentMonthId = MONTH_DATA[currentMonthIndex].id;
  const wards = (districtLookup[selectedMunicipality] || []).filter(w => w.Month === currentMonthId);

  if (wards.length === 0) {
    avgContainer.classList.remove('visible');
    avgContainer.classList.add('hidden');
    return;
  }

  const total = wards.reduce((sum, w) => sum + calculateDynamicRisk(w), 0);
  const avg = Math.round(total / wards.length);
  const color = riskColor(avg);
  const label = riskLabel(avg);

  // Update text content
  document.getElementById('avg-risk-text').innerText = label;
  document.getElementById('avg-risk-text').style.color = color;
  document.getElementById('avg-risk-percentage').innerText = `${avg}%`;
  document.getElementById('avg-ward-count').innerText = `Based on ${wards.length} ward${wards.length !== 1 ? 's' : ''}`;

  // Animate the ring
  const ring = document.getElementById('avg-risk-ring');
  const circumference = 2 * Math.PI * 20; // r=20
  const offset = circumference - (avg / 100) * circumference;
  ring.style.stroke = color;
  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = offset;

  // Keep centre label in sync
  const ringLabel = document.getElementById('avg-ring-label');
  if (ringLabel) {
    ringLabel.textContent = `${avg}%`;
    ringLabel.style.fill = color;
  }

  // Show the block
  avgContainer.classList.remove('hidden');
  avgContainer.classList.add('visible');
}

// -------------------- UI Updates --------------------
function updateEnvironmentalFactors(d, isWardSelected) {
  const habitatEl = document.getElementById('env-habitat');
  
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
  updateAverageRisk();
}

function selectWardFromMap(data) {
    const risk = calculateDynamicRisk(data);
    document.getElementById('risk-text').innerText = riskLabel(risk);
    document.getElementById('risk-text').style.color = riskColor(risk);
    document.getElementById('risk-percentage').innerText = `${Math.round(risk)}%`;
    updateEnvironmentalFactors(data, true);
    updateAverageRisk();
}

// -------------------- Filtering & Rendering --------------------
const riskFilter = document.getElementById('risk-level-filter');
riskFilter.onchange = () => renderAllHotspots();

/**
 * Renders markers for the current month.
 * If selectedMunicipality is set, only that municipality's wards are shown.
 * Also fits the map to the visible markers when a municipality is selected.
 */
function renderAllHotspots(fitToMunicipality = false) {
  cityLayer.clearLayers();
  const currentMonthId = MONTH_DATA[currentMonthIndex].id;
  const filterVal = riskFilter.value;

  // Collect bounds for fitting the map when a municipality is zoomed in
  const boundsPoints = [];

  allCSVData.forEach((w) => {
    if (w.Month !== currentMonthId) return;

    // ---- KEY FIX: only show wards belonging to the selected municipality ----
    if (selectedMunicipality && w.Municipali !== selectedMunicipality) return;

    const risk = calculateDynamicRisk(w);
    const label = riskLabel(risk);

    if (filterVal !== 'all' && label !== filterVal) return;

    const color = riskColor(risk);
    const marker = L.circleMarker([w.latitude, w.longitude], {
      radius: 8, fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.7
    });

    const popupContent = `
        <div class="modern-popup-card">
          <div class="card-header" style="background:${color}">
            <h3>${w.WardLabel}</h3>
            <span class="subtitle">Risk Analysis</span>
          </div>
          <div class="card-footer">
            <span>${Math.round(risk)}% Risk</span>
          </div>
        </div>
    `;

    marker.bindPopup(popupContent);

    marker.on('click', () => {
        selectWardFromMap(w);
        map.setView(marker.getLatLng(), 14);
        marker.openPopup();
    });

    marker.addTo(cityLayer);
    boundsPoints.push([w.latitude, w.longitude]);
  });

  // ---- Zoom to fit all visible municipality wards ----
  if (fitToMunicipality && boundsPoints.length > 0) {
    const bounds = L.latLngBounds(boundsPoints);
    map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 13, duration: 1.2 });
  }
}

// -------------------- Dropdowns & Apply Logic --------------------
const countrySelect = document.getElementById('country-select');
const provinceSelect = document.getElementById('province-select');
const citySelect = document.getElementById('city-select');
const applyBtn = document.getElementById('apply-btn');
const resetBtn = document.getElementById('reset-btn');

// --- 1. Populate Country/Province ---
countrySelect.add(new Option('Limpopo', 'Limpopo'));

countrySelect.onchange = () => {
  provinceSelect.length = 1;
  provinceSelect.disabled = false;
  
  citySelect.length = 1; 
  citySelect.disabled = true;
  applyBtn.disabled = true;

  // Clear any municipality filter when the province changes
  selectedMunicipality = null;
  updateAverageRisk();
  renderAllHotspots();

  Object.keys(districtLookup).sort().forEach(m => {
      const cleanName = m.replace(/ Local Municipality$/i, "");
      provinceSelect.add(new Option(cleanName, m));
  });
};

// --- 2. Populate Wards + Zoom to Municipality ---
provinceSelect.onchange = () => {
    citySelect.length = 1;
    citySelect.disabled = false;
    applyBtn.disabled = true;
    resetPanels();

    const currentMonthId = MONTH_DATA[currentMonthIndex].id;
    const wards = districtLookup[provinceSelect.value] || [];

    wards.filter(w => w.Month === currentMonthId).forEach((w, i) => {
        citySelect.add(new Option(w.WardLabel, i));
    });

    // ---- KEY FIX: filter map to this municipality and zoom to fit its wards ----
    if (provinceSelect.value) {
        selectedMunicipality = provinceSelect.value;
        renderAllHotspots(true); // true = fit map to these wards
        updateAverageRisk();     // show average for this municipality
    } else {
        selectedMunicipality = null;
        updateAverageRisk();
        renderAllHotspots(false);
    }
};

// --- 3. Enable Apply Button on Ward Selection ---
citySelect.onchange = () => {
    if (citySelect.value !== "") {
        applyBtn.disabled = false;
    } else {
        applyBtn.disabled = true;
    }
};

// --- 4. Apply Button: Zoom to exact ward and open popup ---
applyBtn.addEventListener('click', () => {
    const wardIndex = citySelect.value;
    const municipality = provinceSelect.value;
    
    if (wardIndex !== "" && municipality) {
        const currentMonthId = MONTH_DATA[currentMonthIndex].id;
        const validWards = districtLookup[municipality].filter(w => w.Month === currentMonthId);
        const specificWard = validWards[wardIndex];

        if (specificWard) {
            // A. Update the side panels
            selectWardFromMap(specificWard);
            
            // B. Fly to the specific ward
            map.flyTo([specificWard.latitude, specificWard.longitude], 14, {
                duration: 1.5
            });

            // C. Open the matching marker's popup
            cityLayer.eachLayer((layer) => {
                const latLng = layer.getLatLng();
                if (Math.abs(latLng.lat - specificWard.latitude) < 0.0001 && 
                    Math.abs(latLng.lng - specificWard.longitude) < 0.0001) {
                    layer.openPopup();
                }
            });
        }
    }
});

// --- 5. Reset Logic ---
resetBtn.addEventListener('click', () => {
    // 1. Reset Dropdowns
    countrySelect.value = "Limpopo"; 
    provinceSelect.length = 1;
    provinceSelect.disabled = false;
    provinceSelect.value = "";
    
    citySelect.length = 1;
    citySelect.disabled = true;
    
    applyBtn.disabled = true; 
    
    // 2. Reset Risk Filter
    riskFilter.value = 'all';
    
    // 3. Reset Panels
    resetPanels();

    // 4. Clear municipality filter so all wards show again
    selectedMunicipality = null;
    updateAverageRisk();
    
    // 5. Reset Map View
    map.flyTo([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom, {
        duration: 1.5
    });

    // 6. Re-render map (no municipality filter, all wards)
    renderAllHotspots();
    
    // 7. Re-populate province dropdown
    countrySelect.onchange(); 
    provinceSelect.value = "";
});

// -------------------- Slider --------------------
const timeSlider = document.getElementById('time-slider');
timeSlider.oninput = (e) => {
  currentMonthIndex = parseInt(e.target.value);
  const cfg = MONTH_DATA[currentMonthIndex];
  document.getElementById('month-label').innerText = cfg.month;
  document.querySelector('.year-label').innerText = cfg.year;
  
  // Refresh map — preserve municipality filter if one is active
  renderAllHotspots(false);
  resetPanels();
  
  // Reset ward dropdown to prevent stale selection across months
  citySelect.length = 1;
  citySelect.disabled = true;
  applyBtn.disabled = true;

  // Repopulate ward list for new month if a municipality is selected
  if (selectedMunicipality) {
    citySelect.disabled = false;
    const currentMonthId = MONTH_DATA[currentMonthIndex].id;
    const wards = districtLookup[selectedMunicipality] || [];
    wards.filter(w => w.Month === currentMonthId).forEach((w, i) => {
        citySelect.add(new Option(w.WardLabel, i));
    });
    updateAverageRisk(); 
  }
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

// -------------------- Legend --------------------
var legend = L.control({ position: "bottomright" });

legend.onAdd = function () {
    var div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
        <h4>Legend</h4>
        <div class="legend-item"><span class="legend-color high-risk"></span> High Risk</div>
        <div class="legend-item"><span class="legend-color moderate-risk"></span> Medium Risk</div>
        <div class="legend-item"><span class="legend-color low-risk"></span> Low Risk</div>
    `;
    return div;
};

legend.addTo(map);