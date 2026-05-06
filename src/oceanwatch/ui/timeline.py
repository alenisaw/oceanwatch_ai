from __future__ import annotations

import numpy as np
import plotly.graph_objects as go


class TimelineMap:
    """Render probability maps as a Plotly timeline with a date slider."""

    def render(self, frames: list[dict]) -> go.Figure:
        """Render an animated heatmap timeline from timestamped inference frames."""
        if not frames:
            raise ValueError("Timeline requires at least one frame.")

        normalized_frames = [self._normalize_frame(frame) for frame in frames]
        first = normalized_frames[0]
        figure = go.Figure(
            data=[
                go.Heatmap(
                    z=first["prob_map"],
                    zmin=0.0,
                    zmax=1.0,
                    colorscale=self._colorscale(),
                    colorbar={"title": "Pollution Probability"},
                    hovertemplate="probability=%{z:.3f}<extra></extra>",
                )
            ],
            frames=[
                go.Frame(
                    name=frame["timestamp"],
                    data=[
                        go.Heatmap(
                            z=frame["prob_map"],
                            zmin=0.0,
                            zmax=1.0,
                            colorscale=self._colorscale(),
                        )
                    ],
                )
                for frame in normalized_frames
            ],
        )

        figure.update_layout(
            title="Possible Oil-like Anomaly Timeline",
            xaxis_title="Pixel X",
            yaxis_title="Pixel Y",
            yaxis={"autorange": "reversed", "scaleanchor": "x"},
            margin={"l": 40, "r": 20, "t": 60, "b": 40},
            sliders=[
                {
                    "active": 0,
                    "currentvalue": {"prefix": "Date: "},
                    "steps": [
                        {
                            "label": frame["timestamp"],
                            "method": "animate",
                            "args": [
                                [frame["timestamp"]],
                                {
                                    "mode": "immediate",
                                    "frame": {"duration": 350, "redraw": True},
                                    "transition": {"duration": 150},
                                },
                            ],
                        }
                        for frame in normalized_frames
                    ],
                }
            ],
            updatemenus=[
                {
                    "type": "buttons",
                    "showactive": False,
                    "x": 0,
                    "y": -0.1,
                    "xanchor": "left",
                    "yanchor": "top",
                    "buttons": [
                        {
                            "label": "Play",
                            "method": "animate",
                            "args": [
                                None,
                                {
                                    "frame": {"duration": 500, "redraw": True},
                                    "fromcurrent": True,
                                    "transition": {"duration": 150},
                                },
                            ],
                        }
                    ],
                }
            ],
        )
        return figure

    @staticmethod
    def _normalize_frame(frame: dict) -> dict[str, object]:
        if "timestamp" not in frame or "prob_map" not in frame:
            raise ValueError("Each frame must include 'timestamp' and 'prob_map'.")
        prob_map = np.asarray(frame["prob_map"], dtype=np.float32)
        if prob_map.ndim != 2:
            msg = f"Expected a 2D probability map, got shape {prob_map.shape}"
            raise ValueError(msg)
        return {
            "timestamp": str(frame["timestamp"]),
            "prob_map": np.clip(np.nan_to_num(prob_map, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0),
            "severity": float(frame.get("severity", 0.0)),
        }

    @staticmethod
    def _colorscale() -> list[list[object]]:
        return [
            [0.0, "#1d4ed8"],
            [0.3, "#2563eb"],
            [0.6, "#facc15"],
            [0.8, "#f97316"],
            [1.0, "#dc2626"],
        ]
