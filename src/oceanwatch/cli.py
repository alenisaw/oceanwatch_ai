from pathlib import Path

import typer
from rich.console import Console

from oceanwatch import __version__
from oceanwatch.inference.pipeline import run_demo_analysis_with_artifacts
from oceanwatch.utils.export import write_json
from oceanwatch.visualization import save_png

app = typer.Typer(no_args_is_help=True)
console = Console()


@app.command()
def health() -> None:
    """Run a small runtime check."""
    console.print(f"OceanWatch AI {__version__}")
    console.print("status: ok")


@app.command()
def demo(output: Path = typer.Option(Path("outputs/demo"), help="Output directory.")) -> None:
    """Run the deterministic demo pipeline."""
    artifacts = run_demo_analysis_with_artifacts()
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / "result.json", artifacts.report.model_dump(mode="json"))
    save_png(output / "preview.png", artifacts.preview_rgb)
    save_png(output / "overlay.png", artifacts.overlay_rgb)
    console.print(f"written: {output / 'result.json'}")
