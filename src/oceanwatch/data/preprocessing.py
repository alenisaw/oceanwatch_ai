import numpy as np


def ensure_channel_last(tile: np.ndarray) -> np.ndarray:
    """Return a channel-last image array."""
    if tile.ndim == 2:
        return tile[..., None]
    if tile.ndim == 3:
        return tile
    msg = f"Expected a 2D or 3D array, got shape {tile.shape}"
    raise ValueError(msg)


def normalize_channel(channel: np.ndarray) -> np.ndarray:
    """Normalize one image channel to the [0, 1] range."""
    clean = np.nan_to_num(channel.astype(np.float32), nan=0.0, posinf=0.0, neginf=0.0)
    lower = float(np.percentile(clean, 1.0))
    upper = float(np.percentile(clean, 99.0))

    if upper <= lower:
        return np.zeros_like(clean, dtype=np.float32)

    clipped = np.clip(clean, lower, upper)
    normalized = (clipped - lower) / (upper - lower)
    return normalized.astype(np.float32)


def normalize_sar_tile(tile: np.ndarray) -> np.ndarray:
    """Normalize each channel of a SAR-like tile."""
    channel_last = ensure_channel_last(tile)
    channels = [
        normalize_channel(channel_last[..., index]) for index in range(channel_last.shape[-1])
    ]
    return np.stack(channels, axis=-1).astype(np.float32)


def to_model_input(tile: np.ndarray) -> np.ndarray:
    """Convert channel-last image to channel-first model input."""
    normalized = normalize_sar_tile(tile)
    return np.moveaxis(normalized, -1, 0).astype(np.float32)
