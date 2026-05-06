from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any

import numpy as np

from oceanwatch.data.satellite_loader import SatelliteLoader, SatelliteSource
from oceanwatch.inference.pipeline import analyze_tile_with_artifacts
from oceanwatch.ui.analytics import RealTimeAnalytics
from oceanwatch.ui.heatmap import PollutionHeatmap
from oceanwatch.ui.timeline import TimelineMap

SOURCE_LABELS = {
    "Sentinel-2": SatelliteSource.SENTINEL2,
    "Landsat 8/9": SatelliteSource.LANDSAT,
    "MODIS": SatelliteSource.MODIS,
    "Copernicus": SatelliteSource.COPERNICUS,
    "NOAA": SatelliteSource.NOAA,
}


def build_dashboard() -> Any:
    """Build the optional Gradio dashboard."""
    try:
        import gradio as gr
    except ImportError as error:
        msg = "Install UI dependencies with: pip install -e '.[ui]'"
        raise RuntimeError(msg) from error

    analytics = RealTimeAnalytics()

    def run_analysis(uploaded_file: Any, source_label: str) -> tuple[str, dict, Any, dict]:
        if uploaded_file is None:
            raise gr.Error("Upload a .npy, .tif, or .tiff satellite tile.")

        source = SOURCE_LABELS[source_label]
        input_path = _uploaded_path(uploaded_file)
        loader = SatelliteLoader()
        tile = loader.load(source, str(input_path))
        artifacts = analyze_tile_with_artifacts(
            tile,
            image_id=input_path.stem,
            sensor=source.value,
            channels=[f"band_{index + 1}" for index in range(_band_count(tile))],
        )
        heatmap_path = Path("outputs/dashboard") / f"{input_path.stem}_heatmap.png"
        PollutionHeatmap().render(
            artifacts.probability_map, artifacts.binary_mask, str(heatmap_path)
        )

        result = {
            "probability_map": artifacts.probability_map,
            "mask": artifacts.binary_mask,
            "severity": artifacts.report.affected_pixel_ratio,
            "confidence": artifacts.report.confidence,
            "severity_label": artifacts.report.risk_level,
        }
        figure = analytics.render_interactive(result)
        region_state = {
            region_id: analytics.get_region_stats(region_id)
            for region_id in analytics._region_stats
        }
        metrics = {
            "assessment": "possible oil-like anomaly",
            "severity": artifacts.report.risk_level,
            "confidence": artifacts.report.confidence,
            "affected_ratio": artifacts.report.affected_pixel_ratio,
            "regions_detected": artifacts.report.mask_summary.regions_detected,
        }
        return str(heatmap_path), metrics, figure, region_state

    def select_region(region_state: dict, region_id_value: float | int | None) -> dict:
        if region_id_value is None:
            return {"message": "Choose a region ID to inspect possible anomaly stats."}
        region_id = int(region_id_value)
        return dict(region_state.get(region_id, {"message": "No region stats for this marker."}))

    def generate_timeline(
        uploaded_files: list[Any] | None,
        source_label: str,
        date_range: str,
    ) -> Any:
        if not uploaded_files:
            raise gr.Error("Upload one or more .npy, .tif, or .tiff satellite tiles.")
        source = SOURCE_LABELS[source_label]
        timestamps = _timestamps(date_range, len(uploaded_files))
        loader = SatelliteLoader()
        frames: list[dict] = []
        for uploaded_file, timestamp in zip(uploaded_files, timestamps, strict=True):
            input_path = _uploaded_path(uploaded_file)
            tile = loader.load(source, str(input_path))
            artifacts = analyze_tile_with_artifacts(
                tile,
                image_id=input_path.stem,
                sensor=source.value,
                channels=[f"band_{index + 1}" for index in range(_band_count(tile))],
            )
            frames.append(
                {
                    "timestamp": timestamp,
                    "prob_map": artifacts.probability_map,
                    "severity": artifacts.report.affected_pixel_ratio,
                }
            )
        return TimelineMap().render(frames)

    with gr.Blocks(title="OceanWatch AI") as app:
        gr.Markdown("# OceanWatch AI")
        gr.Markdown("Multisource satellite triage for possible oil-like anomalies.")
        region_state = gr.State({})

        with gr.Tab("Upload & Analyze"):
            with gr.Row():
                upload = gr.File(label="Satellite tile", file_types=[".npy", ".tif", ".tiff"])
                source = gr.Dropdown(
                    choices=list(SOURCE_LABELS),
                    value="Sentinel-2",
                    label="Satellite source",
                )
            run_button = gr.Button("Run Analysis", variant="primary")
            with gr.Row():
                heatmap = gr.Image(label="Pollution probability heatmap", type="filepath")
                metrics = gr.JSON(label="Analytics metrics")

        with gr.Tab("Interactive Map"):
            interactive_map = gr.Plot(label="Clickable possible anomaly regions")
            with gr.Row():
                region_id_input = gr.Number(label="Region ID", value=1, precision=0)
                region_button = gr.Button("Show Region Details")
            region_details = gr.JSON(label="Region details")

        with gr.Tab("Timeline"):
            with gr.Row():
                timeline_upload = gr.File(
                    label="Satellite tiles",
                    file_count="multiple",
                    file_types=[".npy", ".tif", ".tiff"],
                )
                timeline_source = gr.Dropdown(
                    choices=list(SOURCE_LABELS),
                    value="Sentinel-2",
                    label="Satellite source",
                )
            date_range = gr.Textbox(
                label="Date range",
                value="2024-01-01 to 2024-01-29",
                placeholder="YYYY-MM-DD to YYYY-MM-DD",
            )
            timeline_button = gr.Button("Generate Timeline", variant="primary")
            timeline_plot = gr.Plot(label="Temporal probability slider")

        run_button.click(
            fn=run_analysis,
            inputs=[upload, source],
            outputs=[heatmap, metrics, interactive_map, region_state],
        )
        region_button.click(
            fn=select_region,
            inputs=[region_state, region_id_input],
            outputs=[region_details],
        )
        timeline_button.click(
            fn=generate_timeline,
            inputs=[timeline_upload, timeline_source, date_range],
            outputs=[timeline_plot],
        )

    return app


def _uploaded_path(uploaded_file: Any) -> Path:
    path = Path(getattr(uploaded_file, "name", uploaded_file))
    if path.exists():
        return path
    suffix = path.suffix or ".npy"
    with NamedTemporaryFile(suffix=suffix, delete=False) as temp_file:
        temp_file.write(uploaded_file)
        return Path(temp_file.name)


def _band_count(tile: np.ndarray) -> int:
    if tile.ndim == 2:
        return 1
    if tile.ndim == 3:
        return int(tile.shape[-1])
    return 0


def _timestamps(date_range: str, count: int) -> list[str]:
    parts = [part.strip() for part in date_range.replace(",", " to ").split(" to ") if part.strip()]
    start = date.fromisoformat(parts[0]) if parts else date(2024, 1, 1)
    if len(parts) > 1 and count > 1:
        end = date.fromisoformat(parts[1])
        step_days = max((end - start).days // (count - 1), 1)
    else:
        step_days = 7
    return [(start + timedelta(days=index * step_days)).isoformat() for index in range(count)]


if __name__ == "__main__":
    app = build_dashboard()
    app.launch(server_name="0.0.0.0", server_port=7860)
