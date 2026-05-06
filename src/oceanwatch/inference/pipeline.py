from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np

from oceanwatch.data.io import make_synthetic_tile
from oceanwatch.data.preprocessing import ensure_channel_last, make_rgb_preview
from oceanwatch.inference.postprocess import postprocess_probability_map
from oceanwatch.reporting.schema import IncidentReport, MaskSummary, ModelInfo, SourceInfo
from oceanwatch.reporting.template_report import build_template_report
from oceanwatch.visualization import render_mask_overlay


@dataclass(frozen=True)
class AnalysisArtifacts:
    report: IncidentReport
    probability_map: np.ndarray
    binary_mask: np.ndarray
    preview_rgb: np.ndarray
    overlay_rgb: np.ndarray


def demo_probability_map(tile: np.ndarray) -> np.ndarray:
    """Build a deterministic probability map from a SAR-like tile."""
    channel_last = ensure_channel_last(np.nan_to_num(tile.astype(np.float32)))
    primary = channel_last[..., 0]
    secondary = channel_last[..., 1] if channel_last.shape[-1] > 1 else primary

    primary_baseline = np.percentile(primary, 85.0)
    secondary_baseline = np.percentile(secondary, 85.0)
    primary_spread = max(float(np.percentile(primary, 95.0) - np.percentile(primary, 5.0)), 1e-6)
    secondary_spread = max(
        float(np.percentile(secondary, 95.0) - np.percentile(secondary, 5.0)),
        1e-6,
    )

    primary_contrast = (primary_baseline - primary) / primary_spread
    secondary_contrast = (secondary_baseline - secondary) / secondary_spread
    dark_response = np.minimum(primary_contrast, secondary_contrast)
    probability = np.clip((dark_response - 0.70) * 2.0, 0.0, 1.0)
    return probability.astype(np.float32)


def analyze_tile(tile: np.ndarray, image_id: str = "demo_tile") -> IncidentReport:
    """Analyze one tile with the scaffold demo pipeline."""
    return analyze_tile_with_artifacts(tile, image_id=image_id).report


def analyze_tile_with_artifacts(
    tile: np.ndarray,
    image_id: str = "demo_tile",
    sensor: str = "Sentinel-1 SAR",
    channels: list[str] | None = None,
) -> AnalysisArtifacts:
    """Analyze one tile and return the report plus visual artifacts."""
    probability = demo_probability_map(tile)
    metrics = postprocess_probability_map(probability)

    report = build_template_report(
        risk_level=metrics.risk_level,
        confidence=metrics.confidence,
        affected_pixel_ratio=metrics.affected_pixel_ratio,
        regions_detected=metrics.regions_detected,
    )

    incident_report = IncidentReport(
        incident_id=f"ow-{image_id}",
        created_at=datetime.now(tz=timezone.utc),
        source=SourceInfo(
            image_id=image_id,
            sensor=sensor,
            channels=channels or ["VV", "VH"],
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

    return AnalysisArtifacts(
        report=incident_report,
        probability_map=probability,
        binary_mask=metrics.binary_mask,
        preview_rgb=make_rgb_preview(tile),
        overlay_rgb=render_mask_overlay(tile, metrics.binary_mask),
    )


def run_demo_analysis() -> IncidentReport:
    """Run the built-in synthetic demo case."""
    return run_demo_analysis_with_artifacts().report


def run_demo_analysis_with_artifacts() -> AnalysisArtifacts:
    """Run the built-in synthetic demo case with visual artifacts."""
    tile = make_synthetic_tile(size=128)
    return analyze_tile_with_artifacts(tile, image_id="synthetic_001")
