// 1. DATA STRUCTURE WITH MOCK ENVIRONMENTAL FACTORS
const ncdRegionData = {
  "South Africa": {
    "Eastern Cape": { 
        city: "Bhisho", risk: 55, coords: [-32.849, 27.437],
        env: { habitat: "Rural/Coastal", pop: "450 persons/km²", agric: 65, temp: 22, soil: 45 } 
    },
    "Free State": { 
        city: "Bloemfontein", risk: 45, coords: [-29.118, 26.225],
        env: { habitat: "Urban/Plains", pop: "850 persons/km²", agric: 80, temp: 26, soil: 30 }
    },
    "Gauteng": { 
        city: "Johannesburg", risk: 58, coords: [-26.204, 28.047],
        env: { habitat: "Dense Urban", pop: "3,200 persons/km²", agric: 15, temp: 24, soil: 20 }
    },
    "KwaZulu-Natal": { 
        city: "Pietermaritzburg", risk: 62, coords: [-29.600, 30.383],
        env: { habitat: "Sub-tropical", pop: "1,100 persons/km²", agric: 55, temp: 28, soil: 70 }
    },
    "Limpopo": { 
        city: "Polokwane", risk: 72, coords: [-23.904, 29.468],
        env: { habitat: "Bushveld", pop: "300 persons/km²", agric: 60, temp: 32, soil: 40 }
    },
    "Mpumalanga": { 
        city: "Mbombela", risk: 68, coords: [-25.475, 30.969],
        env: { habitat: "Sub-tropical/Forest", pop: "400 persons/km²", agric: 75, temp: 29, soil: 65 }
    },
    "North West": { 
        city: "Mahikeng", risk: 50, coords: [-25.856, 25.640],
        env: { habitat: "Savannah/Arid", pop: "150 persons/km²", agric: 40, temp: 31, soil: 25 }
    },
    "Northern Cape": { 
        city: "Kimberley", risk: 35, coords: [-28.728, 24.749],
        env: { habitat: "Semi-Arid Desert", pop: "50 persons/km²", agric: 20, temp: 34, soil: 10 }
    },
    "Western Cape": { 
        city: "Cape Town", risk: 40, coords: [-33.924, 18.424],
        env: { habitat: "Mediterranean", pop: "1,800 persons/km²", agric: 45, temp: 21, soil: 50 }
    }
  },
  "Botswana": {
    "Central": { 
        city: "Serowe", risk: 44, coords: [-22.383, 26.716],
        env: { habitat: "Semi-Arid", pop: "20 persons/km²", agric: 30, temp: 33, soil: 15 }
    },
    "Chobe": { 
        city: "Kasane", risk: 75, coords: [-17.816, 25.163],
        env: { habitat: "Riverine/Wetland", pop: "15 persons/km²", agric: 25, temp: 30, soil: 80 }
    },
    "Francistown": { 
        city: "Francistown", risk: 48, coords: [-21.173, 27.514],
        env: { habitat: "Urban/Arid", pop: "600 persons/km²", agric: 10, temp: 32, soil: 20 }
    },
    "Gaborone": { 
        city: "Gaborone", risk: 42, coords: [-24.628, 25.923],
        env: { habitat: "Urban Capital", pop: "1,400 persons/km²", agric: 10, temp: 31, soil: 25 }
    },
    "Ghanzi": { 
        city: "Ghanzi", risk: 55, coords: [-21.696, 21.647],
        env: { habitat: "Kalahari Desert", pop: "5 persons/km²", agric: 55, temp: 36, soil: 5 }
    },
    "Jwaneng": { 
        city: "Jwaneng", risk: 38, coords: [-24.600, 24.730],
        env: { habitat: "Mining/Arid", pop: "200 persons/km²", agric: 5, temp: 30, soil: 10 }
    },
    "Kgalagadi": { 
        city: "Tsabong", risk: 30, coords: [-26.021, 22.401],
        env: { habitat: "Deep Desert", pop: "2 persons/km²", agric: 15, temp: 38, soil: 2 }
    },
    "Kgatleng": { 
        city: "Mochudi", risk: 40, coords: [-24.416, 26.150],
        env: { habitat: "Rural Village", pop: "80 persons/km²", agric: 40, temp: 29, soil: 22 }
    },
    "Kweneng": { 
        city: "Molepolole", risk: 41, coords: [-24.413, 25.531],
        env: { habitat: "Semi-Rural", pop: "120 persons/km²", agric: 35, temp: 29, soil: 20 }
    },
    "Lobatse": { 
        city: "Lobatse", risk: 39, coords: [-25.216, 25.666],
        env: { habitat: "Hilly/Rural", pop: "300 persons/km²", agric: 25, temp: 27, soil: 28 }
    },
    "Ngamiland": { 
        city: "Maun", risk: 68, coords: [-19.995, 23.416],
        env: { habitat: "Delta/Swamp", pop: "100 persons/km²", agric: 30, temp: 31, soil: 75 }
    },
    "North-East": { 
        city: "Masunga", risk: 52, coords: [-20.616, 27.416],
        env: { habitat: "Rural", pop: "40 persons/km²", agric: 50, temp: 30, soil: 30 }
    },
    "Selebi-Phikwe": { 
        city: "Selebi-Phikwe", risk: 46, coords: [-21.961, 27.842],
        env: { habitat: "Industrial/Mining", pop: "550 persons/km²", agric: 10, temp: 31, soil: 18 }
    },
    "South-East": { 
        city: "Ramotswa", risk: 40, coords: [-24.866, 25.866],
        env: { habitat: "Peri-urban", pop: "400 persons/km²", agric: 25, temp: 28, soil: 25 }
    },
    "Southern": { 
        city: "Kanye", risk: 36, coords: [-24.966, 25.333],
        env: { habitat: "Highland/Rural", pop: "150 persons/km²", agric: 40, temp: 26, soil: 25 }
    },
    "Sowa": { 
        city: "Sowa Town", risk: 43, coords: [-20.566, 26.216],
        env: { habitat: "Salt Pan", pop: "10 persons/km²", agric: 5, temp: 35, soil: 15 }
    }
  },
  "Zimbabwe": {
    "Bulawayo": { 
        city: "Bulawayo", risk: 60, coords: [-20.150, 28.583],
        env: { habitat: "Urban", pop: "1,200 persons/km²", agric: 20, temp: 25, soil: 30 }
    },
    "Harare": { 
        city: "Harare", risk: 65, coords: [-17.825, 31.033],
        env: { habitat: "High Altitude Urban", pop: "2,500 persons/km²", agric: 25, temp: 24, soil: 55 }
    },
    "Manicaland": { 
        city: "Mutare", risk: 62, coords: [-18.970, 32.670],
        env: { habitat: "Mountainous", pop: "600 persons/km²", agric: 60, temp: 22, soil: 60 }
    },
    "Mashonaland Central": { 
        city: "Bindura", risk: 70, coords: [-17.300, 31.333],
        env: { habitat: "Agricultural/Rural", pop: "150 persons/km²", agric: 85, temp: 28, soil: 65 }
    },
    "Mashonaland East": { 
        city: "Marondera", risk: 64, coords: [-18.183, 31.550],
        env: { habitat: "Farmland", pop: "200 persons/km²", agric: 80, temp: 23, soil: 50 }
    },
    "Mashonaland West": { 
        city: "Chinhoyi", risk: 68, coords: [-17.366, 30.200],
        env: { habitat: "Caves/Rural", pop: "120 persons/km²", agric: 70, temp: 27, soil: 55 }
    },
    "Masvingo": { 
        city: "Masvingo", risk: 58, coords: [-20.063, 30.827],
        env: { habitat: "Dry Savannah", pop: "100 persons/km²", agric: 50, temp: 30, soil: 35 }
    },
    "Matabeleland North": { 
        city: "Lupane", risk: 55, coords: [-18.931, 27.807],
        env: { habitat: "Forest/Safari", pop: "15 persons/km²", agric: 30, temp: 31, soil: 25 }
    },
    "Matabeleland South": { 
        city: "Gwanda", risk: 52, coords: [-20.933, 29.000],
        env: { habitat: "Arid Cattle Land", pop: "20 persons/km²", agric: 60, temp: 32, soil: 20 }
    },
    "Midlands": { 
        city: "Gweru", risk: 56, coords: [-19.450, 29.816],
        env: { habitat: "Central Plateau", pop: "300 persons/km²", agric: 65, temp: 26, soil: 40 }
    }
  },
  "Lesotho": {
    "Berea": { 
        city: "Teyateyaneng", risk: 25, coords: [-29.150, 27.750],
        env: { habitat: "Highland/Rural", pop: "120 persons/km²", agric: 40, temp: 18, soil: 45 }
    },
    "Butha-Buthe": { 
        city: "Butha-Buthe", risk: 22, coords: [-28.766, 28.250],
        env: { habitat: "Mountainous", pop: "80 persons/km²", agric: 30, temp: 15, soil: 50 }
    },
    "Leribe": { 
        city: "Hlotse", risk: 24, coords: [-28.871, 28.045],
        env: { habitat: "River Valley", pop: "150 persons/km²", agric: 55, temp: 19, soil: 55 }
    },
    "Mafeteng": { 
        city: "Mafeteng", risk: 28, coords: [-29.823, 27.244],
        env: { habitat: "Lowlands", pop: "110 persons/km²", agric: 60, temp: 22, soil: 35 }
    },
    "Maseru": { 
        city: "Maseru", risk: 35, coords: [-29.310, 27.483],
        env: { habitat: "Urban Capital", pop: "900 persons/km²", agric: 20, temp: 21, soil: 30 }
    },
    "Mohale's Hoek": { 
        city: "Mohale's Hoek", risk: 26, coords: [-30.150, 27.466],
        env: { habitat: "Dry Highland", pop: "70 persons/km²", agric: 40, temp: 20, soil: 25 }
    },
    "Mokhotlong": { 
        city: "Mokhotlong", risk: 20, coords: [-29.289, 29.064],
        env: { habitat: "Alpine", pop: "30 persons/km²", agric: 15, temp: 12, soil: 60 }
    },
    "Qacha's Nek": { 
        city: "Qacha's Nek", risk: 23, coords: [-30.115, 28.697],
        env: { habitat: "Mountain Border", pop: "40 persons/km²", agric: 25, temp: 16, soil: 45 }
    },
    "Quthing": { 
        city: "Moyeni", risk: 25, coords: [-30.400, 27.700],
        env: { habitat: "Windy Highland", pop: "50 persons/km²", agric: 30, temp: 18, soil: 40 }
    },
    "Thaba-Tseka": { 
        city: "Thaba-Tseka", risk: 21, coords: [-29.522, 28.608],
        env: { habitat: "Central Range", pop: "20 persons/km²", agric: 20, temp: 14, soil: 50 }
    }
  }
};

