# Datasets

## Primary dataset

Use a Sentinel-1 SAR oil spill segmentation dataset for the MVP.

Expected local layout:

```text
data/raw/sentinel1_oilspill/
├─ images/
├─ masks/
└─ metadata.csv
```

Processed layout:

```text
data/processed/
├─ train/
├─ val/
├─ test/
└─ metadata.json
```

## Input assumptions

The first implementation should support NumPy arrays for CI-safe testing and prepared demos.

Real dataset support should add TIFF/GeoTIFF loading later through optional dependencies such as `tifffile` or `rasterio`.

## Demo cases

Prepare a small curated set:

```text
high-risk anomaly
medium-risk anomaly
low-risk anomaly
look-alike / uncertain case
no-oil case
failure / limitation case
```

Do not commit large raw satellite files to Git. Use external dataset links, release assets, or object storage.
