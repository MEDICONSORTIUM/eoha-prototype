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
let selectedMunicipality = null;

const DEFAULT_VIEW = { lat: -23.4013, lng: 29.4179, zoom: 7 };

// -------------------- Map Setup --------------------
const map = L.map('map', { zoomControl: false })
  .setView([-23.9, 29.4], 7);

// 1. BOTTOM LAYER: The blank map (land, roads, water - no text)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
}).addTo(map);

// 2. MIDDLE LAYER: The invisible markers layer for clicks/popups
const cityLayer = L.layerGroup().addTo(map);

// 3. MIDDLE LAYER: The actual glowing heatmap layer
// You can adjust the overall intensity by lowering the 'max' value if it's still too much
const heatLayer = L.heatLayer([], { 
    radius: 20,       // Slightly smaller to reduce bleeding
    blur: 15,         // Keeps the glow smooth
    maxZoom: 10,
    minOpacity: 0.3,  // Keeps low-risk areas semi-transparent
    max: 1.5,         // NEW: Increasing this scale spreads the color out, making it less overwhelming
    gradient: { 0.4: '#34a853', 0.6: '#f9bb06', 1.0: '#d93025' } 
}).addTo(map);

// 4. TOP LAYER: Map Labels (City names, provinces, borders)
// We create a special pane and force it to sit above the heatmap (z-index: 650)
map.createPane('labels');
map.getPane('labels').style.zIndex = 650;
map.getPane('labels').style.pointerEvents = 'none'; // Crucial: Lets your mouse clicks pass through the text to hit your invisible markers

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    pane: 'labels'
}).addTo(map);
// -------------------- Risk Logic --------------------
const riskColor = r => r >= 50 ? '#d93025' : r >= 25 ? '#f9bb06' : '#34a853';

