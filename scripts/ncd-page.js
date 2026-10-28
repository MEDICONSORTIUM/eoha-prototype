const ncdRegionData = {
    "South Africa": {
        "Eastern Cape": "Bhisho",
        "Free State": "Bloemfontein",
        "Gauteng": "Johannesburg",
        "KwaZulu-Natal": "Pietermaritzburg",
        "Limpopo": "Polokwane",
        "Mpumalanga": "Mbombela",
        "North West": "Mahikeng",
        "Northern Cape": "Kimberley",
        "Western Cape": "Cape Town"
    },
    "Botswana": {
        "Central": "Serowe",
        "Chobe": "Kasane",
        "Francistown": "Francistown",
        "Gaborone": "Gaborone",
        "Ghanzi": "Ghanzi",
        "Jwaneng": "Jwaneng",
        "Kgalagadi": "Tsabong",
        "Kgatleng": "Mochudi",
        "Kweneng": "Molepolole",
        "Lobatse": "Lobatse",
        "Ngamiland": "Maun",
        "North-East": "Masunga",
        "Selebi-Phikwe": "Selebi-Phikwe",
        "South-East": "Ramotswa",
        "Southern": "Kanye",
        "Sowa": "Sowa Town"
    },
    "Zimbabwe": {
        "Bulawayo": "Bulawayo",
        "Harare": "Harare",
        "Manicaland": "Mutare",
        "Mashonaland Central": "Bindura",
        "Mashonaland East": "Marondera",
        "Mashonaland West": "Chinhoyi",
        "Masvingo": "Masvingo",
        "Matabeleland North": "Lupane",
        "Matabeleland South": "Gwanda",
        "Midlands": "Gweru"
    },
    "Lesotho": {
        "Berea": "Teyateyaneng",
        "Butha-Buthe": "Butha-Buthe",
        "Leribe": "Hlotse",
        "Mafeteng": "Mafeteng",
        "Maseru": "Maseru",
        "Mohale's Hoek": "Mohale's Hoek",
        "Mokhotlong": "Mokhotlong",
        "Qacha's Nek": "Qacha's Nek",
        "Quthing": "Moyeni",
        "Thaba-Tseka": "Thaba-Tseka"
    }
};


