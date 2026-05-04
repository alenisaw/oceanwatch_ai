from pathlib import Path

import numpy as np

ArrayLike = np.ndarray


def load_numpy_tile(path: Path) -> ArrayLike:
    """Load a SAR-like tile from a .npy file."""
    if path.suffix.lower() != ".npy":
        msg = f"Only .npy input is supported in the base scaffold: {path}"
        raise ValueError(msg)

    tile = np.load(path)
    validate_tile(tile)
    return tile.astype(np.float32, copy=False)


def load_sar_tile(path: Path) -> ArrayLike:
    """Load a SAR-like tile from NumPy or TIFF input."""
    suffix = path.suffix.lower()
    if suffix == ".npy":
        return load_numpy_tile(path)
    if suffix == ".npz":
        return load_numpy_archive(path)
    if suffix in {".tif", ".tiff"}:
        return load_tiff_tile(path)

    msg = f"Unsupported tile format: {path.suffix}. Use .npy, .npz, .tif, or .tiff."
    raise ValueError(msg)


def load_numpy_archive(path: Path) -> ArrayLike:
    """Load the first array from a .npz archive."""
    archive = np.load(path)
    if not archive.files:
        raise ValueError("NumPy archive is empty.")
    tile = archive[archive.files[0]]
    validate_tile(tile)
    return tile.astype(np.float32, copy=False)


def load_tiff_tile(path: Path) -> ArrayLike:
    """Load a TIFF/GeoTIFF tile through the optional tifffile dependency."""
    try:
        import tifffile
    except ImportError as error:
        msg = "Install TIFF support with: pip install -e '.[vision]'"
        raise RuntimeError(msg) from error

    tile = tifffile.imread(path)
    tile = coerce_tiff_channels(tile)
    validate_tile(tile)
    return tile.astype(np.float32, copy=False)


def load_ground_truth_mask(path: Path) -> ArrayLike:
    """Load a binary-ish mask from NumPy or TIFF input."""
    suffix = path.suffix.lower()
    if suffix == ".npy":
        mask = np.load(path)
    elif suffix == ".npz":
        archive = np.load(path)
        if not archive.files:
            raise ValueError("NumPy archive is empty.")
        mask = archive[archive.files[0]]
    elif suffix in {".tif", ".tiff"}:
        mask = load_tiff_tile(path)
    else:
        msg = f"Unsupported mask format: {path.suffix}. Use .npy, .npz, .tif, or .tiff."
        raise ValueError(msg)

    if mask.ndim == 3:
        mask = mask[..., 0]
    if mask.ndim != 2:
        msg = f"Expected a 2D mask, got shape {mask.shape}"
        raise ValueError(msg)
    return (mask > 0).astype(np.uint8)


def coerce_tiff_channels(tile: ArrayLike) -> ArrayLike:
    """Coerce common TIFF channel layouts into channel-last arrays."""
    if tile.ndim != 3:
        return tile
    if tile.shape[-1] in {1, 2, 3}:
        return tile
    if tile.shape[0] in {1, 2, 3}:
        return np.moveaxis(tile, 0, -1)
    return tile


def validate_sar_shape(tile: ArrayLike) -> None:
    """Validate the SAR tile shape used by the MVP."""
    validate_tile(tile)


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


def make_synthetic_tile(size: int = 128, slick_scale: float = 1.0) -> ArrayLike:
    """Create a deterministic SAR-like tile for tests and demos."""
    if size < 32:
        raise ValueError("Synthetic tile size must be at least 32 pixels.")
    if slick_scale < 0:
        raise ValueError("Synthetic slick scale must be non-negative.")

    y, x = np.mgrid[0:size, 0:size]
    sea_texture = 0.18 + 0.03 * np.sin(x / 9.0) + 0.02 * np.cos(y / 11.0)
    slick = np.exp(-(((x - size * 0.62) / 18.0) ** 2 + ((y - size * 0.45) / 8.0) ** 2))

    vv = sea_texture - 0.16 * slick_scale * slick
    vh = sea_texture - 0.10 * slick_scale * slick
    tile = np.stack([vv, vh], axis=-1)
    return tile.astype(np.float32)
