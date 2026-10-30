"""
Stand-alone GEE extraction script that reuses the image-composition logic from
etl_pipeline.py (LST, NDVI, NDWI, ERA5 air temp/soil moisture, WorldPop density,
ESA WorldCover habitat mode + cropland mask) but skips the GCS/Postgres steps
in favour of a single CSV export to Google Drive, with columns matching the
existing eoha-prototype/data/malaria/Limpopo_Risk_Jan25_Jan26_Safe.csv schema exactly.

Usage:
    python export_dataset_csv.py                  # Jan 2025 -> current month, all provinces
    python export_dataset_csv.py 2025-01 2026-01   # explicit start/end (YYYY-MM, end exclusive)
"""

import sys
import datetime
import ee

PROJECT_ID = 'modis-temperature-data'
WARDS_ASSET = "projects/modis-temperature-data/assets/MDB_Wards_2020"

PROVINCES = [
    "Limpopo", "Gauteng", "Mpumalanga", "North West", "Free State",
    "KwaZulu-Natal", "Eastern Cape", "Western Cape", "Northern Cape",
]

# Output column order/names match the existing CSV in eoha-prototype/data exactly.
EXPORT_COLUMNS = [
    'Month', 'WardID', 'WardLabel', 'Municipali', 'Province',
    'latitude', 'longitude',
    'LST_Surface_C', 'Air_Temp_C', 'Soil_Moisture', 'NDWI_Water',
    'Habitat_Vegetation_Index', 'Agric_Percentage',
    'Population_Density_Per_KM2', 'Habitat_Class_Code',
]


def init_earth_engine():
    """
    init_earth_engine()
    -------------------
    Initialize Earth Engine, authenticating interactively if no valid session exists.

    Parameters:
    -----------
    none

    Returns:
    --------
    None
    """
    try:
        ee.Initialize(project=PROJECT_ID)
    except Exception:
        ee.Authenticate()
        ee.Initialize(project=PROJECT_ID)


def month_range(start_year_month, end_year_month=None):
    """
    month_range()
    -------------
    Yield monthly extraction windows and display labels between the requested periods.

    Parameters:
    -----------
    start_year_month: str — First requested month in YYYY-MM form.
    end_year_month: str | None — Final requested month, or the current month.

    Returns:
    --------
    Iterator[tuple[str, str, str]]
    """
    year, month = (int(x) for x in start_year_month.split('-'))

    if end_year_month:
        end_year, end_month = (int(x) for x in end_year_month.split('-'))
    else:
        today = datetime.date.today()
        end_year, end_month = today.year, today.month

    while (year, month) < (end_year, end_month) or (year, month) == (end_year, end_month):
        start = datetime.date(year, month, 1)
        end = datetime.date(year + 1, 1, 1) if month == 12 else datetime.date(year, month + 1, 1)
        end = min(end, datetime.date.today())

        yield start.strftime('%Y-%m-%d'), end.strftime('%Y-%m-%d'), start.strftime('%b %Y')

        if (year, month) == (end_year, end_month):
            break
        year, month = (year + 1, 1) if month == 12 else (year, month + 1)


def build_safe_band_image(image_collection, band_name, scale_factor, offset, output_name):
    """
    build_safe_band_image()
    -----------------------
    Average and scale an Earth Engine band, returning a masked image for an empty window.

    Parameters:
    -----------
    image_collection: ee.ImageCollection — Real source images for the current window.
    band_name: str — Source band to aggregate.
    scale_factor: float — Multiplicative unit conversion.
    offset: float — Additive unit conversion.
    output_name: str — Exported measurement name.

    Returns:
    --------
    ee.Image
    """
    filtered = image_collection.select(band_name)
    has_data = filtered.size().gt(0)

    image_with_data = filtered.mean().multiply(scale_factor).add(offset).rename(output_name)
    image_without_data = ee.Image().rename(output_name).selfMask()

    return ee.Image(ee.Algorithms.If(has_data, image_with_data, image_without_data))


