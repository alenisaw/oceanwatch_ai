from __future__ import annotations

from enum import Enum
from pathlib import Path

import numpy as np


class SatelliteSource(Enum):
    SENTINEL2 = "sentinel2"
    LANDSAT = "landsat89"
    MODIS = "modis"
    COPERNICUS = "copernicus"
    NOAA = "noaa"


class UnsupportedFormatError(ValueError):
    """Raised when a satellite input format is not supported."""


class SatelliteLoader:
    """Load and normalize multi-source satellite image arrays."""

    def __init__(self) -> None:
        self._sources_by_path: dict[Path, SatelliteSource] = {}

    def load(self, source: SatelliteSource, path: str) -> np.ndarray:
        """Load a satellite array from disk and normalize bands to float32 [0, 1]."""
        source = SatelliteSource(source)
        input_path = Path(path)
        data = self._read_array(input_path)
        normalized = self.normalize(data, source)
        self._sources_by_path[input_path.resolve()] = source
        return normalized

    def normalize(self, data: np.ndarray, source: SatelliteSource) -> np.ndarray:
        """Normalize per-source satellite bands to float32 values in [0, 1]."""
        source = SatelliteSource(source)
        array = np.asarray(data)
        if array.size == 0:
            raise ValueError("Satellite array is empty.")
        if source in {
            SatelliteSource.SENTINEL2,
            SatelliteSource.LANDSAT,
            SatelliteSource.MODIS,
            SatelliteSource.COPERNICUS,
            SatelliteSource.NOAA,
        }:
            return self._normalize_bands(array)
        raise ValueError(f"Unsupported satellite source: {source}")

    def get_metadata(self, path: str) -> dict:
        """Return metadata for a satellite image path."""
        input_path = Path(path)
        data = self._read_array(input_path)
        source = self._sources_by_path.get(input_path.resolve())
        numeric = np.asarray(data)
        return {
            "source": source.value if source else "unknown",
            "shape": tuple(int(value) for value in numeric.shape),
            "dtype": str(numeric.dtype),
            "min": float(np.nanmin(numeric)) if numeric.size else 0.0,
            "max": float(np.nanmax(numeric)) if numeric.size else 0.0,
            "bands": self._band_count(numeric),
        }

    @staticmethod
    def _read_array(path: Path) -> np.ndarray:
        suffix = path.suffix.lower()
        if suffix == ".npy":
            return np.load(path)
        if suffix in {".tif", ".tiff"}:
            try:
                import tifffile
            except ImportError as error:
                msg = "Install TIFF support with: pip install -e '.[vision]'"
                raise RuntimeError(msg) from error
            return tifffile.imread(path)
        raise UnsupportedFormatError(
            f"Unsupported satellite format: {path.suffix}. Use .npy, .tif, or .tiff."
        )

    @classmethod
    def _normalize_bands(cls, data: np.ndarray) -> np.ndarray:
        array = cls._coerce_channel_last(data).astype(np.float32, copy=False)
        clean = np.nan_to_num(array, nan=0.0, posinf=0.0, neginf=0.0)
        if clean.ndim == 2:
            return cls._normalize_channel(clean)
        channels = [
            cls._normalize_channel(clean[..., channel_index])
            for channel_index in range(clean.shape[-1])
        ]
        return np.stack(channels, axis=-1).astype(np.float32)

    @staticmethod
    def _normalize_channel(channel: np.ndarray) -> np.ndarray:
        if np.issubdtype(channel.dtype, np.floating):
            channel = np.nan_to_num(channel.astype(np.float32), nan=0.0, posinf=1.0, neginf=0.0)
            if float(channel.min(initial=0.0)) >= 0.0 and float(channel.max(initial=0.0)) <= 1.0:
                return np.clip(channel, 0.0, 1.0).astype(np.float32)

        channel = np.nan_to_num(channel.astype(np.float32), nan=0.0, posinf=0.0, neginf=0.0)
        lower = float(np.min(channel))
        upper = float(np.max(channel))
        if upper <= lower:
            return np.zeros_like(channel, dtype=np.float32)
        return ((channel - lower) / (upper - lower)).astype(np.float32)

    @staticmethod
    def _coerce_channel_last(data: np.ndarray) -> np.ndarray:
        if data.ndim != 3:
            return data
        if data.shape[0] <= 16 and data.shape[0] < data.shape[-1]:
            return np.moveaxis(data, 0, -1)
        if data.shape[-1] <= 16:
            return data
        if data.shape[0] <= 16:
            return np.moveaxis(data, 0, -1)
        return data

    @classmethod
    def _band_count(cls, data: np.ndarray) -> int:
        array = cls._coerce_channel_last(data)
        if array.ndim == 2:
            return 1
        if array.ndim == 3:
            return int(array.shape[-1])
        return 0
