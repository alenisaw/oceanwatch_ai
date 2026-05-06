from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

import numpy as np

if TYPE_CHECKING:
    from matplotlib.figure import Figure


class PollutionHeatmap:
    """Render uncertainty-aware pollution probability heatmaps."""

    def render(self, prob_map: np.ndarray, mask: np.ndarray, output_path: str) -> Figure:
        """Render a probability heatmap with a pollution-mask contour and save it as PNG."""
        import matplotlib.pyplot as plt
        from matplotlib.colors import LinearSegmentedColormap

        probabilities = self._validate_probability_map(prob_map)
        binary_mask = self._validate_mask(mask, probabilities.shape)
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)

        cmap = LinearSegmentedColormap.from_list(
            "oceanwatch_pollution",
            [
                (0.0, "#1d4ed8"),
                (0.3, "#2563eb"),
                (0.6, "#facc15"),
                (0.8, "#f97316"),
                (1.0, "#dc2626"),
            ],
        )

        fig, ax = plt.subplots(figsize=(8, 6), constrained_layout=True)
        image = ax.imshow(probabilities, cmap=cmap, vmin=0.0, vmax=1.0, origin="upper")
        if binary_mask.any():
            ax.contour(
                binary_mask.astype(float), levels=[0.5], colors="white", alpha=0.7, linewidths=1.2
            )
        colorbar = fig.colorbar(image, ax=ax)
        colorbar.set_label("Pollution Probability")
        ax.set_title("Possible Oil-like Anomaly Probability")
        ax.set_xlabel("Pixel X")
        ax.set_ylabel("Pixel Y")
        fig.savefig(destination, format="png", dpi=150)
        return fig

    @staticmethod
    def _validate_probability_map(prob_map: np.ndarray) -> np.ndarray:
        probabilities = np.asarray(prob_map, dtype=np.float32)
        if probabilities.ndim != 2:
            msg = f"Expected a 2D probability map, got shape {probabilities.shape}"
            raise ValueError(msg)
        return np.clip(np.nan_to_num(probabilities, nan=0.0, posinf=1.0, neginf=0.0), 0.0, 1.0)

    @staticmethod
    def _validate_mask(mask: np.ndarray, expected_shape: tuple[int, int]) -> np.ndarray:
        binary_mask = np.asarray(mask)
        if binary_mask.shape != expected_shape:
            msg = (
                f"Mask shape {binary_mask.shape} does not match probability map "
                f"shape {expected_shape}"
            )
            raise ValueError(msg)
        return binary_mask.astype(bool)
