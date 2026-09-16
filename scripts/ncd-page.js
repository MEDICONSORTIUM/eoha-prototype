// -------------------- Constants --------------------
const DEFAULT_VIEW = { lat: -22.5, lng: 25, zoom: 4 };

const RISK_COLORS = {
    high: "#d93025",
    moderate: "#f9bb06",
    low: "#34a853",
    empty: "#cbd5e1",
    average: "#5c6c85"
};

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

const countryCoordinates = {
    "South Africa": [-30.5595, 22.9375],
    "Botswana": [-22.3285, 24.6849],
    "Zimbabwe": [-19.0154, 29.1549],
    "Lesotho": [-29.61, 28.2336]
};

const countryRisk = {
    "South Africa": 58,
    "Botswana": 45,
    "Zimbabwe": 63,
    "Lesotho": 52
};

// -------------------- State --------------------
let map = null;
let marker = null;

// -------------------- DOM Elements --------------------
const country_select = document.getElementById("country-select");
const province_select = document.getElementById("province-select");
const city_select = document.getElementById("city-select");
const apply_button = document.getElementById("apply-btn");
const reset_button = document.getElementById("reset-btn");

const risk_ring = document.getElementById("risk-ring");
const avg_risk_ring = document.getElementById("avg-risk-ring");
const risk_text = document.getElementById("risk-text");
const risk_percentage = document.getElementById("risk-percentage");
const selected_region_name = document.getElementById("selected-region-name");

const avg_risk_text = document.getElementById("avg-risk-text");
const avg_risk_percentage = document.getElementById("avg-risk-percentage");

// -------------------- Map Setup --------------------

/**
 * initialise_map()
 * ----------------
 * Creates the Leaflet map and sets the default view.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function initialise_map() {
    if (typeof L === "undefined") return;

    map = L.map("map", {
        zoomControl: false,
        attributionControl: false
    }).setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18
    }).addTo(map);
}

/**
 * move_map_to_country()
 * ---------------------
 * Moves the map to the selected country and places a marker.
 *
 * Parameters:
 * -----------
 * country: string
 *   The selected country name.
 *
 * Returns:
 * --------
 * void
 */
function move_map_to_country(country) {
    if (!map || !countryCoordinates[country]) return;

    const coordinates = countryCoordinates[country];

    map.setView(coordinates, 6);

    if (marker) {
        map.removeLayer(marker);
    }

    marker = L.circleMarker(coordinates, {
        radius: 10,
        color: "#ffffff",
        weight: 2,
        fillColor: "#1a82ff",
        fillOpacity: 0.85
    }).addTo(map);
}

/**
 * reset_map_view()
 * ----------------
 * Resets the map back to the default view.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function reset_map_view() {
    if (!map) return;

    map.setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);

    if (marker) {
        map.removeLayer(marker);
        marker = null;
    }
}

// -------------------- Risk Logic --------------------

/**
 * get_risk_color()
 * ----------------
 * Returns the display color for a given NCD risk score.
 *
 * Parameters:
 * -----------
 * score: number
 *   The NCD risk score.
 *
 * Returns:
 * --------
 * string
 *   A hex color value representing the risk level.
 */
function get_risk_color(score) {
    if (score >= 70) return RISK_COLORS.high;
    if (score >= 50) return RISK_COLORS.moderate;
    if (score > 0) return RISK_COLORS.low;
    return RISK_COLORS.empty;
}

/**
 * get_risk_label()
 * ----------------
 * Returns the textual risk label for a given NCD risk score.
 *
 * Parameters:
 * -----------
 * score: number
 *   The NCD risk score.
 *
 * Returns:
 * --------
 * string
 *   The risk label.
 */
function get_risk_label(score) {
    if (score >= 70) return "High";
    if (score >= 50) return "Moderate";
    if (score > 0) return "Low";
    return "--";
}

/**
 * get_country_risk()
 * ------------------
 * Gets the placeholder NCD risk score for a selected country.
 *
 * Parameters:
 * -----------
 * country: string
 *   The selected country name.
 *
 * Returns:
 * --------
 * number
 *   The NCD risk score.
 */
function get_country_risk(country) {
    return countryRisk[country] || 0;
}

// -------------------- Donut Charts --------------------

/**
 * update_risk_donut()
 * -------------------
 * Updates a circular risk chart with score, label, color, and suffix.
 *
 * Parameters:
 * -----------
 * options: object
 *   Contains the ring, label, percentage, score, color, and suffix.
 *
 * Returns:
 * --------
 * void
 */
function update_risk_donut({
    ring,
    label_element,
    percentage_element,
    score,
    label,
    color,
    suffix = "RISK"
}) {
    if (!ring || !label_element || !percentage_element) return;

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;
    ring.style.stroke = color;

    label_element.innerText = label;
    label_element.style.color = color;
    percentage_element.innerText = `${Math.round(score)}% ${suffix}`;
}

/**
 * update_current_risk()
 * ---------------------
 * Updates the main risk card using the selected country.
 *
 * Parameters:
 * -----------
 * country: string | null
 *   The selected country, or null when no country is selected.
 *
 * Returns:
 * --------
 * void
 */
