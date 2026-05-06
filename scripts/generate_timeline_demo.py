from datetime import date, timedelta
from pathlib import Path

import numpy as np

from oceanwatch.ui.timeline import TimelineMap


def synthetic_probability_frame(index: int, size: int = 128) -> np.ndarray:
    """Create one deterministic probability frame for the timeline demo."""
    y, x = np.mgrid[0:size, 0:size]
    center_x = size * (0.35 + 0.08 * index)
    center_y = size * (0.42 + 0.04 * index)
    plume = np.exp(-(((x - center_x) / 18.0) ** 2 + ((y - center_y) / 10.0) ** 2))
    texture = 0.08 + 0.04 * np.sin((x + index * 7) / 13.0)
    return np.clip(texture + plume * (0.45 + index * 0.1), 0.0, 1.0).astype(np.float32)


def main() -> None:
    """Generate a five-frame interactive timeline demo."""
    start = date(2024, 1, 1)
    frames = [
        {
            "timestamp": (start + timedelta(days=index * 7)).isoformat(),
            "prob_map": synthetic_probability_frame(index),
            "severity": min(1.0, 0.2 + index * 0.15),
        }
        for index in range(5)
    ]
    figure = TimelineMap().render(frames)
    output = Path("outputs/timeline_demo.html")
    output.parent.mkdir(parents=True, exist_ok=True)
    figure.write_html(output)
    print(f"written: {output}")


if __name__ == "__main__":
    main()
