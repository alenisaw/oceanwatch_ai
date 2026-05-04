from pathlib import Path

import numpy as np

ArrayLike = np.ndarray


def load_numpy_tile(path: Path) -> ArrayLike:
    """Load a SAR-like tile from a .npy file."""
    if path.suffix != ".npy":
        msg = f"Only .npy input is supported in the base scaffold: {path}"
        raise ValueError(msg)

    tile = np.load(path)
    validate_tile(tile)
    return tile.astype(np.float32, copy=False)


def validate_tile(tile: ArrayLike) -> None:
    """Validate a 2D or 3D image tile."""
    if tile.ndim not in {2, 3}:
        msg = f"Expected a 2D or 3D tile, got shape {tile.shape}"
        raise ValueError(msg)

    if tile.ndim == 3 and tile.shape[-1] not in {1, 2, 3}:
        msg = f"Expected 1, 2, or 3 channels, got shape {tile.shape}"
        raise ValueError(msg)

    if tile.size == 0:
        raise ValueError("Tile is empty.")


def make_synthetic_tile(size: int = 128) -> ArrayLike:
    """Create a deterministic SAR-like tile for tests and demos."""
    if size < 32:
        raise ValueError("Synthetic tile size must be at least 32 pixels.")

    y, x = np.mgrid[0:size, 0:size]
    sea_texture = 0.18 + 0.03 * np.sin(x / 9.0) + 0.02 * np.cos(y / 11.0)
    slick = np.exp(-(((x - size * 0.62) / 18.0) ** 2 + ((y - size * 0.45) / 8.0) ** 2))

    vv = sea_texture - 0.16 * slick
    vh = sea_texture - 0.10 * slick
    tile = np.stack([vv, vh], axis=-1)
    return tile.astype(np.float32)
