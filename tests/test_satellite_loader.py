from pathlib import Path

import numpy as np
import pytest

from oceanwatch.data.satellite_loader import (
    SatelliteLoader,
    SatelliteSource,
    UnsupportedFormatError,
)


@pytest.mark.parametrize("source", list(SatelliteSource))
def test_satellite_loader_normalizes_all_sources(source: SatelliteSource, tmp_path: Path) -> None:
    path = tmp_path / f"{source.value}.npy"
    data = np.arange(4 * 6 * 3, dtype=np.uint16).reshape(4, 6, 3)
    np.save(path, data)

    loader = SatelliteLoader()
    result = loader.load(source, str(path))
    metadata = loader.get_metadata(str(path))

    assert result.dtype == np.float32
    assert result.shape == data.shape
    assert float(result.min()) == 0.0
    assert float(result.max()) == 1.0
    assert metadata["source"] == source.value
    assert metadata["shape"] == data.shape
    assert metadata["dtype"] == str(data.dtype)
    assert metadata["bands"] == 3


def test_satellite_loader_supports_band_first_npy(tmp_path: Path) -> None:
    path = tmp_path / "band_first.npy"
    data = np.arange(3 * 4 * 6, dtype=np.uint16).reshape(3, 4, 6)
    np.save(path, data)

    result = SatelliteLoader().load(SatelliteSource.SENTINEL2, str(path))

    assert result.shape == (4, 6, 3)
    assert result.dtype == np.float32
    assert 0.0 <= float(result.min()) <= float(result.max()) <= 1.0


def test_satellite_loader_rejects_unknown_format(tmp_path: Path) -> None:
    path = tmp_path / "tile.txt"
    path.write_text("not an image", encoding="utf-8")

    with pytest.raises(UnsupportedFormatError):
        SatelliteLoader().load(SatelliteSource.NOAA, str(path))