// 2. MAP SETUP
const map = L.map('map', { zoomControl: false }).setView([-25, 25], 5);

L.control.zoom({
  position: 'bottomright'
}).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let cityLayer = L.layerGroup().addTo(map);

// 3. HELPER FUNCTIONS
function riskColor(risk) {
  if (risk >= 60) return '#d93025'; 
  if (risk >= 50) return '#fa7b17'; 
  return '#34a853'; 
}

function updateRiskPanel(risk, riskLabel) {
    const riskTextEl = document.getElementById('risk-text');
    const riskPercEl = document.getElementById('risk-percentage');
    
    riskTextEl.innerText = riskLabel;
    riskTextEl.style.color = riskColor(risk);
    
    riskPercEl.innerText = risk + "%";
}

// NEW: Function to update Environmental factors
function updateEnvironmentalFactors(envData) {
    // Habitat
    document.getElementById('env-habitat').innerText = envData.habitat;
    
    // Demographics
    document.getElementById('env-demo').innerText = envData.pop;
    
    // Agriculture
    const agricBar = document.getElementById('env-agric-bar');
    const agricVal = document.getElementById('env-agric-val');
    agricBar.value = envData.agric;
    agricVal.innerText = envData.agric + "%";
    
    // Temperature
    const tempBar = document.getElementById('env-temp-bar');
    const tempVal = document.getElementById('env-temp-val');
    tempBar.value = envData.temp;
    tempVal.innerText = envData.temp + "°C";
    
    // Soil Moisture
    const soilBar = document.getElementById('env-soil-bar');
    const soilVal = document.getElementById('env-soil-val');
    soilBar.value = envData.soil;
    soilVal.innerText = envData.soil + " m³";
}

