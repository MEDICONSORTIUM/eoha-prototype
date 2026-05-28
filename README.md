# EOHA Prototype

EOHA is a prototype Earth Observation Health Analytics platform developed by the Medical Consortium of Africa.

The platform demonstrates how Earth observation data, environmental indicators, and health-risk logic can be used to support early warning, disease surveillance, and public-health decision-making across Africa.

The prototype currently focuses on two public-health areas:

- Malaria risk monitoring
- Non-communicable disease (NCD) risk monitoring

## Live Demo

```text
https://main.d1jko0jkg4m7f.amplifyapp.com/
```

## Project Purpose

The purpose of EOHA is to explore how satellite-derived environmental data can support public-health surveillance. The platform is intended to help move health planning from reactive responses to more proactive, data-driven decision-making.

The prototype uses Earth observation and geospatial data to show how environmental conditions may relate to malaria vector suitability, outbreak risk, and broader NCD risk factors.

## Current Prototype Features

### Landing Page

The landing page introduces the EOHA platform and links to the two prototype modules:

- Malaria Prediction
- NCD Prediction

### Malaria Risk Module

The malaria module provides an interactive map-based dashboard for exploring malaria risk across selected areas.

Current functionality includes:

- Interactive map visualisation
- Heatmap-based risk display
- Ward-level selection
- Municipality filtering
- Month-based time slider
- Risk category filtering
- Environmental factor indicators
- Average risk summary for selected municipalities

The malaria risk logic uses environmental and demographic variables such as:

- Soil moisture
- Land surface temperature
- NDWI water index
- Population density
- Agricultural percentage

### NCD Risk Module

The NCD module demonstrates a regional NCD risk monitoring interface.

Current functionality includes:

- Africa-wide map view
- Country selection
- Province selection
- Municipality selection
- Basic environmental and lifestyle factor display
- Simple risk-level summary

## Tech Stack

This prototype is built with:

- HTML
- CSS
- JavaScript
- Leaflet.js
- Leaflet Heat
- Papa Parse
- CSV data
- GeoJSON data
- OpenStreetMap / CARTO map tiles

No build system is currently required.

## Running the Project Locally

Because this is a static frontend prototype, it can be run without installing dependencies.

### Option 1: Open directly in the browser

Open `index.html` in your browser.

### Option 2: Use a local development server

This is the recommended option.

Using Python:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

Using VS Code:

1. Install the Live Server extension.
2. Right-click `index.html`.
3. Select **Open with Live Server**.

## Current Development Stage

The repository represents a proof-of-concept prototype.

## Organisation

Developed by the Medical Consortium of Africa.
