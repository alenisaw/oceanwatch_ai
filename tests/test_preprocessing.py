import numpy as np

from oceanwatch.data.preprocessing import normalize_sar_tile, to_model_input


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