function update_current_risk(country = null) {
    if (!country) {
        update_risk_donut({
            ring: risk_ring,
            label_element: risk_text,
            percentage_element: risk_percentage,
            score: 0,
            label: "--",
            color: RISK_COLORS.empty,
            suffix: "RISK"
        });

        return;
    }

    const score = get_country_risk(country);

    update_risk_donut({
        ring: risk_ring,
        label_element: risk_text,
        percentage_element: risk_percentage,
        score,
        label: get_risk_label(score),
        color: get_risk_color(score),
        suffix: "RISK"
    });
}

/**
 * update_average_risk()
 * ---------------------
 * Updates the national average risk donut.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function update_average_risk() {
    const average_score = 58;

    update_risk_donut({
        ring: avg_risk_ring,
        label_element: avg_risk_text,
        percentage_element: avg_risk_percentage,
        score: average_score,
        label: get_risk_label(average_score),
        color: RISK_COLORS.average,
        suffix: "AVG"
    });
}

// -------------------- Dropdown Helpers --------------------

/**
 * clear_select()
 * --------------
 * Clears a dropdown while keeping its placeholder option.
 *
 * Parameters:
 * -----------
 * select_element: HTMLSelectElement
 *   The dropdown element to clear.
 *
 * Returns:
 * --------
 * void
 */
function clear_select(select_element) {
    select_element.length = 1;
}

/**
 * populate_country_select()
 * -------------------------
 * Adds available countries to the country dropdown.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function populate_country_select() {
    Object.keys(ncdRegionData).forEach((country) => {
        country_select.add(new Option(country, country));
    });
}

/**
 * populate_province_select()
 * --------------------------
 * Adds provinces or regions for the selected country.
 *
 * Parameters:
 * -----------
 * country: string
 *   The selected country name.
 *
 * Returns:
 * --------
 * void
 */
function populate_province_select(country) {
    clear_select(province_select);

    Object.keys(ncdRegionData[country]).forEach((province) => {
        province_select.add(new Option(province, province));
    });
}

/**
 * populate_city_select()
 * ----------------------
 * Adds the city or municipality for the selected province.
 *
 * Parameters:
 * -----------
 * country: string
 *   The selected country name.
 *
 * province: string
 *   The selected province or region name.
 *
 * Returns:
 * --------
 * void
 */
function populate_city_select(country, province) {
    clear_select(city_select);

    const city = ncdRegionData[country][province];

    city_select.add(new Option(city, city));
}

/**
 * reset_region_selects()
 * ----------------------
 * Resets and disables province and city dropdowns.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function reset_region_selects() {
    clear_select(province_select);
    clear_select(city_select);

    province_select.disabled = true;
    city_select.disabled = true;
    apply_button.disabled = true;
}

/**
 * reset_dashboard()
 * -----------------
 * Resets the dashboard to its initial display state.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function reset_dashboard() {
    selected_region_name.innerText = "Select a Region";
    update_current_risk(null);
}

// -------------------- Event Handlers --------------------

/**
 * handle_country_change()
 * -----------------------
 * Handles country selection and prepares the province dropdown.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_country_change() {
    const country = country_select.value;

    reset_region_selects();

    if (!country) {
        reset_dashboard();
        reset_map_view();
        return;
    }

    province_select.disabled = false;
    selected_region_name.innerText = country;

    populate_province_select(country);
    update_current_risk(country);
    move_map_to_country(country);
}

/**
 * handle_province_change()
 * ------------------------
 * Handles province selection and prepares the city dropdown.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_province_change() {
    const country = country_select.value;
    const province = province_select.value;

    clear_select(city_select);
    city_select.disabled = true;
    apply_button.disabled = true;

    if (!province) {
        selected_region_name.innerText = country || "Select a Region";
        return;
    }

    city_select.disabled = false;
    selected_region_name.innerText = province;

    populate_city_select(country, province);
}

/**
 * handle_city_change()
 * --------------------
 * Enables the apply button when a city is selected.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_city_change() {
    const city = city_select.value;

    apply_button.disabled = city === "";

    if (city) {
        selected_region_name.innerText = city;
    }
}

/**
 * handle_apply_click()
 * --------------------
 * Applies the selected city and updates the risk display.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_apply_click() {
    const country = country_select.value;
    const city = city_select.value;

    if (!country || !city) return;

    selected_region_name.innerText = city;
    update_current_risk(country);
}

/**
 * handle_reset_click()
 * --------------------
 * Resets all dropdowns, dashboard panels, and the map.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function handle_reset_click() {
    country_select.value = "";

    reset_region_selects();
    reset_dashboard();
    reset_map_view();
}

/**
 * bind_event_handlers()
 * ---------------------
 * Connects page controls to their event handler functions.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function bind_event_handlers() {
    country_select.addEventListener("change", handle_country_change);
    province_select.addEventListener("change", handle_province_change);
    city_select.addEventListener("change", handle_city_change);
    apply_button.addEventListener("click", handle_apply_click);
    reset_button.addEventListener("click", handle_reset_click);
}

// -------------------- Initialisation --------------------

/**
 * initialise_dashboard()
 * ----------------------
 * Sets up the NCD dashboard controls, map, default risk panels, and event handlers.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * void
 */
function initialise_dashboard() {
    initialise_map();
    populate_country_select();
    bind_event_handlers();

    reset_region_selects();
    reset_dashboard();
    update_average_risk();
}

initialise_dashboard();