// Theme only the basemap tiles; risk overlays and markers retain their colors.
// Public OpenStreetMap tiles keep the prototype usable without API credentials.
window.EOHAMap = {
  /**
   * addBasemap()
   * ------------
   * Attach the shared OpenStreetMap tile layer without changing thematic overlays or markers.
   *
   * Parameters:
   * -----------
   * map: L.Map — The map that should receive the basemap.
   *
   * Returns:
   * --------
   * L.TileLayer
   */
  addBasemap(map) {
    return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'eoha-basemap',
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
  },
};