// NEW: Function to reset factors when changing country
function resetEnvironmentalFactors() {
    document.getElementById('env-habitat').innerText = "--";
    document.getElementById('env-demo').innerText = "--";
    document.getElementById('env-agric-bar').value = 0;
    document.getElementById('env-agric-val').innerText = "0%";
    document.getElementById('env-temp-bar').value = 0;
    document.getElementById('env-temp-val').innerText = "0°C";
    document.getElementById('env-soil-bar').value = 0;
    document.getElementById('env-soil-val').innerText = "0 m³";
}

// 4. SELECTOR LOGIC
const countrySelect = document.getElementById('country-select');
const provinceSelect = document.getElementById('province-select');
const citySelect = document.getElementById('city-select');

for (let country in ncdRegionData) {
  countrySelect.options[countrySelect.options.length] = new Option(country, country);
}

countrySelect.onchange = function() {
  provinceSelect.length = 1; 
  provinceSelect.selectedIndex = 0;
  citySelect.length = 1;
  citySelect.selectedIndex = 0;
  citySelect.disabled = true;
  cityLayer.clearLayers();
  
  // Reset panels
  resetEnvironmentalFactors();
  updateRiskPanel(0, "--");

  if (!this.value) {
    provinceSelect.disabled = true;
    map.setView([-25, 25], 5);
    return;
  }
  
  provinceSelect.disabled = false;
  for (let province in ncdRegionData[this.value]) {
    provinceSelect.options[provinceSelect.options.length] = new Option(province, province);
  }
  
  map.setView([-25, 25], 5); 
};