def process_province_month(province_name, start_date, end_date, month_label,
                            wards, population_image, cropland_image, habitat_image):
    """
    process_province_month()
    ------------------------
    Aggregate real satellite and reanalysis measurements over the selected province wards.

    Parameters:
    -----------
    province_name: str — Province whose wards should be sampled.
    start_date: str — Start of the extraction window.
    end_date: str — End of the extraction window.
    month_label: str — Human-readable observation month.
    wards: ee.FeatureCollection — Ward boundaries.
    population_image: ee.Image — WorldPop count raster.
    cropland_image: ee.Image — Agricultural land mask.
    habitat_image: ee.Image — Land-cover classification.

    Returns:
    --------
    ee.FeatureCollection
    """

    province_wards = wards.filter(ee.Filter.eq('Province', province_name))

    lst_collection = ee.ImageCollection('MODIS/061/MOD11A1').filterDate(start_date, end_date)
    lst_image = build_safe_band_image(lst_collection, 'LST_Day_1km', 0.02, -273.15, 'LST_Surface_C')

    ndvi_collection = ee.ImageCollection('MODIS/061/MOD13Q1').filterDate(start_date, end_date)
    ndvi_image = build_safe_band_image(ndvi_collection, 'NDVI', 0.0001, 0, 'Habitat_Vegetation_Index')

    ndwi_collection = ee.ImageCollection('MODIS/061/MOD09GA').filterDate(start_date, end_date)
    ndwi_has_data = ndwi_collection.size().gt(0)
    ndwi_with_data = (
        ndwi_collection
        .map(lambda img: img.normalizedDifference(['sur_refl_b04', 'sur_refl_b02']))
        .mean()
        .rename('NDWI_Water')
    )
    ndwi_without_data = ee.Image().rename('NDWI_Water').selfMask()
    ndwi_image = ee.Image(ee.Algorithms.If(ndwi_has_data, ndwi_with_data, ndwi_without_data))

    era5_collection = ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY").filterDate(start_date, end_date)
    era5_has_data = era5_collection.size().gt(0)
    era5_with_data = (
        era5_collection
        .select(['temperature_2m', 'volumetric_soil_water_layer_1'])
        .mean()
        .subtract(ee.Image([273.15, 0]))
        .rename(['Air_Temp_C', 'Soil_Moisture'])
    )
    era5_without_data = ee.Image.cat([
        ee.Image().rename('Air_Temp_C').selfMask(),
        ee.Image().rename('Soil_Moisture').selfMask(),
    ])
    era5_image = ee.Image(ee.Algorithms.If(era5_has_data, era5_with_data, era5_without_data))

    full_stack = lst_image.addBands([ndvi_image, ndwi_image, era5_image, population_image, cropland_image])

    ward_means = (
        full_stack
        .reduceRegions(collection=province_wards, reducer=ee.Reducer.mean(), scale=1000)
        .map(lambda feature: feature.set('Month', month_label))
    )

    ward_habitat_modes = habitat_image.reduceRegions(
        collection=province_wards, reducer=ee.Reducer.mode(), scale=1000,
    )

    joined = ee.Join.saveFirst('habitat_data').apply(
        ward_means, ward_habitat_modes,
        ee.Filter.equals(leftField='WardID', rightField='WardID'),
    )

    def add_extra_fields(feature):
        """
        add_extra_fields()
        ------------------
        Attach ward coordinates, habitat class and the existing WorldPop density conversion.

        Parameters:
        -----------
        feature: ee.Feature — Ward observation to enrich.

        Returns:
        --------
        ee.Feature
        """
        centroid = feature.geometry().centroid()
        habitat_code = ee.Feature(feature.get('habitat_data')).get('mode')
        population_density = ee.Number(feature.get('Population_Count')).multiply(100)

        return feature.set({
            'Habitat_Class_Code': habitat_code,
            'Population_Density_Per_KM2': population_density,
            'latitude': centroid.coordinates().get(1),
            'longitude': centroid.coordinates().get(0),
        })

    return joined.map(add_extra_fields)


def main():
    """
    main()
    ------
    Read the requested extraction period and submit a real observation CSV export to Google Drive.

    Parameters:
    -----------
    none

    Returns:
    --------
    None
    """
    start_arg = sys.argv[1] if len(sys.argv) > 1 else '2025-01'
    end_arg = sys.argv[2] if len(sys.argv) > 2 else None

    init_earth_engine()

    wards = ee.FeatureCollection(WARDS_ASSET)

    population_image = (
        ee.ImageCollection("WorldPop/GP/100m/pop")
        .filterDate('2020-01-01', '2021-01-01')
        .mean()
        .rename('Population_Count')
    )
    landcover_image = ee.ImageCollection("ESA/WorldCover/v100").first()
    cropland_image = landcover_image.eq(40).rename('Agric_Percentage')
    habitat_image = landcover_image.select('Map').rename('Habitat_Code')

    months = list(month_range(start_arg, end_arg))
    print(f"Preparing {len(months)} month(s) x {len(PROVINCES)} province(s)...")

    all_features = []
    for start_date, end_date, month_label in months:
        for province_name in PROVINCES:
            all_features.append(
                process_province_month(
                    province_name, start_date, end_date, month_label,
                    wards, population_image, cropland_image, habitat_image,
                )
            )

    merged = all_features[0]
    for fc in all_features[1:]:
        merged = merged.merge(fc)

    description = f"EOHA_Dataset_{start_arg}_to_{end_arg or 'present'}"
    task = ee.batch.Export.table.toDrive(
        collection=merged,
        description=description,
        fileFormat='CSV',
        selectors=EXPORT_COLUMNS,
    )
    task.start()

    print(f"Export task started: {description}")
    print(f"Rows: ~{len(months) * len(PROVINCES)} province-months (each with all wards in that province)")
    print("Check progress and download the CSV at: https://code.earthengine.google.com/tasks")


if __name__ == '__main__':
    main()
