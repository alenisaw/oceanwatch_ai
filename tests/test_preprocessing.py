import numpy as np

from oceanwatch.data.io import load_ground_truth_mask, load_sar_tile, make_synthetic_tile
from oceanwatch.data.preprocessing import make_rgb_preview, normalize_sar_tile, to_model_input
from oceanwatch.visualization import render_mask_overlay


def test_normalize_sar_tile_returns_channel_last_float_array() -> None:
    tile = np.array([[[1.0, 2.0], [2.0, 4.0]], [[3.0, 6.0], [4.0, 8.0]]])

    result = normalize_sar_tile(tile)

    assert result.shape == (2, 2, 2)
    assert result.dtype == np.float32
    assert float(result.min()) >= 0.0
    assert float(result.max()) <= 1.0


def test_to_model_input_returns_channel_first_array() -> None:
    tile = np.zeros((16, 20, 2), dtype=np.float32)

    result = to_model_input(tile)

    assert result.shape == (2, 16, 20)


def test_make_rgb_preview_returns_uint8_rgb() -> None:
    tile = make_synthetic_tile(size=64)

    result = make_rgb_preview(tile)

    assert result.shape == (64, 64, 3)
    assert result.dtype == np.uint8


def test_render_mask_overlay_preserves_rgb_shape() -> None:
    tile = make_synthetic_tile(size=64)
    mask = np.zeros((64, 64), dtype=np.uint8)
    mask[20:30, 20:30] = 1

    result = render_mask_overlay(tile, mask)

    assert result.shape == (64, 64, 3)
    assert result.dtype == np.uint8


def test_load_sar_tile_supports_npy(tmp_path) -> None:
    path = tmp_path / "tile.npy"
    np.save(path, make_synthetic_tile(size=64))

    result = load_sar_tile(path)

    assert result.shape == (64, 64, 2)
    assert result.dtype == np.float32


def test_load_ground_truth_mask_supports_npy(tmp_path) -> None:
    path = tmp_path / "mask.npy"
    np.save(path, np.array([[0, 1], [2, 0]], dtype=np.uint8))

    result = load_ground_truth_mask(path)

    assert result.tolist() == [[0, 1], [1, 0]]
