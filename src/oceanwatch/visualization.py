from pathlib import Path

import numpy as np
from PIL import Image

from oceanwatch.data.preprocessing import make_rgb_preview


def render_mask_overlay(
    tile: np.ndarray,
    mask: np.ndarray,
    alpha: float = 0.45,
    color: tuple[int, int, int] = (255, 60, 40),
) -> np.ndarray:
    """Render an RGB preview with a colored mask overlay."""
    preview = make_rgb_preview(tile).astype(np.float32)
    binary_mask = mask.astype(bool)
    if binary_mask.shape != preview.shape[:2]:
        msg = f"Mask shape {binary_mask.shape} does not match tile shape {preview.shape[:2]}"
        raise ValueError(msg)

    overlay = preview.copy()
    overlay_color = np.array(color, dtype=np.float32)
    overlay[binary_mask] = (1.0 - alpha) * overlay[binary_mask] + alpha * overlay_color
    return np.clip(overlay, 0, 255).astype(np.uint8)


def save_png(path: Path, image: np.ndarray) -> None:
    """Save an RGB or grayscale image as PNG."""
    path.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(image).save(path)
