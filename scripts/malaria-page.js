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

function selectWardFromMap(data) {
    const risk = calculateDynamicRisk(data);
    document.getElementById('risk-text').innerText = riskLabel(risk);
    document.getElementById('risk-text').style.color = riskColor(risk);
    document.getElementById('risk-percentage').innerText = `${Math.round(risk)}%`;
    updateEnvironmentalFactors(data, true);
}

// -------------------- Filtering & Rendering --------------------
const riskFilter = document.getElementById('risk-level-filter');
riskFilter.onchange = () => renderAllHotspots();

function renderAllHotspots() {
  cityLayer.clearLayers();
  const currentMonthId = MONTH_DATA[currentMonthIndex].id;
  const filterVal = riskFilter.value;

  allCSVData.forEach((w) => {
    if (w.Month !== currentMonthId) return;

    const risk = calculateDynamicRisk(w);
    const label = riskLabel(risk);

    if (filterVal !== 'all' && label !== filterVal) return;

    const color = riskColor(risk);
    const marker = L.circleMarker([w.latitude, w.longitude], {
      radius: 8, fillColor: color, color: '#fff', weight: 1, fillOpacity: 0.7
    });

    // Create Card HTML for Popup
    const riskClass = risk >= 50 ? 'popup-risk-high' : risk >= 25 ? 'popup-risk-mod' : 'popup-risk-low';
    
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
    
    // Simple click just selects data, doesn't force zoom (Zoom is handled by Apply button now)
    marker.on('click', () => {
        selectWardFromMap(w);
        map.setView(marker.getLatLng(), 14);
        marker.openPopup();
    });

    marker.addTo(cityLayer);
  });
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
  
  // Clear dependent dropdowns
  citySelect.length = 1; 
  citySelect.disabled = true;
  applyBtn.disabled = true;

  Object.keys(districtLookup).sort().forEach(m => {
      // Strip "Local Municipality" for the dropdown list
      const cleanName = m.replace(/ Local Municipality$/i, "");
      provinceSelect.add(new Option(cleanName, m));
  });
};

// --- 2. Populate Wards ---
provinceSelect.onchange = () => {
    citySelect.length = 1;
    citySelect.disabled = false;
    applyBtn.disabled = true;
    
    const currentMonthId = MONTH_DATA[currentMonthIndex].id;
    const wards = districtLookup[provinceSelect.value] || [];
    
    // Sort wards alphabetically or numerically if possible
    wards.filter(w => w.Month === currentMonthId).forEach((w, i) => {
        // Storing index as value to look up in array later
        citySelect.add(new Option(w.WardLabel, i));
    });
};

// --- 3. Enable Apply Button on Ward Selection ---
citySelect.onchange = () => {
    if (citySelect.value !== "") {
        applyBtn.disabled = false;
    } else {
        applyBtn.disabled = true;
    }
};

// --- 4. Apply Button Click Event ---
applyBtn.addEventListener('click', () => {
    const wardIndex = citySelect.value;
    const municipality = provinceSelect.value;
    
    if (wardIndex !== "" && municipality) {
        // Look up the actual data object using the index we stored in the option value
        const wardData = districtLookup[municipality][wardIndex]; // NOTE: Ensure index logic matches how you populated it
        
        // Alternative lookup if your filtering logic in populate might have shifted indices:
        // const currentMonthId = MONTH_DATA[currentMonthIndex].id;
        // const validWards = districtLookup[municipality].filter(w => w.Month === currentMonthId);
        // const wardData = validWards[wardIndex]; 

        // However, since we used the loop index (i) from the filtered list in provinceSelect.onchange, 
        // we must ensure we grab the correct object here. 
        // SAFE APPROACH: Retrieve based on label match or ensure index consistency.
        // Let's assume the index 'i' passed to Option corresponds to the index in the *filtered* array.
        const currentMonthId = MONTH_DATA[currentMonthIndex].id;
        const validWards = districtLookup[municipality].filter(w => w.Month === currentMonthId);
        const specificWard = validWards[wardIndex];

        if (specificWard) {
            // A. Update the panels
            selectWardFromMap(specificWard);
            
            // B. Zoom in to the exact ward
            map.flyTo([specificWard.latitude, specificWard.longitude], 14, {
                duration: 1.5
            });

            // C. Find and open the specific marker popup
            cityLayer.eachLayer((layer) => {
                const latLng = layer.getLatLng();
                // Check for coordinate match
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
    // Trigger manual reset of dependents since we might want specific behavior
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
    
    // 4. Reset Map View
    map.flyTo([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom, {
        duration: 1.5
    });

    // 5. Re-render map to show all points
    renderAllHotspots();
    
    // Re-populate province dropdown since we cleared it
    countrySelect.onchange(); 
    provinceSelect.value = ""; // Ensure it stays on "Select Municipality"
});

// -------------------- Slider --------------------
const timeSlider = document.getElementById('time-slider');
timeSlider.oninput = (e) => {
  currentMonthIndex = parseInt(e.target.value);
  const cfg = MONTH_DATA[currentMonthIndex];
  document.getElementById('month-label').innerText = cfg.month;
  document.querySelector('.year-label').innerText = cfg.year;
  
  // Refresh map and reset selection on time change
  renderAllHotspots();
  resetPanels();
  
  // Reset dropdowns on time change to prevent mismatch
  citySelect.value = "";
  applyBtn.disabled = true;
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
