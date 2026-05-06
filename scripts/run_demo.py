from pathlib import Path

import numpy as np
import typer

from oceanwatch.data.satellite_loader import SatelliteLoader, SatelliteSource
from oceanwatch.inference.pipeline import (
    analyze_tile_with_artifacts,
    run_demo_analysis_with_artifacts,
)
from oceanwatch.ui.heatmap import PollutionHeatmap
from oceanwatch.utils.export import write_json
from oceanwatch.visualization import save_png


def main(
    output: Path = typer.Option(Path("outputs/demo"), help="Output directory."),
    image: Path | None = typer.Option(
        None,
        help="Optional .npy, .tif, or .tiff satellite tile. Defaults to the synthetic demo.",
    ),
    source: SatelliteSource = typer.Option(
        SatelliteSource.SENTINEL2,
        help="Satellite source adapter to use for optional input.",
    ),
) -> None:
    if image is None:
        artifacts = run_demo_analysis_with_artifacts()
    else:
        tile = SatelliteLoader().load(source, str(image))
        artifacts = analyze_tile_with_artifacts(
            tile,
            image_id=image.stem,
            sensor=source.value,
            channels=[f"band_{index + 1}" for index in range(_band_count(tile))],
        )

    write_json(output / "result.json", artifacts.report.model_dump(mode="json"))
    npy_output = output / "arrays"
    npy_output.mkdir(parents=True, exist_ok=True)

    np.save(npy_output / "probability_map.npy", artifacts.probability_map)
    np.save(npy_output / "binary_mask.npy", artifacts.binary_mask)
    save_png(output / "preview.png", artifacts.preview_rgb)
    save_png(output / "overlay.png", artifacts.overlay_rgb)
    PollutionHeatmap().render(
        artifacts.probability_map,
        artifacts.binary_mask,
        str(output / "heatmap.png"),
    )
    typer.echo(f"written: {output / 'result.json'}")


def _band_count(tile: np.ndarray) -> int:
    if tile.ndim == 2:
        return 1
    if tile.ndim == 3:
        return int(tile.shape[-1])
    return 0


if __name__ == "__main__":
    typer.run(main)
