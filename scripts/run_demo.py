from pathlib import Path

import typer

from oceanwatch.inference.pipeline import run_demo_analysis_with_artifacts
from oceanwatch.utils.export import write_json
from oceanwatch.visualization import save_png


def main(output: Path = typer.Option(Path("outputs/demo"), help="Output directory.")) -> None:
    artifacts = run_demo_analysis_with_artifacts()
    write_json(output / "result.json", artifacts.report.model_dump(mode="json"))
    npy_output = output / "arrays"
    npy_output.mkdir(parents=True, exist_ok=True)
    import numpy as np

    np.save(npy_output / "probability_map.npy", artifacts.probability_map)
    np.save(npy_output / "binary_mask.npy", artifacts.binary_mask)
    save_png(output / "preview.png", artifacts.preview_rgb)
    save_png(output / "overlay.png", artifacts.overlay_rgb)
    typer.echo(f"written: {output / 'result.json'}")


if __name__ == "__main__":
    typer.run(main)