function riskLabel(r) {
  if (r >= 50) return 'High';
  if (r >= 25) return 'Mod'; 
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

// -------------------- Donut Chart Animation --------------------
function updateDonut(ringId, textId, pctId, value, label, color) {
    const ring = document.getElementById(ringId);
    if (!ring) return;
    
    // r=40 in viewBox 0 0 100 100 -> Circumference = 251.2
    const circumference = 251.2;
    const offset = circumference - (value / 100) * circumference;
    
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = color;
    
    document.getElementById(textId).innerText = label;
    document.getElementById(textId).style.color = color; 
    document.getElementById(pctId).innerText = `${Math.round(value)}% ${ringId.includes('avg') ? 'AVG' : 'RISK'}`;
}

// -------------------- Average Risk --------------------
function updateAverageRisk() {
  const avgContainer = document.getElementById('avg-risk-container');

  if (!selectedMunicipality) {
    avgContainer.style.opacity = '0.4'; 
    document.getElementById('selected-muni-name').innerText = 'Select Municipality';
    updateDonut('avg-risk-ring', 'avg-risk-text', 'avg-risk-percentage', 0, '--', '#cbd5e1');
    return;
  }

  const currentMonthId = MONTH_DATA[currentMonthIndex].id;
  const wards = (districtLookup[selectedMunicipality] || []).filter(w => w.Month === currentMonthId);

  if (wards.length === 0) return;

  const total = wards.reduce((sum, w) => sum + calculateDynamicRisk(w), 0);
  const avg = Math.round(total / wards.length);
  
  const color = '#5c6c85'; 
  const label = riskLabel(avg);

  updateDonut('avg-risk-ring', 'avg-risk-text', 'avg-risk-percentage', avg, label, color);
  document.getElementById('selected-muni-name').innerText = selectedMunicipality.replace(/ Local Municipality$/i, "");
  avgContainer.style.opacity = '1';
}

// -------------------- UI Updates --------------------
function updateEnvironmentalFactors(d, isWardSelected) {
  setBar('env-agric-bar', 'env-agric-val', isWardSelected ? d.Agric_Percentage : 0, '%', 0, 100);
  setBar('env-temp-bar', 'env-temp-val', isWardSelected ? d.LST_Surface_C : 0, '°C', 0, 50);
  setBar('env-soil-bar', 'env-soil-val', isWardSelected ? (d.Soil_Moisture * 100) : 0, '%', 0, 100);
}

function setBar(barId, valId, value = 0, unit = '', decimals = 0, max = 100) {
  const bar = document.getElementById(barId);
  const valText = document.getElementById(valId);
  
  if (bar) {
      const percentage = (value / max) * 100;
      bar.style.width = `${Math.min(Math.max(percentage, 0), 100)}%`;
  }
  if (valText) {
      valText.innerText = value > 0 ? `${value.toFixed(decimals)}${unit}` : '--';
  }
}

function resetPanels() {
  updateDonut('ward-risk-ring', 'risk-text', 'risk-percentage', 0, '--', '#cbd5e1');
  document.getElementById('selected-ward-name').innerText = 'Select a Ward';
  updateEnvironmentalFactors({}, false);
  updateAverageRisk();
}

function selectWardFromMap(data) {
    const risk = calculateDynamicRisk(data);
    updateDonut('ward-risk-ring', 'risk-text', 'risk-percentage', risk, riskLabel(risk), riskColor(risk));
    document.getElementById('selected-ward-name').innerText = data.WardLabel || 'Unknown Ward';
    updateEnvironmentalFactors(data, true);
    updateAverageRisk();
}

// -------------------- Filtering & Rendering --------------------
const riskFilter = document.getElementById('risk-level-filter');
riskFilter.onchange = () => renderAllHotspots();

function renderAllHotspots(fitToMunicipality = false) {
  cityLayer.clearLayers();
  const currentMonthId = MONTH_DATA[currentMonthIndex].id;
  const filterVal = riskFilter.value;
  
  const boundsPoints = [];
  const heatData = []; // Store coordinates and intensity for heatmap

  allCSVData.forEach((w) => {
    if (w.Month !== currentMonthId) return;
    if (selectedMunicipality && w.Municipali !== selectedMunicipality) return;

    const risk = calculateDynamicRisk(w);
    const label = riskLabel(risk);

    if (filterVal !== 'all' && label !== filterVal) return;

    const color = riskColor(risk);
    
    // Add point to heatmap array (lat, lng, intensity)
    heatData.push([w.latitude, w.longitude, risk / 100]); 

    // Create INVISIBLE marker for clicks and popups
    const marker = L.circleMarker([w.latitude, w.longitude], {
      radius: 12, 
      fillColor: color, 
      color: '#fff', 
      weight: 0, 
      fillOpacity: 0.0, // Hidden
      opacity: 0.0      // Hidden
    });

    const popupContent = `
        <div style="font-family:'Inter',sans-serif; text-align:center;">
          <h3 style="margin:0 0 5px 0; font-size:14px;">${w.WardLabel}</h3>
          <span style="color:${color}; font-weight:bold;">${Math.round(risk)}% Risk</span>
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

  // Update heatmap layer with new data
  heatLayer.setLatLngs(heatData);

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

countrySelect.add(new Option('Zambia', 'Zambia')); 
countrySelect.add(new Option('South Africa', 'South Africa')); 

countrySelect.onchange = () => {
  provinceSelect.length = 1;
  provinceSelect.disabled = false;
  
  citySelect.length = 1; 
  citySelect.disabled = true;
  applyBtn.disabled = true;

  selectedMunicipality = null;
  updateAverageRisk();
  renderAllHotspots();

  Object.keys(districtLookup).sort().forEach(m => {
      const cleanName = m.replace(/ Local Municipality$/i, "");
      provinceSelect.add(new Option(cleanName, m));
  });
};

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

    if (provinceSelect.value) {
        selectedMunicipality = provinceSelect.value;
        renderAllHotspots(true); 
        updateAverageRisk();     
    } else {
        selectedMunicipality = null;
        updateAverageRisk();
        renderAllHotspots(false);
    }
};

citySelect.onchange = () => {
    applyBtn.disabled = citySelect.value === "";
};

applyBtn.addEventListener('click', () => {
    const wardIndex = citySelect.value;
    const municipality = provinceSelect.value;
    
    if (wardIndex !== "" && municipality) {
        const currentMonthId = MONTH_DATA[currentMonthIndex].id;
        const validWards = districtLookup[municipality].filter(w => w.Month === currentMonthId);
        const specificWard = validWards[wardIndex];

        if (specificWard) {
            selectWardFromMap(specificWard);
            map.flyTo([specificWard.latitude, specificWard.longitude], 14, { duration: 1.5 });

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

resetBtn.addEventListener('click', () => {
    countrySelect.value = ""; 
    provinceSelect.length = 1; provinceSelect.disabled = true;
    citySelect.length = 1; citySelect.disabled = true;
    applyBtn.disabled = true; 
    
    riskFilter.value = 'all';
    resetPanels();

    selectedMunicipality = null;
    updateAverageRisk();
    
    map.flyTo([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom, { duration: 1.5 });
    renderAllHotspots();
});

// -------------------- Slider --------------------
const timeSlider = document.getElementById('time-slider');
timeSlider.oninput = (e) => {
  currentMonthIndex = parseInt(e.target.value);
  
  renderAllHotspots(false);
  resetPanels();
  
  citySelect.length = 1;
  citySelect.disabled = true;
  applyBtn.disabled = true;

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

// Initialize dim states
resetPanels();

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