const mapContainer = document.getElementById('contact_map');
const mapStatus = document.getElementById('contact-map-status');
/**
 * initContactMap()
 * ----------------
 * Initialize the contact location map and show a useful message if map libraries or tiles are
 * unavailable.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function initContactMap() {
  if (!mapContainer) return;
  if (typeof L === 'undefined') {
    mapStatus.textContent =
      'Map could not load. Use the address above or open the location link below.';
    return;
  }
  const location = [-25.7549, 28.2326];
  const map = L.map(mapContainer, { scrollWheelZoom: false }).setView(location, 15);
  const tiles = EOHAMap.addBasemap(map);
  tiles.on('tileerror', () => {
    mapStatus.textContent = 'Map tiles are unavailable. Use the location link below.';
  });
  tiles.on('load', () => {
    mapStatus.textContent = '';
  });
  L.marker(location)
    .addTo(map)
    .bindPopup(
      '<strong>Medical Consortium of Africa</strong><br>1225 Pretoria Street, Hatfield<br>Pretoria, 0028, South Africa',
    );
  new ResizeObserver(() => map.invalidateSize()).observe(mapContainer);
}
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', initContactMap);
else initContactMap();
