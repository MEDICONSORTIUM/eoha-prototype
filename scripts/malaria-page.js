// 1. Data Source
const ncdRegionData = {
  "South Africa": {
    "Eastern Cape": { city: "Bhisho", risk: 55, coords: [-32.85, 27.33] },
    "Gauteng": { city: "Johannesburg", risk: 58, coords: [-26.2041, 28.0473] },
    "KwaZulu-Natal": { city: "Pietermaritzburg", risk: 62, coords: [-29.6, 30.38] }
  },
  "Botswana": {
    "Gaborone": { city: "Gaborone", risk: 42, coords: [-24.6282, 25.9231] },
    "Francistown": { city: "Francistown", risk: 48, coords: [-21.17, 27.51] }
  },
  "Zimbabwe": {
    "Harare": { city: "Harare", risk: 65, coords: [-17.8252, 31.0335] },
    "Bulawayo": { city: "Bulawayo", risk: 60, coords: [-20.15, 28.58] }
  }
};

// 2. Initialize Map (Default view over Southern Africa)
const map = L.map('map', { zoomControl: false }).setView([-25, 25], 5);

// Move zoom control to bottom right to avoid covering the floating panels
L.control.zoom({
    position: 'bottomright'
}).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let cityLayer = L.layerGroup().addTo(map);

// 3. Helper Functions
function riskColor(risk) {
  if (risk >= 60) return '#d93025'; // Red (High)
  if (risk >= 50) return '#fa7b17'; // Orange (Medium)
  return '#34a853'; // Green (Low)
}

function updateRiskPanel(risk, riskLabel) {
    const riskTextEl = document.getElementById('risk-text');
    const riskPercEl = document.getElementById('risk-percentage');
    
    riskTextEl.innerText = riskLabel;
    riskTextEl.style.color = riskColor(risk);
    
    riskPercEl.innerText = risk + "%";
}

// 4. Selector Logic
const countrySelect = document.getElementById('country-select');
const provinceSelect = document.getElementById('province-select');
const citySelect = document.getElementById('city-select');

// Populate Countries
for (let country in ncdRegionData) {
  countrySelect.options[countrySelect.options.length] = new Option(country, country);
}

// Country Change Event
countrySelect.onchange = function() {
  provinceSelect.length = 1; // Reset
  provinceSelect.selectedIndex = 0;
  citySelect.length = 1; // Reset
  citySelect.selectedIndex = 0;
  citySelect.disabled = true;
  cityLayer.clearLayers();
  
  if (!this.value) {
    provinceSelect.disabled = true;
    map.setView([-25, 25], 5);
    updateRiskPanel(0, "--");
    return;
  }
  
  provinceSelect.disabled = false;
  for (let province in ncdRegionData[this.value]) {
    provinceSelect.options[provinceSelect.options.length] = new Option(province, province);
  }
  
  // Center roughly on region (generic)
  map.setView([-25, 25], 5); 
};

// Province Change Event
provinceSelect.onchange = function() {
  citySelect.length = 1;
  citySelect.selectedIndex = 0;
  cityLayer.clearLayers();
  
  if (!this.value) {
    citySelect.disabled = true;
    return;
  }
  
  citySelect.disabled = false;
  const cityData = ncdRegionData[countrySelect.value][this.value];
  citySelect.options[citySelect.options.length] = new Option(cityData.city, cityData.city);
  
  // Draw Marker
  const marker = L.circleMarker(cityData.coords, {
    radius: 12,
    fillColor: riskColor(cityData.risk),
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(cityLayer);
  
  marker.bindPopup(`<b>${cityData.city}</b><br>Risk: ${cityData.risk}%`);
  
  // Update the Right Panel
  let label = "Low";
  if(cityData.risk >= 50) label = "Medium";
  if(cityData.risk >= 60) label = "High";
  
  updateRiskPanel(cityData.risk, label);

  // Zoom to city
  map.setView(cityData.coords, 8);
};

// City Change Event (Just refocuses)
citySelect.onchange = function() {
    if(this.value) {
        const cityData = ncdRegionData[countrySelect.value][provinceSelect.value];
        map.setView(cityData.coords, 10);
        cityLayer.eachLayer(layer => layer.openPopup());
    }
};