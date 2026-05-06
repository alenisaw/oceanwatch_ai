from __future__ import annotations

from collections import deque
from dataclasses import dataclass

import numpy as np
import plotly.graph_objects as go


@dataclass(frozen=True)
class Region:
    region_id: int
    pixels: list[tuple[int, int]]


class RealTimeAnalytics:
    """Build interactive Plotly analytics for possible pollution regions."""

    def __init__(self, pixel_area_km2: float = 1.0) -> None:
        self.pixel_area_km2 = pixel_area_km2
        self._region_stats: dict[int, dict[str, object]] = {}

    def render_interactive(self, result: dict) -> go.Figure:
        """Render an interactive heatmap with one clickable marker per detected region."""
        prob_map = self._probability_map(result)
        mask = self._mask(result, prob_map.shape)
        severity = float(result.get("severity", result.get("severity_score", 0.0)))
        confidence = float(result.get("confidence", 0.0))
        pixel_area_km2 = float(result.get("pixel_area_km2", self.pixel_area_km2))

        regions = self._regions(mask)
        self._region_stats = self._build_region_stats(regions, prob_map, pixel_area_km2)

        figure = go.Figure()
        figure.add_trace(
            go.Heatmap(
                z=prob_map,
                zmin=0.0,
                zmax=1.0,
                colorscale=self._colorscale(),
                colorbar={"title": "Pollution Probability"},
                hovertemplate="probability=%{z:.3f}<extra></extra>",
            )
        )

        marker_x: list[float] = []
        marker_y: list[float] = []
        marker_text: list[str] = []
        customdata: list[list[object]] = []
        for region_id, stats in self._region_stats.items():
            marker_x.append(float(stats["centroid_x"]))
            marker_y.append(float(stats["centroid_y"]))
            marker_text.append(
                "<br>".join(
                    [
                        f"Region {region_id}",
                        f"Area: {stats['area_km2']:.3f} km2",
                        f"Max probability: {stats['max_probability']:.3f}",
                        f"Assessment: {stats['severity_label']}",
                    ]
                )
            )
            customdata.append(
                [
                    region_id,
                    stats["area_km2"],
                    stats["max_probability"],
                    stats["severity_label"],
                ]
            )

        if marker_x:
            figure.add_trace(
                go.Scatter(
                    x=marker_x,
                    y=marker_y,
                    mode="markers",
                    marker={
                        "size": 13,
                        "color": "#f8fafc",
                        "line": {"color": "#0f172a", "width": 1.5},
                        "symbol": "circle",
                    },
                    text=marker_text,
                    customdata=customdata,
                    name="Possible oil-like anomaly regions",
                    hovertemplate="%{text}<extra></extra>",
                )
            )

        figure.update_layout(
            title="Interactive Possible Oil-like Anomaly Map",
            xaxis_title="Pixel X",
            yaxis_title="Pixel Y",
            yaxis={"autorange": "reversed", "scaleanchor": "x"},
            clickmode="event+select",
            margin={"l": 40, "r": 20, "t": 60, "b": 40},
            annotations=[
                {
                    "text": f"severity={severity:.3f} | confidence={confidence:.3f}",
                    "xref": "paper",
                    "yref": "paper",
                    "x": 0.0,
                    "y": 1.08,
                    "showarrow": False,
                    "font": {"size": 12, "color": "#475569"},
                }
            ],
        )
        return figure

    def get_region_stats(self, region_id: int) -> dict:
        """Return stored stats for a detected region."""
        return dict(self._region_stats.get(region_id, {}))

    @staticmethod
    def _probability_map(result: dict) -> np.ndarray:
        raw = result.get("prob_map", result.get("probability_map"))
        if raw is None:
            raise ValueError("Result must include 'prob_map' or 'probability_map'.")
        prob_map = np.asarray(raw, dtype=np.float32)
        if prob_map.ndim != 2:
            msg = f"Expected a 2D probability map, got shape {prob_map.shape}"
            raise ValueError(msg)
        return np.clip(np.nan_to_num(prob_map, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0)

    @staticmethod
    def _mask(result: dict, shape: tuple[int, int]) -> np.ndarray:
        raw = result.get("mask", result.get("binary_mask"))
        if raw is None:
            raise ValueError("Result must include 'mask' or 'binary_mask'.")
        mask = np.asarray(raw).astype(bool)
        if mask.shape != shape:
            msg = f"Mask shape {mask.shape} does not match probability map shape {shape}"
            raise ValueError(msg)
        return mask

    @staticmethod
    def _regions(mask: np.ndarray) -> list[Region]:
        visited = np.zeros_like(mask, dtype=bool)
        height, width = mask.shape
        regions: list[Region] = []

        for row in range(height):
            for col in range(width):
                if visited[row, col] or not mask[row, col]:
                    continue
                pixels: list[tuple[int, int]] = []
                queue: deque[tuple[int, int]] = deque([(row, col)])
                visited[row, col] = True
                while queue:
                    current_row, current_col = queue.popleft()
                    pixels.append((current_row, current_col))
                    for next_row, next_col in (
                        (current_row - 1, current_col),
                        (current_row + 1, current_col),
                        (current_row, current_col - 1),
                        (current_row, current_col + 1),
                    ):
                        if next_row < 0 or next_col < 0:
                            continue
                        if next_row >= height or next_col >= width:
                            continue
                        if visited[next_row, next_col] or not mask[next_row, next_col]:
                            continue
                        visited[next_row, next_col] = True
                        queue.append((next_row, next_col))
                regions.append(Region(region_id=len(regions) + 1, pixels=pixels))
        return regions

    @staticmethod
    def _build_region_stats(
        regions: list[Region],
        prob_map: np.ndarray,
        pixel_area_km2: float,
    ) -> dict[int, dict[str, object]]:
        stats: dict[int, dict[str, object]] = {}
        for region in regions:
            rows = np.array([pixel[0] for pixel in region.pixels], dtype=np.int64)
            cols = np.array([pixel[1] for pixel in region.pixels], dtype=np.int64)
            probabilities = prob_map[rows, cols]
            max_probability = float(probabilities.max(initial=0.0))
            stats[region.region_id] = {
                "region_id": region.region_id,
                "area_km2": float(len(region.pixels) * pixel_area_km2),
                "max_probability": max_probability,
                "severity_label": RealTimeAnalytics._severity_label(max_probability),
                "centroid_x": float(cols.mean()),
                "centroid_y": float(rows.mean()),
                "pixel_count": len(region.pixels),
            }
        return stats

    @staticmethod
    def _severity_label(probability: float) -> str:
        if probability >= 0.8:
            return "critical possible oil-like anomaly"
        if probability >= 0.6:
            return "high possible oil-like anomaly"
        if probability >= 0.3:
            return "moderate possible oil-like anomaly"
        return "low possible oil-like anomaly"

    @staticmethod
    def _colorscale() -> list[list[object]]:
        return [
            [0.0, "#1d4ed8"],
            [0.3, "#2563eb"],
            [0.6, "#facc15"],
            [0.8, "#f97316"],
            [1.0, "#dc2626"],
        ]
