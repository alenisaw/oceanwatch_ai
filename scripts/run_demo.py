from pathlib import Path

import typer

from oceanwatch.inference.pipeline import run_demo_analysis
from oceanwatch.utils.export import write_json


def main(output: Path = typer.Option(Path("outputs/demo"), help="Output directory.")) -> None:
    result = run_demo_analysis()
    write_json(output / "result.json", result.model_dump(mode="json"))
    typer.echo(f"written: {output / 'result.json'}")


if __name__ == "__main__":
    typer.run(main)
