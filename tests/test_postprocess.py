import numpy as np

from oceanwatch.inference.postprocess import postprocess_probability_map, risk_from_ratio


def test_risk_from_ratio() -> None:
    assert risk_from_ratio(0.0) == "none"
    assert risk_from_ratio(0.01) == "low"
    assert risk_from_ratio(0.05) == "medium"
    assert risk_from_ratio(0.10) == "high"


def test_postprocess_probability_map_detects_region() -> None:
    probabilities = np.zeros((16, 16), dtype=np.float32)
    probabilities[4:10, 5:11] = 0.9

    result = postprocess_probability_map(probabilities, threshold=0.5, min_component_pixels=4)

    assert result.binary_mask.sum() == 36
    assert result.regions_detected == 1
    assert result.confidence > 0.85
    assert result.risk_level == "high"


def test_postprocess_probability_map_removes_small_region() -> None:
    probabilities = np.zeros((16, 16), dtype=np.float32)
    probabilities[1, 1] = 0.9

    result = postprocess_probability_map(probabilities, threshold=0.5, min_component_pixels=4)

    assert result.binary_mask.sum() == 0
    assert result.regions_detected == 0
    assert result.risk_level == "none"
