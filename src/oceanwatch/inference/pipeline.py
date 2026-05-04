from datetime import UTC, datetime

import numpy as np

from oceanwatch.data.io import make_synthetic_tile
from oceanwatch.data.preprocessing import normalize_sar_tile
from oceanwatch.inference.postprocess import postprocess_probability_map
from oceanwatch.reporting.schema import IncidentReport, MaskSummary, ModelInfo, SourceInfo
from oceanwatch.reporting.template_report import build_template_report


def demo_probability_map(tile: np.ndarray) -> np.ndarray:
    """Build a deterministic probability map from a normalized SAR-like tile."""
    normalized = normalize_sar_tile(tile)
    primary = normalized[..., 0]
    dark_response = 1.0 - primary
    probability = np.clip((dark_response - 0.48) * 2.6, 0.0, 1.0)
    return probability.astype(np.float32)


def analyze_tile(tile: np.ndarray, image_id: str = "demo_tile") -> IncidentReport:
    """Analyze one tile with the scaffold demo pipeline."""
    probability = demo_probability_map(tile)
    metrics = postprocess_probability_map(probability)

    report = build_template_report(
        risk_level=metrics.risk_level,
        confidence=metrics.confidence,
        affected_pixel_ratio=metrics.affected_pixel_ratio,
        regions_detected=metrics.regions_detected,
    )

    return IncidentReport(
        incident_id=f"ow-{image_id}",
        created_at=datetime.now(tz=UTC),
        source=SourceInfo(
            image_id=image_id,
            sensor="Sentinel-1 SAR",
            channels=["VV", "VH"],
        ),
        incident_type="possible_oil_like_anomaly",
        risk_level=metrics.risk_level,
        confidence=round(metrics.confidence, 4),
        affected_pixel_ratio=round(metrics.affected_pixel_ratio, 6),
        estimated_area_km2=None,
        mask_summary=MaskSummary(
            regions_detected=metrics.regions_detected,
            largest_region_ratio=round(metrics.largest_region_ratio, 6),
            centroid=None,
        ),
        uncertainty=[
            "SAR look-alike phenomena may include low-wind zones, biogenic films, "
            "or other natural surface effects.",
            "Human analyst verification is required before operational or enforcement action.",
        ],
        recommended_actions=[
            "Prioritize this tile for analyst review if risk is medium or high.",
            "Request the next satellite pass for temporal confirmation.",
            "Cross-check vessel activity if AIS data is available.",
        ],
        model=ModelInfo(
            segmentation_model="deterministic-demo-baseline",
            reporting_mode="template",
            runtime="cpu",
        ),
        report=report,
    )


def run_demo_analysis() -> IncidentReport:
    """Run the built-in synthetic demo case."""
    tile = make_synthetic_tile(size=128)
    return analyze_tile(tile, image_id="synthetic_001")
