from datetime import datetime, timezone

from oceanwatch.reporting.schema import IncidentReport, MaskSummary, ModelInfo, SourceInfo


def test_incident_report_schema() -> None:
    report = IncidentReport(
        incident_id="ow-test",
        created_at=datetime.now(tz=timezone.utc),
        source=SourceInfo(image_id="sample", sensor="Sentinel-1 SAR", channels=["VV", "VH"]),
        incident_type="possible_oil_like_anomaly",
        risk_level="medium",
        confidence=0.75,
        affected_pixel_ratio=0.04,
        estimated_area_km2=None,
        mask_summary=MaskSummary(regions_detected=1, largest_region_ratio=0.03),
        uncertainty=["Analyst verification is recommended."],
        recommended_actions=["Review tile."],
        model=ModelInfo(
            segmentation_model="demo",
            reporting_mode="template",
            runtime="cpu",
        ),
        report="Potential anomaly detected.",
    )

    payload = report.model_dump(mode="json")

    assert payload["incident_id"] == "ow-test"
    assert payload["source"]["channels"] == ["VV", "VH"]