const countrySelect = document.getElementById('country-select');
const provinceSelect = document.getElementById('province-select');
const citySelect = document.getElementById('city-select');
const status = document.getElementById('map-status');
const regionName = document.getElementById('selected-region-name');
let map, countries, provinces;
const countryLayers = new Map();
const provinceLayers = new Map();
const neutralStyle = { color: '#64748b', weight: 1.5, fillColor: '#94a3b8', fillOpacity: 0.12 };
const selectedStyle = { color: '#1a82ff', weight: 3, fillColor: '#1a82ff', fillOpacity: 0.2 };
let mockReference = null, loadVersion = 0;
const sourceSelect = document.getElementById('data-source');
const componentSelect = document.getElementById('exposure-component');
function isDemo() { return sourceSelect.value === 'mock'; }
function scoreColor(value) { return NcdDemo.scoreBand(value).color; }
function showScore(prefix, item) {
    document.getElementById(prefix + '-text').textContent = item.value === null ? '—' : item.value.toFixed(1);
    document.getElementById(prefix + '-percentage').textContent = item.value === null ? 'Unavailable' : 'points / 100';
    const ring = document.getElementById(prefix + '-ring');
    ring.style.strokeDasharray = '251.33';
    ring.style.strokeDashoffset = String(251.33 * (1 - (item.value || 0) / 100));
    ring.style.stroke = scoreColor(item.value);
}
let observations = [], wardMarkers = null, wardRenderer = null;
const wardSelect = document.getElementById('ward-select');
const monthSelect = document.getElementById('month-select');
const timeSlider = document.getElementById('time-slider');
let timelineMonths = [], playback = null;
function selection() {
    return {country: countrySelect.value, province: provinceSelect.value,
        municipality: citySelect.value, ward: wardSelect.value, month: monthSelect.value};
}
function availableRows() {
    return NcdData.filter(observations, {...selection(), municipality: '', ward: ''});
}
function populateMunicipalities(preserve = false) {
    const previous = preserve ? citySelect.value : '';
    const municipalities = [...new Set(availableRows().map(row => row.Municipali))].sort();
    options(citySelect, municipalities);
    citySelect.disabled = municipalities.length === 0;
    if (municipalities.includes(previous)) citySelect.value = previous;
    populateWards();
}
function populateWards() {
    const previous = wardSelect.value;
    const rows = availableRows().filter(row => !citySelect.value || row.Municipali === citySelect.value);
    wardSelect.length = 1;
    const wards = new Map(rows.map(row => [String(row.WardID), row.WardLabel]));
    [...wards].sort((a,b) => a[1].localeCompare(b[1])).forEach(([id,label]) => wardSelect.add(new Option(label,id)));
    wardSelect.disabled = wards.size === 0;
    if (wards.has(previous)) wardSelect.value = previous;
}
function updateTimeline() {
    const index = timelineMonths.indexOf(monthSelect.value);
    timeSlider.value = Math.max(0, index);
    timeSlider.setAttribute('aria-valuetext', monthSelect.value);
    document.getElementById('timeline-month').textContent = monthSelect.value;
    document.getElementById('timeline-current').textContent = monthSelect.value;
}
function refreshObservations(zoom = false) {
    updateTimeline();
    document.getElementById('selected-municipality-name').textContent = citySelect.value || 'All municipalities';
    const rows = NcdData.filter(observations, selection());
    const summary = NcdData.summarize(rows);
    for (const [id,field,unit] of [['air-temp-value','Air_Temp_C','°C'],['surface-temp-value','LST_Surface_C','°C'],['density-value','Population_Density_Per_KM2','people/km²']]) {
        const item = summary[field];
        document.getElementById(id).textContent = item.value === null ? 'Unavailable' : item.value.toFixed(1) + ' ' + unit;
        document.getElementById(id).title = item.count + ' wards with valid measurements';
        document.getElementById(id.replace('-value','-bar')).style.width = (rows.length ? 100 * item.count / rows.length : 0) + '%';
    }
    document.getElementById('dataset-summary').textContent = rows.length ? monthSelect.value + ' · ' + rows.length + (rows.length === 1 ? ' ward observation' : ' ward observations') + (isDemo() ? ' | SYNTHETIC monthly demo' : ' | historical monthly data') : 'No CSV observations for this region and month.';
    regionName.textContent = (wardSelect.value ? wardSelect.selectedOptions[0].textContent : '') || citySelect.value || provinceSelect.value || countrySelect.value || 'Select a Region';
    const component = componentSelect.value;
    const empty = {value: null, count: 0};
    const selectedScore = isDemo() ? NcdDemo.average(rows, component, mockReference) : empty;
    const municipalityRows = citySelect.value ? NcdData.filter(observations, {...selection(), ward: ''}) : [];
    showScore('risk', selectedScore);
    showScore('avg-risk', isDemo() ? NcdDemo.average(municipalityRows, component, mockReference) : empty);
    document.getElementById('selected-municipality-name').textContent = citySelect.value || 'Select a municipality';
    document.getElementById('components-summary').textContent = isDemo() ? ['pollution','heat','cold'].map(key => {
        const item = NcdDemo.average(rows, key, mockReference);
        return key + ': ' + (item.value === null ? 'unavailable' : item.value.toFixed(1) + ' points (' + item.count + ' wards)');
    }).join(' · ') : 'Real-data scoring is disabled.';
    const pmValues = rows.map(r => NcdData.number(r.PM25_ug_m3)).filter(v => v !== null && v >= 0);
    document.getElementById('pm25-summary').textContent = 'PM2.5 monthly mean: ' + (pmValues.length ? (pmValues.reduce((a,b)=>a+b,0)/pmValues.length).toFixed(1) + ' µg/m³' : 'unavailable');
    if (!map) return;
    if (!wardMarkers) wardMarkers = L.layerGroup().addTo(map);
    wardMarkers.clearLayers();
    const points = [];
    const renderer = wardRenderer || (wardRenderer = L.canvas());
    rows.forEach(row => {
        const lat = NcdData.number(row.latitude), lng = NcdData.number(row.longitude);
        if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
        const label = document.createElement('span');
        const score = isDemo() ? NcdDemo.scores(row, mockReference)[component] : null;
        label.textContent = row.WardLabel + ' | ' + row.Municipali + ' | ' + row.Month + (isDemo() ? ' | SYNTHETIC ' + component + ': ' + (score === null ? 'unavailable' : score.toFixed(1) + ' points · ' + NcdDemo.scoreBand(score).label + ' exposure') : ' | observed measurements');
        L.circleMarker([lat,lng], {radius: wardSelect.value ? 8 : 4, color: isDemo() ? scoreColor(score) : '#1a82ff', fillColor: isDemo() ? scoreColor(score) : '#1a82ff', weight: 1, fillOpacity: .8, renderer})
            .bindTooltip(label).on('click', () => {
                provinceSelect.value = row.Province; populateMunicipalities(); citySelect.value = row.Municipali; populateWards(); wardSelect.value = String(row.WardID); refreshObservations(true);
            }).addTo(wardMarkers);
        points.push([lat,lng]);
    });
    if (zoom && points.length) frame({getBounds: () => L.latLngBounds(points)});
}
async function loadObservations() {
    const version = ++loadVersion;
    stopPlayback();
    observations = []; mockReference = null;
    timelineMonths = []; monthSelect.disabled = true; timeSlider.disabled = true;
    document.getElementById('play-months-btn').disabled = true;
    componentSelect.disabled = !isDemo();
    document.getElementById('source-badge').textContent = isDemo() ? 'Synthetic demo | 2025-2026' : 'Real historical measurements';
    const legend = document.getElementById('ncd-legend');
    legend.replaceChildren();
    const entries = isDemo() ? [
        ['#d93025', 'High exposure: 50–100 points'],
        ['#f9bb06', 'Moderate exposure: 25–<50 points'],
        ['#34a853', 'Low exposure: 0–<25 points'],
        ['#94a3b8', 'Score unavailable']
    ] : [['#1a82ff', 'Real observation locations · scoring disabled']];
    entries.forEach(([color, text]) => {
        const item = document.createElement('li');
        const swatch = document.createElement('span');
        swatch.className = 'dot'; swatch.style.backgroundColor = color;
        swatch.setAttribute('aria-hidden', 'true');
        item.append(swatch, document.createTextNode(text)); legend.append(item);
    });
    const note = document.createElement('li');
    note.textContent = isDemo() ? 'Synthetic component scores · prototype bands, not disease probabilities. Boundaries show geography only.' : 'Boundaries show geography only.';
    legend.append(note);
    document.getElementById('demo-notice').textContent = isDemo() ? 'SYNTHETIC DEMO · Jan 2025-Dec 2026 · Not observed data or disease probabilities.' : 'REAL HISTORICAL MEASUREMENTS · Exposure scoring disabled.';
    refreshObservations();
    document.getElementById('dataset-summary').textContent = 'Loading selected dataset…';
    try {
        if (typeof Papa === 'undefined') throw new Error('CSV parser unavailable');
        const response = await fetch(isDemo() ? '../data/ncd-mock-monthly-2025-2026.csv' : '../data/Limpopo_Risk_Jan25_Jan26_Safe.csv');
        if (!response.ok) throw new Error('CSV request failed');
        const parsed = Papa.parse(await response.text(), {header:true, skipEmptyLines:true});
        if (parsed.errors.length) throw new Error('Invalid CSV');
        let reference = null;
        if (isDemo()) {
            const referenceResponse = await fetch('../data/ncd-mock-reference-2026.json');
            if (!referenceResponse.ok) throw new Error('Reference request failed');
            reference = await referenceResponse.json();
        }
        if (version !== loadVersion) return;
        mockReference = reference;
        observations = parsed.data.filter(row => row.Month && row.WardID && row.Province);
        const months = [...new Set(observations.map(row => row.Month))].sort((a,b) => Date.parse('1 '+a)-Date.parse('1 '+b));
        if (!months.length) throw new Error('No observations');
        timelineMonths = months;
        timeSlider.max = months.length - 1; timeSlider.disabled = false;
        document.getElementById('play-months-btn').disabled = false;
        document.getElementById('timeline-start').textContent = months[0];
        document.getElementById('timeline-end').textContent = months[months.length-1];
        options(monthSelect, months); monthSelect.options[0].textContent = '-- Select Month --'; monthSelect.options[0].disabled = true; monthSelect.value = isDemo() ? months[0] : months[months.length-1]; monthSelect.disabled = false;
        countrySelect.value = 'South Africa'; countryChanged();
        populateMunicipalities(); refreshObservations(true);
    } catch (error) {
        if (version !== loadVersion) return;
        observations = []; refreshObservations();
        document.getElementById('dataset-summary').textContent = 'The selected dataset or reference could not load. Switch data source to retry.';
    }
}
function options(select, values) {
    select.length = 1;
    values.forEach(value => select.add(new Option(value, value)));
}
function frame(layer) {
    if (!map || !layer) return;
    const desktop = window.innerWidth > 1100;
    map.fitBounds(layer.getBounds(), {paddingTopLeft: desktop ? [280, 150] : [20, 20], paddingBottomRight: desktop ? [260, 150] : [20, 35], maxZoom: 9});
}
function selectRegion() {
    const country = countrySelect.value;
    const province = provinceSelect.value;
    countryLayers.forEach(layer => layer.setStyle(neutralStyle));
    provinceLayers.forEach(layer => layer.setStyle(neutralStyle));
    if (provinces) {
        if (country === 'South Africa') provinces.addTo(map);
        else map.removeLayer(provinces);
    }
    const layer = (country === 'South Africa' && province ? provinceLayers.get(province) : null) || countryLayers.get(country);
    if (layer) { layer.setStyle(selectedStyle); frame(layer); }
    regionName.textContent = province || country || 'Select a Region';
    status.textContent = country ? (isDemo() ? 'Synthetic monthly demo scores; no disease probabilities.' : 'Real measurements; scoring disabled.') : 'Select a country or click a boundary to explore.';
    refreshObservations();
}
function countryChanged() {
    options(provinceSelect, Object.keys(ncdRegionData[countrySelect.value] || {}));
    provinceSelect.disabled = !countrySelect.value;
    options(citySelect, []); citySelect.disabled = true;
    populateMunicipalities();
    document.getElementById('apply-btn').disabled = !countrySelect.value;
    selectRegion();
}
countrySelect.addEventListener('change', countryChanged);
provinceSelect.addEventListener('change', () => {
    populateMunicipalities(); selectRegion();
});
citySelect.addEventListener('change', () => { populateWards(); refreshObservations(true); });
document.getElementById('ward-select').addEventListener('change', () => refreshObservations(true));
document.getElementById('month-select').addEventListener('change', () => { populateMunicipalities(true); refreshObservations(true); });
document.getElementById('apply-btn').addEventListener('click', () => { selectRegion(); refreshObservations(true); });
document.getElementById('reset-btn').addEventListener('click', () => {
    countrySelect.value = ''; countryChanged(); recenter();
});
function recenter() {
    if (map) map.setView([-23, 25], 4);
}
document.getElementById('recenter-btn').addEventListener('click', recenter);
options(countrySelect, Object.keys(ncdRegionData));
document.getElementById('risk-text').textContent = '—';
document.getElementById('risk-percentage').textContent = 'No score';
async function loadGeojson(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Boundary request failed: ' + response.status);
    return response.json();
}
async function initializeMap() {
    if (typeof L === 'undefined') {
        status.textContent = 'The map library could not load. Check your connection and reload.';
        return;
    }
    map = L.map('map', {zoomControl: false});
    L.control.zoom({position: 'bottomleft'}).addTo(map);
    recenter();
    const tiles = EOHAMap.addBasemap(map);
    tiles.on('tileerror', () => { status.textContent = 'Basemap tiles are unavailable. Local boundaries remain usable.'; });
    const results = await Promise.allSettled([loadGeojson('../data/africa-countries.geo.json'), loadGeojson('../data/South_Africa_ADM1.geojson')]);
    if (results[0].status === 'fulfilled') {
        countries = L.geoJSON(results[0].value, {
            filter: feature => Object.hasOwn(ncdRegionData, feature.properties.name),
            style: neutralStyle,
            onEachFeature(feature, layer) {
                const name = feature.properties.name;
                countryLayers.set(name, layer);
                layer.bindTooltip(name);
                layer.on('click', () => { countrySelect.value = name; countryChanged(); });
            }
        }).addTo(map);
    }
    if (results[1].status === 'fulfilled') {
        provinces = L.geoJSON(results[1].value, {
            style: neutralStyle,
            onEachFeature(feature, layer) {
                const name = feature.properties.shapeName;
                provinceLayers.set(name, layer);
                layer.bindTooltip(name);
                layer.on('click', () => {
                    if (countrySelect.value !== 'South Africa') { countrySelect.value = 'South Africa'; countryChanged(); }
                    provinceSelect.value = name;
                    provinceSelect.dispatchEvent(new Event('change'));
                });
            }
        });
    }
    selectRegion();
    if (results.some(result => result.status === 'rejected')) status.textContent = 'Some boundaries could not load. Serve this project with a local HTTP server and reload.';
    new ResizeObserver(() => map.invalidateSize()).observe(document.getElementById('map'));
}
initializeMap().catch(() => { status.textContent = 'The map could not initialize. Reload the page to try again.'; });

