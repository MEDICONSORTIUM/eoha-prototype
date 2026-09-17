# EOHA — Earth Observation Health Analytics Platform

A prototype public-health surveillance platform developed by the **Medical Consortium of Africa**. EOHA combines real-time Earth observation (EO) satellite data with geospatial health analytics to deliver actionable risk intelligence on Malaria and Non-Communicable Diseases (NCDs) across Africa.

---

## Live Demo

```text
https://eoha.co.za/
```

---

## Table of Contents

- [Project Purpose](#project-purpose)
- [Platform Overview](#platform-overview)
- [Pages & Features](#pages--features)
  - [Landing Page](#landing-page)
  - [Malaria Dashboard](#malaria-dashboard)
  - [Malaria Forecasting](#malaria-forecasting)
  - [Resource Center](#resource-center)
  - [Reports](#reports)
  - [NCD Prediction](#ncd-prediction)
  - [Contact Us](#contact-us)
- [Risk Scoring Model](#risk-scoring-model)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Sources](#data-sources)
- [Running Locally](#running-locally)
- [Partners](#partners)

---

## Project Purpose

EOHA explores how satellite-derived environmental data can shift public health planning from reactive responses to proactive, data-driven decision-making. The platform ingests EO indicators — land surface temperature, soil moisture, water indices, vegetation health — and combines them with demographic data to model disease risk at ward and municipality level across Africa.

The current prototype focuses on two priority health areas:

- **Malaria** — vector suitability and outbreak risk driven by environmental conditions
- **NCDs** — non-communicable disease risk driven by urban growth, air quality, and lifestyle factors

---

## Platform Overview

The platform is a static HTML/CSS/JavaScript application — no build step, no server-side rendering, no framework. Pages are linked via standard `href` navigation. Interactive maps are powered by Leaflet.js; time-series forecasting charts use Chart.js; CSV data is parsed client-side using PapaParse.

Navigation structure:

```
index.html  (Landing Page)
├── pages/malaria-page.html         (Malaria Dashboard)
│   ├── pages/malaria-forecasting.html  (Forecasting)
│   ├── pages/resource-center.html      (Resource Center)
│   └── pages/malaria-reports.html      (Reports)
├── pages/ncd-page.html             (NCD Prediction)
└── pages/contact-page.html         (Contact Us)
```

---

## Pages & Features

### Landing Page

**File:** `index.html`  
**Script:** `scripts/script.js`  
**Style:** `styles/styles.css` + `styles/theme.css`

The entry point to the platform. Features a full-screen background video with an animated glow-wave title and a scroll-reveal content layout with structured sections. All sections below the hero animate in using the `IntersectionObserver` API as the user scrolls.

Page structure (top to bottom):
- **Hero** — full-viewport satellite video backdrop, animated "Earth Observation" glow-wave title, live stat counters (560+ wards, 13 months, 2 modules), platform description card, CTA buttons
- **Feature Strip** — dark section with four module cards: Malaria Dashboard, NCD Prediction, Forecasting, Reports
- **Malaria Section** — alternating layout (text left, satellite image right) with scroll-reveal entrance
- **NCD Section** — alternating layout (image left, text right) with scroll-reveal entrance
- **How It Works** — three-step pipeline (Collect → Analyse → Act) with staggered animations
- **Powered by EO** — three-image satellite gallery with staggered fade-in
- **Africa Section** — alternating layout describing the African-context focus
- **Partners Bar** — dark section with five partner logos (greyscale, colorise on hover)
- **Footer** — brand name, nav links, copyright

Navigation links: Malaria Prediction · NCD Prediction · Contact Us

---

### Malaria Dashboard

**File:** `pages/malaria-page.html`  
**Script:** `scripts/malaria-page.js`  
**Style:** `styles/malaria-page.css`

The primary Malaria surveillance interface. A full-viewport layout overlaying interactive UI panels on a live Leaflet map with a heatmap risk layer.

**Layout:** Three-column dashboard grid (left sidebar · map · right sidebar) with a bottom timeline panel.

**Left sidebar — Region Selector:**
- Country, Municipality, and Ward dropdowns populated from GeoJSON data
- "Update View" button to apply filters and zoom the map
- Reset filter button

**Left sidebar — Environmental Factors:**
- Progress bars showing Precipitation, Average Temperature, and Humidity Level for the selected region
- Insight callout box with contextual commentary

**Map (background):**
- CartoDB light tiles (labels on a separate pane above the heatmap)
- Live heatmap overlay powered by Leaflet.heat, coloured by risk score
  - Green: low risk
  - Yellow: moderate risk
  - Red: high risk
- Invisible click layer for ward-level selection popups

**Right sidebar — Risk Cards:**
- Current Ward Risk: donut chart showing risk % and category (Low / Mod / High) for the selected ward
- Municipality Average: donut chart showing the average risk across all wards in the selected municipality
- Map Legend: live heatmap legend with colour key

**Bottom panel — Forecasting Timeline:**
- Time slider spanning October to November (13 steps)
- Recenter map button
- Play button for animated timeline

---

### Malaria Forecasting

**File:** `pages/malaria-forecasting.html`  
**Script:** `scripts/malaria-forecasting.js`  
**Style:** `styles/forecasting.css`

Time-series view of predicted malaria risk over a configurable forecast window.

**Left sidebar:**
- Forecast Range selector: 7 days / 30 days / 90 days
- Region selector: Limpopo, Mpumalanga, KwaZulu-Natal
- Model Info card: algorithm (Random Forest), accuracy (91.4%), training period, and data source

**Main area — Chart:**
- Chart.js line chart with confidence band (shaded region) around the predicted risk curve
- Data points colour-coded by risk level: green < 25%, yellow 25–49%, red ≥ 50%
- Smooth tension curve, responsive to window size

**Right sidebar:**
- Confidence Interval card: upper bound, mean forecast, lower bound values with a colour-gradient bar
- Trend card: worsening ↗ / improving ↘ indicator with colour
- Peak Risk Day card: date and percentage of the highest predicted risk in the window
- Chart Legend

---

### Resource Center

**File:** `pages/resource-center.html`  
**Style:** `styles/resource-center.css`

A curated library of research papers, satellite datasets, methodology documentation, and open-source tools used by or related to the EOHA platform.

**Filter bar:** All · Research · Data · Methodology · Tools (client-side category filtering, no page reload)

**Resource cards include:**
- WHO World Malaria Report 2024
- Earth Observation for Malaria Control (peer-reviewed paper)
- NASA MODIS Land Surface Temperature (MOD11A1) dataset
- ESA Copernicus Sentinel-2 multispectral imagery
- South Africa Ward Boundaries GeoJSON (downloadable)
- EOHA Risk Scoring Methodology (internal)
- Random Forest Forecasting Model (internal)
- Leaflet.js documentation
- Chart.js documentation

Each card shows a category badge, description, and a link/download button.

---

### Reports

**File:** `pages/malaria-reports.html`  
**Script:** `scripts/malaria-reports.js`  
**Style:** `styles/reports.css`

A data-driven tabular report showing ward-level malaria risk scores computed from the real Limpopo EO dataset.

**Summary statistics row:**
- Wards Monitored
- High Risk Wards (≥ 50%)
- Moderate Risk Wards (25–49%)
- Low Risk Wards (< 25%)
- Average Risk %

**Data table columns:** Ward · Municipality · Province · LST (°C) · Soil Moisture · Risk % · Risk Level

- Loads data live from `data/Limpopo_Risk_Jan25_Jan26_Safe.csv` using PapaParse
- Automatically selects and displays the most recent month in the dataset
- Applies the same `calculateRisk()` formula used in the Malaria Dashboard
- All columns are sortable (click header to sort ascending/descending)
- Risk Level cells are colour-coded: red badge (High), yellow badge (Moderate), green badge (Low)

**Export:** "Export CSV" button downloads the current table as a `.csv` file using the browser's Blob API.

---

### NCD Prediction

**File:** `pages/ncd-page.html`  
**Style:** `styles/ncd-page.css`

Africa-wide NCD risk monitoring interface with a full-screen Leaflet map and floating UI panels.

**Map:** Countries coloured by NCD risk score. Currently includes South Africa (58%), Zimbabwe (63%), Botswana (45%), and Lesotho (52%). Clicking a country zooms the map; clicking South Africa loads province boundaries.

**Region Selector panel:** Country → Province → City/Municipality dropdown cascade. Province and municipality boundaries loaded from `South_Africa_ADM1.geojson` and `South_Africa_ADM3.geojson`.

**Environmental & Lifestyle Factors panel:**
- Lifestyle Type
- Population Density
- Access to Healthcare (progress bar)
- Air Quality Index (progress bar)
- Obesity Prevalence (progress bar)

**Risk Prediction panel:** Current Risk Level label, risk category, and percentage.

---

### Contact Us

**File:** `pages/contact-page.html`  
**Script:** `scripts/contact.js`  
**Style:** `styles/contact.css`

Contact information page for the Medical Consortium of Africa.

- Hero header with gradient background
- Glass-morphism contact info card containing:
  - Physical address: 1225 Pretoria Street, Hatfield, Pretoria, 0028
  - Phone: +27 (0)76 712 0362
  - Email: kmontjaneconsortium@gmail.com (opens default mail client)
  - Leaflet map centred on Hatfield, Pretoria with a popup marker
  - Partner logos: SANSA, TuksNovation, NRF
- Footer with copyright

---

## Risk Scoring Model

The malaria risk score is a composite of four environmental and demographic indicators derived from EO data:

```
Risk Score = Soil Moisture (max 40) + LST (max 30) + NDWI (max 20) + Population Density (max 10)
```

| Factor | Condition | Points |
|---|---|---|
| Soil Moisture | > 0.35 | 40 |
| Soil Moisture | 0.25 – 0.35 | 20 |
| Land Surface Temp | 25°C – 30°C (optimal mosquito breeding) | 30 |
| NDWI Water Index | > -0.1 (water present) | 20 |
| Population Density | > 300 persons/km² | 10 |

**Risk categories:**

| Score | Category |
|---|---|
| ≥ 50 | High |
| 25 – 49 | Moderate |
| < 25 | Low |

This model is implemented in `scripts/malaria-page.js` (`calculateDynamicRisk`) and reused in `scripts/malaria-reports.js`.

---

## Tech Stack

| Technology | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling, glassmorphism panels, grid layouts, animations |
| Vanilla JavaScript | Interactivity, data processing, chart and map control |
| [Leaflet.js](https://leafletjs.com) | Interactive maps |
| [Leaflet.heat](https://github.com/Leaflet/Leaflet.heat) | Heatmap overlay on the malaria dashboard |
| [Chart.js](https://www.chartjs.org) | Time-series line chart on the forecasting page |
| [PapaParse](https://www.papaparse.com) | Client-side CSV parsing |
| IntersectionObserver API | Scroll-reveal entrance animations on the landing page |
| CSS Custom Properties | Theming system for light/dark mode (`styles/theme.css`) |
| CartoDB tile layers | Basemap tiles (light, no-labels, labels-only variants) |
| OpenStreetMap | NCD page basemap |
| GeoJSON | Country, province, and ward boundary data |
| CSV | Ward-level EO feature data (Limpopo, Jan 2025 – Jan 2026) |

---

## Project Structure

```
eoha-prototype/
│
├── index.html                          # Landing page
│
├── pages/
│   ├── malaria-page.html               # Malaria dashboard
│   ├── malaria-forecasting.html        # Forecasting page
│   ├── malaria-reports.html            # Reports page
│   ├── resource-center.html            # Resource center
│   ├── ncd-page.html                   # NCD prediction
│   └── contact-page.html               # Contact page
│
├── scripts/
│   ├── script.js                       # Landing page: counters, hamburger, IntersectionObserver
│   ├── theme.js                        # Global light/dark mode toggle (loads in <head>)
│   ├── malaria-page.js                 # Malaria dashboard map + risk logic
│   ├── malaria-forecasting.js          # Forecasting chart logic
│   ├── malaria-reports.js              # Reports table + CSV export
│   ├── contact.js                      # Contact page Leaflet map
│   └── ncd-page.js                     # NCD map + dropdown logic
│
├── styles/
│   ├── theme.css                       # CSS custom properties + dark mode overrides (global)
│   ├── styles.css                      # Landing page styles
│   ├── malaria-page.css                # Malaria dashboard styles
│   ├── forecasting.css                 # Forecasting page styles
│   ├── reports.css                     # Reports page styles
│   ├── resource-center.css             # Resource center styles
│   ├── ncd-page.css                    # NCD page styles
│   ├── contact.css                     # Contact page styles
│   └── bg_video.css                    # Background video utility
│
├── data/
│   ├── Limpopo_Risk_Jan25_Jan26_Safe.csv   # Ward-level EO features (13 months)
│   ├── Limpopo_Risk_Jan25_Jan26_Safe1.csv  # Alternate ward dataset
│   ├── africa-countries.geo.json           # Africa country boundaries
│   ├── South_Africa_ADM1.geojson           # South Africa province boundaries
│   ├── South_Africa_ADM3.geojson           # South Africa municipality boundaries
│   └── 8947-215890483.mp4                  # Landing page background video
│
└── images/
    ├── hartbeesdam_oli2_20220810_lrg.jpg
    ├── iss072e807123_lrg.jpg
    ├── northatlantic_tmo_2017197_lrg.jpg
    ├── PIA04965.jpg
    ├── SANSA_Logo_small-1-1.jpg
    ├── TuksNovation-logo-2-menu-1.png
    ├── uct-research-support-hub-navigator-funder-nrf_0.png
    ├── Science-Technology_-and-Innovation-1024x382.jpg
    └── Partner_0010_Layer-1.jpg
```

---

## Data Sources

**Limpopo EO Dataset (`Limpopo_Risk_Jan25_Jan26_Safe.csv`)**  
Monthly ward-level observations from January 2025 to January 2026 covering ~560 wards across Limpopo Province. Each row contains:

| Column | Description |
|---|---|
| `Month` | Observation month (e.g. `Jan 2025`) |
| `WardID` | Unique ward identifier |
| `WardLabel` | Human-readable ward code |
| `Municipali` | Municipality name |
| `Province` | Province name |
| `latitude` / `longitude` | Ward centroid coordinates |
| `LST_Surface_C` | MODIS land surface temperature (°C) |
| `Air_Temp_C` | Air temperature (°C) |
| `Soil_Moisture` | Volumetric soil moisture fraction |
| `NDWI_Water` | Normalised Difference Water Index |
| `Habitat_Vegetation_Index` | Vegetation health proxy |
| `Agric_Percentage` | Percentage agricultural land cover |
| `Population_Density_Per_KM2` | Population density |
| `Habitat_Class_Code` | Habitat classification code |

**Boundary data** sourced from publicly available GADM administrative boundary datasets.

---

## Running Locally

No build step required. Serve the project root with any static file server.

**Using Python:**
```bash
cd eoha-prototype
python3 -m http.server 8080
```
Then open `http://localhost:8080` in a browser.

**Using Node.js (`serve`):**
```bash
npx serve .
```

**Using VS Code Live Server:**  
Install the Live Server extension, right-click `index.html`, and select "Open with Live Server".

> Note: Leaflet map tiles and the PapaParse CDN require an internet connection. The GeoJSON and CSV data files are served locally.

**Dark mode:** The platform supports light and dark mode via a sun/moon toggle button in the navbar on every page. The chosen theme is saved to `localStorage` under the key `eoha-theme`. On first visit, the browser's `prefers-color-scheme` system preference is used as the default.

---

## Partners

| Organisation | Role |
|---|---|
| Medical Consortium of Africa | Platform owner and lead developer |
| SANSA (South African National Space Agency) | Earth observation data and satellite expertise |
| University of Pretoria (TuksNovation) | Research and innovation support |
| National Research Foundation (NRF) | Funding |
| Department of Science, Technology and Innovation | Funding and policy alignment |
| University of Cape Town | Research collaboration |

---

&copy; 2026 Medical Consortium of Africa. All rights reserved.
