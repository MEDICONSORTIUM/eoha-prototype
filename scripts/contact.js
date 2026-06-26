const email_btn = document.getElementById('email_btn');
const map_container = document.getElementById('contact_map');

function init_leaflet_map() {
    const lat = -25.7549;
    const lng = 28.2326;

    const map = L.map(map_container, { zoomControl: false }).setView([lat, lng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    const marker = L.marker([lat, lng]).addTo(map);
    marker.bindPopup('<strong>Medical Consortium of Africa</strong><br>1225 Pretoria Street, Hatfield<br>Pretoria, 0028, South Africa').openPopup();

    map.createPane('labels');
    map.getPane('labels').style.zIndex = 650;
    map.getPane('labels').style.pointerEvents = 'none';

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'labels',
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
}

document.addEventListener('DOMContentLoaded', function () {
    if (map_container) init_leaflet_map();
});
