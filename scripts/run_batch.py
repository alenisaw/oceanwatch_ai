from pathlib import Path
from time import perf_counter

import typer

from oceanwatch.data.io import load_sar_tile
from oceanwatch.inference.pipeline import analyze_tile_with_artifacts
from oceanwatch.utils.export import write_json
from oceanwatch.visualization import save_png

SUPPORTED_SUFFIXES = {".npy", ".npz", ".tif", ".tiff"}


def iter_tiles(input_dir: Path) -> list[Path]:
    """Return supported tile paths in stable order."""
    return sorted(
        path
        for path in input_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_SUFFIXES
    )


def main(
    input_dir: Path = typer.Option(..., help="Directory with SAR-like tiles."),
    output: Path = typer.Option(Path("outputs/batch"), help="Output directory."),
    save_overlays: bool = typer.Option(True, help="Save preview and overlay PNGs."),
) -> None:
    tiles = iter_tiles(input_dir)
    if not tiles:
        suffixes = ", ".join(sorted(SUPPORTED_SUFFIXES))
        raise typer.BadParameter(f"No supported tiles found. Expected: {suffixes}")

    output.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, object]] = []
    started = perf_counter()

    for index, path in enumerate(tiles, start=1):
        tile_started = perf_counter()
        tile = load_sar_tile(path)
        artifacts = analyze_tile_with_artifacts(tile, image_id=path.stem)
        latency_ms = (perf_counter() - tile_started) * 1000.0

        item_dir = output / f"{index:03d}_{path.stem}"
        write_json(item_dir / "result.json", artifacts.report.model_dump(mode="json"))
        if save_overlays:
            save_png(item_dir / "preview.png", artifacts.preview_rgb)
            save_png(item_dir / "overlay.png", artifacts.overlay_rgb)

        rows.append(
            {
                "image_id": path.stem,
                "path": str(path),
                "risk_level": artifacts.report.risk_level,
                "confidence": artifacts.report.confidence,
                "affected_pixel_ratio": artifacts.report.affected_pixel_ratio,
                "latency_ms": round(latency_ms, 3),
            }
        )

    total_seconds = perf_counter() - started
    summary = {
        "tiles": rows,
        "total_tiles": len(rows),
        "total_seconds": round(total_seconds, 3),
        "tiles_per_second": round(len(rows) / total_seconds, 3) if total_seconds else 0.0,
    }
    write_json(output / "batch_results.json", summary)
    typer.echo(f"written: {output / 'batch_results.json'}")


if __name__ == "__main__":
    typer.run(main)
