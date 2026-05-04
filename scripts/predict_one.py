from pathlib import Path

import typer

from oceanwatch.data.io import load_sar_tile
from oceanwatch.inference.pipeline import analyze_tile_with_artifacts
from oceanwatch.utils.export import write_json
from oceanwatch.visualization import save_png


def main(
    image: Path = typer.Option(..., help="Path to a .npy, .npz, .tif, or .tiff SAR-like tile."),
    output: Path = typer.Option(Path("outputs/predict_one"), help="Output directory."),
) -> None:
    tile = load_sar_tile(image)
    artifacts = analyze_tile_with_artifacts(tile, image_id=image.stem)
    write_json(output / "result.json", artifacts.report.model_dump(mode="json"))
    save_png(output / "preview.png", artifacts.preview_rgb)
    save_png(output / "overlay.png", artifacts.overlay_rgb)
    typer.echo(f"written: {output / 'result.json'}")


if __name__ == "__main__":
    typer.run(main)
