from pathlib import Path

import typer

from oceanwatch.data.io import load_numpy_tile
from oceanwatch.inference.pipeline import analyze_tile
from oceanwatch.utils.export import write_json


def main(
    image: Path = typer.Option(..., help="Path to a .npy SAR-like tile."),
    output: Path = typer.Option(Path("outputs/predict_one"), help="Output directory."),
) -> None:
    tile = load_numpy_tile(image)
    result = analyze_tile(tile, image_id=image.stem)
    write_json(output / "result.json", result.model_dump(mode="json"))
    typer.echo(f"written: {output / 'result.json'}")


if __name__ == "__main__":
    typer.run(main)
