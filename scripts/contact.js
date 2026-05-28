/**
 * Contact Us Page Script
 * Handles email button (mailto:) and initialises Leaflet map.
 * No form – just contact info and interactive map.
 */

// ==================== DOM ELEMENTS ====================
const email_btn = document.getElementById('email_btn');
const map_container = document.getElementById('contact_map');

/**
 * SendEmail()
 * -----------
 * Opens the user's default email client with a pre‑filled subject and body.
 * Uses mailto: protocol. No user email input required – fixed recipient address.
 * Source: https://stackoverflow.com/a/74504727 (CC BY-SA 4.0)
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function SendEmail() {
    const recipient = "health-info@eoha.africa";
    const subject = "Enquiry via EOHA Platform";
    const body = "Hello Medical Consortium of Africa,%0D%0A%0D%0A"; // %0D%0A for line breaks
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${body}`;
}

/**
 * init_leaflet_map()
 * ------------------
 * Initialises a Leaflet map centered on the Medical Consortium of Africa
 * headquarters in Hatfield, Pretoria, South Africa.
 * Uses three layers:
 *   1. Bottom: CartoDB light_nolabels (no text, only geography)
 *   2. Middle: Layer group for the marker (invisible clicks pass through)
 *   3. Top: CartoDB light_only_labels (city names, borders) on a dedicated pane
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function init_leaflet_map() {
    // Coordinates for Hatfield, Pretoria
    const headquarters_lat = -25.7549;
    const headquarters_lng = 28.2326;

    // Create map instance with zoom control disabled (optional)
    const map = L.map(map_container, { zoomControl: false })
        .setView([headquarters_lat, headquarters_lng], 15);

    // 1. BOTTOM LAYER: Blank map (land, roads, water – no labels)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // 2. MIDDLE LAYER: Invisible layer for the marker (allows clicks to pass through to map)
    const marker_layer = L.layerGroup().addTo(map);

    // Add a marker with a popup to the marker layer
    const marker = L.marker([headquarters_lat, headquarters_lng]).addTo(marker_layer);
    marker.bindPopup(`
        <strong>Medical Consortium of Africa</strong><br>
        1225 Pretoria Street, Hatfield<br>
        Pretoria, 0028, South Africa
    `).openPopup();

    // 3. TOP LAYER: Map labels only (city names, province borders)
    // Create a dedicated pane and position it above the marker layer (z-index 650)
    map.createPane('labels');
    map.getPane('labels').style.zIndex = 650;
    map.getPane('labels').style.pointerEvents = 'none'; // Allows clicks to pass through labels to the map/marker

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
        pane: 'labels',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }).addTo(map);

    // Optional: re-enable zoom control if desired (default position)
    L.control.zoom({ position: 'topright' }).addTo(map);
}

/**
 * init_contact_page()
 * -------------------
 * Attaches event listeners and initialises the Leaflet map.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function init_contact_page() {
    // Attach email button handler
    if (email_btn) {
        email_btn.addEventListener('click', SendEmail);
    }
    // Initialise map if container exists
    if (map_container) {
        init_leaflet_map();
    }
}

// Run initialisation when DOM is ready
document.addEventListener('DOMContentLoaded', init_contact_page);