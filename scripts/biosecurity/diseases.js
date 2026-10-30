(function (global) {
  global.BiosecDiseases = {
    fmd: {
      name: 'Foot-and-Mouth Disease',
      summary: 'Drought and poor grazing push livestock and wildlife to gather at limited water.',
      factors: [
        { key: 'dry-soil', label: 'Dry soil', variable: 'soil_moisture', unit: 'm³/m³', direction: 'low', weight: 30 },
        { key: 'sparse-vegetation', label: 'Sparse vegetation', variable: 'ndvi', unit: '', direction: 'low', weight: 25 },
        { key: 'agriculture', label: 'Agricultural land', variable: 'agriculture_fraction', unit: '', direction: 'high', weight: 20 },
        { key: 'surface-temperature', label: 'Surface temperature', variable: 'lst_c', unit: '°C', direction: 'high', weight: 15 },
        { key: 'population', label: 'Population', variable: 'population', unit: '', direction: 'high', weight: 10 }
      ]
    },
    ai: {
      name: 'Avian Influenza',
      summary: 'Heavy rain and expanding wetlands draw wild waterfowl towards commercial poultry.',
      factors: [
        { key: 'wet-soil', label: 'Wet soil', variable: 'soil_moisture', unit: 'm³/m³', direction: 'high', weight: 30 },
        { key: 'surface-water', label: 'Surface water (NDWI)', variable: 'ndwi', unit: '', direction: 'high', weight: 30 },
        { key: 'agriculture', label: 'Agricultural land', variable: 'agriculture_fraction', unit: '', direction: 'high', weight: 25 },
        { key: 'population', label: 'Population', variable: 'population', unit: '', direction: 'high', weight: 15 }
      ]
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
