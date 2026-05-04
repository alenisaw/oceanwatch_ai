from oceanwatch.inference.pipeline import run_demo_analysis


def test_run_demo_analysis_returns_incident_report() -> None:
    result = run_demo_analysis()

    assert result.incident_id == "ow-synthetic_001"
    assert 0.0 <= result.confidence <= 1.0
    assert 0.0 <= result.affected_pixel_ratio <= 1.0
    assert result.report