provinceSelect.onchange = function() {
  citySelect.length = 1;
  citySelect.selectedIndex = 0;
  cityLayer.clearLayers();
  
  if (!this.value) {
    citySelect.disabled = true;
    resetEnvironmentalFactors(); // Reset if province deselected
    return;
  }
  
  citySelect.disabled = false;
  const cityData = ncdRegionData[countrySelect.value][this.value];
  citySelect.options[citySelect.options.length] = new Option(cityData.city, cityData.city);
  
  // Update Map
  const marker = L.circleMarker(cityData.coords, {
    radius: 12,
    fillColor: riskColor(cityData.risk),
    color: '#fff',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8
  }).addTo(cityLayer);
  
  marker.bindPopup(`<b>${cityData.city}</b><br>Risk: ${cityData.risk}%`);
  
  // Update Risk Panel
  let label = "Low";
  if(cityData.risk >= 50) label = "Medium";
  if(cityData.risk >= 60) label = "High";
  updateRiskPanel(cityData.risk, label);

  // === NEW: Update Environmental Panel ===
  updateEnvironmentalFactors(cityData.env);

  map.setView(cityData.coords, 8);
};

citySelect.onchange = function() {
    if(this.value) {
        const cityData = ncdRegionData[countrySelect.value][provinceSelect.value];
        map.setView(cityData.coords, 10);
        cityLayer.eachLayer(layer => layer.openPopup());
    }
};