sourceSelect.addEventListener('change', loadObservations);
componentSelect.addEventListener('change', () => refreshObservations());
loadObservations();

timeSlider.addEventListener('input', () => {
    monthSelect.value = timelineMonths[Number(timeSlider.value)];
    monthSelect.dispatchEvent(new Event('change'));
});
function stopPlayback() {
    clearInterval(playback); playback = null;
    document.getElementById('play-months-btn').setAttribute('aria-pressed', 'false');
    document.getElementById('play-months-btn').setAttribute('aria-label', 'Play observation timeline');
}
document.getElementById('play-months-btn').addEventListener('click', () => {
    if (playback) { stopPlayback(); return; }
    document.getElementById('play-months-btn').setAttribute('aria-pressed', 'true');
    document.getElementById('play-months-btn').setAttribute('aria-label', 'Pause observation timeline');
    playback = setInterval(() => {
        const next = (Number(timeSlider.value) + 1) % timelineMonths.length;
        timeSlider.value = next; timeSlider.dispatchEvent(new Event('input'));
    }, 1500);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });
document.getElementById('find-region-btn').addEventListener('click', () => document.getElementById('city-select').focus());
document.getElementById('dataset-info-btn').addEventListener('click', () => {
    const summary = document.getElementById('dataset-summary');
    summary.scrollIntoView({block:'center'}); summary.setAttribute('tabindex','-1'); summary.focus({preventScroll:true});
});

for (const link of document.querySelectorAll('a[href="ncd-forecasting.html"],a[href="ncd-reports.html"]')) {
 link.addEventListener('click', () => {
  const params = new URLSearchParams({province:provinceSelect.value,municipality:citySelect.value,component:componentSelect.value,month:monthSelect.value});
  link.href = link.getAttribute('href').split('?')[0] + '?' + params;
 });
}
