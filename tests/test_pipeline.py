from oceanwatch.inference.pipeline import run_demo_analysis, run_demo_analysis_with_artifacts


def test_run_demo_analysis_returns_incident_report() -> None:
    result = run_demo_analysis()

    assert result.incident_id == "ow-synthetic_001"
    assert 0.0 <= result.confidence <= 1.0
    assert 0.0 <= result.affected_pixel_ratio <= 1.0
    assert result.report


def test_run_demo_analysis_with_artifacts_returns_visuals() -> None:
    artifacts = run_demo_analysis_with_artifacts()

    assert artifacts.binary_mask.shape == artifacts.probability_map.shape
    assert artifacts.preview_rgb.shape[-1] == 3
    assert artifacts.overlay_rgb.shape == artifacts.preview_rgb.shape
